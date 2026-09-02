package com.cambridgepapers.app.ui

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.cambridgepapers.app.data.*
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PapersScreen(navController: NavController) {
    var searchQuery by remember { mutableStateOf("") }
    var papers by remember { mutableStateOf<List<Paper>>(emptyList()) }
    var total by remember { mutableIntStateOf(0) }
    var loading by remember { mutableStateOf(true) }
    var filters by remember { mutableStateOf<FilterResponse?>(null) }
    var selectedQualification by remember { mutableStateOf("") }
    var selectedYear by remember { mutableIntStateOf(0) }
    var selectedSession by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        try { filters = ApiService.getInstance().getFilters() } catch (_: Exception) {}
        loadPapers(searchQuery, null, null, null, null)
    }

    fun loadPapers(q: String?, qualification: String?, year: Int?, session: String?, status: String?) {
        scope.launch {
            loading = true
            try {
                val response = ApiService.getInstance().getPapers(
                    query = q, qualification = qualification, year = year, session = session, status = status
                )
                papers = response.papers
                total = response.total
            } catch (_: Exception) {}
            loading = false
        }
    }

    var searchJob by remember { mutableStateOf<Job?>(null) }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Past Papers", style = MaterialTheme.typography.headlineMedium)
        Text("$total papers found", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = searchQuery,
            onValueChange = { query ->
                searchQuery = query
                searchJob?.cancel()
                searchJob = scope.launch {
                    delay(300)
                    loadPapers(query.ifEmpty { null }, selectedQualification.ifEmpty { null }, if (selectedYear > 0) selectedYear else null, selectedSession.ifEmpty { null }, null)
                }
            },
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("Search (e.g. Physics 5054 2026)...") },
            leadingIcon = { Icon(Icons.Default.Search, null) },
            singleLine = true,
            shape = RoundedCornerShape(12.dp)
        )

        Spacer(modifier = Modifier.height(8.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            filters?.let { f ->
                FilterDropdown("All", f.qualifications, selectedQualification, { selectedQualification = it; loadPapers(searchQuery.ifEmpty { null }, it.ifEmpty { null }, if (selectedYear > 0) selectedYear else null, selectedSession.ifEmpty { null }, null) })
                FilterDropdown("All Years", f.years.map { it.toString() }, if (selectedYear > 0) selectedYear.toString() else "", { selectedYear = it.toIntOrNull() ?: 0; loadPapers(searchQuery.ifEmpty { null }, selectedQualification.ifEmpty { null }, selectedYear, selectedSession.ifEmpty { null }, null) })
                FilterDropdown("All Sessions", f.sessions, selectedSession, { selectedSession = it; loadPapers(searchQuery.ifEmpty { null }, selectedQualification.ifEmpty { null }, if (selectedYear > 0) selectedYear else null, it.ifEmpty { null }, null) })
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        if (loading) {
            Box(modifier = Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(papers, key = { it.id }) { paper ->
                    PaperCard(paper) { paperId, completed ->
                        papers = papers.map { if (it.id == paperId) it.copy(completed = if (completed) 1 else 0) else it }
                    }
                }
            }
        }
    }
}

@Composable
fun FilterDropdown(label: String, options: List<String>, selected: String, onSelect: (String) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    Box {
        OutlinedButton(onClick = { expanded = true }) {
            Text(if (selected.isEmpty()) label else selected, style = MaterialTheme.typography.labelSmall)
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            DropdownMenuItem(text = { Text(label) }, onClick = { onSelect(""); expanded = false })
            options.forEach { option ->
                DropdownMenuItem(text = { Text(option) }, onClick = { onSelect(option); expanded = false })
            }
        }
    }
}

@Composable
fun PaperCard(paper: Paper, onToggle: (Int, Boolean) -> Unit) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val isCompleted = paper.completed == 1

    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = if (isCompleted) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f) else MaterialTheme.colorScheme.surface),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = {
                scope.launch {
                    try {
                        val response = ApiService.getInstance().toggleProgress(ToggleRequest(paper.id))
                        onToggle(paper.id, response.completed)
                    } catch (_: Exception) {}
                }
            }) {
                Icon(
                    Icons.Default.Check,
                    contentDescription = "Toggle",
                    tint = if (isCompleted) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f)
                )
            }

            Column(modifier = Modifier.weight(1f).padding(start = 8.dp)) {
                Text(paper.displayLabel(), style = MaterialTheme.typography.bodyMedium)
                Text("${paper.subjectName} (${paper.subjectCode})", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                Text("${paper.year} ${paper.sessionLabel()}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f))
            }

            Column(horizontalAlignment = Alignment.End) {
                paper.questionPaperUrl?.let { url ->
                    TextButton(onClick = {
                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                    }) { Text("Paper", style = MaterialTheme.typography.labelSmall) }
                }
                paper.markSchemeUrl?.let { url ->
                    TextButton(onClick = {
                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                    }) { Text("Mark Scheme", style = MaterialTheme.typography.labelSmall) }
                }
            }
        }
    }
}
