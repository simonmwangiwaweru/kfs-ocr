package com.example.ui.theme

import androidx.compose.ui.graphics.Color

// ====================================================================
// Stitch Field Scanner Design System — Color Tokens & Palette
// ====================================================================

// Canvas & Ambient Surfaces
val AppBackground = Color(0xFFF3F5F4)          // Soft outdoor anti-glare canvas base
val SurfaceCard = Color(0xFFFFFFFF)            // Pure elevated white card
val SurfaceSubtle = Color(0xFFF2F4F3)          // Container low
val SurfaceContainer = Color(0xFFECEEED)       // Container standard
val SurfaceContainerHigh = Color(0xFFE6E9E8)   // Container high
val SurfaceContainerHighest = Color(0xFFE1E3E2)// Notch / hardware dark simulation
val SurfaceDark = Color(0xFF2E3131)            // Inverse surface / dark tactile

// Hairlines & Dividers
val HairlineBorder = Color(0xFFBEC9BF)         // Outline variant subtle 1px divider
val HairlineBorderSubtle = Color(0x33BEC9BF)   // 20% opacity interior divider
val FocusBorder = Color(0xFF1F7A4D)            // Primary container green focus ring

// Typography Inks
val TextPrimary = Color(0xFF191C1C)            // High-legibility on-surface slate
val TextSecondary = Color(0xFF3F4941)          // Balanced secondary on-surface-variant
val TextMuted = Color(0xFF6F7A71)              // Metadata / inactive outline

// KEFRI / KFS Forest Brand Palette
val BrandEmerald = Color(0xFF1F7A4D)           // Primary Container (#1F7A4D)
val BrandEmeraldTop = Color(0xFF2D8F5E)        // Gradient top (#2D8F5E)
val BrandEmeraldDark = Color(0xFF006038)       // Deep Canopy (#006038)
val BrandEmeraldLight = Color(0xFFDDF1E6)      // Tinted Canopy / Halo ring (#DDF1E6)
val BrandEmeraldBorder = Color(0xFF82D8A3)     // Primary fixed dim
val SecondaryContainer = Color(0xFFBCEACF)     // Secondary Container
val SecondaryFixed = Color(0xFFBFEDD2)         // Secondary Fixed

// OCR Confidence Flagging (<85% Amber)
val FlagAmber = Color(0xFFD97706)              // Warm warning amber text
val FlagAmberBg = Color(0xFFFEF3C7)            // Soft amber cell substrate
val FlagAmberBorder = Color(0xFFFDE68A)        // Amber border
val FlagAmberText = Color(0xFF92400E)          // Amber readable text
val FlagAmberContainer = Color(0xFFA45800)     // Tertiary container

// Validated State (≥85% Emerald)
val VerifiedGreen = Color(0xFF059669)          // Validated check emerald
val VerifiedGreenBg = Color(0xFFD1FAE5)        // Validated chip substrate
val VerifiedGreenBorder = Color(0xFFA3D1B6)    // Validated border
val VerifiedGreenText = Color(0xFF065F46)      // Validated text

// Destructive Red
val ErrorRed = Color(0xFFDC2626)
val ErrorRedBg = Color(0xFFFEE2E2)

// Compatibility aliases
val ForestPrimary = BrandEmerald
val ForestPrimaryContainer = BrandEmeraldLight
val MustardPrimary = BrandEmerald
val MustardPrimaryContainer = BrandEmeraldLight
val ParchmentSurface = SurfaceCard
val ParchmentCardBg = SurfaceSubtle
val ParchmentCardBorder = HairlineBorder
val OnParchmentSurface = TextPrimary
val OutlineWarm = TextMuted
val FlagAmberOnContainer = FlagAmberText
val VerifiedGreenContainer = VerifiedGreenBg
val VerifiedGreenOnContainer = VerifiedGreenText
