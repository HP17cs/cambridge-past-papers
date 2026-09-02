package com.cambridgepapers.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavType
import androidx.navigation.compose.*
import androidx.navigation.navArgument
import com.cambridgepapers.app.data.ApiService

sealed class Screen(val route: String, val label: String, val icon: ImageVector) {
    object Dashboard : Screen("dashboard", "Home", Icons.Default.Home)
    object Papers : Screen("papers", "Papers", Icons.Default.MenuBook)
    object Progress : Screen("progress", "Progress", Icons.Default.BarChart)
    object Settings : Screen("settings", "Settings", Icons.Default.Settings)
    object Login : Screen("login", "Login", Icons.Default.Login)
    object Subjects : Screen("subjects", "Subjects", Icons.Default.LibraryBooks)
    object SubjectDetail : Screen("subject/{id}", "Subject", Icons.Default.LibraryBooks) {
        fun createRoute(id: Int) = "subject/$id"
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CambridgePapersApp() {
    var isLoggedIn by remember { mutableStateOf(false) }
    var token by remember { mutableStateOf<String?>(null) }

    val navController = rememberNavController()
    val bottomBarScreens = listOf(Screen.Dashboard, Screen.Papers, Screen.Progress, Screen.Settings)
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val showBottomBar = currentRoute in bottomBarScreens.map { it.route }

    if (!isLoggedIn) {
        LoginScreen(
            onLoginSuccess = { newToken ->
                token = newToken
                ApiService.setToken(newToken)
                isLoggedIn = true
                navController.navigate(Screen.Dashboard.route) {
                    popUpTo(Screen.Login.route) { inclusive = true }
                }
            }
        )
    } else {
        Scaffold(
            bottomBar = {
                if (showBottomBar) {
                    NavigationBar {
                        bottomBarScreens.forEach { screen ->
                            NavigationBarItem(
                                icon = { Icon(screen.icon, contentDescription = screen.label) },
                                label = { Text(screen.label) },
                                selected = currentRoute == screen.route,
                                onClick = {
                                    navController.navigate(screen.route) {
                                        popUpTo(Screen.Dashboard.route) { saveState = true }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                }
                            )
                        }
                    }
                }
            }
        ) { padding ->
            NavHost(
                navController = navController,
                startDestination = Screen.Dashboard.route,
                modifier = Modifier.padding(padding)
            ) {
                composable(Screen.Dashboard.route) { DashboardScreen(navController) }
                composable(Screen.Papers.route) { PapersScreen(navController) }
                composable(Screen.Progress.route) { ProgressScreen() }
                composable(Screen.Settings.route) {
                    SettingsScreen(onLogout = {
                        isLoggedIn = false
                        token = null
                        ApiService.setToken(null)
                        navController.navigate(Screen.Login.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    })
                }
                composable(Screen.Subjects.route) { SubjectsScreen(navController) }
                composable(
                    Screen.SubjectDetail.route,
                    arguments = listOf(navArgument("id") { type = NavType.IntType })
                ) { backStackEntry ->
                    val id = backStackEntry.arguments?.getInt("id") ?: return@composable
                    SubjectDetailScreen(id, navController)
                }
            }
        }
    }
}
