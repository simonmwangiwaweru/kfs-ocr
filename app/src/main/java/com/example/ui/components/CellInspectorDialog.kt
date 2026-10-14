package com.example.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.ui.theme.*
import com.example.viewmodel.SelectedCellTarget

@Composable
fun CellInspectorDialog(
    target: SelectedCellTarget,
    onDismiss: () -> Unit,
    onSaveValue: (String) -> Unit,
    onAddComment: (author: String, text: String) -> Unit,
    onToggleResolveComment: (commentId: String) -> Unit
) {
    var editValue by remember(target) { mutableStateOf(target.cellData.value) }
    var authorInput by remember { mutableStateOf("") }
    var commentInput by remember { mutableStateOf("") }

    val confidence = target.cellData.confidence
    val isUncertain = confidence.isUncertain
    val confidencePct = (confidence.confidence * 100).toInt()

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = SurfaceCard,
            border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorder),
            shadowElevation = 8.dp,
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 16.dp)
                .testTag("cell_inspector_dialog")
        ) {
            Column(
                modifier = Modifier
                    .padding(20.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                // Header with field and row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "${target.columnName} • Row #${target.rowNumber}",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = "Original OCR: '${target.cellData.originalOcrValue}'",
                            style = MaterialTheme.typography.bodySmall,
                            color = TextSecondary
                        )
                    }
                    IconButton(
                        onClick = onDismiss,
                        modifier = Modifier.testTag("close_inspector_btn")
                    ) {
                        Icon(Icons.Default.Close, contentDescription = "Close dialog", tint = TextSecondary)
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Uncertainty / Confidence Status Banner
                val bannerBg = if (isUncertain) FlagAmberBg else VerifiedGreenBg
                val bannerBorder = if (isUncertain) FlagAmberBorder else VerifiedGreenBorder
                val bannerText = if (isUncertain) FlagAmberText else VerifiedGreenText
                val bannerIcon = if (isUncertain) Icons.Default.Warning else Icons.Default.CheckCircle

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(bannerBg)
                        .border(1.dp, bannerBorder, RoundedCornerShape(8.dp))
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = bannerIcon,
                        contentDescription = null,
                        tint = bannerText,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (isUncertain) {
                            "Uncertainty Flagged: $confidencePct% Confidence"
                        } else {
                            "High Confidence: $confidencePct%"
                        },
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = bannerText
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "Extracted Value",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = TextPrimary
                )
                Spacer(modifier = Modifier.height(6.dp))

                OutlinedTextField(
                    value = editValue,
                    onValueChange = { editValue = it },
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("cell_value_input"),
                    singleLine = true,
                    shape = RoundedCornerShape(10.dp),
                    textStyle = MaterialTheme.typography.titleMedium.copy(
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    ),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = BrandEmerald,
                        unfocusedBorderColor = HairlineBorder
                    ),
                    trailingIcon = {
                        if (editValue != target.cellData.value) {
                            Button(
                                onClick = { onSaveValue(editValue) },
                                colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald),
                                shape = RoundedCornerShape(6.dp),
                                modifier = Modifier
                                    .padding(end = 4.dp)
                                    .testTag("save_cell_btn"),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp)
                            ) {
                                Text("Save", fontSize = 12.sp, color = Color.White)
                            }
                        }
                    }
                )

                if (target.cellData.isManuallyEdited) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "✓ Manually verified by reviewer",
                        style = MaterialTheme.typography.bodySmall,
                        color = VerifiedGreen
                    )
                }

                Spacer(modifier = Modifier.height(18.dp))
                HorizontalDivider(color = HairlineBorder)
                Spacer(modifier = Modifier.height(16.dp))

                // Reviewer Comments Section
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Reviewer Audit Notes (${target.cellData.comments.size})",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    Icon(
                        Icons.Outlined.ModeComment,
                        contentDescription = null,
                        tint = BrandEmerald,
                        modifier = Modifier.size(16.dp)
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                if (target.cellData.comments.isEmpty()) {
                    Text(
                        text = "No notes recorded on this field yet.",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextMuted
                    )
                } else {
                    target.cellData.comments.forEach { comment ->
                        Surface(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp),
                            color = if (comment.isResolved) SurfaceSubtle.copy(alpha = 0.6f) else SurfaceSubtle,
                            shape = RoundedCornerShape(8.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorder)
                        ) {
                            Column(modifier = Modifier.padding(10.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(
                                        text = comment.author,
                                        style = MaterialTheme.typography.labelSmall,
                                        fontWeight = FontWeight.Bold,
                                        color = TextPrimary
                                    )
                                    Text(
                                        text = if (comment.isResolved) "Resolved" else "Open",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = if (comment.isResolved) VerifiedGreen else FlagAmber
                                    )
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = comment.text,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = TextSecondary
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                TextButton(
                                    onClick = { onToggleResolveComment(comment.id) },
                                    contentPadding = PaddingValues(0.dp)
                                ) {
                                    Text(
                                        text = if (comment.isResolved) "Mark Unresolved" else "Mark Resolved",
                                        fontSize = 11.sp,
                                        color = BrandEmerald
                                    )
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = authorInput,
                    onValueChange = { authorInput = it },
                    label = { Text("Your Name / Role") },
                    placeholder = { Text("e.g. M. Musyoka (Field Officer)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    shape = RoundedCornerShape(10.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = BrandEmerald,
                        unfocusedBorderColor = HairlineBorder
                    )
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = commentInput,
                    onValueChange = { commentInput = it },
                    label = { Text("Add Field Comment") },
                    placeholder = { Text("e.g. Faint handwriting; verified against plot tally") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 2,
                    shape = RoundedCornerShape(10.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = BrandEmerald,
                        unfocusedBorderColor = HairlineBorder
                    )
                )

                Spacer(modifier = Modifier.height(10.dp))

                Button(
                    onClick = {
                        if (commentInput.isNotBlank()) {
                            onAddComment(authorInput.ifBlank { "Reviewer" }, commentInput)
                            commentInput = ""
                        }
                    },
                    enabled = commentInput.isNotBlank(),
                    colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier
                        .align(Alignment.End)
                        .testTag("add_comment_btn")
                ) {
                    Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Add Comment", fontSize = 12.sp)
                }

                Spacer(modifier = Modifier.height(14.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    FilledTonalButton(
                        onClick = onDismiss,
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.filledTonalButtonColors(containerColor = SurfaceSubtle, contentColor = TextPrimary),
                        modifier = Modifier.testTag("dismiss_inspector_btn")
                    ) {
                        Text("Done", fontSize = 12.sp)
                    }
                }
            }
        }
    }
}
