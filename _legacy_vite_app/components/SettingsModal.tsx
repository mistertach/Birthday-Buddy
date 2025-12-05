import React, { useRef, useState } from 'react';
import { Download, Upload, FileSpreadsheet, X, Cloud, AlertCircle, Sheet, Copy, Check, ChevronDown, ChevronUp, RefreshCw, ArrowUpCircle, ArrowDownCircle, Info, Tag, Plus, Trash2, AlertTriangle, Mail, Clock, Send } from 'lucide-react';
import { APPS_SCRIPT_CODE, testEmailNotification } from '../services/sheets';

interface Props {
  onClose: () => void;
  onExport: () => void;
  onImportJSON: (file: File) => void;
  onImportCSV: (file: File) => void;
  currentSheetUrl: string;
  onSaveSheetUrl: (url: string) => void;
  onPull: () => void;
  onPush: () => void;
  categories: string[];
  onUpdateCategories: (newCats: string[]) => void;
}

export const SettingsModal: React.FC<Props> = ({ 
  onClose, 
  onExport, 
  onImportJSON, 
  onImportCSV, 
  currentSheetUrl, 
  onSaveSheetUrl, 
  onPull, 
  onPush,
  categories,
  onUpdateCategories
}) => {
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [sheetUrl, setSheetUrl] = useState(currentSheetUrl);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showEmailTutorial, setShowEmailTutorial] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  
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

  const handleCopyCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveUrl = () => {
    onSaveSheetUrl(sheetUrl);
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

  const handleTestEmail = async () => {
    if (!sheetUrl) return alert("Please save your Sheet URL first.");
    
    setIsTestingEmail(true);
    const success = await testEmailNotification(sheetUrl);
    setIsTestingEmail(false);
    
    if (success) {
        alert("Request sent! Check your Gmail inbox (or Spam folder). \n\nIf nothing arrives, ensure you have updated the Script Code and deployed it.");
    } else {
        alert("Failed to send request. Check your internet or Script URL.");
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
            {/* Reminder Info */}
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex gap-3 items-start">
               <Mail size={20} className="text-indigo-500 shrink-0 mt-0.5" />
               <div className="space-y-1 w-full">
                 <h3 className="text-sm font-bold text-indigo-800">Email Notifications</h3>
                 <p className="text-xs text-indigo-700 leading-relaxed mb-3">
                   Want daily or weekly birthday summaries sent to your Gmail?
                 </p>
                 
                 <div className="flex gap-2">
                    <button 
                        onClick={() => setShowEmailTutorial(!showEmailTutorial)}
                        className="text-xs font-bold bg-white text-indigo-600 px-3 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors"
                    >
                        {showEmailTutorial ? "Hide Instructions" : "Enable Auto-Emails"}
                    </button>
                    <button
                        onClick={handleTestEmail}
                        disabled={isTestingEmail || !currentSheetUrl}
                        className="flex items-center gap-1 text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                        <Send size={12} />
                        {isTestingEmail ? "Sending..." : "Send Test Email"}
                    </button>
                 </div>
                 
                 {showEmailTutorial && (
                    <div className="mt-3 bg-white p-3 rounded-lg border border-indigo-100 text-xs text-slate-600">
                        <ol className="list-decimal list-inside space-y-1.5">
                            <li>Ensure you have copied the new <strong>Script Code</strong> below.</li>
                            <li>Open your Google Sheet &gt; Extensions &gt; Apps Script.</li>
                            <li><strong>Update the FRONTEND_URL</strong> at the top of the script with your app link!</li>
                            <li>In the left sidebar, click the <strong>Clock Icon (Triggers)</strong>.</li>
                            <li>Click <strong>+ Add Trigger</strong> (bottom right).</li>
                            <li>Function to run: <strong>checkBirthdaysAndNotify</strong>.</li>
                            <li>Event Source: <strong>Time-driven</strong>.</li>
                            <li>Type: <strong>Day timer</strong> (e.g., 8am to 9am).</li>
                            <li>Click <strong>Save</strong>. (Allow permissions if asked).</li>
                        </ol>
                    </div>
                 )}
               </div>
            </div>

            {/* Manage Categories */}
            <div className="space-y-3">
               <div className="flex items-center gap-2 mb-2">
                  <Tag size={18} className="text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Manage Relationships</h3>
               </div>
               
               <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                 <div className="flex flex-wrap gap-2 mb-4">
                   {categories.map(cat => (
                     <span key={cat} className="bg-white border border-slate-200 text-slate-700 text-xs font-medium px-2 py-1 rounded-lg flex items-center gap-1">
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

            <hr className="border-slate-100" />

            {/* Google Sheets Sync Section */}
            <div className="space-y-3">
                 <div className="flex items-center gap-2 mb-2">
                    <FileSpreadsheet size={18} className="text-green-600" />
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Google Sheets Sync</h3>
                 </div>
                 
                 <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <div className="bg-rose-50 border border-rose-100 p-3 rounded-lg mb-4 flex gap-2">
                        <AlertTriangle size={24} className="text-rose-500 shrink-0" />
                        <div>
                            <p className="text-xs text-rose-800 font-bold mb-1">TRIPLE-COLUMN UPDATE REQUIRED</p>
                            <p className="text-[10px] text-rose-700 leading-tight">
                                To fix the "date shifted by 1 day" bug, we now use separate <strong>bDay, bMonth, bYear</strong> columns.
                                <br/>
                                1. Delete old 'birthday' column in Sheet.
                                <br/>
                                2. Copy Code below & Update Script.
                                <br/>
                                3. Click "Push to Cloud" to migrate data.
                            </p>
                        </div>
                    </div>

                    <p className="text-sm text-slate-600 mb-3">
                        Connect a Google Sheet to automatically read and write your contacts.
                    </p>
                    
                    <div className="flex gap-2 mb-3">
                        <input 
                            type="text" 
                            value={sheetUrl}
                            onChange={(e) => setSheetUrl(e.target.value)}
                            placeholder="Paste Web App URL here..."
                            className="flex-1 text-sm p-2.5 border border-slate-300 rounded-lg outline-none focus:border-indigo-500"
                        />
                        <button 
                            onClick={handleSaveUrl}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700"
                        >
                            Save
                        </button>
                    </div>

                    {/* Manual Sync Controls */}
                    {currentSheetUrl && (
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <button 
                                onClick={onPush}
                                className="flex flex-col items-center justify-center gap-1 bg-white border border-slate-200 p-3 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 transition-colors group"
                            >
                                <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                                    <ArrowUpCircle size={16} />
                                    <span>Push to Cloud</span>
                                </div>
                                <span className="text-[10px] text-slate-400 group-hover:text-indigo-400">Device → Sheet (Upload)</span>
                            </button>
                            <button 
                                onClick={onPull}
                                className="flex flex-col items-center justify-center gap-1 bg-white border border-slate-200 p-3 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 transition-colors group"
                            >
                                <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                                    <ArrowDownCircle size={16} />
                                    <span>Pull from Cloud</span>
                                </div>
                                <span className="text-[10px] text-slate-400 group-hover:text-indigo-400">Sheet → Device (Download)</span>
                            </button>
                        </div>
                    )}

                    <button 
                        onClick={() => setShowTutorial(!showTutorial)}
                        className="text-indigo-600 text-xs font-bold flex items-center gap-1 hover:underline"
                    >
                        {showTutorial ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                        {showTutorial ? "Hide Setup Instructions" : "How to set this up?"}
                    </button>

                    {showTutorial && (
                        <div className="mt-4 bg-white border border-slate-200 rounded-lg p-4 animate-slide-down">
                            <ol className="list-decimal list-inside text-xs text-slate-600 space-y-2 mb-4">
                                <li>Create a new Google Sheet.</li>
                                <li><strong>Rename Columns (Row 1) exactly:</strong></li>
                                <li className="font-mono text-[10px] bg-slate-100 p-1 rounded">id, name, bDay, bMonth, bYear, phone, relationship, reminderType, notes, lastWishedYear, parentId</li>
                                <li>Go to <strong>Extensions &gt; Apps Script</strong>.</li>
                                <li>Paste the code below (Replace old code).</li>
                                <li><strong>UPDATE the FRONTEND_URL</strong> at the top!</li>
                                <li>Click <strong>Deploy &gt; New Deployment</strong> (Select "New version"!).</li>
                                <li>Set Who has access: <strong>Anyone</strong>.</li>
                                <li>Click Deploy.</li>
                            </ol>

                            <div className="relative">
                                <pre className="bg-slate-900 text-slate-50 p-3 rounded-lg text-[10px] overflow-x-auto font-mono leading-relaxed">
                                    {APPS_SCRIPT_CODE}
                                </pre>
                                <button 
                                    onClick={handleCopyCode}
                                    className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white p-1.5 rounded-md transition-colors"
                                    title="Copy Code"
                                >
                                    {copied ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                            </div>
                        </div>
                    )}
                 </div>
            </div>

            <hr className="border-slate-100" />

            {/* Manual Backup Section */}
            <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Manual File Backup</h3>
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
                    className="w-full text-left p-3 rounded-lg text-sm text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors flex items-center gap-2"
                >
                    <FileSpreadsheet size={16} />
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