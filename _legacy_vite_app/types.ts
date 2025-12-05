export enum ReminderType {
  MORNING = 'Morning of',
  DAY_BEFORE = '1 day before',
  WEEK_BEFORE = '7 days before',
  NONE = 'None',
}

export interface Contact {
  id: string;
  name: string;
  // New split date fields to prevent timezone shifting
  day: number;
  month: number;
  year?: number; // undefined if unknown
  
  phone?: string;
  relationship: string;
  reminderType: ReminderType;
  notes?: string;
  lastWishedYear?: number;
  parentId?: string;
}

export interface StreakData {
  count: number;
  lastWishedDate: string | null;
}

export interface GreetingTemplate {
  id: string;
  text: string;
  category: string;
}