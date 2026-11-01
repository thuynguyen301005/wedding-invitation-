const RSVP_SHEET_NAME = "RSVP";
const RSVP_HEADERS = [
  "ID xác nhận",
  "Lần cập nhật",
  "Thời gian xác nhận",
  "Tên khách",
  "Trạng thái",
  "Số người",
  "Lời nhắn",
];

function doPost(event) {
  const expectedSecret = PropertiesService.getScriptProperties().getProperty("SHEETS_SCRIPT_SECRET");
  if (!expectedSecret || expectedSecret.length < 32) {
    return jsonResponse({ ok: false, code: "SHEET_CONFIG", permanent: true });
  }

  let payload;
  try {
    payload = JSON.parse(event.postData.contents);
  } catch (error) {
    return jsonResponse({ ok: false, code: "INVALID_JSON", permanent: true });
  }

  if (payload.secret !== expectedSecret) {
    return jsonResponse({ ok: false, code: "UNAUTHORIZED", permanent: true });
  }
  const rsvps = Array.isArray(payload.rsvps)
    ? payload.rsvps
    : payload.rsvp
      ? [payload.rsvp]
      : [];
  if (rsvps.length === 0 || rsvps.length > 500 || !rsvps.every(isValidRsvp)) {
    return jsonResponse({ ok: false, code: "INVALID_RSVP", permanent: true });
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty("RSVP_SPREADSHEET_ID");
    if (!spreadsheetId) {
      return jsonResponse({ ok: false, code: "SHEET_CONFIG", permanent: true });
    }

    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(RSVP_SHEET_NAME) || spreadsheet.insertSheet(RSVP_SHEET_NAME);
    ensureHeaders(sheet);
    upsertRsvps(sheet, rsvps);
    return jsonResponse({ ok: true });
  } catch (error) {
    console.error("RSVP sheet sync failed: " + error.message);
    return jsonResponse({ ok: false, code: "SHEET_WRITE_FAILED", permanent: false });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function isValidRsvp(rsvp) {
  return Boolean(
    rsvp &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rsvp.id) &&
      typeof rsvp.revision === "number" &&
      Number.isInteger(rsvp.revision) &&
      rsvp.revision > 0 &&
      typeof rsvp.name === "string" &&
      rsvp.name.length > 0 &&
      rsvp.name.length <= 100 &&
      (rsvp.attendance_status === "yes" || rsvp.attendance_status === "no") &&
      typeof rsvp.guest_count === "number" &&
      Number.isInteger(rsvp.guest_count) &&
      rsvp.guest_count >= 0 &&
      rsvp.guest_count <= 10 &&
      (rsvp.message === null || (typeof rsvp.message === "string" && rsvp.message.length <= 500)) &&
      typeof rsvp.confirmed_at === "string"
  );
}

function ensureHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, RSVP_HEADERS.length).setValues([RSVP_HEADERS]);
    sheet.setFrozenRows(1);
    return;
  }

  const currentHeaders = sheet.getRange(1, 1, 1, RSVP_HEADERS.length).getValues()[0];
  if (currentHeaders.join("\u001f") !== RSVP_HEADERS.join("\u001f")) {
    throw new Error("The RSVP sheet has unexpected column headers.");
  }
}

function toSheetRow(rsvp) {
  return [
    rsvp.id,
    rsvp.revision,
    new Date(rsvp.confirmed_at),
    safeCellValue(rsvp.name),
    rsvp.attendance_status === "yes" ? "Tham dự" : "Không tham dự",
    rsvp.guest_count,
    safeCellValue(rsvp.message || ""),
  ];
}

function upsertRsvps(sheet, rsvps) {
  const lastRow = sheet.getLastRow();
  const rows = lastRow > 1
    ? sheet.getRange(2, 1, lastRow - 1, RSVP_HEADERS.length).getValues()
    : [];
  const rowById = new Map(rows.map((row, index) => [row[0], index]));

  rsvps.forEach((rsvp) => {
    const row = toSheetRow(rsvp);
    const existingIndex = rowById.get(rsvp.id);
    if (existingIndex !== undefined) {
      const existingRevision = Number(rows[existingIndex][1]) || 0;
      if (existingRevision <= rsvp.revision) rows[existingIndex] = row;
    } else {
      rowById.set(rsvp.id, rows.length);
      rows.push(row);
    }
  });

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, RSVP_HEADERS.length).setValues(rows);
  }
}

function safeCellValue(value) {
  const text = String(value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function jsonResponse(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
