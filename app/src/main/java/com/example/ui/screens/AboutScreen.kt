package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.*

@Composable
fun AboutScreen(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(bottom = 24.dp)
    ) {
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
                    .padding(horizontal = 20.dp, vertical = 18.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(28.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(BrandEmeraldLight),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.Park,
                            contentDescription = null,
                            tint = BrandEmerald,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "KEFRI Field Protocol",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                }
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "Kenya Forestry Research Institute • Inventory Standards",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Purpose Card
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = SurfaceCard,
                border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorder),
                shadowElevation = 1.dp
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Outlined.AutoFixHigh, contentDescription = null, tint = BrandEmerald, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Automated Data Digitization",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "KFS Inventory Scan replaces tedious manual keyboard transcription with an automated vision extraction pipeline. Paper data forms recorded in Kenyan forests are transformed into structured, verified tables ready for research analysis.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextSecondary,
                        lineHeight = 20.sp
                    )
                }
            }

            // Uncertainty & Flagging Protocol
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = FlagAmberBg,
                border = androidx.compose.foundation.BorderStroke(1.dp, FlagAmberBorder)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Warning, contentDescription = null, tint = FlagAmber, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Uncertainty Flagging System",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                            color = FlagAmberText
                        )
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "When handwritten numbers are faint, smudged, or ambiguous, the OCR engine flags that exact cell in warm amber (confidence < 85%). Field reviewers must inspect the side-by-side original image, verify the measurement, and add clarification comments before approving.",
                        style = MaterialTheme.typography.bodySmall,
                        color = FlagAmberText,
                        lineHeight = 18.sp
                    )
                }
            }

            // Field Photography Best Practices
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = SurfaceCard,
                border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorder),
                shadowElevation = 1.dp
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Outlined.CameraAlt, contentDescription = null, tint = BrandEmerald, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Field Photography Guidelines",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    GuidelineItem("1", "Align paper edges within the camera corner brackets.")
                    GuidelineItem("2", "Hold device parallel to sheet to minimize perspective angle.")
                    GuidelineItem("3", "Avoid casting shadows across handwritten numbers.")
                    GuidelineItem("4", "Use Batch Mode when an inventory plot spans multiple pages.")
                }
            }

            // Offline Sync
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = SurfaceCard,
                border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorder),
                shadowElevation = 1.dp
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Outlined.CloudSync, contentDescription = null, tint = BrandEmerald, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Offline Field Operation",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "When working deep inside remote forest canopies without network coverage, all scans and reviewer edits are stored securely on your local device. Once connectivity is restored, records synchronize automatically to headquarters.",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary,
                        lineHeight = 18.sp
                    )
                }
            }
        }
    }
}

@Composable
fun GuidelineItem(num: String, text: String) {
    Row(
        modifier = Modifier.padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(20.dp)
                .clip(CircleShape)
            .background(BrandEmeraldLight),
            contentAlignment = Alignment.Center
        ) {
            Text(num, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = BrandEmeraldDark)
        }
        Spacer(modifier = Modifier.width(10.dp))
        Text(text, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
    }
}
