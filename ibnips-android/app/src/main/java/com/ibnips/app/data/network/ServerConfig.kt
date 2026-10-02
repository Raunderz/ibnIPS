package com.ibnips.app.data.network

import android.content.Context

// Which backend the app talks to.
//
// `10.0.2.2` is the emulator's alias for the host machine's loopback, so it
// works on an emulator and nowhere else. On a real handset the server is
// somewhere on the campus network and the address depends on where it is
// deployed, which is why this is a setting rather than a build constant.
class ServerConfig(context: Context) {

    private val prefs = context.applicationContext
        .getSharedPreferences("ibnips_server", Context.MODE_PRIVATE)

    var baseUrl: String
        get() = prefs.getString(KEY_BASE_URL, DEFAULT_BASE_URL) ?: DEFAULT_BASE_URL
        set(value) {
            prefs.edit().putString(KEY_BASE_URL, normalize(value)).apply()
        }

    // Fills in the scheme and trailing slash Retrofit insists on, so a user can
    // type "192.168.1.5:3000" and get something that actually works.
    fun normalize(raw: String): String {
        val trimmed = raw.trim()
        if (trimmed.isEmpty()) return DEFAULT_BASE_URL
        val withScheme = if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            trimmed
        } else {
            "http://$trimmed"
        }
        return if (withScheme.endsWith("/")) withScheme else "$withScheme/"
    }

    companion object {
        const val DEFAULT_BASE_URL = "http://10.0.2.2:3000/"
        private const val KEY_BASE_URL = "base_url"
    }
}
