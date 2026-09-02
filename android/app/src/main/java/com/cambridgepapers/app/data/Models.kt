package com.cambridgepapers.app.data

import com.google.gson.annotations.SerializedName

data class LoginRequest(
    val email: String,
    val password: String
)

data class RegisterRequest(
    val name: String,
    val email: String,
    val password: String
)

data class AuthResponse(
    val token: String,
    val user: User
)

data class User(
    val id: Int,
    val name: String,
    val email: String,
    @SerializedName("is_admin") val isAdmin: Boolean = false
)

data class Paper(
    val id: Int,
    @SerializedName("variant") val variant: Int = 0,
    @SerializedName("component_code") val componentCode: String? = null,
    @SerializedName("component_verified") val componentVerified: Int = 0,
    @SerializedName("variant_number") val variantNumber: Int? = null,
    @SerializedName("paper_number") val paperNumber: Int = 0,
    @SerializedName("paper_type") val paperType: String = "theory",
    @SerializedName("series_code") val seriesCode: String? = null,
    @SerializedName("subject_id") val subjectId: Int = 0,
    @SerializedName("subject_name") val subjectName: String = "",
    @SerializedName("subject_code") val subjectCode: String = "",
    @SerializedName("qualification_name") val qualificationName: String = "",
    @SerializedName("qualification_short_name") val qualificationShortName: String = "",
    val year: Int = 0,
    val session: String = "",
    @SerializedName("question_paper_url") val questionPaperUrl: String? = null,
    @SerializedName("mark_scheme_url") val markSchemeUrl: String? = null,
    @SerializedName("examiner_report_url") val examinerReportUrl: String? = null,
    val completed: Int = 0,
    @SerializedName("completed_at") val completedAt: String? = null
) {
    val displayVariant: Int get() = variantNumber ?: variant
    fun sessionLabel(): String = when (session) { "mj" -> "May/June"; "on" -> "October/November"; else -> session }
    fun displayLabel(): String = componentCode ?: "Paper ${if (variantNumber != null) displayVariant else paperNumber}"
}

data class PapersResponse(
    val papers: List<Paper>,
    val total: Int,
    val page: Int,
    val limit: Int
)

data class StatsResponse(
    val total: Int,
    val completed: Int,
    val remaining: Int,
    val percentage: Int,
    @SerializedName("bySubject") val bySubject: List<SubjectProgress>,
    val recent: List<Paper>
)

data class Subject(
    val id: Int,
    val name: String,
    val code: String,
    @SerializedName("qualification_short_name") val qualificationShortName: String = "",
    val description: String? = null,
    @SerializedName("paper_count") val paperCount: Int = 0
)

data class SubjectProgress(
    val name: String,
    val code: String,
    val qualification: String,
    val total: Int,
    @SerializedName("completed_count") val completedCount: Int
)

data class SubjectDetailResponse(
    val subject: Subject,
    val papers: List<Paper>,
    val total: Int,
    val completed: Int,
    val remaining: Int,
    val percentage: Int,
    // year -> session(mj/on) -> paperNumber -> VariantGroup
    val grouped: Map<String, Map<String, Map<String, VariantGroup>>>
)

data class VariantGroup(
    @SerializedName("paper_type") val paperType: String = "theory",
    @SerializedName("component_code") val componentCode: String? = null,
    val verified: Int = 0,
    val variants: List<Paper> = emptyList()
)

data class FilterResponse(
    val qualifications: List<String>,
    val subjects: List<Subject>,
    val years: List<Int>,
    val sessions: List<String>,
    @SerializedName("paperNumbers") val paperNumbers: List<Int>,
    val variants: List<Int>,
    @SerializedName("verificationStatuses") val verificationStatuses: List<String> = emptyList()
)

data class ToggleResponse(
    val completed: Boolean,
    @SerializedName("completedAt") val completedAt: String? = null
)

data class ImportResponse(
    val imported: Int,
    val errors: List<Map<String, Any>>,
    val total: Int
)

data class ToggleRequest(
    @SerializedName("paperId") val paperId: Int
)
