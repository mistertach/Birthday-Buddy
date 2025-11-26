export enum ReminderType {
  MORNING = 'Morning of',
  DAY_BEFORE = '1 day before',
  WEEK_BEFORE = '7 days before',
  NONE = 'None',
}

export interface Contact {
  id: string;
  name: string;
  birthday: string;
  yearUnknown?: boolean;
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