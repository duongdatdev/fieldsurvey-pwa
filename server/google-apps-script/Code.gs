/**
 * FieldSurvey PWA - Google Apps Script Backend
 * Subtitle: Offline-First Field Survey & Social Research Platform
 * 
 * Instructions:
 * 1. Create a new Google Sheet (e.g., "FieldSurvey Database").
 * 2. In Google Sheets menu, click Extensions -> Apps Script.
 * 3. Replace all code in Code.gs with this file.
 * 4. Click Deploy -> New deployment.
 * 5. Select type: "Web app".
 * 6. Set Description: "FieldSurvey Web API v1.0".
 * 7. Execute as: "Me" (your Google account).
 * 8. Who has access: "Anyone" (allows PWA field devices to submit).
 * 9. Click Deploy and copy the Web App URL (ends in /exec).
 * 10. Paste the URL into FieldSurvey PWA -> Config / Settings.
 */

// Configuration
const SHEET_NAMES = {
  SURVEYS: 'Surveys',
  QUESTIONS: 'Questions',
  RESPONSES: 'Responses',
  LOGS: 'SyncLogs',
};

/**
 * Handle HTTP GET Requests
 * Used for health checks, connection testing, and fetching survey definitions.
 */
function doGet(e) {
  try {
    const action = e.parameter ? e.parameter.action : 'ping';
    
    if (action === 'ping') {
      return createJsonResponse({
        success: true,
        service: 'FieldSurvey Google Apps Script API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        status: 'READY',
      });
    }

    if (action === 'checkDriveUploads') {
      try {
        var folderName = 'FieldSurvey Uploads';
        var folders = DriveApp.getFoldersByName(folderName);
        if (!folders.hasNext()) {
          return createJsonResponse({ success: true, folderExists: false, files: [], message: 'Folder not created yet' });
        }
        var folder = folders.next();
        var files = folder.getFiles();
        var fileList = [];
        while (files.hasNext()) {
          var f = files.next();
          fileList.push({
            name: f.getName(),
            url: f.getUrl(),
            sizeBytes: f.getSize(),
            dateCreated: f.getDateCreated()
          });
        }
        return createJsonResponse({ success: true, folderExists: true, files: fileList });
      } catch (err) {
        return createJsonResponse({ success: false, error: 'Drive error: ' + err.toString() });
      }
    }

    if (action === 'getRecentResponses') {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const rSheet = ss.getSheetByName(SHEET_NAMES.RESPONSES);
      if (!rSheet) return createJsonResponse({ success: true, rows: [] });
      const lastRow = rSheet.getLastRow();
      if (lastRow <= 1) return createJsonResponse({ success: true, rows: [] });
      const data = rSheet.getRange(Math.max(2, lastRow - 5), 1, Math.min(6, lastRow - 1), rSheet.getLastColumn()).getValues();
      return createJsonResponse({ success: true, rows: data });
    }

    return createJsonResponse({
      success: false,
      error: 'Unknown GET action: ' + action,
    });
  } catch (err) {
    return createJsonResponse({
      success: false,
      error: err.toString(),
    });
  }
}

/**
 * Handle HTTP POST Requests
 * Used for submitting individual or batched survey responses with idempotency guarantees.
 */
function doPost(e) {
  try {
    initDatabaseIfMissing();

    let payload;
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else {
      payload = e.parameter || {};
    }

    const action = payload.action || 'submitResponse';

    // Action 1: Submit Single Response
    if (action === 'submitResponse') {
      const result = recordSurveyResponse(payload.response);
      return createJsonResponse(result);
    }

    // Action 2: Batch Sync Multiple Responses
    if (action === 'syncResponses') {
      const responses = payload.responses || [];
      const results = [];
      for (var i = 0; i < responses.length; i++) {
        var res = recordSurveyResponse(responses[i]);
        results.push(res);
      }
      return createJsonResponse({
        success: true,
        syncedCount: results.length,
        results: results,
      });
    }

    // Action 3: Save Survey Definition
    if (action === 'createSurvey') {
      const surveyResult = saveSurveyDefinition(payload.survey, payload.questions);
      return createJsonResponse(surveyResult);
    }

    return createJsonResponse({
      success: false,
      error: 'Unsupported POST action: ' + action,
    });
  } catch (err) {
    return createJsonResponse({
      success: false,
      error: 'Server Exception: ' + err.toString(),
    });
  }
}

/**
 * Save Base64 Photo to Google Drive in "FieldSurvey Uploads" folder.
 * Returns public shareable URL.
 */
function saveBase64ImageToDrive(base64Data, fileName) {
  try {
    var parts = base64Data.split(',');
    var contentType = 'image/jpeg';
    var rawBase64 = parts[0];
    if (parts.length > 1) {
      var match = parts[0].match(/:(.*?);/);
      if (match) contentType = match[1];
      rawBase64 = parts[1];
    }

    var decoded = Utilities.base64Decode(rawBase64);
    var blob = Utilities.newBlob(decoded, contentType, fileName);

    var folderName = 'FieldSurvey Uploads';
    var folders = DriveApp.getFoldersByName(folderName);
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);

    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (err) {
    Logger.log('Drive upload notice: ' + err.toString());
    return null;
  }
}

/**
 * Record a survey response with IDEMPOTENCY check (UUID deduplication).
 */
function recordSurveyResponse(response) {
  if (!response || !response.id) {
    return {
      success: false,
      error: 'Missing required response payload or unique responseId (UUID)',
    };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const respSheet = ss.getSheetByName(SHEET_NAMES.RESPONSES);
  const responseId = String(response.id).trim();

  // 1. IDEMPOTENCY CHECK: Search existing responseId column (Column A)
  const lastRow = respSheet.getLastRow();
  if (lastRow > 1) {
    const existingIds = respSheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var r = 0; r < existingIds.length; r++) {
      if (String(existingIds[r][0]).trim() === responseId) {
        // Already recorded! Return success without duplicate row insertion
        return {
          success: true,
          duplicate: true,
          responseId: responseId,
          syncedAt: new Date().toISOString(),
          message: 'Response already recorded (idempotent)',
        };
      }
    }
  }

  // 2. Prepare row values & Process Photos for Google Drive / Sheets
  const nowStr = new Date().toISOString();
  const rawAnswers = response.answers || {};
  const processedAnswers = {};
  const photoUrls = [];
  const summaryParts = [];

  for (const k in rawAnswers) {
    const val = rawAnswers[k];
    if (typeof val === 'string' && val.indexOf('data:image') === 0) {
      // Photo detected: save to Google Drive folder "FieldSurvey Uploads"
      const driveUrl = saveBase64ImageToDrive(val, responseId + '_' + k + '.jpg');
      if (driveUrl) {
        processedAnswers[k] = driveUrl;
        photoUrls.push(driveUrl);
        summaryParts.push(k + ': [Drive Photo: ' + driveUrl + ']');
      } else {
        // Fallback label to guarantee cell character limit < 50000
        const photoLabel = '[Photo: ' + Math.round(val.length / 1024) + ' KB image captured]';
        processedAnswers[k] = photoLabel;
        summaryParts.push(k + ': ' + photoLabel);
      }
    } else {
      processedAnswers[k] = val;
      summaryParts.push(k + ': ' + JSON.stringify(val));
    }
  }

  const answersJson = JSON.stringify(processedAnswers);
  const summaryText = summaryParts.join(' | ');
  const photoUrlsText = photoUrls.join(', ');

  // Append new row
  respSheet.appendRow([
    responseId,
    response.surveyId || '',
    response.createdAt || nowStr,
    nowStr, // remote received timestamp
    nowStr, // syncedAt
    answersJson,
    summaryText,
    photoUrlsText
  ]);

  return {
    success: true,
    duplicate: false,
    responseId: responseId,
    syncedAt: nowStr,
    message: 'Successfully written to Google Sheets',
  };
}

/**
 * Save survey definition to Surveys and Questions sheets
 */
function saveSurveyDefinition(survey, questions) {
  if (!survey || !survey.id) {
    return { success: false, error: 'Missing survey definition' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const surveySheet = ss.getSheetByName(SHEET_NAMES.SURVEYS);
  const qSheet = ss.getSheetByName(SHEET_NAMES.QUESTIONS);

  const nowStr = new Date().toISOString();

  // Append or update survey
  surveySheet.appendRow([
    survey.id,
    survey.title || '',
    survey.description || '',
    survey.topic || '',
    survey.status || 'active',
    survey.createdAt || nowStr,
    nowStr,
  ]);

  // Append questions
  if (questions && questions.length > 0) {
    for (var i = 0; i < questions.length; i++) {
      var q = questions[i];
      qSheet.appendRow([
        q.id || ('q-' + (i + 1)),
        survey.id,
        q.order || (i + 1),
        q.question || '',
        q.type || 'shortText',
        q.required ? 'YES' : 'NO',
        q.options ? JSON.stringify(q.options) : ''
      ]);
    }
  }

  return {
    success: true,
    surveyId: survey.id,
    message: 'Survey registered in Google Sheets',
  };
}

/**
 * Fetch all surveys stored in the sheet
 */
function fetchAllSurveys() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.SURVEYS);
  if (!sheet) return [];

  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  const list = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    list.push({
      id: r[0],
      title: r[1],
      description: r[2],
      topic: r[3],
      status: r[4],
      createdAt: r[5],
      updatedAt: r[6],
    });
  }
  return list;
}

/**
 * Auto-initialize sheets and column headers if they do not exist
 */
function initDatabaseIfMissing() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Surveys Sheet
  let sSheet = ss.getSheetByName(SHEET_NAMES.SURVEYS);
  if (!sSheet) {
    sSheet = ss.insertSheet(SHEET_NAMES.SURVEYS);
    sSheet.appendRow(['surveyId', 'title', 'description', 'topic', 'status', 'createdAt', 'updatedAt']);
    formatHeaderRow(sSheet);
  }

  // 2. Questions Sheet
  let qSheet = ss.getSheetByName(SHEET_NAMES.QUESTIONS);
  if (!qSheet) {
    qSheet = ss.insertSheet(SHEET_NAMES.QUESTIONS);
    qSheet.appendRow(['questionId', 'surveyId', 'order', 'question', 'type', 'required', 'options']);
    formatHeaderRow(qSheet);
  }

  // 3. Responses Sheet
  let rSheet = ss.getSheetByName(SHEET_NAMES.RESPONSES);
  if (!rSheet) {
    rSheet = ss.insertSheet(SHEET_NAMES.RESPONSES);
    rSheet.appendRow(['responseId', 'surveyId', 'createdAt', 'receivedAt', 'syncedAt', 'answersJson', 'summaryAnswers', 'photoUrls']);
    formatHeaderRow(rSheet);
  }
}

/**
 * Apply styling to header row
 */
function formatHeaderRow(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  headerRange.setBackground('#0f766e');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  sheet.setFrozenRows(1);
}

/**
 * Format standard JSON response with CORS compatibility
 */
function createJsonResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
