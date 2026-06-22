import React, { useState, useEffect } from 'react';
import { SheetEmail, Priority } from '../types';
import { Send, User, AlertCircle, FileText, ShieldAlert, Sparkles, SendToBack, Globe, Workflow } from 'lucide-react';

interface EmailDetailProps {
  email: SheetEmail | null;
  onSendReply: (to: string, subject: string, body: string, threadId?: string) => Promise<boolean>;
  isSending: boolean;
}

export default function EmailDetail({ email, onSendReply, isSending }: EmailDetailProps) {
  const [draftText, setDraftText] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync draft text on email change
  useEffect(() => {
    if (email) {
      setDraftText(email.draftReply || '');
      setAlertMessage(null);
    }
  }, [email]);

  if (!email) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-stone-950 p-8 text-center text-stone-500">
        <div className="p-4 rounded-full bg-stone-900 border border-stone-850 text-stone-400 mb-4 animate-pulse">
          <FileText className="w-8 h-8" />
        </div>
        <h3 className="font-sans font-medium text-stone-200">No Email Selected</h3>
        <p className="text-xs text-stone-500 max-w-[280px] mt-1 leading-relaxed">
          Select an email from the left sidebar to process priority records, review summaries, edit replies, and trigger workspace delivery.
        </p>
      </div>
    );
  }

  const { emailId, threadId, date, fromName, fromEmail, subject, direction, contactCategory, priority, summary, status, sentAt } = email;

  const priorityStyles = (p: Priority) => {
    switch (p) {
      case 'P1':
        return {
          banner: 'bg-gradient-to-r from-red-950/20 to-red-950/5 border border-red-500/20 text-red-400',
          badge: 'bg-red-500/10 text-red-400 border border-red-500/30',
          accent: 'text-red-400',
          btn: 'bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/20 text-white',
        };
      case 'P2':
        return {
          banner: 'bg-gradient-to-r from-amber-950/20 to-amber-950/5 border border-amber-500/20 text-amber-400',
          badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
          accent: 'text-amber-400',
          btn: 'bg-amber-600 hover:bg-amber-500 shadow-lg shadow-amber-600/20 text-stone-950',
        };
      case 'P3':
        return {
          banner: 'bg-gradient-to-r from-stone-900/60 to-stone-900/10 border border-stone-800 text-stone-400',
          badge: 'bg-stone-800 text-stone-400 border border-stone-750',
          accent: 'text-stone-400',
          btn: 'bg-stone-700 hover:bg-stone-600 shadow text-white',
        };
    }
  };

  const currentStyles = priorityStyles(priority);

  const handleSubmitSend = async () => {
    setShowConfirmModal(false);
    try {
      const success = await onSendReply(
        fromEmail,
        `Re: ${subject}`,
        draftText,
        threadId
      );
      if (success) {
        setAlertMessage({ type: 'success', text: `Draft approved & successfully dispatched via Gmail API!` });
      }
    } catch (err: any) {
      setAlertMessage({ type: 'error', text: err.message || 'Failed to send reply via Gmail API.' });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-stone-950 text-stone-100 overflow-y-auto min-w-0">
      
      {/* Top Banner Alert (Priority Indicator) */}
      <div className={`m-4 p-3.5 rounded-xl flex items-center justify-between gap-4 ${currentStyles.banner}`}>
        <div className="flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div className="text-xs">
            <span className="font-semibold font-sans">Priority Status: {priority}</span>
            <span className="opacity-80"> — Classified directly from Google Spreadsheet row database.</span>
          </div>
        </div>
        <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-md bg-stone-950/60 border border-stone-800">
          Executive View
        </span>
      </div>

      {/* Main Container */}
      <div className="p-6 pt-2 space-y-6 flex-1">
        {/* Email Headers Card */}
        <div className="bg-stone-900/30 rounded-xl p-5 border border-stone-900 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5 border-b border-stone-900 pb-3">
            <h1 className="font-sans font-semibold text-lg text-white leading-snug tracking-tight">
              {subject || '(No Subject)'}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span className="text-[10px] font-mono text-stone-500 uppercase tracking-widest leading-none">
                Email DB ID: <strong className="text-stone-400 select-all font-medium">{emailId || 'unknown'}</strong>
              </span>
              <span className="text-[10px] font-mono text-stone-500 uppercase tracking-widest leading-none">
                Thread Token: <strong className="text-stone-400 select-all font-medium">{threadId || 'unknown'}</strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs leading-relaxed text-stone-300">
            <div>
              <span className="text-stone-500 font-mono text-[10px] block uppercase tracking-wider mb-0.5">Sender Details:</span>
              <span className="font-medium text-stone-200">{fromName || 'Unknown'}</span>
              <span className="text-stone-400 font-mono text-[11px] block">{fromEmail}</span>
            </div>
            <div>
              <span className="text-stone-500 font-mono text-[10px] block uppercase tracking-wider mb-0.5">Date Logged:</span>
              <span className="text-stone-300">{date || 'Unknown'}</span>
            </div>
            <div>
              <span className="text-stone-500 font-mono text-[10px] block uppercase tracking-wider mb-0.5">Corporate Meta:</span>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {contactCategory && (
                  <span className="bg-stone-900 text-stone-350 px-1.5 py-0.5 rounded border border-stone-800 text-[10px] font-mono">
                    {contactCategory}
                  </span>
                )}
                {direction && (
                  <span className="bg-stone-900 text-stone-350 px-1.5 py-0.5 rounded border border-stone-800 text-[10px] font-mono">
                    {direction}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Panels Section */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-5">
          
          {/* Actionable Summary Panel (replaces Raw Body block) */}
          <div className="bg-stone-900/40 rounded-xl p-5 border border-stone-900/80 space-y-4">
            <div className="flex items-center gap-2 border-b border-stone-900/80 pb-3">
              <FileText className="w-4 h-4 text-emerald-450" />
              <h2 className="font-sans font-semibold text-sm text-stone-200">Email Abstract & Analysis</h2>
            </div>

            <div className="space-y-3.5">
              <div className="bg-emerald-950/5 border border-emerald-950/20 rounded-xl p-4 text-stone-200 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                <span className="text-emerald-500 font-mono text-[10px] block uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Spreadsheet Analytical Summary
                </span>
                {summary || 'No summary notes available for this email in the Spreadsheet database.'}
              </div>

              {/* Status information */}
              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-stone-400">
                <div className="flex items-center gap-1">
                  <Workflow className="w-3.5 h-3.5 text-stone-500" />
                  <span>Row Status: <strong className="text-stone-200">{status || 'Pending Review'}</strong></span>
                </div>
                {sentAt && (
                  <div className="flex items-center gap-1">
                    <SendToBack className="w-3.5 h-3.5 text-stone-500" />
                    <span>Dispatched Timestamp: <strong className="text-zinc-300 font-mono">{sentAt}</strong></span>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Draft Edit & Confirm Section */}
        <div className="bg-stone-900/40 rounded-xl p-5 border border-stone-900/80 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-900/80 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-450" />
              <h2 className="font-sans font-semibold text-sm text-stone-200">Interactive Draft Reply</h2>
            </div>
            <span className="bg-amber-400/10 text-amber-400 border border-amber-400/25 text-[10px] font-mono font-medium px-2 py-0.5 rounded-md">
              Customizable Response
            </span>
          </div>

          <div className="space-y-3">
            <textarea
              id="draft-editor"
              className="w-full bg-stone-950 border border-stone-850 focus:border-stone-700 focus:outline-none rounded-xl p-4 text-xs font-sans text-stone-200 leading-relaxed h-52 cursor-text resize-none"
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              placeholder="Edit or construct the corporate response reply..."
            />

            {/* Notification / Feedback Banner */}
            {alertMessage && (
              <div className={`p-3.5 rounded-lg border text-xs ${
                alertMessage.type === 'success'
                  ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400'
                  : 'bg-red-950/20 border-red-500/20 text-red-400'
              }`}>
                {alertMessage.text}
              </div>
            )}

            {/* Approve, Send controls */}
            <div className="flex items-center justify-end">
              <button
                id="send-reply-btn"
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={isSending || !draftText.trim()}
                className={`px-5 py-2.5 rounded-xl text-xs font-sans font-medium flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed ${currentStyles.btn}`}
              >
                <Send className="w-3.5 h-3.5" />
                {isSending ? 'Sending via Gmail API...' : 'Confirm & Send Draft'}
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Confirmation Modal (User Consent Guard) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl flex flex-col gap-4 text-stone-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-indigo-400 pb-1">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h3 className="font-sans font-semibold text-base text-white">Gmail Send Authorization</h3>
            </div>
            
            <p className="text-xs text-stone-300 leading-relaxed">
              Are you sure you want to send this approved reply to <span className="font-semibold text-indigo-400 font-mono select-all">{fromEmail}</span>?
            </p>

            <div className="bg-stone-950 p-3 rounded-lg border border-stone-850/80 max-h-24 overflow-y-auto text-[11px] text-stone-400 italic">
              "{draftText.substring(0, 150)}{draftText.length > 150 ? '...' : ''}"
            </div>

            <p className="text-[10px] text-stone-500 italic">
              * This triggers a mutating Gmail RFC822 request. Your reply will be linked to thread context ID: <strong>{threadId || 'new thread'}</strong>.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-stone-400 hover:text-stone-200 transition"
              >
                Cancel
              </button>
              <button
                id="authorize-confirm-send"
                type="button"
                onClick={handleSubmitSend}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-sans font-medium rounded-lg shadow-lg hover:shadow-indigo-600/10 transition"
              >
                Approve & Send
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
