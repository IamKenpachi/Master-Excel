// gemini.js - Google Gemini REST API Client, Goal-Oriented Execution, and Ranking Engine

import {
  buildGoalOrientedSystemInstruction,
  buildTestGenerationPrompt,
  buildDatasetRankingPrompt,
  buildDrillGenerationPrompt,
  buildHintPrompt
} from "./prompts.js";
import { Storage, DEFAULT_MODEL, SAMPLE_OFFLINE_TEST } from "./storage.js";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// Model fallbacks in case an experimental preview model returns a 404
const MODEL_FALLBACKS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash"
];

/**
 * Clean and parse JSON from Gemini's response text with automatic truncation healing
 */
function cleanAndParseJSON(rawText) {
  if (!rawText || typeof rawText !== "string") {
    throw new Error("Empty response received from Gemini.");
  }

  let cleaned = rawText.trim();

  // Strip markdown code fences if present
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.substring(3);
  }

  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }

  cleaned = cleaned.trim();

  // 1. First attempt direct parsing
  try {
    return JSON.parse(cleaned);
  } catch (initialErr) {
    // Continue to smart extraction and truncation healing
  }

  // 2. Extract outermost JSON block
  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");

  let str = cleaned;
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    str = cleaned.substring(firstBrace);
  } else if (firstBracket !== -1) {
    str = cleaned.substring(firstBracket);
  }

  try {
    return JSON.parse(str);
  } catch (e) {
    // Continue to repair
  }

  // 3. Truncation Auto-Healing:
  // If the model reached maxOutputTokens (e.g. on 30-50 questions), it cuts off mid-string or mid-array.
  // We iteratively trim trailing incomplete fragments and balance open brackets/braces.
  for (let trim = 0; trim < Math.min(str.length - 10, 3000); trim++) {
    let candidate = str.substring(0, str.length - trim).trim();
    candidate = candidate.replace(/[,:\\\s]+$/, "");

    // Check if inside open string literal
    let inStr = false;
    let escapes = 0;
    for (let i = 0; i < candidate.length; i++) {
      if (candidate[i] === "\\") {
        escapes++;
      } else {
        if (candidate[i] === '"' && escapes % 2 === 0) {
          inStr = !inStr;
        }
        escapes = 0;
      }
    }

    if (inStr) {
      candidate += '"';
    }

    // Balance open braces and brackets
    const stack = [];
    inStr = false;
    escapes = 0;
    for (let i = 0; i < candidate.length; i++) {
      if (candidate[i] === "\\") {
        escapes++;
      } else {
        if (candidate[i] === '"' && escapes % 2 === 0) {
          inStr = !inStr;
        } else if (!inStr) {
          const c = candidate[i];
          if (c === "{" || c === "[") stack.push(c);
          else if (c === "}" && stack[stack.length - 1] === "{") stack.pop();
          else if (c === "]" && stack[stack.length - 1] === "[") stack.pop();
        }
        escapes = 0;
      }
    }

    let closing = "";
    while (stack.length > 0) {
      const top = stack.pop();
      closing += (top === "{" ? "}" : "]");
    }

    try {
      const parsed = JSON.parse(candidate + closing);
      console.warn("Recovered and repaired truncated JSON response from Gemini successfully.");
      return parsed;
    } catch (err) {
      // Continue trimming
    }
  }

  throw new Error("Gemini output was incomplete or truncated by token limits. Please try again with slightly fewer questions.");
}

/**
 * Low-level API caller with model fallback logic
 */
async function callGeminiAPI({ model, apiKey, systemInstruction, prompt, schemaType = "application/json" }) {
  if (!apiKey) {
    throw new Error("Gemini API key is required. Please set your key in Settings.");
  }

  const modelsToTry = [model, ...MODEL_FALLBACKS.filter(m => m !== model)];
  let lastError = null;

  for (const currentModel of modelsToTry) {
    const url = `${GEMINI_BASE_URL}/${currentModel}:generateContent?key=${apiKey.trim()}`;
    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        responseMimeType: schemaType,
        maxOutputTokens: 8192,
        temperature: 0.7
      }
    };

    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errMsg = errorData.error?.message || `HTTP ${response.status}`;
        
        // If 404 (model not found), proceed to fallback model
        if (response.status === 404 && modelsToTry.indexOf(currentModel) < modelsToTry.length - 1) {
          console.warn(`Model ${currentModel} not available (404), falling back...`);
          lastError = new Error(errMsg);
          continue;
        }
        throw new Error(`Gemini API error (${currentModel}): ${errMsg}`);
      }

      const data = await response.json();
      const candidate = data.candidates?.[0];
      if (!candidate) {
        throw new Error("No candidate returned by Gemini.");
      }

      const text = candidate.content?.parts?.[0]?.text || "";
      const finishReason = candidate.finishReason;

      return {
        text,
        finishReason,
        modelUsed: currentModel
      };
    } catch (err) {
      lastError = err;
      // If it's a network or auth error, don't keep looping fallbacks endlessly
      if (err.message.includes("API key not valid") || err.message.includes("401") || err.message.includes("403")) {
        throw err;
      }
    }
  }

  throw lastError || new Error("Failed to call Gemini API across all model options.");
}

export const Gemini = {
  /**
   * Rank dataset candidates and return requested number of top cards
   */
  async rankDatasets({ candidates, difficulty = "intermediate", topics = "", apiKey, model = DEFAULT_MODEL, limit = 3 }) {
    if (!candidates || candidates.length === 0) return [];
    const count = parseInt(limit, 10) || 3;

    // Fallback heuristic ranking if no API key is available
    if (!apiKey) {
      return candidates.slice(0, count).map((item, idx) => ({
        id: item.id,
        title: item.title,
        source: item.source,
        score: (9.5 - idx * 0.2).toFixed(1),
        whyGreat: item.description || "High-quality dataset ideal for testing data cleaning, pivot tables, and aggregations.",
        url: item.url,
        columns: item.columns || []
      }));
    }

    try {
      const prompt = buildDatasetRankingPrompt(candidates, difficulty, topics, count);
      const res = await callGeminiAPI({
        model,
        apiKey,
        systemInstruction: `You are a senior data analytics hiring evaluator. Rank datasets deterministically and output only valid JSON array of the top ${count}.`,
        prompt,
        schemaType: "application/json"
      });

      const parsed = cleanAndParseJSON(res.text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Hydrate with original dataset info (URLs, columns, etc.)
        return parsed.slice(0, count).map(topItem => {
          const original = candidates.find(c => c.id === topItem.id || c.title === topItem.title) || {};
          return {
            ...original,
            ...topItem,
            score: topItem.score || 9.2,
            url: topItem.url || original.url || `https://huggingface.co/datasets/${topItem.id}`
          };
        });
      }
    } catch (err) {
      console.warn("Gemini dataset ranking failed, using heuristic top results:", err);
    }

    // Heuristic fallback
    return candidates.slice(0, count).map((item, idx) => ({
      id: item.id,
      title: item.title,
      source: item.source,
      score: (9.4 - idx * 0.2).toFixed(1),
      whyGreat: item.description || "Rich business transactions with dates, categories, and numeric metrics.",
      url: item.url,
      columns: item.columns || []
    }));
  },

  /**
   * Main Test Generator
   * Generates full case study with scenario, tasks, answer key, and synthetic data
   */
  async generateTest({ difficulty = "intermediate", topics = [], datasetMeta = null, taskCount = 15, apiKey, model = DEFAULT_MODEL }) {
    // If no key provided, return the built-in demo test
    if (!apiKey) {
      console.info("No Gemini API key provided; serving preloaded offline test.");
      return {
        ...SAMPLE_OFFLINE_TEST,
        isOfflineDemo: true,
        modelUsed: "Offline Demo (Built-in)"
      };
    }

    const systemInstruction = buildGoalOrientedSystemInstruction();
    const prompt = buildTestGenerationPrompt({ difficulty, topics, datasetMeta, taskCount, randomSeed: Date.now() });

    const res = await callGeminiAPI({
      model,
      apiKey,
      systemInstruction,
      prompt,
      schemaType: "application/json"
    });

    const parsed = cleanAndParseJSON(res.text);

    if (!parsed.test || !Array.isArray(parsed.test.tasks)) {
      throw new Error("Gemini returned invalid test structure. Please try generating again.");
    }

    // Ensure answerKey array exists (check root and inside test)
    if (!Array.isArray(parsed.answerKey)) {
      parsed.answerKey = Array.isArray(parsed.test?.answerKey) ? parsed.test.answerKey : [];
    }

    // Normalize tasks
    parsed.test.tasks.forEach((task, idx) => {
      const no = parseInt(task.number || task.no || task.taskNo || task.task_no || (idx + 1), 10);
      task.number = no;
      task.no = no;
    });

    // Normalize existing answerKey items
    parsed.answerKey.forEach((ans, idx) => {
      const no = parseInt(ans.taskNumber || ans.taskNo || ans.task_no || ans.no || ans.number || (idx + 1), 10);
      ans.taskNumber = no;
      ans.taskNo = no;
      ans.number = no;
      ans.answer = ans.answer || ans.solution || ans.formula || ans.exactFormula || "";
      ans.explanation = ans.explanation || ans.rationale || "";
      ans.proTip = ans.proTip || ans.tip || ans.bestPractice || "Always favor dynamic references over fixed cell ranges.";
      ans.interviewTalkingPoint = ans.interviewTalkingPoint || ans.talkingPoint || ans.interview || "Explain the trade-offs and performance benefits aloud to showcase senior analytical maturity.";
    });

    const existingAnswerTaskNos = new Set(parsed.answerKey.map(a => a.taskNumber));
    parsed.test.tasks.forEach(task => {
      const no = task.number;
      if (!existingAnswerTaskNos.has(no)) {
        parsed.answerKey.push({
          taskNumber: no,
          taskNo: no,
          number: no,
          category: task.category || "Data Analysis",
          answer: task.hint || "Review standard formula syntax for this cell.",
          explanation: `Solution for Task ${no}: ${task.instruction}`,
          proTip: "Use structured table column references rather than static cell ranges.",
          interviewTalkingPoint: "Explain to the interviewer how you validate boundary conditions and missing values."
        });
      }
    });

    // Ensure answer keys are in ascending task order
    parsed.answerKey.sort((a, b) => (a.taskNumber || 0) - (b.taskNumber || 0));

    // Assign a unique ID for storage
    parsed.test.id = "test-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7);
    parsed.test.generatedAt = new Date().toISOString();
    parsed.modelUsed = res.modelUsed;

    return parsed;
  },

  /**
   * Creative AI-Powered Quick Drill Generator
   */
  async generateDrillQuestions({ topic, datasetMeta = null, difficulty = "intermediate", apiKey, model = DEFAULT_MODEL, count = 5, drillMode = "scenario" }) {
    if (!apiKey) {
      return Gemini.getOfflineDrillQuestions(topic, drillMode);
    }

    try {
      const prompt = buildDrillGenerationPrompt({ topic, datasetMeta, difficulty, count, drillMode });
      const res = await callGeminiAPI({
        model,
        apiKey,
        systemInstruction: "You are a premier Data Analyst technical interviewer. Output only valid JSON with diverse, scenario-based interview drill questions.",
        prompt,
        schemaType: "application/json"
      });

      const parsed = cleanAndParseJSON(res.text);
      if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
        return parsed.questions;
      }
    } catch (err) {
      console.warn("Gemini drill generation failed, using rich offline workout scenarios:", err);
    }

    return Gemini.getOfflineDrillQuestions(topic, drillMode);
  },

  /**
   * Rich Offline Scenario Drill Questions Across 4 Specialized Workout Modes
   */
  getOfflineDrillQuestions(topic, drillMode = "scenario") {
    if (drillMode === "glitch") {
      return [
        {
          id: 1,
          type: "Glitch Hunt",
          badge: "🐛 Glitch Hunt",
          title: "The Silent VLOOKUP Sorting Bug",
          scenario: "An analyst used '=VLOOKUP(A2, Products!A2:E500, 4)' to find Unit Price. The table isn't sorted alphabetically. The formula returns prices, but they belong to the WRONG products! What is the single missing argument, and why did Excel not return an error?",
          solution: "The 4th argument [range_lookup] was omitted! In Excel, VLOOKUP defaults to TRUE (approximate match), which assumes ascending sorted order. When unsorted, it silently returns the wrong row. Fix: '=VLOOKUP(A2, Products!A2:E500, 4, FALSE)' or '=XLOOKUP(A2, Products!A2:A500, Products!D2:D500)' which defaults to exact match.",
          pitfallToAvoid: "Assuming that because a formula returns a number, the number is correct. Always explicitly pass FALSE or 0 for exact lookups.",
          interviewTalkingPoint: "Silent calculation errors are 10x more dangerous than #N/A. I enforce modern exact-match XLOOKUP or INDEX/MATCH across models to eliminate accidental approximate match bleed."
        },
        {
          id: 2,
          type: "Glitch Hunt",
          badge: "🐛 Glitch Hunt",
          title: "Unexpected #SPILL! Error on FILTER Formula",
          scenario: "You wrote '=FILTER(Orders[Order_ID], Orders[Region]=\"West\")' in cell G2. Instead of generating the list of orders, Excel displays '#SPILL!'. What physical obstruction causes this, and how do you clear it?",
          solution: "A #SPILL! error indicates the dynamic array needs cells below or to the right to spill its results, but one or more cells in the spill range are occupied by text, numbers, or even invisible formatting/spaces. Click the warning indicator to see the highlighted spill boundary, then clear or delete the blocking cells.",
          pitfallToAvoid: "Attempting to re-enter the formula with Ctrl+Shift+Enter or wrapping it in unnecessary nested IFs.",
          interviewTalkingPoint: "Dynamic arrays require clean calculation runways. In enterprise dashboard design, I keep dedicated output ranges or dedicated tabs to guarantee spill ranges remain unblocked."
        },
        {
          id: 3,
          type: "Glitch Hunt",
          badge: "🐛 Glitch Hunt",
          title: "Dates Calculating as #VALUE! in Arithmetic",
          scenario: "An imported CSV has dates like '2024.03.15' in column B. An analyst wrote '=B2 + 30' to calculate the invoice due date, but Excel returns '#VALUE!'. Why?",
          solution: "Excel stores true dates as serial numbers (e.g. 45366). '2024.03.15' uses period separators which Excel treats as plain text string literals. Mathematical addition (+ 30) fails on text. Fix: Replace periods with hyphens '=DATEVALUE(SUBSTITUTE(B2, \".\", \"-\")) + 30' or use Power Query to set Date locale.",
          pitfallToAvoid: "Changing the cell format dropdown to 'Short Date'—formatting cannot convert a text string to a serial number.",
          interviewTalkingPoint: "Date formatting is cosmetic; underlying data type is functional. When ingesting regional dates, I standardize via Power Query locale transformation to avoid silent arithmetic failure."
        },
        {
          id: 4,
          type: "Glitch Hunt",
          badge: "🐛 Glitch Hunt",
          title: "Formula Drag Shifts Lookup Table Headers",
          scenario: "A junior analyst wrote '=XLOOKUP(A2, Rates!A2:A50, Rates!B2:B50)' and dragged it down 2,000 rows. By row 100, the formula is '=XLOOKUP(A100, Rates!A100:A148, Rates!B100:B148)', causing massive #N/A errors. What was missed?",
          solution: "Relative references were used instead of absolute references ($). As the formula is dragged down, unanchored ranges shift downward. Fix: Lock ranges with F4: '=XLOOKUP(A2, Rates!$A$2:$A$50, Rates!$B$2:$B$50)' or use structured table references '=XLOOKUP(@[ID], RatesTable[ID], RatesTable[Rate])'.",
          pitfallToAvoid: "Manually retyping the range for each row instead of using F4 or Tables.",
          interviewTalkingPoint: "This is why I convert raw ranges to structured Excel Tables (Ctrl+T). Structured references automatically maintain column anchoring regardless of formula copy direction."
        },
        {
          id: 5,
          type: "Glitch Hunt",
          badge: "🐛 Glitch Hunt",
          title: "SUM Returning 0 Despite Visible Numbers",
          scenario: "Column D has 500 rows showing values like '$1,200.00'. '=SUM(D2:D501)' returns exact 0! Why does SUM completely ignore these visible dollar figures?",
          solution: "The values are stored as Text literals (common from ERP web exports). The standard =SUM() function is designed to ignore text entries without throwing an error, returning 0. Fix: Strip '$' and commas using Text to Columns, or multiply by 1 in a helper column, or clean via Power Query.",
          pitfallToAvoid: "Writing '=SUM(VALUE(D2:D501))' in legacy Excel without dynamic array support.",
          interviewTalkingPoint: "SUM's silent omission of text is a notorious interview trap. Checking ISNUMBER(D2) immediately reveals whether numbers are masquerading as strings."
        }
      ];
    }

    if (drillMode === "skeleton") {
      return [
        {
          id: 1,
          type: "Syntax Skeleton",
          badge: "🧩 Syntax Skeleton",
          title: "XLOOKUP Multi-Criterion & Fallback Skeleton",
          scenario: "Fill in the 3 blanks in this formula to look up employee 'Engineering' salary for Employee ID in cell A2 from table 'Staff', falling back to 'Not Found' if missing:\n=XLOOKUP(A2 & \"|\" & \"Engineering\", Staff[ID] & \"|\" & ___[1]___, ___[2]___, ___[3]___)",
          solution: "Blank [1]: Staff[Department]\nBlank [2]: Staff[Salary]\nBlank [3]: \"Not Found\"\nFull Formula: =XLOOKUP(A2 & \"|\" & \"Engineering\", Staff[ID] & \"|\" & Staff[Department], Staff[Salary], \"Not Found\")",
          pitfallToAvoid: "Using nested XLOOKUPs when concatenating criteria strings is cleaner and faster.",
          interviewTalkingPoint: "Concatenating lookup keys with delimiter '|' allows clean multi-column exact matching in XLOOKUP without requiring complex array multiplication."
        },
        {
          id: 2,
          type: "Syntax Skeleton",
          badge: "🧩 Syntax Skeleton",
          title: "SUMIFS Multi-Condition Date Window Skeleton",
          scenario: "Fill in the 3 blanks to sum 'Revenue' in table 'Orders' for 'West' region orders placed after 2024-01-01:\n=SUMIFS(___[1]___, Orders[Region], \"West\", Orders[OrderDate], ___[2]___ & DATE(___[3]___))",
          solution: "Blank [1]: Orders[Revenue]\nBlank [2]: \">=\" (or \">\")\nBlank [3]: 2024, 1, 1\nFull Formula: =SUMIFS(Orders[Revenue], Orders[Region], \"West\", Orders[OrderDate], \">=\" & DATE(2024, 1, 1))",
          pitfallToAvoid: "Hardcoding date strings like '>1/1/2024' which fail across non-US computer regional settings.",
          interviewTalkingPoint: "Always concatenate comparison operators with the DATE() function in SUMIFS to prevent international date formatting bugs."
        },
        {
          id: 3,
          type: "Syntax Skeleton",
          badge: "🧩 Syntax Skeleton",
          title: "INDEX & Exact MATCH Classic Skeleton",
          scenario: "Fill in the 3 blanks to execute a 2-way matrix lookup returning the value at the intersection of Product in A2 and Month in B1:\n=INDEX(DataMatrix, MATCH(A2, ___[1]___, ___[2]___), MATCH(B1, ___[3]___, 0))",
          solution: "Blank [1]: ProductList (or DataMatrix column index)\nBlank [2]: 0 (exact match)\nBlank [3]: MonthHeaders (or DataMatrix header row)\nFull Formula: =INDEX(DataMatrix, MATCH(A2, ProductList, 0), MATCH(B1, MonthHeaders, 0))",
          pitfallToAvoid: "Omitting the 0 in MATCH, which defaults to 1 (less than) and requires ascending order.",
          interviewTalkingPoint: "INDEX-MATCH-MATCH is the gold standard 2-way matrix lookup. It handles row and column coordinate lookups without recalculating the entire sheet."
        },
        {
          id: 4,
          type: "Syntax Skeleton",
          badge: "🧩 Syntax Skeleton",
          title: "Dynamic Array FILTER Multi-Filter Skeleton",
          scenario: "Fill in the 2 blanks to extract all rows from 'Transactions' where Region is 'West' AND Amount exceeds 500:\n=FILTER(Transactions, (Transactions[Region] = \"West\") ___[1]___ (Transactions[Amount] ___[2]___ 500))",
          solution: "Blank [1]: * (asterisk represents Boolean AND in dynamic arrays)\nBlank [2]: >\nFull Formula: =FILTER(Transactions, (Transactions[Region] = \"West\") * (Transactions[Amount] > 500))",
          pitfallToAvoid: "Using the AND() function inside FILTER. AND() aggregates into a single TRUE/FALSE, breaking array filtering. Use * for AND, + for OR.",
          interviewTalkingPoint: "In Excel dynamic arrays, boolean logic is vectorized: multiplication (*) represents AND, while addition (+) represents OR."
        },
        {
          id: 5,
          type: "Syntax Skeleton",
          badge: "🧩 Syntax Skeleton",
          title: "LET Function Efficiency Skeleton",
          scenario: "Fill in the blanks to calculate profit margin only if revenue is positive, avoiding calculating Revenue twice:\n=LET(rev, ___[1]___, cost, ___[2]___, IF(rev > 0, (rev - cost) / rev, 0))",
          solution: "Blank [1]: Orders[Revenue]\nBlank [2]: Orders[Cost]\nFull Formula: =LET(rev, Orders[Revenue], cost, Orders[Cost], IF(rev > 0, (rev - cost) / rev, 0))",
          pitfallToAvoid: "Repeating complex sub-formulas multiple times in nested IFs.",
          interviewTalkingPoint: "The LET function defines local variables in formula memory. It improves readability and speeds up workbook recalculation by computing sub-expressions only once."
        }
      ];
    }

    if (drillMode === "verbal") {
      return [
        {
          id: 1,
          type: "Verbal Defense",
          badge: "🎙️ Verbal Defense",
          title: "XLOOKUP vs. VLOOKUP Architectural Defense",
          scenario: "Interviewer asks: 'Our company has used VLOOKUP for 15 years. Why should we migrate our core financial models to XLOOKUP, and what risks does VLOOKUP pose to model stability?'",
          solution: "1. Column Insertion Resilience: VLOOKUP uses static integer indexes (e.g. 4); inserting a column breaks calculations silently. XLOOKUP uses direct range references that adjust dynamically.\n2. Exact Match Default: VLOOKUP defaults to approximate match (TRUE), creating silent error risks. XLOOKUP defaults to exact match.\n3. Leftward Lookups: VLOOKUP cannot look left without helper columns or CHOOSE hacks; XLOOKUP looks in any direction.",
          pitfallToAvoid: "Saying 'because XLOOKUP is newer'. Senior interviewers want technical risk mitigation and auditability answers.",
          interviewTalkingPoint: "I advise XLOOKUP because static column indexing in VLOOKUP introduces catastrophic fragility whenever columns are added or re-ordered. XLOOKUP's direct column mapping guarantees zero calculation drift."
        },
        {
          id: 2,
          type: "Verbal Defense",
          badge: "🎙️ Verbal Defense",
          title: "DAX Calculated Column vs. Measure Trade-off",
          scenario: "Interviewer asks: 'When building a Power Pivot model or Power BI report, when do you create a Calculated Column versus a Measure, and what is the memory implication?'",
          solution: "1. Calculated Columns evaluate row-by-row during data refresh, consuming physical RAM and increasing file size. Use ONLY when you need to slice, filter, or group by that attribute in rows/columns.\n2. Measures evaluate on the fly based on the current filter context (e.g. SUM, AVERAGE, DIVIDE), consuming zero static storage. Always use Measures for aggregations and KPIs.",
          pitfallToAvoid: "Creating calculated columns for simple aggregations like Total Profit = [Sales] - [Cost].",
          interviewTalkingPoint: "My rule of thumb: If you need to put it in a Pivot Slicer or Row label, it's a Calculated Column. If you need it in the Values area as an aggregated metric, it must be a Measure to preserve engine memory."
        },
        {
          id: 3,
          type: "Verbal Defense",
          badge: "🎙️ Verbal Defense",
          title: "Defending Power Query over Worksheet Helper Columns",
          scenario: "Interviewer asks: 'Why should our team build ETL pipelines in Power Query rather than adding helper formula columns in the raw Excel sheet?'",
          solution: "1. Data Immutability: Power Query leaves raw source files read-only and uncorrupted, recording every transformation in reproducible M steps.\n2. Scalability: Power Query can process millions of rows beyond Excel's 1,048,576 grid limit using the VertiPaq engine.\n3. Maintenance: Next month's file requires one click on 'Refresh', whereas manual formula columns require dragging, auditing, and fixing broken references.",
          pitfallToAvoid: "Dismissing worksheet formulas entirely; acknowledge formulas are great for ad-hoc scratchpad analysis.",
          interviewTalkingPoint: "I decouple data preparation from analysis. Power Query is our automated ETL layer; worksheet formulas are reserved for presentation metrics."
        },
        {
          id: 4,
          type: "Verbal Defense",
          badge: "🎙️ Verbal Defense",
          title: "Explaining Volatility: OFFSET and INDIRECT",
          scenario: "Interviewer asks: 'Why do senior Excel modelers strictly ban the OFFSET and INDIRECT functions in institutional financial models?'",
          solution: "Excel's calculation engine normally uses a 'smart calculation tree'—it only recalculates cells whose precedents change. Volatile functions like OFFSET, INDIRECT, and NOW() flag themselves as dirty every single time ANY cell in ANY open workbook changes. In large workbooks, this causes 30-60 second freezing on every user keystroke.",
          pitfallToAvoid: "Confusing dynamic range definitions with volatile functions. Non-volatile INDEX can create dynamic ranges without volatility.",
          interviewTalkingPoint: "Volatile functions destroy Excel's dependency graph. I replace OFFSET with non-volatile INDEX reference syntax, dropping workbook recalculation from minutes to milliseconds."
        },
        {
          id: 5,
          type: "Verbal Defense",
          badge: "🎙️ Verbal Defense",
          title: "Handling Missing Lookup Values Gracefully",
          scenario: "Interviewer asks: 'How do you handle lookup misses in client-facing executive dashboards, and why is wrapping everything in IFERROR considered poor practice?'",
          solution: "Wrapping entire formulas in '=IFERROR(..., \"\")' masks critical syntax errors, typos in table names, or circular references—burying genuine bugs under blank cells. Best practice: Use XLOOKUP's built-in [if_not_found] parameter, or test specifically with IF(ISNA(...)), preserving real calculation errors (#DIV/0!, #REF!) for auditability.",
          pitfallToAvoid: "Claiming IFERROR is the cleanest solution. It hides catastrophic formula breaks.",
          interviewTalkingPoint: "Indiscriminate IFERROR masking is a red flag in production models. I use XLOOKUP's dedicated not-found argument to handle missing entities while keeping operational errors visible."
        }
      ];
    }

    // Default: drillMode === "scenario"
    return [
      {
        id: 1,
        type: "Technical Scenario",
        badge: "🎯 Technical Scenario",
        title: "Unexpected #N/A on Visible Text Lookup",
        scenario: "An analyst used '=XLOOKUP(A2, Products!A:A, Products!B:B)'. Cell A2 is visibly '10482', and row 45 in Products!A:A also visibly says '10482', yet Excel consistently returns #N/A. What are the two most likely data type or hygiene issues, and how do you resolve them in under 30 seconds?",
        solution: "1. Data Type Mismatch: One is stored as Text and the other as a true Number. Convert using '=VALUE(A2)' or '=A2&\"\"', or select the column > Data > Text to Columns > Finish.\n2. Invisible Whitespace: Hidden trailing spaces or non-breaking spaces (CHAR(160) from web scraping). Wrap the lookup key in '=TRIM(CLEAN(A2))'.",
        pitfallToAvoid: "Trying to replace XLOOKUP with nested IFs or VLOOKUP without cleaning the underlying data type disparity first.",
        interviewTalkingPoint: "In production analytics, 90% of lookup failures stem from string vs numeric type coercion or non-breaking HTML spaces (CHAR 160). I always inspect with ISTEXT() or ISNUMBER() before assuming formula syntax is wrong."
      },
      {
        id: 2,
        type: "Technical Scenario",
        badge: "🎯 Technical Scenario",
        title: "Volatile Formulas Freezing a 500,000-Row Workbook",
        scenario: "A financial reporting model with 500,000 rows re-calculates for 45 seconds on every keystroke. You notice heavy usage of =OFFSET() and =INDIRECT() across 20 KPI summary tabs. Why are these functions causing catastrophic lag, and what non-volatile pattern replaces them?",
        solution: "OFFSET and INDIRECT are 'volatile' functions: Excel recalculates them every time ANY cell changes anywhere in the entire workbook, regardless of whether their precedent cells were touched. Replace OFFSET with non-volatile INDEX: '=INDEX(Range, row_num, col_num)' which only recalculates when its actual precedent cells change.",
        pitfallToAvoid: "Confusing dynamic ranges with volatile ranges. INDEX reference syntax '=INDEX(A:A, 1):INDEX(A:A, 100)' creates a completely dynamic, non-volatile range.",
        interviewTalkingPoint: "I enforce non-volatile architecture across all enterprise workbooks. Replacing OFFSET and INDIRECT with INDEX-based ranges or Power Query caching routinely slashes model calculation times from 45 seconds to sub-second responses."
      },
      {
        id: 3,
        type: "Technical Scenario",
        badge: "🎯 Technical Scenario",
        title: "Multi-Condition Revenue Aggregation with Date Window",
        scenario: "You have a transactions table 'SalesTable' with columns [OrderDate], [Region], [Status], and [Revenue]. Leadership wants total completed revenue for 'West' and 'Central' regions combined, strictly for transactions that occurred between 2024-01-01 and 2024-03-31.",
        solution: "Write a compound SUMIFS formula using an array constant for the regions:\n=SUM(SUMIFS(SalesTable[Revenue], SalesTable[Region], {\"West\",\"Central\"}, SalesTable[Status], \"Completed\", SalesTable[OrderDate], \">=\"&DATE(2024,1,1), SalesTable[OrderDate], \"<=\"&DATE(2024,3,31)))",
        pitfallToAvoid: "Forgetting the outer =SUM() when evaluating array constants {\"West\", \"Central\"}, which would otherwise only return the total for 'West'.",
        interviewTalkingPoint: "Wrapping SUMIFS in SUM with an array constant gives clean OR logic across multiple regions without duplicating long formula strings. In modern Excel, =LET() can also be used to keep the date boundaries parameterized."
      },
      {
        id: 4,
        type: "Technical Scenario",
        badge: "🎯 Technical Scenario",
        title: "Defending Power Query ETL vs. Worksheet Formula Chains",
        scenario: "The Director of BI asks during your technical round: 'Our junior analysts use 15 helper columns with LEFT, MID, FIND, and nested SUBSTITUTE to clean customer addresses. Why should we mandate Power Query over these formulas for monthly refreshes?'",
        solution: "1. Immutability & Auditability: Power Query preserves the raw input untouched and logs each cleaning step in reproducible M-code.\n2. Memory Footprint: Formula chains bloat workbook file size and recalculate constantly; Power Query loads only the final clean output into the data model or grid.\n3. One-Click Automated Maintenance: Next month's new 50,000-row file refreshes in 2 seconds with zero formula dragging or row limit worries.",
        pitfallToAvoid: "Saying 'formulas are bad'. Formulas are great for ad-hoc exploration, but fragile for production pipelines.",
        interviewTalkingPoint: "I separate data transformation from presentation. Power Query acts as our lightweight, local ETL layer, while worksheet formulas and DAX are reserved for end-user metrics and interactive dashboarding."
      },
      {
        id: 5,
        type: "Technical Scenario",
        badge: "🎯 Technical Scenario",
        title: "Extract Top 5 Highest-Margin Products Dynamically",
        scenario: "Given table 'ProductCatalog' with columns [ProductCode], [Category], [MarginPct], construct a single formula in cell F2 that dynamically extracts and sorts the top 5 products in the 'Electronics' category by MarginPct in descending order.",
        solution: "=TAKE(SORT(FILTER(ProductCatalog[[ProductCode]:[MarginPct]], ProductCatalog[Category]=\"Electronics\"), 3, -1), 5)",
        pitfallToAvoid: "Using legacy array formulas (Ctrl+Shift+Enter) or manual sorting that breaks when new inventory is added.",
        interviewTalkingPoint: "Dynamic array functions like FILTER, SORT, and TAKE completely eliminate helper columns and volatile VBA macros. When new catalog rows are appended, the top-5 list updates instantly."
      }
    ];
  },

  /**
   * Generate an on-demand contextual hint for a specific task
   */
  async generateHint({ task, scenario, apiKey, model = DEFAULT_MODEL }) {
    if (!apiKey) {
      return task.hint || "Review the official Microsoft Excel documentation for this function.";
    }

    try {
      const prompt = buildHintPrompt(task, scenario);
      const res = await callGeminiAPI({
        model,
        apiKey,
        systemInstruction: "You are a patient, encouraging Excel technical mentor.",
        prompt,
        schemaType: "text/plain"
      });
      return res.text.trim();
    } catch {
      return task.hint || "Review lookup arguments and ensure your table references are absolute.";
    }
  }
};

