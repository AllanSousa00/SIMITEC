package com.example.ui

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.*
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class SimitecViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = SimitecRepository(application)
    private val prefs = PreferencesManager(application)

    // Exposed configuration flows
    val isDemoMode = repository.isDemoMode
    val currentUser = repository.currentUser
    val eventInfo = repository.eventInfo
    val registrations = repository.registrations
    val areas = repository.areas
    val announcements = repository.announcements

    // --- SCREEN NAVIGATION STATE STACK ---
    private val _currentScreen = MutableStateFlow("splash")
    val currentScreen: StateFlow<String> = _currentScreen.asStateFlow()
    private val navigationStack = mutableListOf<String>()

    fun navigateTo(screen: String) {
        val current = _currentScreen.value
        if (current == screen) return
        if (current !in setOf("splash", "login")) {
            navigationStack.add(current)
        }
        _currentScreen.value = screen
    }

    fun handleSystemBack() {
        val current = _currentScreen.value
        if (current in setOf("dashboard", "login", "splash")) return
        val previous = navigationStack.removeLastOrNull()
        _currentScreen.value = previous?.takeIf { it !in setOf("splash", "login") } ?: "dashboard"
    }

    fun replaceScreen(screen: String) {
        _currentScreen.value = screen
    }

    // --- FORM INPUT STATES ---
    val loginEmail = MutableStateFlow("")
    val loginPassword = MutableStateFlow("")
    val configApiUrl = MutableStateFlow(prefs.apiUrl)
    val preferDarkMode = MutableStateFlow(prefs.darkMode)
    val preferCompactMode = MutableStateFlow(prefs.compactMode)
    val preferCalmMotion = MutableStateFlow(true)
    val securityBiometricEnabled = MutableStateFlow(prefs.biometricEnabled)
    val securityFacialEnabled = MutableStateFlow(prefs.facialEnabled)
    val securityAppPasswordEnabled = MutableStateFlow(prefs.appPasswordEnabled)
    val securityAutoLockEnabled = MutableStateFlow(prefs.autoLockEnabled)
    val securityMaskSensitiveData = MutableStateFlow(prefs.maskSensitiveData)
    val securityBlockScreenshots = MutableStateFlow(prefs.blockScreenshots)
    val appLanguage = MutableStateFlow(prefs.language)

    private val _connectionStatus = MutableStateFlow<String?>(null) // "Testing...", "Success!", "Failed!"
    val connectionStatus: StateFlow<String?> = _connectionStatus.asStateFlow()

    // --- UI GENERIC BLOCK STATES ---
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val _successMessage = MutableStateFlow<String?>(null)
    val successMessage: StateFlow<String?> = _successMessage.asStateFlow()

    // --- ONBOARDING CAROUSEL SLIDE INDEX ---
    private val _tutorialSlideIndex = MutableStateFlow(0)
    val tutorialSlideIndex: StateFlow<Int> = _tutorialSlideIndex.asStateFlow()

    // --- DASHBOARD AND FILTER LIST PARAMETERS ---
    val searchQuery = MutableStateFlow("")
    val searchStatusFilter = MutableStateFlow("all")
    val manualScanCode = MutableStateFlow("")

    // --- SELECTED REGISTRATION SHEET ---
    private val _selectedRegistration = MutableStateFlow<Registration?>(null)
    val selectedRegistration: StateFlow<Registration?> = _selectedRegistration.asStateFlow()

    // --- SENSITIVE DATA ENCRYPTION TIMER COOLDOWN ---
    private val _isSensitiveUnlocked = MutableStateFlow(false)
    val isSensitiveUnlocked: StateFlow<Boolean> = _isSensitiveUnlocked.asStateFlow()

    private val _sensitiveTimerSeconds = MutableStateFlow(0)
    val sensitiveTimerSeconds: StateFlow<Int> = _sensitiveTimerSeconds.asStateFlow()

    private var sensitiveCountdownJob: Job? = null
    private var automaticSyncJob: Job? = null
    private var automaticSyncRunning = false
    private var lastSyncAt = 0L
    private val automaticSyncIntervalMs = 60_000L
    private val foregroundSyncMinIntervalMs = 20_000L

    // --- ONSITE INDIVIDUAL AND COLLECTIVE REGISTRATIONS FORM ---
    val onsiteFormName = MutableStateFlow("")
    val onsiteFormSocialName = MutableStateFlow("")
    val onsiteFormEmail = MutableStateFlow("")
    val onsiteFormCpf = MutableStateFlow("")
    val onsiteFormPhone = MutableStateFlow("")
    val onsiteFormRole = MutableStateFlow("Estudante")
    val onsiteFormTeacherCard = MutableStateFlow("")
    val onsiteFormInstitution = MutableStateFlow("")
    val institutionSuggestions = MutableStateFlow<List<InstitutionSuggestion>>(emptyList())
    val selectedInstitution = MutableStateFlow<InstitutionSuggestion?>(null)
    private var institutionSearchJob: Job? = null
    val onsiteFormCourse = MutableStateFlow("")
    val onsiteFormShift = MutableStateFlow("Noturno")
    val onsiteFormCity = MutableStateFlow("")
    val onsiteFormActivitySlug = MutableStateFlow("robotica-educacional")
    val onsiteFormAccessibility = MutableStateFlow("")

    val onsiteIsGroup = MutableStateFlow(false)
    private val _onsiteGroupList = MutableStateFlow<List<Participant>>(emptyList())
    val onsiteGroupList: StateFlow<List<Participant>> = _onsiteGroupList.asStateFlow()

    val onsiteGroupMemberName = MutableStateFlow("")
    val onsiteGroupMemberCpf = MutableStateFlow("")
    val onsiteGroupMemberEmail = MutableStateFlow("")

    // --- ADMIN SCREEN PANEL FORMS ---
    val adminAnnTitle = MutableStateFlow("")
    val adminAnnContent = MutableStateFlow("")

    init {
        // Run splash verify
        runSplashDelay()
    }

    private fun runSplashDelay() {
        viewModelScope.launch {
            delay(180)
            val hasValidUser = repository.loadMeAndValidate()
            if (hasValidUser) {
                if (prefs.tutorialSeen) {
                    _currentScreen.value = "dashboard"
                } else {
                    _currentScreen.value = "tutorial"
                }
                startAutomaticSync()
            } else {
                _currentScreen.value = "login"
            }
            repository.syncData()
        }
    }

    private fun startAutomaticSync() {
        if (automaticSyncJob?.isActive == true) return
        automaticSyncJob = viewModelScope.launch {
            while (true) {
                delay(automaticSyncIntervalMs)
                syncDataSilently(force = true)
            }
        }
    }

    private suspend fun syncDataSilently(force: Boolean = false): Boolean {
        if (currentUser.value == null || automaticSyncRunning) return false
        val now = System.currentTimeMillis()
        if (!force && now - lastSyncAt < foregroundSyncMinIntervalMs) return false
        automaticSyncRunning = true
        return try {
            val synced = repository.syncData()
            if (synced) lastSyncAt = System.currentTimeMillis()
            synced
        } finally {
            automaticSyncRunning = false
        }
    }

    fun refreshWhenForegrounded() {
        viewModelScope.launch {
            syncDataSilently()
        }
    }

    // --- AUTHENTICATION ACTIONS ---
    fun toggleDemoMode(active: Boolean) {
        repository.setDemoModeActive(active)
    }

    fun saveConfigApiUrl() {
        val cleanUrl = prefs.apiUrl
        configApiUrl.value = cleanUrl
        if (cleanUrl.isNotEmpty()) {
            prefs.apiUrl = cleanUrl
            repository.rebuildRetrofitInstance()
            repository.setDemoModeActive(false) // Enable attempting live
        } else {
            _errorMessage.value = "Servidor SIMITEC indisponivel."
        }
    }

    fun testConnection() {
        viewModelScope.launch {
            _connectionStatus.value = "Conectando ao servidor SIMITEC..."
            val url = prefs.apiUrl
            val successful = repository.testApiConnection(url)
            if (successful) {
                _connectionStatus.value = "Servidor SIMITEC conectado."
                repository.setDemoModeActive(false)
            } else {
                _connectionStatus.value = "Servidor SIMITEC offline. Verifique o Wi-Fi."
                repository.setDemoModeActive(true)
            }
        }
    }

    fun login() {
        val email = loginEmail.value.trim()
        val password = loginPassword.value

        if (email.isEmpty() || password.isEmpty()) {
            _errorMessage.value = "Por favor preencha todos os campos obrigatórios."
            return
        }

        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            
            // Build current URL preferences
            saveConfigApiUrl()

            val result = repository.login(email, password.toCharArray())
            _isLoading.value = false
            if (result.isSuccess) {
                loginPassword.value = "" // clear security memory
                val user = result.getOrNull()
                if (user?.role == "participant") {
                    _errorMessage.value = "Acesso negado: Participantes comuns não possuem permissão para usar este app de credenciamento."
                    repository.logout()
                } else {
                    repository.syncData()
                    startAutomaticSync()
                    if (prefs.tutorialSeen) {
                        _currentScreen.value = "dashboard"
                    } else {
                        _currentScreen.value = "tutorial"
                    }
                }
            } else {
                _errorMessage.value = result.exceptionOrNull()?.message ?: "Erro desconhecido ao efetuar login."
            }
        }
    }

    fun loginWithGoogle(idToken: String) {
        if (idToken.isBlank()) {
            _errorMessage.value = "Não foi possível obter a credencial do Google."
            return
        }
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            saveConfigApiUrl()
            val result = repository.googleLogin(idToken)
            _isLoading.value = false
            if (result.isSuccess) {
                val user = result.getOrNull()
                if (user?.role == "participant") {
                    _errorMessage.value = "Conta Google encontrada, mas participante comum não acessa o app da equipe."
                    repository.logout()
                } else {
                    repository.syncData()
                    startAutomaticSync()
                    _currentScreen.value = if (prefs.tutorialSeen) "dashboard" else "tutorial"
                }
            } else {
                _errorMessage.value = result.exceptionOrNull()?.message ?: "Erro ao entrar com Google."
            }
        }
    }

    fun requestPasswordReset() {
        val email = loginEmail.value.trim()
        if (email.isBlank()) {
            _errorMessage.value = "Informe seu e-mail para recuperar a senha."
            return
        }
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            val result = repository.requestPasswordReset(email)
            _isLoading.value = false
            if (result.isSuccess) {
                _successMessage.value = result.getOrNull() ?: "Enviamos as instruções para o e-mail informado."
            } else {
                _errorMessage.value = result.exceptionOrNull()?.message ?: "Nao foi possivel recuperar a senha."
            }
        }
    }

    fun completeTutorial() {
        prefs.tutorialSeen = true
        _tutorialSlideIndex.value = 0
        navigationStack.clear()
        _currentScreen.value = "dashboard"
    }

    fun reopenTutorial() {
        _tutorialSlideIndex.value = 0
        _currentScreen.value = "tutorial"
    }

    fun logout() {
        viewModelScope.launch {
            repository.logout()
            automaticSyncJob?.cancel()
            automaticSyncJob = null
            navigationStack.clear()
            _currentScreen.value = "login"
        }
    }

    fun setDarkMode(active: Boolean) {
        prefs.darkMode = active
        preferDarkMode.value = active
    }

    fun setCompactMode(active: Boolean) {
        prefs.compactMode = active
        preferCompactMode.value = active
    }

    fun setSecurityBiometric(active: Boolean) {
        prefs.biometricEnabled = active
        securityBiometricEnabled.value = active
        _successMessage.value = if (active) "Biometria ativada." else "Biometria desativada."
    }

    fun setSecurityFacial(active: Boolean) {
        prefs.facialEnabled = active
        securityFacialEnabled.value = active
        _successMessage.value = if (active) "Reconhecimento facial ativado." else "Reconhecimento facial desativado."
    }

    fun confirmFacialEnrollment() {
        setSecurityFacial(true)
    }

    fun setSecurityAppPassword(active: Boolean) {
        prefs.appPasswordEnabled = active
        securityAppPasswordEnabled.value = active
        _successMessage.value = if (active) "Senha de segurança ativada." else "Senha de segurança desativada."
    }

    fun setSecurityAutoLock(active: Boolean) {
        prefs.autoLockEnabled = active
        securityAutoLockEnabled.value = active
        _successMessage.value = if (active) "Bloqueio automático ativado." else "Bloqueio automático desativado."
    }

    fun setSecurityMaskData(active: Boolean) {
        prefs.maskSensitiveData = active
        securityMaskSensitiveData.value = active
        _successMessage.value = if (active) "Mascaramento de dados ativado." else "Mascaramento de dados desativado."
    }

    fun setSecurityBlockScreenshots(active: Boolean) {
        prefs.blockScreenshots = active
        securityBlockScreenshots.value = active
        _successMessage.value = if (active) "Bloqueio de captura ativado." else "Bloqueio de captura desativado."
    }

    fun saveSecuritySettingsAndReturn() {
        _successMessage.value = "Configurações de segurança salvas."
        navigateTo("settings")
    }

    fun setLanguage(language: String) {
        prefs.language = language
        appLanguage.value = language
        _successMessage.value = when (language) {
            "en" -> "Language changed to English."
            "es" -> "Idioma cambiado a español."
            "pt" -> "Idioma alterado para português."
            else -> "Idioma alterado."
        }
    }

    fun saveLanguageAndReturn() {
        _successMessage.value = when (appLanguage.value) {
            "en" -> "Language saved."
            "es" -> "Idioma guardado."
            else -> "Idioma salvo."
        }
        navigateTo("settings")
    }

    // --- SENSITIVE DATA ENCRYPTION TIMER COOLDOWN ---
    fun unlockSensitiveData(password: String): Boolean {
        val success = repository.unlockSensitiveAccess(password)
        if (success) {
            _isSensitiveUnlocked.value = true
            startSensitiveTimer(300) // 5 minutes
            _successMessage.value = "Dados de participantes desbloqueados por 5 minutos!"
            return true
        } else {
            _errorMessage.value = "Senha incorreta. Os dados continuam protegidos."
            return false
        }
    }

    fun lockSensitiveData() {
        repository.lockSensitiveAccess()
        _isSensitiveUnlocked.value = false
        _sensitiveTimerSeconds.value = 0
        sensitiveCountdownJob?.cancel()
    }

    private fun startSensitiveTimer(seconds: Int) {
        sensitiveCountdownJob?.cancel()
        _sensitiveTimerSeconds.value = seconds
        sensitiveCountdownJob = viewModelScope.launch {
            var remaining = seconds
            while (remaining > 0) {
                delay(1000)
                remaining--
                _sensitiveTimerSeconds.value = remaining
                if (!repository.isSensitiveAccessActive()) {
                    break
                }
            }
            lockSensitiveData()
            _errorMessage.value = "Sessão segura de dados expirou. Visualização mascarada."
        }
    }

    // Helper mask method used in Compose views to automatically filter personal variables
    fun getMaskedCpf(cpf: String): String {
        if (_isSensitiveUnlocked.value) return cpf
        if (cpf.length < 11) return "***.***.***-**"
        // Return structured masks: e.g. 123.***.***-00
        val digits = cpf.replace(Regex("[^0-9]"), "")
        if (digits.length == 11) {
            return "${digits.substring(0, 3)}.***.***-${digits.substring(9, 11)}"
        }
        return "***.***.***-**"
    }

    fun getMaskedEmail(email: String): String {
        if (_isSensitiveUnlocked.value) return email
        val parts = email.split("@")
        if (parts.size != 2) return "*****@*****"
        val user = parts[0]
        val maskedUser = if (user.length > 2) "${user.substring(0, 2)}*****" else "*****"
        return "$maskedUser@${parts[1]}"
    }

    fun getMaskedPhone(phone: String): String {
        if (_isSensitiveUnlocked.value) return phone
        val cleaned = phone.replace(Regex("[^0-9]"), "")
        if (cleaned.length >= 10) {
            return "(**) *****-${cleaned.takeLast(4)}"
        }
        return "(**) *****-****"
    }

    // --- CHECKIN ACTIONS ---
    fun syncDashboardData() {
        viewModelScope.launch {
            _isLoading.value = true
            val success = repository.syncData()
            _isLoading.value = false
            if (success) {
                _successMessage.value = "Sincronização concluída com sucesso!"
            } else {
                _errorMessage.value = "Falha ao sincronizar dados com o servidor."
            }
        }
    }

    fun getCheckinStats(): CheckinStats {
        return repository.getStats()
    }

    fun setRegistrationDetails(registration: Registration) {
        _selectedRegistration.value = registration
    }

    fun toggleCheckinState(registrationId: String) {
        // Ensure user block based on role
        val currentRole = currentUser.value?.role ?: "participant"
        if (currentRole == "participant") {
            _errorMessage.value = "Sua conta de participante comum não permite validar checkins."
            return
        }

        viewModelScope.launch {
            _isLoading.value = true
            val result = repository.toggleCheckIn(registrationId)
            _isLoading.value = false
            if (result.isSuccess) {
                val updated = result.getOrNull()
                _selectedRegistration.value = updated
                val txt = if (updated?.checkedIn == true) "Credenciado!" else "Desfeito credenciamento com sucesso."
                _successMessage.value = "${updated?.participant?.name}: $txt"
            } else {
                _errorMessage.value = result.exceptionOrNull()?.message ?: "Erro no credenciamento."
            }
        }
    }

    fun setGroupCheckinState(registrationIds: List<String>, checkedIn: Boolean) {
        val currentRole = currentUser.value?.role ?: "participant"
        if (currentRole == "participant") {
            _errorMessage.value = "Sua conta de participante comum não permite validar checkins."
            return
        }

        val ids = registrationIds.filter { it.isNotBlank() }.distinct()
        if (ids.isEmpty()) {
            _errorMessage.value = "Nenhuma inscrição encontrada para este participante."
            return
        }

        viewModelScope.launch {
            _isLoading.value = true
            var lastUpdated: Registration? = null
            var failedMessage: String? = null

            for (id in ids) {
                val result = repository.setCheckIn(id, checkedIn)
                if (result.isSuccess) {
                    lastUpdated = result.getOrNull()
                } else {
                    failedMessage = result.exceptionOrNull()?.message ?: "Erro no credenciamento."
                    break
                }
            }

            _isLoading.value = false
            if (failedMessage == null) {
                _selectedRegistration.value = lastUpdated
                val action = if (checkedIn) "credenciado em todas as inscrições." else "credenciamento desfeito em todas as inscrições."
                _successMessage.value = "${lastUpdated?.participant?.name ?: "Participante"}: $action"
            } else {
                _errorMessage.value = failedMessage
            }
        }
    }

    fun scanCodeSuccess(barcode: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            val result = repository.scanCode(barcode)
            _isLoading.value = false
            if (result.isSuccess) {
                val registration = result.getOrNull()!!
                _selectedRegistration.value = registration
                _successMessage.value = "${registration.participant.name}: entrada confirmada."
                _currentScreen.value = "details"
                viewModelScope.launch {
                    repository.syncData()
                }
            } else {
                _errorMessage.value = result.exceptionOrNull()?.message ?: "Erro ao escanear código."
            }
        }
    }

    fun scanManualCode() {
        val code = manualScanCode.value.trim()
        if (code.isEmpty()) {
            _errorMessage.value = "Digite o código, CPF, e-mail ou QR da credencial."
            return
        }
        manualScanCode.value = ""
        scanCodeSuccess(code)
    }

    fun searchInstitutionSuggestions(value: String) {
        onsiteFormInstitution.value = value
        selectedInstitution.value = null
        institutionSearchJob?.cancel()
        if (value.trim().length < 3) {
            institutionSuggestions.value = emptyList()
            return
        }
        institutionSearchJob = viewModelScope.launch {
            delay(280)
            val result = repository.searchInstitutions(value)
            institutionSuggestions.value = result.getOrDefault(emptyList()).take(8)
        }
    }

    fun selectInstitutionSuggestion(institution: InstitutionSuggestion) {
        selectedInstitution.value = institution
        onsiteFormInstitution.value = institution.name
        val city = listOfNotNull(institution.city?.takeIf { it.isNotBlank() }, institution.uf?.takeIf { it.isNotBlank() })
            .joinToString(" - ")
        if (city.isNotBlank()) onsiteFormCity.value = city
        institutionSuggestions.value = emptyList()
    }

    // --- EXCLUSIVE ONSITE REGISTRATION FORM MANAGEMENT ---
    fun addGroupMember() {
        val name = onsiteGroupMemberName.value.trim()
        val cpf = onsiteGroupMemberCpf.value.trim()
        val email = onsiteGroupMemberEmail.value.trim()

        if (name.isEmpty() || cpf.isEmpty()) {
            _errorMessage.value = "Nome e CPF são obrigatórios para os integrantes do grupo."
            return
        }

        val newMember = Participant(
            name = name,
            socialName = null,
            email = email.ifEmpty { "integrante@grupo.com" },
            cpf = cpf,
            phone = onsiteFormPhone.value.ifEmpty { "(81) 98000-0000" },
            role = "student",
            institution = onsiteFormInstitution.value,
            course = onsiteFormCourse.value,
            shift = onsiteFormShift.value,
            city = onsiteFormCity.value
        )

        val currentList = ArrayList(_onsiteGroupList.value)
        currentList.add(newMember)
        _onsiteGroupList.value = currentList

        // Clear values of modal fields
        onsiteGroupMemberName.value = ""
        onsiteGroupMemberCpf.value = ""
        onsiteGroupMemberEmail.value = ""
        _successMessage.value = "$name adicionado ao grupo!"
    }

    fun removeGroupMember(index: Int) {
        val currentList = ArrayList(_onsiteGroupList.value)
        if (index in currentList.indices) {
            val removed = currentList.removeAt(index)
            _onsiteGroupList.value = currentList
            _successMessage.value = "${removed.name} removido."
        }
    }

    fun submitOnsiteRegistration() {
        val name = onsiteFormName.value.trim()
        val email = onsiteFormEmail.value.trim()
        val cpf = onsiteFormCpf.value.trim()
        val phone = onsiteFormPhone.value.trim()
        val role = onsiteFormRole.value.ifBlank { "Estudante" }
        val isVisitor = role.equals("Visitante", ignoreCase = true)
        val institution = if (isVisitor) "" else onsiteFormInstitution.value.trim()
        val course = if (isVisitor) "" else onsiteFormCourse.value.trim()
        val shift = if (isVisitor) "" else onsiteFormShift.value.trim()
        val city = if (isVisitor) "" else onsiteFormCity.value.trim()
        val slug = onsiteFormActivitySlug.value

        if (name.isEmpty()) {
            _errorMessage.value = "Informe o nome da pessoa."
            return
        }

        if (email.isEmpty() && cpf.isEmpty() && phone.isEmpty()) {
            _errorMessage.value = "Informe pelo menos e-mail, CPF ou telefone."
            return
        }

        if (!isVisitor && (institution.isEmpty() || course.isEmpty() || shift.isEmpty() || city.isEmpty())) {
            _errorMessage.value = "Para estudante, informe instituição, curso, turno e cidade."
            return
        }

        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null

            val regRequest = OnsiteRegistrationRequest(
                name = name,
                socialName = onsiteFormSocialName.value.trim().ifEmpty { null },
                email = email,
                cpf = cpf,
                phone = phone,
                role = role,
                institution = institution,
                course = course,
                shift = shift,
                city = city,
                institutionPlaceId = selectedInstitution.value?.placeId ?: selectedInstitution.value?.code,
                institutionAddress = selectedInstitution.value?.address,
                institutionGoogleMapsUri = selectedInstitution.value?.googleMapsUri,
                institutionVerifiedAt = selectedInstitution.value?.verifiedAt,
                activitySlug = slug,
                accessibility = if (isVisitor) null else onsiteFormAccessibility.value.trim().ifEmpty { null },
                isGroup = if (isVisitor) false else onsiteIsGroup.value,
                groupMembers = if (!isVisitor && onsiteIsGroup.value) _onsiteGroupList.value else null
            )

            val result = repository.createOnsiteRegistration(regRequest)
            _isLoading.value = false
            if (result.isSuccess) {
                // Clear fields
                clearOnsiteRegistrationFields()

                val completedReg = result.getOrNull()!!
                _selectedRegistration.value = completedReg
                _successMessage.value = "Inscrição presencial e credenciamento realizados com sucesso!"
                _currentScreen.value = "details"
            } else {
                _errorMessage.value = result.exceptionOrNull()?.message ?: "Falha ao realizar inscrição."
            }
        }
    }

    fun saveRegistrationEdit(updated: Registration, reason: String) {
        if (reason.trim().length < 4) {
            _errorMessage.value = "Informe um motivo para registrar a alteração."
            return
        }
        viewModelScope.launch {
            _isLoading.value = true
            val result = repository.updateRegistrationDetails(updated._id, updated, reason.trim())
            _isLoading.value = false
            if (result.isSuccess) {
                _selectedRegistration.value = result.getOrNull()
                _successMessage.value = "Inscrição atualizada com segurança."
            } else {
                _errorMessage.value = result.exceptionOrNull()?.message ?: "Não foi possível salvar a inscrição."
            }
        }
    }

    private fun clearOnsiteRegistrationFields() {
        onsiteFormName.value = ""
        onsiteFormSocialName.value = ""
        onsiteFormEmail.value = ""
        onsiteFormCpf.value = ""
        onsiteFormPhone.value = ""
        onsiteFormRole.value = "Estudante"
        onsiteFormTeacherCard.value = ""
        onsiteFormInstitution.value = ""
        institutionSuggestions.value = emptyList()
        selectedInstitution.value = null
        onsiteFormCourse.value = ""
        onsiteFormShift.value = "Noturno"
        onsiteFormCity.value = ""
        onsiteFormActivitySlug.value = "robotica-educacional"
        onsiteFormAccessibility.value = ""
        onsiteIsGroup.value = false
        _onsiteGroupList.value = emptyList()
    }

    // --- ADMIN SYSTEM CONTROLS ---
    fun publishAnnouncement() {
        val title = adminAnnTitle.value.trim()
        val content = adminAnnContent.value.trim()

        if (title.isEmpty() || content.isEmpty()) {
            _errorMessage.value = "Título e mensagem são obrigatórios no aviso."
            return
        }

        viewModelScope.launch {
            _isLoading.value = true
            val result = repository.publishAdminAnnouncement(title, content)
            _isLoading.value = false
            if (result.isSuccess) {
                adminAnnTitle.value = ""
                adminAnnContent.value = ""
                _successMessage.value = "Aviso publicado no feed interno da equipe SIMITEC!"
            } else {
                _errorMessage.value = result.exceptionOrNull()?.message ?: "Erro de permissão ao criar aviso."
            }
        }
    }

    fun alterUserRole(user: TeamUser, nextRole: String) {
        viewModelScope.launch {
            _isLoading.value = true
            val result = repository.updateUserRoleLocalOrRemote(user.id, nextRole)
            _isLoading.value = false
            if (result.isSuccess) {
                _successMessage.value = "${user.name} atualizado para o cargo de $nextRole."
            } else {
                _errorMessage.value = result.exceptionOrNull()?.message ?: "Erro ao alterar cargo."
            }
        }
    }

    fun getAllTeamUsers(): List<TeamUser> {
        return repository.getLocalFallbackUsers()
    }

    fun setTutorialSlideIndex(idx: Int) {
        _tutorialSlideIndex.value = idx.coerceIn(0, 2)
    }

    // --- CLEAR GENERAL ALERTS ---
    fun dismissAlerts() {
        _errorMessage.value = null
        _successMessage.value = null
    }

    fun showError(message: String) {
        _errorMessage.value = message
    }

    override fun onCleared() {
        super.onCleared()
        sensitiveCountdownJob?.cancel()
    }
}
