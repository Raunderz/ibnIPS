plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.hilt)
    alias(libs.plugins.kotlin.kapt)
}

android {
    namespace = "com.ibnips.kotlinapp"
    compileSdk = 35

    // Redirect build directory to avoid file locking issues on Windows (OneDrive, Sync, etc.)
    val tempBuildDir = System.getProperty("user.home") + "/.gradle-local-build/ibnIPS/${project.name}"
    layout.buildDirectory.set(file(tempBuildDir))

    defaultConfig {
        applicationId = "com.ibnips.kotlinapp"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
        resValues = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }

    testOptions {
        unitTests {
            isIncludeAndroidResources = true
        }
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.material)

    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.compose.foundation)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)

    implementation(libs.retrofit)
    implementation(libs.retrofit.gson)
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging)
    implementation(libs.gson)

    implementation(libs.hilt.android)
    kapt(libs.hilt.compiler)
    implementation(libs.hilt.navigation.compose)

    implementation(libs.androidx.navigation.compose)
    implementation(libs.androidx.datastore.preferences)
    implementation(libs.coil.compose)

    // React Native Bridge Support
    implementation(libs.react.android)

    // Local Unit Tests
    testImplementation(libs.junit)
    testImplementation(libs.mockk)
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(libs.turbine)
    testImplementation(libs.robolectric)
    testImplementation(libs.androidx.test.core)

    // Instrumented Tests
    androidTestImplementation(libs.androidx.test.ext.junit)
    androidTestImplementation(libs.androidx.test.espresso.core)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    androidTestImplementation(libs.hilt.android.testing)
    kaptAndroidTest(libs.hilt.compiler)

    debugImplementation(libs.androidx.compose.ui.tooling)
    debugImplementation(libs.androidx.compose.ui.test.manifest)
}

kapt {
    correctErrorTypes = true
}

// Radical fix for the "Files\JetBrains\IntelliJ" error on Windows.
tasks.withType<Test> {
    // 1. Clear problematic environment variables for the forked JVM process.
    // These are often the cause of "Could not find or load main class Files\JetBrains\IntelliJ"
    environment("JAVA_TOOL_OPTIONS", "")
    environment("_JAVA_OPTIONS", "")
    environment("JDK_JAVA_OPTIONS", "")
    
    // 2. Ensure we use a clean path for the executable if JAVA_HOME is available
    val javaHome = System.getenv("JAVA_HOME")
    if (!javaHome.isNullOrBlank()) {
        val javaExe = if (System.getProperty("os.name").contains("Windows")) "java.exe" else "java"
        executable = file("$javaHome/bin/$javaExe").absolutePath
    }

    maxHeapSize = "1024m"
    systemProperty("java.awt.headless", "true")
    systemProperty("file.encoding", "UTF-8")
}
