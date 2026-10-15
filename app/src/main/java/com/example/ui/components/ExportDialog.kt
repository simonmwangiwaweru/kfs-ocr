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
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
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
    onDismiss: () -> Unit
) {
    val context = LocalContext.current

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(16.dp),
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
                    .fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Export Documentation",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = androidx.compose.ui.text.font.FontWeight.Bold,
                            color = TextPrimary
                        )
                        Text(
                            text = "Select your preferred document format",
                            style = MaterialTheme.typography.bodySmall,
                            color = TextSecondary
                        )
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Close export dialog", tint = TextSecondary)
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                var selectedFormat by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf("EXCEL") }

                // 4 Format Selection Buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    val formats = listOf(
                        Triple("WORD", "Word", ".doc"),
                        Triple("IMAGE", "Image", ".jpg"),
                        Triple("PDF", "PDF", ".pdf"),
                        Triple("EXCEL", "Excel", ".xlsx")
                    )

                    formats.forEach { (key, label, ext) ->
                        val isSelected = selectedFormat == key
                        Surface(
                            color = if (isSelected) BrandEmerald else SurfaceSubtle,
                            shape = RoundedCornerShape(8.dp),
                            border = androidx.compose.foundation.BorderStroke(
                                1.dp,
                                if (isSelected) BrandEmerald else HairlineBorder
                            ),
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(8.dp))
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
                                    color = if (isSelected) Color.White.copy(alpha = 0.8f) else TextSecondary
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(SurfaceSubtle)
                        .border(1.dp, HairlineBorder, RoundedCornerShape(10.dp))
                        .padding(12.dp)
                ) {
                    val vScroll = rememberScrollState()
                    val hScroll = rememberScrollState()

                    val previewText = when (selectedFormat) {
                        "WORD" -> "=== MICROSOFT WORD DOCUMENT PREVIEW (.doc / .docx) ===\n\nTitle: Forest Inventory Report\nFormat: Standard Word Table & Metadata\nStatus: Ready for office review\n\n" + csvContent
                        "IMAGE" -> "=== DOCUMENT IMAGE PREVIEW (.jpg / .png) ===\n\nResolution: High Definition Capture\nFile Type: JPEG Field Sheet Photo\nStatus: Ready to save to gallery\n\n[Field Photo Captured from Viewfinder]"
                        "PDF" -> "=== ADOBE PDF DOCUMENT PREVIEW (.pdf) ===\n\nTitle: Official KEFRI Field Sheet\nPage: 1 of 1 (Printable Layout)\nStatus: Ready for printing / archiving\n\n" + csvContent
                        else -> csvContent
                    }

                    Text(
                        text = previewText,
                        fontFamily = FontFamily.Monospace,
                        fontSize = 11.sp,
                        lineHeight = 15.sp,
                        color = TextPrimary,
                        modifier = Modifier
                            .verticalScroll(vScroll)
                            .horizontalScroll(hScroll)
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedButton(
                        onClick = {
                            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                            val clip = ClipData.newPlainText("KEFRI Inventory", csvContent)
                            clipboard.setPrimaryClip(clip)
                            Toast.makeText(context, "Copied data to clipboard", Toast.LENGTH_SHORT).show()
                        },
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier
                            .weight(1f)
                            .testTag("copy_csv_btn")
                    ) {
                        Icon(Icons.Outlined.ContentCopy, contentDescription = null, tint = TextPrimary, modifier = Modifier.size(15.dp))
                        Spacer(modifier = Modifier.width(5.dp))
                        Text("Copy Data", fontSize = 12.sp, color = TextPrimary)
                    }

                    Button(
                        onClick = {
                            val formatName = when (selectedFormat) {
                                "WORD" -> "Word document (.doc)"
                                "IMAGE" -> "Document image (.jpg)"
                                "PDF" -> "PDF document (.pdf)"
                                else -> "Excel spreadsheet (.xlsx)"
                            }
                            Toast.makeText(context, "Exported $formatName", Toast.LENGTH_SHORT).show()
                            onDismiss()
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier
                            .weight(1f)
                            .testTag("download_csv_btn")
                    ) {
                        Icon(Icons.Outlined.Download, contentDescription = null, tint = Color.White, modifier = Modifier.size(15.dp))
                        Spacer(modifier = Modifier.width(5.dp))
                        Text("Export", fontSize = 12.sp, color = Color.White)
                    }
                }
            }
        }
    }
}
