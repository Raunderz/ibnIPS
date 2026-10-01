// rate_limit.gleam
// Fixed-window request quota, used to bound the cost of unauthenticated traffic.
//
// `gleam_erlang` exposes no `ets` module, so the counters live in an actor
// process. Every request sends the actor a message and waits briefly for the
// verdict. The actor is started once in `backend.main` and the subject is
// threaded through the handler like `conn` and `jwt_secret`.

import birl
import gleam/dict
import gleam/erlang/process
import gleam/http/request
import gleam/json
import gleam/otp/actor
import gleam/string
import models.{ErrorResponse, encode_error}
import wisp

/// Requests allowed per window, per client.
pub const default_max_requests: Int = 60

/// Length of the quota window in milliseconds.
pub const default_window_ms: Int = 60_000

/// How long a request will wait for the limiter's verdict before proceeding
/// anyway.
const verdict_timeout_ms: Int = 250

/// Prune expired counters this often, to bound the dictionary's size.
const prune_every_hits: Int = 1000

pub type Message {
  Hit(String, process.Subject(Bool))
}

pub type Limiter {
  Limiter(
    subject: process.Subject(Message),
    max_requests: Int,
    window_ms: Int,
    pid: process.Pid,
  )
}

/// key -> (window start in ms, requests counted so far)
type State {
  State(
    max_requests: Int,
    window_ms: Int,
    counters: dict.Dict(String, #(Int, Int)),
    hits: Int,
  )
}

/// Start the limiter process.
pub fn start(
  max max_requests: Int,
  window window_ms: Int,
) -> Result(Limiter, actor.StartError) {
  let builder =
    actor.new(State(
      max_requests: max_requests,
      window_ms: window_ms,
      counters: dict.new(),
      hits: 0,
    ))
    |> actor.on_message(handle_message)

  case actor.start(builder) {
    Ok(started) ->
      Ok(Limiter(
        subject: started.data,
        max_requests: max_requests,
        window_ms: window_ms,
        pid: started.pid,
      ))
    Error(e) -> Error(e)
  }
}

fn handle_message(
  state: State,
  message: Message,
) -> actor.Next(State, Message) {
  case message {
    Hit(key, reply) -> on_hit(state, key, reply)
  }
}

/// Count one request against `key` and reply with whether it is allowed.
fn on_hit(
  state: State,
  key: String,
  reply: process.Subject(Bool),
) -> actor.Next(State, Message) {
  // `birl.monotonic_now` counts microseconds; the window is in milliseconds.
  let now = birl.monotonic_now() / 1000

  let #(window_start, count) = case dict.get(state.counters, key) {
    Ok(entry) -> entry
    Error(_) -> #(now, 0)
  }

  // Roll the window over if the previous one has elapsed.
  let #(window_start, count) = case now - window_start >= state.window_ms {
    True -> #(now, 0)
    False -> #(window_start, count)
  }

  let count = count + 1
  process.send(reply, count <= state.max_requests)

  let counters = dict.insert(state.counters, key, #(window_start, count))
  let hits = state.hits + 1

  let counters = case hits >= prune_every_hits {
    True -> prune(counters, now, state.window_ms)
    False -> counters
  }

  actor.continue(State(..state, counters:, hits: 0))
}

/// Drop counters from windows that have already closed.
fn prune(
  counters: dict.Dict(String, #(Int, Int)),
  now: Int,
  window_ms: Int,
) -> dict.Dict(String, #(Int, Int)) {
  dict.filter(counters, fn(_key, entry) {
    let #(window_start, _count) = entry
    now - window_start < window_ms * 2
  })
}

/// Record a request and return `False` when the client is over its quota.
///
/// Fails open: if the limiter process is gone, or has not answered within
/// `verdict_timeout_ms`, the request is allowed through. A quota is a cost
/// control, not a security boundary — it should degrade to "no limit" rather
/// than take the service down.
pub fn check(limiter: Limiter, key: String) -> Bool {
  case process.is_alive(limiter.pid) {
    False -> True
    True -> {
      let reply = process.new_subject()
      process.send(limiter.subject, Hit(key, reply))
      case process.receive(from: reply, within: verdict_timeout_ms) {
        Ok(allowed) -> allowed
        Error(Nil) -> True
      }
    }
  }
}

/// Middleware: reject the request with `429` when over quota.
pub fn limit(
  limiter: Limiter,
  request: wisp.Request,
  next: fn() -> wisp.Response,
) -> wisp.Response {
  case check(limiter, client_key(request)) {
    True -> next()
    False -> {
      let error_json =
        encode_error(ErrorResponse(
          "rate_limited",
          "Too many requests. Try again later.",
        ))
      wisp.response(429)
      |> wisp.json_body(json.to_string(error_json))
    }
  }
}

/// Best-effort client identity for quota accounting.
///
/// Reads the left-most `x-forwarded-for` entry, which is the original client
/// when the service sits behind Render and Cloudflare. That header is
/// client-controlled when the server is reached directly, so this must not be
/// treated as an identity — only as a bucket to charge requests against.
pub fn client_key(request: wisp.Request) -> String {
  case request.get_header(request, "x-forwarded-for") {
    Ok(header) ->
      case string.split(header, ",") {
        [first, ..] -> string.trim(first)
        [] -> "unknown"
      }
    Error(Nil) -> "unknown"
  }
}
