package com.example.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.model.SyncStatus
import com.example.ui.components.CellInspectorDialog
import com.example.ui.components.ExportDialog
import com.example.ui.components.SideBySideReview
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
    val selectedCell by viewModel.selectedCell.collectAsState()
    val exportModalText by viewModel.exportModalText.collectAsState()

    val currentDoc = documents.find { it.id == activeDocId } ?: documents.firstOrNull()

    Column(modifier = modifier.fillMaxSize()) {
        // Top Header — Clean Crisp White Surface with Hairline Divider
        Surface(
            color = Color.White,
            modifier = Modifier
                .fillMaxWidth()
                .border(width = 1.dp, color = HairlineBorder)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 14.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = currentDoc?.title ?: "No Document Selected",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary,
                            maxLines = 1
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = "${currentDoc?.forestStation ?: "Station"} • Observer: ${currentDoc?.observerName ?: "—"}",
                            style = MaterialTheme.typography.bodySmall,
                            color = TextSecondary,
                            maxLines = 1
                        )
                    }

                    // Export Button
                    FilledTonalButton(
                        onClick = {
                            if (currentDoc != null) {
                                viewModel.prepareCsvExport(currentDoc)
                            }
                        },
                        colors = ButtonDefaults.filledTonalButtonColors(
                            containerColor = SurfaceSubtle,
                            contentColor = TextPrimary
                        ),
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                        modifier = Modifier.testTag("export_doc_btn")
                    ) {
                        Icon(
                            Icons.Outlined.Download,
                            contentDescription = "Export data",
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Export", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Metadata Chips Row: Records, Status, Verified Toggle
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Surface(
                            color = SurfaceSubtle,
                            shape = RoundedCornerShape(6.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorder)
                        ) {
                            Text(
                                text = "${currentDoc?.rows?.size ?: 0} Records",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium,
                                color = TextSecondary,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                            )
                        }

                        if (currentDoc?.syncStatus == SyncStatus.SAVED_OFFLINE) {
                            Surface(
                                color = FlagAmberBg,
                                shape = RoundedCornerShape(6.dp),
                                border = androidx.compose.foundation.BorderStroke(1.dp, FlagAmberBorder)
                            ) {
                                Text(
                                    text = "Offline Queue",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = FlagAmberText,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                )
                            }
                        }
                    }

                    // Verification Checkbox Button
                    FilledTonalButton(
                        onClick = {
                            if (currentDoc != null) {
                                viewModel.toggleDocumentVerified(currentDoc.id, currentDoc.isVerified)
                                val msg = if (!currentDoc.isVerified) "Document marked verified" else "Marked pending review"
                                Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
                            }
                        },
                        colors = ButtonDefaults.filledTonalButtonColors(
                            containerColor = if (currentDoc?.isVerified == true) BrandEmeraldLight else SurfaceSubtle,
                            contentColor = if (currentDoc?.isVerified == true) BrandEmeraldDark else TextSecondary
                        ),
                        shape = RoundedCornerShape(8.dp),
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            if (currentDoc?.isVerified == true) BrandEmeraldBorder else HairlineBorder
                        ),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                        modifier = Modifier.testTag("verify_toggle_btn")
                    ) {
                        Icon(
                            imageVector = if (currentDoc?.isVerified == true) Icons.Default.CheckCircle else Icons.Outlined.CheckCircle,
                            contentDescription = null,
                            tint = if (currentDoc?.isVerified == true) BrandEmerald else TextMuted,
                            modifier = Modifier.size(15.dp)
                        )
                        Spacer(modifier = Modifier.width(5.dp))
                        Text(
                            text = if (currentDoc?.isVerified == true) "Verified" else "Approve",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }
        }

        if (currentDoc == null) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Text("No scanned document available. Scan a sheet first.", color = TextSecondary)
            }
        } else {
            SideBySideReview(
                document = currentDoc,
                onCellClick = { rowNum, colKey, colName, cellData ->
                    viewModel.selectCell(rowNum, colKey, colName, cellData)
                },
                modifier = Modifier.weight(1f)
            )
        }
    }

    // Cell Inspector Dialog
    selectedCell?.let { target ->
        CellInspectorDialog(
            target = target,
            onDismiss = { viewModel.clearSelectedCell() },
            onSaveValue = { newVal ->
                viewModel.updateCellValue(newVal)
                Toast.makeText(context, "Value updated", Toast.LENGTH_SHORT).show()
            },
            onAddComment = { author, text ->
                viewModel.addComment(author, text)
                Toast.makeText(context, "Comment added", Toast.LENGTH_SHORT).show()
            },
            onToggleResolveComment = { commentId ->
                viewModel.toggleResolveComment(commentId)
            }
        )
    }

    // Export Dialog
    exportModalText?.let { csv ->
        ExportDialog(
            csvContent = csv,
            onDismiss = { viewModel.clearExportModal() }
        )
    }
}
