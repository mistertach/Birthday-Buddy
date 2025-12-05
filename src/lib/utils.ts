import { Contact, StreakData, ReminderType } from './types';

// Storage Keys
const STORAGE_KEY_CONTACTS = 'confetti_contacts';
const STORAGE_KEY_STREAK = 'confetti_streak';
const STORAGE_KEY_CATEGORIES = 'bb_categories';

// Color mapping for relationships
export const getCategoryColor = (category: string) => {
  const map: Record<string, string> = {
    'Family': 'bg-rose-100 text-rose-700 border-rose-200',
    'Friend': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    'Work': 'bg-slate-100 text-slate-700 border-slate-200',
    'Partner': 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
    'School': 'bg-amber-100 text-amber-700 border-amber-200',
  };
  return map[category] || 'bg-emerald-100 text-emerald-700 border-emerald-200';
};

export const getCategoryDotColor = (category: string) => {
  const map: Record<string, string> = {
    'Family': 'bg-rose-500',
    'Friend': 'bg-indigo-500',
    'Work': 'bg-slate-500',
    'Partner': 'bg-fuchsia-500',
    'School': 'bg-amber-500',
  };
  return map[category] || 'bg-emerald-500';
};


// Date Helpers
export const getTodayString = (): string => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

/**
 * Calculates the next birthday date object for sorting.
 * Uses local time construction to avoid timezone shifts.
 */
export const getNextBirthday = (day: number, month: number): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const currentYear = today.getFullYear();
  
  // JS Months are 0-indexed (1 = Feb), so subtract 1 from our month (1-12)
  const nextBirthday = new Date(currentYear, month - 1, day);
  
  // If birthday has passed this year, move to next year
  if (nextBirthday < today) {
    nextBirthday.setFullYear(currentYear + 1);
  }
  
  return nextBirthday;
};

/**
 * Calculates a visual date for list sorting.
 * - Keeps passed birthdays in the CURRENT month at the top of the list (current year).
 * - Moves passed birthdays from PREVIOUS months to next year.
 */
export const getVisualDate = (day: number, month: number): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-11
  
  const bMonthIdx = month - 1; // 0-11
  
  let targetYear = currentYear;
  
  // Construct this year's birthday
  const thisYearBday = new Date(currentYear, bMonthIdx, day);
  
  if (thisYearBday < today) {
    // It has passed.
    if (bMonthIdx === currentMonth) {
      // If it is in the CURRENT month, keep it in this year so it shows as "Missed"
      targetYear = currentYear;
    } else {
      // If it was a previous month (Jan, Feb...), move to next year
      targetYear = currentYear + 1;
    }
  }
  
  return new Date(targetYear, bMonthIdx, day);
};

export const getDaysUntil = (day: number, month: number): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next = getNextBirthday(day, month);
  
  const diffTime = Math.abs(next.getTime() - today.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  return diffDays;
};

export const formatDateFriendly = (day: number, month: number, year?: number): string => {
  // Create a dummy date to get the localized month name
  // Use year 2000 as a leap year safe dummy
  const date = new Date(2000, month - 1, day);
  const monthName = date.toLocaleString('default', { month: 'short' });
  
  if (!year) {
    return `${day} ${monthName}`;
  }
  return `${day} ${monthName} ${year}`;
};

export const getAgeTurning = (day: number, month: number, year?: number): number | null => {
  if (!year) return null;
  
  const next = getNextBirthday(day, month);
  const age = next.getFullYear() - year;
  
  if (age > 120 || age < 0) return null;
  
  return age;
};

/**
 * Determines the status of the birthday relative to the current calendar year.
 */
export const getBirthdayStatus = (contact: Contact): 'wished' | 'missed' | 'today' | 'upcoming' => {
  const today = new Date();
  today.setHours(0,0,0,0);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-11
  
  // 1. Check if explicitly wished this year
  if (contact.lastWishedYear === currentYear) {
    return 'wished';
  }

  // 2. Check date logic
  const bMonthIdx = contact.month - 1;
  const thisYearBday = new Date(currentYear, bMonthIdx, contact.day);
  
  if (thisYearBday.getTime() === today.getTime()) {
    return 'today';
  }
  
  // Only mark as MISSED if it is in the CURRENT MONTH and has passed.
  if (thisYearBday < today && bMonthIdx === currentMonth) {
    return 'missed';
  }
  
  return 'upcoming';
};

// Storage Helpers
export const loadContacts = (): Contact[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_CONTACTS);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    
    // Migration: If data still has 'birthday' string, convert it
    return parsed.map((c: any) => {
        if (c.birthday && !c.day) {
            const parts = c.birthday.split('-');
            const y = parseInt(parts[0]);
            const m = parseInt(parts[1]);
            const d = parseInt(parts[2]);
            return {
                ...c,
                day: d,
                month: m,
                year: c.yearUnknown ? undefined : y,
                birthday: undefined, // remove old field
                yearUnknown: undefined
            };
        }
        return c;
    });
  } catch (e) {
    console.error("Failed to load contacts", e);
    return [];
  }
};

export const saveContacts = (contacts: Contact[]) => {
  localStorage.setItem(STORAGE_KEY_CONTACTS, JSON.stringify(contacts));
};

// Category/Relationship Helpers
export const loadCategories = (): string[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_CATEGORIES);
    return stored ? JSON.parse(stored) : ['Friend', 'Family', 'Work', 'Partner', 'School'];
  } catch (e) {
    return ['Friend', 'Family', 'Work', 'Partner', 'School'];
  }
};

export const saveCategories = (categories: string[]) => {
  localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(categories));
};

export const loadStreak = (): StreakData => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_STREAK);
    return stored ? JSON.parse(stored) : { count: 0, lastWishedDate: null };
  } catch (e) {
    return { count: 0, lastWishedDate: null };
  }
};

export const updateStreak = () => {
  const current = loadStreak();
  const today = getTodayString();
  
  if (current.lastWishedDate === today) {
    return current; // Already wished today
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let newCount = 1;
  if (current.lastWishedDate === yesterdayStr) {
    newCount = current.count + 1;
  } else if (current.lastWishedDate === null) {
    newCount = 1;
  } 

  const newData = { count: newCount, lastWishedDate: today };
  localStorage.setItem(STORAGE_KEY_STREAK, JSON.stringify(newData));
  return newData;
};

export const downloadBackup = (data: any) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bb-backup-${getTodayString()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Seed Data (Migrated to split fields)
export const seedData: Contact[] = [
  { id: '1', name: 'Vivek Korgaonkar', day: 6, month: 1, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '2', name: 'Esteban Rubini', day: 9, month: 1, relationship: 'Family', reminderType: ReminderType.MORNING },
  { id: '3', name: 'Paros Lehmann', day: 26, month: 1, relationship: 'Family', reminderType: ReminderType.MORNING, notes: 'Son: Hugo' },
  { id: '4', name: 'Nico Rubini', day: 4, month: 2, relationship: 'Family', reminderType: ReminderType.MORNING },
  { id: '5', name: 'Maria Frugoni', day: 23, month: 2, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '6', name: 'Gianluca Fusco', day: 8, month: 3, relationship: 'Family', reminderType: ReminderType.MORNING },
  { id: '7', name: 'Burcu Eke', day: 11, month: 3, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '8', name: 'Tomas O\'Farrell', day: 13, month: 3, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '9', name: 'Sara Bondia', day: 17, month: 3, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '10', name: 'Oriol Villante', day: 23, month: 3, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '11', name: 'Kerry Webb', day: 24, month: 3, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '12', name: 'Luca Rubini', day: 5, month: 4, relationship: 'Family', reminderType: ReminderType.MORNING },
  { id: '13', name: 'Fabi Fusco', day: 24, month: 4, relationship: 'Family', reminderType: ReminderType.MORNING },
  { id: '14', name: 'Leo', day: 5, month: 5, relationship: 'Friend', reminderType: ReminderType.MORNING, notes: 'Tara\'s son' },
  { id: '15', name: 'Andreu Puig', day: 13, month: 5, relationship: 'Family', reminderType: ReminderType.MORNING },
  { id: '16', name: 'Paola Cuffalo', day: 14, month: 5, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '17', name: 'Roberto Viton', day: 25, month: 5, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '18', name: 'Martin Ferreiro', day: 30, month: 5, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '19', name: 'Tim Wolstenholme', day: 31, month: 5, relationship: 'Family', reminderType: ReminderType.MORNING },
  { id: '20', name: 'Louie Marteau', day: 11, month: 6, relationship: 'Family', reminderType: ReminderType.MORNING },
  { id: '21', name: 'Agustin Rubini', day: 21, month: 6, relationship: 'Family', reminderType: ReminderType.MORNING },
  { id: '22', name: 'Tomas Mbarak', day: 1, month: 7, relationship: 'Family', reminderType: ReminderType.MORNING },
  { id: '23', name: 'Albert Puig', day: 4, month: 7, relationship: 'Family', reminderType: ReminderType.MORNING },
  { id: '24', name: 'Vicky Ager', day: 4, month: 7, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '25', name: 'Laura Longa', day: 6, month: 7, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '26', name: 'Gaston Tossetti', day: 13, month: 7, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '27', name: 'Andres Taradjkian', day: 15, month: 7, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '28', name: 'Hugo Lehmann', day: 15, month: 7, relationship: 'Family', reminderType: ReminderType.MORNING },
  { id: '29', name: 'Kayra Rubini', day: 19, month: 7, relationship: 'Family', reminderType: ReminderType.MORNING },
  { id: '30', name: 'Rebecca Bolton', day: 23, month: 7, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '31', name: 'Thibault Lafontainne', day: 20, month: 8, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '32', name: 'Ana Reyes', day: 31, month: 8, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '33', name: 'Luciana Fortunato', day: 31, month: 8, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '34', name: 'Renata Lopes', day: 26, month: 9, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '35', name: 'Leandro Mbarak', day: 29, month: 9, relationship: 'Family', reminderType: ReminderType.MORNING },
  { id: '36', name: 'Luc Marteau', day: 29, month: 9, relationship: 'Family', reminderType: ReminderType.MORNING },
  { id: '37', name: 'Beto Varas', day: 10, month: 10, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '38', name: 'Tara Wood', day: 17, month: 10, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '39', name: 'Wedding Anniversary', day: 21, month: 10, relationship: 'Partner', reminderType: ReminderType.MORNING },
  { id: '40', name: 'Willie Loew', day: 3, month: 11, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '41', name: 'Ting Europa School', day: 9, month: 11, relationship: 'School', reminderType: ReminderType.MORNING },
  { id: '42', name: 'Elena Marteau', day: 12, month: 11, relationship: 'Family', reminderType: ReminderType.MORNING },
  { id: '43', name: 'Stella Oliveria', day: 22, month: 11, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '44', name: 'Noelle Lehmann', day: 24, month: 11, relationship: 'Family', reminderType: ReminderType.MORNING },
  { id: '45', name: 'Leo Loeffer', day: 22, month: 11, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '46', name: 'Teo Rubini', day: 28, month: 11, relationship: 'Family', reminderType: ReminderType.MORNING },
  { id: '47', name: 'Hao Europa School', day: 4, month: 12, relationship: 'School', reminderType: ReminderType.MORNING },
  { id: '48', name: 'Androulla Wolstenholme', day: 15, month: 12, relationship: 'Family', reminderType: ReminderType.MORNING },
  { id: '49', name: 'Salman London', day: 22, month: 12, relationship: 'Friend', reminderType: ReminderType.MORNING },
];