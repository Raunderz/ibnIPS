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
    implementation(libs.androidx.compose.material.icons.extended)

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

tasks.register("debugTestEnv") {
    doLast {
        val testTask = tasks.getByName<Test>("testDebugUnitTest")
        val out = StringBuilder()
        out.append("\n--- TEST TASK DEBUG ---\n")
        out.append("Executable: ${testTask.executable}\n")
        out.append("All JVM Args:\n")
        testTask.allJvmArgs.forEach { out.append("  $it\n") }
        out.append("Environment Variables (Safe list):\n")
        testTask.environment.forEach { (k, v) ->
            if (k.uppercase() in listOf("JAVA_HOME", "PATH", "JAVA_TOOL_OPTIONS", "_JAVA_OPTIONS", "JDK_JAVA_OPTIONS", "CLASSPATH")) {
                out.append("  $k: $v\n")
            }
        }
        throw GradleException(out.toString())
    }
}

tasks.withType<Test> {
    // Radical fix for Windows environment issues causing forked JVMs to fail.
    
    // 1. Sanitize JAVA_HOME
    val jh = System.getenv("JAVA_HOME")?.trim()?.removeSurrounding("\"")?.removeSuffix("\\")
    if (jh != null) {
        executable = "$jh\\bin\\java.exe"
    }

    // 2. Completely override the environment to prevent leaking unquoted machine-level variables
    val cleanEnv = mutableMapOf<String, Any>()
    
    // Essential system variables
    listOf("SystemRoot", "SystemDrive", "TEMP", "TMP", "USERNAME", "USERPROFILE", "ComSpec").forEach { key ->
        System.getenv(key)?.let { cleanEnv[key] = it }
    }
    
    if (jh != null) cleanEnv["JAVA_HOME"] = jh
    
    // Minimal and clean PATH
    val system32 = "${System.getenv("SystemRoot") ?: "C:\\Windows"}\\System32"
    val cleanPath = listOfNotNull(jh?.let { "$it\\bin" }, system32).joinToString(";")
    cleanEnv["PATH"] = cleanPath
    
    // Force set toxic variables to empty to block inheritance from the machine
    listOf("JAVA_TOOL_OPTIONS", "_JAVA_OPTIONS", "JDK_JAVA_OPTIONS", "CLASSPATH", "GRADLE_OPTS").forEach { 
        cleanEnv[it] = "" 
    }
    
    environment = cleanEnv

    // 3. Clear and set JVM arguments explicitly
    setJvmArgs(listOf("-Djava.awt.headless=true", "-Xmx1024m", "-ea", "-Dfile.encoding=UTF-8"))
}
