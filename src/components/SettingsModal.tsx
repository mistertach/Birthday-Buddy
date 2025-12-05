import React, { useRef, useState } from 'react';
import { Download, Upload, X, Cloud, Tag, Plus, Mail, Send, Key, AlertCircle, Check, Info } from 'lucide-react';

interface Props {
  onClose: () => void;
  onExport: () => void;
  onImportJSON: (file: File) => void;
  onImportCSV: (file: File) => void;
  resendApiKey?: string;
  resendFromEmail?: string;
  onSaveResendConfig: (config: { apiKey: string; fromEmail: string }) => Promise<{ ok: boolean; message?: string }>;
  onSendTestEmail: () => Promise<{ ok: boolean; message?: string }>;
  categories: string[];
  onUpdateCategories: (newCats: string[]) => void;
}

export const SettingsModal: React.FC<Props> = ({ 
  onClose, 
  onExport, 
  onImportJSON, 
  onImportCSV, 
  resendApiKey = '',
  resendFromEmail = '',
  onSaveResendConfig,
  onSendTestEmail,
  categories,
  onUpdateCategories
}) => {
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [apiKey, setApiKey] = useState(resendApiKey);
  const [fromEmail, setFromEmail] = useState(resendFromEmail);
  const [isSavingResend, setIsSavingResend] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusState, setStatusState] = useState<'success' | 'error' | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  // Category State
  const [newCat, setNewCat] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'json' | 'csv') => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'json') onImportJSON(file);
      else onImportCSV(file);
    }
    e.target.value = '';
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCat.trim();
    if (trimmed && !categories.includes(trimmed)) {
      onUpdateCategories([...categories, trimmed]);
      setNewCat('');
    }
  };

  const handleDeleteCategory = (cat: string) => {
    if (confirm(`Remove "${cat}" category?`)) {
      onUpdateCategories(categories.filter(c => c !== cat));
    }
  };

  const handleSaveResend = async () => {
    try {
      setIsSavingResend(true);
      setStatusMessage(null);
      setStatusState(null);
      const result = await onSaveResendConfig({ apiKey, fromEmail });
      if (result.ok) {
        setStatusMessage(result.message ?? 'Resend settings saved.');
        setStatusState('success');
      } else {
        setStatusMessage(result.message ?? 'Failed to save Resend settings.');
        setStatusState('error');
      }
    } catch (error) {
      console.error(error);
      setStatusMessage('Failed to save Resend settings.');
      setStatusState('error');
    } finally {
      setIsSavingResend(false);
    }
  };

  const handleTestEmail = async () => {
    setIsTestingEmail(true);
    setStatusMessage(null);
    setStatusState(null);
    const result = await onSendTestEmail();
    setIsTestingEmail(false);
    if (result.ok) {
      setStatusMessage(result.message ?? 'Test email sent! Please check your inbox.');
      setStatusState('success');
    } else {
      setStatusMessage(result.message ?? 'Failed to send test email.');
      setStatusState('error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className="bg-slate-100 p-2 rounded-full">
                <Cloud size={20} className="text-indigo-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Settings</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="space-y-8">
            {/* Resend Email Settings */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex gap-3 items-start">
               <Mail size={20} className="text-indigo-600 shrink-0 mt-0.5" />
               <div className="space-y-3 w-full">
                 <div className="flex items-center justify-between">
                   <div>
                     <h3 className="text-sm font-bold text-slate-900">Email Notifications (Resend)</h3>
                     <p className="text-xs text-slate-700 leading-relaxed">
                       Configure your Resend credentials so Birthday Buddy can send reminders directly.
                     </p>
                   </div>
                 </div>

                 <div className="space-y-2">
                   <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                     <Key size={12} /> Resend API Key
                   </label>
                   <div className="relative">
                     <input
                       type={showApiKey ? 'text' : 'password'}
                       value={apiKey}
                       onChange={(e) => setApiKey(e.target.value)}
                       placeholder="re_..."
                       className="w-full text-sm p-2.5 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 bg-white text-slate-900"
                     />
                     <button
                       type="button"
                       onClick={() => setShowApiKey((prev) => !prev)}
                       className="absolute inset-y-0 right-0 px-3 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                     >
                       {showApiKey ? 'Hide' : 'Show'}
                     </button>
                   </div>
                 </div>

                 <div className="space-y-2">
                   <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                     <Send size={12} /> From Email Address
                   </label>
                   <input
                     type="email"
                     value={fromEmail}
                     onChange={(e) => setFromEmail(e.target.value)}
                     placeholder="reminders@yourdomain.com"
                     className="w-full text-sm p-2.5 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 bg-white text-slate-900"
                   />
                   <p className="text-[11px] text-slate-600">
                     Use a domain verified in Resend. For best deliverability set up SPF & DKIM.
                   </p>
                 </div>

                 <div className="flex flex-wrap gap-2">
                   <button
                     onClick={handleSaveResend}
                     disabled={isSavingResend}
                     className="inline-flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
                   >
                     {isSavingResend ? 'Saving...' : 'Save Resend Settings'}
                   </button>
                   <button
                     onClick={handleTestEmail}
                     disabled={isTestingEmail}
                     className="inline-flex items-center gap-2 bg-white text-indigo-600 border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-indigo-50 transition disabled:opacity-50"
                   >
                     <Send size={12} />
                     {isTestingEmail ? 'Sending...' : 'Send Test Email'}
                   </button>
                 </div>

                 {statusMessage && (
                   <div
                     className={`flex items-center gap-2 text-xs p-2 rounded-lg border ${
                       statusState === 'success'
                         ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                         : 'bg-rose-50 border-rose-200 text-rose-700'
                     }`}
                   >
                     {statusState === 'success' ? (
                       <Check size={14} />
                     ) : (
                       <AlertCircle size={14} />
                     )}
                     <span>{statusMessage}</span>
                   </div>
                 )}

                 <div className="bg-white border border-slate-200 rounded-lg p-3 text-[11px] text-slate-700 space-y-2">
                   <div className="flex items-center gap-2 font-semibold text-slate-900">
                     <Info size={12} /> Tips
                   </div>
                   <ul className="list-disc list-inside space-y-1">
                     <li className="leading-relaxed">Roles: You can still export/import CSV or JSON backups anytime.</li>
                     <li className="leading-relaxed">Automation: Scheduling of daily reminders is now handled inside Birthday Buddy.</li>
                     <li className="leading-relaxed">Security: Store a Resend key with "Full Access" or "Sending" permissions only.</li>
                   </ul>
                 </div>
               </div>
            </div>

            {/* Manage Categories */}
            <div className="space-y-3">
               <div className="flex items-center gap-2 mb-2">
                  <Tag size={18} className="text-indigo-700" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Manage Relationships</h3>
               </div>
                
               <div className="bg-white border border-slate-200 rounded-xl p-4">
                 <div className="flex flex-wrap gap-2 mb-4">
                   {categories.map(cat => (
                     <span key={cat} className="bg-slate-50 border border-slate-300 text-slate-700 text-xs font-medium px-2 py-1 rounded-lg flex items-center gap-1">
                        {cat}
                        <button onClick={() => handleDeleteCategory(cat)} className="text-slate-400 hover:text-red-500">
                          <X size={12} />
                        </button>
                     </span>
                   ))}
                 </div>
                 <form onSubmit={handleAddCategory} className="flex gap-2">
                    <input 
                      type="text" 
                      value={newCat} 
                      onChange={(e) => setNewCat(e.target.value)}
                      placeholder="New category..."
                      className="flex-1 text-sm p-2 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500"
                    />
                    <button type="submit" disabled={!newCat} className="bg-indigo-600 text-white p-2 rounded-lg disabled:opacity-50">
                      <Plus size={16} />
                    </button>
                 </form>
               </div>
            </div>

            {/* Manual Backup Section */}
            <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">Manual File Backup</h3>
                <div className="grid grid-cols-2 gap-3">
                    <button 
                        onClick={onExport}
                        className="flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors"
                    >
                        <Download size={16} />
                        Download JSON
                    </button>
                    <button 
                        onClick={() => jsonInputRef.current?.click()}
                        className="flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors"
                    >
                        <Upload size={16} />
                        Restore JSON
                    </button>
                </div>
                <input 
                    type="file" 
                    accept=".json" 
                    ref={jsonInputRef} 
                    className="hidden" 
                    onChange={(e) => handleFileChange(e, 'json')}
                />
            </div>

            {/* Import CSV */}
             <div className="space-y-2">
                <button 
                    onClick={() => csvInputRef.current?.click()}
                    className="w-full text-left p-3 rounded-lg text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-2"
                >
                    <Upload size={16} />
                    Import from CSV
                </button>
                 <input 
                    type="file" 
                    accept=".csv" 
                    ref={csvInputRef} 
                    className="hidden" 
                    onChange={(e) => handleFileChange(e, 'csv')}
                />
            </div>
            
        </div>
      </div>
    </div>
  );
};