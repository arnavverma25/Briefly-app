package com.briefly

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.Description
import androidx.compose.material.icons.outlined.Link
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.briefly.data.*
import com.briefly.ui.BrieflyViewModel

// --- Helper Functions ---

fun getGreeting(): String {
    val hour = java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY)
    return when (hour) {
        in 5..11 -> "Good Morning!"
        in 12..17 -> "Good Afternoon!"
        else -> "Good Evening!"
    }
}

// --- UI Components ---

@Composable
fun MainActivityScreen(viewModel: BrieflyViewModel = viewModel()) {
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(viewModel.errorMessage) {
        viewModel.errorMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.errorMessage = null
        }
    }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        containerColor = Color(0xFFF8FAFC),
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { innerPadding ->
        Box(modifier = Modifier.fillMaxSize().padding(innerPadding)) {
            
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp)
            ) {
                // Header (Fixed)
                Row(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Briefly",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF0F172A)
                    )
                }

                // List
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    // Move Intro here so it scrolls
                    item {
                        Column {
                            Text(
                                text = getGreeting(),
                                fontSize = 28.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = Color(0xFF0F172A)
                            )
                            Text(
                                text = "Add articles to create your briefing.",
                                fontSize = 14.sp,
                                color = Color(0xFF64748B),
                                modifier = Modifier.padding(bottom = 24.dp)
                            )
                        }
                    }

                    items(viewModel.articles) { article ->
                        ArticleInput(
                            article = article,
                            onRemove = { viewModel.removeArticle(article) },
                            onToggleType = { viewModel.toggleArticleType(article) },
                            onUpdate = { str -> viewModel.updateContent(article, str) }
                        )
                    }
                    
                    item {
                        Button(
                            onClick = { viewModel.addArticle() },
                            modifier = Modifier.fillMaxWidth().height(56.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color.White),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0)),
                            shape = RoundedCornerShape(16.dp)
                        ) {
                            Icon(Icons.Default.Add, contentDescription = null, tint = Color(0xFF94A3B8))
                            Spacer(Modifier.width(8.dp))
                            Text("Add Article", color = Color(0xFF94A3B8))
                        }
                    }

                    item {
                        // Config Section
                        Text("VIBE", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF94A3B8), modifier = Modifier.padding(top = 24.dp, bottom = 8.dp))
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(PERSONAS) { persona ->
                                FilterChip(
                                    selected = viewModel.selectedPersona == persona,
                                    onClick = { viewModel.selectedPersona = persona },
                                    label = { Text(persona) }
                                )
                            }
                        }

                        Text("VOICE", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF94A3B8), modifier = Modifier.padding(top = 16.dp, bottom = 8.dp))
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(VOICES) { voice ->
                                VoiceChip(
                                    name = voice, 
                                    isSelected = viewModel.selectedVoice == voice,
                                    onClick = { viewModel.selectedVoice = voice }
                                )
                            }
                        }
                        
                        Spacer(Modifier.height(100.dp)) // Spacing for FAB
                    }
                }
            }

            // Generate Button
            Box(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(16.dp)
                    .fillMaxWidth()
            ) {
                Button(
                    onClick = { viewModel.generateBriefing() },
                    enabled = !viewModel.isLoading,
                    modifier = Modifier.fillMaxWidth().height(60.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0F172A))
                ) {
                    if (viewModel.isLoading) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(8.dp))
                        Text(viewModel.statusMessage)
                    } else {
                        Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = Color(0xFF67E8F9))
                        Spacer(Modifier.width(8.dp))
                        Text("Generate Briefing", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
            
            // Player Bottom Sheet
            AnimatedVisibility(
                visible = viewModel.isPlayerVisible,
                enter = slideInVertically(initialOffsetY = { it }),
                exit = slideOutVertically(targetOffsetY = { it }),
                modifier = Modifier.align(Alignment.BottomCenter)
            ) {
                PlayerOverlay(viewModel)
            }
        }
    }
}

@Composable
fun ArticleInput(
    article: Article, 
    onRemove: () -> Unit, 
    onToggleType: () -> Unit,
    onUpdate: (String) -> Unit
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Row(Modifier.background(Color(0xFFF1F5F9), RoundedCornerShape(8.dp)).padding(4.dp)) {
                    IconButton(onClick = onToggleType, modifier = Modifier.size(28.dp)) {
                        Icon(
                            if (article.type == "text") Icons.Outlined.Description else Icons.Outlined.Link,
                            contentDescription = null,
                            tint = if (article.type == "text") Color(0xFF0F172A) else Color(0xFF0891B2),
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
                IconButton(onClick = onRemove, modifier = Modifier.size(28.dp)) {
                    Icon(Icons.Default.DeleteOutline, contentDescription = null, tint = Color(0xFFCBD5E1))
                }
            }
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = article.content,
                onValueChange = onUpdate,
                placeholder = { Text(if (article.type == "text") "Paste text here..." else "https://example.com/news") },
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    unfocusedBorderColor = Color.Transparent,
                    focusedBorderColor = Color.Transparent
                )
            )
        }
    }
}

@Composable
fun VoiceChip(name: String, isSelected: Boolean, onClick: () -> Unit) {
    val flower = when(name) {
        "Fenrir" -> "🌹"
        "Puck" -> "🌻"
        "Kore" -> "🌸"
        "Zephyr" -> "🌷"
        "Charon" -> "🏵️"
        else -> "🌼"
    }
    
    // Extremely light gradient (practically white) for maximum emoji visibility
    val selectedBrush = Brush.linearGradient(
        colors = listOf(
            Color(0xFFF8FEFF), // Near-white Cyan
            Color(0xFFFAFDFF)  // Near-white Blue
        )
    )

    Card(
        onClick = onClick,
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) Color.Transparent else Color.White
        ),
        modifier = Modifier.size(80.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    if (isSelected) selectedBrush else androidx.compose.ui.graphics.SolidColor(Color.White)
                ),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text(text = flower, fontSize = 32.sp)
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = name,
                    fontSize = 12.sp,
                    // Darker Cyan for high contrast on very light background
                    color = if (isSelected) Color(0xFF0E7490) else Color(0xFF64748B),
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

@Composable
fun PlayerOverlay(viewModel: BrieflyViewModel) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F172A))
    ) {
        // Header
        Row(
            Modifier.fillMaxWidth().padding(16.dp), 
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = { viewModel.isPlayerVisible = false }) {
                Icon(Icons.Default.KeyboardArrowDown, contentDescription = null, tint = Color.White)
            }
            Text("Now Playing", color = Color.White.copy(alpha = 0.5f), fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
            Spacer(Modifier.width(48.dp))
        }
        
        // Content Area
        Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
            if (viewModel.viewMode == "Visualizer") {
                Column(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(modifier = Modifier.height(200.dp).fillMaxWidth()) {
                        AudioVisualizer(isPlaying = viewModel.isPlaying)
                    }
                    
                    Spacer(Modifier.height(32.dp))
                    
                    Text(
                        text = "AI GENERATED • ${viewModel.selectedPersona.uppercase()}",
                        color = Color(0xFF67E8F9),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier
                            .background(Color(0xFF67E8F9).copy(alpha = 0.2f), CircleShape)
                            .padding(horizontal = 12.dp, vertical = 6.dp)
                    )
                    Spacer(Modifier.height(16.dp))
                    Text(
                        text = viewModel.generatedHeadline ?: "Daily Briefing",
                        color = Color.White,
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                        modifier = Modifier.padding(horizontal = 32.dp)
                    )
                }
            } else {
                // Transcript View with Auto-Scroll and Highlight
                Column(Modifier.fillMaxSize()) {
                    Text(
                        text = "TRANSCRIPT",
                        color = Color.White.copy(alpha = 0.5f),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(start = 24.dp, bottom = 16.dp)
                    )
                    
                    Box(Modifier.fillMaxSize().padding(horizontal = 24.dp)) {
                        val scrollState = rememberScrollState()
                        var layoutResult by remember { mutableStateOf<TextLayoutResult?>(null) }
                        
                        // Auto-scroll logic
                        LaunchedEffect(viewModel.activeTokenIndex) {
                            val layout = layoutResult ?: return@LaunchedEffect
                            if (viewModel.activeTokenIndex >= 0 && viewModel.activeTokenIndex < viewModel.scriptTokens.size) {
                                // Calculate offset to the start of the active token
                                var offset = 0
                                for (i in 0 until viewModel.activeTokenIndex) {
                                    offset += viewModel.scriptTokens[i].word.length + 1 // +1 for space
                                }
                                
                                // Get the line top and scroll
                                if (offset < layout.layoutInput.text.length) {
                                    val line = layout.getLineForOffset(offset)
                                    val lineTop = layout.getLineTop(line)
                                    // Scroll so the line is somewhat centered or at top (minus padding)
                                    scrollState.animateScrollTo(maxOf(0, lineTop.toInt() - 100))
                                }
                            }
                        }

                        val annotatedString = buildAnnotatedString {
                            viewModel.scriptTokens.forEachIndexed { index, token ->
                                val color = when {
                                    index == viewModel.activeTokenIndex -> Color(0xFF67E8F9) // Cyan
                                    index < viewModel.activeTokenIndex -> Color.White
                                    else -> Color(0xFF64748B) // Slate 500
                                }
                                
                                // Active word larger/bolder
                                val fontWeight = if (index == viewModel.activeTokenIndex) FontWeight.Bold else FontWeight.Normal
                                
                                withStyle(style = SpanStyle(color = color, fontSize = 18.sp, fontWeight = fontWeight)) {
                                    append(token.word)
                                    append(" ")
                                }
                            }
                        }

                        Text(
                            text = annotatedString,
                            modifier = Modifier
                                .verticalScroll(scrollState)
                                .padding(bottom = 100.dp),
                            style = androidx.compose.ui.text.TextStyle(height = 28.sp),
                            onTextLayout = { layoutResult = it }
                        )
                    }
                }
            }
        }
        
        // Controls Section
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp)
        ) {
            // Slider
            Slider(
                value = viewModel.currentProgress,
                onValueChange = { viewModel.seekTo(it) },
                colors = SliderDefaults.colors(
                    thumbColor = Color(0xFF67E8F9),
                    activeTrackColor = Color(0xFF67E8F9),
                    inactiveTrackColor = Color.White.copy(alpha = 0.2f)
                )
            )
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(formatTime((viewModel.currentProgress * (viewModel.durationMs / 1000)).toLong()), color = Color.Gray, fontSize = 12.sp)
                Text(formatTime((viewModel.durationMs / 1000)), color = Color.Gray, fontSize = 12.sp)
            }
            
            Spacer(Modifier.height(16.dp))
            
            // Buttons
            Row(
                Modifier.fillMaxWidth(), 
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                 // View Toggle
                 Button(
                     onClick = { viewModel.viewMode = if (viewModel.viewMode == "Visualizer") "Transcript" else "Visualizer" },
                     colors = ButtonDefaults.buttonColors(containerColor = Color.White.copy(alpha = 0.1f)),
                     modifier = Modifier.height(36.dp),
                     contentPadding = PaddingValues(horizontal = 16.dp, vertical = 0.dp)
                 ) {
                     Text(if (viewModel.viewMode == "Visualizer") "Transcript" else "Visualizer", fontSize = 12.sp)
                 }
                 
                 Spacer(Modifier.width(32.dp))

                 // Play/Pause
                 IconButton(
                    onClick = { viewModel.togglePlay() },
                    modifier = Modifier
                        .size(64.dp)
                        .background(Color.White, CircleShape)
                ) {
                    Icon(
                        if (viewModel.isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow, 
                        contentDescription = null, 
                        modifier = Modifier.size(32.dp),
                        tint = Color(0xFF0F172A)
                    )
                }
                
                Spacer(Modifier.width(100.dp)) // Balance the row visually
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

fun formatTime(seconds: Long): String {
    val m = seconds / 60
    val s = seconds % 60
    return "%d:%02d".format(m, s)
}

@Composable
fun AudioVisualizer(isPlaying: Boolean) {
    // Simple animated bars
    Row(
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.height(100.dp).fillMaxWidth()
    ) {
        val infiniteTransition = rememberInfiniteTransition(label = "bars")
        repeat(5) { i ->
            val height by infiniteTransition.animateFloat(
                initialValue = 0.2f,
                targetValue = 1f,
                animationSpec = infiniteRepeatable(
                    animation = tween(500, delayMillis = i * 100, easing = LinearEasing),
                    repeatMode = RepeatMode.Reverse
                ),
                label = "barHeight"
            )
            
            Box(
                modifier = Modifier
                    .padding(4.dp)
                    .width(16.dp)
                    .fillMaxHeight(if (isPlaying) height else 0.1f)
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(Color(0xFF818CF8), Color(0xFFC084FC))
                        ),
                        RoundedCornerShape(8.dp)
                    )
            )
        }
    }
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MainActivityScreen()
        }
    }
}
