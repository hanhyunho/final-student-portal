const STUDENTS_SHEET_NAME = 'students';
const ACCOUNTS_SHEET_NAME = 'accounts';
const BRANCHES_SHEET_NAME = 'branches';
const MOCK_SCORES_SHEET_NAME = 'mock_scores';
const PHYSICAL_RECORDS_SHEET_NAME = 'physical_records';
const CONSULT_SHEET_NAME = '상담기록';

function doGet(e) {
  try {
    const action = stringValue_(e && e.parameter ? e.parameter.action : '');

    if (action === 'listBranches') {
      return jsonOutput_(listBranches_());
    }

    if (action === 'listStudents' || action === 'list') {
      return jsonOutput_(listStudents_());
    }

    if (action === 'getConsultRecord') {
      var studentId = stringValue_(e && e.parameter ? e.parameter.student_id : '');
      var all = stringValue_(e && e.parameter ? e.parameter.all : '');
      if (all === 'true') {
        return jsonOutput_(getAllConsultRecords_(studentId));
      }
      var consultType = stringValue_(e && e.parameter ? e.parameter.consult_type : '');
      return jsonOutput_(getConsultRecord_(studentId, consultType));
    }

    if (action === 'getConsultSummary') {
      var studentIdsParam = stringValue_(e && e.parameter ? e.parameter.student_ids : '');
      return jsonOutput_(getConsultSummary_(studentIdsParam));
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

    if (action === 'saveAccountStatus') {
      return jsonOutput_(saveAccountStatus_(payload));
    }

    if (action === 'saveBranch') {
      return jsonOutput_(saveBranch_(payload));
    }

    if (action === 'deleteBranch') {
      return jsonOutput_(deleteBranch_(payload));
    }

    if (action === 'deleteStudent') {
      return jsonOutput_(deleteStudent_(payload));
    }

    if (action === 'saveMockScore') {
      return jsonOutput_(_saveMockScore_(payload));
    }

    if (action === 'savePhysicalRecord') {
      return jsonOutput_(_savePhysicalRecord_(payload));
    }

    if (action === 'saveConsultRecord') {
      return jsonOutput_(saveConsultRecord_(payload));
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
  const requestedLoginStatus = normalizeLoginStatusValue_(row.login_status || row.is_active);

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
    const savedStudentRow = objectFromRowValues_(headers, updatedRowValues);
    const accountResult = upsertStudentAccount_(savedStudentRow, requestedLoginStatus);

    if (accountResult.success !== true && accountResult.ok !== true) {
      return accountResult;
    }

    savedStudentRow.login_status = accountResult.login_status || requestedLoginStatus;

    return {
      ok: true,
      success: true,
      mode: mode,
      rowIndex: foundRowIndex,
      data: savedStudentRow,
      account: accountResult.data,
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
  const savedStudentRow = objectFromRowValues_(headers, insertedRowValues);
  const accountResult = upsertStudentAccount_(savedStudentRow, requestedLoginStatus);

  if (accountResult.success !== true && accountResult.ok !== true) {
    return accountResult;
  }

  savedStudentRow.login_status = accountResult.login_status || requestedLoginStatus;

  return {
    ok: true,
    success: true,
    mode: mode,
    rowIndex: insertedRowIndex,
    data: savedStudentRow,
    account: accountResult.data,
    message: 'Student inserted successfully.',
  };
}

function deleteRowsByStudentId_(sheetName, studentId) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    return 0;
  }

  const values = getSheetValues_(sheet);

  if (values.length === 0) {
    return 0;
  }

  const headers = values[0].map(stringValue_);
  const headerMap = buildHeaderMap_(headers);
  const studentIdColumnIndex = headerMap.student_id;

  if (studentIdColumnIndex === undefined) {
    return 0;
  }

  const rowIndexes = [];

  for (var index = 1; index < values.length; index += 1) {
    if (stringValue_(values[index][studentIdColumnIndex]) === stringValue_(studentId)) {
      rowIndexes.push(index + 1);
    }
  }

  for (var deleteIndex = rowIndexes.length - 1; deleteIndex >= 0; deleteIndex -= 1) {
    sheet.deleteRow(rowIndexes[deleteIndex]);
  }

  return rowIndexes.length;
}

function deleteStudent_(inputRow) {
  const row = normalizeRowObject_(inputRow);
  const studentId = stringValue_(row.student_id);

  if (!studentId) {
    return failResponse_('student_id is required.', 400, {
      action: 'deleteStudent',
      mode: 'rejected',
      rowIndex: null,
    });
  }

  const sheet = getSheet_(STUDENTS_SHEET_NAME);
  const values = getSheetValues_(sheet);

  if (values.length === 0) {
    return failResponse_('students sheet is empty.', 500, {
      action: 'deleteStudent',
      mode: 'rejected',
      rowIndex: null,
    });
  }

  const headers = values[0].map(stringValue_);
  const headerMap = buildHeaderMap_(headers);

  if (headerMap.student_id === undefined) {
    return failResponse_('Missing required header: student_id', 500, {
      action: 'deleteStudent',
      mode: 'rejected',
      rowIndex: null,
    });
  }

  const foundRowIndex = findRowIndexByStudentId_(values, headerMap.student_id, studentId);

  if (foundRowIndex <= 1) {
    return failResponse_('Student not found.', 404, {
      action: 'deleteStudent',
      mode: 'rejected',
      rowIndex: null,
    });
  }

  const deletedData = objectFromRowValues_(headers, values[foundRowIndex - 1]);
  sheet.deleteRow(foundRowIndex);

  const deletedRelated = {
    accounts: deleteRowsByStudentId_(ACCOUNTS_SHEET_NAME, studentId),
    mock_scores: deleteRowsByStudentId_(MOCK_SCORES_SHEET_NAME, studentId),
    physical_records: deleteRowsByStudentId_(PHYSICAL_RECORDS_SHEET_NAME, studentId),
    consult_records: deleteRowsByStudentId_(CONSULT_SHEET_NAME, studentId),
  };

  return {
    ok: true,
    success: true,
    action: 'deleteStudent',
    mode: 'delete',
    rowIndex: foundRowIndex,
    data: deletedData,
    deletedRelated: deletedRelated,
    message: 'Student deleted successfully.',
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
  const accountLookup = buildStudentAccountLookup_();
  const rows = [];

  for (var index = 1; index < values.length; index += 1) {
    const rowObject = objectFromRowValues_(headers, values[index]);

    if (!isValidStudentObject_(rowObject)) {
      continue;
    }

    rowObject.login_status = resolveStudentLoginStatus_(accountLookup, rowObject.student_id);
    rows.push(rowObject);
  }

  return {
    ok: true,
    success: true,
    students: rows,
  };
}

var EXAM_GROUP_PATTERNS_ = [
  { group: 'march',     pattern: /^(3모|3월|3mo|03mo|3-m|3_mock|EXAM\d{4}03)$/i },
  { group: 'june',      pattern: /^(6모|6월|6mo|06mo|6-m|6_mock|EXAM\d{4}06)$/i },
  { group: 'september', pattern: /^(9모|9월|9mo|09mo|9-m|9_mock|EXAM\d{4}09)$/i },
  { group: 'csat',      pattern: /^(수능|suneung|sunung|csat|EXAM\d{4}11)$/i },
];

function resolveExamGroup_(examId) {
  var normalized = String(examId || '').trim();
  for (var i = 0; i < EXAM_GROUP_PATTERNS_.length; i++) {
    if (EXAM_GROUP_PATTERNS_[i].pattern.test(normalized)) {
      return EXAM_GROUP_PATTERNS_[i].group;
    }
  }
  return null;
}

function generateNextScoreId_(values, scoreIdColumnIndex) {
  var maxValue = 0;
  for (var index = 1; index < values.length; index += 1) {
    var match = stringValue_(values[index][scoreIdColumnIndex]).match(/^SCR(\d+)$/i);
    if (!match) continue;
    var numericValue = Number(match[1]);
    if (numericValue > maxValue) maxValue = numericValue;
  }
  return 'SCR' + String(maxValue + 1).padStart(6, '0');
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

  const sheet = getSheet_(MOCK_SCORES_SHEET_NAME);
  const values = getSheetValues_(sheet);

  if (values.length === 0) {
    return failResponse_(MOCK_SCORES_SHEET_NAME + ' sheet is empty.', 500, { mode: 'rejected', rowIndex: null });
  }

  const headers = values[0].map(stringValue_);
  const headerMap = buildHeaderMap_(headers);

  if (headerMap.student_id === undefined || headerMap.exam_id === undefined) {
    return failResponse_('Missing required header: student_id or exam_id', 500, { mode: 'rejected', rowIndex: null });
  }

  // exam_id 그룹 매칭: "3mo"와 "EXAM202503"을 같은 시험으로 인식
  var incomingGroup = resolveExamGroup_(examId);
  var resolvedExamId = examId;
  var foundRowIndex = 0;

  for (var index = 1; index < values.length; index += 1) {
    var rowStudentId = stringValue_(values[index][headerMap.student_id]);
    var rowExamId = stringValue_(values[index][headerMap.exam_id]);

    if (rowStudentId !== studentId) continue;
    if (rowExamId === examId) {
      foundRowIndex = index + 1;
      resolvedExamId = rowExamId;
      break;
    }
    if (incomingGroup !== null && resolveExamGroup_(rowExamId) === incomingGroup) {
      foundRowIndex = index + 1;
      resolvedExamId = rowExamId;
      break;
    }
  }

  // Use incoming examId directly — already the correct sheet format (e.g. "EXAM202511").
  // This also overwrites stale display labels ("3모", "수능", "suneung") in existing rows.
  row.exam_id = examId;

  // Fix score_id: always ensure a valid SCR format ID is stored.
  if (headerMap.score_id !== undefined) {
    var incomingScoreIdVal = stringValue_(row.score_id);
    var isValidScrId = /^SCR\d+$/i.test(incomingScoreIdVal);
    if (foundRowIndex > 1) {
      // Update mode: if incoming score_id is invalid, preserve the existing valid one
      // or generate a new SCR ID if the existing one is also invalid.
      var existingScoreIdVal = stringValue_(values[foundRowIndex - 1][headerMap.score_id]);
      if (!isValidScrId) {
        row.score_id = /^SCR\d+$/i.test(existingScoreIdVal)
          ? existingScoreIdVal
          : generateNextScoreId_(values, headerMap.score_id);
      }
    } else {
      // Insert mode: generate a new SCR ID if incoming is not a valid SCR format.
      if (!isValidScrId) {
        row.score_id = generateNextScoreId_(values, headerMap.score_id);
      }
    }
  }

  const mode = foundRowIndex > 1 ? 'update' : 'insert';

  if (mode === 'update') {
    const existingRowValues = values[foundRowIndex - 1];
    const updatedRowValues = buildUpdatedRowValues_(headers, existingRowValues, row);
    sheet.getRange(foundRowIndex, 1, 1, headers.length).setValues([updatedRowValues]);
    return {
      ok: true,
      success: true,
      mode: 'update',
      rowIndex: foundRowIndex,
      data: objectFromRowValues_(headers, updatedRowValues),
      message: 'Mock score updated successfully.',
    };
  }

  const insertedRowValues = buildInsertedRowValues_(headers, row);
  sheet.appendRow(insertedRowValues);
  const insertedRowIndex = sheet.getLastRow();

  return {
    ok: true,
    success: true,
    mode: 'insert',
    rowIndex: insertedRowIndex,
    data: objectFromRowValues_(headers, insertedRowValues),
    message: 'Mock score inserted successfully.',
  };
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

function ensureConsultSheet_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(CONSULT_SHEET_NAME);

  if (sheet) {
    return sheet;
  }

  sheet = spreadsheet.insertSheet(CONSULT_SHEET_NAME);
  var headers = [
    'consult_id', 'student_id', 'student_name', 'branch', 'school', 'grade',
    'consult_type', 'consult_type_label', 'consult_memo',
    'score_korean', 'score_math', 'score_english',
    'score_inquiry1', 'score_inquiry2', 'score_history',
    'score_average', 'score_percentile', 'score_grade', 'score_note',
    'created_at', 'updated_at',
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  return sheet;
}

function getAllConsultRecords_(studentId) {
  var sheet = ensureConsultSheet_();
  var values = getSheetValues_(sheet);
  var records = {};

  if (values.length <= 1) {
    return { ok: true, records: records };
  }

  var headers = values[0].map(stringValue_);
  var headerMap = buildHeaderMap_(headers);

  if (headerMap.student_id === undefined || headerMap.consult_type === undefined) {
    return { ok: true, records: records };
  }

  for (var index = 1; index < values.length; index += 1) {
    var rowStudentId = stringValue_(values[index][headerMap.student_id]);
    if (rowStudentId !== studentId) continue;
    var rowConsultType = stringValue_(values[index][headerMap.consult_type]);
    if (rowConsultType) {
      records[rowConsultType] = objectFromRowValues_(headers, values[index]);
    }
  }

  return { ok: true, records: records };
}

function getConsultRecord_(studentId, consultType) {
  var sheet = ensureConsultSheet_();
  var values = getSheetValues_(sheet);

  if (values.length <= 1) {
    return { ok: true, record: null };
  }

  var headers = values[0].map(stringValue_);
  var headerMap = buildHeaderMap_(headers);

  if (headerMap.student_id === undefined || headerMap.consult_type === undefined) {
    return { ok: true, record: null };
  }

  for (var index = 1; index < values.length; index += 1) {
    var rowStudentId = stringValue_(values[index][headerMap.student_id]);
    var rowConsultType = stringValue_(values[index][headerMap.consult_type]);

    if (rowStudentId === studentId && rowConsultType === consultType) {
      return { ok: true, record: objectFromRowValues_(headers, values[index]) };
    }
  }

  return { ok: true, record: null };
}

function getConsultSummary_(studentIdsParam) {
  var requestedIds = String(studentIdsParam || '')
    .split(',')
    .map(function (value) { return stringValue_(value); })
    .filter(function (value) { return value !== ''; });
  var requestedIdMap = {};
  var summary = {};

  for (var requestedIndex = 0; requestedIndex < requestedIds.length; requestedIndex += 1) {
    requestedIdMap[requestedIds[requestedIndex]] = true;
    summary[requestedIds[requestedIndex]] = [];
  }

  if (requestedIds.length === 0) {
    return { ok: true, success: true, consultFilledMap: summary };
  }

  var sheet = ensureConsultSheet_();
  var values = getSheetValues_(sheet);

  if (values.length <= 1) {
    return { ok: true, success: true, consultFilledMap: summary };
  }

  var headers = values[0].map(stringValue_);
  var headerMap = buildHeaderMap_(headers);

  if (headerMap.student_id === undefined || headerMap.consult_type === undefined || headerMap.consult_memo === undefined) {
    return { ok: true, success: true, consultFilledMap: summary };
  }

  for (var index = 1; index < values.length; index += 1) {
    var studentId = stringValue_(values[index][headerMap.student_id]);
    if (!requestedIdMap[studentId]) continue;

    var consultType = stringValue_(values[index][headerMap.consult_type]);
    var consultMemo = stringValue_(values[index][headerMap.consult_memo]);
    if (!consultType || !consultMemo) continue;

    if (summary[studentId].indexOf(consultType) === -1) {
      summary[studentId].push(consultType);
    }
  }

  return { ok: true, success: true, consultFilledMap: summary };
}

function saveConsultRecord_(inputRow) {
  var row = normalizeRowObject_(inputRow);
  var studentId = stringValue_(row.student_id);
  var consultType = stringValue_(row.consult_type);

  if (!studentId) {
    return failResponse_('student_id is required.', 400, { mode: 'rejected', rowIndex: null });
  }

  if (!consultType) {
    return failResponse_('consult_type is required.', 400, { mode: 'rejected', rowIndex: null });
  }

  var sheet = ensureConsultSheet_();
  var values = getSheetValues_(sheet);

  if (values.length === 0) {
    return failResponse_('consult sheet has no headers.', 500, { mode: 'rejected', rowIndex: null });
  }

  var headers = values[0].map(stringValue_);
  var headerMap = buildHeaderMap_(headers);

  var foundRowIndex = 0;
  var maxValue = 0;

  for (var index = 1; index < values.length; index += 1) {
    var rowStudentId = stringValue_(values[index][headerMap.student_id]);
    var rowConsultType = stringValue_(values[index][headerMap.consult_type]);

    if (headerMap.consult_id !== undefined) {
      var consultIdMatch = stringValue_(values[index][headerMap.consult_id]).match(/^CONS(\d+)$/i);
      if (consultIdMatch) {
        var numericValue = Number(consultIdMatch[1]);
        if (numericValue > maxValue) maxValue = numericValue;
      }
    }

    if (rowStudentId === studentId && rowConsultType === consultType) {
      foundRowIndex = index + 1;
      break;
    }
  }

  if (foundRowIndex <= 1 && !stringValue_(row.consult_id) && headerMap.consult_id !== undefined) {
    row.consult_id = 'CONS' + String(maxValue + 1).padStart(6, '0');
  }

  var mode = foundRowIndex > 1 ? 'update' : 'insert';

  if (mode === 'update') {
    var existingRowValues = values[foundRowIndex - 1];
    var updatedRowValues = buildUpdatedRowValues_(headers, existingRowValues, row);
    sheet.getRange(foundRowIndex, 1, 1, headers.length).setValues([updatedRowValues]);

    return {
      ok: true,
      success: true,
      mode: 'update',
      rowIndex: foundRowIndex,
      data: objectFromRowValues_(headers, updatedRowValues),
      message: 'Consult record updated successfully.',
    };
  }

  var insertedRowValues = buildInsertedRowValues_(headers, row);
  sheet.appendRow(insertedRowValues);
  var insertedRowIndex = sheet.getLastRow();

  return {
    ok: true,
    success: true,
    mode: 'insert',
    rowIndex: insertedRowIndex,
    data: objectFromRowValues_(headers, insertedRowValues),
    message: 'Consult record inserted successfully.',
  };
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

    var inputValue = getFieldValue_(inputRow, header);

    if (inputValue !== null) {
      nextRowValues[index] = inputValue;
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

    var inputValue = getFieldValue_(inputRow, header);
    nextRowValues.push(inputValue === null ? '' : inputValue);
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

function getFieldValue_(row, header) {
  if (Object.prototype.hasOwnProperty.call(row, header)) {
    return stringValue_(row[header]);
  }

  return null;
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

function saveAccountStatus_(inputRow) {
  const row = normalizeRowObject_(inputRow);
  const accountId = stringValue_(row.account_id);
  const studentId = stringValue_(row.student_id);
  const loginId = stringValue_(row.login_id);
  const isActive = stringValue_(row.is_active);

  if (!accountId && !studentId && !loginId) {
    return failResponse_('account_id, student_id, or login_id is required.', 400, {
      action: 'saveAccountStatus',
      mode: 'rejected',
      rowIndex: null,
    });
  }

  const sheet = getSheet_(ACCOUNTS_SHEET_NAME);
  const values = getSheetValues_(sheet);

  if (values.length === 0) {
    return failResponse_('accounts sheet is empty.', 500, {
      action: 'saveAccountStatus',
      mode: 'rejected',
      rowIndex: null,
    });
  }

  const headers = values[0].map(stringValue_);
  const headerMap = buildHeaderMap_(headers);

  if (headerMap.is_active === undefined) {
    return failResponse_('Missing required header: is_active', 500, {
      action: 'saveAccountStatus',
      mode: 'rejected',
      rowIndex: null,
    });
  }

  const foundRowIndex = findAccountRowIndex_(values, headerMap, {
    account_id: accountId,
    student_id: studentId,
    login_id: loginId,
    role: stringValue_(row.role) || 'student',
  });

  if (foundRowIndex <= 1) {
    return failResponse_('Account not found.', 404, {
      action: 'saveAccountStatus',
      mode: 'rejected',
      rowIndex: null,
    });
  }

  const existingRowValues = values[foundRowIndex - 1];
  const nextRow = {
    account_id: accountId,
    student_id: studentId,
    login_id: loginId,
    branch_id: stringValue_(row.branch_id),
    name: stringValue_(row.name),
    is_active: isActive,
    updated_at: new Date().toISOString(),
  };
  const updatedRowValues = buildUpdatedRowValues_(headers, existingRowValues, nextRow);

  sheet.getRange(foundRowIndex, 1, 1, headers.length).setValues([updatedRowValues]);

  return {
    ok: true,
    success: true,
    action: 'saveAccountStatus',
    mode: 'update',
    rowIndex: foundRowIndex,
    data: objectFromRowValues_(headers, updatedRowValues),
    message: 'Account status updated successfully.',
  };
}

function findAccountRowIndex_(values, headerMap, row) {
  if (headerMap.account_id !== undefined && stringValue_(row.account_id)) {
    const matchedByAccountId = findRowIndexByValue_(values, headerMap.account_id, row.account_id);

    if (matchedByAccountId > 1) {
      return matchedByAccountId;
    }
  }

  if (headerMap.student_id !== undefined && stringValue_(row.student_id)) {
    for (var index = 1; index < values.length; index += 1) {
      const matchedStudentId = stringValue_(values[index][headerMap.student_id]) === stringValue_(row.student_id);
      const matchedRole = headerMap.role === undefined || !stringValue_(row.role)
        ? true
        : normalizeCompareText_(values[index][headerMap.role]) === normalizeCompareText_(row.role);

      if (matchedStudentId && matchedRole) {
        return index + 1;
      }
    }
  }

  if (headerMap.login_id !== undefined && stringValue_(row.login_id)) {
    const matchedByLoginId = findRowIndexByValue_(values, headerMap.login_id, row.login_id);

    if (matchedByLoginId > 1) {
      return matchedByLoginId;
    }
  }

  return 0;
}

function buildStudentAccountLookup_() {
  const sheet = getSheet_(ACCOUNTS_SHEET_NAME);
  const values = getSheetValues_(sheet);

  if (values.length === 0) {
    return {};
  }

  const headers = values[0].map(stringValue_);
  const lookup = {};

  for (var index = 1; index < values.length; index += 1) {
    const rowObject = objectFromRowValues_(headers, values[index]);
    const studentId = stringValue_(rowObject.student_id);
    const role = normalizeCompareText_(rowObject.role);

    if (!studentId || role !== 'student' || lookup[studentId]) {
      continue;
    }

    lookup[studentId] = rowObject;
  }

  return lookup;
}

function resolveStudentLoginStatus_(accountLookup, studentId) {
  const key = stringValue_(studentId);

  if (!key || !accountLookup[key]) {
    return 'active';
  }

  return normalizeLoginStatusValue_(accountLookup[key].is_active);
}

function normalizeLoginStatusValue_(value) {
  const normalized = normalizeCompareText_(value);

  if (!normalized) {
    return 'active';
  }

  if (normalized === 'inactive' || normalized === 'false' || normalized === '0' || normalized === 'n' || normalized === 'no') {
    return 'inactive';
  }

  return 'active';
}

function loginStatusToSheetValue_(value) {
  return normalizeLoginStatusValue_(value) === 'inactive' ? 'FALSE' : 'TRUE';
}

function generateAccountId_() {
  return 'account-' + Utilities.getUuid();
}

function findStudentAccountRowIndex_(values, headerMap, studentId) {
  if (headerMap.student_id === undefined) {
    return 0;
  }

  for (var index = 1; index < values.length; index += 1) {
    const matchedStudentId = stringValue_(values[index][headerMap.student_id]) === stringValue_(studentId);
    const matchedRole = headerMap.role === undefined || normalizeCompareText_(values[index][headerMap.role]) === 'student';

    if (matchedStudentId && matchedRole) {
      return index + 1;
    }
  }

  return 0;
}

function upsertStudentAccount_(studentRow, requestedLoginStatus) {
  const sheet = getSheet_(ACCOUNTS_SHEET_NAME);
  const values = getSheetValues_(sheet);

  if (values.length === 0) {
    return failResponse_('accounts sheet is empty.', 500, {
      action: 'saveStudent',
      mode: 'rejected',
      rowIndex: null,
    });
  }

  const headers = values[0].map(stringValue_);
  const headerMap = buildHeaderMap_(headers);

  if (headerMap.student_id === undefined || headerMap.is_active === undefined) {
    return failResponse_('Missing required accounts headers.', 500, {
      action: 'saveStudent',
      mode: 'rejected',
      rowIndex: null,
    });
  }

  const studentId = stringValue_(studentRow.student_id);
  const foundRowIndex = findStudentAccountRowIndex_(values, headerMap, studentId);
  const mode = foundRowIndex > 1 ? 'update' : 'insert';
  const now = new Date().toISOString();
  const nextLoginStatus = normalizeLoginStatusValue_(requestedLoginStatus);
  const existingRowValues = foundRowIndex > 1 ? values[foundRowIndex - 1] : null;
  const existingRow = existingRowValues ? objectFromRowValues_(headers, existingRowValues) : {};
  const nextRow = {
    account_id: stringValue_(existingRow.account_id) || generateAccountId_(),
    login_id: stringValue_(existingRow.login_id) || stringValue_(studentRow.student_no) || studentId,
    password_hash: stringValue_(existingRow.password_hash),
    role: 'student',
    student_id: studentId,
    branch_id: stringValue_(studentRow.branch_id),
    name: stringValue_(studentRow.name),
    is_active: loginStatusToSheetValue_(nextLoginStatus),
    created_at: stringValue_(existingRow.created_at) || now,
    updated_at: now,
  };

  if (mode === 'update') {
    const updatedRowValues = buildUpdatedRowValues_(headers, existingRowValues, nextRow);
    sheet.getRange(foundRowIndex, 1, 1, headers.length).setValues([updatedRowValues]);

    return {
      ok: true,
      success: true,
      mode: mode,
      rowIndex: foundRowIndex,
      login_status: nextLoginStatus,
      data: objectFromRowValues_(headers, updatedRowValues),
    };
  }

  const insertedRowValues = buildInsertedRowValues_(headers, nextRow);
  sheet.appendRow(insertedRowValues);
  const insertedRowIndex = sheet.getLastRow();

  return {
    ok: true,
    success: true,
    mode: mode,
    rowIndex: insertedRowIndex,
    login_status: nextLoginStatus,
    data: objectFromRowValues_(headers, insertedRowValues),
  };
}
