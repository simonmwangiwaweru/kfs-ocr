package com.example.ui.screens

import android.widget.Toast
import androidx.compose.animation.core.*
import androidx.compose.foundation.Image
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.R
import com.example.model.ScanMode
import com.example.ui.components.ScanAuditReportDialog
import com.example.ui.theme.*
import com.example.viewmodel.InventoryViewModel

@Composable
fun ScanScreen(
    viewModel: InventoryViewModel,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scanMode by viewModel.scanMode.collectAsState()
    val isOffline by viewModel.isOffline.collectAsState()
    val auditReportDoc by viewModel.auditReportDoc.collectAsState()

    // Animated laser sweep animation (like Stitch code__7__0f318414.html)
    val infiniteTransition = rememberInfiniteTransition(label = "laser")
    val laserYRatio by infiniteTransition.animateFloat(
        initialValue = 0.08f,
        targetValue = 0.92f,
        animationSpec = infiniteRepeatable(
            animation = tween(2200, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "laser_y"
    )

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(AppBackground)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 12.dp)
            .padding(bottom = 85.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Mode Selector (3 Tactile Floating Tiles)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // Tile 1: Form Mode (10x19 Grid) - Active
            Surface(
                color = if (scanMode == ScanMode.FORM_MODE) Color.White else SurfaceCard,
                shape = RoundedCornerShape(16.dp),
                border = androidx.compose.foundation.BorderStroke(
                    if (scanMode == ScanMode.FORM_MODE) 2.dp else 1.dp,
                    if (scanMode == ScanMode.FORM_MODE) BrandEmerald else HairlineBorderSubtle
                ),
                shadowElevation = if (scanMode == ScanMode.FORM_MODE) 4.dp else 1.dp,
                modifier = Modifier
                    .weight(1f)
                    .clickable { viewModel.setScanMode(ScanMode.FORM_MODE) }
                    .testTag("mode_form_10x19")
            ) {
                Column(
                    modifier = Modifier.padding(vertical = 10.dp, horizontal = 6.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .clip(CircleShape)
                            .background(if (scanMode == ScanMode.FORM_MODE) BrandEmeraldLight else SurfaceSubtle),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.TableChart,
                            contentDescription = null,
                            tint = if (scanMode == ScanMode.FORM_MODE) BrandEmerald else TextSecondary,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Form Mode",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (scanMode == ScanMode.FORM_MODE) BrandEmerald else TextPrimary
                    )
                    Text(
                        text = "Full Sheet",
                        fontSize = 9.sp,
                        fontFamily = FontFamily.Monospace,
                        color = if (scanMode == ScanMode.FORM_MODE) BrandEmeraldDark else TextMuted
                    )
                }
            }

            // Tile 2: Batch Mode
            Surface(
                color = SurfaceCard,
                shape = RoundedCornerShape(16.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorderSubtle),
                shadowElevation = 1.dp,
                modifier = Modifier
                    .weight(1f)
                    .clickable {
                        viewModel.setScanMode(ScanMode.BATCH_PAGES)
                        Toast.makeText(context, "Batch Mode enabled: multi-page sheet buffer", Toast.LENGTH_SHORT).show()
                    }
            ) {
                Column(
                    modifier = Modifier.padding(vertical = 10.dp, horizontal = 6.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .clip(CircleShape)
                            .background(SurfaceSubtle),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Outlined.Layers, contentDescription = null, tint = TextSecondary, modifier = Modifier.size(18.dp))
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(text = "Batch Mode", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
                    Text(text = "Multi-leaf", fontSize = 9.sp, fontFamily = FontFamily.Monospace, color = TextMuted)
                }
            }

            // Tile 3: Gallery
            Surface(
                color = SurfaceCard,
                shape = RoundedCornerShape(16.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorderSubtle),
                shadowElevation = 1.dp,
                modifier = Modifier
                    .weight(1f)
                    .clickable {
                        viewModel.selectTab(2) // Switch to Archive/Gallery
                    }
            ) {
                Column(
                    modifier = Modifier.padding(vertical = 10.dp, horizontal = 6.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .clip(CircleShape)
                            .background(SurfaceSubtle),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Outlined.PhotoLibrary, contentDescription = null, tint = TextSecondary, modifier = Modifier.size(18.dp))
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(text = "Gallery", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
                    Text(text = "Stored Media", fontSize = 9.sp, fontFamily = FontFamily.Monospace, color = TextMuted)
                }
            }
        }

        // Central Scanner Viewfinder Card (From Stitch code__7__0f318414.html)
        Surface(
            color = SurfaceCard,
            shape = RoundedCornerShape(22.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorderSubtle),
            shadowElevation = 4.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Box(
                modifier = Modifier
                    .padding(8.dp)
                    .fillMaxWidth()
                    .height(280.dp)
                    .clip(RoundedCornerShape(18.dp))
                    .background(Color(0xFF2E3131))
            ) {
                // Background Form Photo Texture
                Image(
                    painter = painterResource(id = R.drawable.sample_field_form),
                    contentDescription = "Physical KFS Form AGW-85-01 Scan",
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )

                // Tactical Vignette Overlay
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    Color.Black.copy(alpha = 0.45f),
                                    Color.Transparent,
                                    Color.Black.copy(alpha = 0.65f)
                                )
                            )
                        )
                )

                // Outer Grey Corner Framing Box
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(12.dp)
                        .border(2.dp, Color.White.copy(alpha = 0.25f), RoundedCornerShape(12.dp))
                )

                // Bold Forest Green Inner Corner Targeting Brackets
                // Top-Left
                Box(
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(18.dp)
                        .size(24.dp)
                        .border(
                            width = 4.dp,
                            color = BrandEmeraldBorder,
                            shape = RoundedCornerShape(topStart = 4.dp)
                        )
                )
                // Top-Right
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(18.dp)
                        .size(24.dp)
                        .border(
                            width = 4.dp,
                            color = BrandEmeraldBorder,
                            shape = RoundedCornerShape(topEnd = 4.dp)
                        )
                )
                // Bottom-Left
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(18.dp)
                        .size(24.dp)
                        .border(
                            width = 4.dp,
                            color = BrandEmeraldBorder,
                            shape = RoundedCornerShape(bottomStart = 4.dp)
                        )
                )
                // Bottom-Right
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(18.dp)
                        .size(24.dp)
                        .border(
                            width = 4.dp,
                            color = BrandEmeraldBorder,
                            shape = RoundedCornerShape(bottomEnd = 4.dp)
                        )
                )

                // Central Crosshair Optical Marker
                Box(
                    modifier = Modifier
                        .align(Alignment.Center)
                        .size(40.dp)
                        .border(1.dp, BrandEmeraldBorder.copy(alpha = 0.5f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Box(modifier = Modifier.size(6.dp).clip(CircleShape).background(BrandEmeraldBorder))
                }

                // Animated Laser Scan Beam
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                        .align(Alignment.TopCenter)
                        .offset(y = (280 * laserYRatio).dp)
                        .height(2.dp)
                        .background(BrandEmeraldBorder)
                )

                // Top Telemetry Header Readout
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp)
                        .align(Alignment.TopCenter),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        color = Color.Black.copy(alpha = 0.65f),
                        shape = RoundedCornerShape(4.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.15f))
                    ) {
                        Text(
                            text = "FORM: AGW-85-01",
                            fontSize = 10.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                        )
                    }

                    Surface(
                        color = Color.Black.copy(alpha = 0.65f),
                        shape = RoundedCornerShape(4.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.15f))
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                        ) {
                            Box(modifier = Modifier.size(6.dp).clip(CircleShape).background(BrandEmeraldBorder))
                            Text(
                                text = "AUTO-FOCUS",
                                fontSize = 10.sp,
                                fontFamily = FontFamily.Monospace,
                                color = BrandEmeraldBorder
                            )
                        }
                    }
                }

                // Guidance Chip Overlay at bottom of Viewfinder
                Surface(
                    color = Color(0xFF2E3131).copy(alpha = 0.88f),
                    shape = RoundedCornerShape(9999.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.2f)),
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 12.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(Icons.Outlined.CropFree, contentDescription = null, tint = BrandEmeraldBorder, modifier = Modifier.size(16.dp))
                        Text(
                            text = "Align Stumpage Appraisal Form AGW-85-01 within frame",
                            fontSize = 10.5.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color.White
                        )
                    }
                }
            }
        }

        // Action Buttons Below Viewfinder
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            // Big Tactile Primary Trigger: TAKE PHOTO
            Button(
                onClick = {
                    viewModel.captureSinglePage("Comp 14", "Mt. Kenya East", "J. Kariuki")
                    Toast.makeText(context, "Optical Capture: Digitized 190 DBH entries!", Toast.LENGTH_SHORT).show()
                },
                colors = ButtonDefaults.buttonColors(
                    containerColor = BrandEmerald
                ),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .testTag("take_photo_btn")
            ) {
                Box(
                    modifier = Modifier
                        .size(28.dp)
                        .clip(CircleShape)
                        .background(Color.White.copy(alpha = 0.2f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Default.PhotoCamera, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                }
                Spacer(modifier = Modifier.width(10.dp))
                Text(
                    text = "TAKE PHOTO",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = 1.sp,
                    color = Color.White
                )
            }

            // Secondary Buttons Cluster
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Browse Files
                Surface(
                    color = SurfaceCard,
                    shape = RoundedCornerShape(14.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorderSubtle),
                    shadowElevation = 2.dp,
                    modifier = Modifier
                        .weight(1f)
                        .clickable {
                            viewModel.captureSinglePage("Comp 14", "Mt. Kenya East", "J. Kariuki")
                            Toast.makeText(context, "Loaded document file", Toast.LENGTH_SHORT).show()
                        }
                ) {
                    Column(
                        modifier = Modifier.padding(12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            Icon(Icons.Outlined.UploadFile, contentDescription = null, tint = BrandEmerald, modifier = Modifier.size(18.dp))
                            Text(text = "Browse Files", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        }
                        Text(text = "PNG, JPG, PDF", fontSize = 10.sp, fontFamily = FontFamily.Monospace, color = TextMuted, modifier = Modifier.padding(top = 2.dp))
                    }
                }

                // Load Sample Demo
                Surface(
                    color = SecondaryFixed.copy(alpha = 0.3f),
                    shape = RoundedCornerShape(14.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, BrandEmerald.copy(alpha = 0.4f)),
                    shadowElevation = 2.dp,
                    modifier = Modifier
                        .weight(1f)
                        .clickable {
                            viewModel.loadSampleAgw85()
                            Toast.makeText(context, "Loaded AGW-85-01 Mt. Kenya East appraisal!", Toast.LENGTH_SHORT).show()
                        }
                ) {
                    Column(
                        modifier = Modifier.padding(12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            Icon(Icons.Default.Eco, contentDescription = null, tint = BrandEmerald, modifier = Modifier.size(18.dp))
                            Text(text = "Load Sample", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = BrandEmerald)
                        }
                        Text(text = "AGW-85-01 Demo", fontSize = 10.sp, fontFamily = FontFamily.Monospace, color = BrandEmeraldDark, modifier = Modifier.padding(top = 2.dp))
                    }
                }
            }
        }

        // Offline Queue Banner Card
        Surface(
            color = SurfaceCard,
            shape = RoundedCornerShape(18.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorderSubtle),
            shadowElevation = 2.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(14.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(FlagAmberBg),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.CloudOff, contentDescription = null, tint = FlagAmber, modifier = Modifier.size(20.dp))
                    }
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text(text = "Offline Queue: 2 sheets waiting", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                            Box(modifier = Modifier.size(6.dp).clip(CircleShape).background(FlagAmber))
                        }
                        Text(text = "They'll sync when you're back online", fontSize = 10.5.sp, color = TextMuted)
                    }
                }

                Box(
                    modifier = Modifier
                        .size(32.dp)
                        .clip(CircleShape)
                        .background(SecondaryContainer)
                        .clickable {
                            viewModel.syncAll()
                            Toast.makeText(context, "Synced queued field records", Toast.LENGTH_SHORT).show()
                        },
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Default.Sync, contentDescription = "Sync", tint = BrandEmeraldDark, modifier = Modifier.size(18.dp))
                }
            }
        }
    }

    // Optical Extraction & Visibility Audit Diagnostic Report Dialog
    auditReportDoc?.let { doc ->
        ScanAuditReportDialog(
            doc = doc,
            onDismiss = { viewModel.dismissAuditReport() },
            onProceedToReview = { viewModel.proceedFromAuditToReview() }
        )
    }
}
