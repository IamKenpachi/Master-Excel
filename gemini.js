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
  async generateDrillQuestions({ topic, datasetMeta = null, difficulty = "intermediate", apiKey, model = DEFAULT_MODEL, count = 5 }) {
    if (!apiKey) {
      return Gemini.getOfflineDrillQuestions(topic);
    }

    try {
      const prompt = buildDrillGenerationPrompt({ topic, datasetMeta, difficulty, count });
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
      console.warn("Gemini drill generation failed, using rich offline scenarios:", err);
    }

    return Gemini.getOfflineDrillQuestions(topic);
  },

  /**
   * Rich Offline Scenario Drill Questions (Categorized & Non-Generic)
   */
  getOfflineDrillQuestions(topic) {
    return [
      {
        id: 1,
        type: "Bug Diagnosis",
        badge: "⚡ Bug Diagnosis",
        title: "Unexpected #N/A on Visible Text Lookup",
        scenario: "An analyst used '=XLOOKUP(A2, Products!A:A, Products!B:B)'. Cell A2 is visibly '10482', and row 45 in Products!A:A also visibly says '10482', yet Excel consistently returns #N/A. What are the two most likely data type or hygiene issues, and how do you resolve them in under 30 seconds?",
        solution: "1. Data Type Mismatch: One is stored as Text and the other as a true Number. Convert using '=VALUE(A2)' or '=A2&\"\"', or select the column > Data > Text to Columns > Finish.\n2. Invisible Whitespace: Hidden trailing spaces or non-breaking spaces (CHAR(160) from web scraping). Wrap the lookup key in '=TRIM(CLEAN(A2))'.",
        pitfallToAvoid: "Trying to replace XLOOKUP with nested IFs or VLOOKUP without cleaning the underlying data type disparity first.",
        interviewTalkingPoint: "In production analytics, 90% of lookup failures stem from string vs numeric type coercion or non-breaking HTML spaces (CHAR 160). I always inspect with ISTEXT() or ISNUMBER() before assuming formula syntax is wrong."
      },
      {
        id: 2,
        type: "Performance",
        badge: "⚖️ Performance & Scalability",
        title: "Volatile Formulas Freezing a 500,000-Row Workbook",
        scenario: "A financial reporting model with 500,000 rows re-calculates for 45 seconds on every keystroke. You notice heavy usage of =OFFSET() and =INDIRECT() across 20 KPI summary tabs. Why are these functions causing catastrophic lag, and what non-volatile pattern replaces them?",
        solution: "OFFSET and INDIRECT are 'volatile' functions: Excel recalculates them every time ANY cell changes anywhere in the entire workbook, regardless of whether their precedent cells were touched. Replace OFFSET with non-volatile INDEX: '=INDEX(Range, row_num, col_num)' which only recalculates when its actual precedent cells change.",
        pitfallToAvoid: "Confusing dynamic ranges with volatile ranges. INDEX reference syntax '=INDEX(A:A, 1):INDEX(A:A, 100)' creates a completely dynamic, non-volatile range.",
        interviewTalkingPoint: "I enforce non-volatile architecture across all enterprise workbooks. Replacing OFFSET and INDIRECT with INDEX-based ranges or Power Query caching routinely slashes model calculation times from 45 seconds to sub-second responses."
      },
      {
        id: 3,
        type: "Business Scenario",
        badge: "💼 Business Calculation",
        title: "Multi-Condition Revenue Aggregation with Date Window",
        scenario: "You have a transactions table 'SalesTable' with columns [OrderDate], [Region], [Status], and [Revenue]. Leadership wants total completed revenue for 'West' and 'Central' regions combined, strictly for transactions that occurred between 2024-01-01 and 2024-03-31.",
        solution: "Write a compound SUMIFS formula using an array constant for the regions:\n=SUM(SUMIFS(SalesTable[Revenue], SalesTable[Region], {\"West\",\"Central\"}, SalesTable[Status], \"Completed\", SalesTable[OrderDate], \">=\"&DATE(2024,1,1), SalesTable[OrderDate], \"<=\"&DATE(2024,3,31)))",
        pitfallToAvoid: "Forgetting the outer =SUM() when evaluating array constants {\"West\", \"Central\"}, which would otherwise only return the total for 'West'.",
        interviewTalkingPoint: "Wrapping SUMIFS in SUM with an array constant gives clean OR logic across multiple regions without duplicating long formula strings. In modern Excel, =LET() can also be used to keep the date boundaries parameterized."
      },
      {
        id: 4,
        type: "Interviewer Defense",
        badge: "🎙️ Interviewer Roleplay",
        title: "Defending Power Query ETL vs. Worksheet Formula Chains",
        scenario: "The Director of BI asks during your technical round: 'Our junior analysts use 15 helper columns with LEFT, MID, FIND, and nested SUBSTITUTE to clean customer addresses. Why should we mandate Power Query over these formulas for monthly refreshes?'",
        solution: "1. Immutability & Auditability: Power Query preserves the raw input untouched and logs each cleaning step in reproducible M-code.\n2. Memory Footprint: Formula chains bloat workbook file size and recalculate constantly; Power Query loads only the final clean output into the data model or grid.\n3. One-Click Automated Maintenance: Next month's new 50,000-row file refreshes in 2 seconds with zero formula dragging or row limit worries.",
        pitfallToAvoid: "Saying 'formulas are bad'. Formulas are great for ad-hoc exploration, but fragile for production pipelines.",
        interviewTalkingPoint: "I separate data transformation from presentation. Power Query acts as our lightweight, local ETL layer, while worksheet formulas and DAX are reserved for end-user metrics and interactive dashboarding."
      },
      {
        id: 5,
        type: "Live Coding",
        badge: "🧪 Live Coding Challenge",
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

