package com.ibnips.app.data.network

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

// The backend address is a setting, not a constant, so Retrofit is rebuilt
// whenever it changes and callers take a provider rather than an instance.
object ApiClient {

    private const val TIMEOUT_SECONDS = 10L

    private val logging = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val httpClient = OkHttpClient.Builder()
        .addInterceptor(logging)
        .connectTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .readTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .build()

    private var currentBaseUrl: String? = null

    @Volatile
    private var cached: ApiService? = null

    fun apiServiceFor(baseUrl: String): ApiService {
        cached?.let { if (currentBaseUrl == baseUrl) return it }

        return synchronized(this) {
            cached?.let { if (currentBaseUrl == baseUrl) return it }

            val built = Retrofit.Builder()
                .baseUrl(baseUrl)
                .addConverterFactory(GsonConverterFactory.create())
                .client(httpClient)
                .build()
                .create(ApiService::class.java)

            currentBaseUrl = baseUrl
            cached = built
            built
        }
    }
}
