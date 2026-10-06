@echo off
setlocal

set APP_HOME=%~dp0
set GRADLE_WRAPPER_JAR=%APP_HOME%gradle\wrapper\gradle-wrapper.jar

if not exist "%GRADLE_WRAPPER_JAR%" (
    echo Downloading gradle-wrapper.jar...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/gradle/gradle/raw/v8.10.2/gradle/wrapper/gradle-wrapper.jar' -OutFile '%GRADLE_WRAPPER_JAR%'"
)

java -Dorg.gradle.appname=gradlew -cp "%GRADLE_WRAPPER_JAR%" org.gradle.wrapper.GradleWrapperMain %*