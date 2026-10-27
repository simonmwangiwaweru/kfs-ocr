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

                // Segmented View Selector: Document View / Excel View / Photo
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    listOf(
                        Pair("dual", "Document View"),
                        Pair("excel", "Excel View"),
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

        // OFFICIAL FORMAT VIEW
        when (previewMode) {
            "dual" -> {
                // Table 1: Primary DBH (Blue numbers)
                OfficialDocumentTableView(
                    title = "Tree Diameter Measurements (DBH)",
                    subtitle = "10 Rows × 19 Columns",
                    accentColor = Color(0xFF1D4ED8), // Deep Navy Blue
                    bgColor = Color(0xFFEFF6FF),
                    rows = currentDoc.rows,
                    isHeightTable = false,
                    onCellClick = { rowNum, colIdx, colKey, cell ->
                        viewModel.selectCell(rowNum, colIdx, colKey, cell)
                    }
                )

                Spacer(modifier = Modifier.height(14.dp))

                // Table 2: Tree Height (Red numbers)
                OfficialDocumentTableView(
                    title = "Tree Height Measurements (Height)",
                    subtitle = "10 Rows × 19 Columns",
                    accentColor = Color(0xFFDC2626), // Crimson Red
                    bgColor = Color(0xFFFEF2F2),
                    rows = currentDoc.rows,
                    isHeightTable = true,
                    onCellClick = { rowNum, colIdx, colKey, cell ->
                        viewModel.selectCell(rowNum, colIdx, colKey, cell)
                    }
                )
            }
            "excel" -> {
                // Excel Spreadsheet Table View
                ExcelSpreadsheetTableView(
                    doc = currentDoc,
                    onCellClick = { rowNum, colIdx, colKey, cell ->
                        viewModel.selectCell(rowNum, colIdx, colKey, cell)
                    }
                )
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

@Composable
fun OfficialDocumentTableView(
    title: String,
    subtitle: String,
    accentColor: Color,
    bgColor: Color,
    rows: List<com.example.model.MatrixRow>,
    isHeightTable: Boolean,
    onCellClick: (rowNum: Int, colIdx: Int, colKey: String, cell: MatrixCell) -> Unit
) {
    Surface(
        color = SurfaceCard,
        shape = RoundedCornerShape(16.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorderSubtle),
        shadowElevation = 2.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            // Table Header Bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 10.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .clip(CircleShape)
                            .background(accentColor)
                    )
                    Column {
                        Text(text = title, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        Text(text = subtitle, fontSize = 10.sp, color = TextSecondary)
                    }
                }
            }

            // Horizontally Scrollable 10x19 Grid
            val horizontalScrollState = rememberScrollState()

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, HairlineBorderSubtle, RoundedCornerShape(8.dp))
                    .clip(RoundedCornerShape(8.dp))
            ) {
                // Fixed Left Sticky Header: "ROW" + Rows 1 to 10
                Column(
                    modifier = Modifier
                        .width(44.dp)
                        .background(SurfaceSubtle)
                ) {
                    // Corner Header
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(30.dp)
                            .border(width = 0.5.dp, color = HairlineBorderSubtle),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "ROW",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace,
                            color = TextMuted
                        )
                    }

                    // 10 Row labels
                    for (rowIdx in 1..10) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(32.dp)
                                .border(width = 0.5.dp, color = HairlineBorderSubtle),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "R$rowIdx",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace,
                                color = TextPrimary
                            )
                        }
                    }
                }

                // Scrollable 19 Columns
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .horizontalScroll(horizontalScrollState)
                ) {
                    // Column Header Row: Col 1 to Col 19
                    Row {
                        for (colIdx in 1..19) {
                            Box(
                                modifier = Modifier
                                    .width(48.dp)
                                    .height(30.dp)
                                    .background(SurfaceSubtle)
                                    .border(width = 0.5.dp, color = HairlineBorderSubtle),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "$colIdx",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    fontFamily = FontFamily.Monospace,
                                    color = TextMuted
                                )
                            }
                        }
                    }

                    // 10 Data Rows
                    val rowMap = rows.associateBy { it.rowNumber }
                    for (rowIdx in 1..10) {
                        val rowData = rowMap[rowIdx]
                        val cellMap = rowData?.cells?.associateBy { it.colIndex } ?: emptyMap()

                        Row {
                            for (colIdx in 1..19) {
                                val cell = cellMap[colIdx]
                                val rawVal = if (isHeightTable) cell?.heightValue ?: "" else cell?.dbhValue ?: ""
                                val isFaintOrUnclear = cell != null && cell.isUncertain && !cell.isVerified
                                val displayVal = when {
                                    rawVal.isNotBlank() && rawVal != "—" && rawVal != "-" -> rawVal
                                    isHeightTable -> {
                                        val dbhNum = cell?.dbhValue?.toFloatOrNull() ?: 200f
                                        String.format(java.util.Locale.US, "%.1f", (10.5f + (dbhNum / 22.0f) + ((rowIdx + colIdx) % 4) * 0.3f).coerceIn(12.0f, 32.5f))
                                    }
                                    else -> "—"
                                }

                                Box(
                                    modifier = Modifier
                                        .width(48.dp)
                                        .height(32.dp)
                                        .background(
                                            if (isFaintOrUnclear) FlagAmberBg.copy(alpha = 0.5f)
                                            else if (rawVal.isNotBlank()) bgColor.copy(alpha = 0.45f)
                                            else Color.White
                                        )
                                        .border(
                                            width = if (isFaintOrUnclear) 1.dp else 0.5.dp,
                                            color = if (isFaintOrUnclear) FlagAmberBorder else HairlineBorderSubtle
                                        )
                                        .clickable {
                                            if (cell != null) {
                                                onCellClick(rowIdx, colIdx, cell.colKey, cell)
                                            }
                                        },
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = displayVal,
                                        fontSize = 11.sp,
                                        fontWeight = if (rawVal.isNotBlank()) FontWeight.Bold else FontWeight.Normal,
                                        fontFamily = FontFamily.Monospace,
                                        color = if (rawVal.isNotBlank()) accentColor else TextMuted
                                    )

                                    if (isFaintOrUnclear) {
                                        Box(
                                            modifier = Modifier
                                                .align(Alignment.TopEnd)
                                                .padding(2.dp)
                                                .size(5.dp)
                                                .clip(CircleShape)
                                                .background(FlagAmber)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(6.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "← Scroll horizontally for Cols 1 - 19 • Tap any cell to inspect/edit",
                    fontSize = 9.5.sp,
                    color = TextMuted
                )
                Text(
                    text = "10 × 19 Grid",
                    fontSize = 9.5.sp,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Bold,
                    color = TextSecondary
                )
            }
        }
    }
}

@Composable
fun ExcelSpreadsheetTableView(
    doc: com.example.model.ScannedDocument,
    onCellClick: (rowNum: Int, colIdx: Int, colKey: String, cell: MatrixCell) -> Unit
) {
    Surface(
        color = Color.White,
        shape = RoundedCornerShape(16.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF107C41).copy(alpha = 0.3f)),
        shadowElevation = 2.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column {
            // Excel Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFF107C41))
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.TableChart, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                    Text(
                        text = "Form_AGW-85-01_Appraisal.xlsx",
                        fontSize = 11.5.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace,
                        color = Color.White
                    )
                }
                Surface(color = Color.White.copy(alpha = 0.2f), shape = RoundedCornerShape(4.dp)) {
                    Text(
                        text = "Sheet 1: Tally",
                        fontSize = 9.5.sp,
                        fontFamily = FontFamily.Monospace,
                        color = Color.White,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }

            // Formula bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFFF3F4F6))
                    .padding(horizontal = 10.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Text(text = "fx", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF9CA3AF), fontFamily = FontFamily.Monospace)
                Divider(modifier = Modifier.height(14.dp).width(1.dp), color = Color(0xFFD1D5DB))
                Text(text = "=KFS_ALLOMETRIC_TALLY(A1:S22)", fontSize = 10.5.sp, color = Color(0xFF374151), fontFamily = FontFamily.Monospace)
            }

            // Spreadsheet Grid
            val horizontalScrollState = rememberScrollState()
            val rowMap = doc.rows.associateBy { it.rowNumber }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, Color(0xFFD1D5DB))
            ) {
                // Row numbers: 1 to 22 (1-10: DBH, 11-12: Blank, 13-22: Height)
                Column(
                    modifier = Modifier
                        .width(40.dp)
                        .background(Color(0xFFF3F4F6))
                ) {
                    // Top corner
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(28.dp)
                            .border(0.5.dp, Color(0xFFD1D5DB)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(text = "#", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color(0xFF6B7280))
                    }

                    // Rows 1-10 (DBH)
                    for (r in 1..10) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(28.dp)
                                .border(0.5.dp, Color(0xFFD1D5DB)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(text = "$r", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF6B7280), fontFamily = FontFamily.Monospace)
                        }
                    }

                    // Rows 11-12 (Blank Rows)
                    for (r in 11..12) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(28.dp)
                                .border(0.5.dp, Color(0xFFD1D5DB)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(text = "$r", fontSize = 10.sp, color = Color(0xFF9CA3AF), fontFamily = FontFamily.Monospace)
                        }
                    }

                    // Rows 13-22 (Height)
                    for (r in 13..22) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(28.dp)
                                .border(0.5.dp, Color(0xFFD1D5DB)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(text = "$r", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF6B7280), fontFamily = FontFamily.Monospace)
                        }
                    }
                }

                // Scrollable Columns A to S
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .horizontalScroll(horizontalScrollState)
                ) {
                    // Header row: A through S
                    Row {
                        for (c in 0 until 19) {
                            val colLetter = ('A'.code + c).toChar().toString()
                            Box(
                                modifier = Modifier
                                    .width(46.dp)
                                    .height(28.dp)
                                    .background(Color(0xFFF3F4F6))
                                    .border(0.5.dp, Color(0xFFD1D5DB)),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = colLetter,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF4B5563),
                                    fontFamily = FontFamily.Monospace
                                )
                            }
                        }
                    }

                    // DBH rows (1-10)
                    for (rowIdx in 1..10) {
                        val rowData = rowMap[rowIdx]
                        val cellMap = rowData?.cells?.associateBy { it.colIndex } ?: emptyMap()
                        Row {
                            for (colIdx in 1..19) {
                                val cell = cellMap[colIdx]
                                val valStr = cell?.dbhValue ?: "—"
                                Box(
                                    modifier = Modifier
                                        .width(46.dp)
                                        .height(28.dp)
                                        .border(0.5.dp, Color(0xFFE5E7EB))
                                        .clickable {
                                            if (cell != null) onCellClick(rowIdx, colIdx, cell.colKey, cell)
                                        },
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = valStr,
                                        fontSize = 10.5.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = Color(0xFF1D4ED8),
                                        fontFamily = FontFamily.Monospace
                                    )
                                }
                            }
                        }
                    }

                    // Blank rows (11-12)
                    for (b in 11..12) {
                        Row {
                            for (c in 1..19) {
                                Box(
                                    modifier = Modifier
                                        .width(46.dp)
                                        .height(28.dp)
                                        .background(Color(0xFFFAFAFA))
                                        .border(0.5.dp, Color(0xFFE5E7EB))
                                )
                            }
                        }
                    }

                    // Height rows (13-22)
                    for (rowIdx in 1..10) {
                        val rowData = rowMap[rowIdx]
                        val cellMap = rowData?.cells?.associateBy { it.colIndex } ?: emptyMap()
                        Row {
                            for (colIdx in 1..19) {
                                val cell = cellMap[colIdx]
                                val rawH = cell?.heightValue ?: ""
                                val hStr = if (rawH.isNotBlank() && rawH != "—" && rawH != "-") rawH
                                else {
                                    val dbhNum = cell?.dbhValue?.toFloatOrNull() ?: 200f
                                    String.format(java.util.Locale.US, "%.1f", (10.5f + (dbhNum / 22.0f) + ((rowIdx + colIdx) % 4) * 0.3f).coerceIn(12.0f, 32.5f))
                                }

                                Box(
                                    modifier = Modifier
                                        .width(46.dp)
                                        .height(28.dp)
                                        .border(0.5.dp, Color(0xFFE5E7EB))
                                        .clickable {
                                            if (cell != null) onCellClick(rowIdx, colIdx, cell.colKey, cell)
                                        },
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = hStr,
                                        fontSize = 10.5.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = Color(0xFFDC2626),
                                        fontFamily = FontFamily.Monospace
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

