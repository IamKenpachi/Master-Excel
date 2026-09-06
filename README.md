# ExcelCoach AI — Data Analyst Interview Mock Test & Case Study Generator

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Tests: 26/26 Passing](https://img.shields.io/badge/Tests-26%2F26%20Passing%20(100%25)-10B981.svg)](#automated-testing--verification)
[![JavaScript](https://img.shields.io/badge/Vanilla_JS-ES6+-F7DF1E.svg?logo=javascript&logoColor=black)](#tech-stack--architecture)
[![CSS3](https://img.shields.io/badge/Vanilla_CSS-Custom_Design_System-1572B6.svg?logo=css3&logoColor=white)](#tech-stack--architecture)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933.svg?logo=node.js&logoColor=white)](#getting-started)
[![AI Engines](https://img.shields.io/badge/AI_Engines-Gemini_2.5_|_OpenRouter-8B5CF6.svg)](#ai-engine--dataset-intelligence)

> **The ultimate technical assessment simulator for aspiring and seasoned Data Analysts, BI Engineers, and Analytics Consultants preparing for high-stakes spreadsheet technical interviews.**

---

## 📌 Table of Contents

- [Overview & Why ExcelCoach AI](#overview--why-excelcoach-ai)
- [Key Highlights](#key-highlights)
- [Product Evolution & Development Phases](#product-evolution--development-phases)
  - [Phase 0: Foundational Architecture & Core Engine](#phase-0-foundational-architecture--core-engine)
  - [Phase 1: Real-Time Simulation & Candidate Workflow Upgrades](#phase-1-real-time-simulation--candidate-workflow-upgrades)
  - [Phase 2: 4-Workout Split Drill Engine (Deliberate Practice)](#phase-2-4-workout-split-drill-engine-deliberate-practice)
  - [Phase 3: Hiring Intelligence, Readiness Scorecard & Adaptive Warmup](#phase-3-hiring-intelligence-readiness-scorecard--adaptive-warmup)
  - [Phase 3.5: UI Polish & Responsive Multi-Tier Hints](#phase-35-ui-polish--responsive-multi-tier-hints)
  - [Phase 4: AI Excel Floating Robot Chatbot Assistant](#phase-4-ai-excel-floating-robot-chatbot-assistant)
- [Core Analyst Competencies Tested](#core-analyst-competencies-tested)
- [Power-User Keyboard Shortcuts](#power-user-keyboard-shortcuts)
- [Tech Stack & Architecture](#tech-stack--architecture)
- [Getting Started](#getting-started)
- [Automated Testing & Verification](#automated-testing--verification)
- [SEO Keywords & Tags](#seo-keywords--tags)
- [License](#license)

---

## 🎯 Overview & Why ExcelCoach AI

In corporate Data Analyst and BI hiring pipelines, candidates rarely get tested on simple spreadsheet definitions. Instead, top companies (FAANG, Big 4, FinTech, and Fortune 500) administer **timed, 45-to-90 minute realistic business case studies**. 

Candidates fail these interviews not because they don't know basic formulas, but because:
1. **They lack real-world dataset familiarity** (handling missing values, nested keys, dates, and schema anomalies).
2. **They use volatile or outdated formulas** (e.g., legacy `VLOOKUP` approximate match bugs, volatile `OFFSET`/`INDIRECT`, whole-column scanning `A:A`).
3. **They fail to articulate technical trade-offs** to non-technical interviewers or lead architects.
4. **They panic under timed pressure** and get stuck on a single task without progressive guidance.

**ExcelCoach AI** solves this entire pipeline by generating tailored, deterministic case studies backed by actual Kaggle and Hugging Face datasets, complete with live formula linting, progressive 3-tier scaffolding, timed exam simulation, objective hiring evaluations, and 4-way workout drilling.

---

## ⚡ Key Highlights

- 🏢 **Industry-Authentic Case Studies**: Tailored business context spanning 10 industries (SaaS, FinTech, Healthcare, Logistics, E-Commerce, Retail, etc.).
- 📊 **Real Datasets Integration**: Fetches real schemas and metadata directly from **Kaggle** and **Hugging Face Hub**.
- 🧪 **Live Formula Bar & Real-Time Linter**: Type Excel formulas into a live input with 9 built-in static analysis rules before submitting.
- 💡 **3-Tier Progressive Hint Scaffold**: Unlocks Concept Nudge $\rightarrow$ Syntax Blueprint $\rightarrow$ Complete Solution without giving away answers immediately.
- 🛡️ **Strict Exam Mode**: Simulates real proctored interviews with locked hints, timer urgency, and a +10% hiring score bonus.
- 🏋️‍♂️ **4-Workout Split Drills**: Practice Scenarios, Bug-Hunting (Glitch), Fill-in-the-Blank (Skeleton), and Verbal Interview Defense.
- 📋 **Hiring Manager Readiness Scorecard**: Algorithmic assessment evaluating Speed, Accuracy, Independence (hint penalty), and Category Strength into actionable hiring verdicts (`Strong Hire`, `Hire`, `Borderline`, `Not Ready`).
- 📄 **1-Page Technical Interview Cheat Sheet**: High-density printable export for last-minute interview room defense.

---

## 🚀 Product Evolution & Development Phases

### Phase 0: Foundational Architecture & Core Engine
*The initial MVP built to generate high-fidelity Excel mock tests from AI and public datasets.*

- **Deterministic AI Generation**: Built with Google Gemini 2.5 Flash / Pro and OpenRouter API integration (DeepSeek R1, Claude 3.5 Sonnet, etc.) to generate end-to-end tests and answer keys in a single deterministic pass.
- **Kaggle & Hugging Face Search**: Live querying of public data repositories, automatically normalized and ranked with an AI relevance scoring system.
- **12 Core Analyst Topics**: Modular categorization across Lookups, Dynamic Arrays, Power Query ETL, DAX & Power Pivot, Aggregations, Data Cleaning, and Statistical Modeling.
- **4 Difficulty Tiers**:
  - *Beginner (Entry-Level)*: 8 tasks, 30 mins
  - *Intermediate (Mid-Level Analyst)*: 12 tasks, 45 mins
  - *Advanced (Senior Analyst)*: 15 tasks, 60 mins
  - *Expert (Lead / Analytics Engineer)*: 18 tasks, 75 mins
- **Interactive Spreadsheet Simulation**: Excel-like worksheet UI with row selection, status tracking (Done / Pending), and difficulty ratings (Easy, Fair, Hard).
- **LocalStorage State Persistence**: Saves active tests, task ratings, and draft formulas automatically across browser refreshes.
- **Zero-Dependency Offline Mode**: High-quality built-in medical insurance analytics dataset and case study for instant practice without API keys.
- **Print & PDF Exporters**: Clean, styled document printing for mock tests and answer guides.

---

### Phase 1: Real-Time Simulation & Candidate Workflow Upgrades
*Upgraded the test-taking experience from static task viewing to an interactive analytical cockpit.*

- **Interactive Formula Bar (`#formula-bar-input`)**: Live formula editor positioned above the task grid, automatically bound to the active task cell (e.g., cell `B7`).
- **Real-Time Formula Linter (`lintExcelFormula`)**: Evaluates formulas across 9 interview-critical rules:
  1. *Leading `=` Requirement*: Reminds user to start formulas with `=`.
  2. *String Quote Balancer*: Catches unclosed quotation marks (`"`) before parentheses fail.
  3. *Structured Reference Balancer*: Ensures matching `[` and `]` for table column references.
  4. *Parentheses Balancer*: Detects mismatched opening and closing parentheses.
  5. *XLOOKUP Parameter Checker*: Enforces minimum 3 required arguments (`lookup_value`, `lookup_array`, `return_array`).
  6. *Volatile Function Warning*: Flags `OFFSET()` and `INDIRECT()` as performance hazards and suggests index-based alternatives.
  7. *VLOOKUP Exact Match Validator*: Warns when 4th parameter (`FALSE` or `0`) is missing to prevent approximate match lookup bugs.
  8. *Whole Column Scan Nudge*: Warns against `A:A` scans that cause workbook bloat; recommends table syntax (`@[Column]`).
  9. *SUMIFS Argument Order Reminder*: Clarifies that `sum_range` is the first parameter.
- **3-Tier Progressive Hint Scaffold**:
  - *Tier 1 (Concept Nudge)*: Conceptual strategy without formula exposure.
  - *Tier 2 (Syntax Blueprint)*: Parameter signature template with syntax placeholders.
  - *Tier 3 (Complete Solution)*: Full formula, ribbon steps, and interview rationale.
- **Floating Dataset Schema Inspector Drawer**: Slide-out drawer displaying all table columns, row counts, and auto-inferred data types (**Number**, **Date**, **Boolean**, **Text**), with 1-click clipboard copy (`@[Column]`).
- **Strict Exam Pressure Mode**: Disables all progressive hints, pulses the timer, and grants a +10% hiring score bonus for authentic interview stress testing.
- **Power-User Keyboard Shortcuts**: Full hotkey navigation (`J`/`K`/`ArrowDown`/`ArrowUp` for rows, `Space` for done, `H` for hints, `F` for formula bar, `D` for schema drawer, `1`/`2`/`3` for ratings, `?` for help).

---

### Phase 2: 4-Workout Split Drill Engine (Deliberate Practice)
*Transformed the app from occasional test taking into a daily deliberate training platform.*

Instead of repetitive generic quizzes, introduced a 4-way workout split targeting different cognitive skills:

| Drill Mode | Cognitive Focus | Description |
| :--- | :--- | :--- |
| **📊 Scenario Case** | Business Problem Solving | Realistic business question requiring multi-step Excel logic. |
| **🐛 Glitch & Bug-Hunting** | Code Review & Debugging | A candidate or junior analyst wrote a buggy formula (`#SPILL!`, silent approximate match, unclosed brackets). Find and correct the bug. |
| **🦴 Skeleton Pattern** | Syntax Muscle Memory | Fill-in-the-blank formula blueprints with `___` placeholders to lock in function signatures. |
| **🎙️ Verbal Defense** | Executive Communication | Prepare talking points and trade-off explanations to defend formula choices to a VP or hiring manager. |

- **Specialized Gemini Prompting**: Configured `buildDrillGenerationPrompt` to yield unique, creative problem sets tailored to any topic.
- **Curated Offline Fallback Banks**: 20 pre-engineered drills spanning all 4 modes for instant zero-latency practice.

---

### Phase 3: Hiring Intelligence, Readiness Scorecard & Adaptive Warmup
*Engineered post-test analytics and predictive hiring recommendations.*

- **Hiring Manager Readiness Scorecard Modal (`#modal-scorecard`)**:
  - Algorithmic scoring evaluating:
    - *Task Completion Rate*
    - *Self-Assessed Mastery* (weighted Easy / Fair / Hard)
    - *Independence Factor* (-5% penalty per hint tier unlocked)
    - *Time-Bonus / Strict Exam Modifier* (+10% for unassisted completion)
  - Categorizes candidates into objective hiring outcomes:
    - 🏆 **Strong Hire** (85%+)
    - ✅ **Hire** (70% - 84%)
    - ⚠️ **Borderline / Re-interview** (50% - 69%)
    - ❌ **Not Ready** (<50%)
  - **Category Competency Breakdown**: Displays mastery % for Data Cleaning, Lookups, Power Query, Aggregations, etc.
- **Printable 1-Page Technical Interview Defense Cheat Sheet (`Exporter.printInterviewCheatSheet`)**:
  - High-density, print-optimized document containing:
    - Candidate formula answer key
    - Pro Tips & anti-patterns
    - Verbal interview room talking points
- **Adaptive Morning Weakness Warmup**:
  - Progress dashboard analyzes test history and flags the user's lowest-scoring competency.
  - Offers a 1-click **"Start 5-Min Warmup"** button that pre-configures and launches a focused drill session.
- **Flexible Search & Question Sliders**:
  - Configurable dataset search return count (1–50 results).
  - Configurable task generation slider (5–50 questions, default 15).

---

### Phase 3.5: UI Polish & Responsive Multi-Tier Hints
*Addressed UX feedback to ensure state-of-the-art visual presentation and usability.*

- **Full-Width Vertical Hint Cards**: Overhauled hint layout from horizontal flex rows into spacious, distinct vertical cards with color-coded accent borders (Amber for Tier 1, Cyan for Tier 2, Emerald Green for Tier 3).
- **Topbar Guidance Navigator**: Added quick 1-click tier tabs (`💡 Nudge`, `🧩 Blueprint`, `🔑 Solution`) and dismiss button (`✕`).
- **1-Click Copy Code Buttons**: Integrated instant copy buttons with feedback states (`✓ Copied!`) on formula blueprints and solutions.
- **Monospace Code Safety**: Code blocks formatted with syntax background and `white-space: pre-wrap; word-break: break-word;` to prevent layout breaking or text overlap.
- **Responsive Table Alignment**: Set cells to `vertical-align: top;` so action buttons and task IDs remain pinned as hints expand.

---

### Phase 4: AI Excel Floating Robot Chatbot Assistant
*Integrated an omnipresent, context-aware AI technical mentor for on-demand spreadsheet problem solving.*

- **Floating Robot Launcher (`#btn-chatbot-launcher`)**:
  - 56px circular floating action button positioned in the bottom-right corner with a modern robot avatar, glowing green status indicator, and tooltip.
- **Context-Aware Floating Chat Widget (`#chatbot-widget`)**:
  - Modern glassmorphic dark container (`rgba(11, 17, 32, 0.96)`) with backdrop blur and fluid opening/closing animations.
  - Automatically syncs with current candidate context: when on the active test screen, automatically passes active task instructions, target cells, candidate formula drafts, and dataset schema to the AI.
  - Option to toggle task context on/off via the header context bar.
- **1-Click Quick Suggestion Chips (`#chatbot-chips`)**:
  - High-frequency prompt pills (`💡 XLOOKUP syntax`, `🐛 Fix #SPILL!`, `⚡ INDEX/MATCH vs XLOOKUP`, `🧹 Text Cleaning`, `🔄 Power Query Tips`).
- **Formatted Formula Code Blocks & 1-Click Copy**:
  - Auto-formats formulas and syntax blueprints into dark terminal code blocks with an instant **`📋 Copy`** button (`✓ Copied!`).
- **Dual Online & Offline Intelligence**:
  - Online: Powered by Google Gemini with a specialized Senior Excel & BI Technical Coach persona.
  - Offline / Zero-Key Engine: Rich built-in heuristic knowledge base answering common questions (`XLOOKUP`, `INDEX/MATCH`, `VLOOKUP`, `#SPILL!`, `#N/A`, `SUMIFS`, `Power Query`, `DAX`, `TRIM/CLEAN`) without requiring an API key.
- **Hotkeys**: Press **`Alt + C`** anywhere to toggle the chatbot, or **`Esc`** to dismiss.

---

## 🧠 Core Analyst Competencies Tested

```
┌─────────────────────────────────────────────────────────────┐
│                 EXCEL TECHNICAL COMPETENCY TREE              │
├──────────────────────────────┬──────────────────────────────┤
│ 1. Ingestion & Power Query   │ ETL, Unpivot, Split, Merge   │
│ 2. Modern Dynamic Arrays     │ FILTER, UNIQUE, SORT, XLOOKUP│
│ 3. Two-Way Indexing          │ INDEX-MATCH, XMATCH          │
│ 4. Multi-Condition Metrics   │ SUMIFS, COUNTIFS, AVERAGEIFS │
│ 5. Logic & Categorization    │ IFS, SWITCH, LET, LAMBDA     │
│ 6. Text Cleaning             │ TRIM, CLEAN, TEXTSPLIT       │
│ 7. Date Intelligence         │ EOMONTH, DATEDIF, EDATE      │
│ 8. Data Modeling & Pivot     │ Power Pivot, DAX Measures    │
│ 9. Financial Analysis        │ IRR, NPV, XIRR, PMT          │
│ 10. Executive Charting       │ Dynamic Charts, Slicers      │
└──────────────────────────────┴──────────────────────────────┘
```

---

## ⌨️ Power-User Keyboard Shortcuts

| Key | Action | Description |
| :---: | :--- | :--- |
| **`J`** / **`↓`** | Next Task | Moves selection to the next row |
| **`K`** / **`↑`** | Previous Task | Moves selection to the previous row |
| **`Space`** | Toggle Done | Marks current task complete / incomplete |
| **`H`** | Cycle Hints | Cycles through Nudge $\rightarrow$ Blueprint $\rightarrow$ Solution $\rightarrow$ Hide |
| **`F`** | Focus Formula Bar | Jumps directly to the formula input |
| **`Enter`** | Run Formula Linter | Lint candidate formula when inside formula bar |
| **`D`** | Toggle Schema Drawer | Opens/closes dataset columns inspector |
| **`1`** | Rate: Easy | Marks task as Easy |
| **`2`** | Rate: Fair | Marks task as Fair |
| **`3`** | Rate: Hard | Marks task as Hard (flags for morning review) |
| **`Alt`** + **`C`** | Toggle AI Chatbot | Opens or minimizes the AI Excel Coach assistant |
| **`?`** | Shortcuts Modal | Opens the keyboard reference sheet |
| **`Esc`** | Close | Dismisses any active drawer or modal |

---

## 🏗️ Tech Stack & Architecture

- **Frontend**:
  - Pure HTML5 + Semantic Elements.
  - Vanilla CSS3 (Custom Design Tokens, Glassmorphism, HSL Tailored Color Palette, Zero Framework Dependencies).
  - Vanilla JavaScript (Modern ES6+ Modules).
- **Backend & Proxy**:
  - Node.js `http` lightweight reverse proxy server (`server.js`).
  - Secure `.env` credential forwarding to Kaggle, Hugging Face, Google Gemini, and OpenRouter.
- **Storage & State**:
  - Browser `localStorage` for offline persistence of tests, settings, and progress analytics.
- **Testing**:
  - Automated Node.js verification suites (`scripts/test_learning_modes.mjs`, `scripts/test_chatbot.mjs`, `scripts/test_hint_display.mjs`, `scripts/test_phase1.mjs`).

```
excel-mock-test/
├── index.html               # Main single-page application entry point
├── style.css                # Curated dark glassmorphic design system
├── app.js                   # Application state, UI rendering, keyboard handlers
├── gemini.js                # AI integration (Gemini 2.5 Flash / OpenRouter)
├── prompts.js               # Structured prompt engineering & drill generators
├── datasets.js              # Kaggle & Hugging Face discovery and ranking
├── storage.js               # LocalStorage state management
├── export.js                # Print styling, test sheet & 1-page cheat sheet
├── server.js                # Lightweight Node.js API proxy server
├── scripts/
│   ├── test_learning_modes.mjs  # 26 automated tests verifying all phases
│   ├── test_chatbot.mjs         # Chatbot DOM, styles, and offline knowledge tests
│   ├── test_hint_display.mjs    # Responsive CSS & DOM layout verification
│   └── test_phase1.mjs          # Linter & schema inspector test suite
├── .env.example             # Template for API credentials
└── README.md                # Project documentation & reference
```

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18.0.0 or higher recommended)
- Git

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/IamKenpachi/Master-Excel.git
   cd Master-Excel
   ```

2. **Configure Environment Keys** (Optional for live AI generation):
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Add your API keys:
   ```ini
   # Optional: Google Gemini API Key
   GEMINI_API_KEY=your_gemini_api_key_here

   # Optional: OpenRouter API Key (for DeepSeek R1, Claude, etc.)
   OPENROUTER_API_KEY=your_openrouter_api_key_here

   # Optional: Kaggle Credentials for dataset search
   KAGGLE_USERNAME=your_username
   KAGGLE_KEY=your_kaggle_api_key

   # Optional: Hugging Face Token
   HUGGINGFACE_TOKEN=your_hf_token
   ```
   *(Note: The app runs in fully-functional Offline Demo Mode even without API keys!)*

3. **Start the Local Server**:
   ```bash
   node server.js
   ```

4. **Open in Browser**:
   Navigate to [http://localhost:3000](http://localhost:3000).

---

## 🧪 Automated Testing & Verification

Run the full automated verification test suite from the terminal:

```bash
# Run comprehensive 26-test suite across Phase 1, 2, and 3
node scripts/test_learning_modes.mjs

# Run progressive hint layout and styling verification
node scripts/test_hint_display.mjs
```

**Test Coverage Summary**:
- Formula Linter rules (quotes, parentheses, brackets, volatile functions, parameter count, exact match).
- Dataset schema parsing and type inference.
- Progressive hint generation and fallback behavior.
- 4-workout split prompt engineering and offline drill banks.
- Objective hiring scorecard algorithm and strict mode bonuses.
- 1-page cheat sheet export structure.
- HTTP server and DOM element integration.

---

## 🔍 SEO Keywords & Tags

`Excel Mock Test`, `Data Analyst Interview Questions`, `Excel Technical Assessment`, `Power Query Practice`, `DAX Power Pivot Drills`, `XLOOKUP Practice Test`, `Excel Case Study Generator`, `BI Analyst Interview Prep`, `Excel Formula Linter`, `Progressive Hint Learning`, `Hiring Manager Excel Test`, `Hugging Face Datasets Excel`, `Kaggle Datasets Analysis`, `Interactive Excel Simulator`, `Master Excel Portfolio`.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

*Engineered with precision for data professionals who want to master spreadsheets under interview conditions.*
