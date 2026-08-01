FROM ghcr.io/gleam-lang/gleam:v1.16.0-erlang-alpine

WORKDIR /app

COPY src/ src/
COPY test/ test/
COPY gleam.toml gleam.toml

RUN gleam build

EXPOSE 3000

CMD ["gleam", "run"]
