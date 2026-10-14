package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.ui.components.PaperBackgroundBox
import com.example.ui.screens.HistoryScreen
import com.example.ui.screens.ReviewScreen
import com.example.ui.screens.ScanScreen
import com.example.ui.theme.*
import com.example.viewmodel.InventoryViewModel

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

    BackHandler(enabled = currentTab != 0) {
        viewModel.selectTab(0)
    }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        contentWindowInsets = WindowInsets.safeDrawing,
        bottomBar = {
            // Emil Kowalski style: Razor-sharp white navigation bar with hairline divider
            NavigationBar(
                containerColor = Color.White,
                tonalElevation = 0.dp,
                modifier = Modifier
                    .fillMaxWidth()
                    .border(width = 1.dp, color = HairlineBorder)
                    .testTag("main_bottom_nav")
            ) {
                // Tab 0: Scan
                NavigationBarItem(
                    selected = currentTab == 0,
                    onClick = { viewModel.selectTab(0) },
                    icon = {
                        Icon(
                            imageVector = if (currentTab == 0) Icons.Filled.DocumentScanner else Icons.Outlined.DocumentScanner,
                            contentDescription = "Scan"
                        )
                    },
                    label = { Text("Scan", fontSize = 11.sp, fontWeight = if (currentTab == 0) androidx.compose.ui.text.font.FontWeight.SemiBold else androidx.compose.ui.text.font.FontWeight.Medium) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = BrandEmerald,
                        selectedTextColor = BrandEmerald,
                        unselectedIconColor = TextSecondary,
                        unselectedTextColor = TextSecondary,
                        indicatorColor = BrandEmeraldLight
                    ),
                    modifier = Modifier.testTag("nav_scan")
                )

                // Tab 1: Side-by-Side Review
                NavigationBarItem(
                    selected = currentTab == 1,
                    onClick = { viewModel.selectTab(1) },
                    icon = {
                        Icon(
                            imageVector = if (currentTab == 1) Icons.Filled.RateReview else Icons.Outlined.RateReview,
                            contentDescription = "Review"
                        )
                    },
                    label = { Text("Review", fontSize = 11.sp, fontWeight = if (currentTab == 1) androidx.compose.ui.text.font.FontWeight.SemiBold else androidx.compose.ui.text.font.FontWeight.Medium) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = BrandEmerald,
                        selectedTextColor = BrandEmerald,
                        unselectedIconColor = TextSecondary,
                        unselectedTextColor = TextSecondary,
                        indicatorColor = BrandEmeraldLight
                    ),
                    modifier = Modifier.testTag("nav_review")
                )

                // Tab 2: Document Archive
                NavigationBarItem(
                    selected = currentTab == 2,
                    onClick = { viewModel.selectTab(2) },
                    icon = {
                        Icon(
                            imageVector = if (currentTab == 2) Icons.Filled.Folder else Icons.Outlined.Folder,
                            contentDescription = "Archive"
                        )
                    },
                    label = { Text("Archive", fontSize = 11.sp, fontWeight = if (currentTab == 2) androidx.compose.ui.text.font.FontWeight.SemiBold else androidx.compose.ui.text.font.FontWeight.Medium) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = BrandEmerald,
                        selectedTextColor = BrandEmerald,
                        unselectedIconColor = TextSecondary,
                        unselectedTextColor = TextSecondary,
                        indicatorColor = BrandEmeraldLight
                    ),
                    modifier = Modifier.testTag("nav_archive")
                )
            }
        }
    ) { innerPadding ->
        PaperBackgroundBox(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            when (currentTab) {
                0 -> ScanScreen(viewModel = viewModel)
                1 -> ReviewScreen(viewModel = viewModel)
                2 -> HistoryScreen(viewModel = viewModel)
            }
        }
    }
}
