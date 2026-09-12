# ExcelCoach AI — Data Analyst Interview Mock Test & Case Study Generator

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Tests: 40/40 Phase 5 Passing](https://img.shields.io/badge/Phase%205%20Tests-40%2F40%20Passing%20(100%25)-10B981.svg)](#automated-testing--verification)
[![All Test Suites: 100% Passing](https://img.shields.io/badge/All%20Suites-100%25%20Passing-10B981.svg)](#automated-testing--verification)
[![JavaScript](https://img.shields.io/badge/Vanilla_JS-ES6+-F7DF1E.svg?logo=javascript&logoColor=black)](#tech-stack--architecture)
[![CSS3](https://img.shields.io/badge/Vanilla_CSS-Custom_Design_System-1572B6.svg?logo=css3&logoColor=white)](#tech-stack--architecture)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933.svg?logo=node.js&logoColor=white)](#getting-started)
[![AI Engines](https://img.shields.io/badge/AI_Engines-Gemini_3.8_Flash_|_OpenRouter-8B5CF6.svg)](#ai-engine--dataset-intelligence)

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
  - [Phase 4.5: Preset Industry Domain Topics (1-Click Query Shortcuts)](#phase-45-preset-industry-domain-topics-1-click-query-shortcuts)
  - [Phase 5: Spaced Repetition (SRS), Daily Gauntlet & Verbal Defense](#phase-5-spaced-repetition-srs-daily-gauntlet--verbal-defense)
  - [Phase 5.5: Schema Inspector & Kaggle Live Dataset Documentation](#phase-55-schema-inspector--kaggle-live-dataset-documentation)
  - [Phase 5.6: Real Dataset Schema Upload Fallback & Generation Button Locking](#phase-56-real-dataset-schema-upload-fallback--generation-button-locking)
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

### Phase 4.5: Preset Industry Domain Topics (1-Click Query Shortcuts)
*Added 16 industry domain topic shortcuts matching enterprise case study archetypes for instant dataset discovery.*

- **16 Industry Case Archetypes (`#dataset-topics-container`)**:
  - `📊 General Purpose Generators`
  - `📋 Project Management`
  - `🛍️ Sales`
  - `💰 Finance & Accounting`
  - `✈️ Travel & Hospitality`
  - `🎧 Customer Service`
  - `🛒 E-Commerce & Marketing`
  - `🏥 Healthcare`
  - `👥 HR & Analytics`
  - `🖥️ IT Service Management`
  - `🏭 Manufacturing & Quality`
  - `🏠 Real Estate`
  - `📱 Social Media Analytics`
  - `📦 Supply Chain & Logistics`
  - `📢 Digital Marketing`
  - `🎓 Education & Academia`
- **1-Click Autofill with Full Editing Freedom**:
  - Clicking any domain chip (`.domain-topic-chip`) immediately populates the search input (`#input-dataset-query`) and focuses the bar.
  - Candidates retain complete freedom to modify, append keywords (e.g. `Finance & Accounting EMEA 2025`), or clear it.
  - Selecting another topic cleanly deletes the previous text and sets the new topic.
- **Bi-directional Active State Sync**:
  - Automatically highlights the matching topic pill on load and when typed, and un-highlights if customized.
  - Pressing **`Enter`** in the search bar triggers instant dual dataset search and AI ranking.

---

### Phase 5: Spaced Repetition (SRS), Daily Gauntlet & Verbal Defense
*Transformed ExcelCoach AI from an on-demand test generator into a daily habit-forming, interview-readying learning machine.*

- **1. Spaced Repetition Engine (SRS)**:
  - **Automated Memory Scheduling**: Implements a simplified SM-2 spaced repetition algorithm that automatically reschedules tasks based on candidate self-ratings (`Hard`, `Fair`, `Easy`).
  - **Automatic Queue Ingestion**: Any task rated `Hard` or requiring Tier 3 hints automatically enters the candidate's persistent SRS queue (`localStorage["excelcoach_srs_queue"]`).
  - **Dynamic Interval Progression**:
    - `Hard`: Resets review interval to 1 day; decreases ease factor.
    - `Fair`: Progresses interval by 1.5×.
    - `Easy`: Progresses interval by current ease factor (starting at 2.5×; initial jump from 1 to 7 days).
    - Graduation threshold: Tasks with intervals exceeding 60 days graduate to "Mastered" status and increment `excelcoach_srs_mastered_count`.
  - **Interactive SRS Review Mode**: Dedicated review sessions inside the simulated spreadsheet view featuring task instructions, formula draft bar, and instant re-rating controls (`Still Hard 😅`, `Getting It 🙂`, `Got It! ✅`).
  - **Progress Dashboard SRS Card (`#srs-review-card`)**: Live KPI metrics showing tasks *Due Today*, *In Queue*, and *Mastered*.

- **2. Daily Interview Gauntlet**:
  - **Habit-Forming Timed Sprint**: One randomized interview-critical question per calendar day designed to be solved under a strict **3-minute countdown timer**.
  - **Difficulty Setting**: Defaults to `Intermediate` for a fair, consistent daily benchmark. Includes a **"Match my level" toggle** (`#gauntlet-use-my-level`) to calibrate questions to the candidate's active seniority tier (`beginner`, `intermediate`, `advanced`, `expert`).
  - **AI & Offline Evaluation**: Evaluates answers across 3 key criteria:
    1. *Correctness (0–5)*: Accuracy of the core formula or technical strategy.
    2. *Completeness (0–3)*: Edge-case coverage and architectural justification.
    3. *Interview Quality (0–2)*: Concise, professional verbal phrasing.
  - **Habit Loop & Streak Telemetry**: Tracks daily consecutive practice (`🔥 X-day streak`), historical scores, and visual Mon–Sun completion dots.

- **3. Verbal Defense Mode (5th Drill Workout Split)**:
  - **Train the "Why", Not Just the "What"**: Added a 5th workout split alongside Scenario, Glitch, and Skeleton drills.
  - **20 Pre-Calibrated Defense Scenarios (`VERBAL_DEFENSE_TOPICS`)**: Real-world architectural questions such as *XLOOKUP vs VLOOKUP*, *INDEX/MATCH vs XLOOKUP*, *SUMIFS vs Pivot Tables*, *IFERROR vs IFNA error containment*, *Power Query ETL vs Worksheet Helper Columns*, *DAX Measures vs Calculated Columns*, and *Dynamic Array FILTER vs Legacy formulas*.
  - **3-Axis AI Scoring Engine**:
    - *Technical Accuracy (0–3)*: Correctness of spreadsheet logic.
    - *Clarity & Structure (0–3)*: Understandable by non-technical stakeholders and executive leaders.
    - *Interview Language Quality (0–4)*: Professional vocabulary, risk mitigation terminology, and auditability focus.
  - **Verbatim Model Answers**: Delivers 10/10 model phrasing to equip candidates with exact talking points for live interview rooms.

- **4. Daily Activity Log Telemetry**:
  - Centralized telemetry (`localStorage["excelcoach_activity_log"]`) logging daily tasks completed, hard ratings, SRS reviews, gauntlet challenges, and verbal defense scores.
  - Provides the structured historical foundation for future GitHub-style contribution heatmaps.

---

### Phase 5.5: Schema Inspector & Kaggle Live Dataset Documentation
*Added an interactive Schema Drawer and real-time Kaggle dataset documentation modal with attribute dictionary extraction.*

- **1. Dataset Schema Inspector Drawer (`#schema-inspector-drawer`)**:
  - Pinned slide-over drawer accessible directly from the active test header via the **`[🔍 Schema]`** button.
  - Dynamically extracts columns, data types, and realistic sample values directly from attached synthetic CSV data or Kaggle schema metadata.
  - Type-aware color badges (`Number / Numeric` in green, `Date` in yellow, `Text / Identifier` in cyan).
  - **1-Click Formula Integration**: Clicking any column immediately copies its structured reference (e.g. `@[InvoiceNo]`, `@[UnitPrice]`) directly to the clipboard with visual confirmation feedback.
  - Built-in heuristic fallback: In tests where raw CSV is missing, automatically extracts column names referenced in test task instructions or extracts definitions from Kaggle attribute blocks.

- **2. Full Kaggle "About Dataset" Documentation Modal (`#modal-dataset-details`)**:
  - Accessible via the **`[📖 Dataset Details]`** button in the test header.
  - Solves the Kaggle search API limitation (which returns an empty `description: ""` to keep search payloads small) by automatically fetching the complete 2,000+ character markdown description directly from Kaggle's `/api/v1/datasets/view/{owner}/{slug}` REST API endpoint via our zero-dependency proxy.
  - **Automated UCI / Kaggle Attribute Parser (`parseKaggleAttributeColumns`)**: Intelligently scans `### Attribute Information:` sections to extract all column names, definitions, and data types (e.g., all 8 columns in the Online Retail dataset: `InvoiceNo`, `StockCode`, `Description`, `Quantity`, `InvoiceDate`, `UnitPrice`, `CustomerID`, `Country`).
  - **Interactive Variables & Schema Dictionary**: Renders a dedicated variables table pairing each column with its official data dictionary explanation, inferred data type, format sample, and a structured reference copy button.
  - **Rich Markdown Formatting**: Formatted via `renderChatMarkdown` with custom typography for headings, bullet points, blockquotes, and code blocks.

---

### Phase 5.6: Real Dataset Schema Upload Fallback & Generation Button Locking
*Guarantees 100% schema fidelity for unindexed Kaggle/HuggingFace datasets and physically prevents AI column hallucination.*

- **1. Generation Button Locking Mechanism (`#btn-generate-test`)**:
  - Whenever a candidate selects a real-world dataset whose metadata does not contain column headers (e.g. Kaggle datasets without formatted attribute tables in their markdown description), the **Generate Full Mock Test** button physically locks (`disabled = true`) with a dedicated `.btn-locked` visual state.
  - Button text dynamically shifts to `<span>🔒</span> Upload CSV to Unlock Generation`, and status indicators warn that schema verification is required before generating questions.
  - A hard guard in `handleGenerateTest()` prevents any API calls with an empty schema, stopping Gemini from hallucinating non-existent columns (such as `Commodity`, `TransactionID`, or `CountryCode`).
  - Switching to "🤖 Generate Synthetic Dataset" or selecting a dataset with verified schema automatically unlocks the button (`<span>✨</span> Generate Full Mock Test`).

- **2. Interactive Dataset Schema Fallback Dropzone (`#dataset-schema-fallback-box`)**:
  - Automatically reveals when the active dataset lacks schema columns.
  - Supports instant drag-and-drop and file browsing for downloaded `.csv` files.
  - **Instantaneous Client-Side Parsing**: Reads the first 64KB in the browser via `FileReader`, extracting headers and inspecting sample rows in under 5ms without server network overhead.
  - **Type Inference & Verification Preview**: Automatically infers column types (`Text`, `Number / Currency`, `Date`, `Boolean`) and displays interactive column pill chips.
  - **Dataset Schema Inspector Synchronization**: Injects the authentic sample rows into `syntheticCsv` so the floating Schema Inspector matches the exact spreadsheet open on the candidate's desktop.

- **3. Prompt Column Fidelity & Strict Anti-Hallucination Directive**:
  - Passes verified CSV sample data directly into `buildTestGenerationPrompt()`.
  - Enforces a strict directive on Gemini: *"You MUST strictly build the business scenario, column manipulations, formulas, and Pivot Table tasks specifically around these actual columns! Do not invent, substitute, or rename columns."*

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
│   ├── test_schema_upload_guard.mjs # 9-test suite for Schema Upload Dropzone & Button Lock
│   ├── test_audit_fixes.mjs     # 25-test suite for full security, export & formula audit fixes
│   ├── test_schema_and_dataset_modal.mjs # 21-test suite for Schema Inspector & Dataset Details Modal
│   ├── test_phase5.mjs          # 40-test suite verifying SRS, Daily Gauntlet, and Verbal Defense
│   ├── test_industry_topics.mjs # 16 preset industry domain topic chips test
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

Run the full automated verification test suites from the terminal:

```bash
# Run 9-test suite for Schema Upload Fallback & Generation Button Locking
node scripts/test_schema_upload_guard.mjs

# Run 25-test suite for full security, export & formula audit fixes
node scripts/test_audit_fixes.mjs

# Run 21-test suite for Schema Inspector, Kaggle Full Documentation & Attribute Parser
node scripts/test_schema_and_dataset_modal.mjs

# Run comprehensive 40-test suite for Phase 5 (SRS, Daily Gauntlet, Verbal Defense)
node scripts/test_phase5.mjs

# Run comprehensive 26-test suite across Phase 1, 2, and 3
node scripts/test_learning_modes.mjs

# Run chatbot DOM, offline AI knowledge, and hotkey verification
node scripts/test_chatbot.mjs

# Run 16 preset industry domain topic shortcuts verification
node scripts/test_industry_topics.mjs

# Run progressive hint layout and styling verification
node scripts/test_hint_display.mjs
```

**Test Coverage Summary**:
- **Spaced Repetition (SRS)**: SM-2 interval expansion, reset on hard rating, due-date filtering, and graduation to Mastered.
- **Daily Gauntlet**: 3-minute sprint countdown, calendar-day streak tracking, difficulty override toggle, and 3-axis scoring.
- **Verbal Defense Mode**: 20 scenario drills, 3-axis rubric (Accuracy, Clarity, Interview Language), and model answer display.
- **Daily Activity Log**: Telemetry tracking across tests, SRS reviews, gauntlets, and verbal drills.
- **Formula Linter**: Quote balancing, parenthesis pairing, bracket nesting, volatile functions, parameter count, exact match.
- **Dataset Schema**: Header parsing, type inference, and Kaggle/HuggingFace query integration.
- **Progressive Hint Engine**: Multi-tier vertical hints, syntax blueprints, and 1-click copy.
- **Hiring Scorecard**: Strict mode bonuses, time penalties, and 1-page printable cheat sheet export.

---

## 🔍 SEO Keywords & Tags

`Excel Mock Test`, `Data Analyst Interview Questions`, `Excel Technical Assessment`, `Power Query Practice`, `DAX Power Pivot Drills`, `XLOOKUP Practice Test`, `Excel Case Study Generator`, `BI Analyst Interview Prep`, `Excel Formula Linter`, `Progressive Hint Learning`, `Hiring Manager Excel Test`, `Hugging Face Datasets Excel`, `Kaggle Datasets Analysis`, `Interactive Excel Simulator`, `Master Excel Portfolio`.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

*Engineered with precision for data professionals who want to master spreadsheets under interview conditions.*
