package com.ibnips.kotlinapp.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColors = lightColorScheme(
    primary = IndigoBlue,
    secondary = Mint,
    tertiary = Amber,
    background = LightBackground,
    surface = LightSurface,
    onSurface = LightOnSurface,
)

private val DarkColors = darkColorScheme(
    primary = IndigoBlue,
    secondary = Mint,
    tertiary = Amber,
    background = DarkBackground,
    surface = DarkSurface,
    onSurface = DarkOnSurface,
)

@Composable
fun IbnIPSTheme(content: @Composable () -> Unit) {
    val colors = if (isSystemInDarkTheme()) DarkColors else LightColors

    MaterialTheme(
        colorScheme = colors,
        typography = Typography,
        content = content,
    )
}
