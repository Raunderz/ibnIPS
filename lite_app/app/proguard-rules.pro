# ProGuard rules for ibnIPS — minimal, since we have no external libs

# Keep org.json classes used by Android framework (bundled, not shrunk)
-keep class org.json.** { *; }

# Keep our app entry points
-keep class com.example.ibnips.** { *; }

# Keep Android lifecycle methods
-keepclassmembers class * extends android.app.Activity {
    public void *(android.view.View);
}

# Suppress notes on bundled Android classes
-dontnote android.**
-dontnote java.**
