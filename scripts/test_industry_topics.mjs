// scripts/test_industry_topics.mjs
// Automated verification suite for the 16 Preset Industry Domain Topic Chips

import assert from "assert";
import fs from "fs";
import path from "path";
import { INDUSTRY_DOMAINS } from "../prompts.js";

console.log("================================================================================");
console.log("  EXCELCOACH AI — PRESET INDUSTRY DOMAINS VERIFICATION SUITE");
console.log("================================================================================\n");

// 1. Verify INDUSTRY_DOMAINS Constant
console.log("--- 1. INDUSTRY_DOMAINS Constant in prompts.js ---");
assert(Array.isArray(INDUSTRY_DOMAINS), "INDUSTRY_DOMAINS should be an array");
assert.strictEqual(INDUSTRY_DOMAINS.length, 16, "Should contain exactly 16 industry domains from reference image");

const expectedDomains = [
  "General Purpose Generators",
  "Project Management",
  "Sales",
  "Finance & Accounting",
  "Travel & Hospitality",
  "Customer Service",
  "E-Commerce & Marketing",
  "Healthcare",
  "HR & Analytics",
  "IT Service Management",
  "Manufacturing & Quality",
  "Real Estate",
  "Social Media Analytics",
  "Supply Chain & Logistics",
  "Digital Marketing",
  "Education & Academia"
];

expectedDomains.forEach(name => {
  const match = INDUSTRY_DOMAINS.find(d => d.name === name);
  assert(match, `Missing expected domain: "${name}"`);
  assert(match.icon && match.icon.length > 0, `Domain "${name}" missing emoji icon`);
  assert(match.query && match.query.length > 0, `Domain "${name}" missing search query string`);
});
console.log(`  ✅ PASS: All 16 industry domains correctly defined with icons and queries`);

// 2. Verify HTML Elements in index.html
console.log("\n--- 2. HTML Markup in index.html ---");
const html = fs.readFileSync(path.resolve("./index.html"), "utf-8");

assert(html.includes('id="dataset-topics-container"'), "Missing #dataset-topics-container in index.html");
assert(html.includes('id="dataset-topics-grid"'), "Missing #dataset-topics-grid in index.html");
assert(html.includes('id="input-dataset-query"'), "Missing #input-dataset-query in index.html");
assert(html.includes("Suggested Industry Topics"), "Missing Suggested Industry Topics label in index.html");
console.log("  ✅ PASS: #dataset-topics-container and #dataset-topics-grid present in index.html");

// 3. Verify CSS in style.css
console.log("\n--- 3. CSS Styles in style.css ---");
const css = fs.readFileSync(path.resolve("./style.css"), "utf-8");

assert(css.includes(".dataset-topics-container"), "Missing .dataset-topics-container CSS rule");
assert(css.includes(".dataset-topics-grid"), "Missing .dataset-topics-grid CSS rule");
assert(css.includes(".domain-topic-chip"), "Missing .domain-topic-chip CSS rule");
assert(css.includes(".domain-topic-chip.active"), "Missing .domain-topic-chip.active CSS rule");
assert(css.includes(".domain-topic-chip:hover"), "Missing .domain-topic-chip:hover CSS rule");
console.log("  ✅ PASS: CSS rules for container, chips, active, and hover states verified");

// 4. Lightweight DOM Simulation of renderIndustryDomainChips
console.log("\n--- 4. DOM Interaction & State Synchronization Simulation ---");

class MockElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    const classes = new Set();
    this.classList = {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
      has: (c) => classes.has(c)
    };
    this.attributes = {};
    this.listeners = {};
    this.value = "";
    this.innerHTML = "";
    this.dataset = {};
  }
  appendChild(child) {
    this.children.push(child);
  }
  addEventListener(event, handler) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(handler);
  }
  dispatchEvent(event) {
    const type = typeof event === "string" ? event : event.type;
    (this.listeners[type] || []).forEach(fn => fn(event));
  }
  click() {
    this.dispatchEvent({ type: "click", preventDefault: () => {} });
  }
  focus() {
    this.isFocused = true;
  }
}

// Setup mock document
const mockContainer = new MockElement("div");
const mockInput = new MockElement("input");
mockInput.value = "sales";

const elementsById = {
  "dataset-topics-grid": mockContainer,
  "input-dataset-query": mockInput
};

global.document = {
  getElementById: (id) => elementsById[id] || null,
  createElement: (tag) => new MockElement(tag),
  addEventListener: () => {},
  querySelectorAll: (selector) => {
    if (selector === ".domain-topic-chip") {
      return mockContainer.children;
    }
    return [];
  }
};

const { renderIndustryDomainChips } = await import("../app.js");

renderIndustryDomainChips();

assert.strictEqual(mockContainer.children.length, 16, "Should render 16 chips into container");

// Check initial highlight for 'sales'
const salesChip = mockContainer.children.find(c => c.dataset.topic === "Sales");
assert(salesChip, "Sales chip should be present");
assert(salesChip.classList.has("active"), "Sales chip should be initially active");
console.log("  ✅ PASS: Initial input 'sales' automatically activates the Sales chip");

// Click 'Finance & Accounting'
const financeChip = mockContainer.children.find(c => c.dataset.topic === "Finance & Accounting");
assert(financeChip, "Finance & Accounting chip should be present");
financeChip.click();

assert.strictEqual(mockInput.value, "Finance & Accounting", "Clicking Finance & Accounting populates input");
assert(financeChip.classList.has("active"), "Finance chip is active");
assert(!salesChip.classList.has("active"), "Sales chip is inactive");
assert(mockInput.isFocused, "Input was given focus for candidate editing");
console.log("  ✅ PASS: Clicking topic replaces input bar text and moves active state");

// User modifies input text
mockInput.value = "Finance & Accounting Q3";
mockInput.dispatchEvent("input");

assert.strictEqual(mockInput.value, "Finance & Accounting Q3", "Input retains user customization");
assert(!financeChip.classList.has("active"), "Customized text removes exact active highlight");
console.log("  ✅ PASS: User can freely modify topic without losing custom input");

// User clicks another topic 'Healthcare'
const healthChip = mockContainer.children.find(c => c.dataset.topic === "Healthcare");
assert(healthChip, "Healthcare chip should be present");
healthChip.click();

assert.strictEqual(mockInput.value, "Healthcare", "Clicking new topic deletes old customized text and sets new topic");
assert(healthChip.classList.has("active"), "Healthcare chip is active");
assert(!financeChip.classList.has("active"), "Finance chip is inactive");
console.log("  ✅ PASS: Selecting another topic deletes prior text and sets newly selected topic");

// User clicks 'General Purpose Generators'
const gpChip = mockContainer.children.find(c => c.dataset.topic === "General Purpose Generators");
assert(gpChip, "General Purpose Generators chip should be present");
gpChip.click();

assert.strictEqual(mockInput.value, "General Purpose Generators", "Sets General Purpose Generators");
assert(gpChip.classList.has("active"), "General Purpose Generators chip is active");
assert(!healthChip.classList.has("active"), "Healthcare chip is inactive");
console.log("  ✅ PASS: Full cycle with 'General Purpose Generators' verified");

console.log("\n================================================================================");
console.log("  ALL PRESET INDUSTRY DOMAIN TOPIC TESTS PASSED (100%)");
console.log("================================================================================\n");
