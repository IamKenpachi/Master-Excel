import fs from "fs";
import path from "path";
import assert from "assert";
import { Gemini } from "../gemini.js";
import { renderChatMarkdown } from "../app.js";

console.log("================================================================================");
console.log("  EXCELCOACH AI — CHATBOT ASSISTANT VERIFICATION SUITE");
console.log("================================================================================\n");

// --- 1. DOM Elements Verification ---
console.log("--- 1. DOM Elements in index.html ---");
const html = fs.readFileSync(path.resolve("./index.html"), "utf-8");

assert(html.includes('id="btn-chatbot-launcher"'), "index.html must have #btn-chatbot-launcher");
assert(html.includes('id="chatbot-widget"'), "index.html must have #chatbot-widget");
assert(html.includes('id="chatbot-messages"'), "index.html must have #chatbot-messages");
assert(html.includes('id="chatbot-input"'), "index.html must have #chatbot-input");
assert(html.includes('id="btn-chatbot-send"'), "index.html must have #btn-chatbot-send");
assert(html.includes('id="chatbot-context-toggle"'), "index.html must have #chatbot-context-toggle");
assert(html.includes('class="chat-chip"'), "index.html must have .chat-chip quick suggestion pills");
assert(html.includes('Alt</kbd> + <kbd>C'), "index.html shortcuts modal must include Alt+C");
console.log("  ✅ PASS: All required chatbot DOM elements present in index.html");

// --- 2. CSS Rules Verification ---
console.log("\n--- 2. CSS Styles in style.css ---");
const css = fs.readFileSync(path.resolve("./style.css"), "utf-8");

assert(css.includes(".chatbot-launcher {"), "style.css must have .chatbot-launcher");
assert(css.includes(".chatbot-widget {"), "style.css must have .chatbot-widget");
assert(css.includes(".chat-message.assistant"), "style.css must have .chat-message.assistant");
assert(css.includes(".chat-message.user"), "style.css must have .chat-message.user");
assert(css.includes(".chat-code-block {"), "style.css must have .chat-code-block");
assert(css.includes(".btn-chat-copy {"), "style.css must have .btn-chat-copy");
assert(css.includes(".chat-typing {"), "style.css must have .chat-typing");
assert(css.includes(".chatbot-widget.open {"), "style.css must have .chatbot-widget.open toggle rule");
console.log("  ✅ PASS: Complete design system styles for launcher, widget, messages, and code blocks verified");

// --- 3. Markdown Parser Verification ---
console.log("\n--- 3. Chat Markdown Parser ---");
const sampleMarkdown = `Here is how to use **XLOOKUP**:
\`\`\`excel
=XLOOKUP(A2, Customers[ID], Customers[Name], "Not Found")
\`\`\`
- First parameter: \`lookup_value\`
- Second parameter: \`lookup_array\`

> Senior tip: Always favor structured references.`;

const parsedHtml = renderChatMarkdown(sampleMarkdown);
assert(parsedHtml.includes("<strong>XLOOKUP</strong>"), "Should convert **bold** into <strong>");
assert(parsedHtml.includes('class="chat-code-block"'), "Should create .chat-code-block container");
assert(parsedHtml.includes('class="btn-chat-copy"'), "Should create copy button inside code block");
assert(parsedHtml.includes("<code>=XLOOKUP"), "Should contain safe formatted code");
assert(parsedHtml.includes("<blockquote"), "Should format blockquote");
assert(parsedHtml.includes("<ul"), "Should format bullet list");
console.log("  ✅ PASS: renderChatMarkdown correctly transforms formulas, code blocks, bold text, and lists");

// --- 4. Offline Knowledge Base & Chatbot Logic ---
console.log("\n--- 4. Offline Knowledge Base & Query Answering ---");

// Test XLOOKUP question
const xlookupAns = await Gemini.askChatbotAssistant({
  message: "Explain XLOOKUP syntax with common traps",
  apiKey: null
});
assert(xlookupAns.includes("XLOOKUP"), "XLOOKUP answer must mention XLOOKUP");
assert(xlookupAns.includes("=XLOOKUP"), "XLOOKUP answer must provide formula code");
assert(xlookupAns.includes("Exact Match"), "XLOOKUP answer must highlight exact match feature");
console.log("  ✅ PASS: Instant offline knowledge provided for XLOOKUP query");

// Test #SPILL! error question
const spillAns = await Gemini.askChatbotAssistant({
  message: "How do I troubleshoot a #SPILL! error?",
  apiKey: null
});
assert(spillAns.includes("#SPILL!"), "Spill answer must explain #SPILL!");
assert(spillAns.includes("Spill Range") || spillAns.includes("Dynamic Array"), "Spill answer must discuss spill range");
console.log("  ✅ PASS: Instant offline troubleshooting provided for #SPILL! error");

// Test Active Task Context Awareness
const taskContext = {
  taskNo: 3,
  category: "Lookups & Reference",
  instruction: "Use XLOOKUP to map CustomerName from CustomerDim into the FactSales table using CustomerID.",
  columns: ["CustomerID", "OrderDate", "Amount", "CustomerName"],
  targetCell: "D2"
};

const taskAns = await Gemini.askChatbotAssistant({
  message: "How should I solve this task?",
  context: taskContext,
  apiKey: null
});

assert(taskAns.includes("Task #3"), "Context answer must reference Task #3");
assert(taskAns.includes("XLOOKUP"), "Context answer must recommend lookup formula");
assert(taskAns.includes("CustomerID") || taskAns.includes("CustomerName"), "Context answer must incorporate columns from context");
console.log("  ✅ PASS: Context-aware assistant incorporates active task instruction and dataset columns");

// Test Power Query question
const pqAns = await Gemini.askChatbotAssistant({
  message: "Power Query M code tips",
  apiKey: null
});
assert(pqAns.includes("Power Query"), "Must answer Power Query questions");
assert(pqAns.includes("Unpivot"), "Must discuss key ETL operations");
console.log("  ✅ PASS: Instant offline guidance provided for Power Query ETL");

console.log("\n================================================================================");
console.log("  ALL CHATBOT ASSISTANT TESTS PASSED (100%)");
console.log("================================================================================\n");
