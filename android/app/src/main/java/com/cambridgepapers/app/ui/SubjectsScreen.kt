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
import com.cambridgepapers.app.data.Subject
import kotlinx.coroutines.launch

@Composable
fun SubjectsScreen(navController: NavController) {
    var subjects by remember { mutableStateOf<List<Subject>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        try { subjects = ApiService.getInstance().getFilters().subjects } catch (_: Exception) {}
        loading = false
    }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Subjects", style = MaterialTheme.typography.headlineMedium)
        Text("${subjects.size} subjects", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
        Spacer(modifier = Modifier.height(12.dp))

        if (loading) {
            Box(modifier = Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(subjects) { subject ->
                    Card(
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth().clickable { navController.navigate(Screen.SubjectDetail.createRoute(subject.id)) }
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(subject.name, style = MaterialTheme.typography.bodyLarge)
                            Text("${subject.code} \u00B7 ${subject.qualificationShortName}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                            subject.description?.let {
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f), maxLines = 2)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun SubjectDetailScreen(subjectId: Int, navController: NavController) {
    var data by remember { mutableStateOf<com.cambridgepapers.app.data.SubjectDetailResponse?>(null) }
    var loading by remember { mutableStateOf(true) }
    val scope = rememberCoroutineScope()
    val context = androidx.compose.ui.platform.LocalContext.current

    LaunchedEffect(subjectId) {
        try { data = ApiService.getInstance().getSubjectProgress(subjectId) } catch (_: Exception) {}
        loading = false
    }

    if (loading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        return
    }

    data?.let { detail ->
        LazyColumn(modifier = Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item {
                TextButton(onClick = { navController.popBackStack() }) { Text("\u2190 Back to Subjects") }
                Text(detail.subject.name, style = MaterialTheme.typography.headlineMedium)
                Text("${detail.subject.code} \u00B7 ${detail.subject.qualificationShortName}", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                Spacer(modifier = Modifier.height(8.dp))
                Text("${detail.completed} / ${detail.total} completed (${detail.percentage}%)")
                LinearProgressIndicator(progress = { detail.percentage / 100f }, modifier = Modifier.fillMaxWidth().height(6.dp))
            }

            detail.grouped.toSortedMap(compareByDescending { it.toInt() }).forEach { (year, sessions) ->
                item { Text(year, style = MaterialTheme.typography.titleMedium) }
                sessions.toSortedMap().forEach { (session, papersByNumber) ->
                    val sessionLabel = when (session) { "mj" -> "May/June"; "on" -> "October/November"; else -> session }
                    item { Text(sessionLabel, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)) }
                    papersByNumber.toSortedMap().forEach { (paperNumber, group) ->
                        val groupLabel = group.componentCode ?: "Paper $paperNumber"
                        item {
                            Text(groupLabel, style = MaterialTheme.typography.bodyLarge)
                            Text(group.paperType, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                        }
                        items(group.variants, key = { it.id }) { paper ->
                            PaperCard(paper) { _, _ ->
                                scope.launch {
                                    try { data = ApiService.getInstance().getSubjectProgress(subjectId) } catch (_: Exception) {}
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
