import { Contact } from "../types";

export const syncFromSheet = async (scriptUrl: string): Promise<Contact[] | null> => {
  try {
    const response = await fetch(scriptUrl);
    const data = await response.json();
    
    if (data.status === 'success' && Array.isArray(data.data)) {
      return data.data as Contact[];
    }
    return null;
  } catch (error) {
    console.error("Failed to sync from sheet:", error);
    throw error;
  }
};

export const syncToSheet = async (scriptUrl: string, contacts: Contact[]): Promise<boolean> => {
  try {
    await fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contacts)
    });
    
    return true;
  } catch (error) {
    console.error("Failed to sync to sheet:", error);
    return false;
  }
};

export const testEmailNotification = async (scriptUrl: string): Promise<boolean> => {
  try {
    await fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'testEmail' })
    });
    return true;
  } catch (error) {
    console.error("Failed to send test email:", error);
    return false;
  }
};

export const APPS_SCRIPT_CODE = `
// *** IMPORTANT: DEPLOY AS NEW VERSION AFTER UPDATING ***

// !!! REPLACE THIS WITH YOUR DEPLOYED APP URL !!!
const FRONTEND_URL = 'https://birthday-buddy.web.app'; 

// Helper to find column index by name (case insensitive)
function getColumnIndex(headers, name) {
  return headers.indexOf(name.toLowerCase());
}

function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  if (data.length < 2) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Parse Headers from Row 1
  const headers = data[0].map(h => String(h).trim().toLowerCase());
  
  // Create Map of keys to column indices
  const map = {
    id: getColumnIndex(headers, 'id'),
    name: getColumnIndex(headers, 'name'),
    birthday: getColumnIndex(headers, 'birthday'),
    knownyearofbirth: getColumnIndex(headers, 'knownyearofbirth'),
    phone: getColumnIndex(headers, 'phone'),
    relationship: getColumnIndex(headers, 'relationship'),
    reminderType: getColumnIndex(headers, 'remindertype'),
    notes: getColumnIndex(headers, 'notes'),
    lastWishedYear: getColumnIndex(headers, 'lastwishedyear'),
    parentId: getColumnIndex(headers, 'parentid')
  };

  // If critical columns are missing, return empty or error
  if (map.id === -1 || map.name === -1) {
     return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Missing required columns (id, name)' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Skip header row
  const rows = data.slice(1);
  
  const contacts = rows.map(row => {
    // Helper to safely get value or undefined
    const getVal = (idx) => idx !== -1 ? row[idx] : undefined;

    let dateStr = getVal(map.birthday);
    if (Object.prototype.toString.call(dateStr) === '[object Date]') {
      dateStr = Utilities.formatDate(dateStr, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    }

    const val = getVal(map.knownyearofbirth);
    const isYearUnknown = (String(val).toUpperCase() === 'FALSE');

    const lastWished = getVal(map.lastWishedYear);

    return {
      id: String(getVal(map.id)),
      name: getVal(map.name),
      birthday: dateStr, 
      yearUnknown: isYearUnknown,
      phone: String(getVal(map.phone) || ""),
      relationship: getVal(map.relationship) || "Friend",
      reminderType: getVal(map.reminderType) || "Morning of",
      notes: getVal(map.notes) || "",
      lastWishedYear: lastWished ? parseInt(lastWished) : undefined,
      parentId: getVal(map.parentId) ? String(getVal(map.parentId)) : undefined
    };
  }).filter(c => c.id && c.name);

  return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: contacts }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  let content;
  try {
    content = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Invalid JSON' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // --- HANDLE SPECIAL ACTIONS ---
  if (content.action === 'testEmail') {
    checkBirthdaysAndNotify(true);
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Test email sent' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // --- SAVE CONTACTS (SMART SYNC) ---
  if (Array.isArray(content)) {
    const contacts = content;
    
    // 1. Get current headers to verify structure
    const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim().toLowerCase());
    
    // 2. Clear ONLY content (keep formatting/bold headers)
    // We start from row 2, column 1, down to max rows, across to max columns
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
    }
    
    // 3. Map Fields
    const map = {
      id: getColumnIndex(currentHeaders, 'id'),
      name: getColumnIndex(currentHeaders, 'name'),
      birthday: getColumnIndex(currentHeaders, 'birthday'),
      knownyearofbirth: getColumnIndex(currentHeaders, 'knownyearofbirth'),
      phone: getColumnIndex(currentHeaders, 'phone'),
      relationship: getColumnIndex(currentHeaders, 'relationship'),
      reminderType: getColumnIndex(currentHeaders, 'remindertype'),
      notes: getColumnIndex(currentHeaders, 'notes'),
      lastWishedYear: getColumnIndex(currentHeaders, 'lastwishedyear'),
      parentId: getColumnIndex(currentHeaders, 'parentid')
    };

    // 4. Build Rows based on header positions
    const rows = contacts.map(c => {
      // Create an array filled with empty strings matching header length
      const rowData = new Array(currentHeaders.length).fill("");
      
      if (map.id !== -1) rowData[map.id] = c.id;
      if (map.name !== -1) rowData[map.name] = c.name;
      if (map.birthday !== -1) rowData[map.birthday] = c.birthday;
      if (map.knownyearofbirth !== -1) rowData[map.knownyearofbirth] = c.yearUnknown ? false : true;
      if (map.phone !== -1) rowData[map.phone] = c.phone || "";
      if (map.relationship !== -1) rowData[map.relationship] = c.relationship;
      if (map.reminderType !== -1) rowData[map.reminderType] = c.reminderType;
      if (map.notes !== -1) rowData[map.notes] = c.notes || "";
      if (map.lastWishedYear !== -1) rowData[map.lastWishedYear] = c.lastWishedYear || "";
      if (map.parentId !== -1) rowData[map.parentId] = c.parentId || "";
      
      return rowData;
    });
    
    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, currentHeaders.length).setValues(rows);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Unknown action' }))
      .setMimeType(ContentService.MimeType.JSON);
}

// --- AUTOMATION ---
function checkBirthdaysAndNotify(isTest) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return;

  // Header Map for Automation
  const headers = data[0].map(h => String(h).trim().toLowerCase());
  const map = {
    name: getColumnIndex(headers, 'name'),
    birthday: getColumnIndex(headers, 'birthday'),
    notes: getColumnIndex(headers, 'notes')
  };
  
  if (map.name === -1 || map.birthday === -1) return; // Can't work without these

  const rows = data.slice(1);
  const today = new Date();
  const currentMonth = today.getMonth(); 
  const currentDay = today.getDate();
  const dayOfWeek = today.getDay(); // 0 = Sun
  
  let todaysBirthdays = [];
  let weekBirthdays = [];
  
  rows.forEach(row => {
    const name = row[map.name];
    const bdayRaw = row[map.birthday];
    const notes = (map.notes !== -1) ? row[map.notes] : "";
    
    if (!name || !bdayRaw) return;
    
    const bdayDate = new Date(bdayRaw);
    const bMonth = bdayDate.getMonth();
    const bDay = bdayDate.getDate();
    
    // Check Today
    if (bMonth === currentMonth && bDay === currentDay) {
       todaysBirthdays.push({ name: name, notes: notes });
    }
    
    // Check Weekly (Sunday or Test)
    if (dayOfWeek === 0 || isTest === true) { 
      const nextBday = new Date(today.getFullYear(), bMonth, bDay);
      if (nextBday < today) {
        nextBday.setFullYear(today.getFullYear() + 1);
      }
      
      const diffTime = nextBday - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      if (diffDays >= 0 && diffDays <= 7) {
        const dateStr = Utilities.formatDate(nextBday, Session.getScriptTimeZone(), 'EEE, MMM d');
        weekBirthdays.push({ name: name, date: dateStr, notes: notes });
      }
    }
  });
  
  let subject = "";
  let body = "";
  let shouldSend = false;
  
  if (todaysBirthdays.length === 1) subject = "🎂 Happy Birthday " + todaysBirthdays[0].name + "!";
  else if (todaysBirthdays.length > 1) subject = "🎂 Happy Birthday " + todaysBirthdays[0].name + " & others!";
  else if (weekBirthdays.length > 0 && (dayOfWeek === 0 || isTest === true)) subject = "📅 Upcoming Birthdays this week";

  const btnStyle = "display:inline-block; background-color:#4f46e5; color:white; padding:12px 24px; text-decoration:none; border-radius:8px; font-weight:bold; font-family:sans-serif; margin: 10px 0;";
  const noteStyle = "font-size:12px; color:#666; font-style:italic; display:block; margin-top:2px;";
  const actionLink = "<div style='text-align:center;'><a href='" + FRONTEND_URL + "' style='" + btnStyle + "'>Open Birthday Buddy</a></div>";

  if (todaysBirthdays.length > 0) {
    body += "<h2>🎉 It's Party Time!</h2><p>Today's birthdays:</p><ul>";
    todaysBirthdays.forEach(p => {
        body += "<li><strong>" + p.name + "</strong>";
        if (p.notes) body += "<span style='" + noteStyle + "'>💡 Note: " + p.notes + "</span>";
        body += "</li>";
    });
    body += "</ul>" + actionLink + "<hr style='border:0; border-top:1px solid #eee; margin:20px 0;'>";
    shouldSend = true;
  }
  
  if (weekBirthdays.length > 0) {
    body += "<h3>📅 Coming up this week:</h3><ul>";
    weekBirthdays.forEach(p => {
        body += "<li><strong>" + p.name + "</strong> (" + p.date + ")";
        if (p.notes) body += "<span style='" + noteStyle + "'>💡 " + p.notes + "</span>";
        body += "</li>";
    });
    body += "</ul>";
    if (!shouldSend && (dayOfWeek === 0 || isTest === true)) {
       shouldSend = true;
       if (!body.includes("Open Birthday Buddy")) body += actionLink;
    }
  }
  
  if (isTest === true) {
     shouldSend = true;
     if (subject === "") subject = "✅ BB Test: No birthdays found";
     else subject = "[TEST] " + subject;
     body = "<div style='background-color:#e0f2fe; padding:10px; border-radius:5px; color:#0369a1; margin-bottom:15px;'><strong>System Check:</strong> This is a test email.</div>" + body;
     if (todaysBirthdays.length === 0 && weekBirthdays.length === 0) {
       body += "<p>No birthdays found for today or this upcoming week.</p>" + actionLink;
     }
  }
  
  if (shouldSend) {
    const email = Session.getEffectiveUser().getEmail();
    if (email) {
      MailApp.sendEmail({ to: email, subject: subject, htmlBody: "<div style='font-family:sans-serif; color:#333;'>" + body + "</div>" });
      Logger.log("Email sent.");
    }
  }
}

function manualDebugTest() {
  checkBirthdaysAndNotify(true);
}
`;