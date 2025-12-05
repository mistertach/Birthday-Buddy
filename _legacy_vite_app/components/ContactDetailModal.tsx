import React, { useState } from 'react';
import { Contact, GreetingTemplate } from '../types';
import { getAgeTurning, formatDateFriendly, getCategoryColor, getBirthdayStatus } from '../utils';
import { X, Phone, User, Calendar, StickyNote, Edit2, Sparkles, ExternalLink, Link, CheckCircle, Circle } from 'lucide-react';
import { AIGenerator } from './AIGenerator';

interface Props {
  contact: Contact;
  parentContact?: Contact;
  onClose: () => void;
  onEdit: (c: Contact) => void;
  onWish: (id: string, status?: boolean) => void;
}

const PRESET_MESSAGES: GreetingTemplate[] = [
  { id: '1', text: 'Hope you’re having a great day! 🎉', category: 'Casual' },
  { id: '2', text: 'Happy Birthday! Have a blast! 🎂', category: 'Casual' },
];

export const ContactDetailModal: React.FC<Props> = ({ contact, parentContact, onClose, onEdit, onWish }) => {
  const [showAI, setShowAI] = useState(false);
  const categoryColor = getCategoryColor(contact.relationship);
  const turningAge = getAgeTurning(contact.day, contact.month, contact.year);
  const formattedDate = formatDateFriendly(contact.day, contact.month, contact.year);
  const status = getBirthdayStatus(contact);
  const isWished = status === 'wished';

  const phoneToUse = parentContact ? parentContact.phone : contact.phone;

  const handleWhatsApp = (msg: string) => {
    const text = encodeURIComponent(msg);
    const url = phoneToUse 
      ? `https://wa.me/${phoneToUse.replace(/\D/g, '')}?text=${text}`
      : `https://wa.me/?text=${text}`;
    
    window.open(url, '_blank');
    onWish(contact.id, true);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-fade-in flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-slate-100 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2 mb-2">
                <h2 className="text-2xl font-bold text-slate-900">{contact.name}</h2>
                <button onClick={() => onEdit(contact)} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors rounded-full hover:bg-indigo-50">
                    <Edit2 size={16} />
                </button>
            </div>
            <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-md text-xs font-bold border ${categoryColor} bg-white`}>
                    {contact.relationship}
                </span>
                {parentContact && (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                        <Link size={10} />
                        via {parentContact.name}
                    </span>
                )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body (Scrollable) */}
        <div className="p-6 overflow-y-auto space-y-6">
            
            {/* Status Toggle */}
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
               <span className="text-sm font-semibold text-slate-700">Birthday Status</span>
               <button 
                  onClick={() => onWish(contact.id, !isWished)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                     isWished ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-white text-slate-500 border border-slate-300'
                  }`}
               >
                  {isWished ? (
                    <> <CheckCircle size={14}/> Wished </>
                  ) : (
                    <> <Circle size={14}/> Pending </>
                  )}
               </button>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                        <Calendar size={12} /> Birthday
                    </label>
                    <p className="text-slate-800 font-medium">{formattedDate}</p>
                </div>
                
                {contact.year && turningAge !== null && (
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                            <User size={12} /> Turning
                        </label>
                        <p className="text-slate-800 font-medium">{turningAge}</p>
                    </div>
                )}

                <div className="col-span-2 space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                        <Phone size={12} /> Phone
                    </label>
                    <div className="text-slate-800 font-medium font-mono">
                        {phoneToUse ? (
                            <span>{phoneToUse} {parentContact && <span className="text-xs text-slate-400 ml-2">(Parent)</span>}</span>
                        ) : (
                            <span className="text-slate-400 italic">No number added</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Notes Section */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <label className="text-[10px] uppercase font-bold text-amber-500 flex items-center gap-1 mb-2">
                    <StickyNote size={12} /> Notes
                </label>
                <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-wrap">
                    {contact.notes || "No notes yet."}
                </p>
            </div>

            {/* Actions Section */}
            <div className="space-y-3 pt-2">
                <h3 className="text-sm font-bold text-slate-800">
                    Send a Wish {parentContact ? `to ${parentContact.name}` : ''}
                </h3>
                
                <button 
                    onClick={() => setShowAI(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-50 text-indigo-700 font-bold border border-indigo-100 hover:bg-indigo-100 transition-colors"
                >
                    <Sparkles size={18} />
                    Write with AI
                </button>

                <div className="grid grid-cols-1 gap-2">
                    {PRESET_MESSAGES.map((m) => (
                        <button
                            key={m.id}
                            onClick={() => handleWhatsApp(m.text)}
                            className="flex items-center justify-between w-full p-3 bg-white border border-slate-200 rounded-xl text-left text-sm text-slate-700 hover:border-green-400 hover:bg-green-50 group transition-all"
                        >
                            <span className="truncate">{m.text}</span>
                            <ExternalLink size={14} className="text-slate-300 group-hover:text-green-600" />
                        </button>
                    ))}
                </div>
                
                {!phoneToUse && (
                    <p className="text-[10px] text-center text-slate-400 mt-2">
                        Note: WhatsApp will open without a contact selected because no phone number is saved.
                    </p>
                )}
            </div>
        </div>
      </div>

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