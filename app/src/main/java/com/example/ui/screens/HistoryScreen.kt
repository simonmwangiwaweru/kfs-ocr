package com.example.ui.screens

import android.text.format.DateFormat
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.model.ScannedDocument
import com.example.model.SyncStatus
import com.example.ui.components.ExportDialog
import com.example.ui.theme.*
import com.example.viewmodel.InventoryViewModel
import java.util.Date

@Composable
fun HistoryScreen(
    viewModel: InventoryViewModel,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val documents by viewModel.documents.collectAsState()
    val isOffline by viewModel.isOffline.collectAsState()
    val isSyncing by viewModel.isSyncing.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val historyFilter by viewModel.historyFilter.collectAsState()
    val exportModalText by viewModel.exportModalText.collectAsState()

    val filteredDocs = documents.filter { doc ->
        val matchesSearch = doc.title.contains(searchQuery, ignoreCase = true) ||
                doc.plotCode.contains(searchQuery, ignoreCase = true) ||
                doc.forestStation.contains(searchQuery, ignoreCase = true) ||
                doc.observerName.contains(searchQuery, ignoreCase = true)

        val matchesFilter = when (historyFilter) {
            "NEEDS_REVIEW" -> !doc.isVerified || doc.totalUncertainCells > 0
            "VERIFIED" -> doc.isVerified
            "OFFLINE" -> doc.syncStatus == SyncStatus.SAVED_OFFLINE
            else -> true
        }
        matchesSearch && matchesFilter
    }

    Column(modifier = modifier.fillMaxSize()) {
        // Top Header
        Surface(
            color = Color.White,
            modifier = Modifier
                .fillMaxWidth()
                .border(width = 1.dp, color = HairlineBorder)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 16.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Outlined.Folder, contentDescription = null, tint = BrandEmerald, modifier = Modifier.size(20.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Document Archive",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                }
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "Historical Forest Inventory Surveys & Scans",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Search Bar
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { viewModel.setSearchQuery(it) },
                    placeholder = { Text("Search by Plot ID, station, or technician...", fontSize = 13.sp, color = TextMuted) },
                    leadingIcon = { Icon(Icons.Outlined.Search, contentDescription = null, tint = TextSecondary, modifier = Modifier.size(18.dp)) },
                    trailingIcon = {
                        if (searchQuery.isNotBlank()) {
                            IconButton(onClick = { viewModel.setSearchQuery("") }) {
                                Icon(Icons.Default.Clear, contentDescription = "Clear search", tint = TextSecondary, modifier = Modifier.size(16.dp))
                            }
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("search_history_input"),
                    singleLine = true,
                    shape = RoundedCornerShape(10.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = SurfaceCard,
                        unfocusedContainerColor = SurfaceSubtle,
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary,
                        focusedBorderColor = BrandEmerald,
                        unfocusedBorderColor = HairlineBorder
                    )
                )
            }
        }

        // Offline / Auto-Sync Status Banner
        Surface(
            color = if (isOffline) FlagAmberBg else SurfaceCard,
            border = androidx.compose.foundation.BorderStroke(
                1.dp,
                if (isOffline) FlagAmberBorder else HairlineBorder
            ),
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            shape = RoundedCornerShape(12.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    modifier = Modifier.weight(1f),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(if (isOffline) FlagAmber else BrandEmerald)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text(
                            text = if (isOffline) "Offline Field Mode" else "Cloud Sync Connected",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = if (isOffline) FlagAmberText else TextPrimary
                        )
                        Text(
                            text = if (isOffline) {
                                "Scans saved locally; auto-syncs when online"
                            } else {
                                "All field records synced to KEFRI database"
                            },
                            style = MaterialTheme.typography.bodySmall,
                            fontSize = 11.sp,
                            color = TextSecondary
                        )
                    }
                }

                FilledTonalButton(
                    onClick = {
                        if (isOffline) {
                            viewModel.toggleOffline()
                            Toast.makeText(context, "Reconnected to network", Toast.LENGTH_SHORT).show()
                        }
                        viewModel.syncAll()
                    },
                    enabled = !isSyncing,
                    colors = ButtonDefaults.filledTonalButtonColors(
                        containerColor = if (isOffline) FlagAmber else BrandEmeraldLight,
                        contentColor = if (isOffline) Color.White else BrandEmeraldDark
                    ),
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                    modifier = Modifier.testTag("sync_now_btn")
                ) {
                    if (isSyncing) {
                        CircularProgressIndicator(modifier = Modifier.size(13.dp), strokeWidth = 2.dp, color = BrandEmerald)
                        Spacer(modifier = Modifier.width(5.dp))
                        Text("Syncing...", fontSize = 11.sp)
                    } else {
                        Icon(Icons.Default.Sync, contentDescription = null, modifier = Modifier.size(13.dp))
                        Spacer(modifier = Modifier.width(5.dp))
                        Text("Sync Now", fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }

        // Filter Chips Bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            HistoryFilterChip(
                label = "All (${documents.size})",
                isSelected = historyFilter == "ALL",
                onClick = { viewModel.setHistoryFilter("ALL") }
            )
            HistoryFilterChip(
                label = "Needs Review",
                isSelected = historyFilter == "NEEDS_REVIEW",
                onClick = { viewModel.setHistoryFilter("NEEDS_REVIEW") }
            )
            HistoryFilterChip(
                label = "Verified",
                isSelected = historyFilter == "VERIFIED",
                onClick = { viewModel.setHistoryFilter("VERIFIED") }
            )
            HistoryFilterChip(
                label = "Offline",
                isSelected = historyFilter == "OFFLINE",
                onClick = { viewModel.setHistoryFilter("OFFLINE") }
            )
        }

        // Document List
        if (filteredDocs.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        Icons.Outlined.FolderOpen,
                        contentDescription = null,
                        tint = TextMuted,
                        modifier = Modifier.size(44.dp)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "No matching documents",
                        style = MaterialTheme.typography.titleSmall,
                        color = TextPrimary
                    )
                    Text(
                        text = "Adjust your search query or scan a new inventory form.",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                contentPadding = PaddingValues(vertical = 6.dp)
            ) {
                items(filteredDocs, key = { it.id }) { doc ->
                    DocumentHistoryCard(
                        doc = doc,
                        onOpenReview = { viewModel.openDocumentForReview(doc.id) },
                        onExport = { viewModel.prepareCsvExport(doc) }
                    )
                }
            }
        }
    }

    // Export Dialog preview
    exportModalText?.let { csv ->
        ExportDialog(
            csvContent = csv,
            onDismiss = { viewModel.clearExportModal() }
        )
    }
}

@Composable
fun HistoryFilterChip(
    label: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Surface(
        color = if (isSelected) BrandEmeraldLight else SurfaceCard,
        shape = RoundedCornerShape(8.dp),
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (isSelected) BrandEmeraldBorder else HairlineBorder
        ),
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .clickable { onClick() }
    ) {
        Text(
            text = label,
            fontSize = 11.sp,
            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Medium,
            color = if (isSelected) BrandEmeraldDark else TextSecondary,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
        )
    }
}

@Composable
fun DocumentHistoryCard(
    doc: ScannedDocument,
    onOpenReview: () -> Unit,
    onExport: () -> Unit
) {
    val dateStr = DateFormat.format("dd MMM yyyy, HH:mm", Date(doc.scanDateMillis)).toString()
    val sizeMb = String.format("%.1f MB", doc.fileSizeBytes / (1024.0 * 1024.0))

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .clickable { onOpenReview() }
            .testTag("doc_card_${doc.id}"),
        color = SurfaceCard,
        border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorder),
        shadowElevation = 1.dp
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = doc.title,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "Plot: ${doc.plotCode} • ${doc.forestStation}",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary
                    )
                }

                if (doc.isVerified) {
                    Surface(
                        color = BrandEmeraldLight,
                        shape = RoundedCornerShape(12.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, BrandEmeraldBorder)
                    ) {
                        Text(
                            text = "Verified",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = BrandEmeraldDark,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                        )
                    }
                } else if (doc.totalUncertainCells > 0) {
                    Surface(
                        color = FlagAmberBg,
                        shape = RoundedCornerShape(12.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, FlagAmberBorder)
                    ) {
                        Text(
                            text = "${doc.totalUncertainCells} Flagged",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = FlagAmberText,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    MetadataChip(Icons.Outlined.InsertDriveFile, doc.fileType)
                    MetadataChip(Icons.Outlined.SdCard, sizeMb)
                    MetadataChip(Icons.Outlined.Schedule, dateStr)
                }

                IconButton(
                    onClick = onExport,
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        Icons.Outlined.Download,
                        contentDescription = "Export CSV",
                        tint = TextSecondary,
                        modifier = Modifier.size(17.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun MetadataChip(icon: androidx.compose.ui.graphics.vector.ImageVector, text: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(
            icon,
            contentDescription = null,
            tint = TextMuted,
            modifier = Modifier.size(13.dp)
        )
        Spacer(modifier = Modifier.width(4.dp))
        Text(
            text = text,
            fontSize = 11.sp,
            color = TextSecondary
        )
    }
}
