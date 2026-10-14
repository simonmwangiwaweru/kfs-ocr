package com.example.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.model.ScanMode
import com.example.ui.components.CameraViewfinder
import com.example.ui.theme.*
import com.example.viewmodel.InventoryViewModel

@Composable
fun ScanScreen(
    viewModel: InventoryViewModel,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scanMode by viewModel.scanMode.collectAsState()
    val batchQueue by viewModel.batchQueue.collectAsState()
    val isOffline by viewModel.isOffline.collectAsState()

    var plotCodeInput by remember { mutableStateOf("KFR/A2") }
    var stationInput by remember { mutableStateOf("Aberdare Forest Reserve") }
    var observerInput by remember { mutableStateOf("M. Musyoka") }

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(bottom = 24.dp)
    ) {
        // Top Header — Minimalist High-Craft White Surface with Hairline Border
        Surface(
            color = Color.White,
            modifier = Modifier
                .fillMaxWidth()
                .border(width = 1.dp, color = HairlineBorder)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 18.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(28.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(BrandEmeraldLight),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    Icons.Default.Park,
                                    contentDescription = null,
                                    tint = BrandEmerald,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "KFS Inventory Scan",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                        }
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = "Kenya Forestry Research Institute (KEFRI)",
                            style = MaterialTheme.typography.bodySmall,
                            color = TextSecondary
                        )
                    }

                    // Network Sync Pill Button
                    Surface(
                        color = if (isOffline) FlagAmberBg else BrandEmeraldLight,
                        shape = RoundedCornerShape(20.dp),
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            if (isOffline) FlagAmberBorder else BrandEmeraldBorder
                        ),
                        modifier = Modifier
                            .clickable { viewModel.toggleOffline() }
                            .testTag("toggle_offline_chip")
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = if (isOffline) Icons.Default.CloudOff else Icons.Default.CloudDone,
                                contentDescription = null,
                                tint = if (isOffline) FlagAmberText else BrandEmerald,
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = if (isOffline) "Offline" else "Synced",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = if (isOffline) FlagAmberText else BrandEmerald
                            )
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Segmented Pill Mode Selector (Emil Kowalski Apple/Linear style)
        Surface(
            color = SurfaceSubtle,
            shape = RoundedCornerShape(12.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorder),
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(3.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                SegmentedTab(
                    title = "Single Page",
                    subtitle = "Instant OCR",
                    icon = Icons.Outlined.DocumentScanner,
                    isSelected = scanMode == ScanMode.SINGLE_PAGE,
                    onClick = { viewModel.setScanMode(ScanMode.SINGLE_PAGE) },
                    modifier = Modifier.weight(1f)
                )
                SegmentedTab(
                    title = "Batch",
                    subtitle = "${batchQueue.size} Queued",
                    icon = Icons.Outlined.Collections,
                    isSelected = scanMode == ScanMode.BATCH_PAGES,
                    onClick = { viewModel.setScanMode(ScanMode.BATCH_PAGES) },
                    modifier = Modifier.weight(1f)
                )
                SegmentedTab(
                    title = "Pending",
                    subtitle = if (isOffline) "Active" else "Empty",
                    icon = Icons.Outlined.Inbox,
                    isSelected = scanMode == ScanMode.PENDING_QUEUE,
                    onClick = {
                        viewModel.setScanMode(ScanMode.PENDING_QUEUE)
                        viewModel.selectTab(2)
                    },
                    modifier = Modifier.weight(1f)
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Camera Viewfinder Box
        Box(modifier = Modifier.padding(horizontal = 16.dp)) {
            CameraViewfinder(
                isBatchMode = scanMode == ScanMode.BATCH_PAGES,
                batchCount = batchQueue.size,
                onCaptureClick = {
                    if (scanMode == ScanMode.BATCH_PAGES) {
                        viewModel.addPageToBatch(null)
                        Toast.makeText(context, "Page ${batchQueue.size + 1} added to batch", Toast.LENGTH_SHORT).show()
                    } else {
                        viewModel.captureSinglePage(plotCodeInput, stationInput, observerInput)
                        Toast.makeText(context, "Form captured & transcribed", Toast.LENGTH_SHORT).show()
                    }
                },
                onGalleryClick = {
                    viewModel.captureSinglePage(plotCodeInput, stationInput, observerInput)
                    Toast.makeText(context, "Loaded photo from gallery", Toast.LENGTH_SHORT).show()
                },
                onLoadSampleClick = {
                    viewModel.captureSinglePage("KFR/A2", "Aberdare Forest Reserve", "M. Musyoka")
                    Toast.makeText(context, "Loaded sample Aberdare inventory form", Toast.LENGTH_SHORT).show()
                }
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Batch Queue Management Bar
        if (scanMode == ScanMode.BATCH_PAGES) {
            Surface(
                color = SurfaceCard,
                shape = RoundedCornerShape(14.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorder),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = "Batch Session",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Badge(containerColor = BrandEmerald, contentColor = Color.White) {
                                Text("${batchQueue.size}", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                        if (batchQueue.isNotEmpty()) {
                            TextButton(
                                onClick = { viewModel.clearBatch() },
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                            ) {
                                Text("Clear", color = ErrorRed, fontSize = 12.sp)
                            }
                        }
                    }

                    if (batchQueue.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(10.dp))
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(batchQueue) { item ->
                                Surface(
                                    color = SurfaceSubtle,
                                    shape = RoundedCornerShape(8.dp),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorder),
                                    modifier = Modifier.padding(1.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Icon(Icons.Default.Photo, contentDescription = null, tint = BrandEmerald, modifier = Modifier.size(14.dp))
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text("Page ${item.pageNumber}", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        Button(
                            onClick = {
                                viewModel.processBatch(plotCodeInput, stationInput, observerInput)
                                Toast.makeText(context, "Extracting entire batch...", Toast.LENGTH_SHORT).show()
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("process_batch_btn"),
                            colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Icon(Icons.Default.AutoFixHigh, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Process All ${batchQueue.size} Pages", fontWeight = FontWeight.SemiBold)
                        }
                    } else {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Tap the camera shutter to capture multiple pages sequentially. They will be digitized together in one session.",
                            style = MaterialTheme.typography.bodySmall,
                            color = TextSecondary
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }

        // Plot Metadata Form Card
        Surface(
            color = SurfaceCard,
            shape = RoundedCornerShape(14.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorder),
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
        ) {
            Column(modifier = Modifier.padding(18.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Outlined.EditCalendar, contentDescription = null, tint = BrandEmerald, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Plot Survey Details",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                }

                Spacer(modifier = Modifier.height(14.dp))

                OutlinedTextField(
                    value = plotCodeInput,
                    onValueChange = { plotCodeInput = it },
                    label = { Text("Plot Code / Transect") },
                    placeholder = { Text("e.g. KFR/A2") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("plot_code_input"),
                    singleLine = true,
                    shape = RoundedCornerShape(10.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = BrandEmerald,
                        unfocusedBorderColor = HairlineBorder,
                        focusedLabelColor = BrandEmerald,
                        unfocusedLabelColor = TextSecondary
                    )
                )

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = stationInput,
                    onValueChange = { stationInput = it },
                    label = { Text("Forest Station / Location") },
                    placeholder = { Text("e.g. Aberdare Forest Reserve") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    shape = RoundedCornerShape(10.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = BrandEmerald,
                        unfocusedBorderColor = HairlineBorder,
                        focusedLabelColor = BrandEmerald,
                        unfocusedLabelColor = TextSecondary
                    )
                )

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = observerInput,
                    onValueChange = { observerInput = it },
                    label = { Text("Observer / Field Technician") },
                    placeholder = { Text("e.g. M. Musyoka") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    shape = RoundedCornerShape(10.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = BrandEmerald,
                        unfocusedBorderColor = HairlineBorder,
                        focusedLabelColor = BrandEmerald,
                        unfocusedLabelColor = TextSecondary
                    )
                )
            }
        }
    }
}

@Composable
fun SegmentedTab(
    title: String,
    subtitle: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        color = if (isSelected) Color.White else Color.Transparent,
        shape = RoundedCornerShape(9.dp),
        border = if (isSelected) androidx.compose.foundation.BorderStroke(1.dp, HairlineBorder) else null,
        shadowElevation = if (isSelected) 1.dp else 0.dp,
        modifier = modifier
            .clip(RoundedCornerShape(9.dp))
            .clickable { onClick() }
            .testTag("mode_${title.lowercase().replace(" ", "_")}")
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 9.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = if (isSelected) BrandEmerald else TextSecondary,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.height(3.dp))
            Text(
                text = title,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                color = if (isSelected) TextPrimary else TextSecondary
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                fontSize = 10.sp,
                color = if (isSelected) BrandEmerald else TextMuted
            )
        }
    }
}
