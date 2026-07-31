package com.example.data

import android.content.Context
import android.content.SharedPreferences
import com.example.BuildConfig

class PreferencesManager(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("simitec_mobile_prefs", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_SESSION_TOKEN = "session_token"
        private const val KEY_TUTORIAL_SEEN = "tutorial_seen"
        private const val KEY_DARK_MODE = "dark_mode"
        private const val KEY_COMPACT_MODE = "compact_mode"
        private const val KEY_BIOMETRIC = "security_biometric"
        private const val KEY_FACIAL = "security_facial"
        private const val KEY_APP_PASSWORD = "security_app_password"
        private const val KEY_AUTO_LOCK = "security_auto_lock"
        private const val KEY_MASK_DATA = "security_mask_data"
        private const val KEY_BLOCK_CAPTURE = "security_block_capture"
        private const val KEY_LANGUAGE = "language"
        val DEFAULT_API_URL: String = BuildConfig.SIMITEC_API_URL
    }

    var apiUrl: String
        get() = DEFAULT_API_URL
        set(value) {
            // A equipe nao configura servidor pelo app. A API oficial fica embutida.
        }

    var sessionToken: String?
        get() = prefs.getString(KEY_SESSION_TOKEN, null)
        set(value) {
            prefs.edit().putString(KEY_SESSION_TOKEN, value).apply()
        }

    var tutorialSeen: Boolean
        get() = prefs.getBoolean(KEY_TUTORIAL_SEEN, false)
        set(value) {
            prefs.edit().putBoolean(KEY_TUTORIAL_SEEN, value).apply()
        }

    var darkMode: Boolean
        get() = prefs.getBoolean(KEY_DARK_MODE, true)
        set(value) {
            prefs.edit().putBoolean(KEY_DARK_MODE, value).apply()
        }

    var compactMode: Boolean
        get() = prefs.getBoolean(KEY_COMPACT_MODE, false)
        set(value) {
            prefs.edit().putBoolean(KEY_COMPACT_MODE, value).apply()
        }

    var biometricEnabled: Boolean
        get() = prefs.getBoolean(KEY_BIOMETRIC, false)
        set(value) {
            prefs.edit().putBoolean(KEY_BIOMETRIC, value).apply()
        }

    var facialEnabled: Boolean
        get() = prefs.getBoolean(KEY_FACIAL, false)
        set(value) {
            prefs.edit().putBoolean(KEY_FACIAL, value).apply()
        }

    var appPasswordEnabled: Boolean
        get() = prefs.getBoolean(KEY_APP_PASSWORD, false)
        set(value) {
            prefs.edit().putBoolean(KEY_APP_PASSWORD, value).apply()
        }

    var autoLockEnabled: Boolean
        get() = prefs.getBoolean(KEY_AUTO_LOCK, true)
        set(value) {
            prefs.edit().putBoolean(KEY_AUTO_LOCK, value).apply()
        }

    var maskSensitiveData: Boolean
        get() = prefs.getBoolean(KEY_MASK_DATA, false)
        set(value) {
            prefs.edit().putBoolean(KEY_MASK_DATA, value).apply()
        }

    var blockScreenshots: Boolean
        get() = prefs.getBoolean(KEY_BLOCK_CAPTURE, false)
        set(value) {
            prefs.edit().putBoolean(KEY_BLOCK_CAPTURE, value).apply()
        }

    var language: String
        get() = prefs.getString(KEY_LANGUAGE, "pt") ?: "pt"
        set(value) {
            prefs.edit().putString(KEY_LANGUAGE, value).apply()
        }

    fun clearSession() {
        prefs.edit().remove(KEY_SESSION_TOKEN).apply()
    }
}
