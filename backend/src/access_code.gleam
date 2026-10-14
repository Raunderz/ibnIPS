// access_code.gleam
// The cross-service half of authentication.
//
// An access code is issued by the Civet auth service after it verifies a Google
// identity, and redeemed here by sending it to `POST /api/auth`. Both services
// share one database, so redeeming it is a lookup rather than a network call:
// the auth service being unreachable cannot stop anyone logging in.
//
// The contract is exactly two things — a code, and the roll number it is bound
// to — and nothing else. Nothing about the user is taken from the request.

import db
import db_query
import gleam/dynamic/decode
import sqlight

/// SHA-256 of a code, lower-case hex.
///
/// Must produce the identical string to `hashCode` in the auth service, which
/// is Node's `createHash('sha256').update(raw, 'utf8').digest('hex')`. The two
/// implementations are otherwise unrelated code in different languages, so this
/// is the one place where a silent disagreement would turn every valid code
/// into "not found" with nothing to indicate why.
@external(erlang, "hash_ffi", "hash_code")
pub fn hash_code(code: String) -> String

/// The identity an access code redeems to.
pub type CodeOwner {
  CodeOwner(roll_number: String, email: String, code_hash: String)
}

/// The row a code resolves to, or `Error` when it redeems nothing.
///
/// The digest is looked up against a UNIQUE index, so this is an indexed
/// equality match rather than a scan-and-compare. That is also why there is no
/// constant-time comparison here: there is no secret being compared, only a
/// lookup whose answer is the same either way.
///
/// `revoked_at IS NULL` is load-bearing rather than a filter. Rotation
/// replaces `code_hash` so an old code stops matching; revocation leaves the
/// hash in place and sets this column, so omitting it would make revoking a
/// code silently do nothing on this side.
pub fn find_owner(
  conn: db.Connection,
  code_hash: String,
) -> Result(CodeOwner, Nil) {
  let sql =
    "SELECT roll_number, email, code_hash
     FROM auth_identities
     WHERE code_hash = ? AND revoked_at IS NULL
     LIMIT 1"
  let decoder = {
    use roll_number <- decode.field("roll_number", decode.string)
    use email <- decode.field("email", decode.string)
    use code_hash <- decode.field("code_hash", decode.string)
    decode.success(CodeOwner(roll_number, email, code_hash))
  }

  case
    db_query.query_as_maps(
      sql,
      on: conn,
      with: [sqlight.text(code_hash)],
      expecting: decoder,
    )
  {
    Ok([owner]) -> Ok(owner)
    Ok(_) -> Error(Nil)
    Error(_) -> Error(Nil)
  }
}
