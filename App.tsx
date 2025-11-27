
import React, { useState, useEffect, useMemo } from 'react';
import { Contact, StreakData } from './types';
import { loadContacts, saveContacts, loadStreak, updateStreak, getDaysUntil, seedData, downloadBackup, loadCategories, saveCategories, getCategoryDotColor, getNextBirthday, getBirthdayStatus, getVisualDate } from './utils';
import { syncFromSheet, syncToSheet } from './services/sheets';
import { AddEditContact } from './components/AddEditContact';
import { ContactCard } from './components/ContactCard';
import { ContactDetailModal } from './components/ContactDetailModal';
import { SettingsModal } from './components/SettingsModal';
import { 
  Plus, 
  Search, 
  Calendar as CalendarIcon, 
  List, 
  Flame, 
  Settings,
  Loader2,
  RefreshCw
} from 'lucide-react';

const DEFAULT_SHEET_URL = "https://script.google.com/macros/s/AKfycbzBVERY0cI0KL-oc9jC3JsNOQz-0CeqjBj5xoAoDbnUYH0FbVdzPowv6Xt1o7fpguPf/exec";

function App() {
  // State
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [streak, setStreak] = useState<StreakData>({ count: 0, lastWishedDate: null });
  const [categories, setCategories] = useState<string[]>([]);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | undefined>(undefined);
  const [selectedContact, setSelectedContact] = useState<Contact | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRel, setFilterRel] = useState<string>('All');
  
  // Cloud Sync State
  const [sheetUrl, setSheetUrl] = useState(() => {
    const stored = localStorage.getItem('confetti_sheet_url');
    return stored !== null ? stored : DEFAULT_SHEET_URL;
  });
  const [isSyncing, setIsSyncing] = useState(false);

  // Load Data Initial
  useEffect(() => {
    const loadedStreak = loadStreak();
    setStreak(loadedStreak);
    setCategories(loadCategories());

    const loadData = async () => {
      const localContacts = loadContacts();
      const isOldDefault = localContacts.length > 0 && 
                           localContacts.length <= 3 && 
                           localContacts.some(c => c.name === 'Alice Johnson');

      if (localContacts.length > 0 && !isOldDefault) {
        setContacts(localContacts);
      } else {
        setContacts(seedData);
        saveContacts(seedData);
      }

      if (sheetUrl) {
        await handlePullFromCloud(sheetUrl, false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateContacts = async (newContacts: Contact[]) => {
      setContacts(newContacts);
      saveContacts(newContacts); 
      if (sheetUrl) {
          setIsSyncing(true);
          syncToSheet(sheetUrl, newContacts).finally(() => setIsSyncing(false));
      }
  };

  const handleUpdateCategories = (newCats: string[]) => {
    setCategories(newCats);
    saveCategories(newCats);
  };

  const handlePullFromCloud = async (url: string = sheetUrl, showAlert = true) => {
    if (!url) return;
    setIsSyncing(true);
    try {
        const cloudContacts = await syncFromSheet(url);
        if (cloudContacts && Array.isArray(cloudContacts)) {
            if (cloudContacts.length > 0) {
              setContacts(cloudContacts);
              saveContacts(cloudContacts);
              if (showAlert) alert(`Synced! Loaded ${cloudContacts.length} contacts from Sheet.`);
            } else if (showAlert) {
              alert("Connected to Sheet, but it is empty. Use 'Push' to upload your local contacts.");
            }
        }
    } catch (e) {
        console.error("Sync failed", e);
        if (showAlert) alert("Sync failed. Check your URL and Internet connection.");
    } finally {
        setIsSyncing(false);
    }
  };

  const handlePushToCloud = async (url: string = sheetUrl) => {
    if (!url) return;
    setIsSyncing(true);
    try {
      const success = await syncToSheet(url, contacts);
      if (success) {
        alert("Success! Your contacts have been saved to the Google Sheet.");
      } else {
        alert("Failed to save to Google Sheet. Check console for details.");
      }
    } catch (e) {
      alert("Error pushing to cloud.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveContact = (contact: Contact) => {
    let updated;
    if (editingContact) {
      updated = contacts.map(c => c.id === contact.id ? contact : c);
    } else {
      updated = [...contacts, contact];
    }
    updateContacts(updated);
    setIsModalOpen(false);
    setEditingContact(undefined);
  };

  const handleDelete = (id: string) => {
      if(confirm("Delete this contact?")) {
          const updated = contacts.filter(c => c.id !== id);
          updateContacts(updated);
      }
  };

  const handleWish = (id: string, forceState?: boolean) => {
    const updated = contacts.map(c => {
        if (c.id === id) {
            const currentYear = new Date().getFullYear();
            // If forceState is true: Mark wished (year = current)
            // If forceState is false: Unmark (year = undefined)
            // If undefined: Default to Mark wished
            const shouldMark = forceState !== undefined ? forceState : true;
            
            if (shouldMark) {
               updateStreak(); // Only increment streak on positive wish
               return { ...c, lastWishedYear: currentYear };
            } else {
               return { ...c, lastWishedYear: undefined };
            }
        }
        return c;
    });
    setStreak(loadStreak()); // Refresh streak UI
    updateContacts(updated);
  };

  const handleSheetUrlSave = (url: string) => {
      setSheetUrl(url);
      localStorage.setItem('confetti_sheet_url', url);
      if (url) handlePullFromCloud(url, true);
  };

  const handleExport = () => {
    downloadBackup({ contacts, streak, categories });
  };

  const handleImportJSON = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const data = JSON.parse(text);
        if (data.contacts && Array.isArray(data.contacts)) {
          if (confirm(`Restore ${data.contacts.length} contacts?`)) {
            updateContacts(data.contacts);
            if (data.streak) {
              setStreak(data.streak);
              localStorage.setItem('confetti_streak', JSON.stringify(data.streak));
            }
            if (data.categories && Array.isArray(data.categories)) {
              setCategories(data.categories);
              saveCategories(data.categories);
            }
            setIsSettingsOpen(false);
            alert("Restored successfully!");
          }
        }
      } catch (e) {
        alert("Failed to parse file.");
      }
    };
    reader.readAsText(file);
  };

  const handleImportCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split('\n').slice(1);
      const newContacts: Contact[] = [];
      lines.forEach((line) => {
        const [name, date, phone] = line.split(',');
        if (name && date) {
          newContacts.push({
            id: Date.now().toString() + Math.random(),
            name: name.trim(),
            birthday: date.trim(),
            phone: phone?.trim(),
            relationship: 'Other',
            reminderType: 'Morning of' as any
          });
        }
      });
      if (newContacts.length > 0) {
        updateContacts([...contacts, ...newContacts]);
        setIsSettingsOpen(false);
        alert(`Imported ${newContacts.length} contacts!`);
      }
    };
    reader.readAsText(file);
  };

  const sortedContacts = useMemo(() => {
    let filtered = contacts.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    if (filterRel !== 'All') {
      filtered = filtered.filter(c => c.relationship === filterRel);
    }

    // Sort using visual date (keeps current month passed dates at the top)
    return filtered.sort((a, b) => {
      const dateA = getVisualDate(a.birthday);
      const dateB = getVisualDate(b.birthday);
      return dateA.getTime() - dateB.getTime();
    });
  }, [contacts, searchQuery, filterRel]);

  const renderListWithSeparators = () => {
    const groups: React.ReactNode[] = [];
    let lastMonth = '';

    sortedContacts.forEach((contact) => {
        // Use visual date for headers too, so they match the sorting
        const visualDate = getVisualDate(contact.birthday);
        const monthName = visualDate.toLocaleString('default', { month: 'long' });
        
        if (monthName !== lastMonth) {
            groups.push(
                <div key={`header-${monthName}`} className="sticky top-[138px] z-10 py-2 bg-slate-50/95 backdrop-blur-sm">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest pl-1">{monthName}</h3>
                </div>
            );
            lastMonth = monthName;
        }

        const parent = contact.parentId ? contacts.find(c => c.id === contact.parentId) : undefined;

        groups.push(
            <ContactCard 
                key={contact.id} 
                contact={contact} 
                parentContact={parent}
                onWish={handleWish} 
                onEdit={(c) => { setEditingContact(c); setIsModalOpen(true); }} 
            />
        );
    });

    if (groups.length === 0) {
        return (
            <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200 mt-4">
                <p className="text-slate-400">No birthdays found.</p>
                <button onClick={() => setIsModalOpen(true)} className="text-indigo-600 font-semibold mt-2">Add one now</button>
            </div>
        );
    }

    return <div className="space-y-2 pb-20">{groups}</div>;
  };

  const calendarMonths = useMemo(() => {
      const currentMonthIdx = new Date().getMonth(); 
      const months = [];
      for(let i=0; i<12; i++) {
          const mIdx = (currentMonthIdx + i) % 12;
          months.push(mIdx);
      }
      return months;
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 pb-20 max-w-xl mx-auto shadow-2xl shadow-slate-200 border-x border-slate-100 relative">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Birthday Buddy <span className="text-indigo-500">(BB)</span></h1>
          <p className="text-xs text-slate-500 font-medium">
             {isSyncing ? <span className="flex items-center gap-1 text-indigo-500"><Loader2 size={10} className="animate-spin"/> Syncing...</span> : 'Never miss a moment'}
          </p>
        </div>
        <div className="flex items-center gap-2">
            {sheetUrl && (
              <button
                onClick={() => handlePullFromCloud()}
                className={`p-2 rounded-full transition-colors ${isSyncing ? 'text-indigo-400' : 'text-slate-400 hover:bg-slate-100'}`}
                title="Sync from Cloud"
              >
                <RefreshCw size={18} className={isSyncing ? "animate-spin" : ""} />
              </button>
            )}
            <button 
                onClick={() => setIsSettingsOpen(true)}
                className={`p-2 rounded-full transition-colors ${sheetUrl ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-slate-400 hover:bg-slate-100'}`}
                title="Settings & Backup"
            >
                <Settings size={20} />
            </button>
            <div className="flex items-center gap-1 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100 ml-1">
                <Flame size={16} className="text-orange-500 fill-orange-500" />
                <span className="text-sm font-bold text-orange-700">{streak.count}</span>
            </div>
        </div>
      </header>

      <main className="p-4 space-y-4">
        <div className="flex flex-col gap-3 sticky top-[73px] z-20 bg-slate-50 pb-2">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Find someone..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                />
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                <button 
                    onClick={() => setFilterRel('All')}
                    className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filterRel === 'All' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
                >
                    All
                </button>
                {categories.map(r => (
                    <button 
                        key={r}
                        onClick={() => setFilterRel(r)}
                        className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filterRel === r ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
                    >
                        {r}
                    </button>
                ))}
            </div>
        </div>

        {view === 'list' ? (
            <div className="animate-fade-in">
                {renderListWithSeparators()}
            </div>
        ) : (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 text-center animate-fade-in">
                <CalendarIcon size={48} className="mx-auto text-slate-200 mb-4" />
                <h3 className="text-lg font-bold text-slate-800">Calendar View</h3>
                <p className="text-slate-500 mb-6">Tap a name to see details.</p>
                
                <div className="grid grid-cols-1 gap-4 text-left">
                    {calendarMonths.map((monthIndex) => {
                        const monthContacts = contacts.filter(c => new Date(c.birthday).getUTCMonth() === monthIndex);
                        monthContacts.sort((a,b) => new Date(a.birthday).getUTCDate() - new Date(b.birthday).getUTCDate());

                        if (monthContacts.length === 0) return null;
                        
                        const monthName = new Date(2024, monthIndex, 1).toLocaleString('default', { month: 'long' });
                        
                        return (
                            <div key={monthIndex} className="border-b border-slate-100 last:border-0 pb-3">
                                <h4 className="font-bold text-indigo-900 mb-2 text-sm sticky top-0 bg-white py-1">{monthName}</h4>
                                <div className="flex flex-wrap gap-2">
                                    {monthContacts.map(c => {
                                      const status = getBirthdayStatus(c);
                                      // Status Color Logic
                                      let dotColor = getCategoryDotColor(c.relationship);
                                      if (status === 'missed') dotColor = 'bg-rose-500';
                                      if (status === 'wished') dotColor = 'bg-green-500';

                                      return (
                                        <button 
                                            key={c.id} 
                                            onClick={() => setSelectedContact(c)}
                                            className="bg-slate-50 hover:bg-slate-100 active:scale-95 transition-all text-xs px-2.5 py-1.5 rounded-lg border border-slate-100 flex items-center gap-2 group"
                                        >
                                            <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>
                                            <span className="font-semibold text-slate-400 group-hover:text-slate-600 w-4 text-right">{new Date(c.birthday).getUTCDate()}</span>
                                            <span className="font-medium text-slate-700">{c.name}</span>
                                        </button>
                                      );
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        )}
      </main>

      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-300 flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-20"
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-3 flex justify-around items-center z-30 max-w-xl mx-auto">
        <button 
            onClick={() => setView('list')}
            className={`flex flex-col items-center gap-1 ${view === 'list' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
            <List size={24} />
            <span className="text-[10px] font-medium">List</span>
        </button>
        <button 
            onClick={() => setView('calendar')}
            className={`flex flex-col items-center gap-1 ${view === 'calendar' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
            <CalendarIcon size={24} />
            <span className="text-[10px] font-medium">Calendar</span>
        </button>
      </nav>

      {isModalOpen && (
        <AddEditContact 
            onClose={() => { setIsModalOpen(false); setEditingContact(undefined); }} 
            onSave={handleSaveContact}
            initialData={editingContact}
            categories={categories}
            contacts={contacts}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal 
            onClose={() => setIsSettingsOpen(false)}
            onExport={handleExport}
            onImportJSON={handleImportJSON}
            onImportCSV={handleImportCSV}
            currentSheetUrl={sheetUrl}
            onSaveSheetUrl={handleSheetUrlSave}
            onPull={() => handlePullFromCloud(sheetUrl)}
            onPush={() => handlePushToCloud(sheetUrl)}
            categories={categories}
            onUpdateCategories={handleUpdateCategories}
        />
      )}

      {selectedContact && (
         <ContactDetailModal 
            contact={selectedContact}
            parentContact={selectedContact.parentId ? contacts.find(c => c.id === selectedContact.parentId) : undefined}
            onWish={handleWish}
            onEdit={(c) => { setSelectedContact(undefined); setEditingContact(c); setIsModalOpen(true); }}
            onClose={() => setSelectedContact(undefined)}
         />
      )}

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slide-down {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-slide-down { animation: slide-down 0.2s ease-out; }
        .animate-fade-in { animation: fade-in 0.4s ease-out; }
      `}</style>
    </div>
  );
}

export default App;
