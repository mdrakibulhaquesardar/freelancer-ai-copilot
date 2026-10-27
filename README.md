# Freelancer AI Copilot 🚀

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Chrome Manifest V3](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-green.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![TypeScript Strict](https://img.shields.io/badge/TypeScript-Strict%20Mode-blue.svg)](https://www.typescriptlang.org/)
[![Powered by Groq & OpenAI](https://img.shields.io/badge/AI%20Providers-Groq%20%7C%20OpenAI-orange.svg)](https://console.groq.com)
[![Tests Passing](https://img.shields.io/badge/Tests-29%20Passing-brightgreen.svg)](https://vitest.dev)

A local-first, privacy-focused Chrome Extension (Manifest V3) that helps freelancers write high-converting, personalized proposals and safely autofill fields on freelance platforms.

Built with **Groq Cloud** (lightning-fast LLaMA 3.3 70B inference) & **OpenAI** (gpt-4o / o3-mini), with client-converting psychology, a self-learning Proposal Library, and a native Raycast/macOS aesthetic.

---

## ✨ Key Features

- **⚡ Blazing Fast AI Inference**: Native support for **[Groq Cloud](https://console.groq.com)** (free tier, ultra-fast 300+ tok/s with `llama-3.3-70b-versatile` & open-weight reasoning models) as well as **OpenAI** (`gpt-4o`, `gpt-4o-mini`, `o3-mini`).
- **🎯 4-Stage Winning Proposal Blueprint**:
  - **First 150-Character Disruptive Hook**: Opens directly with the client's technical bottleneck—zero generic greetings like *"Dear Hiring Manager"* or *"I am an expert with 5 years experience"*.
  - **Pragmatic Technical Plan**: 2-3 actionable steps diagnosing the problem and demonstrating domain competence.
  - **70/30 Client-to-Me Ratio**: Keeps 70% of the pitch centered on the client's codebase, speed, and product stability.
  - **Smart Technical Question & Low-Friction CTA**: Closes with an astute architectural question and zero-pressure chat invitation.
- **🏆 Proposal Library & Win Tracking (Self-Learning AI)**:
  - Bookmark your favorite proposals with ⭐ Star.
  - Track proposal outcomes: `🏆 Won`, `💬 Replied`, `⏳ Pending`, `❌ Declined`.
  - **Self-Learning Engine**: Proposals marked as **🏆 Won** or **⭐ Starred** are automatically injected as real writing examples so the AI learns your exact winning style.
- **🛡️ Strict Safety & Compliance Gate**:
  - **Zero Auto-Submit Invariant**: Autofill **never** clicks "Submit" or "Place Bid". You retain 100% review control before sending.
  - **Prompt Injection Defense**: All extracted project text is treated as untrusted data and strictly isolated from system instructions.
  - **No Hallucinated Experience**: Strictly grounds claims in your truthful profile facts. Never invents fake clients, degrees, or stats.
- **🖥️ Native Desktop Feel**:
  - Modern, dark macOS/Raycast inspired UI with tabs, filter chips, keyboard shortcut (`Ctrl+Enter` / `Cmd+Enter`), and word counter.
  - High-resolution custom icon bundled across all Chrome manifest resolutions.

---

## 🔒 Privacy & Security Invariant

- **100% Local Storage**: Your truthful profile, settings, API keys, and proposal library live strictly in your browser's local sandbox (`chrome.storage.local`).
- **No Telemetry or Remote Tracking**: Zero analytics, zero third-party tracking scripts, zero intermediary proxy servers.
- **Direct API Communication**: Network calls go directly from your browser to Groq (`api.groq.com`) or OpenAI (`api.openai.com`) using your own personal API key.

---

## 📂 Architecture & Project Structure

Built with **TypeScript (Strict Mode)**, **WXT**, and **Vite**:

```text
freelancer-ai-copilot/
├── entrypoints/
│   ├── popup/                # Popup UI (Draft, Project, Library & Wins, Profile)
│   │   ├── index.html
│   │   ├── main.ts
│   │   └── style.css
│   ├── options/              # Settings & Truthful Profile editor
│   │   ├── index.html
│   │   ├── main.ts
│   │   └── style.css
│   ├── background.ts         # Service worker for extension lifecycle
│   └── content.ts            # Content script for safe page extraction & autofill
├── src/
│   ├── shared/               # Shared domain types, constants, and validation
│   │   ├── types.ts          # Core data contracts & SavedProposal models
│   │   ├── constants.ts      # Storage keys, bounded limits, default models
│   │   └── validation.ts     # Runtime validators & normalizers
│   ├── ai/                   # AI integration & prompt security
│   │   ├── openai.ts         # Groq / OpenAI client with reasoning model support
│   │   ├── prompts.ts        # Winning proposal blueprint & fluff killer directives
│   │   └── errors.ts         # Sanitized error types (never leaks API keys)
│   ├── profile/              # Persistence & schema migration layer
│   │   ├── storage.ts        # Typed storage interface (chrome.storage.local)
│   │   └── migrations.ts     # Schema migrations
│   ├── project/              # Project extraction and parsing
│   │   └── parser.ts         # DOM extractor & manual project parser
│   └── autofill/             # Form detection & input dispatching
│       ├── field-mapper.ts   # Safe field scoring (proposal vs budget)
│       └── fill.ts           # Prototype setter dispatch + overwrite protection
├── public/                   # Master icons (16, 32, 48, 128)
├── tests/
│   ├── fixtures/             # Realistic mock HTML files for testing
│   ├── unit/                 # Unit tests (validation, prompt, openai, autofill, library)
│   └── integration/          # End-to-end fixture extraction & autofill workflow
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── wxt.config.ts
```

---

## 🛠️ Getting Started

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm** or **pnpm**

### 2. Clone and Install
```bash
git clone https://github.com/your-username/freelancer-ai-copilot.git
cd freelancer-ai-copilot
npm install
```

### 3. Run Tests & Validation
The test suite validates schema migration, prompt-injection defense, error sanitization, field mapping, library persistence, and win learning:
```bash
npm test
npm run typecheck
```

### 4. Build Extension
```bash
npm run build
```
The compiled, production-ready extension is generated in `.output/chrome-mv3/`.

### 5. Load in Chrome, Brave, or Edge
1. Open your browser and navigate to `chrome://extensions` (or `brave://extensions` / `edge://extensions`).
2. Toggle on **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select the `.output/chrome-mv3` folder inside this repository.
5. Pin **Freelancer AI Copilot** to your browser toolbar!

---

## ⚡ API Configuration (Bring Your Own Key)

API keys are **never hardcoded** in this repository. You configure your own personal key inside the extension settings:

### Recommended: Groq Cloud (Free Tier & Fast)
1. Get a free API key at [console.groq.com/keys](https://console.groq.com/keys) (starts with `gsk_`).
2. Open extension **Settings** (gear icon in popup).
3. Select **⚡ Groq Cloud** under AI Provider.
4. Paste your API key (`gsk_...`).
5. Choose your model — recommended: `llama-3.3-70b-versatile` or `openai/gpt-oss-20b`.
6. Click **Save Changes**.

### Alternative: OpenAI
1. Get an API key from [platform.openai.com/api-keys](https://platform.openai.com/api-keys).
2. Select **OpenAI** in Settings.
3. Paste your key (`sk-...`).
4. Select your model (`gpt-4o-mini`, `gpt-4o`, `o3-mini`).
5. Click **Save Changes**.

---

## 🧪 Testing Locally (Without Live Sites)

To test the entire workflow safely without touching live freelancing accounts:
1. Open `tests/fixtures/mock-project.html` directly in your browser (`file:///.../tests/fixtures/mock-project.html`).
2. Click the extension popup and click **Scan Page**.
3. Review the extracted details, and click **Generate Tailored Proposal**.
4. In another tab, open `tests/fixtures/mock-bid-form.html`.
5. Open the popup and click **Autofill**.
6. Notice that the proposal and budget are safely populated, with **zero automatic submission**.

---

## 🤝 Contributing

Contributions are warmly welcome!
1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Ensure all tests pass and code compiles cleanly:
   ```bash
   npm test
   npm run typecheck
   npm run build
   ```
4. Commit your changes (`git commit -m 'Add amazing feature'`).
5. Push to the branch (`git push origin feature/amazing-feature`).
6. Open a Pull Request.

---

## 📄 License

Distributed under the **MIT License**. See [LICENSE](./LICENSE) for details.
