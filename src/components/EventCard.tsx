import React from 'react';
import { PartyEvent } from '@/lib/types';
import { Calendar, MapPin, Gift, CheckCircle, Circle } from 'lucide-react';

interface EventCardProps {
    event: PartyEvent;
    onEdit: (event: PartyEvent) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onEdit }) => {
    const isGiftWrapped = event.giftStatus === 'WRAPPED';
    const isGiftBought = event.giftStatus === 'BOUGHT';

    let giftColor = 'text-slate-300';
    if (event.giftStatus === 'IDEA') giftColor = 'text-amber-500';
    if (isGiftBought) giftColor = 'text-indigo-500';
    if (isGiftWrapped) giftColor = 'text-green-500';

    return (
        <div
            onClick={() => onEdit(event)}
            className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer mb-3 group"
        >
            <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-slate-800">{event.name}</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${event.rsvpStatus === 'GOING' ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400'}`}>
                    {event.rsvpStatus}
                </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <Calendar size={14} className="text-slate-400" />
                <span>{new Date(event.date).toLocaleDateString()} • {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>

            {event.location && (
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                    <MapPin size={14} className="text-slate-400" />
                    <span>{event.location}</span>
                </div>
            )}

            <div className="pt-3 border-t border-slate-50 flex justify-between items-center">
                <div className="flex items-center gap-1.5 text-xs font-medium">
                    <Gift size={14} className={giftColor} />
                    <span className={giftColor}>{event.giftStatus}</span>
                    {event.giftBudget && <span className="text-slate-400">• ${event.giftBudget}</span>}
                </div>

                {/* Visual Gifts Progress */}
                <div className="flex gap-1">
                    <div className={`w-2 h-2 rounded-full ${event.giftStatus !== 'NONE' ? 'bg-indigo-500' : 'bg-slate-100'}`}></div>
                    <div className={`w-2 h-2 rounded-full ${['BOUGHT', 'WRAPPED'].includes(event.giftStatus) ? 'bg-indigo-500' : 'bg-slate-100'}`}></div>
                    <div className={`w-2 h-2 rounded-full ${event.giftStatus === 'WRAPPED' ? 'bg-green-500' : 'bg-slate-100'}`}></div>
                </div>
            </div>
        </div>
    );
};
