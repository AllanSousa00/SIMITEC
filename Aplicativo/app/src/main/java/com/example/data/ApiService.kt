package com.example.data

import retrofit2.Response
import retrofit2.http.*

// Authentication Payloads & Responses
data class LoginRequest(val email: String, val password: String)
data class GoogleLoginRequest(val credential: String)

data class LoginResponse(
    val sessionToken: String,
    val user: TeamUser,
    val message: String? = null,
    val needsProfileCompletion: Boolean? = null
)

data class ForgotPasswordRequest(val email: String, val audience: String = "staff")

data class MessageResponse(
    val message: String? = null,
    val previewUrl: String? = null
)

data class SensitiveAccessRequest(val password: String)

data class SensitiveAccessResponse(
    val sensitiveAccessToken: String,
    val expiresInSeconds: Int? = 300
)

data class MeResponse(
    val user: TeamUser
)

// Check-in and Bootstrap Payloads & Responses
data class BootstrapResponse(
    val database: String? = null,
    val serverTime: String? = null,
    val event: EventInfo? = null,
    val stats: CheckinStats = CheckinStats(),
    val areas: List<AreaStat> = emptyList(),
    val registrations: List<Registration> = emptyList()
)

data class CheckinStats(
    val total: Int = 0,
    val checkedIn: Int = 0,
    val pending: Int = 0,
    val areas: List<AreaStat> = emptyList(),
    val totalRegistrations: Int? = null,
    val totalCheckedIn: Int? = null,
    val totalPending: Int? = null,
    val percentage: Float? = null
) {
    val totalCount: Int get() = totalRegistrations ?: total
    val checkedInCount: Int get() = totalCheckedIn ?: checkedIn
    val pendingCount: Int get() = totalPending ?: pending
    val percentageValue: Float
        get() = percentage ?: if (totalCount > 0) checkedInCount.toFloat() / totalCount.toFloat() * 100f else 0f
}

data class ScanRequest(
    val payload: String
)

data class ScanResponse(
    val registration: Registration,
    val alreadyCheckedIn: Boolean? = null,
    val message: String? = null
)

data class CheckInRequest(
    val checkedIn: Boolean
)

data class CheckInResponse(
    val success: Boolean = true,
    val registration: Registration,
    val message: String? = null
)

data class InstitutionSuggestion(
    val placeId: String? = null,
    val code: String? = null,
    val name: String = "",
    val address: String? = null,
    val city: String? = null,
    val uf: String? = null,
    val dependency: String? = null,
    val source: String? = null,
    val googleMapsUri: String? = null,
    val primaryType: String? = null,
    val verifiedAt: String? = null
)

data class InstitutionSearchResponse(
    val enabled: Boolean = false,
    val source: String? = null,
    val institutions: List<InstitutionSuggestion> = emptyList()
)

data class OnsiteRegistrationRequest(
    val name: String,
    val socialName: String? = null,
    val email: String,
    val cpf: String,
    val phone: String,
    val role: String,
    val institution: String,
    val course: String,
    val shift: String,
    val city: String,
    val institutionPlaceId: String? = null,
    val institutionAddress: String? = null,
    val institutionGoogleMapsUri: String? = null,
    val institutionVerifiedAt: String? = null,
    val activitySlug: String,
    val accessibility: String? = null,
    val isGroup: Boolean = false,
    val groupMembers: List<Participant>? = null
)

data class GroupRegistrationRequest(
    val responsibleName: String,
    val responsibleEmail: String,
    val responsiblePhone: String,
    val institution: String,
    val course: String,
    val shift: String,
    val city: String,
    val institutionPlaceId: String? = null,
    val institutionAddress: String? = null,
    val institutionGoogleMapsUri: String? = null,
    val institutionVerifiedAt: String? = null,
    val activitySlug: String,
    val period: String? = null,
    val members: List<Participant>
)

data class OnsiteRegistrationResponse(
    val success: Boolean,
    val registration: Registration,
    val message: String? = null
)

data class UpdateRoleRequest(
    val role: String
)

data class UpdateRegistrationRequest(
    val participant: Participant,
    val reason: String
)

data class PublishAnnouncementRequest(
    val title: String,
    val content: String
)

data class AdminStatsResponse(val stats: AdminStats)
data class AdminUsersResponse(val users: List<TeamUser>)
data class AdminRegistrationsResponse(val registrations: List<Registration>)

interface ApiService {
    @POST("api/auth/login")
    @Headers("x-simitec-mobile-app: 1")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @POST("api/auth/google")
    @Headers("x-simitec-mobile-app: 1")
    suspend fun googleLogin(@Body request: GoogleLoginRequest): Response<LoginResponse>

    @POST("api/auth/forgot-password")
    @Headers("x-simitec-mobile-app: 1")
    suspend fun forgotPassword(@Body request: ForgotPasswordRequest): Response<MessageResponse>

    @GET("api/auth/me")
    suspend fun getMe(
        @Header("Authorization") sessionToken: String,
        @Header("x-sensitive-access") sensitiveToken: String? = null
    ): Response<MeResponse>

    @POST("api/auth/logout")
    suspend fun logout(
        @Header("Authorization") sessionToken: String
    ): Response<Unit>

    @POST("api/auth/sensitive-access")
    suspend fun getSensitiveAccess(
        @Header("Authorization") sessionToken: String,
        @Body request: SensitiveAccessRequest
    ): Response<SensitiveAccessResponse>

    @GET("api/checkin/bootstrap")
    suspend fun getBootstrap(
        @Header("Authorization") sessionToken: String,
        @Query("q") q: String? = null,
        @Query("checked") checked: String = "all",
        @Query("activitySlug") activitySlug: String = "all"
    ): Response<BootstrapResponse>

    @GET("api/checkin/stats")
    suspend fun getStats(
        @Header("Authorization") sessionToken: String
    ): Response<CheckinStats>

    @POST("api/checkin/scan")
    suspend fun scanRegistration(
        @Header("Authorization") sessionToken: String,
        @Body request: ScanRequest
    ): Response<ScanResponse>

    @PATCH("api/checkin/registrations/{id}/checkin")
    suspend fun toggleCheckin(
        @Header("Authorization") sessionToken: String,
        @Path("id") id: String,
        @Body request: CheckInRequest
    ): Response<CheckInResponse>

    @POST("api/checkin/onsite-registrations")
    suspend fun createOnsiteRegistration(
        @Header("Authorization") sessionToken: String,
        @Body request: OnsiteRegistrationRequest
    ): Response<OnsiteRegistrationResponse>

    @PATCH("api/checkin/registrations/{id}")
    suspend fun updateRegistration(
        @Header("Authorization") sessionToken: String,
        @Path("id") id: String,
        @Body request: UpdateRegistrationRequest
    ): Response<CheckInResponse>

    @POST("api/checkin/group-registrations")
    suspend fun createGroupRegistration(
        @Header("Authorization") sessionToken: String,
        @Body request: GroupRegistrationRequest
    ): Response<OnsiteRegistrationResponse>

    @GET("api/registrations/institutions/search")
    suspend fun searchInstitutions(
        @Query("q") query: String
    ): Response<InstitutionSearchResponse>

    @GET("api/admin/stats")
    suspend fun getAdminStats(
        @Header("Authorization") sessionToken: String
    ): Response<AdminStatsResponse>

    @GET("api/admin/users")
    suspend fun getAdminUsers(
        @Header("Authorization") sessionToken: String
    ): Response<AdminUsersResponse>

    @GET("api/admin/registrations")
    suspend fun getAdminRegistrations(
        @Header("Authorization") sessionToken: String
    ): Response<AdminRegistrationsResponse>

    @PUT("api/admin/content")
    suspend fun publishAnnouncement(
        @Header("Authorization") sessionToken: String,
        @Body request: PublishAnnouncementRequest
    ): Response<Announcement>

    @PATCH("api/admin/users/{id}/role")
    suspend fun updateUserRole(
        @Header("Authorization") sessionToken: String,
        @Path("id") id: String,
        @Body request: UpdateRoleRequest
    ): Response<TeamUser>
}
