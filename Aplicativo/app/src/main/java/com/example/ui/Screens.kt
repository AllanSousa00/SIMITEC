package com.example.ui

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.provider.Settings
import android.util.Size
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview as CameraPreview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Badge
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Print
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.Save
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import com.example.R
import com.example.BuildConfig
import com.example.data.InstitutionSuggestion
import com.example.data.Participant
import com.example.data.Registration
import com.example.data.TeamUser
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import kotlinx.coroutines.delay
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

private var Bg by mutableStateOf(Color(0xFF071A2B))
private var AppBar by mutableStateOf(Color(0xFF0C263D))
private var SurfaceDark by mutableStateOf(Color(0xFF0D2A42))
private var SurfaceSoft by mutableStateOf(Color(0xFF153850))
private var SurfaceDeep by mutableStateOf(Color(0xFF091E30))
private var Border by mutableStateOf(Color(0xFF26465D))
private var TextMain by mutableStateOf(Color(0xFFEFF8FC))
private var TextMuted by mutableStateOf(Color(0xFFA6BBC9))
private var TextDim by mutableStateOf(Color(0xFF70889A))
private var Blue by mutableStateOf(Color(0xFF1BB7F0))
private var Green by mutableStateOf(Color(0xFF20D6A2))
private var Amber by mutableStateOf(Color(0xFFF6C453))
private var Red by mutableStateOf(Color(0xFFE85D75))
private var Purple by mutableStateOf(Color(0xFF6876D8))
private val SupportedLanguages = listOf(
    "pt" to "Português Brasil",
    "en" to "English",
    "es" to "Español",
    "fr" to "Français",
    "de" to "Deutsch",
    "it" to "Italiano",
    "zh" to "中文",
    "ja" to "日本語",
    "ko" to "한국어",
    "ar" to "العربية",
    "hi" to "हिन्दी",
    "ru" to "Русский",
    "nl" to "Nederlands",
    "tr" to "Türkçe",
    "id" to "Bahasa Indonesia"
)

private fun languageDisplayName(code: String): String {
    return SupportedLanguages.firstOrNull { it.first == code }?.second ?: "Português Brasil"
}

private val TipTone: Color
    @Composable get() = if (MaterialTheme.colorScheme.background.luminance() < 0.5f) Color(0xFF0C2D44) else Color(0xFFD0E3E9)

fun setSimitecScreenPalette(dark: Boolean) {
    if (dark) {
        Bg = Color(0xFF071A2B)
        AppBar = Color(0xFF0C263D)
        SurfaceDark = Color(0xFF0D2A42)
        SurfaceSoft = Color(0xFF153850)
        SurfaceDeep = Color(0xFF091E30)
        Border = Color(0xFF26465D)
        TextMain = Color(0xFFEFF8FC)
        TextMuted = Color(0xFFA6BBC9)
        TextDim = Color(0xFF70889A)
        Blue = Color(0xFF1BB7F0)
        Green = Color(0xFF20D6A2)
        Amber = Color(0xFFF6C453)
        Red = Color(0xFFE85D75)
        Purple = Color(0xFF6876D8)
    } else {
        Bg = Color(0xFFD8E5EB)
        AppBar = Color(0xFF083047)
        SurfaceDark = Color(0xFFF9FCFD)
        SurfaceSoft = Color(0xFFE5F0F4)
        SurfaceDeep = Color(0xFFCFE1E8)
        Border = Color(0xFF9BB9C7)
        TextMain = Color(0xFF0E2E43)
        TextMuted = Color(0xFF385A6B)
        TextDim = Color(0xFF597887)
        Blue = Color(0xFF087E9F)
        Green = Color(0xFF08785A)
        Amber = Color(0xFF8C5C00)
        Red = Color(0xFFB32D47)
        Purple = Color(0xFF4F61B5)
    }
}

private val CardShape = RoundedCornerShape(14.dp)
private val ButtonShape = RoundedCornerShape(12.dp)

private data class TutorialStep(
    val title: String,
    val description: String,
    val detail: String,
    val icon: ImageVector,
    val tone: Color
)

@Composable
private fun PageBackground(content: @Composable () -> Unit) {
    val isDark = MaterialTheme.colorScheme.background.luminance() < 0.5f
    SideEffect { setSimitecScreenPalette(isDark) }
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Bg)
    ) {
        content()
    }
}

@Composable
fun NotificationBanners(viewModel: SimitecViewModel, modifier: Modifier = Modifier) {
    val error by viewModel.errorMessage.collectAsStateWithLifecycle()
    val success by viewModel.successMessage.collectAsStateWithLifecycle()

    LaunchedEffect(error, success) {
        if (!error.isNullOrBlank() || !success.isNullOrBlank()) {
            delay(10_000)
            viewModel.dismissAlerts()
        }
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        AnimatedVisibility(visible = !success.isNullOrBlank()) {
            InlineBanner(success.orEmpty(), Green, Icons.Default.CheckCircle) { viewModel.dismissAlerts() }
        }
        AnimatedVisibility(visible = !error.isNullOrBlank()) {
            InlineBanner(error.orEmpty(), Red, Icons.Default.ErrorOutline) { viewModel.dismissAlerts() }
        }
    }
}

@Composable
private fun InlineBanner(text: String, color: Color, icon: ImageVector, onClick: () -> Unit) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 8.dp)
            .clickable(onClick = onClick),
        color = color.copy(alpha = 0.16f),
        shape = CardShape,
        border = BorderStroke(1.dp, color.copy(alpha = 0.40f))
    ) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, null, tint = color, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(10.dp))
            Text(
                text,
                color = TextMain,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f)
            )
        }
    }
}

@Composable
private fun AppCard(
    modifier: Modifier = Modifier,
    color: Color = SurfaceDark,
    content: @Composable ColumnScope.() -> Unit
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        color = color,
        shape = CardShape,
        border = BorderStroke(1.dp, Border)
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp), content = content)
    }
}

@Composable
private fun IconTile(
    icon: ImageVector,
    tint: Color,
    modifier: Modifier = Modifier,
    size: Int = 42
) {
    Box(
        modifier = modifier
            .size(size.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(tint.copy(alpha = 0.16f)),
        contentAlignment = Alignment.Center
    ) {
        Icon(icon, null, tint = tint, modifier = Modifier.size((size * 0.48f).dp))
    }
}

@Composable
fun StatusPill(text: String, tone: Color) {
    Surface(
        color = tone.copy(alpha = 0.14f),
        shape = RoundedCornerShape(999.dp),
        border = BorderStroke(1.dp, tone.copy(alpha = 0.32f))
    ) {
        Text(
            text = text,
            color = tone,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(horizontal = 9.dp, vertical = 5.dp),
            maxLines = 1
        )
    }
}

@Composable
fun PulseStatusDot(tone: Color = Green, size: Int = 9) {
    Box(
        Modifier
            .size(size.dp)
            .clip(CircleShape)
            .background(tone)
    )
}

@Composable
fun SectionHeader(title: String, action: String? = null, onAction: (() -> Unit)? = null) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(title.uppercase(), color = Blue, fontSize = 11.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
        if (action != null && onAction != null) {
            TextButton(onClick = onAction, contentPadding = PaddingValues(horizontal = 6.dp)) {
                Text(action, color = Blue, fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
fun SimitecButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    containerColor: Color = Blue,
    contentColor: Color = Color.White,
    icon: ImageVector? = null,
    isLoading: Boolean = false
) {
    Button(
        onClick = onClick,
        modifier = modifier.heightIn(min = 50.dp),
        shape = ButtonShape,
        colors = ButtonDefaults.buttonColors(containerColor = containerColor, contentColor = contentColor),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp)
    ) {
        if (isLoading) {
            CircularProgressIndicator(color = contentColor, strokeWidth = 2.dp, modifier = Modifier.size(20.dp))
        } else {
            if (icon != null) {
                Icon(icon, null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
            }
            Text(text, fontSize = 13.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun SimitecField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    leadingIcon: ImageVector? = null,
    keyboardType: KeyboardType = KeyboardType.Text,
    secure: Boolean = false,
    minLines: Int = 1,
    maxLines: Int = 1
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier.fillMaxWidth(),
        label = { Text(label, maxLines = 1, overflow = TextOverflow.Ellipsis) },
        leadingIcon = leadingIcon?.let { icon -> { Icon(icon, null) } },
        shape = RoundedCornerShape(10.dp),
        minLines = minLines,
        maxLines = maxLines,
        visualTransformation = if (secure) PasswordVisualTransformation() else VisualTransformation.None,
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
        colors = OutlinedTextFieldDefaults.colors(
            focusedTextColor = TextMain,
            unfocusedTextColor = TextMain,
            focusedBorderColor = Blue,
            unfocusedBorderColor = Border,
            focusedLabelColor = Blue,
            unfocusedLabelColor = TextMuted,
            cursorColor = Blue,
            focusedContainerColor = SurfaceSoft,
            unfocusedContainerColor = SurfaceSoft
        )
    )
}

@Composable
fun InstitutionLookupField(viewModel: SimitecViewModel, value: String) {
    val suggestions by viewModel.institutionSuggestions.collectAsStateWithLifecycle()
    val selected by viewModel.selectedInstitution.collectAsStateWithLifecycle()

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        SimitecField(
            value = value,
            onValueChange = { viewModel.searchInstitutionSuggestions(it) },
            label = "Instituição",
            leadingIcon = Icons.Default.Search
        )
        if (selected != null) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                StatusPill("INEP", Green)
                Text("Instituição verificada pela base oficial.", color = TextMuted, fontSize = 11.sp)
            }
        }
        if (value.trim().length >= 3 && suggestions.isNotEmpty()) {
            Surface(
                color = SurfaceSoft,
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(1.dp, Border),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column {
                    suggestions.forEach { suggestion ->
                        InstitutionSuggestionRow(suggestion) {
                            viewModel.selectInstitutionSuggestion(suggestion)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun InstitutionSuggestionRow(suggestion: InstitutionSuggestion, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconTile(Icons.Default.Badge, Blue, size = 36)
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text(suggestion.name, color = TextMain, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
            Text(
                listOfNotNull(suggestion.city, suggestion.uf).filter { it.isNotBlank() }.joinToString(" - ").ifBlank { "Instituição INEP/MEC" },
                color = TextMuted,
                fontSize = 11.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
        suggestion.code?.takeIf { it.isNotBlank() }?.let {
            StatusPill(it, Blue)
        }
    }
}

@Composable
fun SimitecLogoMark(size: Int = 72, modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier.size(size.dp),
        color = SurfaceDark,
        shape = RoundedCornerShape((size / 4).dp),
        border = BorderStroke(1.dp, Border)
    ) {
        Image(
            painter = painterResource(R.drawable.simitec_logo),
            contentDescription = "Logo SIMITEC",
            contentScale = ContentScale.Fit,
            modifier = Modifier.padding((size * 0.12f).dp)
        )
    }
}

@Composable
fun InitialsBubble(name: String, tone: Color = Blue, size: Int = 44) {
    val initials = name.trim().split(Regex("\\s+")).filter { it.isNotBlank() }.take(2).joinToString("") { it.take(1) }.ifBlank { "S" }
    Box(
        modifier = Modifier
            .size(size.dp)
            .clip(CircleShape)
            .background(tone),
        contentAlignment = Alignment.Center
    ) {
        Text(initials.uppercase(), color = Color.White, fontSize = (size / 3).sp, fontWeight = FontWeight.Bold)
    }
}

private fun resolveImageUrl(rawValue: String?, baseUrl: String = ""): String {
    val raw = rawValue?.trim().orEmpty()
    if (raw.isBlank() || raw.endsWith("avatar-default.svg", ignoreCase = true)) return ""
    if (
        raw.startsWith("http://", true) ||
        raw.startsWith("https://", true) ||
        raw.startsWith("data:", true) ||
        raw.startsWith("content:", true) ||
        raw.startsWith("file:", true)
    ) {
        return raw
    }
    return if (raw.startsWith("/") && baseUrl.isNotBlank()) baseUrl.trimEnd('/') + raw else raw
}

private fun participantPhotoUrl(participant: Participant, baseUrl: String = ""): String {
    val raw = listOf(participant.avatarUrl, participant.photoUrl, participant.imageUrl).firstOrNull { !it.isNullOrBlank() }
    return resolveImageUrl(raw, baseUrl)
}

@Composable
private fun ParticipantAvatar(participant: Participant, tone: Color, size: Int = 44, baseUrl: String = "") {
    val photoUrl = participantPhotoUrl(participant, baseUrl)
    var failed by remember(photoUrl) { mutableStateOf(false) }
    if (photoUrl.isBlank() || failed) {
        InitialsBubble(participant.name, tone, size)
        return
    }
    AsyncImage(
        model = photoUrl,
        contentDescription = "Foto de ${participant.name.ifBlank { "participante" }}",
        contentScale = ContentScale.Crop,
        onError = { failed = true },
        modifier = Modifier
            .size(size.dp)
            .clip(CircleShape)
            .border(1.dp, Border, CircleShape)
    )
}

@Composable
private fun UserAvatar(user: TeamUser?, tone: Color = Blue, size: Int = 44, baseUrl: String = "") {
    val name = user?.name.orEmpty().ifBlank { "Operador SIMITEC" }
    val photoUrl = resolveImageUrl(user?.avatarUrl, baseUrl)
    var failed by remember(photoUrl) { mutableStateOf(false) }
    if (photoUrl.isBlank() || failed) {
        InitialsBubble(name, tone, size)
        return
    }
    AsyncImage(
        model = photoUrl,
        contentDescription = "Foto de $name",
        contentScale = ContentScale.Crop,
        onError = { failed = true },
        modifier = Modifier
            .size(size.dp)
            .clip(CircleShape)
            .border(1.dp, Border, CircleShape)
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AppTopBar(
    title: String,
    subtitle: String? = null,
    showBack: Boolean = false,
    actionIcon: ImageVector? = null,
    onAction: (() -> Unit)? = null,
    onBack: (() -> Unit)? = null
) {
    TopAppBar(
        title = {
            Column {
                Text(title, color = TextMain, fontSize = 18.sp, fontWeight = FontWeight.Bold, maxLines = 1)
                if (!subtitle.isNullOrBlank()) {
                    Text(subtitle, color = TextMuted, fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
            }
        },
        navigationIcon = {
            if (showBack) {
                IconButton(onClick = { onBack?.invoke() }) {
                    Icon(Icons.AutoMirrored.Default.ArrowBack, null, tint = TextMain)
                }
            }
        },
        actions = {
            if (actionIcon != null && onAction != null) {
                IconButton(onClick = onAction) {
                    Icon(actionIcon, null, tint = TextMuted)
                }
            }
        },
        colors = TopAppBarDefaults.topAppBarColors(containerColor = AppBar)
    )
}

@Composable
private fun BottomNav(viewModel: SimitecViewModel, selected: String) {
    val compact by viewModel.preferCompactMode.collectAsStateWithLifecycle()
    val items = listOf(
        Triple("dashboard", "Início", Icons.Default.Home),
        Triple("search", "Buscar", Icons.Default.Search),
        Triple("scanner", "Scan", Icons.Default.QrCodeScanner),
        Triple("onsite_registration", "Inscrição", Icons.Default.PersonAdd),
        Triple("settings", "Ajustes", Icons.Default.Settings)
    )
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .navigationBarsPadding(),
        color = AppBar,
        border = BorderStroke(1.dp, Border)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(if (compact) 54.dp else 64.dp)
                .padding(horizontal = 6.dp),
            horizontalArrangement = Arrangement.SpaceAround,
            verticalAlignment = Alignment.CenterVertically
        ) {
            items.forEach { (route, label, icon) ->
                val active = selected == route
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(12.dp))
                        .clickable { viewModel.navigateTo(route) }
                        .padding(vertical = if (compact) 3.dp else 6.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(icon, null, tint = if (active) Blue else TextMuted, modifier = Modifier.size(if (compact) 17.dp else 19.dp))
                    Text(label, color = if (active) Blue else TextMuted, fontSize = if (compact) 9.sp else 10.sp, fontWeight = if (active) FontWeight.Bold else FontWeight.Medium)
                }
            }
        }
    }
}

@Composable
private fun AppScaffold(
    viewModel: SimitecViewModel,
    selected: String,
    title: String,
    subtitle: String? = null,
    showBack: Boolean = false,
    actionIcon: ImageVector? = null,
    onAction: (() -> Unit)? = null,
    onBack: (() -> Unit)? = { viewModel.navigateTo("dashboard") },
    content: @Composable (PaddingValues) -> Unit
) {
    PageBackground {
        Scaffold(
            containerColor = Color.Transparent,
            topBar = {
                AppTopBar(
                    title = title,
                    subtitle = subtitle,
                    showBack = showBack,
                    actionIcon = actionIcon,
                    onAction = onAction,
                    onBack = onBack
                )
            },
            bottomBar = { BottomNav(viewModel, selected) }
        ) { padding ->
            Box(Modifier.fillMaxSize()) {
                content(padding)
                NotificationBanners(viewModel, Modifier.statusBarsPadding().padding(top = 72.dp))
            }
        }
    }
}

@Composable
fun SplashScreen(viewModel: SimitecViewModel) {
    PageBackground {
        Column(Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            SimitecLogoMark(110)
            Spacer(Modifier.height(22.dp))
            Text("SIMITEC", color = TextMain, fontSize = 32.sp, fontWeight = FontWeight.Black)
            Text("Sistema de Monitoramento Equipe Técnica", color = Blue, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(44.dp))
            CircularProgressIndicator(color = Blue, strokeWidth = 2.dp)
        }
    }
}

@Composable
fun LoginScreen(viewModel: SimitecViewModel) {
    val email by viewModel.loginEmail.collectAsStateWithLifecycle()
    val password by viewModel.loginPassword.collectAsStateWithLifecycle()
    val loading by viewModel.isLoading.collectAsStateWithLifecycle()
    val context = LocalContext.current
    var showPass by remember { mutableStateOf(false) }
    var showRecover by remember { mutableStateOf(false) }
    val googleLauncher = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        try {
            val account = GoogleSignIn.getSignedInAccountFromIntent(result.data).getResult(ApiException::class.java)
            viewModel.loginWithGoogle(account.idToken.orEmpty())
        } catch (_: Exception) {
            viewModel.showError("Login com Google cancelado ou indisponível.")
        }
    }

    PageBackground {
        Box(Modifier.fillMaxSize()) {
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(250.dp)
                    .background(Brush.verticalGradient(listOf(Color(0xFF111827), Color.Transparent)))
            )
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(horizontal = 24.dp, vertical = 34.dp),
                verticalArrangement = Arrangement.Center
            ) {
                item {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                        SimitecLogoMark(84)
                        Spacer(Modifier.height(14.dp))
                        Text("SIMITEC", color = TextMain, fontSize = 26.sp, fontWeight = FontWeight.Black)
                        Text("Sistema de Monitoramento\nEquipe Técnica", color = Blue, fontSize = 10.sp, lineHeight = 13.sp, textAlign = TextAlign.Center, fontWeight = FontWeight.Bold)
                    }
                    Spacer(Modifier.height(28.dp))
                    AppCard {
                        Text("Bem-vindo de volta", color = TextMain, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                        Text("Acesse o painel de credenciamento", color = TextMuted, fontSize = 13.sp)
                        SimitecField(email, { viewModel.loginEmail.value = it }, "E-mail institucional", leadingIcon = Icons.Default.Email, keyboardType = KeyboardType.Email)
                        OutlinedTextField(
                            value = password,
                            onValueChange = { viewModel.loginPassword.value = it },
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text("Senha de acesso") },
                            leadingIcon = { Icon(Icons.Default.Lock, null) },
                            trailingIcon = {
                                IconButton(onClick = { showPass = !showPass }) {
                                    Icon(if (showPass) Icons.Default.VisibilityOff else Icons.Default.Visibility, null)
                                }
                            },
                            visualTransformation = if (showPass) VisualTransformation.None else PasswordVisualTransformation(),
                            shape = RoundedCornerShape(10.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = TextMain,
                                unfocusedTextColor = TextMain,
                                focusedBorderColor = Blue,
                                unfocusedBorderColor = Border,
                                focusedLabelColor = Blue,
                                unfocusedLabelColor = TextMuted,
                                focusedContainerColor = SurfaceSoft,
                                unfocusedContainerColor = SurfaceSoft
                            )
                        )
                        TextButton(onClick = { showRecover = true }, modifier = Modifier.align(Alignment.End)) {
                            Text("Esqueci minha senha", color = Blue, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                        SimitecButton("Entrar no Painel", { viewModel.login() }, modifier = Modifier.fillMaxWidth(), icon = Icons.Default.Check, isLoading = loading)
                        SimitecButton(
                            "Entrar com Google",
                            {
                                val clientId = BuildConfig.GOOGLE_WEB_CLIENT_ID
                                if (clientId.isBlank()) {
                                    viewModel.showError("Configure GOOGLE_WEB_CLIENT_ID para ativar o login com Google.")
                                } else {
                                    val options = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                                        .requestEmail()
                                        .requestIdToken(clientId)
                                        .build()
                                    googleLauncher.launch(GoogleSignIn.getClient(context, options).signInIntent)
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                            containerColor = SurfaceSoft,
                            contentColor = TextMain,
                            icon = Icons.Default.AccountCircle
                        )
                    }
                    Spacer(Modifier.height(16.dp))
                    AppCard(color = SurfaceDeep) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            IconTile(Icons.Default.Lock, Blue, size = 38)
                            Spacer(Modifier.width(10.dp))
                            Column {
                                Text("Acesso Restrito", color = TextMain, fontWeight = FontWeight.Bold)
                                Text("Este aplicativo é exclusivo para a equipe técnica autorizada da SIMITEC.", color = TextMuted, fontSize = 12.sp)
                            }
                        }
                    }
                    Spacer(Modifier.height(24.dp))
                    Text("v2.4.0 - Servidor Online", color = TextDim, fontSize = 10.sp, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
                }
            }
            NotificationBanners(viewModel, Modifier.statusBarsPadding())
        }
    }

    if (showRecover) {
        AlertDialog(
            onDismissRequest = { showRecover = false },
            title = { Text("Recuperar senha") },
            text = { Text("Enviaremos as instruções para o e-mail informado no campo de login.") },
            confirmButton = {
                TextButton(onClick = { viewModel.requestPasswordReset(); showRecover = false }) { Text("Enviar") }
            },
            dismissButton = { TextButton(onClick = { showRecover = false }) { Text("Cancelar") } }
        )
    }
}

@Composable
fun TutorialScreen(viewModel: SimitecViewModel) {
    val slideIndex by viewModel.tutorialSlideIndex.collectAsStateWithLifecycle()
    val configuration = LocalConfiguration.current
    val compactLayout = configuration.screenHeightDp < 650 || configuration.screenWidthDp < 360
    val horizontalPadding = if (configuration.screenWidthDp < 360) 16.dp else 24.dp
    val verticalPadding = if (compactLayout) 12.dp else 18.dp
    val titleSize = if (compactLayout) 22.sp else 24.sp
    val titleLineHeight = if (compactLayout) 27.sp else 30.sp
    val cardIconSize = if (compactLayout) 56 else 72
    val steps = listOf(
        TutorialStep(
            title = "Leia o QR Code",
            description = "Aponte a câmera para a credencial e confirme a entrada.",
            detail = "Use esta opção quando a pessoa já tiver o QR Code.",
            icon = Icons.Default.QrCodeScanner,
            tone = Blue
        ),
        TutorialStep(
            title = "Busque a pessoa",
            description = "Se não houver QR Code, pesquise por nome, CPF ou atividade.",
            detail = "Confira o nome antes de confirmar o credenciamento.",
            icon = Icons.Default.Search,
            tone = Amber
        ),
        TutorialStep(
            title = "Registre no local",
            description = "Cadastre participantes que chegarem sem inscrição.",
            detail = "As ações de atendimento ficam na barra inferior.",
            icon = Icons.Default.PersonAdd,
            tone = Green
        )
    )
    val currentIndex = slideIndex.coerceIn(0, steps.lastIndex)
    val currentStep = steps[currentIndex]
    val isLastStep = currentIndex == steps.lastIndex

    PageBackground {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .statusBarsPadding()
                .navigationBarsPadding()
                .padding(horizontal = horizontalPadding, vertical = verticalPadding),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(if (compactLayout) 12.dp else 16.dp)
        ) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("PRIMEIROS PASSOS", color = Blue, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    Text("Passo ${currentIndex + 1} de ${steps.size}", color = TextMuted, fontSize = 12.sp)
                }
                TextButton(onClick = { viewModel.completeTutorial() }) {
                    Text("Pular", color = TextMuted, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }

            LinearProgressIndicator(
                progress = { (currentIndex + 1).toFloat() / steps.size },
                color = Blue,
                trackColor = Border,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(Modifier.height(if (compactLayout) 12.dp else 36.dp))

            AppCard(modifier = Modifier.widthIn(max = 520.dp), color = SurfaceDark) {
                IconTile(currentStep.icon, currentStep.tone, size = cardIconSize)
                Text(currentStep.title, color = TextMain, fontSize = titleSize, fontWeight = FontWeight.Bold, lineHeight = titleLineHeight)
                Text(currentStep.description, color = TextMuted, fontSize = 14.sp, lineHeight = 21.sp)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    PulseStatusDot(currentStep.tone, size = 8)
                    Spacer(Modifier.width(8.dp))
                    Text(currentStep.detail, color = TextMain, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                steps.indices.forEach { index ->
                    Box(
                        modifier = Modifier
                            .height(4.dp)
                            .weight(1f)
                            .clip(RoundedCornerShape(999.dp))
                            .background(if (index <= currentIndex) Blue else Border)
                    )
                }
            }

            if (currentIndex > 0) {
                TextButton(onClick = { viewModel.setTutorialSlideIndex(currentIndex - 1) }) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = TextMuted, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Voltar", color = TextMuted, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }
            }

            SimitecButton(
                text = if (isLastStep) "Concluir" else "Próximo",
                onClick = {
                    if (isLastStep) viewModel.completeTutorial() else viewModel.setTutorialSlideIndex(currentIndex + 1)
                },
                modifier = Modifier.widthIn(max = 520.dp).fillMaxWidth(),
                icon = if (isLastStep) Icons.Default.Check else Icons.AutoMirrored.Filled.ArrowForward
            )
        }
    }
}

@Composable
fun DashboardScreen(viewModel: SimitecViewModel) {
    val user by viewModel.currentUser.collectAsStateWithLifecycle()
    val eventInfo by viewModel.eventInfo.collectAsStateWithLifecycle()
    val registrations by viewModel.registrations.collectAsStateWithLifecycle()
    val announcements by viewModel.announcements.collectAsStateWithLifecycle()
    val areas by viewModel.areas.collectAsStateWithLifecycle()
    val compact by viewModel.preferCompactMode.collectAsStateWithLifecycle()
    val eventTitle = eventInfo.title ?: eventInfo.name ?: eventInfo.fullName ?: "SIMITEC"
    val eventSubtitle = listOfNotNull(eventInfo.dateLabel, eventInfo.timeLabel, eventInfo.location)
        .filter { it.isNotBlank() }
        .joinToString(" · ")
        .ifBlank { "Painel de credenciamento" }
    val stats by remember(registrations, areas) {
        derivedStateOf { viewModel.getCheckinStats() }
    }
    val recent by remember(registrations) {
        derivedStateOf { registrations.asSequence().filter { it.checkedIn }.take(2).toList() }
    }

    AppScaffold(
        viewModel = viewModel,
        selected = "dashboard",
        title = "Início",
        subtitle = eventTitle,
        actionIcon = Icons.Default.Notifications,
        onAction = { viewModel.navigateTo("notifications") }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(horizontal = 14.dp, vertical = if (compact) 8.dp else 12.dp),
            verticalArrangement = Arrangement.spacedBy(if (compact) 9.dp else 12.dp)
        ) {
            item {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("Olá, ${firstName(user?.name)}", color = TextMain, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                        Text(roleLabel(user?.role), color = TextMuted, fontSize = 12.sp)
                    }
                    StatusPill("Online", Green)
                }
            }
            if (eventSubtitle.isNotBlank()) {
                item {
                    AppCard(color = SurfaceDeep) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            IconTile(Icons.Default.CalendarToday, Blue, size = 38)
                            Spacer(Modifier.width(10.dp))
                            Column(Modifier.weight(1f)) {
                                Text(eventTitle, color = TextMain, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Text(eventSubtitle, color = TextMuted, fontSize = 12.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
                            }
                        }
                    }
                }
            }
            item {
                Surface(color = Green.copy(alpha = 0.12f), shape = CardShape, border = BorderStroke(1.dp, Green.copy(alpha = 0.25f))) {
                    Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        PulseStatusDot(Green)
                        Spacer(Modifier.width(8.dp))
                        Text("Servidor conectado - sincronização automática em tempo real", color = Green, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                    StatCard("Total inscritos", stats.totalCount.toString(), Icons.Default.Person, Blue, Modifier.weight(1f))
                    StatCard("Credenciados", stats.checkedInCount.toString(), Icons.Default.CheckCircle, Green, Modifier.weight(1f))
                }
                Spacer(Modifier.height(if (compact) 8.dp else 12.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                    StatCard("Pendentes", stats.pendingCount.toString(), Icons.Default.History, Amber, Modifier.weight(1f))
                    StatCard("Atividades", (stats.areas.size.takeIf { it > 0 } ?: areas.size).toString(), Icons.Default.Groups, Purple, Modifier.weight(1f))
                }
            }
            item {
                SectionHeader("Atalhos de operação")
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                    ActionCard("Leitor QR", Icons.Default.QrCodeScanner, Blue, Modifier.weight(1f)) { viewModel.navigateTo("scanner") }
                    ActionCard("Busca Manual", Icons.Default.Search, Amber, Modifier.weight(1f)) { viewModel.navigateTo("search") }
                }
                Spacer(Modifier.height(if (compact) 8.dp else 12.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                    ActionCard("Novo Cadastro", Icons.Default.PersonAdd, Green, Modifier.weight(1f)) { viewModel.navigateTo("onsite_registration") }
                    ActionCard("Gestão Grupos", Icons.Default.Groups, Green, Modifier.weight(1f)) {
                        viewModel.onsiteIsGroup.value = true
                        viewModel.navigateTo("onsite_registration")
                    }
                }
            }
            item {
                SectionHeader("Últimos credenciamentos", "Ver todos") { viewModel.navigateTo("search") }
                if (recent.isEmpty()) {
                    EmptyState("Nenhuma entrada confirmada ainda.")
                } else {
                    AppCard {
                        recent.forEachIndexed { index, registration ->
                            RegistrationCompactRow(registration, viewModel, showAction = false)
                            if (index < recent.lastIndex) DividerLine()
                        }
                    }
                }
            }
            item {
                SectionHeader("Aviso da coordenação")
                AppCard(color = SurfaceDeep) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconTile(Icons.Default.Notifications, Amber, size = 38)
                        Spacer(Modifier.width(10.dp))
                        Column {
                            Text(announcements.firstOrNull()?.title ?: "A pasta ou auditório A foi movido para as 14:30.", color = TextMain, fontWeight = FontWeight.Bold)
                            Text(announcements.firstOrNull()?.content ?: "Favor informar participantes no check-in.", color = TextMuted, fontSize = 12.sp)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StatCard(label: String, value: String, icon: ImageVector, tone: Color, modifier: Modifier = Modifier) {
    AppCard(modifier = modifier) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconTile(icon, tone, size = 38)
            Spacer(Modifier.width(10.dp))
            Column {
                Text(value, color = TextMain, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                Text(label, color = TextMuted, fontSize = 11.sp)
            }
        }
    }
}

@Composable
private fun ActionCard(title: String, icon: ImageVector, tone: Color, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Surface(
        modifier = modifier
            .height(104.dp)
            .clip(CardShape)
            .clickable(onClick = onClick),
        color = SurfaceDark,
        shape = CardShape,
        border = BorderStroke(1.dp, Border)
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.SpaceBetween) {
            IconTile(icon, tone, size = 42)
            Text(title, color = TextMain, fontSize = 13.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun SearchScreen(viewModel: SimitecViewModel) {
    val query by viewModel.searchQuery.collectAsStateWithLifecycle()
    val filter by viewModel.searchStatusFilter.collectAsStateWithLifecycle()
    val registrations by viewModel.registrations.collectAsStateWithLifecycle()
    val grouped by remember(registrations, query, filter) {
        derivedStateOf {
            val q = query.trim()
            registrations
                .groupBy { it.participantGroupKey() }
                .values
                .map { group ->
                    ParticipantRegistrationGroup(
                        registrations = group.sortedWith(
                            compareBy<Registration> { if (it.activitySlug == "main") 0 else 1 }
                                .thenBy { it.activityTitle }
                        )
                    )
                }
                .filter { group ->
                    val matchesQuery = q.isBlank() || group.registrations.any { registration ->
                        val p = registration.participant
                        p.name.contains(q, true) ||
                            p.email.contains(q, true) ||
                            p.cpf.contains(q, true) ||
                            p.phone.contains(q, true) ||
                            p.institution.contains(q, true) ||
                            p.course.contains(q, true) ||
                            registration.ticketCode.contains(q, true) ||
                            registration.activityTitle.contains(q, true)
                    }
                val matchesFilter = when (filter) {
                    "pending" -> group.registrations.any { !it.checkedIn }
                    "checked" -> group.registrations.any { it.checkedIn }
                    else -> true
                }
                matchesQuery && matchesFilter
            }
                .sortedBy { it.primary.participant.name.lowercase() }
        }
    }

    AppScaffold(viewModel, "search", "Participantes", "${grouped.size} encontrados") { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                SimitecField(query, { viewModel.searchQuery.value = it }, "Buscar por nome, CPF, e-mail ou código", leadingIcon = Icons.Default.Search)
                Spacer(Modifier.height(10.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip("Todos", filter == "all") { viewModel.searchStatusFilter.value = "all" }
                    FilterChip("Pendentes", filter == "pending") { viewModel.searchStatusFilter.value = "pending" }
                    FilterChip("Credenciados", filter == "checked") { viewModel.searchStatusFilter.value = "checked" }
                }
            }
            if (grouped.isEmpty()) {
                item { EmptyState("Nenhum participante encontrado.") }
            } else {
                items(grouped, key = { it.key }) { group ->
                    RegistrationSearchCard(group, viewModel)
                }
            }
        }
    }
}

private data class ParticipantRegistrationGroup(
    val registrations: List<Registration>
) {
    val primary: Registration = registrations.first()
    val key: String = primary.participantGroupKey()
    val allCheckedIn: Boolean = registrations.all { it.checkedIn }
    val anyCheckedIn: Boolean = registrations.any { it.checkedIn }
    val statusLabel: String = when {
        allCheckedIn -> "Credenciado"
        anyCheckedIn -> "Parcial"
        else -> "Pendente"
    }
    val statusColor: Color = when {
        allCheckedIn -> Green
        anyCheckedIn -> Blue
        else -> Amber
    }
    val activitiesLabel: String = registrations
        .map { it.activityTitle.ifBlank { it.ticketCode } }
        .distinct()
        .joinToString(" · ")
    val countLabel: String = if (registrations.size == 1) "1 inscrição" else "${registrations.size} inscrições"
}

private fun Registration.participantGroupKey(): String {
    val participant = participant
    val groupId = group?.id?.takeIf { it.isNotBlank() }
    if (groupId != null) return "group:$groupId"

    val cpf = participant.cpf.onlyMeaningfulIdentity()
    if (cpf.isNotBlank()) return "cpf:$cpf"

    val email = participant.email.onlyMeaningfulIdentity()
    if (email.isNotBlank()) return "email:$email"

    val phone = participant.phone.onlyMeaningfulIdentity()
    if (phone.isNotBlank()) return "phone:$phone"

    return "name:${participant.name.normalizedIdentity()}:${participant.institution.normalizedIdentity()}"
}

private fun String.onlyMeaningfulIdentity(): String {
    val normalized = normalizedIdentity()
    return if (normalized.isBlank() || normalized == "protegido") "" else normalized
}

private fun String.normalizedIdentity(): String {
    return trim().lowercase().filter { it.isLetterOrDigit() || it == '@' || it == '.' }
}

@Composable
private fun FilterChip(label: String, active: Boolean, onClick: () -> Unit) {
    Surface(
        color = if (active) Blue else SurfaceDark,
        shape = RoundedCornerShape(999.dp),
        border = BorderStroke(1.dp, if (active) Blue else Border),
        modifier = Modifier.clickable(onClick = onClick)
    ) {
        Text(label, color = if (active) Color.White else TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp))
    }
}

@Composable
private fun RegistrationSearchCard(group: ParticipantRegistrationGroup, viewModel: SimitecViewModel) {
    val maskSensitive by viewModel.securityMaskSensitiveData.collectAsStateWithLifecycle()
    val sensitive by viewModel.isSensitiveUnlocked.collectAsStateWithLifecycle()
    val apiUrl by viewModel.configApiUrl.collectAsStateWithLifecycle()
    val registration = group.primary
    val participant = registration.participant
    val protectedLine = if (maskSensitive && !sensitive) {
        "${viewModel.getMaskedCpf(participant.cpf)} · ${viewModel.getMaskedEmail(participant.email)}"
    } else {
        "${group.countLabel} · ${registration.ticketCode}"
    }
    AppCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            ParticipantAvatar(participant, group.statusColor, 44, apiUrl)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(participant.name.ifBlank { "Participante" }, color = TextMain, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text("${group.countLabel} vinculadas ao perfil", color = TextMuted, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(protectedLine, color = Blue, fontSize = 11.sp, fontFamily = FontFamily.Monospace, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            StatusPill(group.statusLabel, group.statusColor)
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            SimitecButton("Ver Perfil", {
                viewModel.setRegistrationDetails(registration)
                viewModel.navigateTo("details")
            }, modifier = Modifier.weight(1f), containerColor = SurfaceSoft, contentColor = TextMain)
            SimitecButton(if (group.allCheckedIn) "Desfazer" else "Check-in", {
                viewModel.setGroupCheckinState(group.registrations.map { it._id }, !group.allCheckedIn)
            }, modifier = Modifier.weight(1f), containerColor = if (group.allCheckedIn) Red.copy(alpha = 0.92f) else Blue, icon = Icons.Default.Check)
        }
    }
}

@Composable
private fun RegistrationCompactRow(registration: Registration, viewModel: SimitecViewModel, showAction: Boolean = true) {
    val apiUrl by viewModel.configApiUrl.collectAsStateWithLifecycle()
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .clickable {
                viewModel.setRegistrationDetails(registration)
                viewModel.navigateTo("details")
            }
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        ParticipantAvatar(registration.participant, if (registration.checkedIn) Green else Blue, 38, apiUrl)
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text(registration.participant.name.ifBlank { "Participante" }, color = TextMain, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(registration.activityTitle, color = TextMuted, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        StatusPill(if (registration.checkedIn) "Apto" else "Pendente", if (registration.checkedIn) Green else Amber)
        if (showAction) {
            Spacer(Modifier.width(6.dp))
            Text("Ver", color = Blue, fontSize = 12.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun ScannerScreen(viewModel: SimitecViewModel) {
    val manualCode by viewModel.manualScanCode.collectAsStateWithLifecycle()
    val loading by viewModel.isLoading.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    var hasPermission by remember { mutableStateOf(ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) }
    var cameraActive by remember { mutableStateOf(false) }
    var cameraUnavailable by remember { mutableStateOf(false) }
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        hasPermission = granted
        if (granted) {
            cameraUnavailable = false
            cameraActive = true
        } else {
            viewModel.showError("Permissão da câmera negada. Use a entrada manual.")
        }
    }

    AppScaffold(viewModel, "scanner", "Credenciamento", "Leitura de QR Code", showBack = true) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            LinearProgressIndicator(progress = { 0.66f }, color = Blue, trackColor = Border, modifier = Modifier.fillMaxWidth())
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .background(Color.Black),
                contentAlignment = Alignment.Center
            ) {
                if (cameraActive && hasPermission && !cameraUnavailable) {
                    EmbeddedQrCamera(
                        viewModel = viewModel,
                        lifecycleOwner = lifecycleOwner,
                        onCameraError = {
                            cameraActive = false
                            cameraUnavailable = true
                            viewModel.showError("Não foi possível ativar a câmera neste aparelho. Use a entrada manual.")
                        }
                    )
                    ScannerFrame()
                } else {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(horizontal = 28.dp)) {
                        ScannerFrame()
                        Spacer(Modifier.height(28.dp))
                        IconTile(Icons.Default.QrCodeScanner, Blue, size = 64)
                        Spacer(Modifier.height(14.dp))
                        Text("Leitor de QR Code", color = Color.White, fontWeight = FontWeight.Bold)
                        Text(
                            when {
                                cameraUnavailable -> "A câmera não abriu neste aparelho. Você ainda pode usar a entrada manual."
                                hasPermission -> "Toque para ativar a câmera aqui mesmo."
                                else -> "Permita o uso da câmera para ler a credencial."
                            },
                            color = Color.White.copy(alpha = 0.74f),
                            fontSize = 12.sp,
                            textAlign = TextAlign.Center
                        )
                        Spacer(Modifier.height(14.dp))
                        SimitecButton(
                            if (hasPermission) "Ativar câmera" else "Permitir câmera",
                            {
                                if (hasPermission) {
                                    cameraUnavailable = false
                                    cameraActive = true
                                } else {
                                    launcher.launch(Manifest.permission.CAMERA)
                                }
                            },
                            icon = Icons.Default.QrCodeScanner
                        )
                    }
                }
            }
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(AppBar)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text("Entrada manual", color = TextMain, fontWeight = FontWeight.Bold)
                SimitecField(manualCode, { viewModel.manualScanCode.value = it }, "Código, CPF ou e-mail", leadingIcon = Icons.Default.Search)
                SimitecButton("Validar Entrada", { viewModel.scanManualCode() }, modifier = Modifier.fillMaxWidth(), icon = Icons.Default.Check, isLoading = loading)
            }
        }
    }
}

@Composable
private fun EmbeddedQrCamera(
    viewModel: SimitecViewModel,
    lifecycleOwner: androidx.lifecycle.LifecycleOwner,
    onCameraError: () -> Unit
) {
    val context = LocalContext.current
    val scanned = remember { AtomicBoolean(false) }
    val executor = remember { Executors.newSingleThreadExecutor() }
    var providerRef by remember { mutableStateOf<ProcessCameraProvider?>(null) }
    var analyzerRef by remember { mutableStateOf<QrCodeAnalyzer?>(null) }

    DisposableEffect(Unit) {
        onDispose {
            try {
                providerRef?.unbindAll()
            } catch (_: Exception) {
            }
            analyzerRef?.close()
            executor.shutdown()
        }
    }

    AndroidView(
        modifier = Modifier.fillMaxSize(),
        factory = { ctx ->
            PreviewView(ctx).apply {
                implementationMode = PreviewView.ImplementationMode.COMPATIBLE
                scaleType = PreviewView.ScaleType.FILL_CENTER
                post {
                    try {
                        val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
                        cameraProviderFuture.addListener({
                            try {
                                val provider = cameraProviderFuture.get()
                                providerRef = provider
                                val preview = CameraPreview.Builder()
                                    .build()
                                    .also { it.setSurfaceProvider(surfaceProvider) }
                                val analysis = ImageAnalysis.Builder()
                                    .setTargetResolution(Size(640, 480))
                                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                                    .build()
                                    .also {
                                        val analyzer = QrCodeAnalyzer { code ->
                                            if (scanned.compareAndSet(false, true)) {
                                                ContextCompat.getMainExecutor(ctx).execute {
                                                    try {
                                                        provider.unbindAll()
                                                    } catch (_: Exception) {
                                                    }
                                                    viewModel.scanCodeSuccess(code)
                                                }
                                            }
                                        }
                                        analyzerRef = analyzer
                                        it.setAnalyzer(executor, analyzer)
                                    }
                                provider.unbindAll()
                                provider.bindToLifecycle(lifecycleOwner, CameraSelector.DEFAULT_BACK_CAMERA, preview, analysis)
                            } catch (_: Exception) {
                                ContextCompat.getMainExecutor(ctx).execute { onCameraError() }
                            }
                        }, ContextCompat.getMainExecutor(ctx))
                    } catch (_: Exception) {
                        onCameraError()
                    }
                }
            }
        }
    )
}

@Composable
private fun ScannerFrame() {
    Box(
        modifier = Modifier
            .fillMaxWidth(0.72f)
            .aspectRatio(1f),
        contentAlignment = Alignment.Center
    ) {
        Box(Modifier.matchParentSize().border(2.dp, Color.White.copy(alpha = 0.5f), RoundedCornerShape(28.dp)))
        Box(Modifier.matchParentSize().padding(16.dp)) {
            Box(Modifier.align(Alignment.TopStart).size(48.dp).border(5.dp, Blue, RoundedCornerShape(topStart = 18.dp)))
            Box(Modifier.align(Alignment.TopEnd).size(48.dp).border(5.dp, Blue, RoundedCornerShape(topEnd = 18.dp)))
            Box(Modifier.align(Alignment.BottomStart).size(48.dp).border(5.dp, Blue, RoundedCornerShape(bottomStart = 18.dp)))
            Box(Modifier.align(Alignment.BottomEnd).size(48.dp).border(5.dp, Blue, RoundedCornerShape(bottomEnd = 18.dp)))
            Box(Modifier.align(Alignment.Center).fillMaxWidth().height(3.dp).clip(RoundedCornerShape(999.dp)).background(Blue))
        }
        Surface(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 12.dp),
            color = SurfaceDark.copy(alpha = 0.86f),
            shape = RoundedCornerShape(999.dp),
            border = BorderStroke(1.dp, Border)
        ) {
            Text("Centralize o QR Code", color = TextMain, fontSize = 12.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 16.dp, vertical = 9.dp))
        }
    }
}

@Composable
fun RegistrationDetailsScreen(viewModel: SimitecViewModel) {
    val registration by viewModel.selectedRegistration.collectAsStateWithLifecycle()
    val registrations by viewModel.registrations.collectAsStateWithLifecycle()
    val sensitive by viewModel.isSensitiveUnlocked.collectAsStateWithLifecycle()
    val maskSensitive by viewModel.securityMaskSensitiveData.collectAsStateWithLifecycle()
    val apiUrl by viewModel.configApiUrl.collectAsStateWithLifecycle()
    var showEdit by remember { mutableStateOf(false) }
    val reg = registration
    val linkedRegistrations by remember(reg, registrations) {
        derivedStateOf {
            if (reg == null) {
                emptyList()
            } else {
                registrations
                    .filter { it.participantGroupKey() == reg.participantGroupKey() }
                    .sortedWith(
                        compareBy<Registration> { if (it.activitySlug == "main") 0 else 1 }
                            .thenBy { it.activityTitle }
                    )
                    .ifEmpty { listOf(reg) }
            }
        }
    }

    AppScaffold(viewModel, "search", "Detalhes do participante", showBack = true, actionIcon = Icons.Default.Security, onAction = { viewModel.navigateTo("security") }) { padding ->
        if (reg == null) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                EmptyState("Nenhum participante selecionado.")
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                item {
                    AppCard {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            ParticipantAvatar(reg.participant, Blue, 54, apiUrl)
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(reg.participant.name, color = TextMain, fontSize = 19.sp, fontWeight = FontWeight.Bold, maxLines = 2)
                                Text(reg.participant.email, color = TextMuted, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                StatusPill(if (reg.checkedIn) "Credenciado" else "Pendente", if (reg.checkedIn) Green else Amber)
                            }
                        }
                    }
                }
                item {
                    AppCard {
                        SettingRow(Icons.Default.VisibilityOff, "Dados Protegidos", if (sensitive) "Visíveis por tempo limitado" else "CPF, telefone e e-mail mascarados", Blue) {
                            viewModel.navigateTo("security")
                        }
                    }
                }
                item {
                    SectionHeader("Dados pessoais")
                    AppCard {
                        DetailLine("CPF", if (!maskSensitive || sensitive) reg.participant.cpf else viewModel.getMaskedCpf(reg.participant.cpf))
                        DetailLine("Telefone", if (!maskSensitive || sensitive) reg.participant.phone else viewModel.getMaskedPhone(reg.participant.phone))
                        DetailLine("E-mail", if (!maskSensitive || sensitive) reg.participant.email else viewModel.getMaskedEmail(reg.participant.email))
                        DetailLine("Instituição", reg.participant.institution.ifBlank { "Não informado" })
                        DetailLine("Curso/Turma", reg.participant.course.ifBlank { "Não informado" })
                        DetailLine("Cidade", reg.participant.city.ifBlank { "Não informado" })
                        DetailLine("Acessibilidade", reg.participant.accessibility ?: "Não informado")
                    }
                }
                item {
                    SectionHeader("Inscrição")
                    AppCard {
                        DetailLine("Código", reg.ticketCode)
                        DetailLine("Total", if (linkedRegistrations.size == 1) "1 inscrição" else "${linkedRegistrations.size} inscrições")
                        DetailLine("Status", when {
                            linkedRegistrations.all { it.checkedIn } -> "Entrada confirmada"
                            linkedRegistrations.any { it.checkedIn } -> "Credenciamento parcial"
                            else -> "Aguardando credenciamento"
                        })
                    }
                }
                item {
                    SectionHeader("Áreas inscritas")
                    AppCard {
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            linkedRegistrations.forEach { item ->
                                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                    Column(Modifier.weight(1f)) {
                                        Text(item.activityTitle.ifBlank { item.ticketCode }, color = TextMain, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                        Text(item.ticketCode, color = TextMuted, fontSize = 11.sp, fontFamily = FontFamily.Monospace, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                    }
                                    StatusPill(if (item.checkedIn) "Credenciado" else "Pendente", if (item.checkedIn) Green else Amber)
                                }
                            }
                        }
                    }
                }
                item {
                    SimitecButton(if (reg.checkedIn) "Desfazer Check-in" else "Confirmar Entrada", { viewModel.toggleCheckinState(reg._id) }, modifier = Modifier.fillMaxWidth(), containerColor = if (reg.checkedIn) Red.copy(alpha = 0.92f) else Blue, icon = Icons.Default.Check)
                    Spacer(Modifier.height(8.dp))
                    SimitecButton("Editar Informações", { showEdit = true }, modifier = Modifier.fillMaxWidth(), containerColor = SurfaceSoft, contentColor = TextMain, icon = Icons.Default.Save)
                    Spacer(Modifier.height(8.dp))
                    SimitecButton("Voltar", { viewModel.handleSystemBack() }, modifier = Modifier.fillMaxWidth(), containerColor = SurfaceSoft, contentColor = TextMain, icon = Icons.AutoMirrored.Default.ArrowBack)
                }
            }
        }
    }

    if (showEdit && reg != null) {
        EditRegistrationDialog(reg, viewModel) { showEdit = false }
    }
}

@Composable
private fun DetailLine(label: String, value: String) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(label, color = TextMuted, fontSize = 12.sp, modifier = Modifier.weight(0.42f))
        Text(value, color = TextMain, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(0.58f), textAlign = TextAlign.End)
    }
}

@Composable
private fun EditRegistrationDialog(registration: Registration, viewModel: SimitecViewModel, onDismiss: () -> Unit) {
    var name by remember { mutableStateOf(registration.participant.name) }
    var email by remember { mutableStateOf(registration.participant.email) }
    var cpf by remember { mutableStateOf(registration.participant.cpf) }
    var phone by remember { mutableStateOf(registration.participant.phone) }
    var institution by remember { mutableStateOf(registration.participant.institution) }
    var course by remember { mutableStateOf(registration.participant.course) }
    var city by remember { mutableStateOf(registration.participant.city) }
    var reason by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Editar participante") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                SimitecField(name, { name = it }, "Nome")
                SimitecField(email, { email = it }, "E-mail")
                SimitecField(cpf, { cpf = it }, "CPF")
                SimitecField(phone, { phone = it }, "Telefone")
                SimitecField(institution, { institution = it }, "Instituição")
                SimitecField(course, { course = it }, "Curso/turma")
                SimitecField(city, { city = it }, "Cidade")
                SimitecField(reason, { reason = it }, "Motivo da alteração")
            }
        },
        confirmButton = {
            TextButton(onClick = {
                val updated = registration.copy(
                    participant = registration.participant.copy(
                        name = name,
                        email = email,
                        cpf = cpf,
                        phone = phone,
                        institution = institution,
                        course = course,
                        city = city
                    )
                )
                viewModel.saveRegistrationEdit(updated, reason)
                onDismiss()
            }) { Text("Salvar") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } }
    )
}

@Composable
fun OnsiteRegistrationScreen(viewModel: SimitecViewModel) {
    var mode by remember { mutableStateOf(if (viewModel.onsiteIsGroup.value) "group" else "type") }

    when (mode) {
        "individual" -> RegistrationForm(viewModel, groupMode = false) { mode = "type" }
        "group" -> RegistrationForm(viewModel, groupMode = true) { mode = "type" }
        else -> RegistrationTypeScreen(viewModel, onIndividual = {
            viewModel.onsiteIsGroup.value = false
            mode = "individual"
        }, onGroup = {
            viewModel.onsiteIsGroup.value = true
            mode = "group"
        })
    }
}

@Composable
private fun RegistrationTypeScreen(viewModel: SimitecViewModel, onIndividual: () -> Unit, onGroup: () -> Unit) {
    val eventInfo by viewModel.eventInfo.collectAsStateWithLifecycle()
    val eventTitle = eventInfo.title ?: eventInfo.name ?: eventInfo.fullName ?: "SIMITEC"
    AppScaffold(viewModel, "onsite_registration", eventTitle, showBack = true) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                LinearProgressIndicator(progress = { 0.33f }, color = Blue, trackColor = Border, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(18.dp))
                Text("Tipo de Credenciamento", color = TextMain, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                Text("Selecione como deseja realizar a inscrição do participante no evento.", color = TextMuted, fontSize = 13.sp)
            }
            item { TypeOption(Icons.Default.Person, "Inscrição Individual", "Cadastro rápido para um único participante. Ideal para credenciamento avulso.", onIndividual) }
            item { TypeOption(Icons.Default.Groups, "Cadastro em Grupo", "Registre turmas, escolas ou caravanas de forma organizada.", onGroup) }
            item {
                TypeOption(Icons.Default.QrCodeScanner, "Leitura de QR Code", "Escaneie a credencial digital ou impressa para validar entrada.", { viewModel.navigateTo("scanner") })
            }
            item {
                AppCard(color = TipTone) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconTile(Icons.Default.Info, Blue, size = 36)
                        Spacer(Modifier.width(10.dp))
                        Column {
                            Text("Dica de Agilidade", color = TextMain, fontWeight = FontWeight.Bold)
                            Text("Para grandes grupos, use a opção de caravana para imprimir todas as etiquetas de uma só vez.", color = TextMuted, fontSize = 12.sp)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TypeOption(icon: ImageVector, title: String, body: String, onClick: () -> Unit) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clip(CardShape)
            .clickable(onClick = onClick),
        color = SurfaceDark,
        shape = CardShape,
        border = BorderStroke(1.dp, Border)
    ) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            IconTile(icon, Blue)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(title, color = TextMain, fontWeight = FontWeight.Bold)
                Text(body, color = TextMuted, fontSize = 12.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
            Text("›", color = TextMuted, fontSize = 24.sp)
        }
    }
}

@Composable
private fun RegistrationForm(viewModel: SimitecViewModel, groupMode: Boolean, onBack: () -> Unit) {
    val name by viewModel.onsiteFormName.collectAsStateWithLifecycle()
    val socialName by viewModel.onsiteFormSocialName.collectAsStateWithLifecycle()
    val email by viewModel.onsiteFormEmail.collectAsStateWithLifecycle()
    val cpf by viewModel.onsiteFormCpf.collectAsStateWithLifecycle()
    val phone by viewModel.onsiteFormPhone.collectAsStateWithLifecycle()
    val role by viewModel.onsiteFormRole.collectAsStateWithLifecycle()
    val institution by viewModel.onsiteFormInstitution.collectAsStateWithLifecycle()
    val course by viewModel.onsiteFormCourse.collectAsStateWithLifecycle()
    val shift by viewModel.onsiteFormShift.collectAsStateWithLifecycle()
    val city by viewModel.onsiteFormCity.collectAsStateWithLifecycle()
    val accessibility by viewModel.onsiteFormAccessibility.collectAsStateWithLifecycle()
    val selectedArea by viewModel.onsiteFormActivitySlug.collectAsStateWithLifecycle()
    val memberName by viewModel.onsiteGroupMemberName.collectAsStateWithLifecycle()
    val memberCpf by viewModel.onsiteGroupMemberCpf.collectAsStateWithLifecycle()
    val memberEmail by viewModel.onsiteGroupMemberEmail.collectAsStateWithLifecycle()
    val members by viewModel.onsiteGroupList.collectAsStateWithLifecycle()
    val areas by viewModel.areas.collectAsStateWithLifecycle()
    val loading by viewModel.isLoading.collectAsStateWithLifecycle()
    val isVisitor = role.equals("Visitante", ignoreCase = true)

    LaunchedEffect(groupMode) {
        viewModel.onsiteIsGroup.value = groupMode
    }

    AppScaffold(
        viewModel = viewModel,
        selected = "onsite_registration",
        title = if (groupMode) "Cadastro em Grupo" else "Inscrição Individual",
        subtitle = if (groupMode) "Responsável e integrantes" else "Cadastro presencial",
        showBack = true,
        onBack = onBack
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            item { LinearProgressIndicator(progress = { if (groupMode) 1f else 0.66f }, color = Blue, trackColor = Border, modifier = Modifier.fillMaxWidth()) }
            if (!groupMode) {
                item {
                    SectionHeader("Tipo de participante")
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        SelectBox("Estudante", "Com dados acadêmicos", Icons.Default.Person, !isVisitor, Modifier.weight(1f)) { viewModel.onsiteFormRole.value = "Estudante" }
                        SelectBox("Visitante", "Contato rápido", Icons.Default.Badge, isVisitor, Modifier.weight(1f)) { viewModel.onsiteFormRole.value = "Visitante" }
                    }
                }
            }
            item {
                SectionHeader(if (groupMode) "Responsável pelo grupo" else "Dados principais")
                AppCard {
                    SimitecField(name, { viewModel.onsiteFormName.value = it }, if (groupMode) "Nome do responsável" else "Nome completo", leadingIcon = Icons.Default.Person)
                    if (!isVisitor) SimitecField(socialName, { viewModel.onsiteFormSocialName.value = it }, "Nome social")
                    SimitecField(email, { viewModel.onsiteFormEmail.value = it }, "E-mail", leadingIcon = Icons.Default.Email, keyboardType = KeyboardType.Email)
                    SimitecField(cpf, { viewModel.onsiteFormCpf.value = it }, "CPF", leadingIcon = Icons.Default.Badge, keyboardType = KeyboardType.Number)
                    SimitecField(phone, { viewModel.onsiteFormPhone.value = it }, "Telefone", leadingIcon = Icons.Default.Phone, keyboardType = KeyboardType.Phone)
                }
            }
            if (!isVisitor || groupMode) {
                item {
                    SectionHeader("Dados da origem")
                    AppCard {
                        InstitutionLookupField(viewModel, institution)
                        SimitecField(course, { viewModel.onsiteFormCourse.value = it }, "Curso ou turma")
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            SimitecField(shift, { viewModel.onsiteFormShift.value = it }, "Turno/período", modifier = Modifier.weight(1f))
                            SimitecField(city, { viewModel.onsiteFormCity.value = it }, "Cidade", modifier = Modifier.weight(1f))
                        }
                        SimitecField(accessibility, { viewModel.onsiteFormAccessibility.value = it }, "Acessibilidade", minLines = 2, maxLines = 3)
                        Text("Área escolhida", color = TextMuted, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        areas.take(4).forEach { area ->
                            val active = selectedArea == area.slug
                            Surface(
                                color = if (active) Blue.copy(alpha = 0.16f) else SurfaceSoft,
                                shape = RoundedCornerShape(10.dp),
                                border = BorderStroke(1.dp, if (active) Blue else Border),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { viewModel.onsiteFormActivitySlug.value = area.slug }
                            ) {
                                Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Icon(if (active) Icons.Default.CheckCircle else Icons.Default.CalendarToday, null, tint = if (active) Blue else TextMuted)
                                    Spacer(Modifier.width(10.dp))
                                    Column(Modifier.weight(1f)) {
                                        Text(area.title, color = TextMain, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                        Text("${area.available ?: (area.seats - area.taken).coerceAtLeast(0)} vagas disponíveis", color = TextMuted, fontSize = 11.sp)
                                    }
                                }
                            }
                        }
                    }
                }
            }
            if (groupMode) {
                item {
                    SectionHeader("Integrantes do grupo")
                    AppCard {
                        SimitecField(memberName, { viewModel.onsiteGroupMemberName.value = it }, "Nome do integrante")
                        SimitecField(memberCpf, { viewModel.onsiteGroupMemberCpf.value = it }, "CPF do integrante", keyboardType = KeyboardType.Number)
                        SimitecField(memberEmail, { viewModel.onsiteGroupMemberEmail.value = it }, "E-mail opcional", keyboardType = KeyboardType.Email)
                        SimitecButton("Adicionar integrante", { viewModel.addGroupMember() }, modifier = Modifier.fillMaxWidth(), containerColor = SurfaceSoft, contentColor = TextMain, icon = Icons.Default.Add)
                        members.forEachIndexed { index, participant ->
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                InitialsBubble(participant.name, Blue, 34)
                                Spacer(Modifier.width(10.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(participant.name, color = TextMain, fontWeight = FontWeight.Bold)
                                    Text(participant.cpf, color = TextMuted, fontSize = 11.sp)
                                }
                                IconButton(onClick = { viewModel.removeGroupMember(index) }) {
                                    Icon(Icons.Default.Close, null, tint = Red)
                                }
                            }
                        }
                    }
                }
            }
            item {
                SimitecButton(
                    if (groupMode) "Finalizar cadastro do grupo" else "Finalizar e credenciar",
                    { viewModel.submitOnsiteRegistration() },
                    modifier = Modifier.fillMaxWidth(),
                    icon = Icons.Default.Check,
                    isLoading = loading
                )
            }
        }
    }
}

@Composable
private fun SelectBox(title: String, subtitle: String, icon: ImageVector, active: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Surface(
        modifier = modifier
            .height(92.dp)
            .clip(CardShape)
            .clickable(onClick = onClick),
        color = if (active) Blue.copy(alpha = 0.16f) else SurfaceDark,
        shape = CardShape,
        border = BorderStroke(1.dp, if (active) Blue else Border)
    ) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.SpaceBetween) {
            Icon(icon, null, tint = if (active) Blue else TextMuted)
            Column {
                Text(title, color = TextMain, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                Text(subtitle, color = TextMuted, fontSize = 10.sp)
            }
        }
    }
}

@Composable
fun SettingsScreen(viewModel: SimitecViewModel) {
    val darkMode by viewModel.preferDarkMode.collectAsStateWithLifecycle()
    val compactMode by viewModel.preferCompactMode.collectAsStateWithLifecycle()
    val language by viewModel.appLanguage.collectAsStateWithLifecycle()
    val languageLabel = languageDisplayName(language)
    AppScaffold(viewModel, "settings", "Ajustes", "Configure suas preferências e segurança", actionIcon = Icons.Default.Info, onAction = { viewModel.navigateTo("profile") }) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            item {
                SectionHeader("Conta e perfil")
                SettingsGroup {
                    SettingRow(Icons.Default.AccountCircle, "Perfil do Operador", "Informações e identificação", Blue) { viewModel.navigateTo("profile") }
                    SettingRow(Icons.Default.Notifications, "Notificações", "Alertas de credenciamento", Blue) { viewModel.navigateTo("notifications") }
                }
            }
            item {
                SectionHeader("Segurança e dados")
                SettingsGroup {
                    SettingRow(Icons.Default.Lock, "Segurança", "Bloqueio de dados sensíveis", Blue) { viewModel.navigateTo("security") }
                    SettingRow(Icons.Default.Language, "Idioma", languageLabel, Blue) { viewModel.navigateTo("language") }
                }
            }
            item {
                SectionHeader("Preferências")
                SettingsGroup {
                    SwitchRow(Icons.Default.DarkMode, "Modo Escuro", if (darkMode) "Ativado" else "Modo claro ativo", darkMode) { viewModel.setDarkMode(it) }
                    SwitchRow(Icons.Default.Settings, "Modo Compacto", if (compactMode) "Espaços reduzidos" else "Otimize atendimento", compactMode) { viewModel.setCompactMode(it) }
                }
            }
            item {
                SectionHeader("Suporte")
                SettingsGroup {
                    SettingRow(Icons.Default.Info, "Rever tutorial", "Passo a passo do credenciamento", Blue) { viewModel.reopenTutorial() }
                    SettingRow(Icons.Default.Info, "Sobre o SIMITEC", "Versão 2.4.0", TextMuted) {}
                    SettingRow(Icons.Default.Badge, "Termos de Uso", "", TextMuted) {}
                }
            }
            item {
                SimitecButton("Sair da Conta", { viewModel.logout() }, modifier = Modifier.fillMaxWidth(), containerColor = Red, icon = Icons.AutoMirrored.Default.Logout)
            }
        }
    }
}

@Composable
private fun SettingsGroup(content: @Composable ColumnScope.() -> Unit) {
    Surface(color = SurfaceDark, shape = CardShape, border = BorderStroke(1.dp, Border), modifier = Modifier.fillMaxWidth()) {
        Column(content = content)
    }
}

@Composable
private fun SettingRow(icon: ImageVector, label: String, sublabel: String, tone: Color, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconTile(icon, tone, size = 38)
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(label, color = TextMain, fontWeight = FontWeight.Bold, fontSize = 14.sp)
            if (sublabel.isNotBlank()) Text(sublabel, color = TextMuted, fontSize = 11.sp)
        }
    }
}

@Composable
private fun SwitchRow(icon: ImageVector, label: String, sublabel: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
        IconTile(icon, Blue, size = 38)
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(label, color = TextMain, fontWeight = FontWeight.Bold, fontSize = 14.sp)
            Text(sublabel, color = TextMuted, fontSize = 11.sp)
        }
        Switch(checked = checked, onCheckedChange = onChange)
    }
}

@Composable
fun ProfileScreen(viewModel: SimitecViewModel) {
    val user by viewModel.currentUser.collectAsStateWithLifecycle()
    val apiUrl by viewModel.configApiUrl.collectAsStateWithLifecycle()
    AppScaffold(viewModel, "settings", "Perfil do Operador", "Identificação e permissões de acesso", showBack = true, onBack = { viewModel.navigateTo("settings") }) { padding ->
        LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            item {
                AppCard {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                        UserAvatar(user, Blue, 58, apiUrl)
                        Spacer(Modifier.height(10.dp))
                        Text(user?.name ?: "Operador SIMITEC", color = TextMain, fontWeight = FontWeight.Bold)
                        Text(user?.email.orEmpty(), color = TextMuted, fontSize = 12.sp)
                        StatusPill("Conta ativa", Green)
                    }
                }
            }
            item {
                SectionHeader("Função no sistema")
                SettingsGroup {
                    SettingRow(Icons.Default.Badge, "Cargo", roleLabel(user?.role), Blue) {}
                    SettingRow(Icons.Default.Shield, "Permissões Ativas", "Credenciamento, dados e auditoria", Green) {}
                }
            }
            item {
                SectionHeader("Vínculo institucional")
                SettingsGroup {
                    SettingRow(Icons.Default.Home, "Instituição", user?.institution?.ifBlank { "SIMITEC - Márcia Guedes" } ?: "SIMITEC - Márcia Guedes", TextMuted) {}
                    SettingRow(Icons.Default.Badge, "Cidade", user?.city?.ifBlank { "Belém - PB" } ?: "Belém - PB", TextMuted) {}
                }
            }
            item { SimitecButton("Sair da Conta", { viewModel.logout() }, modifier = Modifier.fillMaxWidth(), containerColor = Red, icon = Icons.AutoMirrored.Default.Logout) }
        }
    }
}

@Composable
fun NotificationsScreen(viewModel: SimitecViewModel) {
    val announcements by viewModel.announcements.collectAsStateWithLifecycle()
    val rows by remember(announcements) {
        derivedStateOf {
            if (announcements.isEmpty()) {
                listOf(
                    Triple("Check-in Confirmado", "Participante entrou com sucesso.", Green),
                    Triple("CPF não encontrado", "Confira o número digitado.", Red),
                    Triple("Sincronização concluída", "Dados em tempo real.", Green),
                    Triple("Cadastro em Grupo", "Nova turma registrada.", Green),
                    Triple("Início do evento", "Equipe pronta para o atendimento.", Blue)
                )
            } else {
                announcements.map { Triple(it.title, it.content, Blue) }
            }
        }
    }
    AppScaffold(viewModel, "settings", "Notificações", showBack = true, actionIcon = Icons.Default.History, onBack = { viewModel.navigateTo("settings") }) { padding ->
        LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item {
                AppCard(color = SurfaceDeep) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconTile(Icons.Default.Notifications, Blue)
                        Spacer(Modifier.width(10.dp))
                        Column(Modifier.weight(1f)) {
                            Text("Resumo do dia", color = TextMain, fontWeight = FontWeight.Bold)
                            Text("Alertas recentes do credenciamento", color = TextMuted, fontSize = 12.sp)
                        }
                        StatusPill("Hoje", Blue)
                    }
                }
            }
            items(rows) { row ->
                AppCard {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconTile(if (row.third == Red) Icons.Default.ErrorOutline else Icons.Default.CheckCircle, row.third, size = 38)
                        Spacer(Modifier.width(10.dp))
                        Column {
                            Text(row.first, color = TextMain, fontWeight = FontWeight.Bold)
                            Text(row.second, color = TextMuted, fontSize = 12.sp)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun SecurityScreen(viewModel: SimitecViewModel) {
    val maskData by viewModel.securityMaskSensitiveData.collectAsStateWithLifecycle()
    val blockCapture by viewModel.securityBlockScreenshots.collectAsStateWithLifecycle()

    AppScaffold(viewModel, "settings", "Segurança", "Proteção dos dados no aparelho", showBack = true, onBack = { viewModel.navigateTo("settings") }) { padding ->
        LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            item {
                AppCard(color = Green.copy(alpha = 0.13f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconTile(Icons.Default.Shield, Green)
                        Spacer(Modifier.width(10.dp))
                        Column {
                            Text("Proteção configurada", color = TextMain, fontWeight = FontWeight.Bold)
                            Text(
                                listOfNotNull(
                                    if (maskData) "dados mascarados" else null,
                                    if (blockCapture) "captura bloqueada" else null
                                ).ifEmpty { listOf("sem bloqueios extras") }.joinToString(", "),
                                color = TextMuted,
                                fontSize = 12.sp
                            )
                        }
                    }
                }
            }
            item {
                SectionHeader("Privacidade de dados")
                SettingsGroup {
                    SwitchRow(Icons.Default.VisibilityOff, "Mascarar Dados Sensíveis", "Esconder CPF e contatos na busca", maskData) { viewModel.setSecurityMaskData(it) }
                    SwitchRow(Icons.Default.Shield, "Bloquear Captura de Tela", "Evita fotos de dados dos participantes", blockCapture) { viewModel.setSecurityBlockScreenshots(it) }
                }
            }
            item {
                SimitecButton("Salvar Configurações", { viewModel.saveSecuritySettingsAndReturn() }, modifier = Modifier.fillMaxWidth(), icon = Icons.Default.Check)
            }
        }
    }
}

private tailrec fun Context.findFragmentActivity(): FragmentActivity? = when (this) {
    is FragmentActivity -> this
    is android.content.ContextWrapper -> baseContext.findFragmentActivity()
    else -> null
}

@Composable
fun FaceSetupScreen(viewModel: SimitecViewModel) {
    val facial by viewModel.securityFacialEnabled.collectAsStateWithLifecycle()
    val context = LocalContext.current

    AppScaffold(
        viewModel,
        "security",
        "Reconhecimento Facial",
        "Cadastre ou vincule o desbloqueio facial do Android",
        showBack = true,
        onBack = { viewModel.navigateTo("security") }
    ) { padding ->
        LazyColumn(
            Modifier.fillMaxSize().padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            item {
                AppCard(color = Blue.copy(alpha = 0.13f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconTile(Icons.Default.AccountCircle, Blue, size = 52)
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text("Facial separado da digital", color = TextMain, fontSize = 17.sp, fontWeight = FontWeight.Bold)
                            Text("O cadastro do rosto é feito pelo Android. Depois disso, o SIMITEC usa essa proteção para liberar o acesso facial.", color = TextMuted, fontSize = 12.sp)
                        }
                    }
                }
            }
            item {
                SectionHeader("Configuração")
                SettingsGroup {
                    Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Security, null, tint = Blue, modifier = Modifier.size(24.dp))
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text("1. Cadastre o rosto no Android", color = TextMain, fontWeight = FontWeight.Bold)
                            Text("Se o aparelho não tiver rosto cadastrado, abra as configurações e adicione agora.", color = TextMuted, fontSize = 12.sp)
                        }
                    }
                    Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.CheckCircle, null, tint = Green, modifier = Modifier.size(24.dp))
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text("2. Ative no aplicativo", color = TextMain, fontWeight = FontWeight.Bold)
                            Text("Depois de cadastrar no Android, confirme abaixo para deixar a função ativa no SIMITEC.", color = TextMuted, fontSize = 12.sp)
                        }
                    }
                }
            }
            item {
                AppCard {
                    SimitecButton(
                        "Abrir configurações faciais",
                        { openFaceEnrollmentSettings(context, viewModel) },
                        modifier = Modifier.fillMaxWidth(),
                        icon = Icons.Default.AccountCircle
                    )
                    SimitecButton(
                        if (facial) "Facial já está ativo" else "Já cadastrei / Ativar no app",
                        { viewModel.confirmFacialEnrollment() },
                        modifier = Modifier.fillMaxWidth(),
                        containerColor = if (facial) Green else Blue,
                        icon = Icons.Default.Check
                    )
                    if (facial) {
                        SimitecButton(
                            "Desativar reconhecimento facial",
                            { viewModel.setSecurityFacial(false) },
                            modifier = Modifier.fillMaxWidth(),
                            containerColor = SurfaceSoft,
                            contentColor = TextMain,
                            icon = Icons.Default.Close
                        )
                    }
                }
            }
        }
    }
}

private fun openFaceEnrollmentSettings(context: Context, viewModel: SimitecViewModel) {
    val intents = listOf(
        Intent("android.settings.FACE_SETTINGS"),
        Intent(Settings.ACTION_BIOMETRIC_ENROLL).putExtra(
            Settings.EXTRA_BIOMETRIC_AUTHENTICATORS_ALLOWED,
            BiometricManager.Authenticators.BIOMETRIC_STRONG
        ),
        Intent(Settings.ACTION_SECURITY_SETTINGS)
    )
    val intent = intents.firstOrNull { it.resolveActivity(context.packageManager) != null }
    if (intent == null) {
        viewModel.showError("Não foi possível abrir as configurações de segurança deste aparelho.")
        return
    }
    try {
        context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    } catch (_: Exception) {
        viewModel.showError("Não foi possível abrir as configurações faciais.")
    }
}

@Composable
fun LanguageScreen(viewModel: SimitecViewModel) {
    val selected by viewModel.appLanguage.collectAsStateWithLifecycle()
    val title = when (selected) {
        "en" -> "Language"
        "es" -> "Idioma"
        else -> "Idioma"
    }
    val subtitle = when (selected) {
        "en" -> "Choose the interface language"
        "es" -> "Elige el idioma de la interfaz"
        else -> "Escolha o idioma da interface"
    }
    AppScaffold(viewModel, "settings", title, subtitle, showBack = true, onBack = { viewModel.navigateTo("settings") }) { padding ->
        LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item {
                AppCard {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconTile(Icons.Default.Language, Blue)
                        Spacer(Modifier.width(10.dp))
                        Column {
                            Text(if (selected == "en") "App language" else if (selected == "es") "Idioma de la app" else "Idioma do aplicativo", color = TextMain, fontWeight = FontWeight.Bold)
                            Text(if (selected == "en") "This choice does not change your phone language." else if (selected == "es") "Esta opción no cambia el idioma del celular." else "Essa escolha não altera o idioma do celular.", color = TextMuted, fontSize = 12.sp)
                        }
                    }
                }
            }
            items(SupportedLanguages) { (code, language) ->
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(CardShape)
                        .clickable { viewModel.setLanguage(code) },
                    color = if (selected == code) Blue.copy(alpha = 0.18f) else SurfaceDark,
                    shape = CardShape,
                    border = BorderStroke(1.dp, if (selected == code) Blue else Border)
                ) {
                    Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text(language, color = TextMain, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                        if (selected == code) Icon(Icons.Default.CheckCircle, null, tint = Blue)
                    }
                }
            }
            item { SimitecButton(if (selected == "en") "Save language" else if (selected == "es") "Guardar idioma" else "Salvar idioma", { viewModel.saveLanguageAndReturn() }, modifier = Modifier.fillMaxWidth(), icon = Icons.Default.Save) }
        }
    }
}

@Composable
private fun EmptyState(message: String) {
    AppCard(color = SurfaceDeep) {
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(Icons.Default.Info, null, tint = TextMuted)
            Spacer(Modifier.height(8.dp))
            Text(message, color = TextMuted, textAlign = TextAlign.Center)
        }
    }
}

@Composable
private fun DividerLine() {
    Box(
        Modifier
            .fillMaxWidth()
            .height(1.dp)
            .background(Border)
    )
}

private fun firstName(name: String?): String {
    val parts = name?.trim()?.split(Regex("\\s+"))?.filter { it.isNotBlank() }.orEmpty()
    return parts.firstOrNull()?.trim('.', ',', ':', ';')?.ifBlank { null } ?: "Ricardo"
}

private fun roleLabel(role: String?): String {
    return when (role) {
        "super_admin" -> "Super administrador"
        "admin" -> "Administrador"
        "checkin" -> "Credenciamento"
        "participant" -> "Participante"
        else -> "Operador"
    }
}

object ToastHelper {
    fun showToast(context: android.content.Context, message: String) {
        android.widget.Toast.makeText(context, message, android.widget.Toast.LENGTH_SHORT).show()
    }
}
