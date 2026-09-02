package com.cambridgepapers.app.data

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*
import java.util.concurrent.TimeUnit

interface ApiService {
    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): AuthResponse

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): AuthResponse

    @POST("auth/google")
    suspend fun googleLogin(@Body request: Map<String, String>): AuthResponse

    @GET("auth/me")
    suspend fun getMe(): User

    @GET("papers")
    suspend fun getPapers(
        @Query("q") query: String? = null,
        @Query("qualification") qualification: String? = null,
        @Query("year") year: Int? = null,
        @Query("session") session: String? = null,
        @Query("paper_number") paperNumber: Int? = null,
        @Query("status") status: String? = null,
        @Query("sort") sort: String = "newest",
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50
    ): PapersResponse

    @GET("papers/filters")
    suspend fun getFilters(): FilterResponse

    @GET("papers/stats")
    suspend fun getStats(): StatsResponse

    @POST("progress/toggle")
    suspend fun toggleProgress(@Body request: ToggleRequest): ToggleResponse

    @GET("progress/subject/{id}")
    suspend fun getSubjectProgress(@Path("id") id: Int): SubjectDetailResponse

    companion object {
        private var instance: ApiService? = null
        private var token: String? = null

        fun setToken(newToken: String?) { token = newToken }

        fun getInstance(): ApiService {
            if (instance == null) {
                val logging = HttpLoggingInterceptor().apply {
                    level = HttpLoggingInterceptor.Level.BODY
                }
                val client = OkHttpClient.Builder()
                    .addInterceptor { chain ->
                        val request = chain.request().newBuilder().apply {
                            token?.let { addHeader("Authorization", "Bearer $it") }
                        }.build()
                        chain.proceed(request)
                    }
                    .addInterceptor(logging)
                    .connectTimeout(30, TimeUnit.SECONDS)
                    .readTimeout(30, TimeUnit.SECONDS)
                    .build()

                instance = Retrofit.Builder()
                    .baseUrl(BuildConfig.API_BASE_URL + "/")
                    .client(client)
                    .addConverterFactory(GsonConverterFactory.create())
                    .build()
                    .create(ApiService::class.java)
            }
            return instance!!
        }
    }
}
