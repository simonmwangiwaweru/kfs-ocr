package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.ui.screens.HistoryScreen
import com.example.ui.screens.ReviewScreen
import com.example.ui.screens.ScanScreen
import com.example.ui.screens.SettingsScreen
import com.example.ui.theme.*
import com.example.viewmodel.InventoryViewModel
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            MyApplicationTheme {
                KfsInventoryApp()
            }
        }
    }
}

@Composable
fun KfsInventoryApp(viewModel: InventoryViewModel = viewModel()) {
    val currentTab by viewModel.currentTab.collectAsState()
    val isOffline by viewModel.isOffline.collectAsState()
    BackHandler(enabled = currentTab != 0) {
        viewModel.selectTab(0)
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(AppBackground)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .windowInsetsPadding(WindowInsets.statusBars)
        ) {
            // Global TopAppBar
            Surface(
                color = SurfaceCard,
                shadowElevation = 1.dp,
                modifier = Modifier
                    .fillMaxWidth()
                    .border(width = 0.5.dp, color = HairlineBorderSubtle)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Official KFS Shield Crest (Replaces old unused hamburger menu)
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = BrandEmeraldLight,
                        border = androidx.compose.foundation.BorderStroke(1.dp, BrandEmerald.copy(alpha = 0.3f)),
                        modifier = Modifier.size(38.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                Icons.Default.Park,
                                contentDescription = "Kenya Forest Service Crest",
                                tint = BrandEmerald,
                                modifier = Modifier.size(22.dp)
                            )
                        }
                    }

                        // Center Wordmark + Sync LED Pill
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text(text = "KFS", fontSize = 18.sp, fontWeight = FontWeight.Black, color = TextPrimary)
                                Text(text = "Scan", fontSize = 18.sp, fontWeight = FontWeight.Black, color = BrandEmerald)
                            }

                            Surface(
                                color = SecondaryFixed.copy(alpha = 0.45f),
                                shape = RoundedCornerShape(9999.dp),
                                border = androidx.compose.foundation.BorderStroke(1.dp, SecondaryContainer.copy(alpha = 0.5f)),
                                modifier = Modifier.padding(top = 2.dp)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(6.dp)
                                            .clip(CircleShape)
                                            .background(if (isOffline) FlagAmber else VerifiedGreen)
                                    )
                                    Text(
                                        text = if (isOffline) "OFFLINE QUEUE" else "CLOUD SYNC READY",
                                        fontSize = 9.sp,
                                        fontFamily = FontFamily.Monospace,
                                        fontWeight = FontWeight.Bold,
                                        color = if (isOffline) FlagAmberText else BrandEmeraldDark
                                    )
                                }
                            }
                        }

                        IconButton(
                            onClick = { viewModel.selectTab(2) }, // Switch to Archive & Search
                            modifier = Modifier.size(38.dp)
                        ) {
                            Icon(Icons.Default.Search, contentDescription = "Search Archive", tint = TextPrimary)
                        }
                    }
                }

                // Screen Content Area
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                ) {
                    when (currentTab) {
                        0 -> ScanScreen(viewModel = viewModel)
                        1 -> ReviewScreen(viewModel = viewModel)
                        2 -> HistoryScreen(viewModel = viewModel)
                        3 -> SettingsScreen(viewModel = viewModel)
                    }
                }
            }

            // Global Bottom Navigation Bar (Floating Pill Dock with full 4-tab access)
            Surface(
                color = SurfaceCard,
                shape = RoundedCornerShape(9999.dp),
                shadowElevation = 10.dp,
                border = androidx.compose.foundation.BorderStroke(1.dp, HairlineBorderSubtle),
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp)
                    .height(64.dp)
                    .testTag("floating_bottom_nav")
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Tab 1: Archive (Left)
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier
                            .clickable { viewModel.selectTab(2) }
                            .padding(horizontal = 6.dp, vertical = 4.dp)
                            .testTag("nav_archive")
                    ) {
                        Icon(
                            if (currentTab == 2) Icons.Filled.Folder else Icons.Outlined.Folder,
                            contentDescription = "Archive",
                            tint = if (currentTab == 2) BrandEmerald else TextSecondary,
                            modifier = Modifier.size(22.dp)
                        )
                        Text(
                            text = "Archive",
                            fontSize = 10.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = if (currentTab == 2) FontWeight.Bold else FontWeight.Medium,
                            color = if (currentTab == 2) BrandEmerald else TextSecondary
                        )
                    }


                    // Raised Center Scan Button with Halo Ring
                    Box(
                        modifier = Modifier
                            .offset(y = (-12).dp)
                            .size(58.dp)
                            .clip(CircleShape)
                            .background(BrandEmeraldLight)
                            .border(3.dp, BrandEmeraldLight, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .clip(CircleShape)
                                .background(BrandEmerald)
                                .clickable { viewModel.selectTab(0) }
                                .testTag("nav_scan_fab"),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Default.DocumentScanner,
                                contentDescription = "Scan",
                                tint = Color.White,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                    }

                    // Tab 3: Settings (Right)
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier
                            .clickable { viewModel.selectTab(3) }
                            .padding(horizontal = 6.dp, vertical = 4.dp)
                            .testTag("nav_settings")
                    ) {
                        Icon(
                            if (currentTab == 3) Icons.Filled.Settings else Icons.Outlined.Settings,
                            contentDescription = "Settings",
                            tint = if (currentTab == 3) BrandEmerald else TextSecondary,
                            modifier = Modifier.size(22.dp)
                        )
                        Text(
                            text = "Settings",
                            fontSize = 10.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = if (currentTab == 3) FontWeight.Bold else FontWeight.Medium,
                            color = if (currentTab == 3) BrandEmerald else TextSecondary
                        )
                    }
                }
            }
        }
}
