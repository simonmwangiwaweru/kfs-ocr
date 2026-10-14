package com.example.ui.theme

import androidx.compose.ui.graphics.Color

// Emil Kowalski Design Engineering — Modern Crisp Light Theme Tokens
val AppBackground = Color(0xFFF8FAFC)       // Slate-50: ultra-clean, minimal canvas
val SurfaceCard = Color(0xFFFFFFFF)         // Pure crisp white card surface
val SurfaceSubtle = Color(0xFFF1F5F9)       // Slate-100: soft pill backgrounds
val SurfacePressed = Color(0xFFE2E8F0)      // Slate-200: active tap feedback

val HairlineBorder = Color(0xFFE2E8F0)      // Slate-200: razor-sharp 1px subtle divider
val HairlineBorderSubtle = Color(0xFFEEF2F6)// Ultra-fine interior divider
val FocusBorder = Color(0xFF0F172A)         // Deep slate focus ring

val TextPrimary = Color(0xFF0F172A)         // Slate-900: high-contrast ink
val TextSecondary = Color(0xFF475569)       // Slate-600: balanced readability
val TextMuted = Color(0xFF94A3B8)           // Slate-400: secondary metadata

// KEFRI Forest Brand Accents
val BrandEmerald = Color(0xFF059669)        // Emerald-600: vibrant, natural, scientific
val BrandEmeraldDark = Color(0xFF064E3B)    // Emerald-900: authoritative headings
val BrandEmeraldLight = Color(0xFFECFDF5)   // Emerald-50: crisp badge wash
val BrandEmeraldBorder = Color(0xFFA7F3D0)  // Emerald-200: subtle badge stroke

// OCR Uncertainty & Verification System
val FlagAmber = Color(0xFFD97706)           // Amber-600: distinct uncertainty warning
val FlagAmberBg = Color(0xFFFFFBEB)         // Amber-50: soft warning cell background
val FlagAmberBorder = Color(0xFFFDE68A)     // Amber-200: clear callout stroke
val FlagAmberText = Color(0xFF92400E)       // Amber-800: accessible warning text

val VerifiedGreen = Color(0xFF059669)       // Emerald-600
val VerifiedGreenBg = Color(0xFFECFDF5)     // Emerald-50
val VerifiedGreenBorder = Color(0xFFA7F3D0) // Emerald-200
val VerifiedGreenText = Color(0xFF065F46)   // Emerald-800

val ErrorRed = Color(0xFFDC2626)
val ErrorRedBg = Color(0xFFFEF2F2)

// Theme compatibility aliases
val ForestPrimary = BrandEmerald
val ForestPrimaryContainer = BrandEmeraldLight
val MustardPrimary = BrandEmerald
val MustardPrimaryContainer = BrandEmeraldLight
val ParchmentSurface = SurfaceCard
val ParchmentCardBg = SurfaceSubtle
val ParchmentCardBorder = HairlineBorder
val OnParchmentSurface = TextPrimary
val OutlineWarm = TextMuted
val FlagAmberContainer = FlagAmberBg
val FlagAmberOnContainer = FlagAmberText
val VerifiedGreenContainer = VerifiedGreenBg
val VerifiedGreenOnContainer = VerifiedGreenText
