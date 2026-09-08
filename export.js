// export.js - PDF Printing, Excel-Themed Worksheet Export, and Dataset CSV Downloader

export function escapeHtml(str) {
  if (typeof str !== "string") return String(str ?? "");
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const Exporter = {
  /**
   * Download synthetic or extracted CSV data directly to the user's computer
   * Prepends UTF-8 BOM (\uFEFF) so desktop Excel opens accented & currency characters cleanly (ARCH-01)
   */
  downloadCSV(csvContent, filename = "interview_dataset.csv") {
    if (!csvContent) {
      alert("No dataset content available to download.");
      return;
    }

    const cleanName = filename.endsWith(".csv") ? filename : `${filename}.csv`;
    const bomPrefix = "\uFEFF";
    const blob = new Blob([bomPrefix + csvContent.trim()], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", cleanName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Generates a printable Excel-style HTML document and triggers window.print()
   * Mimics the exact layout from the user's screenshot:
   * Header: "Advanced Excel Test for Job Interview"
   * Background block: "Client manages eBook Sales..."
   * Table: No | Instructions | Answer
   */
  printExcelTestSheet(testData, includeAnswers = false) {
    const test = testData.test || testData;
    const answerKey = testData.answerKey || [];
    const printWindow = window.open("", "_blank");

    // Guard against browser popup blocker (BUG-01)
    if (!printWindow) {
      alert("⚠️ Pop-up window was blocked by your browser. Please allow pop-ups for this site to print the test sheet.");
      return;
    }

    const answerLookup = {};
    answerKey.forEach((a, idx) => {
      const num = parseInt(a.taskNumber || a.taskNo || a.task_no || a.no || a.number || (idx + 1), 10);
      answerLookup[num] = a;
    });

    const rowsHtml = (test.tasks || []).map((task, idx) => {
      const taskNum = parseInt(task.number || task.no || task.taskNo || task.task_no || (idx + 1), 10);
      const ansObj = answerLookup[taskNum];
      const answerCell = includeAnswers && ansObj
        ? `<div class="answer-text"><strong>${escapeHtml(ansObj.answer || "")}</strong><br><small style="color:#555;">${escapeHtml(ansObj.explanation || "")}</small></div>`
        : "";

      return `
        <tr>
          <td class="col-no">${taskNum}</td>
          <td class="col-instructions">${escapeHtml(task.instruction || "")}</td>
          <td class="col-answer">${answerCell}</td>
        </tr>
      `;
    }).join("");

    const safeTitle = escapeHtml(test.title || "Excel Test");
    const safeBackground = escapeHtml(test.scenario?.background || "Technical interview case study.");
    const safeObjective = escapeHtml(test.scenario?.objective || "Analyze and synthesize the data according to the tasks below.");
    const safeDifficulty = escapeHtml(test.difficultyLabel || test.difficulty || "Intermediate");
    const safeMinutes = escapeHtml(String(test.estimatedMinutes || 45));

    const printHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>${safeTitle} - Excel Test</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm 12mm;
          }
          body {
            font-family: Calibri, 'Segoe UI', Arial, sans-serif;
            color: #000;
            background: #fff;
            margin: 0;
            padding: 20px;
          }
          .excel-header {
            margin-bottom: 12px;
          }
          .excel-title {
            font-size: 18pt;
            font-weight: bold;
            color: #111;
            margin-bottom: 12px;
          }
          .scenario-card {
            border: 1px solid #c0c0c0;
            padding: 10px 14px;
            margin-bottom: 16px;
            background: #fdfdfd;
            border-left: 4px solid #107C41;
          }
          .scenario-label {
            font-weight: bold;
            font-size: 11pt;
            display: inline-block;
            width: 100px;
            vertical-align: top;
          }
          .scenario-body {
            display: inline-block;
            width: calc(100% - 110px);
            font-size: 10pt;
            line-height: 1.4;
          }
          table.excel-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10pt;
          }
          table.excel-table th {
            background-color: #FFF2CC;
            border: 1px solid #A6A6A6;
            padding: 6px 8px;
            font-weight: bold;
            text-align: left;
            font-size: 10.5pt;
          }
          table.excel-table td {
            border: 1px solid #D9D9D9;
            padding: 6px 8px;
            vertical-align: top;
          }
          .col-no {
            width: 50px;
            text-align: center;
            font-weight: bold;
            background: #fafafa;
          }
          .col-instructions {
            width: 60%;
            line-height: 1.35;
          }
          .col-answer {
            width: 35%;
            min-height: 28px;
          }
          .answer-text {
            font-size: 9pt;
          }
          .footer-meta {
            margin-top: 20px;
            font-size: 8pt;
            color: #777;
            text-align: right;
            border-top: 1px dashed #ddd;
            padding-top: 6px;
          }
          @media print {
            body { padding: 0; }
            button.no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div style="text-align: right; margin-bottom: 15px;">
          <button class="no-print" onclick="window.print()" style="padding: 8px 16px; background: #107C41; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">
            🖨️ Print / Save as PDF
          </button>
        </div>

        <div class="excel-header">
          <div class="excel-title">${safeTitle}</div>
        </div>

        <div class="scenario-card">
          <span class="scenario-label">Background</span>
          <span class="scenario-body">
            ${safeBackground}<br><br>
            <strong>Objective:</strong> ${safeObjective}
          </span>
        </div>

        <table class="excel-table">
          <thead>
            <tr>
              <th style="width: 50px; text-align: center;">No</th>
              <th>Instructions</th>
              <th>Answer</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer-meta">
          Excel Mock Test Generator • Difficulty: ${safeDifficulty} • Estimated: ${safeMinutes} mins • Generated via Gemini
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printHtml);
    printWindow.document.close();
  },

  /**
   * Generates a high-density, printable 1-page Interview Defense Cheat Sheet
   */
  printInterviewCheatSheet(testData) {
    const test = testData.test || testData;
    const answerKey = testData.answerKey || [];
    const printWindow = window.open("", "_blank");

    // Guard against browser popup blocker (BUG-01)
    if (!printWindow) {
      alert("⚠️ Pop-up window was blocked by your browser. Please allow pop-ups for this site to print the cheat sheet.");
      return;
    }

    const answerLookup = {};
    answerKey.forEach((a, idx) => {
      const num = parseInt(a.taskNumber || a.taskNo || a.task_no || a.no || a.number || (idx + 1), 10);
      answerLookup[num] = a;
    });

    const rowsHtml = (test.tasks || []).map((task, idx) => {
      const taskNum = parseInt(task.number || task.no || task.taskNo || task.task_no || (idx + 1), 10);
      const ansObj = answerLookup[taskNum] || {};
      const formula = ansObj.answer || task.hint || "Standard Formula";
      const tip = ansObj.proTip || "Favor dynamic references over static ranges.";
      const talkingPoint = ansObj.interviewTalkingPoint || ansObj.explanation || "Explain calculation trade-offs to demonstrate senior analytical maturity.";

      return `
        <tr>
          <td style="font-weight:bold; text-align:center; width:36px; vertical-align:top; border:1px solid #d0d7de; padding:6px;">${taskNum}</td>
          <td style="width:140px; vertical-align:top; border:1px solid #d0d7de; padding:6px;">
            <strong style="color:#0f5132; font-size:9pt;">${escapeHtml(task.category || "Excel")}</strong><br>
            <span style="font-size:8pt; color:#333;">${escapeHtml(task.instruction || "")}</span>
          </td>
          <td style="vertical-align:top; border:1px solid #d0d7de; padding:6px; font-family:Consolas, Monaco, monospace; font-size:8.5pt; color:#107C41; background:#f8fafc;">
            <strong>${escapeHtml(formula)}</strong>
          </td>
          <td style="vertical-align:top; border:1px solid #d0d7de; padding:6px; font-size:8pt; color:#333;">
            <strong style="color:#b45309;">💡 Tip:</strong> ${escapeHtml(tip)}<br>
            <strong style="color:#6b21a8;">🎙️ Defense:</strong> ${escapeHtml(talkingPoint)}
          </td>
        </tr>
      `;
    }).join("");

    const safeTitle = escapeHtml(test.title || "Technical Interview");
    const safeDifficulty = escapeHtml(test.difficultyLabel || test.difficulty || "Intermediate");
    const taskLength = (test.tasks || []).length || 15;

    const printHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>${safeTitle} - Technical Interview Defense Sheet</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 10mm;
          }
          body {
            font-family: Calibri, 'Segoe UI', Arial, sans-serif;
            color: #111;
            background: #fff;
            margin: 0;
            padding: 12px;
          }
          .sheet-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            border-bottom: 2px solid #107C41;
            padding-bottom: 8px;
            margin-bottom: 12px;
          }
          .sheet-title {
            font-size: 14pt;
            font-weight: bold;
            color: #107C41;
          }
          .sheet-meta {
            font-size: 8.5pt;
            color: #555;
            text-align: right;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8.5pt;
          }
          th {
            background: #f1f5f9;
            color: #334155;
            font-weight: bold;
            border: 1px solid #cbd5e1;
            padding: 6px;
            text-align: left;
          }
          @media print {
            body { padding: 0; }
            button.no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div style="text-align: right; margin-bottom: 10px;">
          <button class="no-print" onclick="window.print()" style="padding: 6px 14px; background: #107C41; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">
            🖨️ Print 1-Page Cheat Sheet (PDF)
          </button>
        </div>

        <div class="sheet-header">
          <div>
            <div class="sheet-title">⚡ ${safeTitle}</div>
            <div style="font-size:9pt; color:#475569; margin-top:2px;">Senior Technical Interview Cheat Sheet • Formulas & Oral Defense</div>
          </div>
          <div class="sheet-meta">
            <strong>Level:</strong> ${safeDifficulty} • <strong>Tasks:</strong> ${taskLength}<br>
            Candidate Quick Reference
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="text-align:center;">#</th>
              <th>Topic / Objective</th>
              <th>Master Formula / Syntax</th>
              <th>Interview Defense & Pro Tip</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div style="margin-top:12px; font-size:7.5pt; color:#64748b; text-align:center; border-top:1px solid #e2e8f0; padding-top:6px;">
          Master-Excel Technical Interview Simulator • Generated for Job Candidate Practice
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printHtml);
    printWindow.document.close();
  }
};
