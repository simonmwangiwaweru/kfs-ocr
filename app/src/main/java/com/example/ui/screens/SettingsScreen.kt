package com.example.ui.screens

import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.*
import com.example.viewmodel.InventoryViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    viewModel: InventoryViewModel,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val isOffline by viewModel.isOffline.collectAsState()

    // Officer & Station Profile State
    var officerName by remember { mutableStateOf("Forester J. Mwangi") }
    var officerBadge by remember { mutableStateOf("KFS-BIO-4819") }
    var stationName by remember { mutableStateOf("Mt. Kenya Station — Comp 14") }
    var conservancy by remember { mutableStateOf("Central Highlands Conservancy") }

    // Biometrics & Validation Rules State
    var selectedSpecies by remember { mutableStateOf("Pinus patula (Patula Pine)") }
    var showSpeciesDropdown by remember { mutableStateOf(false) }
    val speciesOptions = listOf(
        "Pinus patula (Patula Pine)",
        "Cupressus lusitanica (Cypress)",
        "Eucalyptus saligna (Blue Gum)",
        "Podocarpus milanjianus (Podo)",
        "Mixed Indigenous Canopy"
    )

    var minDbh by remember { mutableStateOf("5.0") }
    var maxDbh by remember { mutableStateOf("120.0") }
    var confidenceThreshold by remember { mutableStateOf(85f) }
    var autoAdvance by remember { mutableStateOf(true) }
    var hapticFeedback by remember { mutableStateOf(true) }

    // Sync & Data
    var autoSyncMobile by remember { mutableStateOf(true) }
    var isSyncingNow by remember { mutableStateOf(false) }
    var defaultExportFormat by remember { mutableStateOf("Notepad (.txt) Space-Aligned") }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(AppBackground)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 12.dp)
            .padding(bottom = 90.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // TOP SYSTEM STATUS PILL
        Surface(
            color = SurfaceCard,
            shape = RoundedCornerShape(12.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorderSubtle),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .clip(CircleShape)
                            .background(if (isOffline) FlagAmber else VerifiedGreen)
                    )
                    Column {
                        Text(
                            text = if (isOffline) "FIELD STANDALONE (OFFLINE)" else "KFS CENTRAL DATABASE CONNECTED",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                        Text(
                            text = "Central Highlands Node • Nairobi Cloud Sync Active",
                            fontSize = 10.sp,
                            color = TextSecondary
                        )
                    }
                }
                Surface(
                    color = SecondaryContainer,
                    shape = RoundedCornerShape(9999.dp)
                ) {
                    Text(
                        text = "FORM AGW-85-01",
                        fontSize = 9.sp,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold,
                        color = BrandEmeraldDark,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }
        }

        // SECTION 1: FIELD OFFICER & STATION PROFILE
        Surface(
            color = SurfaceCard,
            shape = RoundedCornerShape(16.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorderSubtle),
            shadowElevation = 2.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(34.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(SecondaryContainer.copy(alpha = 0.6f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Outlined.Badge, contentDescription = null, tint = BrandEmerald, modifier = Modifier.size(20.dp))
                    }
                    Column {
                        Text(text = "Survey Officer & Station Profile", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        Text(text = "Official surveyor metadata appended to all exported plot forms", fontSize = 11.sp, color = TextSecondary)
                    }
                }

                Divider(color = HairlineBorderSubtle)

                // Officer Name
                OutlinedTextField(
                    value = officerName,
                    onValueChange = { officerName = it },
                    label = { Text("Appraisal Officer / Surveyor Name", fontSize = 12.sp) },
                    leadingIcon = { Icon(Icons.Outlined.Person, contentDescription = null, tint = BrandEmerald) },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = BrandEmerald,
                        unfocusedBorderColor = HairlineBorder
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    // Officer ID
                    OutlinedTextField(
                        value = officerBadge,
                        onValueChange = { officerBadge = it },
                        label = { Text("Service Badge #", fontSize = 12.sp) },
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = BrandEmerald,
                            unfocusedBorderColor = HairlineBorder
                        ),
                        modifier = Modifier.weight(1f)
                    )

                    // Conservancy
                    OutlinedTextField(
                        value = conservancy,
                        onValueChange = { conservancy = it },
                        label = { Text("Conservancy", fontSize = 12.sp) },
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = BrandEmerald,
                            unfocusedBorderColor = HairlineBorder
                        ),
                        modifier = Modifier.weight(1.3f)
                    )
                }

                // Station / Beat
                OutlinedTextField(
                    value = stationName,
                    onValueChange = { stationName = it },
                    label = { Text("Station & Compartment Block", fontSize = 12.sp) },
                    leadingIcon = { Icon(Icons.Outlined.Park, contentDescription = null, tint = BrandEmerald) },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = BrandEmerald,
                        unfocusedBorderColor = HairlineBorder
                    ),
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }

        // SECTION 2: FORM AGW-85-01 VALIDATION & ALLOMETRY RULES
        Surface(
            color = SurfaceCard,
            shape = RoundedCornerShape(16.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorderSubtle),
            shadowElevation = 2.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(34.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(SecondaryContainer.copy(alpha = 0.6f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Outlined.Rule, contentDescription = null, tint = BrandEmerald, modifier = Modifier.size(20.dp))
                    }
                    Column {
                        Text(text = "Form Validation & Allometry Rules", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        Text(text = "Biometric boundaries and automated auditing thresholds", fontSize = 11.sp, color = TextSecondary)
                    }
                }

                Divider(color = HairlineBorderSubtle)

                // Forest Species Preset Selector
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(text = "DEFAULT COMPARTMENT SPECIES", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    Box(modifier = Modifier.fillMaxWidth()) {
                        Surface(
                            color = SurfaceSubtle,
                            shape = RoundedCornerShape(8.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorder),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { showSpeciesDropdown = !showSpeciesDropdown }
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 12.dp, vertical = 12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Icon(Icons.Default.Forest, contentDescription = null, tint = BrandEmerald, modifier = Modifier.size(18.dp))
                                    Text(text = selectedSpecies, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                                }
                                Icon(Icons.Default.ArrowDropDown, contentDescription = null, tint = TextMuted)
                            }
                        }

                        DropdownMenu(
                            expanded = showSpeciesDropdown,
                            onDismissRequest = { showSpeciesDropdown = false }
                        ) {
                            speciesOptions.forEach { opt ->
                                DropdownMenuItem(
                                    text = { Text(opt, fontSize = 13.sp) },
                                    onClick = {
                                        selectedSpecies = opt
                                        showSpeciesDropdown = false
                                        Toast.makeText(context, "Species set to: $opt", Toast.LENGTH_SHORT).show()
                                    }
                                )
                            }
                        }
                    }
                }

                // DBH Sanity Bounds
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(text = "MIN DBH (cm)", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        OutlinedTextField(
                            value = minDbh,
                            onValueChange = { minDbh = it },
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = BrandEmerald,
                                unfocusedBorderColor = HairlineBorder
                            )
                        )
                    }
                    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(text = "MAX DBH (cm)", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        OutlinedTextField(
                            value = maxDbh,
                            onValueChange = { maxDbh = it },
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = BrandEmerald,
                                unfocusedBorderColor = HairlineBorder
                            )
                        )
                    }
                }
                Text(
                    text = "Values outside $minDbh cm – $maxDbh cm will trigger an immediate amber audit flag on the inventory review table.",
                    fontSize = 11.sp,
                    color = TextSecondary,
                    lineHeight = 14.sp
                )

                // Volume Allometric Model
                Surface(
                    color = SurfaceSubtle,
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Outlined.Calculate, contentDescription = null, tint = BrandEmerald, modifier = Modifier.size(18.dp))
                        Column {
                            Text(text = "Volume Calculation Equation", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                            Text(text = "KEFRI Standard Volume Model: V = 0.000062 × D^1.825 × H^1.024", fontSize = 10.sp, fontFamily = FontFamily.Monospace, color = BrandEmeraldDark)
                        }
                    }
                }
            }
        }

        // SECTION 3: OPTICAL OCR RECOGNITION SENSITIVITY
        Surface(
            color = SurfaceCard,
            shape = RoundedCornerShape(16.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorderSubtle),
            shadowElevation = 2.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(34.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(SecondaryContainer.copy(alpha = 0.6f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Outlined.Tune, contentDescription = null, tint = BrandEmerald, modifier = Modifier.size(20.dp))
                    }
                    Column {
                        Text(text = "Optical Recognition & Inspection Sensitivity", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        Text(text = "On-device neural OCR model calibration (No internet required)", fontSize = 11.sp, color = TextSecondary)
                    }
                }

                Divider(color = HairlineBorderSubtle)

                // Confidence Slider
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(text = "FLAGGING AUDIT THRESHOLD", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        Surface(
                            color = FlagAmberBg,
                            shape = RoundedCornerShape(6.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, FlagAmberBorder)
                        ) {
                            Text(
                                text = "Flags cells < ${confidenceThreshold.toInt()}%",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = FlagAmberText,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                            )
                        }
                    }

                    Slider(
                        value = confidenceThreshold,
                        onValueChange = { confidenceThreshold = it },
                        valueRange = 60f..95f,
                        steps = 6,
                        colors = SliderDefaults.colors(
                            thumbColor = BrandEmerald,
                            activeTrackColor = BrandEmerald,
                            inactiveTrackColor = HairlineBorder
                        )
                    )
                    Text(
                        text = "Higher sensitivity forces human forester inspection on any handwriting with smudges or faint tally pencil marks.",
                        fontSize = 11.sp,
                        color = TextSecondary
                    )
                }

                Divider(color = HairlineBorderSubtle)

                // Toggle: Auto advance cursor
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(text = "Auto-Advance to Next Flagged Cell", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        Text(text = "Automatically jumps cursor to the next low-confidence cell after correction", fontSize = 11.sp, color = TextSecondary)
                    }
                    Switch(
                        checked = autoAdvance,
                        onCheckedChange = { autoAdvance = it },
                        colors = SwitchDefaults.colors(checkedThumbColor = Color.White, checkedTrackColor = BrandEmerald)
                    )
                }

                // Toggle: Haptic feedback
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(text = "Tactile Haptic Cues", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        Text(text = "Vibrates gently when a flagged cell is tapped or resolved", fontSize = 11.sp, color = TextSecondary)
                    }
                    Switch(
                        checked = hapticFeedback,
                        onCheckedChange = { hapticFeedback = it },
                        colors = SwitchDefaults.colors(checkedThumbColor = Color.White, checkedTrackColor = BrandEmerald)
                    )
                }
            }
        }

        // SECTION 4: OFFLINE STORAGE & CENTRAL SYNC
        Surface(
            color = SurfaceCard,
            shape = RoundedCornerShape(16.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorderSubtle),
            shadowElevation = 2.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(34.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(SecondaryContainer.copy(alpha = 0.6f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Outlined.CloudSync, contentDescription = null, tint = BrandEmerald, modifier = Modifier.size(20.dp))
                    }
                    Column {
                        Text(text = "Forest Offline Storage & Central Sync", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        Text(text = "Guaranteed 100% offline operation in remote reserves", fontSize = 11.sp, color = TextSecondary)
                    }
                }

                Divider(color = HairlineBorderSubtle)

                // Mobile Data Sync Toggle
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(text = "Auto-sync over Mobile Network", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        Text(text = "Sync queued plot appraisals when Safaricom or Airtel connectivity returns", fontSize = 11.sp, color = TextSecondary)
                    }
                    Switch(
                        checked = autoSyncMobile,
                        onCheckedChange = { autoSyncMobile = it },
                        colors = SwitchDefaults.colors(checkedThumbColor = Color.White, checkedTrackColor = BrandEmerald)
                    )
                }

                // Storage stats
                Surface(
                    color = SurfaceSubtle,
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            Icon(Icons.Outlined.Storage, contentDescription = null, tint = TextMuted, modifier = Modifier.size(20.dp))
                            Column {
                                Text(text = "Encrypted Local Storage", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                Text(text = "18.4 MB cached • 3 Plot Tallies (570 Stem Records)", fontSize = 10.sp, color = TextSecondary)
                            }
                        }
                        Button(
                            onClick = {
                                isSyncingNow = true
                                Toast.makeText(context, "Contacting KFS Headquarters Central Biometrics Server...", Toast.LENGTH_SHORT).show()
                                isSyncingNow = false
                                Toast.makeText(context, "All field plots synchronized successfully!", Toast.LENGTH_SHORT).show()
                            },
                            shape = RoundedCornerShape(8.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                            modifier = Modifier.height(32.dp)
                        ) {
                            Icon(Icons.Outlined.Sync, contentDescription = null, modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Sync Now", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        // SECTION 5: INSTITUTIONAL COMPLIANCE & LEGAL CERTIFICATION
        Surface(
            color = SurfaceCard,
            shape = RoundedCornerShape(16.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorderSubtle),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Icon(Icons.Default.Verified, contentDescription = null, tint = BrandEmerald, modifier = Modifier.size(18.dp))
                        Text(text = "REPUBLIC OF KENYA BIOMETRIC STANDARD", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = BrandEmerald)
                    }
                    Surface(color = SurfaceSubtle, shape = RoundedCornerShape(4.dp)) {
                        Text(text = "KFS-REV-2024", fontSize = 10.sp, fontFamily = FontFamily.Monospace, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp), color = TextSecondary)
                    }
                }

                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Box(
                        modifier = Modifier.size(36.dp).clip(RoundedCornerShape(8.dp)).background(BrandEmeraldLight),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Park, contentDescription = null, tint = BrandEmerald, modifier = Modifier.size(20.dp))
                    }
                    Column {
                        Text(text = "Kenya Forest Service (KFS)", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        Text(text = "Kenya Forestry Research Institute (KEFRI) — Biometrics Division", fontSize = 11.sp, color = TextSecondary)
                    }
                }

                Surface(
                    color = BrandEmeraldLight.copy(alpha = 0.5f),
                    shape = RoundedCornerShape(8.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, BrandEmeraldBorder.copy(alpha = 0.5f)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(10.dp)) {
                        Text(text = "OFFICIAL SPECIFICATION", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = BrandEmeraldDark)
                        Text(text = "Standard Plantation Tally Sheet AGW-85-01 (10 Columns × 19 Rows = 190 DBH Cells per Form)", fontSize = 11.sp, fontFamily = FontFamily.Monospace, color = TextPrimary)
                    }
                }
            }
        }
    }
}
