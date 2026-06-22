import { useState, useEffect } from 'react';
import { SheetEmail, AppSettings, Priority } from '../types';
import { fetchSheetValues, parseInboxEmails, sendGmailReply } from '../utils/googleApi';
import EmailList from './EmailList';
import EmailDetail from './EmailDetail';
import SettingsDrawer from './SettingsDrawer';
import { Settings, ShieldAlert, RefreshCcw, Database, MailOpen, LogOut, Play } from 'lucide-react';

interface DashboardProps {
  accessToken: string | null;
  onLogout: () => void;
  onLogin: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
}

// High-Fidelity Mock Seed Data (Fallback & Demo Mode)
const MOCK_INBOX_EMAILS: SheetEmail[] = [
  {
    emailId: 'msg_001',
    threadId: 'thread_001',
    date: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    fromName: 'vanga.poojasri',
    fromEmail: 'vanga.poojasri@databeat.io',
    subject: 'URGENT: Databeat Q3 Analytics Sync & Spreadsheet Integration',
    direction: 'Inbound',
    contactCategory: 'Strategic Partner',
    priority: 'P1',
    summary: 'Pooja is requesting an urgent final review of the Analytics Sheet integration schema in order to lock in schedules for the custom telemetry dashboard.',
    draftReply: `Hi Pooja,\n\nI have received your note and reviewed the updated South Asian workspace metrics in our shared sheet. The schema matches perfectly.\n\nI have authorized our integration systems and are fully ready to transition. Let's hop on a brief alignment call on Thursday afternoon to synchronize final systems.\n\nBest regards,\nCEO`,
    status: 'Pending Approval',
    sentAt: '',
  },
  {
    emailId: 'msg_002',
    threadId: 'thread_002',
    date: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
    fromName: 'John Miller',
    fromEmail: 'john.miller@quantum-tech.io',
    subject: 'Board update: Quantum Series A financial model review required',
    direction: 'Inbound',
    contactCategory: 'Lead Investor',
    priority: 'P1',
    summary: 'John with Quantum MD asks for signoff on board meeting slides and Q3 investment forecast spreadsheets today.',
    draftReply: `Hi John,\n\nThank you for the update. I've finished auditing the revised financial models on our secure workspace. Everything is accurate and signed off.\n\nOur team has appended the deck slides, and you should receive the workspace meeting link and files shortly.\n\nBest,\nCEO`,
    status: 'Pending Approval',
    sentAt: '',
  },
  {
    emailId: 'msg_003',
    threadId: 'thread_003',
    date: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
    fromName: 'Sarah Liao',
    fromEmail: 'sarah.liao@brightdesigns.com',
    subject: 'Bright Designs: Brand Identity Iteration V2 styles',
    direction: 'Inbound',
    contactCategory: 'Design Agency',
    priority: 'P2',
    summary: 'Sarah Liao has delivered brand styling boards featuring refined display typography and modern slate color schemes.',
    draftReply: `Dear Sarah,\n\nThank you for sending the updated specs. The new slate contrast theme and layout rhythms look absolutely brilliant and reflect our aesthetic goals.\n\nLet's proceed with this specification. Looking forward to compiling the final assets.\n\nSincerely,\nCEO`,
    status: 'Pending Approval',
    sentAt: '',
  },
  {
    emailId: 'msg_004',
    threadId: 'thread_004',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 24 hours ago
    fromName: 'Tech Insights Newsletter',
    fromEmail: 'digest@techinsights.com',
    subject: 'Weekly Tech Digest: Google Workspace Automation Best Practices',
    direction: 'Inbound',
    contactCategory: 'Subscription',
    priority: 'P3',
    summary: 'Weekly tech trends and engineering guidelines on Gmail API integration architectures and Google Sheets API performance tips.',
    draftReply: 'Thanks for sharing the weekly trends list.',
    status: 'Review Complete',
    sentAt: '',
  },
];

export default function Dashboard({
  accessToken,
  onLogout,
  onLogin,
  settings,
  onSaveSettings,
}: DashboardProps) {
  const [emails, setEmails] = useState<SheetEmail[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Track counts
  const syncCounts = {
    P1: emails.filter(e => e.priority === 'P1').length,
    P2: emails.filter(e => e.priority === 'P2').length,
    P3: emails.filter(e => e.priority === 'P3').length,
  };

  const isSandboxMode = !accessToken;

  // Sync sheet database on mount or settings update
  useEffect(() => {
    syncDashboard();
  }, [accessToken, settings]);

  const syncDashboard = async () => {
    setIsSyncing(true);
    setErrorMessage(null);
    try {
      if (isSandboxMode) {
        // Sandbox simulation
        await new Promise((resolve) => setTimeout(resolve, 800)); // Realism latency
        setEmails(MOCK_INBOX_EMAILS);
        if (MOCK_INBOX_EMAILS.length > 0 && !selectedEmailId) {
          setSelectedEmailId(MOCK_INBOX_EMAILS[0].emailId);
        }
      } else {
        // Load Live Sheet Database records from the designated "Inbox" tab
        if (!settings.spreadsheetId) {
          throw new Error('Spreadsheet ID is missing in settings. Please configure system parameters.');
        }

        const rangeToFetch = settings.inboxRange || 'Inbox!A1:M1000';
        const rows = await fetchSheetValues(accessToken!, settings.spreadsheetId, rangeToFetch);
        if (rows && rows.length > 0) {
          const parsed = parseInboxEmails(rows);
          setEmails(parsed);
          if (parsed.length > 0 && (!selectedEmailId || !parsed.some(e => e.emailId === selectedEmailId))) {
            setSelectedEmailId(parsed[0].emailId);
          }
        } else {
          setEmails([]);
          throw new Error(`The Spreadsheet tab or range '${rangeToFetch}' is empty or invalid. Please check column headings.`);
        }
      }
    } catch (err: any) {
      console.error('Database Sync Error:', err);
      setErrorMessage(
        isSandboxMode
          ? 'Error loading offline sandbox records.'
          : err.message || 'Failed to read spreadsheet database. Ensure the sheet has an "Inbox" tab with expected columns.'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  // Callback to handle sending reply via Gmail API
  const handleSendReply = async (to: string, subject: string, body: string, threadId?: string): Promise<boolean> => {
    setIsSending(true);
    try {
      if (isSandboxMode) {
        // Sandbox delay simulation
        await new Promise((resolve) => setTimeout(resolve, 1500));
        
        // Update local state to mark as dispatched
        setEmails((prev) =>
          prev.map((e) =>
            e.emailId === selectedEmailId
              ? { ...e, status: 'Sent', sentAt: new Date().toLocaleString() }
              : e
          )
        );
        return true;
      } else {
        // Live Workspace Dispatcher
        const success = await sendGmailReply(accessToken!, to, subject, body, threadId);
        if (success) {
          // Update spreadsheet row status & cache locally as dispatched
          setEmails((prev) =>
            prev.map((e) =>
              e.emailId === selectedEmailId
                ? { ...e, status: 'Sent', sentAt: new Date().toLocaleString() }
                : e
            )
          );
          return true;
        }
      }
      return false;
    } catch (e: any) {
      console.error('Workspace Dispatcher failed:', e);
      throw e;
    } finally {
      setIsSending(false);
    }
  };

  const activeEmail = emails.find((e) => e.emailId === selectedEmailId) || null;

  return (
    <div className="flex flex-col h-screen w-full bg-stone-950 text-stone-100 font-sans antialiased overflow-hidden select-none">
      
      {/* Top Header */}
      <header className="h-16 border-b border-stone-800 bg-stone-900/60 flex items-center justify-between px-6 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-indigo-700 to-indigo-500 rounded-xl shadow-lg shadow-indigo-600/10">
            <MailOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-indigo-400">Executive Dashboard</span>
            <h1 className="font-sans font-semibold text-sm leading-none text-white">CEO Email Console</h1>
          </div>
        </div>

        {/* Action Panel Buttons */}
        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <div className={`text-[11px] font-medium font-mono px-3 py-1 rounded-full border hidden sm:flex items-center gap-1.5 ${
            isSandboxMode
              ? 'bg-amber-950/20 text-amber-400 border-amber-950/60'
              : 'bg-emerald-950/20 text-emerald-400 border-emerald-950/60'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isSandboxMode ? 'bg-amber-500 animate-pulse' : 'bg-emerald-400'}`}></span>
            {isSandboxMode ? 'Sandbox Mode' : 'Workspace Connected'}
          </div>

          <button
            id="sync-button"
            onClick={syncDashboard}
            disabled={isSyncing}
            className="p-2 border border-stone-800 rounded-lg hover:border-stone-700 hover:bg-stone-900 text-stone-400 hover:text-stone-100 transition shrink-0"
            title="Reload Sheet Database"
          >
            <RefreshCcw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>

          <button
            id="settings-button"
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 border border-stone-800 rounded-lg hover:border-stone-700 hover:bg-stone-900 text-stone-400 hover:text-stone-100 transition shrink-0"
            title="Database Configuration"
          >
            <Settings className="w-4 h-4" />
          </button>

          {!isSandboxMode ? (
            <button
              id="logout-button"
              onClick={onLogout}
              className="p-2 border border-stone-800 rounded-lg hover:border-stone-700 hover:bg-stone-900 text-red-400 hover:text-red-300 transition shrink-0 flex items-center gap-1.5 text-xs"
              title="Disconnect Google API"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline font-medium">Log out</span>
            </button>
          ) : (
            <button
              id="login-connect-button"
              onClick={onLogin}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-sans font-medium rounded-lg shadow-lg hover:shadow-indigo-600/10 transition shrink-0 flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Connect Live APIs</span>
            </button>
          )}
        </div>
      </header>

      {/* Database Context Details info rail */}
      <section className="bg-stone-900/40 border-b border-stone-850 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs z-10 shrink-0">
        <div className="flex items-center gap-2 text-stone-400 truncate">
          <Database className="w-4 h-4 text-stone-500 shrink-0" />
          <span className="truncate">
            Source Spreadsheet ID: <strong className="font-mono text-stone-300 shrink-0 select-all">{settings.spreadsheetId}</strong>
          </span>
          <span className="text-stone-600">|</span>
          <span className="truncate text-[11px]">
            Target Tab: <strong className="font-mono text-amber-400/80">{settings.inboxRange || 'Inbox'}</strong>
          </span>
        </div>
        
        {/* Categorized Priority Row Count */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-stone-400">Total Rows:</span>
          <span className="flex items-center gap-1 bg-red-950/20 text-red-400 px-1.5 py-0.5 rounded border border-red-950/50 text-[10px] font-semibold">
            P1: {syncCounts.P1}
          </span>
          <span className="flex items-center gap-1 bg-amber-950/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-950/50 text-[10px] font-semibold">
            P2: {syncCounts.P2}
          </span>
          <span className="flex items-center gap-1 bg-stone-900 text-stone-400 px-1.5 py-0.5 rounded border border-stone-800 text-[10px] font-semibold">
            P3: {syncCounts.P3}
          </span>
        </div>
      </section>

      {/* General error warning */}
      {errorMessage && (
        <div className="bg-red-950/20 border-b border-red-500/20 text-red-400 px-6 py-3 text-xs font-sans font-medium flex items-center gap-2 z-10 shrink-0">
          <ShieldAlert className="w-4.5 h-4.5 shrink-0" />
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="ml-auto underline hover:opacity-80">Dismiss</button>
        </div>
      )}

      {/* Main Mail layout */}
      <main className="flex-1 flex overflow-hidden min-h-0 min-w-0">
        
        {/* Left Side: Mail Priority Feed */}
        <aside className="w-full max-w-sm shrink-0 h-full flex flex-col min-w-0">
          <EmailList
            emails={emails}
            selectedEmailId={selectedEmailId}
            onSelectEmail={setSelectedEmailId}
            isLoading={isSyncing}
          />
        </aside>

        {/* Right Side: Deep Review & Actions */}
        <section className="flex-1 h-full flex flex-col min-w-0">
          <EmailDetail
            email={activeEmail}
            onSendReply={handleSendReply}
            isSending={isSending}
          />
        </section>

      </main>

      {/* Overlay Settings menu */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={onSaveSettings}
        accessToken={accessToken}
      />

    </div>
  );
}
