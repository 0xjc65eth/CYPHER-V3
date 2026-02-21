'use client';

import { useState } from 'react';
import { Bug, Send, CheckCircle, AlertTriangle, Info, Zap, Shield } from 'lucide-react';

type ReportType = 'bug' | 'error' | 'ui' | 'performance' | 'security';
type Severity = 'low' | 'medium' | 'high' | 'critical';

const REPORT_TYPES: { key: ReportType; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'bug', label: 'Bug', icon: Bug, color: '#ef4444' },
  { key: 'error', label: 'Error', icon: AlertTriangle, color: '#f59e0b' },
  { key: 'ui', label: 'UI Issue', icon: Info, color: '#3b82f6' },
  { key: 'performance', label: 'Performance', icon: Zap, color: '#8b5cf6' },
  { key: 'security', label: 'Security', icon: Shield, color: '#06b6d4' },
];

const SEVERITIES: { key: Severity; label: string; color: string }[] = [
  { key: 'low', label: 'Low', color: '#22c55e' },
  { key: 'medium', label: 'Medium', color: '#f59e0b' },
  { key: 'high', label: 'High', color: '#ef4444' },
  { key: 'critical', label: 'Critical', color: '#dc2626' },
];

export default function BugReportPage() {
  const [type, setType] = useState<ReportType>('bug');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; id?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setSubmitting(true);
    setResult(null);

    try {
      const res = await fetch('/api/bug-report/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, severity, title: title.trim(), description: description.trim(), steps: steps.trim(), email: email.trim() }),
      });
      const data = await res.json();
      setResult({ success: res.ok, message: data.message || data.error, id: data.id });
      if (res.ok) {
        setTitle('');
        setDescription('');
        setSteps('');
        setEmail('');
      }
    } catch {
      setResult({ success: false, message: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#0a0a0f] min-h-screen font-mono text-white">
      {/* Header */}
      <header className="border-b border-orange-500/30 bg-black/80 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Bug className="w-5 h-5 text-red-400" />
          <h1 className="text-lg font-bold tracking-wider">
            <span className="text-orange-500">CYPHER</span>{' '}
            <span className="text-gray-400">BUG REPORTER</span>
          </h1>
          <span className="text-[10px] text-orange-500/40 ml-auto uppercase tracking-widest">Help us improve</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-4">
        {/* Success Message */}
        {result?.success && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-green-400 font-bold">{result.message}</p>
              {result.id && <p className="text-[10px] text-green-400/60 mt-1">Report ID: {result.id}</p>}
            </div>
          </div>
        )}

        {/* Error Message */}
        {result && !result.success && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{result.message}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Report Type */}
          <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-4">
            <label className="text-[10px] text-orange-500/60 uppercase tracking-widest mb-3 block">Report Type</label>
            <div className="flex flex-wrap gap-2">
              {REPORT_TYPES.map(({ key, label, icon: Icon, color }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setType(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-all ${
                    type === key
                      ? 'border bg-opacity-20'
                      : 'border border-transparent text-gray-500 hover:text-gray-300'
                  }`}
                  style={type === key ? { borderColor: `${color}60`, backgroundColor: `${color}15`, color } : undefined}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Severity */}
          <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-4">
            <label className="text-[10px] text-orange-500/60 uppercase tracking-widest mb-3 block">Severity</label>
            <div className="flex gap-2">
              {SEVERITIES.map(({ key, label, color }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSeverity(key)}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                    severity === key
                      ? 'border'
                      : 'border border-transparent text-gray-500 hover:text-gray-300'
                  }`}
                  style={severity === key ? { borderColor: `${color}60`, backgroundColor: `${color}15`, color } : undefined}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-4">
            <label className="text-[10px] text-orange-500/60 uppercase tracking-widest mb-2 block">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the issue..."
              required
              className="w-full bg-black/50 border border-[#1a1a2e] rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-colors"
            />
          </div>

          {/* Description */}
          <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-4">
            <label className="text-[10px] text-orange-500/60 uppercase tracking-widest mb-2 block">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened, what you expected, and what actually occurred..."
              required
              rows={5}
              className="w-full bg-black/50 border border-[#1a1a2e] rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-colors resize-none"
            />
          </div>

          {/* Steps to Reproduce */}
          <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-4">
            <label className="text-[10px] text-orange-500/60 uppercase tracking-widest mb-2 block">Steps to Reproduce</label>
            <textarea
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
              rows={3}
              className="w-full bg-black/50 border border-[#1a1a2e] rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-colors resize-none"
            />
          </div>

          {/* Contact Email (optional) */}
          <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-4">
            <label className="text-[10px] text-orange-500/60 uppercase tracking-widest mb-2 block">Your Email (optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com - so we can follow up"
              className="w-full bg-black/50 border border-[#1a1a2e] rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-colors"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !title.trim() || !description.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500/20 border border-orange-500/40 rounded-lg text-orange-400 font-bold text-sm hover:bg-orange-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-orange-400/30 border-t-orange-400 rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit Bug Report
              </>
            )}
          </button>
        </form>

        <p className="text-[10px] text-gray-600 text-center">
          Reports are sent directly to the CYPHER development team. Include as much detail as possible.
        </p>
      </main>
    </div>
  );
}
