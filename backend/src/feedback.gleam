// feedback.gleam
// POST /api/feedback — record what a person thought of the app.
// GET  /api/feedback — read every response back, newest first.
//
// Deliberately public (no token required). Feedback is only worth anything if
// it is cheap to leave, and the whole point of collecting responses from people
// who are not on the mapping team is that they have no reason to hold a token.
// A valid token is still used when one happens to be sent, purely to record
// who answered — see `optional_user_id`.
//
// The endpoint is anonymous by design, so it is also the only public write in
// the API. Two things keep that from turning into a spam hole: the per-client
// rate limit from `rate_limit` applies here like everywhere else, and every
// string is length-capped before it is written. There is no way to delete or
// edit a response once stored, so the caps matter more than usual — see
// `validate_username` and `validate_comment`.

import app_auth
import db
import db_query
import gleam/dynamic/decode
import gleam/http/request.{get_header}
import gleam/int
import gleam/json
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/result
import gleam/string
import models.{
  type FeedbackList, type FeedbackRequest, ErrorResponse, FeedbackList,
  decode_feedback_request, encode_error, encode_feedback_list,
  feedback_row_decoder,
}
import sqlight
import wisp

/// Longest accepted name. Long enough for "Aditya Kumar Mohapatra 23b1234".
const max_username_length: Int = 80

/// Longest accepted comment. A form should not let anyone paste an essay, and
/// a few paragraphs is well past what a useful answer needs.
const max_comment_length: Int = 2000

/// Fewest and highest accepted star rating.
const min_rating: Int = 1

const max_rating: Int = 5

/// Largest number of responses one `GET` will return.
const max_page_size: Int = 500

/// Responses returned when the caller asks for none in particular.
const default_page_size: Int = 100

// --- POST /api/feedback ---

/// Record one response.
///
/// Body: `{"username": "...", "comment": "...", "rating": 1-5 | null}`
///
/// Returns `201` with `{"status":"recorded"}`, or an error response.
pub fn handle_post(
  request: wisp.Request,
  conn: db.Connection,
  jwt_secret: String,
) -> wisp.Response {
  // `conn` is the boot connection, used here only to identify the sender (a
  // session check). The write itself goes down its own connection.
  use body <- wisp.require_string_body(request)

  case parse_body(body) {
    Error(_) -> error(400, "invalid_json", "Could not parse feedback request")
    Ok(entry) ->
      case validate(entry) {
        Error(msg) -> error(400, "validation_failed", msg)
        Ok(_) -> record(entry, optional_user_id(request, conn, jwt_secret))
      }
  }
}

fn parse_body(body: String) -> Result(FeedbackRequest, Nil) {
  case json.parse(body, using: decode_feedback_request()) {
    Ok(entry) -> Ok(entry)
    Error(_) -> Error(Nil)
  }
}

/// Check a response before it is written.
///
/// The comment is required: a name with no comment is not feedback. The rating
/// is not, so the person who skipped the stars still gets recorded.
pub fn validate(entry: FeedbackRequest) -> Result(Nil, String) {
  use Nil <- result.try(validate_username(entry.username))
  use Nil <- result.try(validate_comment(entry.comment))
  validate_rating(entry.rating)
}

fn validate_username(username: String) -> Result(Nil, String) {
  case string.trim(username) == "" {
    True -> Error("Username must not be blank")
    False ->
      case string.length(username) > max_username_length {
        True ->
          Error(
            "Username is too long (max "
            <> int.to_string(max_username_length)
            <> " characters)",
          )
        False -> Ok(Nil)
      }
  }
}

fn validate_comment(comment: String) -> Result(Nil, String) {
  case string.trim(comment) == "" {
    True -> Error("Comment must not be blank")
    False ->
      case string.length(comment) > max_comment_length {
        True ->
          Error(
            "Comment is too long (max "
            <> int.to_string(max_comment_length)
            <> " characters)",
          )
        False -> Ok(Nil)
      }
  }
}

fn validate_rating(rating: Option(Int)) -> Result(Nil, String) {
  case rating {
    None -> Ok(Nil)
    Some(value) ->
      case value < min_rating || value > max_rating {
        True ->
          Error(
            "Rating must be between "
            <> int.to_string(min_rating)
            <> " and "
            <> int.to_string(max_rating),
          )
        False -> Ok(Nil)
      }
  }
}

/// Store the response on a connection of its own.
///
/// Written on a dedicated connection because that is what the write path does
/// everywhere else, so a transaction opened here cannot interleave with another
/// request's.
fn record(
  entry: FeedbackRequest,
  user_id: Result(String, Nil),
) -> wisp.Response {
  case db.with_connection(fn(open) { insert(open, entry, user_id) }) {
    Error(_) -> error(500, "database_error", "Could not open the database")
    Ok(Error(msg)) -> error(500, "database_error", msg)
    Ok(Ok(Nil)) -> {
      let response = json.object([#("status", json.string("recorded"))])
      wisp.response(201)
      |> wisp.json_body(json.to_string(response))
    }
  }
}

fn insert(
  conn: db.Connection,
  entry: FeedbackRequest,
  user_id: Result(String, Nil),
) -> Result(Nil, String) {
  let sql =
    "INSERT INTO feedback (username, comment, rating, user_id) VALUES (?, ?, ?, ?)"
  db_query.exec_with_args(sql, on: conn, with: [
    sqlight.text(string.trim(entry.username)),
    sqlight.text(string.trim(entry.comment)),
    sqlight.nullable(sqlight.int, entry.rating),
    sqlight.nullable(sqlight.text, ok_user_id(user_id)),
  ])
}

/// The caller's roll number if they sent a usable token, otherwise nothing.
///
/// A rejected token is treated the same as no token rather than as an error:
/// feedback is public, and making a stale or mistyped token block someone's
/// comment would lose exactly the responses we cannot replace.
fn optional_user_id(
  request: wisp.Request,
  conn: db.Connection,
  jwt_secret: String,
) -> Result(String, Nil) {
  case get_header(request, "authorization") {
    Error(_) -> Error(Nil)
    Ok(_) -> app_auth.identify(request, conn, jwt_secret)
  }
}

fn ok_user_id(user_id: Result(String, Nil)) -> Option(String) {
  case user_id {
    Ok(value) -> Some(value)
    Error(_) -> None
  }
}

// --- GET /api/feedback ---

/// Serve every stored response, newest first.
///
/// Query: `?limit=N` (default 100, max 500).
pub fn handle_get(request: wisp.Request) -> wisp.Response {
  case db.with_connection(fn(open) { load(open, page_size(request)) }) {
    Error(_) -> error(500, "database_error", "Could not open the database")
    Ok(Error(msg)) -> error(500, "database_error", msg)
    Ok(Ok(list)) -> {
      wisp.ok()
      |> wisp.json_body(json.to_string(encode_feedback_list(list)))
    }
  }
}

/// How many responses to return, from the `limit` query parameter.
///
/// A junk value falls back to the default rather than failing: this is a read
/// for a person looking at a spreadsheet of answers, and a typo in the URL
/// should show them the responses rather than an error.
fn page_size(request: wisp.Request) -> Int {
  let query: List(#(String, String)) = wisp.get_query(request)
  case list.find(query, fn(pair) { pair.0 == "limit" }) {
    Ok(#(_, value)) ->
      case int.parse(value) {
        Ok(limit) -> clamp(limit)
        Error(_) -> default_page_size
      }
    Error(_) -> default_page_size
  }
}

/// Keep a requested page size inside the bounds the endpoint will honour.
fn clamp(limit: Int) -> Int {
  case limit < 1 {
    True -> default_page_size
    False ->
      case limit > max_page_size {
        True -> max_page_size
        False -> limit
      }
  }
}

/// Read a page of responses and count them all.
///
/// The count is over the whole table, not the page, so "how many people have
/// answered" does not quietly change with the page size.
fn load(conn: db.Connection, limit: Int) -> Result(FeedbackList, String) {
  let sql =
    "SELECT feedback_id, username, comment, rating, user_id, created_at
     FROM feedback ORDER BY feedback_id DESC LIMIT ?"
  use entries <- result.try(db_query.query_as_maps(
    sql,
    on: conn,
    with: [sqlight.int(limit)],
    expecting: feedback_row_decoder(),
  ))
  let decoder = {
    use total <- decode.field("total", decode.int)
    decode.success(total)
  }
  use totals <- result.try(db_query.query_as_maps(
    "SELECT COUNT(*) AS total FROM feedback",
    on: conn,
    with: [],
    expecting: decoder,
  ))
  Ok(FeedbackList(total: first_count(totals), feedback: entries))
}

/// The `COUNT(*)` result. An empty list cannot happen — `COUNT(*)` always
/// returns exactly one row — but report zero rather than crashing the endpoint
/// if a backend ever hands back something else.
fn first_count(totals: List(Int)) -> Int {
  case totals {
    [total, ..] -> total
    [] -> 0
  }
}

// --- Shared ---

fn error(status: Int, code: String, details: String) -> wisp.Response {
  let error_json = encode_error(ErrorResponse(code, details))
  wisp.response(status)
  |> wisp.string_body(json.to_string(error_json))
}
