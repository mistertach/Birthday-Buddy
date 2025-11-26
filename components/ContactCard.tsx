import React, { useState } from 'react';
import { Contact, GreetingTemplate } from '../types';
import { getDaysUntil, getAgeTurning, getCategoryColor } from '../utils';
import { MessageCircle, Edit2, Sparkles, StickyNote, Link } from 'lucide-react';
import { AIGenerator } from './AIGenerator';

interface Props {
  contact: Contact;
  parentContact?: Contact;
  onWish: (contactId: string) => void;
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

  const daysUntil = getDaysUntil(contact.birthday);
  const turningAge = getAgeTurning(contact.birthday, contact.yearUnknown);
  
  const isToday = daysUntil === 0;
  const isSoon = daysUntil > 0 && daysUntil <= 7;
  const categoryColor = getCategoryColor(contact.relationship);

  // Format Date: "06 Jan"
  const dateObj = new Date(contact.birthday);
  const dayStr = dateObj.getUTCDate();
  const monthStr = dateObj.toLocaleString('default', { month: 'short', timeZone: 'UTC' });

  // Determine phone number to use (Parent's if linked, otherwise contact's)
  const phoneToUse = parentContact ? parentContact.phone : contact.phone;

  const handleWhatsApp = (msg: string) => {
    const text = encodeURIComponent(msg);
    const url = phoneToUse 
      ? `https://wa.me/${phoneToUse.replace(/\D/g, '')}?text=${text}`
      : `https://wa.me/?text=${text}`;
    
    window.open(url, '_blank');
    onWish(contact.id);
    setShowActions(false);
  };

  return (
    <div className={`group bg-white rounded-lg border transition-all hover:shadow-md ${isToday ? 'border-rose-200 ring-2 ring-rose-100' : 'border-slate-100'}`}>
      
      {/* Main Row */}
      <div className="flex items-center p-3 gap-3">
        
        {/* Date Box */}
        <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg border ${categoryColor} bg-opacity-10 shrink-0`}>
           <span className="text-sm font-bold leading-none">{dayStr}</span>
           <span className="text-[10px] uppercase font-medium leading-none mt-0.5">{monthStr}</span>
        </div>

        {/* Info Section */}
        <div className="flex-1 min-w-0">
           <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-800 truncate text-base">{contact.name}</h3>
              {/* Relationship Badge */}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border truncate max-w-[80px] ${categoryColor} bg-white`}>
                {contact.relationship}
              </span>
           </div>
           
           <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 mt-0.5">
              {/* Parent Link Indicator */}
              {parentContact && (
                 <span className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-1 rounded">
                    <Link size={10} />
                    via {parentContact.name}
                 </span>
              )}

              {/* Status Indicators */}
              {isToday && <span className="text-rose-600 font-bold flex items-center gap-1">🎉 TODAY</span>}
              {!isToday && isSoon && <span className="text-amber-600 font-medium">{daysUntil} days left</span>}
              {!isToday && !isSoon && <span>In {daysUntil} days</span>}

              {/* Age (Only if known) */}
              {!contact.yearUnknown && turningAge !== null && (
                 <>
                  <span>•</span>
                  <span>Turns {turningAge}</span>
                 </>
              )}
              {/* Notes Indicator */}
              {contact.notes && (
                  <>
                    <span>•</span>
                    <StickyNote size={10} className="text-slate-400" />
                  </>
              )}
           </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-1">
           <button 
              onClick={() => setShowActions(!showActions)}
              className={`p-2 rounded-full transition-colors ${showActions ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-50 hover:text-indigo-600'}`}
              title={parentContact ? `Message ${parentContact.name}` : "Send Wish"}
           >
              <MessageCircle size={18} />
           </button>

           <button 
             onClick={() => onEdit(contact)}
             className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
             title="Edit"
           >
             <Edit2 size={18} />
           </button>
        </div>
      </div>

      {/* Message Options (Expanded) */}
      {showActions && (
        <div className="px-3 pb-3 animate-slide-down">
           <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 grid gap-2">
              <button 
                onClick={() => setShowAI(true)}
                className="w-full flex items-center justify-center gap-2 p-2 rounded-md bg-white border border-indigo-100 text-indigo-600 hover:bg-indigo-50 text-sm font-medium transition-colors"
              >
                <Sparkles size={14} />
                Generate {parentContact ? `for ${parentContact.name}` : 'with AI'}...
              </button>
              <div className="grid grid-cols-1 gap-1">
                {PRESET_MESSAGES.map(m => (
                  <button
                    key={m.id}
                    onClick={() => handleWhatsApp(m.text)}
                    className="text-left text-xs p-2 bg-white border border-slate-200 rounded-md hover:border-slate-300 text-slate-700 truncate"
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
