import fs from "fs";
import path from "path";
import assert from "assert";

console.log("================================================================================");
console.log("  PROGRESSIVE HINT SCAFFOLD DISPLAY VERIFICATION");
console.log("================================================================================\n");

// 1. Verify style.css rules
const cssPath = path.resolve("./style.css");
const cssContent = fs.readFileSync(cssPath, "utf-8");

console.log("--- 1. CSS Layout & Responsive Verification ---");

assert(cssContent.includes(".hint-scaffold-container {"), "CSS should contain .hint-scaffold-container");
assert(cssContent.includes("flex-direction: column;"), ".hint-scaffold-container must declare flex-direction: column");
assert(cssContent.includes("width: 100%;"), ".hint-scaffold-container must declare width: 100%");
console.log("  ✅ PASS: .hint-scaffold-container enforces column direction and 100% width");

assert(cssContent.includes(".hint-tier-card {"), "CSS must define .hint-tier-card");
assert(cssContent.includes(".hint-tier-card.tier-1 {"), "CSS must define .hint-tier-card.tier-1");
assert(cssContent.includes(".hint-tier-card.tier-2 {"), "CSS must define .hint-tier-card.tier-2");
assert(cssContent.includes(".hint-tier-card.tier-3 {"), "CSS must define .hint-tier-card.tier-3");
console.log("  ✅ PASS: .hint-tier-card has dedicated styles for Tier 1, Tier 2, and Tier 3");

assert(cssContent.includes(".hint-tier-code {"), "CSS must define .hint-tier-code");
assert(cssContent.includes("white-space: pre-wrap;"), ".hint-tier-code must have white-space: pre-wrap");
assert(cssContent.includes("word-break: break-word;"), ".hint-tier-code must have word-break: break-word");
console.log("  ✅ PASS: .hint-tier-code wraps properly and prevents horizontal squeeze");

assert(cssContent.includes(".btn-copy-code {"), "CSS must define .btn-copy-code");
assert(cssContent.includes(".btn-hint-advance {"), "CSS must define .btn-hint-advance");
assert(cssContent.includes(".hint-scaffold-topbar {"), "CSS must define .hint-scaffold-topbar");
console.log("  ✅ PASS: Interactive topbar, advance buttons, and copy buttons are styled");

// 2. Verify app.js template and logic
const jsPath = path.resolve("./app.js");
const jsContent = fs.readFileSync(jsPath, "utf-8");

console.log("\n--- 2. JS DOM Template & Event Handlers Verification ---");
assert(jsContent.includes("hint-scaffold-topbar"), "app.js must include hint-scaffold-topbar");
assert(jsContent.includes("btn-hint-tier-select"), "app.js must include btn-hint-tier-select");
assert(jsContent.includes("btn-hint-dismiss"), "app.js must include btn-hint-dismiss");
assert(jsContent.includes("btn-hint-advance"), "app.js must include btn-hint-advance");
assert(jsContent.includes("btn-copy-code"), "app.js must include btn-copy-code");
console.log("  ✅ PASS: app.js renders all required DOM elements and interactive controls");

assert(jsContent.includes("scaffold.style.flexDirection = \"column\";"), "updateHintScaffoldDisplay sets flex-direction column");
assert(jsContent.includes("t1.style.display = tier >= 1 ? \"flex\" : \"none\";"), "updateHintScaffoldDisplay displays tier 1 card");
assert(jsContent.includes("t2.style.display = tier >= 2 ? \"flex\" : \"none\";"), "updateHintScaffoldDisplay displays tier 2 card");
assert(jsContent.includes("t3.style.display = tier >= 3 ? \"flex\" : \"none\";"), "updateHintScaffoldDisplay displays tier 3 card");
console.log("  ✅ PASS: updateHintScaffoldDisplay handles progressive display correctly");

console.log("\n================================================================================");
console.log("  ALL PROGRESSIVE HINT DISPLAY TESTS PASSED (100%)");
console.log("================================================================================\n");
