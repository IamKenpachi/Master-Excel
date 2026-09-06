// export.js - PDF Printing, Excel-Themed Worksheet Export, and Dataset CSV Downloader

export const Exporter = {
  /**
   * Download synthetic or extracted CSV data directly to the user's computer
   */
  downloadCSV(csvContent, filename = "interview_dataset.csv") {
    if (!csvContent) {
      alert("No dataset content available to download.");
      return;
    }

    const cleanName = filename.endsWith(".csv") ? filename : `${filename}.csv`;
    const blob = new Blob([csvContent.trim()], { type: "text/csv;charset=utf-8;" });
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

    const answerLookup = {};
    answerKey.forEach((a, idx) => {
      const num = parseInt(a.taskNumber || a.taskNo || a.task_no || a.no || a.number || (idx + 1), 10);
      answerLookup[num] = a;
    });

    const rowsHtml = (test.tasks || []).map((task, idx) => {
      const taskNum = parseInt(task.number || task.no || task.taskNo || task.task_no || (idx + 1), 10);
      const ansObj = answerLookup[taskNum];
      const answerCell = includeAnswers && ansObj
        ? `<div class="answer-text"><strong>${ansObj.answer || ""}</strong><br><small style="color:#555;">${ansObj.explanation || ""}</small></div>`
        : "";

      return `
        <tr>
          <td class="col-no">${taskNum}</td>
          <td class="col-instructions">${task.instruction || ""}</td>
          <td class="col-answer">${answerCell}</td>
        </tr>
      `;
    }).join("");

    const printHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>${test.title} - Excel Test</title>
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
          /* Excel Grid look */
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
          <div class="excel-title">${test.title}</div>
        </div>

        <div class="scenario-card">
          <span class="scenario-label">Background</span>
          <span class="scenario-body">
            ${test.scenario.background}<br><br>
            <strong>Objective:</strong> ${test.scenario.objective || "Analyze and synthesize the data according to the tasks below."}
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
          Excel Mock Test Generator • Difficulty: ${test.difficultyLabel || test.difficulty} • Estimated: ${test.estimatedMinutes} mins • Generated via Gemini
        </div>

        <script>
          // Auto print on load if preferred
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printHtml);
    printWindow.document.close();
  }
};
