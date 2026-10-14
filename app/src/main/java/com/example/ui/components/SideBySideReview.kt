package com.example.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.R
import com.example.model.*
import com.example.ui.theme.*

@Composable
fun SideBySideReview(
    document: ScannedDocument,
    onCellClick: (rowNum: Int, columnKey: String, columnName: String, cellData: CellData) -> Unit,
    modifier: Modifier = Modifier
) {
    var viewMode by remember { mutableStateOf("SPLIT") }

    Column(modifier = modifier.fillMaxSize()) {
        // Mode Selector Bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                color = SurfaceSubtle,
                shape = RoundedCornerShape(10.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorder)
            ) {
                Row(
                    modifier = Modifier.padding(2.dp),
                    horizontalArrangement = Arrangement.spacedBy(2.dp)
                ) {
                    ReviewModePill(
                        text = "Side-by-Side",
                        icon = Icons.Outlined.VerticalSplit,
                        isSelected = viewMode == "SPLIT",
                        onClick = { viewMode = "SPLIT" }
                    )
                    ReviewModePill(
                        text = "Table",
                        icon = Icons.Outlined.TableChart,
                        isSelected = viewMode == "TABLE",
                        onClick = { viewMode = "TABLE" }
                    )
                    ReviewModePill(
                        text = "Scan",
                        icon = Icons.Outlined.Image,
                        isSelected = viewMode == "IMAGE",
                        onClick = { viewMode = "IMAGE" }
                    )
                }
            }

            // Flagged Count Badge
            if (document.totalUncertainCells > 0) {
                Surface(
                    color = FlagAmberBg,
                    shape = RoundedCornerShape(20.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, FlagAmberBorder)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.Warning,
                            contentDescription = null,
                            tint = FlagAmber,
                            modifier = Modifier.size(12.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "${document.totalUncertainCells} Flagged",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = FlagAmberText
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(4.dp))

        when (viewMode) {
            "IMAGE" -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(Color(0xFF0F172A))
                ) {
                    AsyncImage(
                        model = R.drawable.sample_field_form,
                        contentDescription = "Original Field Form Scan",
                        contentScale = ContentScale.Fit,
                        modifier = Modifier.fillMaxSize()
                    )
                }
            }
            "TABLE" -> {
                ExtractedDataTable(
                    rows = document.rows,
                    onCellClick = onCellClick,
                    modifier = Modifier.fillMaxSize()
                )
            }
            else -> {
                Column(modifier = Modifier.fillMaxSize()) {
                    // Top Pane: Document Scan View
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(180.dp)
                            .padding(horizontal = 16.dp),
                        shape = RoundedCornerShape(14.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorder),
                        color = Color(0xFF0F172A)
                    ) {
                        Box(modifier = Modifier.fillMaxSize()) {
                            AsyncImage(
                                model = R.drawable.sample_field_form,
                                contentDescription = "Scanned Form Image",
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize()
                            )
                            Surface(
                                color = Color(0xCC0F172A),
                                shape = RoundedCornerShape(bottomEnd = 10.dp),
                                modifier = Modifier.align(Alignment.TopStart)
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        Icons.Outlined.CropFree,
                                        contentDescription = null,
                                        tint = Color(0xFF10B981),
                                        modifier = Modifier.size(12.dp)
                                    )
                                    Spacer(modifier = Modifier.width(5.dp))
                                    Text(
                                        text = "Scanned Form • Aberdare Forest",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = Color.White,
                                        fontSize = 11.sp
                                    )
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // Bottom Pane: Structured Extracted Table
                    ExtractedDataTable(
                        rows = document.rows,
                        onCellClick = onCellClick,
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f)
                    )
                }
            }
        }
    }
}

@Composable
fun ReviewModePill(
    text: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Surface(
        color = if (isSelected) Color.White else Color.Transparent,
        shape = RoundedCornerShape(8.dp),
        border = if (isSelected) androidx.compose.foundation.BorderStroke(1.dp, HairlineBorder) else null,
        shadowElevation = if (isSelected) 1.dp else 0.dp,
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .clickable { onClick() }
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = if (isSelected) BrandEmerald else TextSecondary,
                modifier = Modifier.size(14.dp)
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = text,
                fontSize = 11.sp,
                fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Medium,
                color = if (isSelected) TextPrimary else TextSecondary
            )
        }
    }
}

@Composable
fun ExtractedDataTable(
    rows: List<InventoryRow>,
    onCellClick: (rowNum: Int, columnKey: String, columnName: String, cellData: CellData) -> Unit,
    modifier: Modifier = Modifier
) {
    val hScroll = rememberScrollState()
    val vScroll = rememberScrollState()

    Surface(
        modifier = modifier
            .padding(horizontal = 16.dp, vertical = 4.dp),
        shape = RoundedCornerShape(14.dp),
        color = SurfaceCard,
        border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorder),
        shadowElevation = 1.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .horizontalScroll(hScroll)
        ) {
            // Header Row — Clean Slate-50 with Hairline Divider
            Row(
                modifier = Modifier
                    .background(SurfaceSubtle)
                    .padding(vertical = 10.dp, horizontal = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                TableHeaderCell("TREE #", 72.dp)
                TableHeaderCell("SPECIES", 90.dp)
                TableHeaderCell("DBH (CM)", 96.dp)
                TableHeaderCell("HEIGHT (M)", 96.dp)
                TableHeaderCell("HEALTH", 84.dp)
                TableHeaderCell("NOTES / AUDIT", 120.dp)
            }

            HorizontalDivider(color = HairlineBorder)

            // Scrollable Data Rows
            Column(
                modifier = Modifier
                    .weight(1f)
                    .verticalScroll(vScroll)
            ) {
                rows.forEachIndexed { index, row ->
                    val isEven = index % 2 == 0
                    Row(
                        modifier = Modifier
                            .background(if (isEven) Color.White else Color(0xFFFAFAFC))
                            .padding(vertical = 3.dp, horizontal = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        TableCell(
                            cellData = row.treeNumber,
                            width = 72.dp,
                            onClick = { onCellClick(row.rowNumber, "treeNumber", "Tree Number", row.treeNumber) }
                        )

                        TableCell(
                            cellData = row.speciesCode,
                            width = 90.dp,
                            onClick = { onCellClick(row.rowNumber, "speciesCode", "Species Code", row.speciesCode) }
                        )

                        TableCell(
                            cellData = row.dbhCm,
                            width = 96.dp,
                            isNumeric = true,
                            onClick = { onCellClick(row.rowNumber, "dbhCm", "DBH (cm)", row.dbhCm) }
                        )

                        TableCell(
                            cellData = row.heightM,
                            width = 96.dp,
                            isNumeric = true,
                            onClick = { onCellClick(row.rowNumber, "heightM", "Height (m)", row.heightM) }
                        )

                        TableCell(
                            cellData = row.healthStatus,
                            width = 84.dp,
                            onClick = { onCellClick(row.rowNumber, "healthStatus", "Health Status", row.healthStatus) }
                        )

                        TableCell(
                            cellData = row.notes,
                            width = 120.dp,
                            onClick = { onCellClick(row.rowNumber, "notes", "Notes", row.notes) }
                        )
                    }
                    HorizontalDivider(color = HairlineBorderSubtle)
                }
            }
        }
    }
}

@Composable
fun TableHeaderCell(text: String, width: androidx.compose.ui.unit.Dp) {
    Text(
        text = text,
        style = MaterialTheme.typography.labelSmall,
        fontWeight = FontWeight.Bold,
        letterSpacing = 0.5.sp,
        color = TextSecondary,
        textAlign = TextAlign.Center,
        modifier = Modifier
            .width(width)
            .padding(horizontal = 4.dp)
    )
}

@Composable
fun TableCell(
    cellData: CellData,
    width: androidx.compose.ui.unit.Dp,
    isNumeric: Boolean = false,
    onClick: () -> Unit
) {
    val isUncertain = cellData.confidence.isUncertain
    val isEdited = cellData.isManuallyEdited
    val hasComments = cellData.comments.isNotEmpty()

    val bgColor = when {
        isUncertain -> FlagAmberBg
        isEdited -> Color(0xFFF0FDF4) // Soft emerald edit badge
        else -> Color.Transparent
    }

    val borderColor = when {
        isUncertain -> FlagAmberBorder
        isEdited -> BrandEmeraldBorder
        else -> Color.Transparent
    }

    Box(
        modifier = Modifier
            .width(width)
            .height(42.dp)
            .padding(2.dp)
            .clip(RoundedCornerShape(6.dp))
            .background(bgColor)
            .border(if (isUncertain || isEdited) 1.dp else 0.dp, borderColor, RoundedCornerShape(6.dp))
            .clickable { onClick() }
            .padding(horizontal = 4.dp),
        contentAlignment = Alignment.Center
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            if (isUncertain) {
                Icon(
                    Icons.Default.Warning,
                    contentDescription = "Uncertain value",
                    tint = FlagAmber,
                    modifier = Modifier
                        .size(12.dp)
                        .padding(end = 3.dp)
                )
            }

            Text(
                text = cellData.value.ifBlank { "—" },
                style = MaterialTheme.typography.bodyMedium.copy(
                    fontFamily = if (isNumeric) FontFamily.Monospace else FontFamily.Default,
                    fontWeight = if (isUncertain || isEdited) FontWeight.SemiBold else FontWeight.Normal
                ),
                color = when {
                    isUncertain -> FlagAmberText
                    isEdited -> BrandEmeraldDark
                    else -> TextPrimary
                },
                maxLines = 1,
                textAlign = TextAlign.Center
            )

            if (hasComments) {
                Spacer(modifier = Modifier.width(4.dp))
                Badge(
                    containerColor = BrandEmerald,
                    contentColor = Color.White
                ) {
                    Text(
                        text = "${cellData.comments.size}",
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}
