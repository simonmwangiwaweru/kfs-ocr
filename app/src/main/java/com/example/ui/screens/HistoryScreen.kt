package com.example.ui.screens

import android.widget.Toast
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
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.model.ScannedDocument
import com.example.ui.components.ExportDialog
import com.example.ui.theme.*
import com.example.viewmodel.InventoryViewModel

@Composable
fun HistoryScreen(
    viewModel: InventoryViewModel,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val documents by viewModel.documents.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val exportModalText by viewModel.exportModalText.collectAsState()

    var selectedFilterChip by remember { mutableStateOf("ALL") } // ALL, MT_KENYA, VERIFIED, REVIEW
    var selectedSubTab by remember { mutableStateOf("ALL") }     // TODAY, WEEK, ALL, REVIEW

    val activeDocForExport = remember { mutableStateOf<ScannedDocument?>(null) }

    val filteredDocs = documents.filter { doc ->
        val matchesSearch = doc.title.contains(searchQuery, ignoreCase = true) ||
                doc.forestStation.contains(searchQuery, ignoreCase = true) ||
                doc.plotCode.contains(searchQuery, ignoreCase = true)

        val matchesChip = when (selectedFilterChip) {
            "MT_KENYA" -> doc.forestStation.contains("Mt. Kenya", ignoreCase = true)
            "VERIFIED" -> doc.lowConfidenceCellsCount == 0
            "REVIEW" -> doc.lowConfidenceCellsCount > 0
            else -> true
        }

        matchesSearch && matchesChip
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(AppBackground)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 14.dp, vertical = 10.dp)
            .padding(bottom = 85.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        // Floating White Search Bar
        Surface(
            color = SurfaceCard,
            shape = RoundedCornerShape(16.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorderSubtle),
            shadowElevation = 1.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(Icons.Default.Search, contentDescription = null, tint = TextMuted, modifier = Modifier.size(20.dp))
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { viewModel.setSearchQuery(it) },
                    placeholder = { Text("Search station, compartment, plot...", fontSize = 12.sp, color = TextMuted) },
                    singleLine = true,
                    modifier = Modifier.weight(1f),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Color.Transparent,
                        unfocusedBorderColor = Color.Transparent,
                        focusedContainerColor = Color.Transparent,
                        unfocusedContainerColor = Color.Transparent
                    )
                )
                Icon(Icons.Outlined.Tune, contentDescription = "Tune", tint = TextMuted, modifier = Modifier.size(18.dp))
            }
        }

        // Horizontal Scrollable Filter Chips (Stitch code__1__ab29ff61.html)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            // All Stations Chip
            Surface(
                color = if (selectedFilterChip == "ALL") BrandEmerald else SurfaceCard,
                shape = RoundedCornerShape(9999.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, if (selectedFilterChip == "ALL") BrandEmerald else HairlineBorderSubtle),
                modifier = Modifier.clickable { selectedFilterChip = "ALL" }
            ) {
                Text(
                    text = "All Stations",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (selectedFilterChip == "ALL") Color.White else TextPrimary,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                )
            }

            // Mt Kenya Chip
            Surface(
                color = if (selectedFilterChip == "MT_KENYA") BrandEmeraldLight else SurfaceCard,
                shape = RoundedCornerShape(9999.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, if (selectedFilterChip == "MT_KENYA") BrandEmerald else HairlineBorderSubtle),
                modifier = Modifier.clickable { selectedFilterChip = "MT_KENYA" }
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(2.dp)
                ) {
                    Text(
                        text = "Mt. Kenya",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (selectedFilterChip == "MT_KENYA") BrandEmeraldDark else TextPrimary
                    )
                    Icon(Icons.Default.ExpandMore, contentDescription = null, tint = TextMuted, modifier = Modifier.size(14.dp))
                }
            }

            // Status: Verified Chip
            Surface(
                color = if (selectedFilterChip == "VERIFIED") VerifiedGreenBg else SurfaceCard,
                shape = RoundedCornerShape(9999.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, if (selectedFilterChip == "VERIFIED") VerifiedGreen else HairlineBorderSubtle),
                modifier = Modifier.clickable { selectedFilterChip = "VERIFIED" }
            ) {
                Text(
                    text = "Verified",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (selectedFilterChip == "VERIFIED") VerifiedGreen else VerifiedGreenText,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                )
            }

            // Needs Review Chip
            Surface(
                color = if (selectedFilterChip == "REVIEW") FlagAmberBg else SurfaceCard,
                shape = RoundedCornerShape(9999.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, if (selectedFilterChip == "REVIEW") FlagAmber else HairlineBorderSubtle),
                modifier = Modifier.clickable { selectedFilterChip = "REVIEW" }
            ) {
                Text(
                    text = "Needs Review",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = FlagAmber,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                )
            }
        }

        // Sub-Tabs Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .border(width = 0.5.dp, color = HairlineBorderSubtle)
                .padding(vertical = 4.dp, horizontal = 2.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            listOf(
                Triple("TODAY", "Today", null),
                Triple("WEEK", "This week", null),
                Triple("ALL", "All", null),
                Triple("REVIEW", "Needs Review", documents.count { it.lowConfidenceCellsCount > 0 })
            ).forEach { (key, label, count) ->
                val isSelected = selectedSubTab == key
                Row(
                    modifier = Modifier
                        .clickable { selectedSubTab = key }
                        .padding(vertical = 4.dp, horizontal = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(3.dp)
                ) {
                    Text(
                        text = label,
                        fontSize = 11.5.sp,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                        color = if (isSelected) BrandEmerald else TextSecondary
                    )
                    if (count != null && count > 0) {
                        Surface(color = FlagAmberBg, shape = CircleShape) {
                            Text(
                                text = "$count",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = FlagAmber,
                                modifier = Modifier.padding(horizontal = 5.dp, vertical = 1.dp)
                            )
                        }
                    }
                }
            }
        }

        // Header Stamp
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "VERIFIED FIELD APPRAISALS (${filteredDocs.size})",
                fontSize = 11.sp,
                fontFamily = FontFamily.Monospace,
                fontWeight = FontWeight.Bold,
                color = TextMuted
            )
            Text(
                text = "Kenya Forest Service • KEFRI",
                fontSize = 10.sp,
                fontFamily = FontFamily.Monospace,
                color = TextMuted
            )
        }

        // Document Cards List or Clean Empty State
        if (filteredDocs.isEmpty()) {
            Surface(
                color = SurfaceCard,
                shape = RoundedCornerShape(20.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorderSubtle),
                shadowElevation = 1.dp,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 12.dp)
            ) {
                Column(
                    modifier = Modifier.padding(28.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(64.dp)
                            .clip(CircleShape)
                            .background(BrandEmeraldLight),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Outlined.FolderOpen,
                            contentDescription = null,
                            tint = BrandEmerald,
                            modifier = Modifier.size(32.dp)
                        )
                    }

                    Text(
                        text = if (searchQuery.isNotBlank()) "No Matching Records" else "No Scanned Documents",
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )

                    Text(
                        text = if (searchQuery.isNotBlank())
                            "No field tallies match '$searchQuery'. Try adjusting your search term or station filter."
                        else
                            "Your archive is completely clear. When you capture or upload paper Form AGW-85-01 tallies with the scanner, your verified forest records will appear here.",
                        fontSize = 12.sp,
                        color = TextSecondary,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                        lineHeight = 17.sp
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    Button(
                        onClick = { viewModel.selectTab(0) }, // Open scanner
                        colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.height(44.dp)
                    ) {
                        Icon(Icons.Default.DocumentScanner, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Scan First Tally Sheet", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                filteredDocs.forEach { doc ->
                val isVerified = doc.lowConfidenceCellsCount == 0

                Surface(
                    color = SurfaceCard,
                    shape = RoundedCornerShape(16.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorderSubtle),
                    shadowElevation = 2.dp,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { viewModel.openDocumentForReview(doc.id) }
                ) {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.Top
                        ) {
                            Row(
                                verticalAlignment = Alignment.Top,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(38.dp)
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(SecondaryFixed.copy(alpha = 0.5f))
                                        .border(1.dp, SecondaryContainer, RoundedCornerShape(10.dp)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        Icons.Default.Folder,
                                        contentDescription = null,
                                        tint = BrandEmerald,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                                Column {
                                    Text(
                                        text = doc.title,
                                        fontSize = 14.5.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = TextPrimary
                                    )
                                    Text(
                                        text = "${doc.rows.size * 19} trees • 25.10.2026 • Form AGW-85-01",
                                        fontSize = 11.sp,
                                        fontFamily = FontFamily.Monospace,
                                        color = TextMuted,
                                        modifier = Modifier.padding(top = 2.dp)
                                    )
                                }
                            }

                            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = TextMuted, modifier = Modifier.size(18.dp))
                        }

                        Divider(color = HairlineBorderSubtle)

                        // Badges & Quick Action Tags Footer
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            if (isVerified) {
                                Surface(
                                    color = VerifiedGreenBg,
                                    shape = RoundedCornerShape(9999.dp),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, VerifiedGreenBorder)
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(3.dp),
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                                    ) {
                                        Icon(Icons.Default.CheckCircle, contentDescription = null, tint = VerifiedGreen, modifier = Modifier.size(12.dp))
                                        Text(text = "Verified", fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = VerifiedGreen)
                                    }
                                }
                            } else {
                                Surface(
                                    color = FlagAmberBg,
                                    shape = RoundedCornerShape(9999.dp),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, FlagAmberBorder)
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(3.dp),
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                                    ) {
                                        Box(modifier = Modifier.size(5.dp).clip(CircleShape).background(FlagAmber))
                                        Text(text = "${doc.lowConfidenceCellsCount} Need Review", fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = FlagAmber)
                                    }
                                }
                            }

                            // Quick Export Buttons: TXT, Word, XLSX, CSV, Delete
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Text(text = "EXPORT:", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = TextMuted)
                                Surface(
                                    color = SurfaceSubtle,
                                    shape = RoundedCornerShape(4.dp),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorderSubtle),
                                    modifier = Modifier.clickable {
                                        activeDocForExport.value = doc
                                        viewModel.prepareCsvExport(doc)
                                    }
                                ) {
                                    Text(text = "TXT", fontSize = 10.sp, fontFamily = FontFamily.Monospace, color = FlagAmberText, modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp))
                                }
                                Surface(
                                    color = SurfaceSubtle,
                                    shape = RoundedCornerShape(4.dp),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorderSubtle),
                                    modifier = Modifier.clickable {
                                        activeDocForExport.value = doc
                                        viewModel.prepareCsvExport(doc)
                                    }
                                ) {
                                    Text(text = "Word", fontSize = 10.sp, fontFamily = FontFamily.Monospace, color = Color(0xFF1D4ED8), modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp))
                                }
                                Surface(
                                    color = SurfaceSubtle,
                                    shape = RoundedCornerShape(4.dp),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorderSubtle),
                                    modifier = Modifier.clickable {
                                        activeDocForExport.value = doc
                                        viewModel.prepareCsvExport(doc)
                                    }
                                ) {
                                    Text(text = "XLSX", fontSize = 10.sp, fontFamily = FontFamily.Monospace, color = BrandEmerald, modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp))
                                }
                                Icon(
                                    Icons.Default.Delete,
                                    contentDescription = "Delete",
                                    tint = ErrorRed,
                                    modifier = Modifier
                                        .size(16.dp)
                                        .clickable {
                                            viewModel.deleteDocument(doc.id)
                                            Toast.makeText(context, "Deleted record ${doc.title}", Toast.LENGTH_SHORT).show()
                                        }
                                )
                            }
                        }
                    }
                }
            }
        }
        }

        // Storage & Sync Status Banner
        Surface(
            color = SurfaceSubtle,
            shape = RoundedCornerShape(12.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorderSubtle),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(10.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Icon(Icons.Default.VerifiedUser, contentDescription = null, tint = BrandEmerald, modifier = Modifier.size(16.dp))
                    Text(text = "KEFRI Biometrics Standard v2.4 Active", fontSize = 11.sp, color = TextSecondary)
                }
                Text(text = "1.4 GB Free", fontSize = 11.sp, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold, color = TextMuted)
            }
        }
    }

    if (exportModalText != null && activeDocForExport.value != null) {
        val doc = activeDocForExport.value!!
        ExportDialog(
            csvContent = exportModalText!!,
            notepadContent = viewModel.prepareNotepadExport(doc),
            onDismiss = {
                activeDocForExport.value = null
                viewModel.clearExportModal()
            }
        )
    }
}
