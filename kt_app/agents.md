# Agent Rules

- **CRITICAL**: **NEVER FLOOD THE REPOSITORY ROOT**. All Kotlin Android application code, Gradle build files, Gradle wrappers, and `app` module directories MUST remain strictly inside the `kt_app/` directory. NEVER output `build.gradle.kts`, `settings.gradle.kts`, `gradlew`, `gradle/`, or `app/` in the top-level repository root.
- Never make code changes directly on `main`.
- Always switch to `kotlin_app` (or appropriate feature branch) before editing this project.
- Treat `kt_app/` as the Kotlin and Jetpack Compose source of truth.
- Keep this branch fast to sync, easy to understand, and safe to extend.

## Architecture & Code Standards (Frozen)

Follow **SOLID** principles and **Clean Architecture**. Every feature must be modular. Avoid duplicate code.

### 1. Folder Structure

#### **Core Layer (`core/`)**
- `common/`: Global constants and helpers.
- `network/`: Retrofit setup and API clients.
- `database/`: Room database setup.
- `datastore/`: Preferences DataStore logic.
- `theme/`: Material 3 Color, Type, Theme, and Dimens definitions.
- `utils/`: Utility classes.
- `extensions/`: Kotlin extension functions.

#### **Domain Layer (`domain/`)**
- `model/`: Plain Kotlin data classes (Entities).
- `repository/`: Repository interfaces.
- `usecase/`: Business logic components.
- `mapper/`: Data-to-Domain and Domain-to-UI mappers.

#### **Data Layer (`data/`)**
- `repository/`: Implementations of domain repositories.
- `remote/`: API interfaces, DTOs, and Remote Data Sources.
- `local/`: DAOs, local entities, and Local Data Sources.

#### **Presentation Layer (`presentation/`)**
- `home/`: Map and primary dashboard logic.
- `components/`: Feature-specific reusable UI components.
- `tag/`: Location tagging feature.
- `settings/`: App configuration and debug tools.
- `onboarding/`: First-run experience.
- `permission/`: Permission handling screens/logic.
- `navigation/`: NavHost and Route definitions.
- `common/`: Global reusable UI components (dialogs, loading, snackbar).

#### **Build Config (`buildConfig/`)**
- `ApiConfig`, `Constants`, `Environment`.

### 2. Implementation Rules
- Every screen must have its own **ViewModel**, **UiState**, **UiEvent**, and **UiEffect**.
- Use **Material 3** best practices.
- Write scalable production-ready code with proper documentation.
- Follow SOLID principles.

### 3. Repository Strategy
Logic must be split into specific domain repositories:
- `LocationRepository`
- `RoomRepository`
- `SettingsRepository`
- `AuthRepository` (future)
- `DebugRepository`
