package com.cambridgepapers.app.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.cambridgepapers.app.data.ApiService
import com.cambridgepapers.app.data.StatsResponse
import kotlinx.coroutines.launch

@Composable
fun DashboardScreen(navController: NavController) {
    var stats by remember { mutableStateOf<StatsResponse?>(null) }
    var loading by remember { mutableStateOf(true) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        try {
            stats = ApiService.getInstance().getStats()
        } catch (e: Exception) { }
        loading = false
    }

    if (loading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text("Dashboard", style = MaterialTheme.typography.headlineMedium)
            stats?.let { s ->
                Text("${s.completed} / ${s.total} papers completed", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
            }
        }

        stats?.let { s ->
            item {
                Card(shape = RoundedCornerShape(12.dp)) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Text("${s.completed} / ${s.total}", style = MaterialTheme.typography.headlineLarge)
                        Text("papers completed", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        Spacer(modifier = Modifier.height(12.dp))
                        LinearProgressIndicator(
                            progress = { if (s.total > 0) s.completed.toFloat() / s.total else 0f },
                            modifier = Modifier.fillMaxWidth().height(8.dp),
                            trackColor = MaterialTheme.colorScheme.surfaceVariant,
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("${s.percentage}% complete", style = MaterialTheme.typography.bodySmall)
                    }
                }
            }

            item {
                Text("Progress by Subject", style = MaterialTheme.typography.titleMedium)
            }

            items(s.bySubject.filter { it.completedCount > 0 }) { subject ->
                Card(shape = RoundedCornerShape(8.dp)) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("${subject.name} (${subject.code})", style = MaterialTheme.typography.bodyMedium)
                            Text("${subject.completedCount}/${subject.total}", style = MaterialTheme.typography.bodySmall)
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        LinearProgressIndicator(
                            progress = { if (subject.total > 0) subject.completedCount.toFloat() / subject.total else 0f },
                            modifier = Modifier.fillMaxWidth().height(4.dp),
                        )
                    }
                }
            }

            if (s.recent.isNotEmpty()) {
                item { Text("Recently Completed", style = MaterialTheme.typography.titleMedium) }
                items(s.recent) { paper ->
                    Card(shape = RoundedCornerShape(8.dp)) {
                        Row(modifier = Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                            Column {
                                Text("${paper.subjectName} - ${paper.displayLabel()}", style = MaterialTheme.typography.bodyMedium)
                                Text("${paper.year} ${paper.sessionLabel()}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                            }
                            SuggestionChip(onClick = {}, label = { Text("Done", style = MaterialTheme.typography.labelSmall) })
                        }
                    }
                }
            }
        }
    }
}
