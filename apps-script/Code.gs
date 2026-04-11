const STUDENTS_SHEET_NAME = 'students';
const BRANCHES_SHEET_NAME = 'branches';
const MOCK_SCORES_SHEET_NAME = 'mock_scores';
const PHYSICAL_RECORDS_SHEET_NAME = 'physical_records';

function doGet(e) {
  try {
    const action = stringValue_(e && e.parameter ? e.parameter.action : '');

    if (action === 'listBranches') {
      return jsonOutput_(listBranches_());
    }

    if (action === 'listStudents' || action === 'list') {
      return jsonOutput_(listStudents_());
    }

    return jsonOutput_(failResponse_('Unsupported GET action', 400));
  } catch (error) {
    return jsonOutput_(failResponse_(error && error.message ? error.message : String(error), 500));
  }
}

function doPost(e) {
  try {
    const body = parseRequestBody_(e);
    const action = resolveRequestAction_(body, e);
    const payload = resolveRequestPayload_(body);

    if (action === 'saveStudent') {
      return jsonOutput_(saveStudent_(payload));
    }

    if (action === 'saveBranch') {
      return jsonOutput_(saveBranch_(payload));
    }

    if (action === 'deleteBranch') {
      return jsonOutput_(deleteBranch_(payload));
    }

    if (action === 'saveMockScore') {
      return jsonOutput_(_saveMockScore_(payload));
    }

    if (action === 'savePhysicalRecord') {
      return jsonOutput_(_savePhysicalRecord_(payload));
    }

    if (action === 'delete') {
      return jsonOutput_(failResponse_('Delete action is not implemented in this file.', 400));
    }

    return jsonOutput_(failResponse_('Unsupported POST action', 400));
  } catch (error) {
    return jsonOutput_(failResponse_(error && error.message ? error.message : String(error), 500));
  }
}

function listBranches_() {
  const sheet = getSheet_(BRANCHES_SHEET_NAME);
  const values = getSheetValues_(sheet);

  if (values.length === 0) {
    return {
      ok: true,
      success: true,
      branches: [],
    };
  }

  const headers = values[0].map(stringValue_);
  const rows = [];

  for (var index = 1; index < values.length; index += 1) {
    const rowObject = objectFromRowValues_(headers, values[index]);

    if (!isValidBranchObject_(rowObject)) {
      continue;
    }

    rows.push(rowObject);
  }

  return {
    ok: true,
    success: true,
    branches: rows,
  };
}

function saveBranch_(inputRow) {
  const row = normalizeRowObject_(inputRow);
  const branchName = stringValue_(row.branch_name);

  if (!branchName) {
    return failResponse_('branch_name is required.', 400, {
      action: 'saveBranch',
      mode: 'rejected',
      rowIndex: null,
    });
  }

  const sheet = getSheet_(BRANCHES_SHEET_NAME);
  const values = getSheetValues_(sheet);

  if (values.length === 0) {
    return failResponse_('branches sheet is empty.', 500, {
      action: 'saveBranch',
      mode: 'rejected',
      rowIndex: null,
    });
  }

  const headers = values[0].map(stringValue_);
  const headerMap = buildHeaderMap_(headers);

  if (headerMap.branch_id === undefined) {
    return failResponse_('Missing required header: branch_id', 500, {
      action: 'saveBranch',
      mode: 'rejected',
      rowIndex: null,
    });
  }

  if (headerMap.branch_name === undefined) {
    return failResponse_('Missing required header: branch_name', 500, {
      action: 'saveBranch',
      mode: 'rejected',
      rowIndex: null,
    });
  }

  const requestedBranchId = stringValue_(row.branch_id);
  const foundRowIndex = requestedBranchId
    ? findRowIndexByValue_(values, headerMap.branch_id, requestedBranchId)
    : 0;
  const duplicateNameRowIndex = findBranchRowIndexByName_(values, headerMap.branch_name, branchName, foundRowIndex);

  if (duplicateNameRowIndex > 0) {
    return failResponse_('Duplicate branch_name is not allowed.', 400, {
      action: 'saveBranch',
      mode: foundRowIndex > 1 ? 'update' : 'insert',
      rowIndex: duplicateNameRowIndex,
    });
  }

  const mode = foundRowIndex > 1 ? 'update' : 'insert';
  const now = new Date().toISOString();
  const existingRowValues = foundRowIndex > 1 ? values[foundRowIndex - 1] : null;
  const existingBranchId = existingRowValues && headerMap.branch_id !== undefined
    ? stringValue_(existingRowValues[headerMap.branch_id])
    : '';
  const existingBranchCode = existingRowValues && headerMap.branch_code !== undefined
    ? stringValue_(existingRowValues[headerMap.branch_code])
    : '';
  const existingStatus = existingRowValues && headerMap.status !== undefined
    ? stringValue_(existingRowValues[headerMap.status])
    : '';
  const existingCreatedAt = existingRowValues && headerMap.created_at !== undefined
    ? stringValue_(existingRowValues[headerMap.created_at])
    : '';

  row.branch_id = requestedBranchId || existingBranchId || generateNextBranchId_(values, headerMap.branch_id);
  row.branch_name = branchName;
  row.branch_code = stringValue_(row.branch_code) || existingBranchCode || generateUniqueBranchCode_(values, headerMap.branch_code, branchName, foundRowIndex);
  row.status = stringValue_(row.status) || existingStatus || 'active';
  row.created_at = existingCreatedAt || stringValue_(row.created_at) || now;
  row.updated_at = stringValue_(row.updated_at) || now;

  if (mode === 'update') {
    const updatedRowValues = buildUpdatedRowValues_(headers, existingRowValues, row);

    sheet.getRange(foundRowIndex, 1, 1, headers.length).setValues([updatedRowValues]);

    return {
      ok: true,
      success: true,
      action: 'saveBranch',
      mode: 'update',
      rowIndex: foundRowIndex,
      data: objectFromRowValues_(headers, updatedRowValues),
      branch: objectFromRowValues_(headers, updatedRowValues),
    };
  }

  const insertedRowValues = buildInsertedRowValues_(headers, row);
  sheet.appendRow(insertedRowValues);
  const insertedRowIndex = sheet.getLastRow();

  return {
    ok: true,
    success: true,
    action: 'saveBranch',
    mode: 'insert',
    rowIndex: insertedRowIndex,
    data: objectFromRowValues_(headers, insertedRowValues),
    branch: objectFromRowValues_(headers, insertedRowValues),
  };
}

function deleteBranch_(inputRow) {
  const row = normalizeRowObject_(inputRow);
  const branchId = stringValue_(row.branch_id);

  if (!branchId) {
    return failResponse_('branch_id is required.', 400, {
      action: 'deleteBranch',
      mode: 'rejected',
      rowIndex: null,
    });
  }

  const sheet = getSheet_(BRANCHES_SHEET_NAME);
  const values = getSheetValues_(sheet);

  if (values.length === 0) {
    return failResponse_('branches sheet is empty.', 500, {
      action: 'deleteBranch',
      mode: 'rejected',
      rowIndex: null,
    });
  }

  const headers = values[0].map(stringValue_);
  const headerMap = buildHeaderMap_(headers);

  if (headerMap.branch_id === undefined) {
    return failResponse_('Missing required header: branch_id', 500, {
      action: 'deleteBranch',
      mode: 'rejected',
      rowIndex: null,
    });
  }

  const foundRowIndex = findRowIndexByValue_(values, headerMap.branch_id, branchId);

  if (foundRowIndex <= 1) {
    return failResponse_('Branch not found.', 404, {
      action: 'deleteBranch',
      mode: 'rejected',
      rowIndex: null,
    });
  }

  const deletedData = objectFromRowValues_(headers, values[foundRowIndex - 1]);
  sheet.deleteRow(foundRowIndex);

  return {
    ok: true,
    success: true,
    action: 'deleteBranch',
    mode: 'delete',
    rowIndex: foundRowIndex,
    data: deletedData,
  };
}

function saveStudent_(inputRow) {
  const row = normalizeRowObject_(inputRow);
  const studentId = stringValue_(row.student_id);
  const name = stringValue_(row.name);
  const branchId = stringValue_(row.branch_id);

  if (!studentId) {
    return failResponse_('student_id is required.', 400, { mode: 'rejected', rowIndex: null });
  }

  if (!name) {
    return failResponse_('name is required.', 400, { mode: 'rejected', rowIndex: null });
  }

  if (!branchId) {
    return failResponse_('branch_id is required.', 400, { mode: 'rejected', rowIndex: null });
  }

  const sheet = getSheet_(STUDENTS_SHEET_NAME);
  const values = getSheetValues_(sheet);

  if (values.length === 0) {
    return failResponse_('students sheet is empty.', 500, { mode: 'rejected', rowIndex: null });
  }

  const headers = values[0].map(stringValue_);
  const headerMap = buildHeaderMap_(headers);
  const requiredHeaders = ['student_id', 'name', 'branch_id'];

  for (var i = 0; i < requiredHeaders.length; i += 1) {
    if (headerMap[requiredHeaders[i]] === undefined) {
      return failResponse_('Missing required header: ' + requiredHeaders[i], 500, { mode: 'rejected', rowIndex: null });
    }
  }

  const foundRowIndex = findRowIndexByStudentId_(values, headerMap.student_id, studentId);
  const mode = foundRowIndex > 1 ? 'update' : 'insert';

  if (mode === 'update') {
    const existingRowValues = values[foundRowIndex - 1];
    const updatedRowValues = buildUpdatedRowValues_(headers, existingRowValues, row);

    if (!isCompleteStudentRow_(headers, updatedRowValues)) {
      return failResponse_('Refusing to update with incomplete student data.', 400, {
        mode: mode,
        rowIndex: foundRowIndex,
      });
    }

    sheet.getRange(foundRowIndex, 1, 1, headers.length).setValues([updatedRowValues]);

    return {
      ok: true,
      success: true,
      mode: mode,
      rowIndex: foundRowIndex,
      data: objectFromRowValues_(headers, updatedRowValues),
      message: 'Student updated successfully.',
    };
  }

  const insertedRowValues = buildInsertedRowValues_(headers, row);

  if (!isCompleteStudentRow_(headers, insertedRowValues)) {
    return failResponse_('Refusing to append incomplete student data.', 400, {
      mode: mode,
      rowIndex: null,
    });
  }

  sheet.appendRow(insertedRowValues);
  const insertedRowIndex = sheet.getLastRow();

  return {
    ok: true,
    success: true,
    mode: mode,
    rowIndex: insertedRowIndex,
    data: objectFromRowValues_(headers, insertedRowValues),
    message: 'Student inserted successfully.',
  };
}

function listStudents_() {
  const sheet = getSheet_(STUDENTS_SHEET_NAME);
  const values = getSheetValues_(sheet);

  if (values.length === 0) {
    return {
      ok: true,
      success: true,
      students: [],
    };
  }

  const headers = values[0].map(stringValue_);
  const rows = [];

  for (var index = 1; index < values.length; index += 1) {
    const rowObject = objectFromRowValues_(headers, values[index]);

    if (!isValidStudentObject_(rowObject)) {
      continue;
    }

    rows.push(rowObject);
  }

  return {
    ok: true,
    success: true,
    students: rows,
  };
}

function _saveMockScore_(inputRow) {
  const row = normalizeRowObject_(inputRow);
  const studentId = stringValue_(row.student_id);
  const examId = stringValue_(row.exam_id);

  if (!studentId) {
    return failResponse_('student_id is required.', 400, { mode: 'rejected', rowIndex: null });
  }

  if (!examId) {
    return failResponse_('exam_id is required.', 400, { mode: 'rejected', rowIndex: null });
  }

  return upsertSheetRowByKeys_({
    sheetName: MOCK_SCORES_SHEET_NAME,
    row: row,
    keyFields: ['student_id', 'exam_id'],
    responseLabel: 'Mock score',
  });
}

function _savePhysicalRecord_(inputRow) {
  const row = normalizeRowObject_(inputRow);
  const studentId = stringValue_(row.student_id);
  const testId = stringValue_(row.test_id);

  if (!studentId) {
    return failResponse_('student_id is required.', 400, { mode: 'rejected', rowIndex: null });
  }

  if (!testId) {
    return failResponse_('test_id is required.', 400, { mode: 'rejected', rowIndex: null });
  }

  return upsertSheetRowByKeys_({
    sheetName: PHYSICAL_RECORDS_SHEET_NAME,
    row: row,
    keyFields: ['student_id', 'test_id'],
    responseLabel: 'Physical record',
  });
}

function parseRequestBody_(e) {
  try {
    const rawBody = e && e.postData ? e.postData.contents : '{}';

    if (!rawBody || !String(rawBody).trim()) {
      return {};
    }

    return JSON.parse(rawBody);
  } catch (error) {
    return {};
  }
}

function resolveRequestAction_(body, e) {
  const directAction = body && typeof body === 'object' ? stringValue_(body.action) : '';

  if (directAction) {
    return directAction;
  }

  const dataAction = body && typeof body === 'object' && body.data && typeof body.data === 'object'
    ? stringValue_(body.data.action)
    : '';

  if (dataAction) {
    return dataAction;
  }

  const rowAction = body && typeof body === 'object' && body.row && typeof body.row === 'object'
    ? stringValue_(body.row.action)
    : '';

  if (rowAction) {
    return rowAction;
  }

  const parameterAction = e && e.parameter ? stringValue_(e.parameter.action) : '';

  return parameterAction;
}

function resolveRequestPayload_(body) {
  if (!body || typeof body !== 'object') {
    return {};
  }

  if (body.row && typeof body.row === 'object') {
    return body.row;
  }

  if (body.data && typeof body.data === 'object' && !Array.isArray(body.data)) {
    return body.data;
  }

  return body;
}

function getSheet_(sheetName) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    throw new Error('Sheet not found: ' + sheetName);
  }

  return sheet;
}

function getSheetValues_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  if (!lastRow || !lastColumn) {
    return [];
  }

  return sheet.getRange(1, 1, lastRow, lastColumn).getValues();
}

function upsertSheetRowByKeys_(options) {
  const sheetName = options.sheetName;
  const row = normalizeRowObject_(options.row);
  const keyFields = options.keyFields || [];
  const responseLabel = options.responseLabel || 'Row';
  const sheet = getSheet_(sheetName);
  const values = getSheetValues_(sheet);

  if (values.length === 0) {
    return failResponse_(sheetName + ' sheet is empty.', 500, { mode: 'rejected', rowIndex: null });
  }

  const headers = values[0].map(stringValue_);
  const headerMap = buildHeaderMap_(headers);

  for (var keyIndex = 0; keyIndex < keyFields.length; keyIndex += 1) {
    if (headerMap[keyFields[keyIndex]] === undefined) {
      return failResponse_('Missing required header: ' + keyFields[keyIndex], 500, {
        mode: 'rejected',
        rowIndex: null,
      });
    }
  }

  const foundRowIndex = findRowIndexByCompositeKeys_(values, headerMap, keyFields, row);
  const mode = foundRowIndex > 1 ? 'update' : 'insert';

  if (mode === 'update') {
    const existingRowValues = values[foundRowIndex - 1];
    const updatedRowValues = buildUpdatedRowValues_(headers, existingRowValues, row);

    sheet.getRange(foundRowIndex, 1, 1, headers.length).setValues([updatedRowValues]);

    return {
      ok: true,
      success: true,
      mode: mode,
      rowIndex: foundRowIndex,
      data: objectFromRowValues_(headers, updatedRowValues),
      message: responseLabel + ' updated successfully.',
    };
  }

  const insertedRowValues = buildInsertedRowValues_(headers, row);
  sheet.appendRow(insertedRowValues);
  const insertedRowIndex = sheet.getLastRow();

  return {
    ok: true,
    success: true,
    mode: mode,
    rowIndex: insertedRowIndex,
    data: objectFromRowValues_(headers, insertedRowValues),
    message: responseLabel + ' inserted successfully.',
  };
}

function buildHeaderMap_(headers) {
  const map = {};

  for (var index = 0; index < headers.length; index += 1) {
    map[stringValue_(headers[index])] = index;
  }

  return map;
}

function findRowIndexByStudentId_(values, studentIdColumnIndex, studentId) {
  return findRowIndexByValue_(values, studentIdColumnIndex, studentId);
}

function findRowIndexByValue_(values, columnIndex, targetValue) {
  for (var index = 1; index < values.length; index += 1) {
    if (stringValue_(values[index][columnIndex]) === stringValue_(targetValue)) {
      return index + 1;
    }
  }

  return 0;
}

function findRowIndexByCompositeKeys_(values, headerMap, keyFields, row) {
  for (var index = 1; index < values.length; index += 1) {
    var isMatch = true;

    for (var keyIndex = 0; keyIndex < keyFields.length; keyIndex += 1) {
      var keyField = keyFields[keyIndex];
      var cellValue = stringValue_(values[index][headerMap[keyField]]);
      var targetValue = stringValue_(row[keyField]);

      if (cellValue !== targetValue) {
        isMatch = false;
        break;
      }
    }

    if (isMatch) {
      return index + 1;
    }
  }

  return 0;
}

function findBranchRowIndexByName_(values, branchNameColumnIndex, branchName, skipRowIndex) {
  const target = normalizeCompareText_(branchName);

  for (var index = 1; index < values.length; index += 1) {
    if (skipRowIndex && index + 1 === skipRowIndex) {
      continue;
    }

    if (normalizeCompareText_(values[index][branchNameColumnIndex]) === target) {
      return index + 1;
    }
  }

  return 0;
}

function generateNextBranchId_(values, branchIdColumnIndex) {
  var maxValue = 0;

  for (var index = 1; index < values.length; index += 1) {
    var match = stringValue_(values[index][branchIdColumnIndex]).match(/^BR(\d+)$/i);

    if (!match) {
      continue;
    }

    var numericValue = Number(match[1]);

    if (numericValue > maxValue) {
      maxValue = numericValue;
    }
  }

  return 'BR' + String(maxValue + 1).padStart(3, '0');
}

function generateUniqueBranchCode_(values, branchCodeColumnIndex, branchName, skipRowIndex) {
  const baseCode = generateBranchCodeBase_(branchName);

  if (branchCodeColumnIndex === undefined) {
    return baseCode;
  }

  const usedCodes = {};

  for (var index = 1; index < values.length; index += 1) {
    if (skipRowIndex && index + 1 === skipRowIndex) {
      continue;
    }

    const code = stringValue_(values[index][branchCodeColumnIndex]).toLowerCase();

    if (code) {
      usedCodes[code] = true;
    }
  }

  var candidate = baseCode;
  var suffix = 2;

  while (usedCodes[candidate]) {
    candidate = baseCode + '-' + suffix;
    suffix += 1;
  }

  return candidate;
}

function generateBranchCodeBase_(branchName) {
  const romanized = romanizeBranchName_(branchName);

  if (romanized) {
    return romanized.slice(0, 3);
  }

  return 'BRN';
}

function romanizeBranchName_(branchName) {
  return String(branchName == null ? '' : branchName)
    .split('')
    .map(function(character) {
      return romanizeHangulCharacter_(character);
    })
    .join('')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .toUpperCase();
}

function romanizeHangulCharacter_(character) {
  const codePoint = character && character.charCodeAt ? character.charCodeAt(0) : 0;
  const hangulBase = 44032;
  const hangulLast = 55203;
  const initials = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
  const vowels = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
  const finals = ['', 'k', 'k', 'ks', 'n', 'nj', 'nh', 't', 'l', 'lk', 'lm', 'lb', 'ls', 'lt', 'lp', 'lh', 'm', 'p', 'ps', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 'h'];

  if (codePoint < hangulBase || codePoint > hangulLast) {
    return character;
  }

  const syllableIndex = codePoint - hangulBase;
  const initialIndex = Math.floor(syllableIndex / (21 * 28));
  const vowelIndex = Math.floor((syllableIndex % (21 * 28)) / 28);
  const finalIndex = syllableIndex % 28;

  return initials[initialIndex] + vowels[vowelIndex] + finals[finalIndex];
}

function buildUpdatedRowValues_(headers, existingRowValues, inputRow) {
  const nextRowValues = existingRowValues.slice();
  const inputUpdatedAt = stringValue_(inputRow.updated_at) || new Date().toISOString();

  for (var index = 0; index < headers.length; index += 1) {
    const header = stringValue_(headers[index]);

    if (!header) {
      continue;
    }

    if (header === 'created_at') {
      nextRowValues[index] = stringValue_(existingRowValues[index]) || stringValue_(inputRow.created_at) || inputUpdatedAt;
      continue;
    }

    if (header === 'updated_at') {
      nextRowValues[index] = inputUpdatedAt;
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(inputRow, header)) {
      nextRowValues[index] = stringValue_(inputRow[header]);
    }
  }

  return nextRowValues;
}

function buildInsertedRowValues_(headers, inputRow) {
  const now = stringValue_(inputRow.updated_at) || new Date().toISOString();
  const nextRowValues = [];

  for (var index = 0; index < headers.length; index += 1) {
    const header = stringValue_(headers[index]);

    if (!header) {
      nextRowValues.push('');
      continue;
    }

    if (header === 'created_at') {
      nextRowValues.push(stringValue_(inputRow.created_at) || now);
      continue;
    }

    if (header === 'updated_at') {
      nextRowValues.push(now);
      continue;
    }

    nextRowValues.push(stringValue_(inputRow[header]));
  }

  return nextRowValues;
}

function objectFromRowValues_(headers, rowValues) {
  const rowObject = {};

  for (var index = 0; index < headers.length; index += 1) {
    const header = stringValue_(headers[index]);

    if (!header) {
      continue;
    }

    rowObject[header] = stringValue_(rowValues[index]);
  }

  return rowObject;
}

function isCompleteStudentRow_(headers, rowValues) {
  const rowObject = objectFromRowValues_(headers, rowValues);
  return isValidStudentObject_(rowObject);
}

function isValidStudentObject_(rowObject) {
  return Boolean(stringValue_(rowObject.student_id) && stringValue_(rowObject.name));
}

function isValidBranchObject_(rowObject) {
  return Boolean(stringValue_(rowObject.branch_id) && stringValue_(rowObject.branch_name));
}

function normalizeRowObject_(row) {
  const nextRow = {};
  const source = row && typeof row === 'object' ? row : {};

  Object.keys(source).forEach(function(key) {
    nextRow[key] = stringValue_(source[key]);
  });

  return nextRow;
}

function buildCompositeKeyLog_(keyFields, row) {
  return keyFields.map(function(keyField) {
    return keyField + '=' + stringValue_(row[keyField]);
  }).join(', ');
}

function normalizeCompareText_(value) {
  return stringValue_(value).toLowerCase().replace(/\s+/g, ' ');
}

function stringValue_(value) {
  return String(value == null ? '' : value).trim();
}

function failResponse_(message, statusCode, details) {
  const response = {
    ok: false,
    success: false,
    error: message,
    statusCode: statusCode || 500,
  };

  if (details) {
    Object.keys(details).forEach(function(key) {
      response[key] = details[key];
    });
  }

  return response;
}

function jsonOutput_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}