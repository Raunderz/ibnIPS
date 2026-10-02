package com.ibnips.app.data.network

import android.content.Context

// Remembers the login between launches.
//
// The access key is kept alongside the token so the app can re-authenticate
// without asking for it again. It is a shared secret distributed to whoever
// installs the app, which is the backend's model rather than ours: `AUTH_KEY`
// is one key for the whole campus, so storing it here gives no more away than
// shipping it in the APK would.
class AuthStore(context: Context) {

    private val prefs = context.applicationContext
        .getSharedPreferences("ibnips_auth", Context.MODE_PRIVATE)

    var token: String?
        get() = prefs.getString(KEY_TOKEN, null)
        private set(value) = prefs.edit().putString(KEY_TOKEN, value).apply()

    var userId: String?
        get() = prefs.getString(KEY_USER_ID, null)
        private set(value) = prefs.edit().putString(KEY_USER_ID, value).apply()

    var email: String?
        get() = prefs.getString(KEY_EMAIL, null)
        private set(value) = prefs.edit().putString(KEY_EMAIL, value).apply()

    var accessKey: String?
        get() = prefs.getString(KEY_ACCESS_KEY, null)
        private set(value) = prefs.edit().putString(KEY_ACCESS_KEY, value).apply()

    val isLoggedIn: Boolean get() = !token.isNullOrBlank()

    fun save(auth: AuthResponse, email: String, accessKey: String) {
        prefs.edit()
            .putString(KEY_TOKEN, auth.token)
            .putString(KEY_USER_ID, auth.userId)
            .putString(KEY_EMAIL, email)
            .putString(KEY_ACCESS_KEY, accessKey)
            .apply()
    }

    fun clear() {
        prefs.edit()
            .remove(KEY_TOKEN)
            .remove(KEY_USER_ID)
            .remove(KEY_EMAIL)
            .remove(KEY_ACCESS_KEY)
            .apply()
    }

    private companion object {
        const val KEY_TOKEN = "token"
        const val KEY_USER_ID = "user_id"
        const val KEY_EMAIL = "email"
        const val KEY_ACCESS_KEY = "access_key"
    }
}
