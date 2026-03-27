const COL = {
  ID:1, ACTIVE:2, TYPE:3, CATEGORY:4, MESSAGE:5,
  STARTS_AT:6, EXPIRES_AT:7, PINNED:8, SOURCE:9, UPDATED_AT:10,
};
const SHEET_NAME = "Alerts";
const ICONS = { warn:"⚠️", info:"ℹ️", ok:"✅", default:"📢" };
const CATEGORY_COLORS = { bus:"teal", train:"blue", taxi:"crimson", uber:"gold", safety:"crimson", general:"muted" };

function doGet(e) {
  try {
    const alerts = getActiveAlerts();
    return ContentService.createTextOutput(JSON.stringify({ ok:true, updatedAt:new Date().toISOString(), count:alerts.length, alerts })).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ ok:false, error:err.message, alerts:[] })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const now = new Date();
    sheet.appendRow(["crowd_"+now.getTime(), true, body.type||"warn", body.category||"general", body.message||"", now.toISOString(), "", false, "Crowd Report", now.toISOString()]);
    return ContentService.createTextOutput(JSON.stringify({ ok:true })).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ ok:false, error:err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getActiveAlerts() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Sheet "Alerts" not found');
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  const now = new Date();
  const alerts = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const id      = String(row[0]||"").trim();
    const active  = String(row[1]).toUpperCase() === "TRUE";
    const message = String(row[4]||"").trim();
    if (!id || !active || !message) continue;
    const startsAt  = row[5] ? new Date(row[5]) : null;
    const expiresAt = row[6] ? new Date(row[6]) : null;
    if (startsAt  && now < startsAt)  continue;
    if (expiresAt && now > expiresAt) continue;
    const type     = String(row[2]||"info").toLowerCase();
    const category = String(row[3]||"general").toLowerCase();
    alerts.push({
      id, type, category,
      icon: ICONS[type]||ICONS.default,
      color: CATEGORY_COLORS[category]||"muted",
      message,
      pinned:  String(row[7]).toUpperCase() === "TRUE",
      source:  String(row[8]||"MoveCape").trim(),
      updatedAt: row[9] ? new Date(row[9]).toISOString() : null,
    });
  }
  alerts.sort((a,b) => (b.pinned?1:0)-(a.pinned?1:0));
  return alerts;
}

function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  if (sheet.getName() !== SHEET_NAME) return;
  if (e.range.getRow() <= 1) return;
  sheet.getRange(e.range.getRow(), COL.UPDATED_AT).setValue(new Date().toISOString());
}

function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  const headers = ["ID","ACTIVE","TYPE","CATEGORY","MESSAGE","STARTS_AT","EXPIRES_AT","PINNED","SOURCE","UPDATED_AT"];
  sheet.getRange(1,1,1,headers.length).setValues([headers]);
  sheet.getRange(1,1,1,headers.length).setBackground("#050810").setFontColor("#00ffcc").setFontWeight("bold");
  sheet.setFrozenRows(1);
  const now = new Date().toISOString();
  const samples = [
    ["alert_001",true, "warn","train",  "Metrorail: Southern Line delays expected until 14:00","","",false,"Metrorail Official",now],
    ["alert_002",true, "ok",  "bus",    "MyCiTi T01 running on time — 12 min frequency",       "","",false,"MyCiTi Official",   now],
    ["alert_003",true, "warn","uber",   "Uber surge pricing active: CBD → Sea Point (+40%)",    "","",false,"Crowd Report",      now],
    ["alert_004",true, "warn","taxi",   "Taxi disruption: Bellville rank — partial service",    "","",true, "Crowd Report",      now],
    ["alert_005",false,"info","general","Test alert — disabled, not shown in app",               "","",false,"Test",             now],
  ];
  sheet.getRange(2,1,samples.length,samples[0].length).setValues(samples);
  sheet.autoResizeColumns(1,headers.length);
  SpreadsheetApp.getUi().alert("✅ Alerts sheet created! Now: Deploy → Manage Deployments → Edit → New Version → Deploy.");
}
