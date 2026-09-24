# Build stage: fetch dependencies and compile.
FROM ghcr.io/gleam-lang/gleam:v1.16.0-erlang-alpine AS build

RUN apk add --no-cache build-base sqlite-dev

WORKDIR /app

COPY gleam.toml manifest.toml ./
COPY src/ src/

RUN gleam deps download
RUN gleam build --target erlang

# Runtime stage: only the compiled artifact plus metadata.
FROM ghcr.io/gleam-lang/gleam:v1.16.0-erlang-alpine

# CA certs required for HTTPS fetches (MAP_JSON_URL) via Erlang ssl/httpc.
RUN apk add --no-cache ca-certificates

WORKDIR /app

COPY --from=build /app/build ./build
COPY --from=build /app/gleam.toml /app/manifest.toml ./
COPY --from=build /app/src ./src

EXPOSE 3000

ENV GLEAM_NO_INPUT=true
CMD ["gleam", "run"]