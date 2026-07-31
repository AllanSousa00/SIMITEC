package com.example.data

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class TeamUser(
    val id: String = "",
    val name: String = "",
    val email: String = "",
    val phone: String = "",
    val role: String = "participant",
    val institution: String = "",
    val course: String = "",
    val city: String = "",
    val avatarUrl: String? = null,
    val sensitiveDataVisible: Boolean = false
)

@JsonClass(generateAdapter = true)
data class Participant(
    val name: String = "",
    val socialName: String? = null,
    val email: String = "",
    val cpf: String = "",
    val phone: String = "",
    val avatarUrl: String? = null,
    val photoUrl: String? = null,
    val imageUrl: String? = null,
    val teacherCardCode: String? = null,
    val role: String = "Estudante",
    val institution: String = "",
    val institutionPlaceId: String? = null,
    val institutionAddress: String? = null,
    val institutionGoogleMapsUri: String? = null,
    val institutionVerifiedAt: String? = null,
    val course: String = "",
    val shift: String = "",
    val city: String = "",
    val accessibility: String? = null
) {
    val maskedCpf: String
        get() = if (cpf.length == 11) "***.${cpf.substring(3, 6)}.${cpf.substring(6, 9)}-**" else "***.***.***-**"

    val maskedPhone: String
        get() = if (phone.length >= 10) "(**) ****-${phone.takeLast(4)}" else phone

    val maskedEmail: String
        get() {
            val parts = email.split("@")
            if (parts.size == 2 && parts[0].length > 2) {
                return "${parts[0].take(2)}***@${parts[1]}"
            }
            return email
        }
}

@JsonClass(generateAdapter = true)
data class GroupInfo(
    val id: String? = null,
    val institution: String? = null,
    val course: String? = null,
    val responsibleName: String? = null,
    val responsibleEmail: String? = null,
    val responsiblePhone: String? = null,
    val size: Int? = null
)

@JsonClass(generateAdapter = true)
data class Registration(
    val _id: String = "",
    val ticketCode: String = "",
    val activitySlug: String = "",
    val activityTitle: String = "",
    val status: String = "confirmed",
    var checkedIn: Boolean,
    var checkedInAt: String? = null,
    val participant: Participant = Participant(),
    val group: GroupInfo? = null,
    val groupName: String? = null,
    val details: Map<String, String>? = null
)

@JsonClass(generateAdapter = true)
data class AreaStat(
    val slug: String = "",
    val title: String = "",
    val shortTitle: String = "",
    val seats: Int = 0,
    val seatsPerPeriod: Int? = null,
    val taken: Int = 0,
    val available: Int? = null,
    val full: Boolean = seats > 0 && taken >= seats,
    val periods: List<AreaPeriod> = emptyList(),
    val sessionSlots: Map<String, Map<String, String>>? = null
)

@JsonClass(generateAdapter = true)
data class AreaPeriod(
    val name: String = "",
    val seats: Int = 0,
    val taken: Int = 0,
    val available: Int? = null,
    val full: Boolean = false
)

@JsonClass(generateAdapter = true)
data class Announcement(
    val id: String = "",
    val title: String = "",
    val content: String = "",
    val timestamp: String = "",
    val author: String = ""
)

@JsonClass(generateAdapter = true)
data class EventInfo(
    val id: String? = null,
    val title: String? = null,
    val name: String? = null,
    val fullName: String? = null,
    val edition: String? = null,
    val location: String? = null,
    val dateLabel: String? = null,
    val timeLabel: String? = null,
    val summary: String? = null,
    val logoUrl: String? = null,
    val footer: EventFooter? = null,
    val siteSettings: EventSiteSettings? = null
)

@JsonClass(generateAdapter = true)
data class EventFooter(
    val organizerName: String? = null,
    val email: String? = null,
    val instagram: String? = null,
    val whatsapp: String? = null,
    val footerText: String? = null,
    val termsEnabled: Boolean? = null,
    val privacyEnabled: Boolean? = null
)

@JsonClass(generateAdapter = true)
data class EventSiteSettings(
    val primaryColor: String? = null,
    val secondaryColor: String? = null,
    val backgroundColor: String? = null,
    val font: String? = null,
    val buttonStyle: String? = null,
    val darkMode: Boolean? = null,
    val inscriptionOpen: Boolean? = null,
    val loginEnabled: Boolean? = null,
    val createAccountEnabled: Boolean? = null,
    val passwordRecoveryEnabled: Boolean? = null
)

@JsonClass(generateAdapter = true)
data class AdminStats(
    val users: Int = 0,
    val verifiedUsers: Int = 0,
    val registrations: Int = 0,
    val confirmedRegistrations: Int = 0,
    val activities: Int = 0,
    val gallery: Int = 0,
    val speakers: Int = 0
)
