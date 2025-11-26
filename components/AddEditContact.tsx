import React, { useState } from 'react';
import { Contact, ReminderType } from '../types';
import { X, Calendar, User, Phone, Tag, Bell, StickyNote, Baby } from 'lucide-react';

interface Props {
  onSave: (contact: Contact) => void;
  onClose: () => void;
  initialData?: Contact;
  categories: string[];
  contacts: Contact[];
}

export const AddEditContact: React.FC<Props> = ({ onSave, onClose, initialData, categories, contacts }) => {
  const [name, setName] = useState(initialData?.name || '');
  
  // Clean date string to ensure it fits HTML date input (YYYY-MM-DD), removing any time parts
  const initialDate = initialData?.birthday ? initialData.birthday.split('T')[0] : '';
  const [date, setDate] = useState(initialDate);
  
  const [yearUnknown, setYearUnknown] = useState(initialData?.yearUnknown || false);
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [relationship, setRelationship] = useState<string>(initialData?.relationship || categories[0] || 'Friend');
  const [reminder, setReminder] = useState<ReminderType>(initialData?.reminderType || ReminderType.MORNING);
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [parentId, setParentId] = useState(initialData?.parentId || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !date) return;

    // If year is unknown, we ensure the date is stored with a leap-year safe year (e.g., 2000)
    let finalDate = date;
    if (yearUnknown) {
        const parts = date.split('-');
        if (parts.length === 3) {
            // Keep month and day, set year to 2000
            finalDate = `2000-${parts[1]}-${parts[2]}`;
        }
    }

    const contact: Contact = {
      id: initialData?.id || Date.now().toString(),
      name,
      birthday: finalDate,
      yearUnknown,
      phone,
      relationship,
      reminderType: reminder,
      notes,
      lastWishedYear: initialData?.lastWishedYear,
      parentId: parentId || undefined
    };
    onSave(contact);
  };

  // Filter possible parents (exclude self)
  const possibleParents = contacts
    .filter(c => c.id !== initialData?.id)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-40 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto animate-slide-up sm:animate-fade-in">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-900">
            {initialData ? 'Edit Buddy' : 'New Birthday'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <User size={12} /> Name
            </label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah Connor"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Calendar size={12} /> Date of Birth
              </label>
              <div className="flex gap-3">
                  <input
                    required
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <label className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl bg-white cursor-pointer hover:bg-slate-50 transition-colors">
                    <input 
                        type="checkbox" 
                        checked={yearUnknown}
                        onChange={(e) => setYearUnknown(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                    />
                    <span className="text-sm text-slate-600 font-medium whitespace-nowrap">Year Unknown</span>
                  </label>
              </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Phone size={12} /> Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 234..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
            </div>
            
            <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Baby size={12} /> Linked Parent
                </label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 text-sm"
                >
                  <option value="">None (Independent)</option>
                  {possibleParents.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
            </div>
          </div>
          
          {parentId && (
             <div className="text-xs text-indigo-600 bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                Messages for <strong>{name}</strong> will be sent to the parent.
             </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Tag size={12} /> Relationship
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setRelationship(cat)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                    relationship === cat
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-medium'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Bell size={12} /> Reminder
            </label>
            <select
              value={reminder}
              onChange={(e) => setReminder(e.target.value as ReminderType)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700"
            >
              {Object.values(ReminderType).map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <StickyNote size={12} /> Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Gift ideas, likes, dislikes..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-lg hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-indigo-200"
          >
            Save Buddy
          </button>
        </form>
      </div>
    </div>
  );
};
