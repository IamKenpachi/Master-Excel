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
  },

  /**
   * AI Excel Assistant Chatbot Query Handler
   * Provides real-time expert answers to Excel, Power Query, DAX, and interview questions.
   * Includes rich offline fallback dictionary for zero-latency responses without API keys.
   */
  async askChatbotAssistant({ message, history = [], context = null, apiKey, model = DEFAULT_MODEL }) {
    const trimmedMsg = (message || "").trim();
    if (!trimmedMsg) {
      return "Please enter a question about an Excel formula, function, error, or data workflow.";
    }

    // 1. If API key is available, execute through Gemini
    if (apiKey) {
      try {
        const systemInstruction = `You are ExcelCoach AI Assistant, an elite Senior Excel & Business Intelligence Technical Coach.
You assist data analysts and candidates in technical interview preparation and day-to-day spreadsheet problem solving.

Your Instructions:
1. Provide concise, direct, authoritative Excel, Power Query M code, or DAX advice.
2. When proposing formulas, always format them in markdown code fences with 'excel' tag, e.g.:
\`\`\`excel
=XLOOKUP(lookup_value, lookup_array, return_array, [if_not_found])
\`\`\`
3. Explain parameters clearly and mention interview-critical best practices (e.g., using structured references @[Col], avoiding volatile OFFSET/INDIRECT, exact match defaults).
4. If appropriate, add a short "💡 Interview Room Tip" explaining what to say aloud to demonstrate seniority.
5. If Active Task Context is provided below, directly address the candidate's current task and dataset schema.
6. Keep answers punchy, practical, and under 300 words. Avoid generic pleasantries.`;

        // Format conversation history
        let conversationPrompt = "";
        if (Array.isArray(history) && history.length > 0) {
          const recent = history.slice(-4);
          conversationPrompt += "<previous_conversation>\n";
          recent.forEach(turn => {
            const role = turn.role === "user" ? "User" : "Assistant";
            conversationPrompt += `${role}: ${turn.text}\n`;
          });
          conversationPrompt += "</previous_conversation>\n\n";
        }

        // Format active context
        if (context && (context.task || context.datasetName)) {
          conversationPrompt += "<active_candidate_context>\n";
          if (context.taskNo) conversationPrompt += `Active Task No: ${context.taskNo}\n`;
          if (context.category) conversationPrompt += `Category: ${context.category}\n`;
          if (context.instruction) conversationPrompt += `Current Task Instruction: ${context.instruction}\n`;
          if (context.targetCell) conversationPrompt += `Target Cell: ${context.targetCell}\n`;
          if (context.candidateFormula) conversationPrompt += `Candidate Draft Formula: ${context.candidateFormula}\n`;
          if (context.datasetName) conversationPrompt += `Dataset: ${context.datasetName}\n`;
          if (Array.isArray(context.columns) && context.columns.length > 0) {
            conversationPrompt += `Available Columns: ${context.columns.join(", ")}\n`;
          }
          conversationPrompt += "</active_candidate_context>\n\n";
        }

        conversationPrompt += `Candidate Question: ${trimmedMsg}`;

        const res = await callGeminiAPI({
          model,
          apiKey,
          systemInstruction,
          prompt: conversationPrompt,
          schemaType: "text/plain"
        });

        if (res && res.text) {
          return res.text.trim();
        }
      } catch (err) {
        console.warn("Gemini chatbot API call failed, using intelligent offline response:", err);
      }
    }

    // 2. Intelligent Offline Fallback Engine
    return getOfflineChatbotAnswer(trimmedMsg, context);
  },

  // ----------------------------------------------------
  // Phase 5: Daily Interview Gauntlet
  // ----------------------------------------------------
  async generateDailyGauntlet({ difficulty = "intermediate", weakCategories = [], apiKey, model = DEFAULT_MODEL }) {
    if (apiKey) {
      try {
        const weakList = Array.isArray(weakCategories) && weakCategories.length ? weakCategories.join(", ") : "General";
        const systemInstruction = `You are an expert Excel Data Analyst interview question designer. Generate ONE challenging but fair daily practice question.

Requirements:
- Difficulty: ${difficulty}
- Prefer questions from these weak areas if possible: ${weakList}
- Question type: rotate among: scenario (explain what formula to use), formula-completion (fill in the blank), glitch-hunt (identify the bug), comparison (choose between approaches)
- The question must be solvable in under 3 minutes
- Must be directly relevant to a Data Analyst interview

Return ONLY valid JSON in this exact shape:
{
  "question": "...",
  "expectedAnswer": "...",
  "explanation": "...",
  "talkingPoint": "...",
  "category": "..."
}
Do not include markdown code fences, return raw JSON.`;

        const prompt = `Generate today's ${difficulty} interview gauntlet question.`;
        const res = await callGeminiAPI({
          model,
          apiKey,
          systemInstruction,
          prompt,
          schemaType: "application/json"
        });

        const parsed = cleanAndParseJSON(res.text);
        if (parsed && parsed.question) {
          return {
            question: parsed.question,
            expectedAnswer: parsed.expectedAnswer || "",
            explanation: parsed.explanation || "",
            talkingPoint: parsed.talkingPoint || "",
            category: parsed.category || "General",
            difficulty
          };
        }
      } catch (err) {
        console.warn("Gemini gauntlet generation failed, using offline fallback:", err);
      }
    }

    // Offline fallback: Rotate through 10 curated questions based on day of month
    const day = new Date().getDate();
    const fallback = OFFLINE_GAUNTLET_QUESTIONS[(day - 1) % OFFLINE_GAUNTLET_QUESTIONS.length];
    return { ...fallback, difficulty };
  },

  async gradeGauntletAnswer({ question, expectedAnswer, userAnswer, apiKey, model = DEFAULT_MODEL }) {
    const trimmedAnswer = (userAnswer || "").trim();
    if (apiKey && trimmedAnswer) {
      try {
        const systemInstruction = `You are an expert Excel interview evaluator. Grade the user's answer to this daily gauntlet question.

Question: ${question}
Expected Answer: ${expectedAnswer}
User's Answer: ${trimmedAnswer}

Evaluate on:
1. Correctness (0–5): Is the core answer right?
2. Completeness (0–3): Did they cover edge cases or explain "why"?
3. Interview Quality (0–2): Is the phrasing professional / interview-ready?

Return ONLY valid JSON:
{
  "score": 8,
  "feedback": "...",
  "correctAnswer": "...",
  "improvement": "..."
}
Do not include markdown code fences, return raw JSON.`;

        const prompt = `Grade this candidate's gauntlet answer.`;
        const res = await callGeminiAPI({
          model,
          apiKey,
          systemInstruction,
          prompt,
          schemaType: "application/json"
        });

        const parsed = cleanAndParseJSON(res.text);
        if (parsed && typeof parsed.score === "number") {
          return {
            score: Math.min(10, Math.max(0, parsed.score)),
            feedback: parsed.feedback || "Answer evaluated.",
            correctAnswer: parsed.correctAnswer || expectedAnswer,
            improvement: parsed.improvement || "Highlight business impact in your explanation."
          };
        }
      } catch (err) {
        console.warn("Gemini gauntlet grading failed, using heuristic evaluation:", err);
      }
    }

    // Offline heuristic evaluation
    return evaluateGauntletOffline(question, expectedAnswer, trimmedAnswer);
  },

  // ----------------------------------------------------
  // Phase 5: Verbal Defense Mode
  // ----------------------------------------------------
  async generateVerbalDefenseDrill({ topic = "XLOOKUP vs VLOOKUP", category = "lookup", difficulty = "intermediate", apiKey, model = DEFAULT_MODEL }) {
    if (apiKey) {
      try {
        const systemInstruction = `You are an expert Data Analyst interview coach. Create ONE verbal defense drill scenario.

The user is preparing to explain their formula choices to a Data Analyst interviewer.
Topic: ${topic}
Category: ${category}
Difficulty: ${difficulty}

Types of verbal defense drills (pick one):
1. Tool Comparison: "Explain why you'd use XLOOKUP over VLOOKUP"
2. Error Handling: "Explain how you handle #N/A errors and why IFERROR matters to an interviewer"
3. Approach Justification: "Explain why you'd use Power Query instead of manual copy-paste for monthly reports"
4. Trade-off Discussion: "When would you choose INDEX/MATCH over XLOOKUP?"
5. Non-Technical Explanation: "Explain SUMIFS to a non-technical manager who just wants the number"

Return ONLY valid JSON:
{
  "scenario": "...",
  "prompt": "...",
  "context": "...",
  "difficulty": "${difficulty}",
  "category": "${category}"
}
Do not include markdown code fences, return raw JSON.`;

        const prompt = `Generate a verbal defense drill scenario for "${topic}".`;
        const res = await callGeminiAPI({
          model,
          apiKey,
          systemInstruction,
          prompt,
          schemaType: "application/json"
        });

        const parsed = cleanAndParseJSON(res.text);
        if (parsed && parsed.prompt) {
          return {
            scenario: parsed.scenario || `An interviewer asks you to defend your solution for ${topic}.`,
            prompt: parsed.prompt,
            context: parsed.context || parsed.scenario || `Interview defense context for ${topic}.`,
            difficulty,
            category
          };
        }
      } catch (err) {
        console.warn("Gemini verbal defense drill generation failed, using offline fallback:", err);
      }
    }

    // Offline fallback
    const matched = OFFLINE_VERBAL_DRILLS.find(d => d.topic.toLowerCase().includes((topic || "").toLowerCase()));
    const drill = matched || OFFLINE_VERBAL_DRILLS[Math.floor(Math.random() * OFFLINE_VERBAL_DRILLS.length)];
    return {
      scenario: drill.scenario,
      prompt: drill.prompt,
      context: drill.context,
      difficulty,
      category
    };
  },

  async gradeVerbalDefense({ question, context, userResponse, apiKey, model = DEFAULT_MODEL }) {
    const trimmed = (userResponse || "").trim();
    if (apiKey && trimmed) {
      try {
        const systemInstruction = `You are an expert Data Analyst interview evaluator grading a verbal defense response.

Scenario: ${context}
Question asked: ${question}
User's response: ${trimmed}

Grade on these 3 axes:
1. Technical Accuracy (0–3): Is the explanation technically correct?
2. Clarity (0–3): Would a non-technical interviewer understand this?
3. Interview Language Quality (0–4): Is the phrasing professional and interview-ready? Uses correct terminology? Avoids vague phrases like "it's better" without explaining why?

Also provide:
- feedback: Coaching notes on what was good and what needs work
- improvedPhrase: A model answer that would score 10/10 (2–4 sentences)

Return ONLY valid JSON:
{
  "scores": { "accuracy": 2, "clarity": 3, "interviewLanguage": 3 },
  "total": 8,
  "feedback": "...",
  "improvedPhrase": "..."
}
Do not include markdown code fences, return raw JSON.`;

        const prompt = `Evaluate candidate's verbal defense response.`;
        const res = await callGeminiAPI({
          model,
          apiKey,
          systemInstruction,
          prompt,
          schemaType: "application/json"
        });

        const parsed = cleanAndParseJSON(res.text);
        if (parsed && parsed.scores) {
          const acc = Math.min(3, Math.max(0, parsed.scores.accuracy || 0));
          const cla = Math.min(3, Math.max(0, parsed.scores.clarity || 0));
          const lang = Math.min(4, Math.max(0, parsed.scores.interviewLanguage || 0));
          const total = typeof parsed.total === "number" ? Math.min(10, Math.max(0, parsed.total)) : (acc + cla + lang);
          return {
            scores: { accuracy: acc, clarity: cla, interviewLanguage: lang },
            total,
            feedback: parsed.feedback || "Well defended response.",
            improvedPhrase: parsed.improvedPhrase || "Directly linking technical properties to business risk mitigation creates an executive-ready defense."
          };
        }
      } catch (err) {
        console.warn("Gemini verbal defense grading failed, using offline fallback:", err);
      }
    }

    return evaluateVerbalDefenseOffline(question, context, trimmed);
  }
};

// ----------------------------------------------------
// Offline Fallback Pools & Heuristic Graders
// ----------------------------------------------------

const OFFLINE_GAUNTLET_QUESTIONS = [
  {
    category: "Lookup & Reference",
    question: "A financial model using VLOOKUP suddenly returns incorrect numbers after an analyst added a 'Region Code' column in column C. Why did this happen, and what formula completely prevents this failure?",
    expectedAnswer: "=XLOOKUP(lookup_value, lookup_col, return_col) or INDEX/MATCH",
    explanation: "VLOOKUP relies on a hardcoded column index integer (e.g. 4). Inserting column C shifted the columns to the right, causing VLOOKUP to read the wrong column. XLOOKUP uses direct range references that adjust dynamically without breaking.",
    talkingPoint: "I advise XLOOKUP in corporate models because static column indexing creates catastrophic silent errors whenever sheets are edited or expanded."
  },
  {
    category: "Data Aggregation",
    question: "What is the crucial syntax difference between SUMIF and SUMIFS regarding the position of the sum range, and what error occurs if ranges have mismatched dimensions?",
    expectedAnswer: "In SUMIF, sum_range is optional and 3rd. In SUMIFS, sum_range is 1st and required. Mismatched dimensions cause #VALUE!.",
    explanation: "SUMIFS requires the sum_range as the very first argument, followed by criteria pairs. If the sum_range and criteria_ranges have differing numbers of rows or columns, Excel returns a #VALUE! error.",
    talkingPoint: "I always standardize on SUMIFS even for single conditions to maintain consistent parameter order across all team formulas."
  },
  {
    category: "Error Handling",
    question: "Why do senior Excel modelers consider wrapping an entire complex formula in '=IFERROR(..., \"\")' an anti-pattern, and what should you do instead?",
    expectedAnswer: "It masks legitimate bugs like #REF!, typos, and circular references. Use XLOOKUP's [if_not_found] parameter or IF(ISNA(...)).",
    explanation: "IFERROR catches all errors indiscriminately, turning formula typos, syntax breaks, and deleted column refs into silent blank cells. Targeted error handling preserves operational integrity.",
    talkingPoint: "Blanket IFERROR is dangerous in financial models because it hides systemic formula breakage under innocent-looking blank cells."
  },
  {
    category: "Modern Dynamic Arrays",
    question: "What causes a #SPILL! error when using the FILTER or UNIQUE function, and how do you resolve it in an official Excel Table?",
    expectedAnswer: "Obstructed target cells or trying to spill inside an Excel Table (ListObject). Clear obstructing cells or place formula outside the table.",
    explanation: "Excel Tables cannot contain dynamic array formulas that spill vertically. Dynamic arrays must be placed in standard worksheet ranges with unobstructed space below.",
    talkingPoint: "I pair Excel Tables for reliable structured data ingestion with Dynamic Arrays on separate presentation sheets to feed KPI dashboards."
  },
  {
    category: "Data Hygiene",
    question: "A lookup on customer IDs returns #N/A even though the ID visibly appears in both tables. Name the two most frequent root causes and how to diagnose them.",
    expectedAnswer: "Data type mismatch (Text vs Number) and hidden whitespace or non-breaking spaces (CHAR(160)).",
    explanation: "Excel treats text '101' and integer 101 as non-equal. Also, web scraping often imports non-breaking space CHAR(160) which regular TRIM does not remove.",
    talkingPoint: "I sanitize raw imports with TRIM(CLEAN(SUBSTITUTE(cell, CHAR(160), ' '))) and check ISNUMBER() before assuming lookup failure."
  },
  {
    category: "Lookup & Reference",
    question: "How do you construct a two-way matrix lookup in Excel using INDEX and MATCH to dynamically search across both rows and columns?",
    expectedAnswer: "=INDEX(DataRange, MATCH(RowVal, RowHeaders, 0), MATCH(ColVal, ColHeaders, 0))",
    explanation: "The first MATCH provides the row offset, and the second MATCH provides the column offset within the two-dimensional DataRange.",
    talkingPoint: "Two-way INDEX/MATCH turns static crosstabs into automated matrix search engines without needing unpivoting."
  },
  {
    category: "Power Query ETL",
    question: "When monthly financial reports arrive as wide pivot summaries with months as column headers, what Power Query operation prepares this data for analysis, and why?",
    expectedAnswer: "Unpivot Columns (or Unpivot Other Columns) to convert wide data into tall attribute-value pairs.",
    explanation: "Wide tables violate first normal form. Unpivoting creates a standardized 'Month' attribute and 'Amount' metric, allowing Pivot Tables to slice and aggregate seamlessly.",
    talkingPoint: "Unpivoting in Power Query is the prerequisite for any automated star schema or executive dashboard."
  },
  {
    category: "Data Modeling & DAX",
    question: "In Power Pivot or Power BI, when should you create a Calculated Column versus a DAX Measure, and what is the memory impact?",
    expectedAnswer: "Calculated Columns compute row-by-row during refresh and consume RAM. Measures compute dynamically on filter context with zero storage footprint.",
    explanation: "Calculated columns increase file size and RAM usage. Use them only when you need row-level categorization for slicers. Use measures for all numeric aggregations.",
    talkingPoint: "My rule: Slicers and row labels get Calculated Columns; numeric KPI values must be Measures to preserve engine performance."
  },
  {
    category: "Modern Dynamic Arrays",
    question: "How do you filter a dataset for multiple conditions using the FILTER function with AND logic versus OR logic?",
    expectedAnswer: "Multiply conditions for AND: (ColA = \"X\") * (ColB > 10). Add conditions for OR: (ColA = \"X\") + (ColB > 10).",
    explanation: "Excel boolean logic in dynamic arrays uses multiplication for boolean intersection (AND) and addition for boolean union (OR).",
    talkingPoint: "Using boolean algebra inside FILTER allows complex compound segmentation without nested helper columns."
  },
  {
    category: "Formulas & Fundamentals",
    question: "Explain the difference between $A$1, $A1, and A$1 when copying a formula across rows and down columns.",
    expectedAnswer: "$A$1 is fully absolute. $A1 locks column A while row changes. A$1 locks row 1 while column changes.",
    explanation: "The dollar sign locks the coordinate immediately following it. This allows single formulas to populate two-way multiplication tables or matrix lookups.",
    talkingPoint: "Mastery of mixed references ($A1 vs A$1) is the mark of an efficient modeler who writes a single formula that scales across an entire table."
  }
];

const OFFLINE_VERBAL_DRILLS = [
  {
    topic: "XLOOKUP vs VLOOKUP",
    category: "lookup",
    scenario: "During an interview for a Senior Data Analyst role, the hiring manager asks: 'We have 200 legacy spreadsheets relying on VLOOKUP. Defend why we should migrate new reporting to XLOOKUP and what specific business risks VLOOKUP creates.'",
    prompt: "Deliver your 2–4 sentence verbal defense explaining why XLOOKUP is architecturally superior and what specific risks VLOOKUP introduces.",
    context: "Senior analyst candidate defending XLOOKUP adoption to reduce maintenance and column insertion risk."
  },
  {
    topic: "DAX Measures vs Calculated Columns",
    category: "power_pivot",
    scenario: "An executive asks why the quarterly financial model file is 85MB and slow to recalculate. They noticed junior analysts added 15 calculated columns.",
    prompt: "Explain to the executive the memory difference between Calculated Columns and DAX Measures and your remediation plan.",
    context: "Defending DAX measures to optimize VertiPaq engine memory and workbook performance."
  },
  {
    topic: "Power Query vs Helper Formulas",
    category: "power_query",
    scenario: "A finance manager asks: 'Why spend time setting up Power Query when I can just paste the CSV into Excel and drag down helper formulas?'",
    prompt: "Defend using Power Query ETL over worksheet helper columns, focusing on data immutability and maintenance time.",
    context: "Defending automated reproducible ETL versus manual worksheet formula dragging."
  },
  {
    topic: "IFERROR vs Targeted Error Handling",
    category: "logical",
    scenario: "An interviewer notices you used IF(ISNA(...)) instead of IFERROR in a formula audit and asks: 'Isn't IFERROR simpler and cleaner?'",
    prompt: "Defend why blanket IFERROR is considered risky in corporate financial models and when targeted handling is required.",
    context: "Defending error containment discipline over blanket suppression."
  },
  {
    topic: "Dynamic Arrays vs Legacy Formulas",
    category: "dynamic_arrays",
    scenario: "Your team lead wants to know why you replaced 5 helper columns and a Pivot Table with a single FILTER + SORT formula.",
    prompt: "Defend using Modern Dynamic Arrays for agile reporting, noting both benefits and potential collaboration constraints.",
    context: "Defending dynamic array adoption while acknowledging Office version compatibility."
  }
];

function evaluateGauntletOffline(question, expectedAnswer, userAnswer) {
  if (!userAnswer || userAnswer.length < 5) {
    return {
      score: 2,
      feedback: "Answer is too brief to demonstrate full technical competency to an interviewer.",
      correctAnswer: expectedAnswer,
      improvement: "State the specific function name and provide the exact reasoning."
    };
  }

  const ansLower = userAnswer.toLowerCase();
  const expLower = (expectedAnswer || "").toLowerCase();

  // Extract key terms
  const terms = expLower.split(/[\s,()=]+/).filter(t => t.length > 3);
  let matchCount = 0;
  terms.forEach(t => {
    if (ansLower.includes(t)) matchCount++;
  });

  const termRatio = terms.length ? matchCount / terms.length : 0.5;
  let score = 5;
  if (termRatio > 0.4 || ansLower.includes("xlookup") || ansLower.includes("index") || ansLower.includes("unpivot") || ansLower.includes("measure") || ansLower.includes("sumifs")) {
    score += 2;
  }
  if (userAnswer.length > 50) {
    score += 1;
  }
  if (userAnswer.length > 100) {
    score += 1;
  }
  score = Math.min(9, score);

  return {
    score,
    feedback: score >= 7
      ? "Strong response! You addressed the core technical mechanics clearly."
      : "Good conceptual start. Ensure you explicitly name the required formula syntax and explain the risk mitigation.",
    correctAnswer: expectedAnswer,
    improvement: "In an interview, start with the direct recommendation before elaborating on the rationale."
  };
}

function evaluateVerbalDefenseOffline(question, context, userResponse) {
  const len = (userResponse || "").length;
  if (len < 20) {
    return {
      scores: { accuracy: 1, clarity: 1, interviewLanguage: 1 },
      total: 3,
      feedback: "Response is too short. In an interview, deliver a complete 2–4 sentence structured explanation.",
      improvedPhrase: "I recommend decoupling data preparation into Power Query to preserve the immutability of raw files and automate recurring refreshes without risk of formula corruption."
    };
  }

  let acc = 2;
  let cla = 2;
  let lang = 2;

  const respLower = userResponse.toLowerCase();
  const strongVocab = ["because", "prevent", "risk", "performance", "memory", "dynamic", "audit", "scale", "integrity", "resilient", "maintain", "column", "measure"];
  let vocabHits = 0;
  strongVocab.forEach(v => {
    if (respLower.includes(v)) vocabHits++;
  });

  if (vocabHits >= 2) {
    acc = 3;
    lang = 3;
  }
  if (vocabHits >= 4) {
    lang = 4;
  }
  if (len >= 80 && len <= 450) {
    cla = 3;
  }

  const total = acc + cla + lang;

  return {
    scores: { accuracy: acc, clarity: cla, interviewLanguage: lang },
    total,
    feedback: total >= 8
      ? "Outstanding verbal defense! You used strong technical justification and communicated risk mitigation clearly."
      : "Solid explanation. To reach a perfect 10/10, avoid vague terms like 'it's better' and explicitly explain the architectural trade-off.",
    improvedPhrase: "I advise XLOOKUP because direct range references eliminate silent formula breaks when columns are inserted, and the native default to exact match avoids approximate lookup risks."
  };
}

/**
 * Intelligent Offline Response Generator for top Excel Technical Interview Questions
 */
function getOfflineChatbotAnswer(query, context) {
  const q = query.toLowerCase();

  // If user asks about the active task
  if ((q.includes("task") || q.includes("this") || q.includes("current") || q.includes("solve") || q.includes("help")) && context && context.instruction) {
    let advice = `**Active Task Analysis (Task #${context.taskNo || 1}):**\n\n`;
    advice += `> **Instruction:** ${context.instruction}\n\n`;
    if (context.category) advice += `**Category:** \`${context.category}\`\n\n`;

    if (context.columns && context.columns.length > 0) {
      advice += `**Available Columns:** \`${context.columns.slice(0, 6).join("`, `")}\`\n\n`;
    }

    if (/Power Query|Ingest/i.test(context.category || "") || /Power Query/i.test(context.instruction)) {
      advice += `**Recommended Approach:**\n1. In Excel ribbon, click **Data > Get Data > From File / Text/CSV**.\n2. In Power Query Editor, verify column data types.\n3. Close & Load to an official Excel Table.\n\n\`\`\`excel\nData > From Text/CSV > Transform Data > Close & Load To...\n\`\`\``;
    } else if (/lookup|xlookup|vlookup|index/i.test(context.category || "") || /lookup|xlookup/i.test(context.instruction)) {
      advice += `**Recommended Approach:**\nUse modern \`XLOOKUP\` with structured table references:\n\n\`\`\`excel\n=XLOOKUP(@[KeyColumn], LookupTable[KeyColumn], LookupTable[ReturnColumn], "Not Found")\n\`\`\`\n\n💡 *Interview Room Tip: Mention that XLOOKUP defaults to exact matching, eliminating the common 4th-argument bug found in classic VLOOKUP.*`;
    } else if (/pivot/i.test(context.category || "") || /pivot/i.test(context.instruction)) {
      advice += `**Recommended Approach:**\n1. Insert > Pivot Table on a new worksheet.\n2. Drag dimensional categories to **Rows** and numeric metrics to **Values**.\n3. Format number displays as Currency or Integer for executive readability.`;
    } else if (/sumif|countif|aggregate/i.test(context.category || "") || /sumif|countif/i.test(context.instruction)) {
      advice += `**Recommended Approach:**\nUse multi-criteria aggregations. Remember that for \`SUMIFS\`, the sum range comes first:\n\n\`\`\`excel\n=SUMIFS(Table[Amount], Table[Region], "North", Table[Year], 2024)\n\`\`\``;
    } else {
      advice += `**Key Best Practice:**\nUse structured references like \`@[ColumnName]\` instead of static coordinates (\`A2\`) so your calculation expands dynamically as data grows.`;
    }
    return advice;
  }

  // XLOOKUP queries
  if (q.includes("xlookup")) {
    return `### \`XLOOKUP\` — Modern Lookup Standard

\`XLOOKUP\` replaces both \`VLOOKUP\` and \`INDEX/MATCH\` in modern Excel (Office 365 / 2021+).

\`\`\`excel
=XLOOKUP(lookup_value, lookup_array, return_array, [if_not_found], [match_mode], [search_mode])
\`\`\`

**Key Advantages for Interviews:**
- **Exact Match by Default**: No need to specify \`, FALSE\` or \`, 0\`.
- **Left-Lookup Native**: Can return values to the left of the lookup column without restructuring.
- **Built-in Error Handling**: 4th argument replaces cumbersome \`IFERROR()\` or \`IFNA()\`.
- **Non-Volatile & Fast**: Reads only the necessary columns rather than the entire table range.

💡 *Interview Room Tip: "I prefer XLOOKUP because it decouples return columns from hardcoded column index integers, making our reporting model resilient to column insertions."*`;
  }

  // INDEX / MATCH queries
  if (q.includes("index") && q.includes("match")) {
    return `### \`INDEX / MATCH\` — The Senior Analyst Gold Standard

Before \`XLOOKUP\`, \`INDEX / MATCH\` was the definitive replacement for \`VLOOKUP\`.

\`\`\`excel
=INDEX(return_range, MATCH(lookup_value, lookup_range, 0))
\`\`\`

**2-Way Matrix Lookup (Rows and Columns):**
\`\`\`excel
=INDEX(DataGrid, MATCH(RowVal, RowHeaders, 0), MATCH(ColVal, ColHeaders, 0))
\`\`\`

**Why Hiring Managers Love It:**
- Dynamic column index: Doesn't break when columns are rearranged.
- Significantly faster than VLOOKUP on large tables (100k+ rows).
- Shows architectural maturity over basic VLOOKUP.`;
  }

  // VLOOKUP queries
  if (q.includes("vlookup")) {
    return `### \`VLOOKUP\` — Syntax & Pitfalls

\`\`\`excel
=VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup])
\`\`\`

**Critical Interview Watchouts:**
1. **Always use \`FALSE\` or \`0\` as the 4th argument** for exact matches. Omitting it triggers approximate match and returns silent incorrect values!
2. **Left-Lookup Failure**: \`VLOOKUP\` can only look to the right of the key column.
3. **Column Index Brittleness**: Inserting a new column breaks hardcoded indices (e.g. column \`3\` becomes column \`4\`).

💡 *Interview Recommendation: Acknowledge you understand VLOOKUP, but explain you use \`XLOOKUP\` or \`INDEX/MATCH\` in production to avoid maintenance failures.*`;
  }

  // #SPILL! error
  if (q.includes("spill")) {
    return `### Troubleshooting the \`#SPILL!\` Error

The \`#SPILL!\` error occurs in Dynamic Array formulas (\`FILTER\`, \`UNIQUE\`, \`SORT\`, \`SEQUENCE\`) when the calculated result range is obstructed.

**Top Root Causes & Fixes:**
1. **Cell in Spill Range is Occupied**: Clear any text, spaces, or formatting in the cells below/right of the formula.
2. **Merged Cells**: Dynamic arrays cannot spill into merged cells. Unmerge the range.
3. **Implicit Intersection within an Excel Table**: Dynamic arrays cannot automatically spill inside an official Excel Table (\`ListObject\`). Use formulas in regular ranges or aggregate them.

💡 *Pro Tip: Use the spilled range operator \`#\` (e.g. \`=SUM(A2#)\`) to dynamically reference the entire spilled result array.*`;
  }

  // #N/A error
  if (q.includes("#n/a") || q.includes("na error")) {
    return `### Troubleshooting the \`#N/A\` Error

\`#N/A\` indicates that a lookup function could not find the target value in the lookup range.

**Diagnostic Checklist:**
1. **Mismatched Data Types**: One column is text (e.g. \`"1001"\`) while the other is an integer (\`1001\`). Fix with \`VALUE()\` or \`TEXT()\`.
2. **Trailing Hidden Whitespace**: Invisible spaces or non-breaking spaces (\`CHAR(160)\`). Wrap with \`TRIM(CLEAN(cell))\`.
3. **Missing Exact Match Parameter**: Ensure 4th argument of VLOOKUP is \`FALSE\`.

\`\`\`excel
=XLOOKUP(A2, Customers[ID], Customers[Name], "Customer Not Found")
\`\`\``;
  }

  // SUMIFS / COUNTIFS queries
  if (q.includes("sumif") || q.includes("countif")) {
    return `### \`SUMIFS\` & \`COUNTIFS\` Multi-Criteria Aggregation

\`\`\`excel
=SUMIFS(sum_range, criteria_range1, criteria1, [criteria_range2, criteria2, ...])
\`\`\`

**Crucial Parameter Order Rule:**
- For \`SUMIF\` (singular), the \`sum_range\` is **last**.
- For \`SUMIFS\` (plural), the \`sum_range\` is **first**!

**Practical Example:**
\`\`\`excel
=SUMIFS(Orders[Revenue], Orders[Region], "EMEA", Orders[Year], 2024, Orders[Status], "<>Cancelled")
\`\`\`

💡 *Interview Tip: Mention using structured table references \`Orders[Revenue]\` so your aggregations expand automatically when monthly records are appended.*`;
  }

  // Power Query / ETL
  if (q.includes("power query") || q.includes("m code") || q.includes("etl")) {
    return `### Power Query (Get & Transform) Interview Guide

Power Query is Excel's native ETL (Extract, Transform, Load) engine powered by the **M language**.

**Essential Transformations for Data Analyst Tests:**
1. **Unpivot Columns**: Transform wide crosstab survey/financial reports into tall normalized datasets for Pivot Tables.
2. **Promote Headers**: Elevate the first row to column headers (\`Table.PromoteHeaders\`).
3. **Change Data Types**: Explicitly cast dates, currency numbers, and text to prevent silent formula errors.
4. **Merge vs Append**:
   - **Merge**: Relational SQL-style JOIN (Inner, Left Outer, Full).
   - **Append**: SQL UNION ALL stacking datasets vertically.

💡 *Interview Pitch: "I isolate ETL transformations inside Power Query to preserve the immutability of raw CSVs and automate monthly refreshes in a single click."*`;
  }

  // DAX / Power Pivot
  if (q.includes("dax") || q.includes("power pivot")) {
    return `### Power Pivot & DAX Fundamentals

**Calculated Columns vs. DAX Measures:**
- **Calculated Column**: Evaluated row-by-row during data refresh; stored in memory (RAM).
- **DAX Measure**: Calculated dynamically on-the-fly based on Pivot Table filter context; zero storage footprint.

**Classic Measure Example:**
\`\`\`excel
Total Sales := SUM(Sales[Revenue])
Margin % := DIVIDE([Total Margin], [Total Sales], 0)
\`\`\`

💡 *Interview Room Tip: "I always build explicit DAX measures with \`DIVIDE()\` to gracefully handle divide-by-zero errors without throwing #DIV/0! in front of executives."*`;
  }

  // Text cleaning
  if (q.includes("clean") || q.includes("trim") || q.includes("text")) {
    return `### Text Cleaning & Standardization Blueprint

Data imported from web portals, ERPs, or CSVs often carries invisible artifacts that sabotage lookups and joins.

\`\`\`excel
=TRIM(CLEAN(SUBSTITUTE(A2, CHAR(160), " ")))
\`\`\`

**How It Works:**
- \`SUBSTITUTE(..., CHAR(160), " ")\`: Replaces non-breaking web spaces (\`&nbsp;\`) with standard spaces.
- \`CLEAN()\`: Strips the first 32 non-printable ASCII characters.
- \`TRIM()\`: Removes all leading, trailing, and excessive repeated spaces.`;
  }

  // Default Fallback
  return `### ExcelCoach AI Assistant

I can explain any Excel function, formula structure, or error troubleshooting strategy!

**Popular topics you can ask me about:**
- \`XLOOKUP\` vs \`INDEX/MATCH\`
- How to troubleshoot \`#SPILL!\` or \`#N/A\` errors
- Writing \`SUMIFS\` and \`COUNTIFS\` multi-condition logic
- Modern dynamic arrays (\`FILTER\`, \`UNIQUE\`, \`SORT\`, \`LET\`)
- Power Query ETL best practices (Unpivoting, merging, data types)
- DAX measures vs calculated columns in Power Pivot

*(Tip: Add your free Google Gemini API key in **Settings** to ask open-ended custom questions!)*`;
}


