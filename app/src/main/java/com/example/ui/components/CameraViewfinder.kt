package com.example.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.R
import com.example.ui.theme.*

@Composable
fun CameraViewfinder(
    isBatchMode: Boolean,
    batchCount: Int,
    onCaptureClick: () -> Unit,
    onGalleryClick: () -> Unit,
    onLoadSampleClick: () -> Unit
) {
    var isTorchOn by remember { mutableStateOf(false) }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(370.dp)
            .clip(RoundedCornerShape(18.dp))
            .background(Color(0xFF0F172A))
            .border(1.dp, HairlineBorder, RoundedCornerShape(18.dp))
            .testTag("camera_viewfinder")
    ) {
        // Clean dark viewfinder background
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFF0F172A))
        )

        // Center card with explicit 'Take picture or upload picture' prompt
        Column(
            modifier = Modifier
                .align(Alignment.Center)
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(CircleShape)
                    .background(Color(0x2210B981))
                    .border(1.5.dp, Color(0xFF10B981), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Outlined.CameraAlt,
                    contentDescription = null,
                    tint = Color(0xFF10B981),
                    modifier = Modifier.size(28.dp)
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = "Take picture or upload picture",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                fontSize = 17.sp,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Position KEFRI paper sheet inside reticle or select from gallery",
                style = MaterialTheme.typography.bodySmall,
                color = Color(0xFF94A3B8),
                fontSize = 12.sp,
                textAlign = TextAlign.Center
            )
        }

        // Ultra-crisp corner reticle guides (Emil Kowalski precision style)
        Canvas(modifier = Modifier.fillMaxSize()) {
            val padding = 34.dp.toPx()
            val bracketLen = 36.dp.toPx()
            val strokeW = 3.dp.toPx()
            val reticleColor = Color(0xFF10B981) // Crisp modern emerald

            val left = padding
            val top = padding + 12.dp.toPx()
            val right = size.width - padding
            val bottom = size.height - padding - 28.dp.toPx()

            // Top-Left bracket
            drawLine(reticleColor, Offset(left, top), Offset(left + bracketLen, top), strokeW, StrokeCap.Round)
            drawLine(reticleColor, Offset(left, top), Offset(left, top + bracketLen), strokeW, StrokeCap.Round)

            // Top-Right bracket
            drawLine(reticleColor, Offset(right, top), Offset(right - bracketLen, top), strokeW, StrokeCap.Round)
            drawLine(reticleColor, Offset(right, top), Offset(right, top + bracketLen), strokeW, StrokeCap.Round)

            // Bottom-Left bracket
            drawLine(reticleColor, Offset(left, bottom), Offset(left + bracketLen, bottom), strokeW, StrokeCap.Round)
            drawLine(reticleColor, Offset(left, bottom), Offset(left, bottom - bracketLen), strokeW, StrokeCap.Round)

            // Bottom-Right bracket
            drawLine(reticleColor, Offset(right, bottom), Offset(right - bracketLen, bottom), strokeW, StrokeCap.Round)
            drawLine(reticleColor, Offset(right, bottom), Offset(right, bottom - bracketLen), strokeW, StrokeCap.Round)

            // Subtle center grid crosshair for alignment
            val midX = (left + right) / 2f
            val midY = (top + bottom) / 2f
            val crosshairLen = 10.dp.toPx()
            drawLine(Color(0x6610B981), Offset(midX - crosshairLen, midY), Offset(midX + crosshairLen, midY), 1.5f, StrokeCap.Round)
            drawLine(Color(0x6610B981), Offset(midX, midY - crosshairLen), Offset(midX, midY + crosshairLen), 1.5f, StrokeCap.Round)
        }

        // Top Status Bar: Minimal pill & Torch toggle
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp)
                .align(Alignment.TopCenter),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                color = Color(0xCC0F172A),
                shape = RoundedCornerShape(20.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x33FFFFFF))
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(7.dp)
                            .clip(CircleShape)
                            .background(Color(0xFF10B981))
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = if (isBatchMode) "Batch • Page ${batchCount + 1}" else "Position paper inside reticle",
                        style = MaterialTheme.typography.labelSmall,
                        color = Color.White,
                        fontWeight = FontWeight.Medium,
                        fontSize = 11.sp
                    )
                }
            }

            // Torch Toggle
            IconButton(
                onClick = { isTorchOn = !isTorchOn },
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(if (isTorchOn) Color.White else Color(0x880F172A))
                    .border(1.dp, Color(0x33FFFFFF), CircleShape)
                    .testTag("torch_toggle_btn")
            ) {
                Icon(
                    imageVector = if (isTorchOn) Icons.Default.FlashOn else Icons.Default.FlashOff,
                    contentDescription = "Toggle Torch",
                    tint = if (isTorchOn) Color(0xFF0F172A) else Color.White,
                    modifier = Modifier.size(18.dp)
                )
            }
        }

        // Bottom Capture Controls Bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 16.dp)
                .align(Alignment.BottomCenter),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Gallery Picker
            IconButton(
                onClick = onGalleryClick,
                modifier = Modifier
                    .size(46.dp)
                    .clip(CircleShape)
                    .background(Color(0x990F172A))
                    .border(1.dp, Color(0x33FFFFFF), CircleShape)
                    .testTag("gallery_picker_btn")
            ) {
                Icon(
                    Icons.Outlined.PhotoLibrary,
                    contentDescription = "Pick from gallery",
                    tint = Color.White,
                    modifier = Modifier.size(20.dp)
                )
            }

            // Concentric Shutter Button
            Box(
                modifier = Modifier
                    .size(66.dp)
                    .clip(CircleShape)
                    .background(Color(0x44FFFFFF))
                    .clickable { onCaptureClick() }
                    .testTag("shutter_capture_btn"),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(54.dp)
                        .clip(CircleShape)
                        .background(Color.White)
                        .border(2.dp, Color(0xFFE2E8F0), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Box(
                        modifier = Modifier
                            .size(46.dp)
                            .clip(CircleShape)
                            .background(BrandEmerald)
                    )
                }
            }

            // Upload File / Gallery Button
            IconButton(
                onClick = onGalleryClick,
                modifier = Modifier
                    .size(46.dp)
                    .clip(CircleShape)
                    .background(Color(0x990F172A))
                    .border(1.dp, Color(0x33FFFFFF), CircleShape)
                    .testTag("upload_picture_btn")
            ) {
                Icon(
                    Icons.Outlined.UploadFile,
                    contentDescription = "Upload picture",
                    tint = Color(0xFF10B981),
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    }
}
