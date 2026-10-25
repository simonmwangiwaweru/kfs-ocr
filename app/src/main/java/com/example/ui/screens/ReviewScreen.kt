package com.example.ui.screens

import android.widget.Toast
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.R
import com.example.model.MatrixCell
import com.example.ui.components.CellInspectorDialog
import com.example.ui.components.ExportDialog
import com.example.ui.components.ScanAuditReportDialog
import com.example.ui.theme.*
import com.example.viewmodel.InventoryViewModel

@Composable
fun ReviewScreen(
    viewModel: InventoryViewModel,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val documents by viewModel.documents.collectAsState()
    val activeDocId by viewModel.activeDocumentId.collectAsState()
    val selectedCellTarget by viewModel.selectedCell.collectAsState()
    val exportModalText by viewModel.exportModalText.collectAsState()

    val currentDoc = documents.find { it.id == activeDocId } ?: documents.firstOrNull()

    var showAuditReportModal by remember { mutableStateOf(false) }

    if (currentDoc == null) {
        Column(
            modifier = modifier
                .fillMaxSize()
                .background(AppBackground)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Surface(
                color = SurfaceCard,
                shape = RoundedCornerShape(20.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorderSubtle),
                shadowElevation = 1.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(28.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(64.dp)
                            .clip(CircleShape)
                            .background(BrandEmeraldLight),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Outlined.DocumentScanner,
                            contentDescription = null,
                            tint = BrandEmerald,
                            modifier = Modifier.size(32.dp)
                        )
                    }
                    Text("No Active Survey Selected", fontSize = 17.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    Text(
                        "You have not scanned or selected a field tally form yet. Tap below to capture a paper sheet with the camera.",
                        fontSize = 12.sp,
                        color = TextSecondary,
                        textAlign = TextAlign.Center,
                        lineHeight = 17.sp
                    )
                    Button(
                        onClick = { viewModel.selectTab(0) },
                        colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.height(44.dp)
                    ) {
                        Icon(Icons.Default.DocumentScanner, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Open Field Scanner", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
        return
    }

    var previewMode by remember { mutableStateOf("dual") } // "dual", "dbh", "height", "photo"
    var showOnlyFlagged by remember { mutableStateOf(false) }

    val allCells = remember(currentDoc) {
        currentDoc.rows.flatMap { row ->
            row.cells.map { cell -> Pair(row.rowNumber, cell) }
        }
    }

    val totalStems = allCells.size
    val flaggedCells = remember(allCells) { allCells.filter { it.second.isUncertain && !it.second.isVerified } }
    val verifiedCount = totalStems - flaggedCells.size

    val displayedStems = if (showOnlyFlagged) flaggedCells else allCells

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(AppBackground)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 14.dp, vertical = 10.dp)
            .padding(bottom = 90.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // TOP HEADER: Back button + Title
        Surface(
            color = SurfaceCard,
            shape = RoundedCornerShape(18.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorderSubtle),
            shadowElevation = 1.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        IconButton(
                            onClick = { viewModel.selectTab(2) }, // Return to Archive
                            modifier = Modifier.size(34.dp)
                        ) {
                            Icon(Icons.Default.ArrowBack, contentDescription = "Back to Archive", tint = TextPrimary)
                        }
                        Column {
                            Text(text = "Field Inventory Appraisal", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                            Text(text = "FORM AGW-85-01 • ${currentDoc.plotCode}", fontSize = 10.sp, fontFamily = FontFamily.Monospace, color = TextMuted)
                        }
                    }

                    // Quick Audit Report Button
                    if (currentDoc.hasUnclearNumbers) {
                        Surface(
                            color = FlagAmberBg,
                            shape = RoundedCornerShape(9999.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, FlagAmberBorder),
                            modifier = Modifier.clickable { showAuditReportModal = true }
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Box(modifier = Modifier.size(6.dp).clip(CircleShape).background(FlagAmber))
                                Text(text = "${currentDoc.visibilityIssues.size} Issues", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = FlagAmberText)
                            }
                        }
                    }
                }

                // Segmented View Selector: Dual / DBH (Blue) / Height (Red) / Photo
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    listOf(
                        Pair("dual", "Dual (Both)"),
                        Pair("dbh", "DBH (Blue)"),
                        Pair("height", "Height (Red)"),
                        Pair("photo", "Photo")
                    ).forEach { (mode, label) ->
                        val isSelected = previewMode == mode
                        Surface(
                            color = if (isSelected) BrandEmerald else SurfaceSubtle,
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier
                                .weight(1f)
                                .clickable { previewMode = mode }
                        ) {
                            Text(
                                text = label,
                                fontSize = 10.5.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                color = if (isSelected) Color.White else TextPrimary,
                                textAlign = TextAlign.Center,
                                modifier = Modifier.padding(vertical = 6.dp)
                            )
                        }
                    }
                }
            }
        }

        // OPTICAL VISIBILITY ALERT NOTICE (If numbers were not visible / faint)
        if (currentDoc.hasUnclearNumbers) {
            Surface(
                color = FlagAmberBg,
                shape = RoundedCornerShape(14.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, FlagAmberBorder),
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { showAuditReportModal = true }
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        modifier = Modifier.weight(1f),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Default.WarningAmber, contentDescription = null, tint = FlagAmber, modifier = Modifier.size(20.dp))
                        Column {
                            Text(text = "Optical Notice: ${currentDoc.visibilityIssues.size} Numbers Were Faint or Creased", fontSize = 11.5.sp, fontWeight = FontWeight.Bold, color = FlagAmberText)
                            Text(text = "Tap to review itemized cell specifications and reasons", fontSize = 10.5.sp, color = TextSecondary)
                        }
                    }
                    Icon(Icons.Default.ChevronRight, contentDescription = null, tint = FlagAmberText)
                }
            }
        }

        // PHOTO VIEW (If active)
        if (previewMode == "photo") {
            Surface(
                color = SurfaceCard,
                shape = RoundedCornerShape(18.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorderSubtle),
                shadowElevation = 2.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(text = "Original Physical Tally Sheet Scan", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = BrandEmerald)
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(280.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color.Black)
                    ) {
                        Image(
                            painter = painterResource(id = R.drawable.sample_field_form),
                            contentDescription = "Original Form Scan",
                            contentScale = ContentScale.Fit,
                            modifier = Modifier.fillMaxSize()
                        )
                    }
                }
            }
        }

        // PLOT METADATA CARD (Matching Chuka Forest Station Form AGW-85-01)
        Surface(
            color = SurfaceCard,
            shape = RoundedCornerShape(18.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorderSubtle),
            shadowElevation = 2.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Icon(Icons.Default.Nature, contentDescription = null, tint = BrandEmerald, modifier = Modifier.size(18.dp))
                        Text(
                            text = "FOREST INVENTORY SPECIFICATIONS",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = BrandEmerald,
                            letterSpacing = 0.5.sp
                        )
                    }
                    Surface(color = SurfaceContainer, shape = RoundedCornerShape(4.dp)) {
                        val dateStr = java.text.SimpleDateFormat("dd.MM.yyyy", java.util.Locale.getDefault()).format(java.util.Date(currentDoc.scanDateMillis))
                        Text(text = dateStr, fontSize = 10.sp, fontFamily = FontFamily.Monospace, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp), color = TextSecondary)
                    }
                }

                // 2-Column Metadata Grid
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Surface(color = SurfaceSubtle, shape = RoundedCornerShape(8.dp), modifier = Modifier.weight(1f)) {
                            Column(modifier = Modifier.padding(8.dp)) {
                                Text(text = "STATION", fontSize = 9.sp, fontWeight = FontWeight.Medium, color = TextMuted)
                                Text(text = currentDoc.forestStation, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                            }
                        }
                        Surface(color = SurfaceSubtle, shape = RoundedCornerShape(8.dp), modifier = Modifier.weight(1f)) {
                            Column(modifier = Modifier.padding(8.dp)) {
                                Text(text = "COMPARTMENT", fontSize = 9.sp, fontWeight = FontWeight.Medium, color = TextMuted)
                                Text(text = currentDoc.plotCode, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                            }
                        }
                    }

                    Surface(color = SurfaceSubtle, shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(8.dp)) {
                            Text(text = "SPECIES TAXON", fontSize = 9.sp, fontWeight = FontWeight.Medium, color = TextMuted)
                            Text(text = currentDoc.speciesTaxon, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = BrandEmerald)
                        }
                    }

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Surface(color = SurfaceSubtle, shape = RoundedCornerShape(8.dp), modifier = Modifier.weight(1f)) {
                            Column(modifier = Modifier.padding(8.dp)) {
                                Text(text = "PLANTING YEAR", fontSize = 9.sp, fontWeight = FontWeight.Medium, color = TextMuted)
                                Text(text = "${currentDoc.plantingYear} (Age ${currentDoc.age})", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                            }
                        }
                        Surface(color = SurfaceSubtle, shape = RoundedCornerShape(8.dp), modifier = Modifier.weight(1f)) {
                            Column(modifier = Modifier.padding(8.dp)) {
                                Text(text = "MEASURING OFFICER", fontSize = 9.sp, fontWeight = FontWeight.Medium, color = TextMuted)
                                Text(text = currentDoc.observerName, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                            }
                        }
                    }
                }
            }
        }

        // STEM MEASUREMENTS LIST (DUAL BLUE DBH + RED HEIGHT)
        Surface(
            color = SurfaceCard,
            shape = RoundedCornerShape(18.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorderSubtle),
            shadowElevation = 2.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(text = "Tree Stem Records", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        Text(text = "Blue = DBH (cm)  •  Red = Height (m)", fontSize = 10.5.sp, color = TextSecondary)
                    }

                    FilterChip(
                        selected = showOnlyFlagged,
                        onClick = { showOnlyFlagged = !showOnlyFlagged },
                        label = { Text(if (showOnlyFlagged) "All Stems" else "Unclear Only", fontSize = 11.sp) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = FlagAmberBg,
                            selectedLabelColor = FlagAmberText
                        )
                    )
                }

                Divider(color = HairlineBorderSubtle)

                // Stem List Items
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    displayedStems.take(25).forEachIndexed { index, (rowNum, cell) ->
                        val isLow = cell.isUncertain && !cell.isVerified

                        Surface(
                            color = if (isLow) FlagAmberBg.copy(alpha = 0.5f) else SurfaceSubtle,
                            shape = RoundedCornerShape(10.dp),
                            border = if (isLow) androidx.compose.foundation.BorderStroke(1.dp, FlagAmberBorder) else null,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    viewModel.selectCell(rowNum, cell.colIndex, cell.colKey, cell)
                                }
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 12.dp, vertical = 9.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Text(
                                        text = "#${index + 1}",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        fontFamily = FontFamily.Monospace,
                                        color = TextMuted
                                    )
                                    Column {
                                        Text(
                                            text = "Stem Row $rowNum, ${cell.colKey}",
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = TextPrimary
                                        )
                                        if (!cell.visibilityIssue.isNullOrBlank()) {
                                            Text(
                                                text = cell.visibilityIssue,
                                                fontSize = 9.5.sp,
                                                color = FlagAmberText,
                                                fontWeight = FontWeight.Medium
                                            )
                                        }
                                    }
                                }

                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    // Height (Red)
                                    if (cell.heightValue.isNotBlank()) {
                                        Surface(
                                            color = Color(0xFFFEF2F2),
                                            shape = RoundedCornerShape(6.dp),
                                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFECACA))
                                        ) {
                                            Text(
                                                text = "${cell.heightValue}m",
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold,
                                                fontFamily = FontFamily.Monospace,
                                                color = Color(0xFFDC2626),
                                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                            )
                                        }
                                    }

                                    // DBH (Blue)
                                    Surface(
                                        color = Color(0xFFEFF6FF),
                                        shape = RoundedCornerShape(6.dp),
                                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFBFDBFE))
                                    ) {
                                        Text(
                                            text = "${cell.dbhValue} cm",
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold,
                                            fontFamily = FontFamily.Monospace,
                                            color = Color(0xFF1D4ED8),
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                                        )
                                    }

                                    Icon(
                                        Icons.Outlined.Edit,
                                        contentDescription = "Edit Stem",
                                        tint = TextMuted,
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                            }
                        }
                    }

                    if (displayedStems.size > 25) {
                        Text(
                            text = "+ ${displayedStems.size - 25} additional stem tallies included in export",
                            fontSize = 11.sp,
                            color = TextMuted,
                            textAlign = TextAlign.Center,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp)
                        )
                    }
                }
            }
        }

        // BOTTOM ACTION CARD: EXPORT WITH 2-LINE SPACING
        Surface(
            color = SurfaceCard,
            shape = RoundedCornerShape(18.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorderSubtle),
            shadowElevation = 2.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(text = "Official Export Formats", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        listOf("Word (.doc)", "Excel (.xlsx)", "Notepad (.txt)").forEach { ext ->
                            Surface(color = SurfaceContainer, shape = RoundedCornerShape(4.dp)) {
                                Text(
                                    text = ext,
                                    fontSize = 10.sp,
                                    fontFamily = FontFamily.Monospace,
                                    fontWeight = FontWeight.Bold,
                                    color = BrandEmerald,
                                    modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }
                }

                Text(
                    text = "Structured output: Blue DBH table first, exactly two lines of space, followed by Red Height table.",
                    fontSize = 10.5.sp,
                    color = TextSecondary
                )

                Button(
                    onClick = {
                        viewModel.prepareCsvExport(currentDoc)
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                        .testTag("export_appraisal_btn")
                ) {
                    Icon(Icons.Default.IosShare, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(text = "Export Document (Word / Excel / Text)", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }
            }
        }
    }

    // Cell Inspector Dialog (Magnifier & Correction for both DBH and Height)
    selectedCellTarget?.let { target ->
        CellInspectorDialog(
            docTitle = currentDoc.title,
            rowNumber = target.rowNumber,
            colKey = target.colKey,
            cell = target.cellData,
            onDismiss = { viewModel.clearSelectedCell() },
            onUpdateValue = { newDbh, newHeight ->
                viewModel.updateCellValue(newDbh, newHeight)
                Toast.makeText(context, "Updated DBH: $newDbh cm, Height: $newHeight m", Toast.LENGTH_SHORT).show()
                viewModel.clearSelectedCell()
            },
            onAddComment = { author, text ->
                viewModel.addComment(author, text)
            }
        )
    }

    // Optical Extraction & Visibility Audit Diagnostic Report Dialog
    if (showAuditReportModal) {
        ScanAuditReportDialog(
            doc = currentDoc,
            onDismiss = { showAuditReportModal = false },
            onProceedToReview = { showAuditReportModal = false }
        )
    }

    // Export Dialog (With Word, Excel, Notepad, CSV)
    exportModalText?.let { content ->
        ExportDialog(
            csvContent = content,
            notepadContent = viewModel.prepareNotepadExport(currentDoc),
            wordContent = viewModel.prepareWordExport(currentDoc),
            onDismiss = { viewModel.clearExportModal() }
        )
    }
}
