const RSVP_RECIPIENT = "minhanh01205@gmail.com";
const RSVP_MESSAGE = "Đã xác nhận thành công.";

function doPost(event) {
  const expectedSecret = PropertiesService.getScriptProperties().getProperty("GMAIL_SCRIPT_SECRET");
  if (!expectedSecret || expectedSecret.length < 32) {
    return jsonResponse({ ok: false, code: "SCRIPT_SECRET_NOT_CONFIGURED", permanent: true });
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
  if (payload.message !== RSVP_MESSAGE) {
    return jsonResponse({ ok: false, code: "INVALID_MESSAGE", permanent: true });
  }

  try {
    MailApp.sendEmail({
      to: RSVP_RECIPIENT,
      subject: RSVP_MESSAGE,
      body: RSVP_MESSAGE,
    });
    return jsonResponse({ ok: true });
  } catch (error) {
    console.error("RSVP email send failed: " + error.message);
    return jsonResponse({ ok: false, code: "GMAIL_SEND_FAILED", permanent: false });
  }
}

function jsonResponse(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
