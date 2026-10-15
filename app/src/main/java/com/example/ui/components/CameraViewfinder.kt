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
            .background(Color.White)
            .border(1.dp, HairlineBorder, RoundedCornerShape(18.dp))
            .testTag("camera_viewfinder")
    ) {
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
                    .background(BrandEmeraldLight)
                    .border(1.5.dp, BrandEmerald, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Outlined.CameraAlt,
                    contentDescription = null,
                    tint = BrandEmerald,
                    modifier = Modifier.size(28.dp)
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = "Take picture or upload picture",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = TextPrimary,
                fontSize = 17.sp,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Point camera at forestry paper sheet or select from gallery",
                style = MaterialTheme.typography.bodySmall,
                color = TextSecondary,
                fontSize = 12.sp,
                textAlign = TextAlign.Center
            )
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
                color = SurfaceSubtle,
                shape = RoundedCornerShape(20.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorder)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(7.dp)
                            .clip(CircleShape)
                            .background(BrandEmerald)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = if (isBatchMode) "Batch • Page ${batchCount + 1}" else "Position paper inside view",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextSecondary,
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
                    .background(if (isTorchOn) BrandEmeraldLight else SurfaceSubtle)
                    .border(1.dp, HairlineBorder, CircleShape)
                    .testTag("torch_toggle_btn")
            ) {
                Icon(
                    imageVector = if (isTorchOn) Icons.Default.FlashOn else Icons.Default.FlashOff,
                    contentDescription = "Toggle Torch",
                    tint = if (isTorchOn) BrandEmerald else TextSecondary,
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
                    .background(SurfaceSubtle)
                    .border(1.dp, HairlineBorder, CircleShape)
                    .testTag("gallery_picker_btn")
            ) {
                Icon(
                    Icons.Outlined.PhotoLibrary,
                    contentDescription = "Pick from gallery",
                    tint = TextPrimary,
                    modifier = Modifier.size(20.dp)
                )
            }

            // Concentric Shutter Button
            Box(
                modifier = Modifier
                    .size(66.dp)
                    .clip(CircleShape)
                    .background(BrandEmeraldLight)
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
                    .background(BrandEmeraldLight)
                    .border(1.dp, HairlineBorder, CircleShape)
                    .testTag("upload_picture_btn")
            ) {
                Icon(
                    Icons.Outlined.UploadFile,
                    contentDescription = "Upload picture",
                    tint = BrandEmerald,
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    }
}
