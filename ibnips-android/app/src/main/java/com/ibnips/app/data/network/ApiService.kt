package com.ibnips.app.data.network

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST

interface ApiService {

    @POST("api/auth")
    suspend fun authenticate(
        @Body request: AuthRequest
    ): Response<AuthResponse>

    @POST("api/ping")
    suspend fun pingLocation(
        @Header("Authorization") token: String,
        @Body request: PingRequest
    ): Response<PingResponse>

    @GET("api/nodes")
    suspend fun getNodes(): Response<List<NodeNetworkDto>>

    @GET("api/map")
    suspend fun getMap(): Response<MapResponse>
}
