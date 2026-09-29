// jwt.gleam
// JSON Web Token (JWT) implementation using HMAC-SHA256 (HS256).
//
// JWT format: header.payload.signature
// Each part is base64url-encoded JSON.
// Signature = HMAC-SHA256(base64url(header) + "." + base64url(payload), secret)
//
// Only HS256 is supported — no RSA or ECDSA, keeping it simple.

import birl
import gleam/bit_array
import gleam/crypto
import gleam/dynamic/decode
import gleam/json
import gleam/string

/// JWT header, fixed as `{"alg":"HS256","typ":"JWT"}`, base64url-encoded.
const jwt_header_json = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}"

/// The claims stored in a JWT payload.
/// - `sub`: subject = roll number (user_id)
/// - `sid`: session_id for DB lookup
/// - `iat`: issued at (unix epoch seconds)
/// - `exp`: expires at (unix epoch seconds)
pub type Claims {
  Claims(sub: String, sid: String, iat: Int, exp: Int)
}

/// Errors that can occur when verifying a JWT.
pub type JwtError {
  InvalidFormat
  // wrong number of segments (not 3)
  InvalidBase64
  // base64url decoding failed
  InvalidJson
  // payload JSON parsing failed
  InvalidSignature
  // HMAC signature does not match
  TokenExpired
  // exp claim is in the past
  MissingClaim(String)
  // required claim not found in payload
}

// --- Encoding ---

/// Sign claims into a JWT string.
///
/// Steps:
/// 1. Encode header to base64url
/// 2. Encode claims to JSON, then base64url
/// 3. Concatenate: header + "." + payload
/// 4. Sign with HMAC-SHA256 using the secret
/// 5. Concatenate: header + "." + payload + "." + signature
pub fn sign(claims: Claims, secret: String) -> String {
  let header_b64 = base64url_encode(jwt_header_json)
  let payload_json = encode_claims(claims)
  let payload_b64 = base64url_encode(payload_json)

  let signing_input = header_b64 <> "." <> payload_b64

  // HMAC-SHA256 produces a 32-byte digest.
  let signature =
    crypto.hmac(
      bit_array.from_string(signing_input),
      crypto.Sha256,
      bit_array.from_string(secret),
    )
  let signature_b64 = base64url_encode_bits(signature)

  signing_input <> "." <> signature_b64
}

/// Serialize claims to their JSON payload string.
fn encode_claims(claims: Claims) -> String {
  json.object([
    #("sub", json.string(claims.sub)),
    #("sid", json.string(claims.sid)),
    #("iat", json.int(claims.iat)),
    #("exp", json.int(claims.exp)),
  ])
  |> json.to_string()
}

// --- Decoding & Verification ---

/// Verify a JWT string and return the claims if valid.
///
/// Steps:
/// 1. Split into 3 parts
/// 2. Recompute the signature and compare in constant time
/// 3. Decode the payload JSON
/// 4. Parse the claims
/// 5. Check expiry
pub fn verify(token: String, secret: String) -> Result(Claims, JwtError) {
  // Split "header.payload.signature" into 3 parts.
  case string.split(token, ".") {
    [header_b64, payload_b64, signature_b64] -> {
      // Recompute the signature to verify integrity.
      let signing_input = header_b64 <> "." <> payload_b64
      let expected_sig =
        crypto.hmac(
          bit_array.from_string(signing_input),
          crypto.Sha256,
          bit_array.from_string(secret),
        )

      // Decode the provided signature from base64url.
      case base64url_decode_bits(signature_b64) {
        Error(_) -> Error(InvalidBase64)
        Ok(provided_sig) -> {
          // Constant-time comparison to avoid timing attacks.
          case crypto.secure_compare(provided_sig, expected_sig) {
            True -> {
              // Signature valid. Now decode the payload.
              case base64url_decode(payload_b64) {
                Error(_) -> Error(InvalidBase64)
                Ok(payload_json) -> {
                  case parse_claims(payload_json) {
                    Error(e) -> Error(e)
                    Ok(claims) -> {
                      // Check expiry against current time.
                      let now = birl.to_unix(birl.now())
                      case claims.exp > now {
                        True -> Ok(claims)
                        False -> Error(TokenExpired)
                      }
                    }
                  }
                }
              }
            }
            False -> Error(InvalidSignature)
          }
        }
      }
    }
    _ -> Error(InvalidFormat)
  }
}

/// Parse a JSON payload string into a `Claims` struct.
fn parse_claims(json_str: String) -> Result(Claims, JwtError) {
  case json.parse(json_str, using: claims_decoder()) {
    Ok(claims) -> Ok(claims)
    Error(_) -> Error(InvalidJson)
  }
}

/// Decoder for the JWT payload.
/// Each `decode.field` extracts one key from the JSON object.
fn claims_decoder() -> decode.Decoder(Claims) {
  use sub <- decode.field("sub", decode.string)
  use sid <- decode.field("sid", decode.string)
  use iat <- decode.field("iat", decode.int)
  use exp <- decode.field("exp", decode.int)
  decode.success(Claims(sub: sub, sid: sid, iat: iat, exp: exp))
}

// --- base64url helpers ---

/// Encode a string to base64url.
/// Standard base64 uses `+` and `/`; JWT uses `-` and `_` (URL-safe) and
/// strips the trailing `=` padding.
fn base64url_encode(input: String) -> String {
  input
  |> bit_array.from_string()
  |> bit_array.base64_encode(True)
  // True = URL-safe alphabet
  |> string.replace("=", "")
  // remove padding
}

/// Encode a `BitArray` to base64url (used for the signature).
fn base64url_encode_bits(input: BitArray) -> String {
  bit_array.base64_encode(input, True)
  |> string.replace("=", "")
}

/// Decode a base64url string.
fn base64url_decode(input: String) -> Result(String, Nil) {
  // Padding is stripped in base64url; restore it for the decoder.
  let padded = pad_base64(input)
  case bit_array.base64_decode(padded) {
    Ok(bits) -> {
      case bit_array.to_string(bits) {
        Ok(str) -> Ok(str)
        Error(_) -> Error(Nil)
      }
    }
    Error(_) -> Error(Nil)
  }
}

/// Decode a base64url string into a `BitArray` (used for signature comparison).
fn base64url_decode_bits(input: String) -> Result(BitArray, Nil) {
  let padded = pad_base64(input)
  bit_array.base64_decode(padded)
}

/// Add `=` padding so the length is a multiple of 4.
/// base64url strips padding, but Erlang's decoder requires it.
fn pad_base64(input: String) -> String {
  let rem = string.length(input) % 4
  case rem {
    0 -> input
    2 -> input <> "=="
    3 -> input <> "="
    _ -> input
    // Invalid, but let the decoder fail
  }
}
