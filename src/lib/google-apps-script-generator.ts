/**
 * Generates ready-to-copy Google Apps Script code for any Google Sheet or Google Form.
 */
export function generateGoogleAppsScript(baseUrl: string, secretKey: string, sourceName: string): string {
  const webhookUrl = `${baseUrl.replace(/\/$/, "")}/api/webhooks/google-sheets`;

  return `/**
 * AceOne Solutions CRM — Real-Time Google Sheet & Google Form Ingestion Script
 * Source: "${sourceName}"
 * 
 * INSTRUCTIONS:
 * 1. Open your Google Sheet.
 * 2. Click "Extensions" > "Apps Script".
 * 3. Delete any existing code, paste this entire script, and click "Save" (Floppy icon).
 * 4. Click "Triggers" (alarm clock icon on the left).
 * 5. Click "+ Add Trigger" (bottom right).
 * 6. Set:
 *    - Function to run: "onFormSubmit" (for Google Forms) OR "onEditTrigger" (for manual row additions)
 *    - Event source: "From spreadsheet"
 *    - Event type: "On form submit" (or "On change")
 * 7. Click "Save" and authorize permissions. Done!
 */

var CRM_WEBHOOK_URL = "${webhookUrl}";
var CRM_SECRET_KEY = "${secretKey}";

// Triggered automatically when a Google Form linked to this sheet is submitted
function onFormSubmit(e) {
  try {
    var rowData = {};
    
    // e.namedValues contains all questions and submitted answers as key-values
    if (e && e.namedValues) {
      for (var col in e.namedValues) {
        var val = e.namedValues[col];
        rowData[col] = Array.isArray(val) ? val.join(", ") : String(val);
      }
    } else if (e && e.values && e.range) {
      // Fallback: Read headers from row 1 and values from current range
      var sheet = e.range.getSheet();
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      for (var i = 0; i < headers.length; i++) {
        if (headers[i]) {
          rowData[headers[i]] = e.values[i] || "";
        }
      }
    }

    sendToAceOneCRM(rowData);
  } catch (err) {
    Logger.log("Error in onFormSubmit: " + err.toString());
  }
}

// Function to send the payload to AceOne CRM API
function sendToAceOneCRM(rowDictionary) {
  var payload = {
    secretKey: CRM_SECRET_KEY,
    row: rowDictionary,
    timestamp: new Date().toISOString()
  };

  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(CRM_WEBHOOK_URL, options);
  Logger.log("AceOne CRM Response: " + response.getContentText());
}

// Test function: Run this manually from Apps Script editor to test connection!
function testConnectionToAceOne() {
  sendToAceOneCRM({
    "Full Name": "Test Customer (From Apps Script)",
    "Phone Number": "+92 300 1234567",
    "Email": "test@example.com",
    "Interested Service": "Real Estate Investment",
    "City": "Karachi",
    "Budget": "1.5 Crore"
  });
}
`;
}
