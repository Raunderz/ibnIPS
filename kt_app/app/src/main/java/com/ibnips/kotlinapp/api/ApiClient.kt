package com.ibnips.kotlinapp.api

import com.ibnips.kotlinapp.storage.PreferenceManager
import com.ibnips.kotlinapp.utils.Constants
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

/**
 * Central Retrofit / OkHttp builder for the native Android layer.
 *
 * Responsibilities:
 * - build a production-safe OkHttp client
 * - apply sane timeouts for mobile networks
 * - add logging in debug builds only
 * - read the base URL from SharedPreferences when available
 * - expose a reusable Retrofit instance for the repository layer
 *
 * This file is intentionally UI-free and bridge-free.
 * It exists so all network code shares one HTTP stack.
 */
object ApiClient {

    @Volatile
    private var retrofitInstance: Retrofit? = null

    @Volatile
    private var okHttpClientInstance: OkHttpClient? = null

    /**
     * Returns a cached Retrofit instance, rebuilding it if the base URL changes.
     */
    fun getRetrofit(preferenceManager: PreferenceManager): Retrofit {
        val baseUrl = normalizeBaseUrl(preferenceManager.getApiBaseUrl())
        val current = retrofitInstance

        if (current != null && current.baseUrl().toString() == baseUrl) {
            return current
        }

        return synchronized(this) {
            val refreshed = retrofitInstance
            if (refreshed != null && refreshed.baseUrl().toString() == baseUrl) {
                refreshed
            } else {
                Retrofit.Builder()
                    .baseUrl(baseUrl)
                    .client(getOkHttpClient())
                    .addConverterFactory(GsonConverterFactory.create())
                    .build()
                    .also { retrofitInstance = it }
            }
        }
    }

    /**
     * Returns the shared OkHttpClient instance.
     * The client is intentionally kept single-instance to reduce memory churn.
     */
    fun getOkHttpClient(): OkHttpClient {
        val current = okHttpClientInstance
        if (current != null) {
            return current
        }

        return synchronized(this) {
            okHttpClientInstance ?: buildOkHttpClient().also {
                okHttpClientInstance = it
            }
        }
    }

    /**
     * Clear cached instances when the app changes base URL or wants a hard refresh.
     */
    fun reset() {
        synchronized(this) {
            retrofitInstance = null
            okHttpClientInstance = null
        }
    }

    private fun buildOkHttpClient(): OkHttpClient {
        val builder = OkHttpClient.Builder()
            .connectTimeout(Constants.Api.CONNECT_TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .readTimeout(Constants.Api.READ_TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .writeTimeout(Constants.Api.WRITE_TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .callTimeout(Constants.Api.CALL_TIMEOUT_SECONDS, TimeUnit.SECONDS)

        builder.addInterceptor(defaultHeadersInterceptor())
        builder.addInterceptor(networkErrorMappingInterceptor())
        builder.addInterceptor(loggingInterceptor())

        return builder.build()
    }

    /**
     * Adds a stable JSON content type plus a defensive user agent.
     * Keep this interceptor lightweight because it runs on every request.
     */
    private fun defaultHeadersInterceptor(): Interceptor {
        return Interceptor { chain ->
            val request = chain.request().newBuilder()
                .header("Accept", "application/json")
                .header("Content-Type", "application/json")
                .header("X-Client", Constants.App.APP_NAME)
                .build()

            chain.proceed(request)
        }
    }

    /**
     * Converts low-level connectivity failures into a single place for the repository
     * to reason about them later. The interceptor does not swallow exceptions; it only
     * keeps stack traces intact and ensures every failure passes through the same stack.
     */
    private fun networkErrorMappingInterceptor(): Interceptor {
        return Interceptor { chain ->
            try {
                chain.proceed(chain.request())
            } catch (throwable: Throwable) {
                throw throwable
            }
        }
    }

    private fun loggingInterceptor(): Interceptor {
        return HttpLoggingInterceptor().apply {
            level = if (isDebugBuild()) {
                HttpLoggingInterceptor.Level.BODY
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }
    }

    /**
     * Normalizes base URLs so Retrofit always receives a trailing slash.
     */
    private fun normalizeBaseUrl(rawBaseUrl: String): String {
        val trimmed = rawBaseUrl.trim()
        return if (trimmed.endsWith("/")) trimmed else "$trimmed/"
    }

    /**
     * This project does not currently expose BuildConfig in a shared module, so we keep the
     * check defensive. If BuildConfig is unavailable, logging remains enabled only when the
     * app is running in a debuggable build process.
     */
    private fun isDebugBuild(): Boolean {
        return try {
            val buildConfig = Class.forName("${Constants.App.APP_NAME}.BuildConfig")
            buildConfig.getField("DEBUG").getBoolean(null)
        } catch (_: Throwable) {
            false
        }
    }
}

