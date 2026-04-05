# AI-Powered DOCX Editor

A powerful, proof-of-concept desktop application that combines the native, highly-customizable editing experience of local Word documents (.docx) with a specialized AI agent capable of directly reading, writing, and formatting the document *for* you.

Built with **Tauri v2**, **React 19**, **TipTap**, and the **Vercel AI SDK**, this application natively manipulates real MS Word files while preserving your data privacy via local API key management.

## 🚀 Features

- **Split-Pane Interface**: A seamless side-by-side editing layout. Write on the left, talk to your personal AI assistant on the right.
- **Native Document I/O**: Open and save genuine `.docx` files. Under the hood, document logic is powered by `mammoth` (for importing) and `html-to-docx` (for exporting) with browser-compatible custom Vite polyfills.
- **Rich Text Editor**: Powered by TipTap/ProseMirror. Supports bold, italic, underline, heading hierarchies, character counts, and more.
- **"Hands-Free" AI Editing**: The AI Chat Widget doesn't just talk *to* you. It uses Vercel AI SDK tools (`format_text`, `replace_text`, `insert_at_end`, `set_document_content`) to programmatically edit the living document exactly to your specifications.
- **Multi-Provider Support**: Choose your preferred intelligence brain. Save API keys securely to local storage via `tauri-plugin-store` for OpenAI, Anthropic, or Google Gemini.
- **Model Selection & Routing**: Change models on the fly directly inside the app settings (e.g., switch from `gpt-4o` to `gemini-2.5-flash` instantly).

## 🛠 Tech Stack

- **Framework**: [Tauri v2](https://v2.tauri.app/) (Rust + Webview)
- **Frontend**: React 19 + TypeScript + Vite + TailwindCSS
- **Rich Text**: [TipTap](https://tiptap.dev/)
- **AI**: [Vercel AI SDK (v6)](https://sdk.vercel.ai/docs)
- **Document Processing**: `mammoth.js` and `html-to-docx`

## 🏃‍♂️ Getting Started

### Prerequisites
- Node.js (v18+)
- Rust (1.88+)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the Tauri development server:
```bash
npm run tauri dev
```

3. Configure your API Keys:
   - Click the Gear (⚙) icon in the Chat Widget.
   - Select your provider (OpenAI, Anthropic, or Google) and model.
   - Enter your API Key.
   - Click "Save Configuration".

## 🗺 Roadmap

This is currently a functional proof of concept. The following features are planned for upcoming milestones:

### 🌟 Phase 1: Editor Expansion
- [ ] **Table Support**: Give the AI the ability to generate, insert, and format multi-column tables.
- [ ] **Image Integration**: Local image drag-and-drop support, base64 encoding, and `.docx` embedded image preservation.
- [ ] **Lists & Alignment**: Expose TipTap's unordered/ordered lists and text alignment to AI tools.

### 🤖 Phase 2: Advanced AI Capabilities
- [ ] **Context Window Optimization**: Instead of sending the full document text on every request, implement chunking or RAG mechanisms for massive manuscripts.
- [ ] **Highlights/Comments**: Allow the AI to highlight specific passages and leave sidebar comments rather than making direct destructive edits.
- [ ] **System Prompt Toggles**: Let users pick "personas" for the AI (e.g., "Grammar Editor", "Creative Writer", "Legal Reviewer").

### 💾 Phase 3: File System & System Integration
- [ ] **Deep Tauri File System bindings**: Bind native file tracking so the app "remembers" the open file path and supports `Ctrl+S` quick saves rather than generating a new download blob every time.
- [ ] **PDF Export**: Add a fast export-to-PDF button using Tauri's native printing/PDF APIs.
- [ ] **System Tray Integration**: Background processing or quick-note capturing without fully opening a window.
