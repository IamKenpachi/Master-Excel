// prompts.js - Excel Interview Taxonomy, Goal-Oriented Prompts & Schemas

export const EXCEL_TOPICS = [
  {
    id: "lookup",
    name: "Lookup & Reference",
    badge: "Formulas",
    skills: ["XLOOKUP", "VLOOKUP", "INDEX-MATCH", "INDEX-MATCH-MATCH", "OFFSET", "INDIRECT", "Absolute vs Relative ($A$1 vs A1)"]
  },
  {
    id: "aggregation",
    name: "Data Aggregation & Summarization",
    badge: "Formulas",
    skills: ["SUMIFS", "COUNTIFS", "AVERAGEIFS", "SUMPRODUCT", "SUBTOTAL", "AGGREGATE"]
  },
  {
    id: "pivots",
    name: "Pivot Tables & Slicers",
    badge: "Analysis",
    skills: ["Pivot Tables", "Calculated Fields", "Grouping Dates/Values", "Show Values As (% of Total)", "Slicers & Timelines", "GETPIVOTDATA"]
  },
  {
    id: "power_query",
    name: "Power Query (ETL & Cleaning)",
    badge: "Power Tools",
    skills: ["Importing CSV/PDF/Web", "Merge Queries (Joins)", "Append Queries (Union)", "Unpivot Columns", "Split Column by Delimiter", "Custom Columns (M Code)", "Conditional Columns"]
  },
  {
    id: "power_pivot",
    name: "Power Pivot & DAX",
    badge: "Data Modeling",
    skills: ["Data Modeling (Star Schema)", "Relationships (1-to-Many)", "Calculated Columns vs Measures", "CALCULATE()", "RELATED() & RELATEDTABLE()", "Time Intelligence (YTD/YoY)"]
  },
  {
    id: "cleaning",
    name: "Data Hygiene & Text Tools",
    badge: "Cleaning",
    skills: ["Text to Columns", "Flash Fill", "TRIM & CLEAN", "LEFT / RIGHT / MID", "TEXTJOIN / CONCAT", "Remove Duplicates", "Data Type Conversions"]
  },
  {
    id: "logical",
    name: "Logic & Error Handling",
    badge: "Logic",
    skills: ["Nested IF", "IFS", "SWITCH", "IFERROR", "IFNA", "AND / OR / NOT"]
  },
  {
    id: "dynamic_arrays",
    name: "Dynamic Array Formulas",
    badge: "Modern Excel",
    skills: ["FILTER", "UNIQUE", "SORT / SORTBY", "XMATCH", "CHOOSECOLS", "LET", "LAMBDA"]
  },
  {
    id: "visualization",
    name: "Charts & Conditional Formatting",
    badge: "Viz",
    skills: ["Combo Charts", "Waterfall Charts", "State / Geographic Maps", "Sparklines", "Conditional Formatting (Formula Rules)", "Data Bars & Heatmaps"]
  },
  {
    id: "integrity",
    name: "Data Integrity & Governance",
    badge: "Governance",
    skills: ["Data Validation (Dropdowns)", "Dependent Dropdowns (INDIRECT)", "Named Ranges", "Worksheet Protection", "Formula Auditing (Trace Precedents)"]
  },
  {
    id: "dashboards",
    name: "Executive Dashboarding",
    badge: "Reporting",
    skills: ["KPI Cards", "Interactive Slicers Linking Multiple Pivots", "Dynamic Title Formulation", "Grid Alignment & Print Layout"]
  },
  {
    id: "automation",
    name: "Macros & Automation Awareness",
    badge: "Automation",
    skills: ["Recording Macros", "Assigning Macros to Shapes", "Basic VBA Debugging", "Automating Refresh on Workbook Open"]
  }
];

export const INDUSTRIES = [
  { name: "E-Commerce & Digital Retail", description: "Online store transactions, returns, SKU performance, customer LTV, marketing campaigns" },
  { name: "SaaS & Subscription", description: "Monthly recurring revenue (MRR), churn rates, customer cohort retention, seat upgrades" },
  { name: "Healthcare & Hospital Logistics", description: "Patient admissions, length of stay, departmental budget allocation, insurance claim processing" },
  { name: "Supply Chain & Warehousing", description: "Inventory reorder points, lead times, safety stock, carrier freight rate variance" },
  { name: "Banking & Financial Services", description: "Loan delinquency risk, credit underwriting, interest yield curve calculations, branch KPI tracking" },
  { name: "Hospitality & Travel", description: "Hotel RevPAR, occupancy percentages, seasonal booking lead times, cancellation analysis" },
  { name: "Human Resources & Workforce Analytics", description: "Employee attrition trends, compensation benchmarking, performance review calibrations, headcount budget" },
  { name: "Real Estate & Property Management", description: "Rental yields, cap rates, tenant lease renewals, vacancy rate impact analysis" },
  { name: "Consumer Packaged Goods (CPG)", description: "Trade promotions, distributor sell-through rates, retail shelf stockouts, gross margin by territory" },
  { name: "Food Delivery & Logistics", description: "Order fulfillment time, driver payouts, surge pricing efficacy, restaurant commission margins" }
];

export const DIFFICULTY_CONFIG = {
  beginner: {
    label: "Beginner (Entry-Level)",
    badge: "1-2 Years Experience",
    taskCount: 8,
    estimatedMinutes: 30,
    expectedSkills: ["Basic Formulas (SUM, AVERAGE)", "Simple VLOOKUP", "Basic Pivot Tables", "Text formatting & Data types", "Sorting & Basic Filtering", "Simple Bar/Line Chart"],
    color: "#10B981"
  },
  intermediate: {
    label: "Intermediate (Mid-Level Data Analyst)",
    badge: "2-4 Years Experience",
    taskCount: 12,
    estimatedMinutes: 45,
    expectedSkills: ["XLOOKUP / INDEX-MATCH", "SUMIFS / COUNTIFS", "Pivot Tables with Calculated Fields", "Text to Columns & Flash Fill", "Data Validation", "Combo Charts & Slicers", "Basic Power Query"],
    color: "#F59E0B"
  },
  advanced: {
    label: "Advanced (Senior Data Analyst)",
    badge: "4+ Years Experience",
    taskCount: 15,
    estimatedMinutes: 60,
    expectedSkills: ["Advanced Power Query (Merge/Append/Unpivot)", "Power Pivot & DAX Measures", "Dynamic Array Formulas (FILTER/UNIQUE)", "State/County Map Visualizations", "Complex Conditional Formatting", "Executive Dashboard Layout"],
    color: "#EF4444"
  },
  expert: {
    label: "Expert (Lead / Analytics Engineer)",
    badge: "Principal / Manager Track",
    taskCount: 18,
    estimatedMinutes: 75,
    expectedSkills: ["Full Star-Schema Modeling in Power Pivot", "Advanced DAX (CALCULATE with FILTER/KEEPFILTERS)", "LET & LAMBDA Custom Functions", "Automated ETL via Power Query M Code", "Statistical Variance Analysis", "High-Stake Case Synthesis"],
    color: "#8B5CF6"
  }
};

/**
 * Deterministic, goal-oriented system instruction
 * Enforces single-pass complete execution without stopping or conversational loops.
 */
export function buildGoalOrientedSystemInstruction() {
  return `<role>
You are ExcelCoach AI, an elite, deterministic Excel Technical Interview Engine engineered specifically for Data Analyst, BI Analyst, and Analytics Consultant hiring assessments.
</role>

<mission_and_goal>
Your absolute objective is to generate an exhaustive, high-fidelity, end-to-end Excel case study test and complete answer key in ONE SINGLE PASS.
You must execute the entire task to completion without truncation, conversational intros, or trailing filler.
Never stop midway. Never output markdown code fences (like \`\`\`json). Output pure, strictly valid JSON matching the schema provided.
</mission_and_goal>

<strict_rules>
1. DETERMINISTIC QUALITY: Every task must test an authentic, industry-standard skill evaluated in premier technical interviews (Amazon, Google, JPMorgan, McKinsey, Capital One, Spotify, etc.).
2. REALISTIC BUSINESS LOGIC: Build realistic business context (specific KPIs, real department pain points, plausible customer/sales figures).
3. COLUMN-AWARE TASKS: If dataset schema / column names are supplied, every single formula or instruction MUST directly refer to those exact column names.
4. DETAILED ANSWER KEY: Every task must have an exact formula/step-by-step solution, a "Why Best Practice" technical rationale, and an "Interview Talking Point" (how to explain the trade-offs aloud to an interviewer).
5. NO LOOPS OR PLACEHOLDERS: Generate all tasks completely. Do not use phrases like "Tasks 6-12 follow the same pattern...".
</strict_rules>`;
}

/**
 * Builds the user prompt for generating a complete mock test
 */
export function buildTestGenerationPrompt({ difficulty, topics, datasetMeta, taskCount, randomSeed = Date.now() }) {
  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.intermediate;
  const industry = INDUSTRIES[Math.floor(Math.random() * INDUSTRIES.length)];
  const count = taskCount ? parseInt(taskCount, 10) : config.taskCount;
  const estimatedMins = Math.round(count * 3.5);
  const topicNames = (topics && topics.length > 0)
    ? topics.join(", ")
    : "Comprehensive mix of Lookups, Pivot Tables, Power Query, Aggregations, Logic, Visualizations";

  let datasetContext = "";
  if (datasetMeta && datasetMeta.name) {
    datasetContext = `
<provided_dataset_metadata>
Dataset Name: ${datasetMeta.name}
Source: ${datasetMeta.source || "HuggingFace / Kaggle"}
Row Count Estimate: ${datasetMeta.rowCount || "10,000+"}
Description: ${datasetMeta.description || "Realistic enterprise data"}
Columns with Types:
${JSON.stringify(datasetMeta.columns || [], null, 2)}
</provided_dataset_metadata>
CRITICAL INSTRUCTION: Tailor the background story, column manipulations, formulas, and Pivot Table tasks specifically around these actual columns!
`;
  } else {
    const csvRows = count >= 20 ? "10-12 rows" : "20-25 rows";
    datasetContext = `
<synthetic_dataset_instruction>
Generate a realistic synthetic dataset structure with 8-10 columns matching the business scenario.
Provide a compact sample CSV string (${csvRows}) with realistic data quirks (e.g. mixed casing, full names to be split, phone or dates to format, numerical amounts, categories) so the candidate can download and practice directly on Excel.
</synthetic_dataset_instruction>
`;
  }

  const tokenEfficiencyRule = count >= 15
    ? `
<token_budget_instruction>
STRICT TOKEN BUDGET FOR ${count} TASKS:
To ensure all ${count} tasks and solutions fit inside the output limit without getting truncated:
1. Each task instruction must be 1-2 precise, direct sentences.
2. In 'answerKey': 'explanation' must be exactly 1 clear sentence; 'proTip' must be 1 sentence; 'interviewTalkingPoint' must be 1 sentence.
3. Keep syntheticCsv compact (max 10-12 rows).
Do not truncate or stop early. Complete every single task from 1 to ${count}.
</token_budget_instruction>
`
    : "";

  return `<goal>
Generate a complete, randomized ${config.label} Excel Mock Interview Test.
Random Seed: ${randomSeed}
Industry Focus: ${industry.name} (${industry.description})
Required Topics to emphasize: ${topicNames}
Target Task Count: exactly ${count} numbered tasks
Estimated Completion Time: ${estimatedMins} minutes
</goal>
${tokenEfficiencyRule}

${datasetContext}

<tasks_progression_guide>
The test must follow a natural data analyst workflow:
1. Data Ingestion & Formatting: (e.g. Import from PDF/CSV, assign proper data types, create Excel Table)
2. Data Cleaning & Transformation: (e.g. Text to Columns, TRIM/CLEAN, Power Query split/merge, handling nulls)
3. Calculated Columns & Feature Engineering: (e.g. Date extraction, City/State resolution, categorical bucket logic using IF/IFS)
4. Core Analysis & Lookups: (e.g. XLOOKUP/INDEX-MATCH, conditional aggregations SUMIFS/COUNTIFS)
5. Pivot Tables & Data Modeling: (e.g. Pivot table aggregations, calculated fields, Power Pivot relationships or DAX measures)
6. Executive Visualization & Synthesis: (e.g. Month-over-month trend graph, State geographic sales map, high-impact conditional formatting)
7. Advanced Business Metric: (e.g. Repeated customer retention percentage, cohort metric, or dynamic array report)
</tasks_progression_guide>

<schema_specification>
Respond ONLY with a valid JSON object matching this exact structure:
{
  "test": {
    "title": "Advanced Excel Test for Job Interview: [Scenario Title]",
    "difficulty": "${difficulty}",
    "difficultyLabel": "${config.label}",
    "estimatedMinutes": ${estimatedMins},
    "scenario": {
      "company": "[Fictional Company Name]",
      "industry": "${industry.name}",
      "background": "[2-3 sentences setting up the business context, identical in tone to classic interview tests]",
      "objective": "[What the executive leadership team is asking the data analyst to uncover]"
    },
    "datasetInfo": {
      "name": "[Dataset Name]",
      "source": "[Dataset Source or 'Generated Synthetic Dataset']",
      "rowCount": "[Estimated rows]",
      "description": "[1 sentence dataset summary]"
    },
    "tasks": [
      {
        "no": 1,
        "category": "Data Ingestion",
        "instruction": "Detailed, specific instruction referencing actual columns",
        "hint": "Concise hint on which function/ribbon feature to use",
        "hintNudge": "1-sentence conceptual hint guiding candidate without giving away formula",
        "hintBlueprint": "Syntax template with argument placeholders e.g. =XLOOKUP(val, lookup_range, return_range)",
        "targetCell": "B7"
      }
    ]
  },
  "syntheticCsv": "OrderID,Date,Customer,Amount,Category\\n1001,2024-01-15,Acme Corp,1250.00,Electronics\\n...",
  "answerKey": [
    {
      "taskNo": 1,
      "category": "Data Ingestion",
      "answer": "Exact formula or step-by-step Excel ribbon navigation (e.g. '=XLOOKUP(A2, Customers!A:A, Customers!D:D, \"Unknown\")' or 'Data > From Text/CSV > Transform Data')",
      "explanation": "Clear explanation of how the solution works",
      "proTip": "Best practice tip (e.g. why using dynamic table references @[CustomerID] is better than static ranges)",
      "interviewTalkingPoint": "What to say aloud in the interview room to showcase senior analyst maturity"
    }
  ]
}
</schema_specification>`;
}

/**
 * Ranking prompt for combined Hugging Face and Kaggle dataset candidates
 */
export function buildDatasetRankingPrompt(candidates, difficulty, topics, limit = 3) {
  const count = parseInt(limit, 10) || 3;
  return `<role>
You are an expert Data Analyst hiring manager selecting the best real-world dataset for an Excel technical interview test.
</role>

<task>
Evaluate the following ${candidates.length} dataset candidates from HuggingFace and Kaggle.
Test Difficulty: ${difficulty}
Target Topics: ${topics || "All-round Excel analytics (Lookups, Pivots, Power Query, Aggregations)"}

Score each candidate from 1.0 to 10.0 based on:
1. Relevance to business analytics (Sales, HR, Finance, Retail, Operations are ideal).
2. Variety of column types (needs strings, numbers, dates, geography for mapping/pivots).
3. Opportunities for realistic data cleaning (text splitting, duplicates, date parsing).
4. Feasibility for a 45-60 minute Excel assessment.

Rank and return the TOP ${count} candidates in JSON format.
</task>

<candidates>
${JSON.stringify(candidates, null, 2)}
</candidates>

<output_format>
Return ONLY a valid JSON array of the top ${count} items:
[
  {
    "id": "candidate_id",
    "title": "Human friendly title",
    "source": "Hugging Face" | "Kaggle",
    "score": 9.4,
    "whyGreat": "Punchy 1-2 sentence explanation of why this dataset is perfect for this Excel interview test",
    "url": "direct URL to dataset"
  }
]
</output_format>`;
}

/**
 * Creative AI-Powered Quick Drill Generator Prompt
 */
export function buildDrillGenerationPrompt({ topic, datasetMeta, difficulty = "intermediate", count = 5, drillMode = "scenario" }) {
  let datasetContext = "";
  if (datasetMeta && datasetMeta.name) {
    datasetContext = `
<dataset_context>
Dataset: ${datasetMeta.name} (${datasetMeta.source || "Enterprise"})
Available Columns: ${JSON.stringify(datasetMeta.columns || ["TransactionID", "OrderDate", "CustomerSegment", "Region", "SalesAmount", "Discount", "ProfitMargin"])}
Ground the questions, formulas, and troubleshooting scenarios directly in this dataset schema where applicable.
</dataset_context>
`;
  } else {
    datasetContext = `
<dataset_context>
Context: Ground the scenarios in standard high-volume enterprise transactions data with columns like [CustomerID, TransactionDate, ProductLine, Region, Quantity, Revenue, Margin].
</dataset_context>
`;
  }

  let modeRules = "";
  if (drillMode === "glitch") {
    modeRules = `
<drill_mode_focus: GLITCH & DEBUG HUNT>
Generate 5 real-world BROKEN or FAILING Excel formulas on "${topic}".
Each question MUST present an explicit broken formula snippet with a classic interview error:
- Unexpected #N/A (e.g. text vs number lookup type mismatch, or hidden trailing whitespace)
- #VALUE! error (e.g. arithmetic on text dates or corrupt characters)
- #SPILL! collision in dynamic arrays
- Unanchored reference bug (e.g. dragging formula down shifts table headers)
- Circular dependency or wrong aggregation total due to omitted exact match flag (0/FALSE)
In "scenario": show the context and the exact buggy formula.
In "solution": explain precisely what caused the bug and provide the corrected formula.
</drill_mode_focus>`;
  } else if (drillMode === "skeleton") {
    modeRules = `
<drill_mode_focus: SYNTAX SKELETON FILL-IN-THE-BLANKS>
Generate 5 fill-in-the-blank formula mastery questions on "${topic}".
Each question MUST present a formula template containing 2-4 blank placeholders '___' that the candidate must complete:
Example: '=XLOOKUP(A2, ___[Product_ID], ___[Price], "Not Found", ___)'
In "scenario": describe the business need and show the skeleton formula with '___'.
In "solution": provide the fully filled formula with clear explanation for each blank.
</drill_mode_focus>`;
  } else if (drillMode === "verbal") {
    modeRules = `
<drill_mode_focus: VERBAL INTERVIEW DEFENSE & ROLEPLAY>
Generate 5 technical oral defense and conceptual interview questions on "${topic}".
Focus on questions technical hiring managers ask aloud to separate junior button-pushers from senior data analysts:
- "Why choose XLOOKUP / INDEX-MATCH over VLOOKUP on large enterprise workbooks?"
- "How does Power Query ingestion compare to worksheet formula helper columns for auditability?"
- "What is the architectural difference between a DAX Calculated Column and a Measure?"
- "Why are OFFSET and INDIRECT banned in high-frequency financial models?"
In "scenario": phrase the question as the interviewer speaking directly to the candidate.
In "solution": provide the ideal structured answer (Problem, Trade-offs, Recommendation).
In "interviewTalkingPoint": verbatim 2-sentence punchy answer to impress the interviewer.
</drill_mode_focus>`;
  } else {
    modeRules = `
<strict_diversity_rules>
Every question must represent a realistic technical interview evaluation format chosen from these categories:
1. BUG DIAGNOSIS: Pinpoint root cause of a broken formula and fix it.
2. ARCHITECTURE & PERFORMANCE: Compare two approaches on a 500,000-row workbook.
3. BUSINESS SCENARIO CALCULATION: Multi-condition aggregation, date math, or dynamic array.
4. LIVE CODING CHALLENGE: Construct an elegant modern formula (LET, LAMBDA, XLOOKUP, FILTER).
</strict_diversity_rules>`;
  }

  return `<goal>
Generate ${count} creative, non-repetitive Data Analyst interview flashcard drill questions for: "${topic}".
Workout Mode: ${drillMode.toUpperCase()}
Difficulty Level: ${difficulty}.
</goal>

${datasetContext}
${modeRules}

<schema_specification>
Respond ONLY with a valid JSON object matching this exact structure:
{
  "topic": "${topic}",
  "drillMode": "${drillMode}",
  "questions": [
    {
      "id": 1,
      "type": "${drillMode}",
      "badge": "${drillMode === 'glitch' ? '🐛 Glitch Hunt' : (drillMode === 'skeleton' ? '🧩 Syntax Skeleton' : (drillMode === 'verbal' ? '🎙️ Verbal Defense' : '🎯 Scenario'))}",
      "title": "[Concise Question Title]",
      "scenario": "[Detailed, realistic interview scenario, code snippet, or formula error]",
      "solution": "[Exact formula or step-by-step resolution]",
      "pitfallToAvoid": "[Common mistake candidates make that gets them rejected]",
      "interviewTalkingPoint": "[Verbatim talking point to impress the technical interviewer]"
    }
  ]
}
</schema_specification>`;
}

/**
 * Single-question contextual hint generator
 */
export function buildHintPrompt(task = {}, scenario = {}) {
  return `You are an Excel interview mentor. Provide a concise, encouraging hint for this interview task:
Scenario: ${scenario?.background || "Excel business case study"}
Task: ${task?.instruction || "Excel analysis task"}
Category: ${task?.category || "Excel"}

Format: 2 sentences max. Give candidate the conceptual direction (e.g. which function or feature to look for) without giving away the full formula syntax.`;
}

/**
 * 16 Industry Case Study Domains for Dataset Search & Practice
 * Calibrated to real-world Data Analyst domain cases
 */
export const INDUSTRY_DOMAINS = [
  { id: "general_purpose", name: "General Purpose Generators", shortName: "General Purpose", icon: "📊", query: "General Purpose Generators" },
  { id: "project_management", name: "Project Management", shortName: "Project Management", icon: "📋", query: "Project Management" },
  { id: "sales", name: "Sales", shortName: "Sales", icon: "🛍️", query: "Sales" },
  { id: "finance_accounting", name: "Finance & Accounting", shortName: "Finance & Accounting", icon: "💰", query: "Finance & Accounting" },
  { id: "travel_hospitality", name: "Travel & Hospitality", shortName: "Travel & Hospitality", icon: "✈️", query: "Travel & Hospitality" },
  { id: "customer_service", name: "Customer Service", shortName: "Customer Service", icon: "🎧", query: "Customer Service" },
  { id: "ecommerce_marketing", name: "E-Commerce & Marketing", shortName: "E-Commerce & Marketing", icon: "🛒", query: "E-Commerce & Marketing" },
  { id: "healthcare", name: "Healthcare", shortName: "Healthcare", icon: "🏥", query: "Healthcare" },
  { id: "hr_analytics", name: "HR & Analytics", shortName: "HR & Analytics", icon: "👥", query: "HR & Analytics" },
  { id: "it_service", name: "IT Service Management", shortName: "IT Service Management", icon: "🖥️", query: "IT Service Management" },
  { id: "manufacturing_quality", name: "Manufacturing & Quality", shortName: "Manufacturing & Quality", icon: "🏭", query: "Manufacturing & Quality" },
  { id: "real_estate", name: "Real Estate", shortName: "Real Estate", icon: "🏠", query: "Real Estate" },
  { id: "social_media", name: "Social Media Analytics", shortName: "Social Media Analytics", icon: "📱", query: "Social Media Analytics" },
  { id: "supply_chain", name: "Supply Chain & Logistics", shortName: "Supply Chain & Logistics", icon: "📦", query: "Supply Chain & Logistics" },
  { id: "digital_marketing", name: "Digital Marketing", shortName: "Digital Marketing", icon: "📢", query: "Digital Marketing" },
  { id: "education_academia", name: "Education & Academia", shortName: "Education & Academia", icon: "🎓", query: "Education & Academia" }
];

/**
 * Verbal Defense Topics for Interview Simulation
 * 20 core topics testing candidate's ability to defend their formula/tool decisions
 */
export const VERBAL_DEFENSE_TOPICS = [
  { topic: "XLOOKUP vs VLOOKUP", category: "lookup" },
  { topic: "INDEX/MATCH vs XLOOKUP", category: "lookup" },
  { topic: "SUMIFS vs Pivot Tables for multi-condition aggregation", category: "aggregation" },
  { topic: "IFERROR vs IFNA error containment", category: "logical" },
  { topic: "Power Query ETL vs manual copy-paste workflows", category: "power_query" },
  { topic: "When to choose COUNTIFS over COUNTA with filters", category: "aggregation" },
  { topic: "DAX Measures vs Calculated Columns in Power Pivot", category: "power_pivot" },
  { topic: "Dynamic Array FILTER vs legacy helper columns", category: "dynamic_arrays" },
  { topic: "Absolute vs Relative cell referencing strategy", category: "lookup" },
  { topic: "TRIM and CLEAN vs manual string parsing", category: "cleaning" },
  { topic: "Nested IF vs IFS vs SWITCH readability", category: "logical" },
  { topic: "Star Schema modeling vs wide single-table flat files", category: "power_pivot" },
  { topic: "LET function for formula optimization and readability", category: "dynamic_arrays" },
  { topic: "Flash Fill vs Text to Columns vs Power Query", category: "cleaning" },
  { topic: "Calculated Fields vs Source Data adjustments in Pivots", category: "pivots" },
  { topic: "CHOOSEROWS and CHOOSECOLS in dynamic reporting", category: "dynamic_arrays" },
  { topic: "Data Validation dropdowns with dependent lists (INDIRECT)", category: "integrity" },
  { topic: "SUMPRODUCT for weighted averages and two-way lookups", category: "aggregation" },
  { topic: "CALCULATE and USERELATIONSHIP for inactive dates", category: "power_pivot" },
  { topic: "Explaining complex formulas to non-technical stakeholders", category: "visualization" }
];

