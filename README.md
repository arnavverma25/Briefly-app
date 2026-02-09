# Briefly

**Briefly** is an AI-powered news aggregator that transforms your daily reading list into a personalized, radio-style audio briefing. 

Instead of reading through endless articles on your commute, simply paste URLs or text, select a persona, and let Gemini generate a cohesive podcast episode just for you.

## Features

- **Personalized Audio Summaries**: Converts multiple news articles (Text or URLs) into a single, flowing narrative.
- **Intelligent Grounding**: Uses **Gemini 3 Flash** with Google Search grounding to read and summarize live URLs.
- **Neural Text-to-Speech**: Utilizes **Gemini 2.5 Flash TTS** for hyper-realistic, emotive voice generation.
- **Dynamic Personas**: Choose your vibe:
  - News Anchor
  - Tech Vlogger
  - Storyteller
  - Aristocrat
  - Sports Caster
- **Voice Selection**: Toggle between distinct voices (Fenrir, Puck, Kore, Zephyr, Charon).
- **Karaoke-Style Transcript**: Real-time highlighted transcript that syncs with the audio playback.
- **Audio Visualizer**: Beautiful, real-time frequency visualization during playback.

## Screenshots

| Home Screen | Player & Visualizer | Transcript View |
|:-----------:|:-------------------:|:---------------:|
| <img width="587" height="1197" alt="image" src="https://github.com/user-attachments/assets/4acc26e1-0b83-4736-9aea-f4199b96daab" /> | <img width="587" height="1197" alt="image" src="https://github.com/user-attachments/assets/78110944-f503-4f7b-aeaa-ca832a8066a5" /> | <img width="587" height="1197" alt="image" src="https://github.com/user-attachments/assets/b42aeaa8-2828-4fec-b06f-2fbfdec92b59" /> |

## Tech Stack

- **Language**: Kotlin
- **UI Framework**: Jetpack Compose (Material 3)
- **AI Model**: Google Gemini API (`gemini-3-flash-preview` & `gemini-2.5-flash-preview-tts`)
- **Networking**: Retrofit & Gson
- **Audio**: Native Android `AudioTrack` & `Visualizer`
- **Architecture**: MVVM

## Getting Started

### Prerequisites

- Android Studio Iguana or later.
- A valid **Google Gemini API Key** (Get one [here](https://aistudio.google.com/)).

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/briefly-app.git
   cd briefly-app
