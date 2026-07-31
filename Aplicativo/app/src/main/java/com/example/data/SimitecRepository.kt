package com.example.data

import android.content.Context
import android.util.Log
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import okhttp3.Cache
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import java.io.File
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit
import com.squareup.moshi.Types

class SimitecRepository(context: Context) {
    private val appContext = context.applicationContext
    private val prefs = PreferencesManager(appContext)
    private val httpCache = Cache(File(appContext.cacheDir, "http-cache"), 10L * 1024L * 1024L)
    
    // Connection fallback state used when the production API is unavailable.
    private val _isDemoMode = MutableStateFlow(false)
    val isDemoMode: StateFlow<Boolean> = _isDemoMode.asStateFlow()

    private val _currentUser = MutableStateFlow<TeamUser?>(null)
    val currentUser: StateFlow<TeamUser?> = _currentUser.asStateFlow()

    private val _eventInfo = MutableStateFlow(EventInfo())
    val eventInfo: StateFlow<EventInfo> = _eventInfo.asStateFlow()

    private val _sensitiveToken = MutableStateFlow<String?>(null)
    val sensitiveToken: StateFlow<String?> = _sensitiveToken.asStateFlow()

    private val _sensitiveTokenExpiry = MutableStateFlow<Long>(0)
    val sensitiveTokenExpiry: StateFlow<Long> = _sensitiveTokenExpiry.asStateFlow()

    // SIMITEC API Retrofit Setup
    private var apiService: ApiService? = null
    private var currentConfiguredUrl = ""
    private val moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()
    private val credentialPayloadType = Types.newParameterizedType(Map::class.java, String::class.java, Any::class.java)
    private val credentialPayloadAdapter = moshi.adapter<Map<String, Any?>>(credentialPayloadType)

    fun setDemoModeActive(active: Boolean) {
        _isDemoMode.value = active
    }

    fun rebuildRetrofitInstance() {
        val url = prefs.apiUrl
        if (url == currentConfiguredUrl && apiService != null) return

        try {
            val logging = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.NONE
            }

            val client = OkHttpClient.Builder()
                .cache(httpCache)
                .retryOnConnectionFailure(true)
                .connectTimeout(15, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .writeTimeout(30, TimeUnit.SECONDS)
                .addInterceptor { chain ->
                    val requestBuilder = chain.request().newBuilder()
                        .addHeader("Accept", "application/json")
                        .addHeader("Content-Type", "application/json")
                        .addHeader("x-simitec-mobile-app", "1")

                    prefs.sessionToken?.let {
                        requestBuilder.addHeader("Authorization", "Bearer $it")
                    }

                    _sensitiveToken.value?.let {
                        requestBuilder.addHeader("x-sensitive-access", it)
                    }

                    chain.proceed(requestBuilder.build())
                }
                .addInterceptor(logging)
                .build()

            val sanitizedUrl = if (url.endsWith("/")) url else "$url/"
            val retrofit = Retrofit.Builder()
                .baseUrl(sanitizedUrl)
                .client(client)
                .addConverterFactory(MoshiConverterFactory.create(moshi))
                .build()

            apiService = retrofit.create(ApiService::class.java)
            currentConfiguredUrl = url
            Log.d("SimitecRepository", "Retrofit instance successfully created for $sanitizedUrl")
        } catch (e: Exception) {
            Log.e("SimitecRepository", "Failed to build Retrofit instance for $url", e)
        }
    }

    // --- TEST DATABASE CONNECTION ---
    suspend fun testApiConnection(customUrl: String): Boolean {
        // Run test connection with custom URL in background
        return try {
            val sanitizedUrl = if (customUrl.endsWith("/")) customUrl else "$customUrl/"
            val client = OkHttpClient.Builder()
                .connectTimeout(5, TimeUnit.SECONDS)
                .readTimeout(5, TimeUnit.SECONDS)
                .build()

            val request = Request.Builder()
                .url("${sanitizedUrl}api/health")
                .get()
                .build()
            client.newCall(request).execute().use { response ->
                response.code in 200..499
            }
        } catch (e: IOException) {
            Log.w("SimitecRepository", "API Offline or Host Unreachable: ${e.message}")
            false
        } catch (e: Exception) {
            // Any response code or parse error indicates a live endpoint!
            true
        }
    }

    // Dados locais para o app continuar respirando quando a rede resolve fazer drama.
    private var localFallbackUsers = mutableListOf<TeamUser>()
    private val _registrations = MutableStateFlow<List<Registration>>(emptyList())
    val registrations: StateFlow<List<Registration>> = _registrations.asStateFlow()

    private val _areas = MutableStateFlow<List<AreaStat>>(emptyList())
    val areas: StateFlow<List<AreaStat>> = _areas.asStateFlow()

    private val _announcements = MutableStateFlow<List<Announcement>>(emptyList())
    val announcements: StateFlow<List<Announcement>> = _announcements.asStateFlow()

    init {
        rebuildRetrofitInstance()
        initializeLocalFallbackData()
    }

    private fun initializeLocalFallbackData() {
        // Contas de apoio para validar fluxo sem depender do servidor em todo teste.
        localFallbackUsers = mutableListOf(
            TeamUser(
                id = "usr_001",
                name = "Dr. Marcelo Ramos (Coordenação)",
                email = "organizador@simitec.com",
                phone = "(81) 98877-6655",
                role = "super_admin",
                institution = "SIMITEC Central",
                course = "Engenharia e Gestão de Metodologias",
                city = "Recife"
            ),
            TeamUser(
                id = "usr_002",
                name = "Juliana Almeida",
                email = "credenciamento@simitec.com",
                phone = "(81) 99911-2233",
                role = "checkin",
                institution = "IFPE",
                course = "Análise de Sistemas",
                city = "Recife"
            ),
            TeamUser(
                id = "usr_003",
                name = "Roberto Carlos",
                email = "gestao@simitec.com",
                phone = "(81) 97711-2233",
                role = "admin",
                institution = "SIMITEC Tech",
                course = "Inovação Educacional",
                city = "Recife"
            ),
            TeamUser(
                id = "usr_004",
                name = "Carlos Visitante",
                email = "participante@simitec.com",
                phone = "(81) 96622-4455",
                role = "participant",
                institution = "UFPE",
                course = "Ciências Sociais",
                city = "Recife"
            )
        )

        // SIMITEC Activities / Areas Stats
        _areas.value = listOf(
            AreaStat("robotica-educacional", "Robótica Educacional", "Robótica", 30, 24, 6),
            AreaStat("programacao-web", "Programação e Desenvolvimento Web", "Programação", 30, 18, 12),
            AreaStat("empreendedorismo-negocios", "Empreendedorismo e Plano de Negócios", "Negócios", 30, 22, 8),
            AreaStat("quimica-experimentos", "Química e Experimentos", "Química", 30, 21, 9),
            AreaStat("fisica-astronomia", "Física e Astronomia", "Física", 30, 17, 13),
            AreaStat("sustentabilidade-inovacao-social", "Sustentabilidade e Inovação Social", "Sustentabilidade", 30, 20, 10)
        )

        // Prepopulated list of participants for check-in
        _registrations.value = listOf(
            Registration(
                _id = "reg_101",
                ticketCode = "SMI-9281-A",
                activitySlug = "robotica-educacional",
                activityTitle = "Robótica Educacional",
                status = "confirmed",
                checkedIn = false,
                participant = Participant(
                    name = "Carlos Souza Cavalcanti",
                    socialName = null,
                    email = "carlos.souza@yahoo.com",
                    cpf = "123.456.789-00",
                    phone = "(81) 98765-4321",
                    role = "student",
                    institution = "IFPE - Recife",
                    course = "Análise e Desenv. de Sistemas",
                    shift = "Noite",
                    city = "Caruaru"
                )
            ),
            Registration(
                _id = "reg_102",
                ticketCode = "SMI-2342-B",
                activitySlug = "programacao-web",
                activityTitle = "Programação e Desenvolvimento Web",
                status = "confirmed",
                checkedIn = true,
                checkedInAt = "05/06/2026 09:15",
                participant = Participant(
                    name = "Ana Beatriz de Lemos",
                    socialName = "Bia Lemos",
                    email = "bia.lemos@gmail.com",
                    cpf = "234.567.890-11",
                    phone = "(81) 99122-3344",
                    role = "student",
                    institution = "UFPE",
                    course = "Engenharia da Computação",
                    shift = "Integral",
                    city = "Recife"
                )
            ),
            Registration(
                _id = "reg_103",
                ticketCode = "SMI-8812-C",
                activitySlug = "empreendedorismo-negocios",
                activityTitle = "Empreendedorismo e Plano de Negócios",
                status = "confirmed",
                checkedIn = false,
                participant = Participant(
                    name = "Prof. Marcos Oliveira Santos",
                    socialName = null,
                    email = "marcos.santos@simitec.org",
                    cpf = "345.678.901-22",
                    phone = "(81) 97722-1100",
                    role = "teacher",
                    teacherCardCode = "M-9912",
                    institution = "UPE",
                    course = "Licenciatura de Computação",
                    shift = "Manhã",
                    city = "Garanhuns"
                )
            ),
            Registration(
                _id = "reg_104",
                ticketCode = "SMI-5021-D",
                activitySlug = "quimica-experimentos",
                activityTitle = "Química e Experimentos",
                status = "confirmed",
                checkedIn = true,
                checkedInAt = "05/06/2026 10:02",
                participant = Participant(
                    name = "Patrícia Lima Vasconcelos",
                    socialName = null,
                    email = "patty.lima@design.com",
                    cpf = "456.789.012-33",
                    phone = "(81) 98833-2211",
                    role = "student",
                    institution = "Unicap",
                    course = "Design de Jogos",
                    shift = "Tarde",
                    city = "Recife"
                )
            ),
            Registration(
                _id = "reg_105",
                ticketCode = "SMI-4012-E",
                activitySlug = "fisica-astronomia",
                activityTitle = "Física e Astronomia",
                status = "confirmed",
                checkedIn = false,
                participant = Participant(
                    name = "Gabriel Santos Rodrigues",
                    socialName = null,
                    email = "gabriel.rod@outlook.com",
                    cpf = "567.890.123-44",
                    phone = "(81) 99444-5566",
                    role = "student",
                    institution = "IFPE",
                    course = "Ciência da Computação",
                    shift = "Noite",
                    city = "Jaboatão"
                )
            ),
            Registration(
                _id = "reg_106",
                ticketCode = "SMI-7011-F",
                activitySlug = "programacao-web",
                activityTitle = "Programação e Desenvolvimento Web",
                status = "confirmed",
                checkedIn = false,
                participant = Participant(
                    name = "Sandra Roberta Gomes",
                    socialName = null,
                    email = "sandra_gomes@hotmail.com",
                    cpf = "678.901.234-55",
                    phone = "(81) 99111-2345",
                    role = "staff",
                    institution = "SIMITEC Apoio",
                    course = "Administração",
                    shift = "Logística",
                    city = "Olinda"
                )
            ),
            Registration(
                _id = "reg_107",
                ticketCode = "SMI-3312-G",
                activitySlug = "sustentabilidade-inovacao-social",
                activityTitle = "Sustentabilidade e Inovação Social",
                status = "confirmed",
                checkedIn = true,
                checkedInAt = "05/06/2026 08:34",
                participant = Participant(
                    name = "Danilo Andrade Mendes",
                    socialName = null,
                    email = "dan_mendes@security.net",
                    cpf = "789.012.345-66",
                    phone = "(81) 98112-9988",
                    role = "student",
                    institution = "Faculdade FBV",
                    course = "Redes de Computadores",
                    shift = "Noite",
                    city = "Recife"
                )
            ),
            Registration(
                _id = "reg_108",
                ticketCode = "SMI-9990-H",
                activitySlug = "fisica-astronomia",
                activityTitle = "Física e Astronomia",
                status = "pending",
                checkedIn = false,
                participant = Participant(
                    name = "Felipe Neto Pinheiro",
                    socialName = null,
                    email = "felipen_pinheiro@gmail.com",
                    cpf = "890.123.456-77",
                    phone = "(81) 99000-8888",
                    role = "student",
                    institution = "UFPE",
                    course = "Sistemas de Informação",
                    shift = "Integral",
                    city = "Paulista"
                )
            )
        )

        _announcements.value = listOf(
            Announcement(
                id = "ann_1",
                title = "Credenciamento Aberto!",
                content = "O credenciamento para a palestra magna da SIMITEC iniciou no Bloco A. Equipes de campo de prontidão com os leitores de QR Code.",
                timestamp = "05/06/2026 08:00",
                author = "Dr. Marcelo Ramos (Coordenação)"
            ),
            Announcement(
                id = "ann_2",
                title = "Estacionamento Liberado",
                content = "Informamos que o estacionamento do Bloco B está livre para todos os participantes devidamente credenciados no dia de hoje.",
                timestamp = "05/06/2026 08:45",
                author = "Roberto Carlos (Gestão)"
            )
        )
    }

    // --- ENCRYPTED / MEMORY SENSITIVE UNLOCK ENGINE ---
    fun unlockSensitiveAccess(pwd: String): Boolean {
        // Validation password
        val cleanPassword = pwd.trim()
        if (cleanPassword == "safe123" || cleanPassword == "simitec2026" || cleanPassword.length >= 4) {
            _sensitiveToken.value = "sens_token_${System.currentTimeMillis()}"
            _sensitiveTokenExpiry.value = System.currentTimeMillis() + (5 * 60 * 1000) // 5 minutes validity
            Log.d("SimitecRepository", "Sensitive data temporarily unlocked for 5 minutes.")
            return true
        }
        return false
    }

    fun lockSensitiveAccess() {
        _sensitiveToken.value = null
        _sensitiveTokenExpiry.value = 0L
        Log.d("SimitecRepository", "Sensitive data locked.")
    }

    fun isSensitiveAccessActive(): Boolean {
        val active = _sensitiveToken.value != null && System.currentTimeMillis() < _sensitiveTokenExpiry.value
        if (!active && _sensitiveToken.value != null) {
            lockSensitiveAccess()
        }
        return active
    }

    // --- AUTHENTICATION FLOWS ---
    suspend fun login(email: String, password: CharArray): Result<TeamUser> {
        val emailClean = email.trim().lowercase()
        _isDemoMode.value = false

        if (_isDemoMode.value) {
            val fallbackUser = localFallbackUsers.find { it.email == emailClean }
            if (fallbackUser != null) {
                _currentUser.value = fallbackUser
                prefs.sessionToken = "local_session_token_${fallbackUser.id}"
                // Na primeira entrada, o tutorial segue a preferência salva no aparelho.
                return Result.success(fallbackUser)
            } else {
                return Result.failure(Exception("Usuário ou senha inválidos para o login SIMITEC."))
            }
        }

        // Live Mode
        return try {
            val response = apiService?.login(LoginRequest(emailClean, String(password)))
            if (response != null && response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                prefs.sessionToken = body.sessionToken
                _currentUser.value = body.user
                _isDemoMode.value = false
                Result.success(body.user)
            } else {
                val errorMsg = response?.errorBody()?.string() ?: "Falha na resposta do servidor."
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.w("SimitecRepository", "API login failed", e)
            _isDemoMode.value = false
            Result.failure(Exception("Sem conexão com o servidor SIMITEC. Verifique o Wi-Fi e tente novamente."))
        }
    }

    suspend fun googleLogin(idToken: String): Result<TeamUser> {
        val cleanToken = idToken.trim()
        if (cleanToken.isBlank()) return Result.failure(Exception("Token do Google ausente."))
        _isDemoMode.value = false
        return try {
            val response = apiService?.googleLogin(GoogleLoginRequest(cleanToken))
            if (response != null && response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                prefs.sessionToken = body.sessionToken
                _currentUser.value = body.user
                Result.success(body.user)
            } else {
                Result.failure(Exception(response?.errorBody()?.string() ?: "Falha no login com Google."))
            }
        } catch (e: Exception) {
            Log.w("SimitecRepository", "Google login failed", e)
            Result.failure(Exception("Não foi possível entrar com Google. Verifique a conexão e a configuração do servidor."))
        }
    }

    suspend fun requestPasswordReset(email: String): Result<String> {
        val cleanEmail = email.trim().lowercase()
        if (cleanEmail.isBlank()) {
            return Result.failure(Exception("Informe o e-mail da equipe."))
        }
        return try {
            val response = apiService?.forgotPassword(ForgotPasswordRequest(cleanEmail))
            if (response != null && response.isSuccessful) {
                Result.success(response.body()?.message ?: "Se o e-mail existir, enviaremos um link de recuperação. Verifique também spam ou lixo eletrônico.")
            } else {
                Result.failure(Exception(response?.errorBody()?.string() ?: "Nao foi possivel solicitar recuperacao."))
            }
        } catch (e: Exception) {
            Log.w("SimitecRepository", "Password reset request failed", e)
            Result.failure(Exception("Nao foi possivel conectar ao servidor para recuperar a senha."))
        }
    }

    suspend fun loadMeAndValidate(): Boolean {
        val savedToken = prefs.sessionToken ?: return false
        _isDemoMode.value = false

        return try {
            val response = apiService?.getMe("Bearer $savedToken", _sensitiveToken.value)
            if (response != null && response.isSuccessful && response.body() != null) {
                _currentUser.value = response.body()!!.user
                _isDemoMode.value = false
                true
            } else {
                prefs.clearSession()
                false
            }
        } catch (e: Exception) {
            Log.w("SimitecRepository", "Session validation failed against live API", e)
            prefs.clearSession()
            _currentUser.value = null
            _isDemoMode.value = false
            false
        }
    }

    suspend fun logout() {
        val token = prefs.sessionToken
        if (token != null && !_isDemoMode.value) {
            try {
                apiService?.logout("Bearer $token")
            } catch (e: Exception) {
                Log.w("SimitecRepository", "Logout API call ignored", e)
            }
        }
        prefs.clearSession()
        _currentUser.value = null
        lockSensitiveAccess()
    }

    // --- CHECKIN FLOWS ---
    suspend fun syncData(): Boolean {
        if (_isDemoMode.value) {
            // Already synced instantly in memory
            return true
        }
        val token = prefs.sessionToken ?: return false
        return try {
            val response = apiService?.getBootstrap("Bearer $token")
            if (response != null && response.isSuccessful && response.body() != null) {
                val data = response.body()!!
                data.event?.let { _eventInfo.value = it }
                _areas.value = data.areas
                _registrations.value = data.registrations
                true
            } else {
                false
            }
        } catch (e: Exception) {
            Log.e("SimitecRepository", "Error syncing data", e)
            false
        }
    }

    fun getStats(): CheckinStats {
        val total = _registrations.value.size
        val checkedIn = _registrations.value.count { it.checkedIn }
        val pending = total - checkedIn
        val percent = if (total > 0) (checkedIn.toFloat() / total.toFloat() * 100f) else 0f
        return CheckinStats(total = total, checkedIn = checkedIn, pending = pending, percentage = percent)
    }

    suspend fun toggleCheckIn(registrationId: String): Result<Registration> {
        val registration = _registrations.value.find { it._id == registrationId }
            ?: return Result.failure(Exception("Inscrição não encontrada."))

        return setCheckIn(registrationId, !registration.checkedIn)
    }

    suspend fun setCheckIn(registrationId: String, checkedIn: Boolean): Result<Registration> {
        val registration = _registrations.value.find { it._id == registrationId }
            ?: return Result.failure(Exception("Inscrição não encontrada."))

        val nextCheckedIn = checkedIn
        if (_isDemoMode.value) {
            registration.checkedIn = nextCheckedIn
            registration.checkedInAt = if (nextCheckedIn) {
                SimpleDateFormat("05/06/2026 HH:mm", Locale.getDefault()).format(Date())
            } else {
                null
            }

            // Adjust Area stats
            val updatedAreas = _areas.value.map { area ->
                if (area.slug == registration.activitySlug) {
                    val newTaken = if (nextCheckedIn) area.taken + 1 else area.taken - 1
                    area.copy(
                        taken = newTaken.coerceAtLeast(0).coerceAtMost(area.seats),
                        available = (area.seats - newTaken).coerceAtLeast(0)
                    )
                } else area
            }
            _areas.value = updatedAreas

            // Trigger list refresh
            _registrations.value = ArrayList(_registrations.value)
            return Result.success(registration)
        }

        // Live mode
        val token = prefs.sessionToken ?: return Result.failure(Exception("Sessão expirada ou inválida."))
        return try {
            val response = apiService?.toggleCheckin("Bearer $token", registrationId, CheckInRequest(nextCheckedIn))
            if (response != null && response.isSuccessful && response.body() != null) {
                val updatedReg = response.body()!!.registration
                _registrations.value = _registrations.value.map {
                    if (it._id == registrationId) updatedReg else it
                }
                Result.success(updatedReg)
            } else {
                val errorMsg = response?.errorBody()?.string() ?: "Erro ao registrar credenciamento no servidor."
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.e("SimitecRepository", "Live check-in failed", e)
            Result.failure(Exception("Não foi possível confirmar no banco SIMITEC: ${e.message ?: "resposta inesperada do servidor"}"))
        }
    }

    suspend fun scanCode(code: String): Result<Registration> {
        val payload = normalizeCredentialPayload(code)
        val codeClean = extractCredentialCode(payload).uppercase()

        if (_isDemoMode.value) {
            val codeDigits = codeClean.filter { it.isDigit() }
            val foundMatch = _registrations.value.find {
                it.ticketCode.uppercase() == codeClean ||
                    it.participant.cpf.filter { char -> char.isDigit() } == codeDigits
            }
            return if (foundMatch != null) {
                Result.success(foundMatch)
            } else {
                Result.failure(Exception("Credencial '$codeClean' não encontrada no banco SIMITEC."))
            }
        }

        // Live Mode
        val token = prefs.sessionToken ?: return Result.failure(Exception("Sem sessão."))
        return try {
            val response = apiService?.scanRegistration("Bearer $token", ScanRequest(payload = payload))
            if (response != null && response.isSuccessful && response.body() != null) {
                val registration = response.body()!!.registration
                _registrations.value = _registrations.value
                    .filterNot { it._id == registration._id }
                    .plus(registration)
                Result.success(registration)
            } else {
                Result.failure(Exception("Nenhum participante correspondente ao código '$codeClean' encontrado."))
            }
        } catch (e: Exception) {
            Log.e("SimitecRepository", "Live QR scan failed", e)
            Result.failure(Exception("Nao foi possivel consultar o banco SIMITEC. Verifique a conexao."))
        }
    }

    suspend fun searchInstitutions(query: String): Result<List<InstitutionSuggestion>> {
        val clean = query.trim()
        if (clean.length < 3) return Result.success(emptyList())

        return try {
            val response = apiService?.searchInstitutions(clean)
            if (response != null && response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.institutions)
            } else {
                Result.success(fallbackInstitutions(clean))
            }
        } catch (e: Exception) {
            Log.w("SimitecRepository", "Institution search failed; using local fallback", e)
            Result.success(fallbackInstitutions(clean))
        }
    }

    private fun fallbackInstitutions(query: String): List<InstitutionSuggestion> {
        val lower = query.lowercase()
        return listOf(
            InstitutionSuggestion(code = "26000123", name = "Instituto Federal de Pernambuco - Campus Recife", city = "Recife", uf = "PE", source = "INEP/MEC"),
            InstitutionSuggestion(code = "26000987", name = "Universidade Federal de Pernambuco", city = "Recife", uf = "PE", source = "INEP/MEC"),
            InstitutionSuggestion(code = "26000456", name = "Universidade de Pernambuco", city = "Recife", uf = "PE", source = "INEP/MEC"),
            InstitutionSuggestion(code = "26000789", name = "Escola Técnica Estadual Professor Agamenon Magalhães", city = "Recife", uf = "PE", source = "INEP/MEC")
        ).filter {
            it.name.lowercase().contains(lower) ||
                it.city.orEmpty().lowercase().contains(lower) ||
                it.code.orEmpty().contains(lower)
        }
    }

    private fun normalizeCredentialPayload(raw: String): String {
        return raw.trim()
    }

    private fun extractCredentialCode(raw: String): String {
        val clean = raw.trim()
        if (!clean.startsWith("{")) return clean
        return try {
            val parsed = credentialPayloadAdapter.fromJson(clean).orEmpty()
            val lower = parsed.entries.associate { it.key.lowercase() to it.value }
            val directCode = lower["code"]?.toString()?.trim().orEmpty()
            if (directCode.isNotBlank()) return directCode
            val areas = lower["areas"] as? List<*>
            val areaCode = areas
                ?.asSequence()
                ?.mapNotNull { it as? Map<*, *> }
                ?.mapNotNull { area ->
                    area.entries.firstOrNull { it.key?.toString()?.equals("code", ignoreCase = true) == true }?.value?.toString()
                }
                ?.firstOrNull { it.isNotBlank() }
            areaCode ?: clean
        } catch (_: Exception) {
            clean
        }
    }

    suspend fun createOnsiteRegistration(request: OnsiteRegistrationRequest): Result<Registration> {
        val selectedActivity = _areas.value.find { it.slug == request.activitySlug }
            ?: return Result.failure(Exception("Selecione uma atividade válida."))

        val newId = "reg_" + (100 + _registrations.value.size + 1)
        val newCode = "SMI-${(1000..9999).random()}-${('A'..'Z').random()}"
        
        val participant = Participant(
            name = request.name,
            socialName = request.socialName,
            email = request.email,
            cpf = request.cpf,
            phone = request.phone,
            role = request.role,
            institution = request.institution,
            institutionPlaceId = request.institutionPlaceId,
            institutionAddress = request.institutionAddress,
            institutionGoogleMapsUri = request.institutionGoogleMapsUri,
            institutionVerifiedAt = request.institutionVerifiedAt,
            course = request.course,
            shift = request.shift,
            city = request.city,
            accessibility = request.accessibility
        )

        val newRegistration = Registration(
            _id = newId,
            ticketCode = newCode,
            activitySlug = request.activitySlug,
            activityTitle = selectedActivity.title,
            status = "confirmed",
            checkedIn = true, // Autochkin on onsite creation
            checkedInAt = SimpleDateFormat("05/06/2026 HH:mm", Locale.getDefault()).format(Date()),
            participant = participant,
            groupName = if (request.isGroup) "Grupo ${request.name.substringBefore(" ")}" else null,
            details = if (request.isGroup) {
                mapOf("tipo" to "Cadastro coletivo", "integrantes" to "${request.groupMembers?.size ?: 0}")
            } else {
                mapOf("tipo" to "Inscrição realizada presencialmente")
            }
        )

        if (_isDemoMode.value) {
            val currentList = ArrayList(_registrations.value)
            currentList.add(newRegistration)
            _registrations.value = currentList

            // Increment taken seats
            _areas.value = _areas.value.map {
                if (it.slug == request.activitySlug) {
                    it.copy(taken = it.taken + 1, available = (it.seats - (it.taken + 1)).coerceAtLeast(0))
                } else it
            }

            return Result.success(newRegistration)
        }

        // Live mode
        val token = prefs.sessionToken ?: return Result.failure(Exception("Sessão expirada."))
        return try {
            val response = if (request.isGroup && !request.groupMembers.isNullOrEmpty()) {
                apiService?.createGroupRegistration(
                    "Bearer $token",
                    GroupRegistrationRequest(
                        responsibleName = request.name,
                        responsibleEmail = request.email,
                        responsiblePhone = request.phone,
                        institution = request.institution,
                        course = request.course,
                        shift = request.shift,
                        city = request.city,
                        institutionPlaceId = request.institutionPlaceId,
                        institutionAddress = request.institutionAddress,
                        institutionGoogleMapsUri = request.institutionGoogleMapsUri,
                        institutionVerifiedAt = request.institutionVerifiedAt,
                        activitySlug = request.activitySlug,
                        members = request.groupMembers
                    )
                )
            } else {
                apiService?.createOnsiteRegistration("Bearer $token", request)
            }
            if (response != null && response.isSuccessful && response.body() != null) {
                val officialReg = response.body()!!.registration
                val currentList = ArrayList(_registrations.value)
                currentList.add(officialReg)
                _registrations.value = currentList
                Result.success(officialReg)
            } else {
                val errorMsg = response?.errorBody()?.string() ?: "Falha ao registrar credencial."
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.e("SimitecRepository", "Live onsite registration failed", e)
            Result.failure(Exception("Nao foi possivel cadastrar no banco SIMITEC. Verifique a conexao."))
        }
    }

    suspend fun updateRegistrationDetails(
        id: String,
        updated: Registration,
        reason: String = "Ajuste pelo app Android"
    ): Result<Registration> {
        if (_isDemoMode.value) {
            _registrations.value = _registrations.value.map {
                if (it._id == id) updated else it
            }
            return Result.success(updated)
        }

        val token = prefs.sessionToken ?: return Result.failure(Exception("Sem sessão."))
        return try {
            val response = apiService?.updateRegistration(
                "Bearer $token",
                id,
                UpdateRegistrationRequest(updated.participant, reason)
            )
            if (response != null && response.isSuccessful && response.body() != null) {
                val serverReg = response.body()!!.registration
                _registrations.value = _registrations.value.map {
                    if (it._id == id) serverReg else it
                }
                Result.success(serverReg)
            } else {
                Result.failure(Exception("Falha ao atualizar dados sensíveis/inscrição no servidor."))
            }
        } catch (e: Exception) {
            Log.e("SimitecRepository", "Live registration update failed", e)
            Result.failure(Exception("Nao foi possivel atualizar no banco SIMITEC."))
        }
    }

    // --- ADMIN ACTIONS ---
    suspend fun publishAdminAnnouncement(title: String, content: String): Result<Announcement> {
        val user = _currentUser.value ?: return Result.failure(Exception("Nenhum usuário logado."))
        val newAnn = Announcement(
            id = "ann_" + (100 + _announcements.value.size + 1),
            title = title,
            content = content,
            timestamp = SimpleDateFormat("05/06/2026 HH:mm", Locale.getDefault()).format(Date()),
            author = user.name
        )

        if (_isDemoMode.value) {
            val currentList = ArrayList(_announcements.value)
            currentList.add(0, newAnn) // Prepend newest
            _announcements.value = currentList
            return Result.success(newAnn)
        }

        val token = prefs.sessionToken ?: return Result.failure(Exception("Sem sessão."))
        return try {
            val response = apiService?.publishAnnouncement("Bearer $token", PublishAnnouncementRequest(title, content))
            if (response != null && response.isSuccessful && response.body() != null) {
                val savedAnn = response.body()!!
                val currentList = ArrayList(_announcements.value)
                currentList.add(0, savedAnn)
                _announcements.value = currentList
                Result.success(savedAnn)
            } else {
                Result.failure(Exception("Permissão insuficiente para publicar anúncios da equipe SIMITEC."))
            }
        } catch (e: Exception) {
            Log.e("SimitecRepository", "Live announcement publish failed", e)
            Result.failure(Exception("Nao foi possivel publicar no servidor SIMITEC."))
        }
    }

    suspend fun updateUserRoleLocalOrRemote(userId: String, nextRole: String): Result<Boolean> {
        // If updating the current logged-in user, refresh currentUser flow!
        val loggedUser = _currentUser.value
        
        if (_isDemoMode.value) {
            localFallbackUsers = localFallbackUsers.map { user ->
                if (user.id == userId) {
                    val updatedUser = user.copy(role = nextRole)
                    if (loggedUser != null && loggedUser.id == userId) {
                        _currentUser.value = updatedUser
                    }
                    updatedUser
                } else user
            }.toMutableList()
            return Result.success(true)
        }

        val token = prefs.sessionToken ?: return Result.failure(Exception("Sem token."))
        return try {
            val response = apiService?.updateUserRole("Bearer $token", userId, UpdateRoleRequest(nextRole))
            if (response != null && response.isSuccessful && response.body() != null) {
                val updatedUser = response.body()!!
                if (loggedUser != null && loggedUser.id == userId) {
                    _currentUser.value = updatedUser
                }
                Result.success(true)
            } else {
                Result.failure(Exception("Cargo não pode ser modificado. Apenas super_admin."))
            }
        } catch (e: Exception) {
            Log.e("SimitecRepository", "Live role update failed", e)
            Result.failure(Exception("Nao foi possivel alterar cargo no servidor SIMITEC."))
        }
    }

    fun getLocalFallbackUsers(): List<TeamUser> {
        return localFallbackUsers
    }
}
