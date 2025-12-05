import React, { useState } from 'react';
import { Contact, GreetingTemplate } from '../lib/types';
import { getDaysUntil, getAgeTurning, getCategoryColor, getBirthdayStatus } from '../lib/utils';
import { MessageCircle, Edit2, Sparkles, StickyNote, Link, Check, CheckCircle } from 'lucide-react';
import { AIGenerator } from './AIGenerator';

interface Props {
  contact: Contact;
  parentContact?: Contact;
  onWish: (contactId: string, status?: boolean) => void;
  onEdit: (contact: Contact) => void;
}

const PRESET_MESSAGES: GreetingTemplate[] = [
  { id: '1', text: 'Hope you’re having a great day! 🎉', category: 'Casual' },
  { id: '2', text: 'Wishing you a year full of good things!', category: 'Warm' },
  { id: '3', text: 'Happy Birthday! Have a blast! 🎂', category: 'Casual' },
];

export const ContactCard: React.FC<Props> = ({ contact, parentContact, onWish, onEdit }) => {
  const [showActions, setShowActions] = useState(false);
  const [showAI, setShowAI] = useState(false);

  const daysUntil = getDaysUntil(contact.day, contact.month);
  const turningAge = getAgeTurning(contact.day, contact.month, contact.year);
  const status = getBirthdayStatus(contact);

  const isToday = status === 'today';
  const isMissed = status === 'missed';
  const isWished = status === 'wished';

  const categoryColor = getCategoryColor(contact.relationship);

  // Month Display
  const date = new Date(2000, contact.month - 1, contact.day);
  const monthStr = date.toLocaleString('default', { month: 'short' });

  const phoneToUse = parentContact ? parentContact.phone : contact.phone;

  const handleWhatsApp = (msg: string) => {
    const text = encodeURIComponent(msg);
    const url = phoneToUse
      ? `https://wa.me/${phoneToUse.replace(/\D/g, '')}?text=${text}`
      : `https://wa.me/?text=${text}`;

    window.open(url, '_blank');
    onWish(contact.id, true);
    setShowActions(false);
  };

  const toggleWished = () => {
    onWish(contact.id, !isWished);
  };

  // Dynamic Styles based on Status
  let borderClass = 'border-slate-100';
  if (isToday) borderClass = 'border-rose-200 ring-2 ring-rose-100 bg-rose-50/20';
  if (isMissed) borderClass = 'border-red-200 bg-red-50/30';
  if (isWished) borderClass = 'border-green-200 bg-green-50/50 opacity-75';

  return (
    <div className={`group bg-white rounded-lg border transition-all hover:shadow-md ${borderClass}`}>

      {/* Main Row */}
      <div className="flex items-center p-3 gap-3">

        {/* Toggle Button (Tick) */}
        <button
          onClick={toggleWished}
          className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all border ${isWished
              ? 'bg-green-500 border-green-500 text-white'
              : 'bg-white border-slate-300 text-transparent hover:border-green-500/60 hover:text-green-400'
            }`}
          title={isWished ? "Mark as Pending" : "Mark as Wished"}
        >
          <Check size={16} strokeWidth={3} />
        </button>

        {/* Date Box */}
        <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg border ${categoryColor} bg-opacity-10 shrink-0`}>
          <span className="text-sm font-bold leading-none">{contact.day}</span>
          <span className="text-[10px] uppercase font-medium leading-none mt-0.5">{monthStr}</span>
        </div>

        {/* Info Section */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`font-semibold text-base truncate ${isWished ? 'text-slate-600 line-through' : 'text-slate-900'}`}>
              {contact.name}
            </h3>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border truncate max-w-[80px] ${categoryColor} bg-white`}>
              {contact.relationship}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-700 mt-0.5">
            {parentContact && (
              <span className="flex items-center gap-1 text-indigo-700 bg-indigo-100 px-1 rounded">
                <Link size={10} />
                via {parentContact.name}
              </span>
            )}

            {isMissed && <span className="text-red-600 font-semibold flex items-center gap-1">⚠️ MISSED</span>}
            {isToday && <span className="text-rose-600 font-semibold flex items-center gap-1">🎉 TODAY</span>}

            {!isToday && !isMissed && daysUntil <= 7 && <span className="text-amber-600 font-medium">{daysUntil} days left</span>}
            {!isToday && !isMissed && daysUntil > 7 && <span className="text-slate-700">In {daysUntil} days</span>}

            {contact.year && turningAge !== null && (
              <>
                <span>•</span>
                <span className="text-slate-700">Turns {turningAge}</span>
              </>
            )}
            {contact.notes && (
              <>
                <span>•</span>
                <StickyNote size={10} className="text-slate-500" />
              </>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowActions(!showActions)}
            className={`p-2 rounded-full transition-colors ${showActions ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100 hover:text-indigo-600'}`}
            title="Send Message"
          >
            <MessageCircle size={18} />
          </button>

          <button
            onClick={() => onEdit(contact)}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
            title="Edit"
          >
            <Edit2 size={18} />
          </button>
        </div>
      </div>

      {/* Message Options (Expanded) */}
      {showActions && (
        <div className="px-3 pb-3 animate-slide-down">
          <div className="bg-slate-100 border border-slate-200 rounded-lg p-2 grid gap-2">
            <button
              onClick={() => setShowAI(true)}
              className="w-full flex items-center justify-center gap-2 p-2 rounded-md bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-sm font-semibold transition-colors"
            >
              <Sparkles size={14} />
              Generate {parentContact ? `for ${parentContact.name}` : 'with AI'}...
            </button>
            <div className="grid grid-cols-1 gap-1">
              {PRESET_MESSAGES.map(m => (
                <button
                  key={m.id}
                  onClick={() => handleWhatsApp(m.text)}
                  className="text-left text-xs p-2 bg-white border border-slate-300 rounded-md hover:border-slate-400 text-slate-800 truncate"
                >
                  {m.text}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showAI && (
        <AIGenerator
          contact={contact}
          parentName={parentContact?.name}
          onClose={() => setShowAI(false)}
          onUse={(msg) => {
            handleWhatsApp(msg);
            setShowAI(false);
          }}
        />
      )}
    </div>
  );
};