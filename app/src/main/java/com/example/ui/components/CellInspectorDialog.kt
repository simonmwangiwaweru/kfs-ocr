package com.example.ui.components

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
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.model.MatrixCell
import com.example.ui.theme.*

@Composable
fun CellInspectorDialog(
    docTitle: String,
    rowNumber: Int,
    colKey: String,
    cell: MatrixCell,
    onDismiss: () -> Unit,
    onUpdateValue: (newDbh: String, newHeight: String) -> Unit,
    onAddComment: (author: String, text: String) -> Unit
) {
    var editDbhInput by remember { mutableStateOf(cell.dbhValue) }
    var editHeightInput by remember { mutableStateOf(cell.heightValue) }
    var noteInput by remember { mutableStateOf("") }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.5f))
                .clickable { onDismiss() },
            contentAlignment = Alignment.BottomCenter
        ) {
            Surface(
                shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
                color = SurfaceCard,
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 740.dp)
                    .clickable(enabled = false) {}
                    .testTag("cell_inspector_sheet")
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 12.dp)
                ) {
                    // Top Drag Handle Pill
                    Box(
                        modifier = Modifier
                            .align(Alignment.CenterHorizontally)
                            .size(width = 36.dp, height = 5.dp)
                            .clip(RoundedCornerShape(9999.dp))
                            .background(HairlineBorder)
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    // Header Row
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                Icon(Icons.Default.Park, contentDescription = null, tint = BrandEmerald, modifier = Modifier.size(14.dp))
                                Text(
                                    text = "FORM AGW-85-01 AUDIT",
                                    fontSize = 10.sp,
                                    fontFamily = FontFamily.Monospace,
                                    fontWeight = FontWeight.Bold,
                                    color = BrandEmerald
                                )
                            }
                            Text(
                                text = "Row $rowNumber, $colKey",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                        }

                        IconButton(onClick = onDismiss, modifier = Modifier.size(32.dp)) {
                            Icon(Icons.Default.Close, contentDescription = "Close", tint = TextMuted)
                        }
                    }

                    Divider(modifier = Modifier.padding(vertical = 10.dp), color = HairlineBorderSubtle)

                    // Scrollable Inspector Body
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        // Visibility Issue Warning Banner (if applicable)
                        if (!cell.visibilityIssue.isNullOrBlank()) {
                            Surface(
                                color = FlagAmberBg,
                                shape = RoundedCornerShape(10.dp),
                                border = androidx.compose.foundation.BorderStroke(1.dp, FlagAmberBorder),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.padding(10.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Icon(Icons.Default.WarningAmber, contentDescription = null, tint = FlagAmber, modifier = Modifier.size(18.dp))
                                    Column {
                                        Text(text = "Optical Legibility Specification", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = FlagAmberText)
                                        Text(text = cell.visibilityIssue, fontSize = 11.sp, color = TextSecondary)
                                    }
                                }
                            }
                        }

                        // Physical Slip Preview (Optical Crop)
                        Surface(
                            color = SurfaceSubtle,
                            shape = RoundedCornerShape(14.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorderSubtle),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Text(text = "OPTICAL RAW CAPTURE", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = TextMuted)
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Column {
                                            Text(text = "DBH: ${cell.dbhValue} cm", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1D4ED8))
                                            Text(text = "Height: ${if (cell.heightValue.isNotBlank()) "${cell.heightValue} m" else "N/A"}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFFDC2626))
                                        }
                                    }
                                    Text(
                                        text = "${(cell.confidence * 100).toInt()}% Confidence • Form Slip",
                                        fontSize = 10.sp,
                                        color = if (cell.isUncertain) FlagAmber else VerifiedGreen,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }

                                // 4x Crop Card
                                Box(
                                    modifier = Modifier
                                        .size(width = 90.dp, height = 64.dp)
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(Color.White)
                                        .border(1.dp, HairlineBorder, RoundedCornerShape(8.dp)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text(text = cell.heightValue, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFFDC2626))
                                        Text(text = cell.dbhValue, fontSize = 18.sp, fontWeight = FontWeight.Black, color = Color(0xFF1D4ED8))
                                    }
                                }
                            }
                        }

                        // MANUAL OVERRIDE INPUTS
                        Text(text = "VERIFY OR OVERRIDE NUMBERS", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextPrimary)

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            // Blue DBH Input
                            OutlinedTextField(
                                value = editDbhInput,
                                onValueChange = { editDbhInput = it },
                                label = { Text("DBH in Blue (cm)", fontSize = 11.sp, color = Color(0xFF1D4ED8)) },
                                singleLine = true,
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Color(0xFF2563EB),
                                    unfocusedBorderColor = HairlineBorder
                                ),
                                modifier = Modifier.weight(1f)
                            )

                            // Red Height Input
                            OutlinedTextField(
                                value = editHeightInput,
                                onValueChange = { editHeightInput = it },
                                label = { Text("Height in Red (m)", fontSize = 11.sp, color = Color(0xFFDC2626)) },
                                singleLine = true,
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Color(0xFFDC2626),
                                    unfocusedBorderColor = HairlineBorder
                                ),
                                modifier = Modifier.weight(1f)
                            )
                        }

                        // Quick Note
                        OutlinedTextField(
                            value = noteInput,
                            onValueChange = { noteInput = it },
                            label = { Text("Surveyor Audit Note (optional)", fontSize = 11.sp) },
                            placeholder = { Text("e.g. Confirmed height using Suunto hypsometer", fontSize = 11.sp) },
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = BrandEmerald,
                                unfocusedBorderColor = HairlineBorder
                            ),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    Divider(modifier = Modifier.padding(vertical = 10.dp), color = HairlineBorderSubtle)

                    // Action Buttons Footer
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        OutlinedButton(
                            onClick = onDismiss,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .weight(1f)
                                .height(46.dp)
                        ) {
                            Text("Cancel", fontSize = 13.sp, color = TextPrimary)
                        }

                        Button(
                            onClick = {
                                if (noteInput.isNotBlank()) {
                                    onAddComment("Surveyor", noteInput)
                                }
                                onUpdateValue(editDbhInput, editHeightInput)
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .weight(1.3f)
                                .height(46.dp)
                                .testTag("save_cell_edit_btn")
                        ) {
                            Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Save & Verify", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}
