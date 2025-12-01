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
  
  // Create Map of keys to column indices (NEW COLUMNS: bday, bmonth, byear)
  const map = {
    id: getColumnIndex(headers, 'id'),
    name: getColumnIndex(headers, 'name'),
    
    // TRIPLE COLUMN DATE (Robust)
    bDay: getColumnIndex(headers, 'bday'),
    bMonth: getColumnIndex(headers, 'bmonth'),
    bYear: getColumnIndex(headers, 'byear'),
    
    // Legacy fallback (optional)
    birthday: getColumnIndex(headers, 'birthday'),
    
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

  const rows = data.slice(1);
  
  const contacts = rows.map(row => {
    const getVal = (idx) => idx !== -1 ? row[idx] : undefined;
    
    // --- DATE PARSING LOGIC ---
    let day, month, year;
    
    if (map.bDay !== -1 && map.bMonth !== -1) {
       // Prefer new split columns
       day = parseInt(getVal(map.bDay)) || 1;
       month = parseInt(getVal(map.bMonth)) || 1;
       const yVal = getVal(map.bYear);
       year = yVal ? parseInt(yVal) : undefined;
    } else if (map.birthday !== -1) {
       // Fallback for old column if migration not done
       // This is risky for timezones, but better than nothing
       let dStr = getVal(map.birthday);
       if (Object.prototype.toString.call(dStr) === '[object Date]') {
          day = dStr.getDate();
          month = dStr.getMonth() + 1;
          // We ignore year from Date objects usually in legacy mode or set default
       }
    }

    const lastWished = getVal(map.lastWishedYear);

    return {
      id: String(getVal(map.id)),
      name: getVal(map.name),
      
      day: day || 1,
      month: month || 1,
      year: year,
      
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

  // --- ACTIONS ---
  if (content.action === 'testEmail') {
    checkBirthdaysAndNotify(true);
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Test email sent' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // --- SAVE ---
  if (Array.isArray(content)) {
    const contacts = content;
    const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim().toLowerCase());
    
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
    }
    
    // Map Fields
    const map = {
      id: getColumnIndex(currentHeaders, 'id'),
      name: getColumnIndex(currentHeaders, 'name'),
      
      bDay: getColumnIndex(currentHeaders, 'bday'),
      bMonth: getColumnIndex(currentHeaders, 'bmonth'),
      bYear: getColumnIndex(currentHeaders, 'byear'),
      
      phone: getColumnIndex(currentHeaders, 'phone'),
      relationship: getColumnIndex(currentHeaders, 'relationship'),
      reminderType: getColumnIndex(currentHeaders, 'remindertype'),
      notes: getColumnIndex(currentHeaders, 'notes'),
      lastWishedYear: getColumnIndex(currentHeaders, 'lastwishedyear'),
      parentId: getColumnIndex(currentHeaders, 'parentid')
    };

    const rows = contacts.map(c => {
      const rowData = new Array(currentHeaders.length).fill("");
      
      if (map.id !== -1) rowData[map.id] = c.id;
      if (map.name !== -1) rowData[map.name] = c.name;
      
      // Save Split Date
      if (map.bDay !== -1) rowData[map.bDay] = c.day;
      if (map.bMonth !== -1) rowData[map.bMonth] = c.month;
      if (map.bYear !== -1) rowData[map.bYear] = c.year || "";
      
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

  const headers = data[0].map(h => String(h).trim().toLowerCase());
  const map = {
    name: getColumnIndex(headers, 'name'),
    bDay: getColumnIndex(headers, 'bday'),
    bMonth: getColumnIndex(headers, 'bmonth'),
    notes: getColumnIndex(headers, 'notes')
  };
  
  // Need name and day/month at minimum
  if (map.name === -1 || map.bDay === -1 || map.bMonth === -1) return;

  const rows = data.slice(1);
  const today = new Date();
  const currentMonth = today.getMonth() + 1; // 1-12
  const currentDay = today.getDate();
  const dayOfWeek = today.getDay(); // 0 = Sun
  
  let todaysBirthdays = [];
  let weekBirthdays = [];
  
  rows.forEach(row => {
    const name = row[map.name];
    const bDay = parseInt(row[map.bDay]);
    const bMonth = parseInt(row[map.bMonth]);
    const notes = (map.notes !== -1) ? row[map.notes] : "";
    
    if (!name || !bDay || !bMonth) return;
    
    // Check Today (Direct Number Comparison - No Timezones!)
    if (bMonth === currentMonth && bDay === currentDay) {
       todaysBirthdays.push({ name: name, notes: notes });
    }
    
    // Check Weekly (Sunday or Test)
    if (dayOfWeek === 0 || isTest === true) { 
       // We still need a date object for the "next occurrence" calc
       // but we construct it safely using the numbers
       const nextBday = new Date(today.getFullYear(), bMonth - 1, bDay);
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
    }
  }
}
`;