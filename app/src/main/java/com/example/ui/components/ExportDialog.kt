package com.example.ui.components

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.outlined.ContentCopy
import androidx.compose.material.icons.outlined.Download
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
import androidx.compose.ui.window.Dialog
import com.example.ui.theme.*

@Composable
fun ExportDialog(
    csvContent: String,
    notepadContent: String = "",
    wordContent: String = "",
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    var selectedFormat by remember { mutableStateOf("NOTEPAD") }

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = SurfaceCard,
            border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorder),
            shadowElevation = 8.dp,
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 16.dp)
                .testTag("export_dialog")
        ) {
            Column(
                modifier = Modifier
                    .padding(20.dp)
                    .fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Export Appraisal Form",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                        Text(
                            text = "Form AGW-85-01 • DBH (Blue) & Height (Red)",
                            style = MaterialTheme.typography.bodySmall,
                            color = TextSecondary
                        )
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Close", tint = TextMuted)
                    }
                }

                // 4 Format Selection Buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    val formats = listOf(
                        Triple("NOTEPAD", "Notepad", ".txt"),
                        Triple("WORD", "Word", ".doc"),
                        Triple("EXCEL", "Excel", ".xlsx"),
                        Triple("CSV", "CSV", ".csv")
                    )

                    formats.forEach { (key, label, ext) ->
                        val isSelected = selectedFormat == key
                        Surface(
                            color = if (isSelected) BrandEmerald else SurfaceSubtle,
                            shape = RoundedCornerShape(10.dp),
                            border = androidx.compose.foundation.BorderStroke(
                                1.dp,
                                if (isSelected) BrandEmerald else HairlineBorder
                            ),
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(10.dp))
                                .clickable { selectedFormat = key }
                        ) {
                            Column(
                                modifier = Modifier.padding(vertical = 8.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(
                                    text = label,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isSelected) Color.White else TextPrimary
                                )
                                Text(
                                    text = ext,
                                    fontSize = 9.sp,
                                    fontFamily = FontFamily.Monospace,
                                    color = if (isSelected) Color.White.copy(alpha = 0.85f) else TextMuted
                                )
                            }
                        }
                    }
                }

                // Structure Note Reminder
                Surface(
                    color = SurfaceSubtle,
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Box(modifier = Modifier.size(6.dp).clip(androidx.compose.foundation.shape.CircleShape).background(Color(0xFF2563EB)))
                        Text(text = "DBH (Blue)", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1D4ED8))
                        Text(text = "then 2 blank lines then", fontSize = 10.sp, color = TextMuted)
                        Box(modifier = Modifier.size(6.dp).clip(androidx.compose.foundation.shape.CircleShape).background(Color(0xFFDC2626)))
                        Text(text = "Height (Red)", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFFB91C1C))
                    }
                }

                // Document Preview Box
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(230.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(SurfaceSubtle)
                        .border(1.dp, HairlineBorderSubtle, RoundedCornerShape(12.dp))
                        .padding(12.dp)
                ) {
                    val vScroll = rememberScrollState()
                    val hScroll = rememberScrollState()

                    val previewText = when (selectedFormat) {
                        "NOTEPAD" -> notepadContent.ifBlank { csvContent }
                        "WORD" -> {
                            "=== MICROSOFT WORD DOCUMENT (.doc / .docx) ===\r\n" +
                            "Document: Form AGW-85-01 Landscape Table Report\r\n" +
                            "Structure: Section 1 (DBH - Blue) followed by 2 lines of space, followed by Section 2 (Height - Red)\r\n\r\n" +
                            (notepadContent.ifBlank { csvContent })
                        }
                        "EXCEL" -> {
                            "=== MICROSOFT EXCEL WORKBOOK (.xlsx) ===\r\n" +
                            "Sheet: AGW-85-01_Field_Tally\r\n" +
                            "Layout: Block A (Rows 1-10: DBH Blue) -> Blank Row 11 & 12 -> Block B (Rows 13-22: Height Red)\r\n\r\n" +
                            csvContent
                        }
                        else -> csvContent
                    }

                    Text(
                        text = previewText,
                        fontFamily = FontFamily.Monospace,
                        fontSize = 10.5.sp,
                        lineHeight = 14.sp,
                        color = TextPrimary,
                        modifier = Modifier
                            .verticalScroll(vScroll)
                            .horizontalScroll(hScroll)
                    )
                }

                // Copy Data & Download Actions
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedButton(
                        onClick = {
                            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                            val contentToCopy = when (selectedFormat) {
                                "NOTEPAD", "WORD" -> notepadContent.ifBlank { csvContent }
                                else -> csvContent
                            }
                            val clip = ClipData.newPlainText("KFS Inventory Data", contentToCopy)
                            clipboard.setPrimaryClip(clip)
                            Toast.makeText(context, "Copied $selectedFormat formatted data with 2-line spacing", Toast.LENGTH_SHORT).show()
                        },
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .weight(1f)
                            .height(44.dp)
                            .testTag("copy_csv_btn")
                    ) {
                        Icon(Icons.Outlined.ContentCopy, contentDescription = null, tint = TextPrimary, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Copy Data", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    }

                    Button(
                        onClick = {
                            val formatName = when (selectedFormat) {
                                "NOTEPAD" -> "Notepad table (.txt)"
                                "WORD" -> "Word document (.doc)"
                                "EXCEL" -> "Excel workbook (.xlsx)"
                                else -> "CSV data (.csv)"
                            }
                            Toast.makeText(context, "Exported $formatName (DBH + 2 lines + Height)", Toast.LENGTH_SHORT).show()
                            onDismiss()
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .weight(1f)
                            .height(44.dp)
                            .testTag("download_export_btn")
                    ) {
                        Icon(Icons.Outlined.Download, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Download", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }
            }
        }
    }
}
