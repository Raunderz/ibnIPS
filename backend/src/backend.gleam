import gleam/erlang/process
import gleam/io
import wisp
import wisp/wisp_mist
import mist

pub fn main() -> Nil {
  wisp.configure_logger()
  let secret_key_base = wisp.random_string(64)
  let assert Ok(_) =
    wisp_mist.handler(handle_request, secret_key_base)
    |> mist.new
    |> mist.port(3000)
    |> mist.bind("0.0.0.0")
    |> mist.start
  io.println("Server started on http://localhost:3000")
  process.sleep_forever()
}

fn handle_request(request) {
  case wisp.path_segments(request) {
    [] -> wisp.ok() |> wisp.string_body("Hello, World!")
    _ -> wisp.not_found()
  }
}
