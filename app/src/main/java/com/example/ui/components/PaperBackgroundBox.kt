package com.example.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.example.ui.theme.AppBackground

@Composable
fun PaperBackgroundBox(
    modifier: Modifier = Modifier,
    alpha: Float = 1.0f,
    content: @Composable () -> Unit
) {
    // Emil Kowalski clean light theme canvas: pristine, flat, minimalist Slate-50
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(AppBackground)
    ) {
        content()
    }
}
