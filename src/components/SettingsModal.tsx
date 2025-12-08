import React, { useRef, useState } from 'react';
import { Download, Upload, X, Database, FileText, Info } from 'lucide-react';

interface Props {
  onClose: () => void;
  onExport: () => void;
  onImportCSV: (file: File) => void;
  wantsNotifications: boolean;
  onToggleNotifications: (enabled: boolean) => Promise<void>;
}

export const SettingsModal: React.FC<Props> = ({
  onClose,
  onExport,
  onImportCSV,
  wantsNotifications,
  onToggleNotifications
}) => {
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async () => {
    setIsToggling(true);
    await onToggleNotifications(!wantsNotifications);
    setIsToggling(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportCSV(file);
    }
    e.target.value = '';
  };

  const downloadSampleCSV = () => {
    const sampleData = [
      ['name', 'day', 'month', 'year', 'relationship', 'phone', 'reminderType', 'notes'],
      ['John Doe', '15', '6', '1990', 'Friend', '+1234567890', 'MORNING', 'College friend'],
      ['Jane Smith', '23', '12', '', 'Family', '', 'DAY_BEFORE', 'Sister - no birth year'],
      ['Bob Johnson', '8', '3', '1985', 'Work', '+9876543210', 'WEEK_BEFORE', ''],
    ];

    const csvContent = sampleData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'birthday-buddy-sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-100 p-2 rounded-full">
              <Database size={20} className="text-indigo-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Settings</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Notifications Toggle */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Email Notifications</h3>
              <p className="text-sm text-slate-500">Receive birthday reminders via email</p>
            </div>
            <button
              onClick={handleToggle}
              disabled={isToggling}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${wantsNotifications ? 'bg-indigo-600' : 'bg-slate-300'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${wantsNotifications ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>
          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">CSV Format Required</p>
                <p className="text-blue-800">Use CSV files to backup and restore your contacts. Download a sample to see the correct format.</p>
              </div>
            </div>
          </div>

          {/* Required Columns */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <FileText size={16} className="text-indigo-600" />
              Required CSV Columns
            </h3>
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="font-mono font-semibold text-indigo-600">name</span>
                  <span className="text-slate-600 ml-2">(required)</span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="font-mono font-semibold text-indigo-600">day</span>
                  <span className="text-slate-600 ml-2">(1-31)</span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="font-mono font-semibold text-indigo-600">month</span>
                  <span className="text-slate-600 ml-2">(1-12)</span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="font-mono font-semibold text-slate-600">year</span>
                  <span className="text-slate-600 ml-2">(optional)</span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="font-mono font-semibold text-slate-600">relationship</span>
                  <span className="text-slate-600 ml-2">(optional)</span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="font-mono font-semibold text-slate-600">phone</span>
                  <span className="text-slate-600 ml-2">(optional)</span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="font-mono font-semibold text-slate-600">reminderType</span>
                  <span className="text-slate-600 ml-2">(optional)</span>
                </div>
              </div>
              <div className="bg-white p-2 rounded border border-slate-200">
                <span className="font-mono font-semibold text-slate-600">notes</span>
                <span className="text-slate-600 ml-2">(optional - any additional info)</span>
              </div>
            </div>
          </div>

          {/* Sample CSV Download */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Get Started</h3>
            <button
              onClick={downloadSampleCSV}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg text-sm font-semibold hover:bg-green-700 transition-all shadow-md hover:shadow-lg"
            >
              <Download size={16} />
              Download Sample CSV
            </button>
            <p className="text-xs text-slate-600 text-center">
              Download a sample file to see the correct format and column headers
            </p>
          </div>

          {/* Export Your Data */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Export Your Data</h3>
            <button
              onClick={onExport}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg"
            >
              <Download size={16} />
              Download My Contacts (CSV)
            </button>
            <p className="text-xs text-slate-600 text-center">
              Export all your contacts to a CSV file for backup
            </p>
          </div>

          {/* Import CSV */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Import Contacts</h3>
            <button
              onClick={() => csvInputRef.current?.click()}
              className="w-full p-3 rounded-lg text-sm font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 hover:border-slate-400"
            >
              <Upload size={16} />
              Upload CSV File
            </button>
            <input
              type="file"
              accept=".csv"
              ref={csvInputRef}
              className="hidden"
              onChange={handleFileChange}
            />
            <p className="text-xs text-slate-600 text-center">
              Import contacts from a CSV file (will be added to existing contacts)
            </p>
          </div>

          {/* Help Text */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
            <p className="font-semibold mb-1">💡 Tips</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Make sure your CSV has the column headers in the first row</li>
              <li>Leave year empty if you don't know the birth year</li>
              <li>Use relationship categories: Work, Family, Friends, or Other</li>
              <li>Phone numbers can include country codes (e.g., +1234567890)</li>
              <li>Reminder types: MORNING, DAY_BEFORE, WEEK_BEFORE (defaults to MORNING if empty)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};