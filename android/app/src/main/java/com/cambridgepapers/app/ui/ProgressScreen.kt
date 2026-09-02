package com.cambridgepapers.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.cambridgepapers.app.data.ApiService
import com.cambridgepapers.app.data.StatsResponse
import kotlinx.coroutines.launch

@Composable
fun ProgressScreen() {
    var stats by remember { mutableStateOf<StatsResponse?>(null) }
    var loading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        try { stats = ApiService.getInstance().getStats() } catch (_: Exception) {}
        loading = false
    }

    if (loading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        return
    }

    stats?.let { s ->
        LazyColumn(modifier = Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item {
                Text("Progress", style = MaterialTheme.typography.headlineMedium)
                Text("Your Cambridge past paper completion", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
            }

            item {
                Card(shape = RoundedCornerShape(16.dp)) {
                    Column(modifier = Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("${s.completed} / ${s.total}", style = MaterialTheme.typography.headlineLarge)
                        Text("papers completed", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        Spacer(modifier = Modifier.height(16.dp))
                        LinearProgressIndicator(
                            progress = { if (s.total > 0) s.completed.toFloat() / s.total else 0f },
                            modifier = Modifier.fillMaxWidth().height(8.dp),
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("${s.percentage}% complete", style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }

            item { Text("Progress by Subject", style = MaterialTheme.typography.titleMedium) }

            items(s.bySubject) { subject ->
                val pct = if (subject.total > 0) (subject.completedCount * 100 / subject.total) else 0
                Card(shape = RoundedCornerShape(8.dp)) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Column {
                                Text(subject.name, style = MaterialTheme.typography.bodyMedium)
                                Text("${subject.code} \u00B7 ${subject.qualification}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                            }
                            Text("${subject.completedCount}/${subject.total}", style = MaterialTheme.typography.bodySmall)
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        LinearProgressIndicator(
                            progress = { if (subject.total > 0) subject.completedCount.toFloat() / subject.total else 0f },
                            modifier = Modifier.fillMaxWidth().height(4.dp),
                        )
                        Text("$pct%", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                    }
                }
            }
        }
    }
}
