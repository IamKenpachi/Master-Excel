// scripts/test_phase5.mjs - Automated Verification Suite for Phase 5: Core Learning Engine Upgrades
// Spaced Repetition (SRS), Daily Interview Gauntlet, Verbal Defense Mode, and Activity Logging

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

// -----------------------------------------------------------------------------
// In-Memory localStorage & sessionStorage Polyfill for Node.js
// -----------------------------------------------------------------------------
const storageMap = new Map();
globalThis.localStorage = {
  getItem: (key) => (storageMap.has(key) ? storageMap.get(key) : null),
  setItem: (key, val) => storageMap.set(key, String(val)),
  removeItem: (key) => storageMap.delete(key),
  clear: () => storageMap.clear()
};

const sessionMap = new Map();
globalThis.sessionStorage = {
  getItem: (key) => (sessionMap.has(key) ? sessionMap.get(key) : null),
  setItem: (key, val) => sessionMap.set(key, String(val)),
  removeItem: (key) => sessionMap.delete(key),
  clear: () => sessionMap.clear()
};

// Import code under test
import { Storage } from "../storage.js";
import { VERBAL_DEFENSE_TOPICS } from "../prompts.js";

console.log("================================================================================");
console.log("  EXCELCOACH AI — PHASE 5 AUTOMATED VERIFICATION SUITE (40 TESTS)");
console.log("================================================================================\n");

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

// -----------------------------------------------------------------------------
// Group 1: Spaced Repetition Engine (SRS) (10 tests)
// -----------------------------------------------------------------------------
console.log("--- Group 1: Spaced Repetition Engine (SRS) ---");
localStorage.clear();

test("SRS-01: Storage.getSRSQueue() returns { items: [] } when localStorage is empty", () => {
  localStorage.clear();
  const queue = Storage.getSRSQueue();
  assert.deepStrictEqual(queue, { items: [] });
});

test("SRS-02: Storage.addToSRSQueue() adds a Hard-rated task with correct dueDate (+1 day)", () => {
  localStorage.clear();
  const task = { number: 1, instruction: "Write XLOOKUP with dynamic columns", category: "Lookup & Reference", difficulty: "Hard" };
  Storage.addToSRSQueue(task, "Hard", "test-101");
  const queue = Storage.getSRSQueue();
  assert.strictEqual(queue.items.length, 1);
  assert.strictEqual(queue.items[0].taskId, "test-101_task1");
  assert.strictEqual(queue.items[0].lastRating, "Hard");
  assert.strictEqual(queue.items[0].interval, 1);
  assert.strictEqual(queue.items[0].repetitions, 0);

  // Due date should be tomorrow
  const today = new Date();
  today.setDate(today.getDate() + 1);
  const expectedDue = today.toISOString().split("T")[0];
  assert.strictEqual(queue.items[0].dueDate, expectedDue);
});

test("SRS-03: Storage.addToSRSQueue() does not duplicate a task already in queue — updates it instead", () => {
  const task = { number: 1, instruction: "Updated instruction", category: "Lookup & Reference" };
  Storage.addToSRSQueue(task, "Hard", "test-101");
  const queue = Storage.getSRSQueue();
  assert.strictEqual(queue.items.length, 1);
  assert.strictEqual(queue.items[0].taskInstruction, "Updated instruction");
});

test("SRS-04: Storage.updateSRSItem() with 'Easy' rating increases interval from 1 to 7", () => {
  const updated = Storage.updateSRSItem("test-101_task1", "Easy");
  assert.strictEqual(updated.interval, 7);
  assert.strictEqual(updated.repetitions, 1);
  assert.strictEqual(updated.lastRating, "Easy");
});

test("SRS-05: Storage.updateSRSItem() with 'Hard' rating resets interval to 1 and decreases easeFactor", () => {
  const prevEase = Storage.getSRSQueue().items[0].easeFactor;
  const updated = Storage.updateSRSItem("test-101_task1", "Hard");
  assert.strictEqual(updated.interval, 1);
  assert.strictEqual(updated.lastRating, "Hard");
  assert(updated.easeFactor < prevEase || updated.easeFactor === 1.3);
});

test("SRS-06: Storage.updateSRSItem() with 'Fair' rating sets interval to Math.round(interval * 1.5)", () => {
  // First set interval to 4
  const queue = Storage.getSRSQueue();
  queue.items[0].interval = 4;
  localStorage.setItem("excelcoach_srs_queue", JSON.stringify(queue));

  const updated = Storage.updateSRSItem("test-101_task1", "Fair");
  assert.strictEqual(updated.interval, 6); // 4 * 1.5 = 6
  assert.strictEqual(updated.lastRating, "Fair");
});

test("SRS-07: Storage.getDueSRSItems() returns only items where dueDate <= today", () => {
  const queue = Storage.getSRSQueue();
  const past = new Date();
  past.setDate(past.getDate() - 1);
  queue.items[0].dueDate = past.toISOString().split("T")[0];
  localStorage.setItem("excelcoach_srs_queue", JSON.stringify(queue));

  const due = Storage.getDueSRSItems();
  assert.strictEqual(due.length, 1);
  assert.strictEqual(due[0].taskId, "test-101_task1");
});

test("SRS-08: Storage.getDueSRSItems() returns empty array when all items are in the future", () => {
  const queue = Storage.getSRSQueue();
  const future = new Date();
  future.setDate(future.getDate() + 10);
  queue.items[0].dueDate = future.toISOString().split("T")[0];
  localStorage.setItem("excelcoach_srs_queue", JSON.stringify(queue));

  const due = Storage.getDueSRSItems();
  assert.strictEqual(due.length, 0);
});

test("SRS-09: Storage.updateSRSItem() removes item from queue when interval exceeds 60 days", () => {
  const queue = Storage.getSRSQueue();
  queue.items[0].interval = 45;
  queue.items[0].repetitions = 5;
  queue.items[0].easeFactor = 2.5;
  localStorage.setItem("excelcoach_srs_queue", JSON.stringify(queue));

  const updated = Storage.updateSRSItem("test-101_task1", "Easy"); // 45 * 2.5 = 113 > 60
  assert.strictEqual(updated.mastered, true);
  const queueAfter = Storage.getSRSQueue();
  assert.strictEqual(queueAfter.items.length, 0);
  assert.strictEqual(localStorage.getItem("excelcoach_srs_mastered_count"), "1");
});

test("SRS-10: Storage.getSRSStats() returns { totalQueued, dueToday, masteredCount } with correct counts", () => {
  localStorage.clear();
  localStorage.setItem("excelcoach_srs_mastered_count", "3");
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const queue = {
    items: [
      { taskId: "a", dueDate: today, interval: 1, easeFactor: 2.5, repetitions: 0 },
      { taskId: "b", dueDate: tomorrow.toISOString().split("T")[0], interval: 2, easeFactor: 2.5, repetitions: 1 }
    ]
  };
  localStorage.setItem("excelcoach_srs_queue", JSON.stringify(queue));

  const stats = Storage.getSRSStats();
  assert.strictEqual(stats.totalQueued, 2);
  assert.strictEqual(stats.dueToday, 1);
  assert.strictEqual(stats.masteredCount, 3);
});

// -----------------------------------------------------------------------------
// Group 2: Daily Interview Gauntlet (8 tests)
// -----------------------------------------------------------------------------
console.log("\n--- Group 2: Daily Interview Gauntlet ---");
localStorage.clear();

test("GAUNTLET-01: Storage.getGauntletData() returns default shape when localStorage is empty", () => {
  localStorage.clear();
  const data = Storage.getGauntletData();
  assert.deepStrictEqual(data.history, []);
  assert.strictEqual(data.currentStreak, 0);
  assert.strictEqual(data.longestStreak, 0);
  assert.strictEqual(data.lastAnsweredDate, null);
  assert.strictEqual(data.difficultyOverride, null);
});

test("GAUNTLET-02: Storage.saveGauntletQuestion() adds today's entry to history[]", () => {
  localStorage.clear();
  const q = {
    date: "2026-09-06",
    question: "Explain XLOOKUP vs VLOOKUP",
    expectedAnswer: "=XLOOKUP(...)",
    category: "Lookup & Reference",
    difficulty: "intermediate"
  };
  Storage.saveGauntletQuestion(q);
  const data = Storage.getGauntletData();
  assert.strictEqual(data.history.length, 1);
  assert.strictEqual(data.history[0].question, "Explain XLOOKUP vs VLOOKUP");
  assert.strictEqual(data.history[0].answered, false);
});

test("GAUNTLET-03: Storage.saveGauntletQuestion() does NOT overwrite if today already has an entry", () => {
  const duplicate = {
    date: "2026-09-06",
    question: "DIFFERENT QUESTION",
    expectedAnswer: "DIFFERENT ANSWER"
  };
  Storage.saveGauntletQuestion(duplicate);
  const data = Storage.getGauntletData();
  assert.strictEqual(data.history.length, 1);
  assert.strictEqual(data.history[0].question, "Explain XLOOKUP vs VLOOKUP");
});

test("GAUNTLET-04: Storage.markGauntletAnswered() sets answered=true, saves score + feedback", () => {
  const entry = Storage.markGauntletAnswered("2026-09-06", "My user answer", 9, "Great job!");
  assert.strictEqual(entry.answered, true);
  assert.strictEqual(entry.userAnswer, "My user answer");
  assert.strictEqual(entry.score, 9);
  assert.strictEqual(entry.feedback, "Great job!");
});

test("GAUNTLET-05: Storage.markGauntletAnswered() increments currentStreak if lastAnsweredDate was yesterday", () => {
  // Add a question for tomorrow and answer it
  Storage.saveGauntletQuestion({ date: "2026-09-07", question: "Day 2 Question" });
  Storage.markGauntletAnswered("2026-09-07", "Day 2 Answer", 10, "Superb");
  const data = Storage.getGauntletData();
  assert.strictEqual(data.currentStreak, 2);
  assert.strictEqual(data.longestStreak, 2);
  assert.strictEqual(data.lastAnsweredDate, "2026-09-07");
});

test("GAUNTLET-06: Storage.markGauntletAnswered() resets currentStreak to 1 if lastAnsweredDate was 2+ days ago", () => {
  // Answer after a gap (e.g. 2026-09-10)
  Storage.saveGauntletQuestion({ date: "2026-09-10", question: "Day 5 Question" });
  Storage.markGauntletAnswered("2026-09-10", "Day 5 Answer", 8, "Good");
  const data = Storage.getGauntletData();
  assert.strictEqual(data.currentStreak, 1);
  assert.strictEqual(data.longestStreak, 2); // Longest streak preserved
});

test("GAUNTLET-07: Storage.markGauntletAnswered() does NOT double-increment streak if called twice same day", () => {
  const dataBefore = Storage.getGauntletData();
  const streakBefore = dataBefore.currentStreak;
  Storage.markGauntletAnswered("2026-09-10", "Second attempt", 9, "Updated");
  const dataAfter = Storage.getGauntletData();
  assert.strictEqual(dataAfter.currentStreak, streakBefore);
});

test("GAUNTLET-08: Storage.getGauntletStreak() returns correct { currentStreak, longestStreak }", () => {
  const streak = Storage.getGauntletStreak();
  assert.strictEqual(streak.currentStreak, 1);
  assert.strictEqual(streak.longestStreak, 2);
});

// -----------------------------------------------------------------------------
// Group 3: Verbal Defense Mode (7 tests)
// -----------------------------------------------------------------------------
console.log("\n--- Group 3: Verbal Defense Mode ---");
localStorage.clear();

test("VERBAL-01: Storage.getVerbalScores() returns { sessions: [] } when localStorage is empty", () => {
  localStorage.clear();
  const scores = Storage.getVerbalScores();
  assert.deepStrictEqual(scores, { sessions: [] });
});

test("VERBAL-02: Storage.saveVerbalSession() prepends session to sessions[]", () => {
  const session1 = {
    date: "2026-09-06",
    topic: "XLOOKUP vs VLOOKUP",
    category: "lookup",
    question: "Explain why you'd use XLOOKUP",
    userResponse: "Because it defaults to exact match and does not break on column insertion.",
    scores: { accuracy: 3, clarity: 3, interviewLanguage: 3 },
    total: 9,
    feedback: "Excellent!",
    improvedPhrase: "I advise XLOOKUP..."
  };
  Storage.saveVerbalSession(session1);
  const data = Storage.getVerbalScores();
  assert.strictEqual(data.sessions.length, 1);
  assert.strictEqual(data.sessions[0].topic, "XLOOKUP vs VLOOKUP");
});

test("VERBAL-03: Storage.saveVerbalSession() keeps maximum 50 sessions (trims oldest)", () => {
  for (let i = 2; i <= 60; i++) {
    Storage.saveVerbalSession({
      topic: `Topic ${i}`,
      category: "lookup",
      total: 8,
      scores: { accuracy: 2, clarity: 3, interviewLanguage: 3 }
    });
  }
  const data = Storage.getVerbalScores();
  assert.strictEqual(data.sessions.length, 50);
  assert.strictEqual(data.sessions[0].topic, "Topic 60");
});

test("VERBAL-04: Storage.getVerbalStats() returns correct avgScore from multiple sessions", () => {
  localStorage.clear();
  Storage.saveVerbalSession({ total: 10, scores: { accuracy: 3, clarity: 3, interviewLanguage: 4 } });
  Storage.saveVerbalSession({ total: 6, scores: { accuracy: 2, clarity: 2, interviewLanguage: 2 } });
  const stats = Storage.getVerbalStats();
  assert.strictEqual(stats.totalSessions, 2);
  assert.strictEqual(stats.avgScore, 8); // (10 + 6) / 2
});

test("VERBAL-05: Storage.getVerbalStats() correctly identifies weakestAxis from session scores", () => {
  localStorage.clear();
  // High accuracy (3/3), high interviewLanguage (4/4), but low clarity (1/3)
  Storage.saveVerbalSession({ total: 8, scores: { accuracy: 3, clarity: 1, interviewLanguage: 4 } });
  Storage.saveVerbalSession({ total: 8, scores: { accuracy: 3, clarity: 1, interviewLanguage: 4 } });
  const stats = Storage.getVerbalStats();
  assert.strictEqual(stats.weakestAxis, "clarity");
});

test("VERBAL-06: VERBAL_DEFENSE_TOPICS is exported from prompts.js and has >= 10 entries", () => {
  assert(Array.isArray(VERBAL_DEFENSE_TOPICS), "VERBAL_DEFENSE_TOPICS must be an array");
  assert(VERBAL_DEFENSE_TOPICS.length >= 10, `Expected at least 10 topics, got ${VERBAL_DEFENSE_TOPICS.length}`);
});

test("VERBAL-07: Each VERBAL_DEFENSE_TOPICS entry has { topic: string, category: string } shape", () => {
  VERBAL_DEFENSE_TOPICS.forEach((entry, idx) => {
    assert(typeof entry.topic === "string" && entry.topic.length > 0, `Topic ${idx} has invalid topic`);
    assert(typeof entry.category === "string" && entry.category.length > 0, `Topic ${idx} has invalid category`);
  });
});

// -----------------------------------------------------------------------------
// Group 4: Daily Activity Log (5 tests)
// -----------------------------------------------------------------------------
console.log("\n--- Group 4: Daily Activity Log ---");
localStorage.clear();

test("ACTIVITY-01: Storage.logActivity() creates a new day entry if none exists", () => {
  localStorage.clear();
  const entry = Storage.logActivity("2026-09-06", { tasksCompleted: 2 });
  assert.strictEqual(entry.tasksCompleted, 2);
  const log = Storage.getActivityLog();
  assert(Boolean(log["2026-09-06"]));
});

test("ACTIVITY-02: Storage.logActivity() merges into existing day entry (does not overwrite)", () => {
  Storage.logActivity("2026-09-06", { srsReviewed: 3 });
  const log = Storage.getActivityLog();
  assert.strictEqual(log["2026-09-06"].tasksCompleted, 2);
  assert.strictEqual(log["2026-09-06"].srsReviewed, 3);
});

test("ACTIVITY-03: Storage.logActivity() correctly accumulates numeric fields (tasksCompleted += n)", () => {
  Storage.logActivity("2026-09-06", { tasksCompleted: 5 });
  const log = Storage.getActivityLog();
  assert.strictEqual(log["2026-09-06"].tasksCompleted, 7); // 2 + 5 = 7
});

test("ACTIVITY-04: Storage.logActivity() correctly sets boolean fields (gauntletAnswered = true)", () => {
  Storage.logActivity("2026-09-06", { gauntletAnswered: true });
  const log = Storage.getActivityLog();
  assert.strictEqual(log["2026-09-06"].gauntletAnswered, true);
});

test("ACTIVITY-05: Activity log is keyed by ISO date string 'YYYY-MM-DD' format", () => {
  const log = Storage.getActivityLog();
  const keys = Object.keys(log);
  assert(keys.length > 0);
  keys.forEach(k => {
    assert(/^\d{4}-\d{2}-\d{2}$/.test(k), `Key ${k} is not YYYY-MM-DD format`);
  });
});

// -----------------------------------------------------------------------------
// Group 5: HTML Structure Verification (5 tests)
// -----------------------------------------------------------------------------
console.log("\n--- Group 5: HTML Structure Verification ---");
const htmlPath = path.resolve("./index.html");
const htmlContent = fs.readFileSync(htmlPath, "utf-8");

test("HTML-01: index.html contains #srs-review-card element", () => {
  assert(htmlContent.includes('id="srs-review-card"'), "index.html missing #srs-review-card");
});

test("HTML-02: index.html contains #gauntlet-card element with #gauntlet-streak and #gauntlet-body", () => {
  assert(htmlContent.includes('id="gauntlet-card"'), "index.html missing #gauntlet-card");
  assert(htmlContent.includes('id="gauntlet-streak"'), "index.html missing #gauntlet-streak");
  assert(htmlContent.includes('id="gauntlet-body"'), "index.html missing #gauntlet-body");
});

test("HTML-03: index.html contains #verbal-defense-area element", () => {
  assert(htmlContent.includes('id="verbal-defense-area"'), "index.html missing #verbal-defense-area");
});

test("HTML-04: index.html contains #verbal-defense-input textarea", () => {
  assert(htmlContent.includes('id="verbal-defense-input"'), "index.html missing #verbal-defense-input");
});

test("HTML-05: index.html Drill Mode selector contains 'verbal_defense' option value", () => {
  assert(htmlContent.includes('value="verbal_defense"'), "index.html missing option value='verbal_defense'");
});

// -----------------------------------------------------------------------------
// Group 6: CSS Rules Verification (5 tests)
// -----------------------------------------------------------------------------
console.log("\n--- Group 6: CSS Rules Verification ---");
const cssPath = path.resolve("./style.css");
const cssContent = fs.readFileSync(cssPath, "utf-8");

test("CSS-01: style.css contains .srs-card rule", () => {
  assert(cssContent.includes(".srs-card"), "style.css missing .srs-card");
});

test("CSS-02: style.css contains .gauntlet-card rule", () => {
  assert(cssContent.includes(".gauntlet-card"), "style.css missing .gauntlet-card");
});

test("CSS-03: style.css contains .verbal-defense-area rule", () => {
  assert(cssContent.includes(".verbal-defense-area"), "style.css missing .verbal-defense-area");
});

test("CSS-04: style.css contains .verbal-model-answer rule", () => {
  assert(cssContent.includes(".verbal-model-answer"), "style.css missing .verbal-model-answer");
});

test("CSS-05: style.css contains .btn-srs-rate rule", () => {
  assert(cssContent.includes(".btn-srs-rate"), "style.css missing .btn-srs-rate");
});

// -----------------------------------------------------------------------------
// Final Summary
// -----------------------------------------------------------------------------
console.log("\n================================================================================");
if (passed === total) {
  console.log(`  🎉 ALL ${passed}/${total} PHASE 5 TESTS PASSED SUCCESSFULLY!`);
} else {
  console.log(`  ⚠️ ${passed}/${total} tests passed, ${total - passed} failed.`);
}
console.log("================================================================================\n");

if (passed !== total) {
  process.exit(1);
}
