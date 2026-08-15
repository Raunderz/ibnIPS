# Agent Instructions (`kt_app/agent.md`)

## ⚠️ Repository Structure Rule
**CRITICAL**: **NEVER FLOOD THE REPOSITORY ROOT.**
- All Kotlin Android application code (`kt_app/app/`), Gradle build scripts (`kt_app/build.gradle.kts`, `kt_app/settings.gradle.kts`), Gradle wrapper scripts (`kt_app/gradlew`, `kt_app/gradlew.bat`), and Gradle configuration (`kt_app/gradle/`) MUST remain strictly inside the `kt_app/` directory.
- Never create or output Kotlin/Gradle project files directly in the repository root directory.
- The root of `ibnIPS` is reserved for multi-project subfolders (`app/` for web/flutter, `backend/` for backend, `kt_app/` for Kotlin Android).

Refer to [`agents.md`](agents.md) for full architecture and code standards.
