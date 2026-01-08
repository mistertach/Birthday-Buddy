import React, { useState } from 'react';
import { Contact, GreetingTemplate } from '../lib/types';
import { getDaysUntil, getAgeTurning, getCategoryColor, getBirthdayStatus, getRelativeTimeString } from '../lib/utils';
import { MessageCircle, Edit2, Sparkles, StickyNote, Link, Check, Trash2, MoreVertical } from 'lucide-react';
import { AIGenerator } from './AIGenerator';

interface Props {
  contact: Contact;
  parentContact?: Contact;
  onWish: (contactId: string, status?: boolean) => void;
  onEdit: (contact: Contact) => void;
  onDelete?: (contact: Contact) => void;
}

const PRESET_MESSAGES: GreetingTemplate[] = [
  { id: '1', text: 'Hope you’re having a great day! 🎉', category: 'Casual' },
  { id: '2', text: 'Wishing you a year full of good things!', category: 'Warm' },
  { id: '3', text: 'Happy Birthday! Have a blast! 🎂', category: 'Casual' },
];

export const ContactCard: React.FC<Props> = ({ contact, parentContact, onWish, onEdit, onDelete }) => {
  const [showActions, setShowActions] = useState(false);
  const [showAI, setShowAI] = useState(false);

  // Swipe Logic
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const currentTouch = e.targetTouches[0].clientX;
    const diff = currentTouch - touchStart;

    // Dampen resistance
    if (Math.abs(diff) > 10) {
      setSwipeOffset(diff);
    }
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      setSwipeOffset(0);
      return;
    }

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && onDelete) {
      if (confirm(`Delete ${contact.name}?`)) onDelete(contact);
    }
    if (isRightSwipe && canToggleWish) {
      toggleWished();
    }
    setSwipeOffset(0);
  };

  const daysUntil = getDaysUntil(contact.day, contact.month);
  const turningAge = getAgeTurning(contact.day, contact.month, contact.year);
  const status = getBirthdayStatus(contact);
  const relativeTime = getRelativeTimeString(daysUntil);

  const isToday = status === 'today';
  const isMissed = status === 'missed';
  const isWished = status === 'wished';

  const categoryColor = getCategoryColor(contact.relationship);
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
    if (status === 'upcoming') return;
    onWish(contact.id, !isWished);
  };

  let bgClass = 'bg-white';
  let borderClass = 'border-slate-100';

  if (isToday) {
    bgClass = 'bg-rose-50/30';
    borderClass = 'border-rose-200';
  } else if (isMissed) {
    bgClass = 'bg-red-50/10';
    borderClass = 'border-red-100';
  } else if (isWished) {
    bgClass = 'bg-green-50/30';
    borderClass = 'border-green-100';
  }

  const canToggleWish = status !== 'upcoming';

  return (
    <div className="relative mb-2 overflow-hidden rounded-xl">
      {/* Swipe Actions Background */}
      <div className="absolute inset-0 flex justify-between items-center px-4">
        <div className={`flex items-center gap-2 text-green-600 transition-opacity ${swipeOffset > 0 ? 'opacity-100' : 'opacity-0'}`}>
          <Check size={20} strokeWidth={3} />
          <span className="text-xs font-bold uppercase">Wish</span>
        </div>
        <div className={`flex items-center gap-2 text-red-600 transition-opacity ${swipeOffset < 0 ? 'opacity-100' : 'opacity-0'}`}>
          <span className="text-xs font-bold uppercase">Delete</span>
          <Trash2 size={20} />
        </div>
      </div>

      <div
        className={`relative group rounded-xl border ${bgClass} ${borderClass} transition-shadow hover:shadow-sm`}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: swipeOffset === 0 ? 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' : 'none'
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={(e) => {
          setTouchEnd(e.changedTouches[0].clientX);
          onTouchEnd();
        }}
      >
        <div className="flex items-center p-3 gap-3 bg-inherit rounded-xl">
          {/* Date Badge */}
          <div className={`flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 shrink-0 text-slate-500`}>
            <span className="text-sm font-bold leading-none text-slate-700">{contact.day}</span>
            <span className="text-[9px] uppercase font-medium leading-none mt-0.5 text-slate-400">{monthStr}</span>
          </div>

          {/* Info Section */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <h3 className={`font-bold text-[15px] truncate ${isWished ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-900'}`}>
              {contact.name}
            </h3>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 truncate">
              <span className="font-medium text-slate-600">{contact.relationship}</span>
              {parentContact && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-0.5 text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded-[3px]">
                    via {parentContact.name}
                  </span>
                </>
              )}
              <span className="text-slate-300">•</span>
              {isMissed && <span className="text-red-600 font-medium">Missed</span>}
              {isToday && <span className="text-rose-600 font-bold">Today!</span>}
              {!isToday && !isMissed && (
                <span className={daysUntil <= 7 ? 'text-amber-600 font-medium' : ''}>
                  {relativeTime || `${daysUntil} days`}
                </span>
              )}
              {contact.year && turningAge !== null && (
                <>
                  <span className="text-slate-300">•</span>
                  <span>Turns {turningAge}</span>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={toggleWished}
              disabled={!canToggleWish}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isWished
                ? 'bg-green-100 text-green-600'
                : canToggleWish
                  ? 'bg-white text-slate-300 border border-slate-100 hover:border-green-400 hover:text-green-500'
                  : 'bg-transparent text-transparent pointer-events-none'
                }`}
            >
              <Check size={16} strokeWidth={isWished ? 3 : 2} />
            </button>

            <button
              onClick={() => setShowActions(!showActions)}
              className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${showActions ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-50 hover:text-indigo-600'}`}
            >
              <MessageCircle size={18} />
            </button>

            <button
              onClick={() => onEdit(contact)}
              className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors"
            >
              <Edit2 size={16} />
            </button>

            {onDelete && (
              <button
                onClick={() => {
                  if (confirm(`Delete ${contact.name}?`)) onDelete(contact);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-300 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Message Options */}
        {showActions && (
          <div className="px-3 pb-3 pt-0 animate-slide-down bg-inherit rounded-b-xl">
            <div className="bg-slate-50 rounded-lg p-2 grid gap-2 mt-2">
              <button
                onClick={() => setShowAI(true)}
                className="w-full flex items-center justify-center gap-2 p-2 rounded-md bg-white border border-indigo-100 text-indigo-600 hover:bg-indigo-50 text-xs font-semibold transition-colors shadow-sm"
              >
                <Sparkles size={14} />
                Generate with AI
              </button>
              <div className="grid grid-cols-1 gap-1">
                {PRESET_MESSAGES.map(m => (
                  <button
                    key={m.id}
                    onClick={() => handleWhatsApp(m.text)}
                    className="text-left text-xs p-2 bg-white border border-slate-100 rounded-md hover:border-indigo-200 text-slate-700 truncate transition-colors"
                  >
                    {m.text}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
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