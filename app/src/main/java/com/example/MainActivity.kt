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
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()

    BackHandler(enabled = drawerState.isOpen || currentTab != 0) {
        if (drawerState.isOpen) {
            scope.launch { drawerState.close() }
        } else {
            viewModel.selectTab(0)
        }
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet(
                drawerContainerColor = SurfaceCard,
                modifier = Modifier.widthIn(max = 310.dp)
            ) {
                // Official KFS Header
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(BrandEmeraldDark)
                        .padding(18.dp)
                        .statusBarsPadding()
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(BrandEmerald),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.Park, contentDescription = null, tint = Color.White, modifier = Modifier.size(24.dp))
                        }
                        Column {
                            Text("KENYA FOREST SERVICE", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Black)
                            Text("Field Biometrics Division", color = Color.White.copy(alpha = 0.8f), fontSize = 11.sp)
                        }
                    }
                    Spacer(modifier = Modifier.height(14.dp))
                    Surface(
                        color = Color.White.copy(alpha = 0.15f),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Column(modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)) {
                            Text("OFFICER: Forester J. Mwangi", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            Text("BADGE: KFS-BIO-4819 • Comp 14", color = Color.White.copy(alpha = 0.9f), fontSize = 10.sp, fontFamily = FontFamily.Monospace)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = "FIELD NAVIGATION",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextSecondary,
                    modifier = Modifier.padding(horizontal = 18.dp, vertical = 6.dp)
                )

                NavigationDrawerItem(
                    icon = { Icon(Icons.Default.DocumentScanner, contentDescription = null, tint = if (currentTab == 0) BrandEmerald else TextSecondary) },
                    label = { Text("Field Scanner (Optics Reticle)", fontSize = 13.sp) },
                    selected = currentTab == 0,
                    onClick = {
                        viewModel.selectTab(0)
                        scope.launch { drawerState.close() }
                    },
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 2.dp)
                )


                NavigationDrawerItem(
                    icon = { Icon(Icons.Default.Folder, contentDescription = null, tint = if (currentTab == 2) BrandEmerald else TextSecondary) },
                    label = { Text("Plot Tally Archive & Search", fontSize = 13.sp) },
                    selected = currentTab == 2,
                    onClick = {
                        viewModel.selectTab(2)
                        scope.launch { drawerState.close() }
                    },
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 2.dp)
                )

                NavigationDrawerItem(
                    icon = { Icon(Icons.Default.Settings, contentDescription = null, tint = if (currentTab == 3) BrandEmerald else TextSecondary) },
                    label = { Text("Station Parameters & Form Rules", fontSize = 13.sp) },
                    selected = currentTab == 3,
                    onClick = {
                        viewModel.selectTab(3)
                        scope.launch { drawerState.close() }
                    },
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 2.dp)
                )

                Divider(modifier = Modifier.padding(vertical = 12.dp, horizontal = 16.dp), color = HairlineBorderSubtle)

                Text(
                    text = "FIELD TELEMETRY & SYNC",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextSecondary,
                    modifier = Modifier.padding(horizontal = 18.dp, vertical = 4.dp)
                )

                NavigationDrawerItem(
                    icon = { Icon(Icons.Default.CloudSync, contentDescription = null, tint = BrandEmerald) },
                    label = { Text("Sync with KFS Central Server", fontSize = 13.sp) },
                    selected = false,
                    onClick = {
                        scope.launch { drawerState.close() }
                        viewModel.syncAll()
                    },
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 2.dp)
                )

                NavigationDrawerItem(
                    icon = { Icon(if (isOffline) Icons.Default.SignalCellularOff else Icons.Default.SignalCellularAlt, contentDescription = null, tint = if (isOffline) FlagAmberText else BrandEmerald) },
                    label = { Text(if (isOffline) "Offline Mode (Active)" else "Cloud Sync (Active)", fontSize = 13.sp) },
                    selected = false,
                    onClick = {
                        scope.launch { drawerState.close() }
                        viewModel.toggleOffline()
                    },
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 2.dp)
                )

                Spacer(modifier = Modifier.weight(1f))

                Surface(
                    color = SurfaceSubtle,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Text("Form AGW-85-01 Standard Tally", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        Text("Republic of Kenya • KEFRI Biometrics v2.4", fontSize = 10.sp, color = TextSecondary)
                    }
                }
            }
        }
    ) {
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
                        // The three lines: Opens the Official KFS Navigation Drawer
                        IconButton(
                            onClick = { scope.launch { drawerState.open() } },
                            modifier = Modifier.size(38.dp)
                        ) {
                            Icon(Icons.Default.Menu, contentDescription = "Open Navigation Menu", tint = TextPrimary)
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
}
