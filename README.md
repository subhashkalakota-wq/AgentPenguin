# EasyApplyAgent — LinkedIn Easy Apply Automation Control Center

An intelligent automation agent built for the **Smart Automation** hackathon category. It connects to your active, logged-in Chrome browser via the Chrome DevTools Protocol (CDP), scrapes LinkedIn Easy Apply opportunities, uses LLM reasoning to evaluate fit, steps through applications via Playwright, and streams telemetry to a live React dashboard.

---

## 🎨 Color Palette

Designed precisely with your customized 4-tone palette:
- **`#FFF5F5`** — Pearlescent Blush White / Opal
- **`#F8D6D0`** — Soft Peach / Warm Coral
- **`#E2B4BD`** — Dusty Rose Mauve (Primary Accent)
- **`#4A4A4A`** — Slate Charcoal Graphite (Dark Base)

---

## 🚀 Quick Start

### 1. Launch the Live React Dashboard
The frontend dev server is running on:
```bash
# Dashboard UI
http://127.0.0.1:5173/
```

To run manually:
```bash
npm run dev
```

### 2. Launch the Backend Server
The Node.js + Express backend runs on:
```bash
# Backend & SSE stream
http://localhost:3001
```

To run the backend:
```bash
npm run server
```

### 3. Launch Chrome with Remote Debugging (CDP)
To connect Playwright to your already-logged-in LinkedIn session without handling credentials:

**macOS:**
```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
```

**Windows:**
```bash
chrome.exe --remote-debugging-port=9222
```

Navigate to LinkedIn in this window and log in normally. The agent connects to `localhost:9222` automatically.

---

## 🛡️ Smart Automation Guardrails

1. **Division of Labor**: LLM evaluates candidate suitability and outputs structured JSON. Playwright handles the DOM clicks.
2. **Easy Apply Only**: Enforces `f_AL=true` to stick strictly to LinkedIn's standardized modals (no off-site redirects).
3. **Account Protection Cap**: Hard application limit (e.g. 15–20 per session) to prevent rate limits.
4. **Human-like Anti-Bot Pacing**: Randomized 6–14 second jitter delays between clicks.
5. **Zero-Crash Graceful Skip**: Unmapped custom screening questions are safely flagged as "Needs Manual Review" rather than freezing or crashing.

---

## 📁 Project Architecture

- **`src/`** — React Dashboard UI
  - `src/components/Header.jsx`: CDP status (:9222), profile pill, theme toggle, run controls
  - `src/components/MetricsCards.jsx`: 5 live KPI summary cards
  - `src/components/SafetyBanner.jsx`: Hackathon guardrails and rate-limit safeguards
  - `src/components/LiveBrowserViewport.jsx`: Simulated Chrome browser window showing real-time LinkedIn Easy Apply modal progression & Playwright cursor
  - `src/components/LiveExecutionTrace.jsx`: Streaming terminal thought stream with search and log filtering
  - `src/components/JobsTable.jsx`: Filterable pipeline table with match scores and status badges
  - `src/components/JobDetailModal.jsx`: Deep audit drawer for LLM reasoning, screening questions, and Playwright DOM telemetry
  - `src/components/AgentControlPanel.jsx`: Configuration modal for search queries, quotas, delays, resume, and CDP testing
  - `src/index.css` & `src/App.css`: Complete design system tokens in your 4 colors
- **`server/`** — Node.js / Express Backend
  - `server/index.js`: REST API + Server-Sent Events (SSE) telemetry stream on port 3001
  - `server/cdpClient.js`: `playwright.chromium.connectOverCDP('http://localhost:9222')`
  - `server/scraper.js`: LinkedIn Easy Apply listing scraper
  - `server/llmFilter.js`: Structured JSON candidate matching engine
  - `server/playwrightApplier.js`: Modal step-through automation engine with skip-on-unknown logic
