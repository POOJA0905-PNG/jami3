/**
 * Types for the CEO Email Dashboard Application represented by a sheet-fed database
 */

export type Priority = 'P1' | 'P2' | 'P3';

export interface SheetEmail {
  emailId: string;
  threadId: string;
  date: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  direction: string;
  contactCategory: string;
  priority: Priority;
  summary: string;
  draftReply: string;
  status: string;
  sentAt: string;
}

export interface AppSettings {
  clientId: string;
  spreadsheetId: string;
  inboxRange: string;
}

