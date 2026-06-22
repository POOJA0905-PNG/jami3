/**
 * Utility functions for Google Gmail and Google Sheets APIs for the sheet-fed Inbox dashboard
 */

import { SheetEmail, Priority } from '../types';

// Helper to decode Base64Url string to UTF-8
export function decodeBase64Url(str: string): string {
  if (!str) return '';
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  try {
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch (e) {
    try {
      return atob(base64);
    } catch (err) {
      console.error('Base64 decode error:', err);
      return '[Unparseable content]';
    }
  }
}

// Fetch all tabs metadata from Google Sheets
export async function fetchSpreadsheetTabs(accessToken: string, spreadsheetId: string): Promise<Array<{ title: string; id: number }>> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?includeGridData=false`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!response.ok) {
    throw new Error(`Sheets API metadata error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return (data.sheets || []).map((sheet: any) => ({
    title: sheet.properties.title as string,
    id: sheet.properties.sheetId as number,
  }));
}

// Fetch spreadsheet values for a range
export async function fetchSheetValues(accessToken: string, spreadsheetId: string, range: string): Promise<any[][] | null> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!response.ok) {
    console.warn(`Could not fetch spreadsheet range ${range}: ${response.status}`);
    return null;
  }
  
  const data = await response.json();
  return data.values || [];
}

// Parse Inbox values from sheet dynamically with resilient column match and fallbacks
export function parseInboxEmails(rows: any[][]): SheetEmail[] {
  if (!rows || rows.length <= 1) return [];
  
  const headers = rows[0].map((h) => String(h || '').trim().toLowerCase());
  
  // Resilient index search
  const idIdx = headers.findIndex((h) => h.includes('email id') || h === 'id' || h.includes('id') || h.includes('message id'));
  const threadIdx = headers.findIndex((h) => h.includes('thread id') || h === 'thread' || h.includes('thread'));
  const dateIdx = headers.findIndex((h) => h === 'date' || h.includes('received') || h.includes('time'));
  const fromNameIdx = headers.findIndex((h) => h.includes('from name') || h.includes('sender name') || h.includes('name'));
  const fromEmailIdx = headers.findIndex((h) => h.includes('from email') || h.includes('sender email') || h === 'from' || h.includes('email address') || h.includes('email'));
  const subjectIdx = headers.findIndex((h) => h === 'subject' || h.includes('topic') || h.includes('sub'));
  const dirIdx = headers.findIndex((h) => h.includes('direction') || h.includes('dir'));
  const categoryIdx = headers.findIndex((h) => h.includes('contact category') || h.includes('category') || h.includes('class'));
  const priorityIdx = headers.findIndex((h) => h === 'priority' || h.includes('prio') || h.includes('level'));
  const summaryIdx = headers.findIndex((h) => h === 'summary' || h.includes('notes') || h.includes('overview') || h.includes('brief'));
  const draftIdx = headers.findIndex((h) => h.includes('draft') || h.includes('reply') || h.includes('response') || h.includes('proposed') || h.includes('suggested'));
  const statusIdx = headers.findIndex((h) => h === 'status' || h.includes('state'));
  const sentAtIdx = headers.findIndex((h) => h.includes('sent at') || h.includes('sent_at') || h.includes('sent'));

  // Standard fallback map matching the exact layout requested if headers do not match:
  // Email ID (0), Thread ID (1), Date (2), From Name (3), From Email (4), Subject (5), 
  // Direction (6), Contact Category (7), Priority (8), Summary (9), Draft Reply (10), Status (11), Sent At (12)
  const getVal = (row: any[], index: number, fallbackIndex: number): string => {
    const idx = index !== -1 ? index : fallbackIndex;
    if (idx < row.length) {
      return String(row[idx] || '').trim();
    }
    return '';
  };

  return rows.slice(1).map((row) => {
    const emailId = getVal(row, idIdx, 0);
    const threadId = getVal(row, threadIdx, 1);
    const date = getVal(row, dateIdx, 2);
    const fromName = getVal(row, fromNameIdx, 3);
    const fromEmail = getVal(row, fromEmailIdx, 4);
    const subject = getVal(row, subjectIdx, 5);
    const direction = getVal(row, dirIdx, 6);
    const contactCategory = getVal(row, categoryIdx, 7);
    
    const priorityStr = getVal(row, priorityIdx, 8).toUpperCase();
    let priority: Priority = 'P3';
    if (priorityStr.includes('P1') || priorityStr === '1' || priorityStr.includes('HIGH')) priority = 'P1';
    else if (priorityStr.includes('P2') || priorityStr === '2' || priorityStr.includes('MED')) priority = 'P2';
    else if (priorityStr.includes('P3') || priorityStr === '3' || priorityStr.includes('LOW')) priority = 'P3';

    const summary = getVal(row, summaryIdx, 9);
    const draftReply = getVal(row, draftIdx, 10);
    const status = getVal(row, statusIdx, 11);
    const sentAt = getVal(row, sentAtIdx, 12);

    return {
      emailId,
      threadId,
      date,
      fromName,
      fromEmail,
      subject,
      direction,
      contactCategory,
      priority,
      summary,
      draftReply,
      status,
      sentAt,
    };
  }).filter((e) => !!e.emailId || !!e.fromEmail);
}

// Convert message payload to MIME string and send via Gmail API
export async function sendGmailReply(
  accessToken: string,
  to: string,
  subject: string,
  body: string,
  threadId?: string
): Promise<boolean> {
  const headers = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
  ];
  
  const rawMessage = headers.join('\r\n') + '\r\n\r\n' + body;
  
  // Safe Unicode base64url encoding
  const base64UrlSafe = btoa(unescape(encodeURIComponent(rawMessage)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
    
  const sendUrl = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
  
  const sendBody: { raw: string; threadId?: string } = {
    raw: base64UrlSafe,
  };
  if (threadId) {
    sendBody.threadId = threadId;
  }
  
  const response = await fetch(sendUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(sendBody),
  });
  
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gmail API send failed: ${response.status} - ${errText}`);
  }
  
  return true;
}
