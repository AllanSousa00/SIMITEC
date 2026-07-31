package com.example

import android.os.Bundle
import android.graphics.Color as AndroidColor
import android.view.WindowManager
import androidx.activity.SystemBarStyle
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.example.ui.*
import com.example.ui.theme.MyApplicationTheme
import androidx.fragment.app.FragmentActivity

class MainActivity : FragmentActivity() {
    private val viewModel: SimitecViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(AndroidColor.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(AndroidColor.TRANSPARENT)
        )
        setContent {
            val darkMode by viewModel.preferDarkMode.collectAsStateWithLifecycle()
            val blockScreenshots by viewModel.securityBlockScreenshots.collectAsStateWithLifecycle()
            val autoLock by viewModel.securityAutoLockEnabled.collectAsStateWithLifecycle()
            SideEffect { setSimitecScreenPalette(darkMode) }

            DisposableEffect(Unit) {
                val observer = LifecycleEventObserver { _, event ->
                    if (event == Lifecycle.Event.ON_START) {
                        viewModel.refreshWhenForegrounded()
                    }
                }
                lifecycle.addObserver(observer)
                onDispose { lifecycle.removeObserver(observer) }
            }

            DisposableEffect(blockScreenshots) {
                if (blockScreenshots) {
                    window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE)
                } else {
                    window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
                }
                onDispose { }
            }

            DisposableEffect(autoLock) {
                val observer = LifecycleEventObserver { _, event ->
                    if (autoLock && event == Lifecycle.Event.ON_STOP) {
                        viewModel.lockSensitiveData()
                    }
                }
                lifecycle.addObserver(observer)
                onDispose { lifecycle.removeObserver(observer) }
            }

            MyApplicationTheme(darkTheme = darkMode) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    val currentScreen by viewModel.currentScreen.collectAsStateWithLifecycle()
                    BackHandler(enabled = currentScreen !in setOf("splash", "login")) {
                        viewModel.handleSystemBack()
                    }

                    AnimatedContent(
                        targetState = currentScreen,
                        modifier = Modifier.fillMaxSize(),
                        transitionSpec = {
                            fadeIn(animationSpec = tween(90)) togetherWith
                                fadeOut(animationSpec = tween(70))
                        },
                        label = "ScreenTransition"
                    ) { screen ->
                        when (screen) {
                            "splash" -> SplashScreen(viewModel)
                            "login" -> LoginScreen(viewModel)
                            "tutorial" -> TutorialScreen(viewModel)
                            "dashboard" -> DashboardScreen(viewModel)
                            "scanner" -> ScannerScreen(viewModel)
                            "search" -> SearchScreen(viewModel)
                            "details" -> RegistrationDetailsScreen(viewModel)
                            "onsite_registration" -> OnsiteRegistrationScreen(viewModel)
                            "settings" -> SettingsScreen(viewModel)
                            "profile" -> ProfileScreen(viewModel)
                            "notifications" -> NotificationsScreen(viewModel)
                            "security" -> SecurityScreen(viewModel)
                            "face_setup" -> FaceSetupScreen(viewModel)
                            "language" -> LanguageScreen(viewModel)
                            else -> LoginScreen(viewModel)
                        }
                    }
                }
            }
        }
    }
}
