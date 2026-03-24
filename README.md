# 🍳 ChefMate — Your AI Kitchen Companion

> **Voice-first, offline-capable cooking assistant powered entirely by on-device AI. No cloud. No API keys. 100% private.**

Built for **HackXtreme** · Problem Statement #3: Voice-First Conversational Apps · Powered by [RunAnywhere SDK](https://runanywhere.ai)

---

## ✨ Features

| Feature | Description |
|--------|-------------|
| 🎙️ **Voice Chat** | Hands-free cooking — ask recipes, get ingredients & steps read aloud via on-device STT + TTS |
| 🤖 **AI Recipe Cards** | Structured cards with difficulty level, ingredient chips, and numbered steps |
| 🔊 **Speak Button** | TTS reads the full recipe aloud — no need to look at the screen while cooking |
| 📴 **Offline Mode** | Text-based AI chat works completely without internet after first model download |
| 💾 **Save Recipes** | Save favourite recipes locally for quick access anytime |
| 📋 **Copy & Share** | Copy recipe to clipboard or share via WhatsApp and other platforms |
| ⏱️ **Custom Timer** | Set cooking timers hands-free via voice or manually |
| 🛒 **Grocery List** | Ingredients auto-added to sidebar — check them off one by one as you cook |
| 🕐 **Chat History** | All previous recipe conversations saved and searchable in the sidebar |
| 📶 **Offline Badge** | Clear visual indicator when running in offline mode |
| 🌙 **Light & Dark Mode** | Full theme support for any kitchen environment |

---

## 🚀 How It Works

ChefMate runs **entirely on your device** using the RunAnywhere SDK. The AI model is downloaded once on first launch and cached locally — after that, no internet is needed for text-based cooking assistance.

```
RunAnywhere SDK (on-device)
  ├── LLM (SmolLM2 1.2B)   → Recipe generation, ingredient info, cooking Q&A
  ├── STT (Whisper)         → Voice commands & hands-free input  
  └── TTS                   → Reads recipes & responses aloud
```

**Voice Pipeline (100% on-device):**
```
Your Voice → STT → LLM → TTS → Audio Response
```

Zero network requests. Zero cloud latency. Everything local.

---

## 🛠️ Quick Start

```bash
# Clone the repo
git clone https://github.com/anshvarshney1502/CHEFMATE-.git
cd CHEFMATE-

# Install dependencies
npm install

# Start the app
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

> ⚠️ On first launch, the app downloads the AI model (~1.2GB). This happens **once** and is cached in your browser's OPFS. After that, everything works fully offline.

---

## 🧠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React + TypeScript + Vite |
| On-Device AI | RunAnywhere SDK (`@runanywhere/web`) |
| LLM | SmolLM2 1.2B (WebAssembly / llama.cpp) |
| Speech-to-Text | RunAnywhere Whisper STT (on-device) |
| Text-to-Speech | RunAnywhere TTS (on-device) |
| Styling | Tailwind CSS + shadcn/ui |
| Storage | OPFS (model cache) + LocalStorage (recipes & history) |

---

## 📁 Project Structure

```
src/
├── App.tsx                 # Root app
├── main.tsx                # React entry point
├── runanywhere.ts          # SDK init + model config
├── components/
│   ├── ChatArea.tsx        # Main recipe chat interface
│   ├── ChatTab.tsx         # Chat tab with history sidebar
│   ├── VoiceTab.tsx        # Hands-free voice pipeline
│   ├── RecipeCard.tsx      # Structured recipe card UI
│   ├── InputBar.tsx        # Text + voice input bar
│   ├── Header.tsx          # App header + theme toggle
│   ├── ModelBanner.tsx     # Model download progress UI
│   └── ShareModal.tsx      # Share recipe options
```

---

---

## 🏆 Built At

**HackXtreme Hackathon**  
Problem Statement #3: Voice-First Conversational Apps  
Category: Web Applications

---

## 📄 License

MIT

---

> *ChefMate proves that AI doesn't need the cloud to be powerful. Your kitchen. Your data. Your device.*