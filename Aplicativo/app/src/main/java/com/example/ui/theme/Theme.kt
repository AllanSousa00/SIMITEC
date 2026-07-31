package com.example.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

private val DarkColorScheme =
  darkColorScheme(
    primary = SimitecAccentBlue,
    secondary = SimitecGreen,
    tertiary = SimitecAmber,
    background = SimitecBgDark,
    surface = SimitecCardDark,
    onPrimary = SimitecBlue,
    onSecondary = Color.White,
    onBackground = Color.White,
    onSurface = Color.White,
    outline = Color(0xFF26465D),
    surfaceVariant = Color(0xFF12354E)
  )

private val LightColorScheme =
  lightColorScheme(
    primary = SimitecLightBlue,
    secondary = SimitecLightGreen,
    tertiary = SimitecLightAmber,
    background = SimitecSurface,
    surface = Color(0xFFF9FCFD),
    onPrimary = Color.White,
    onSecondary = Color.White,
    onBackground = SimitecBlue,
    onSurface = SimitecBlue,
    outline = Color(0xFF9BB9C7),
    surfaceVariant = Color(0xFFD5E6EC),
    onSurfaceVariant = Color(0xFF385A6B)
  )

@Composable
fun MyApplicationTheme(
  darkTheme: Boolean = isSystemInDarkTheme(),
  // Force SIMITEC brand cohesive colors
  dynamicColor: Boolean = false,
  content: @Composable () -> Unit,
) {
  val colorScheme =
    when {
      dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
        val context = LocalContext.current
        if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
      }

      darkTheme -> DarkColorScheme
      else -> LightColorScheme
    }

  MaterialTheme(colorScheme = colorScheme, typography = Typography, shapes = Shapes, content = content)
}
