# ibnIPS — Kotlin Android App

Kotlin + Jetpack Compose frontend for ibnIPS.

## Requirements

- Android Studio Hedgehog (2023.1.1) or newer
- JDK 17+

## Setup

Open `kt_app/` in Android Studio, sync Gradle, and run the `app` configuration.

## Structure

- `app/src/main/` — Kotlin source code (Jetpack Compose UI, Retrofit networking, Hilt DI)
- `app/src/test/` — Unit tests
- `app/src/androidTest/` — Instrumented tests

See [`agents.md`](agents.md) for architecture standards and coding guidelines.
