export type User = {
    id: string;
    email: string;
    name: string | null;
    image?: string | null;
    isAdmin: boolean;
};

export type Contact = {
    id: string;
    userId: string;
    name: string;
    day: number;
    month: number;
    year: number | null;
    phone: string | null;
    relationship: string | null;
    reminderType: string | null;
    notes: string | null;
    lastWishedYear: number | null;
    parentId: string | null;
    createdAt: string;
    updatedAt: string;
};

export type ContactInput = {
    name: string;
    day: number;
    month: number;
    year?: number | null;
    phone?: string | null;
    relationship?: string | null;
    reminderType?: string | null;
    notes?: string | null;
};

export type GiftStatus = 'NONE' | 'IDEA' | 'BOUGHT' | 'WRAPPED';
export type RsvpStatus = 'PENDING' | 'GOING' | 'NOT_GOING';

export type PartyEvent = {
    id: string;
    userId: string;
    contactId: string | null;
    name: string;
    date: string; // ISO string from API
    location: string | null;
    giftStatus: GiftStatus;
    giftBudget: number | null;
    giftNotes: string | null;
    rsvpStatus: RsvpStatus;
    createdAt: string;
    updatedAt: string;
};

export type EventInput = {
    name: string;
    date: string;
    location?: string | null;
    contactId?: string | null;
    giftStatus?: GiftStatus;
    giftBudget?: number | null;
    giftNotes?: string | null;
    rsvpStatus?: RsvpStatus;
};
