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

export const getYearFromDate = (dateStr: string): number => {
  return new Date(dateStr).getFullYear();
};

/**
 * Calculates the next birthday date object for sorting.
 * Handles leap years and wrapping to next year.
 */
export const getNextBirthday = (birthdayStr: string): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const birthDate = new Date(birthdayStr);
  const currentYear = today.getFullYear();
  
  // Create date for this year
  const nextBirthday = new Date(currentYear, birthDate.getUTCMonth(), birthDate.getUTCDate());
  
  // If birthday has passed this year, move to next year
  if (nextBirthday < today) {
    nextBirthday.setFullYear(currentYear + 1);
  }
  
  return nextBirthday;
};

export const getDaysUntil = (birthdayStr: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next = getNextBirthday(birthdayStr);
  
  const diffTime = Math.abs(next.getTime() - today.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  return diffDays;
};

export const formatDateFriendly = (dateStr: string, yearUnknown?: boolean): string => {
  const date = new Date(dateStr);
  const day = date.getUTCDate();
  const month = date.toLocaleString('default', { month: 'short', timeZone: 'UTC' });
  
  if (yearUnknown) {
    return `${day} ${month}`;
  }
  // If year is known, we show it to be helpful
  return `${day} ${month} ${date.getUTCFullYear()}`;
};

export const getAgeTurning = (birthdayStr: string, yearUnknown?: boolean): number | null => {
  if (yearUnknown) return null;
  
  const next = getNextBirthday(birthdayStr);
  const birthYear = new Date(birthdayStr).getUTCFullYear();
  const age = next.getFullYear() - birthYear;
  
  // Safety check: if age is absurd (e.g. > 120 or < 0), likely a data error, return null
  if (age > 120 || age < 0) return null;
  
  return age;
};

// Storage Helpers
export const loadContacts = (): Contact[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_CONTACTS);
    return stored ? JSON.parse(stored) : [];
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
  // If missed a day, it resets to 1 (since they wished today)

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

// Seed Data
export const seedData: Contact[] = [
  { id: '1', name: 'Vivek Korgaonkar', birthday: '2000-01-06', yearUnknown: true, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '2', name: 'Esteban Rubini', birthday: '2000-01-09', yearUnknown: true, relationship: 'Family', reminderType: ReminderType.MORNING },
  { id: '3', name: 'Paros Lehmann', birthday: '2000-01-26', yearUnknown: true, relationship: 'Family', reminderType: ReminderType.MORNING, notes: 'Son: Hugo' },
  { id: '4', name: 'Nico Rubini', birthday: '2000-02-04', yearUnknown: true, relationship: 'Family', reminderType: ReminderType.MORNING },
  { id: '5', name: 'Maria Frugoni', birthday: '2000-02-23', yearUnknown: true, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '6', name: 'Gianluca Fusco', birthday: '2000-03-08', yearUnknown: true, relationship: 'Family', reminderType: ReminderType.MORNING },
  { id: '7', name: 'Burcu Eke', birthday: '2000-03-11', yearUnknown: true, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '8', name: 'Tomas O\'Farrell', birthday: '2000-03-13', yearUnknown: true, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '9', name: 'Sara Bondia', birthday: '2000-03-17', yearUnknown: true, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '10', name: 'Oriol Villante', birthday: '2000-03-23', yearUnknown: true, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '11', name: 'Kerry Webb', birthday: '2000-03-24', yearUnknown: true, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '12', name: 'Luca Rubini', birthday: '2000-04-05', yearUnknown: true, relationship: 'Family', reminderType: ReminderType.MORNING },
  { id: '13', name: 'Fabi Fusco', birthday: '2000-04-24', yearUnknown: true, relationship: 'Family', reminderType: ReminderType.MORNING },
  { id: '14', name: 'Leo', birthday: '2000-05-05', yearUnknown: true, relationship: 'Friend', reminderType: ReminderType.MORNING, notes: 'Tara\'s son' },
  { id: '15', name: 'Andreu Puig', birthday: '2000-05-13', yearUnknown: true, relationship: 'Family', reminderType: ReminderType.MORNING },
  { id: '16', name: 'Paola Cuffalo', birthday: '2000-05-14', yearUnknown: true, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '17', name: 'Roberto Viton', birthday: '2000-05-25', yearUnknown: true, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '18', name: 'Martin Ferreiro', birthday: '2000-05-30', yearUnknown: true, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '19', name: 'Tim Wolstenholme', birthday: '2000-05-31', yearUnknown: true, relationship: 'Family', reminderType: ReminderType.MORNING },
  { id: '20', name: 'Louie Marteau', birthday: '2000-06-11', yearUnknown: true, relationship: 'Family', reminderType: ReminderType.MORNING },
  { id: '21', name: 'Agustin Rubini', birthday: '2000-06-21', yearUnknown: true, relationship: 'Family', reminderType: ReminderType.MORNING },
  { id: '22', name: 'Tomas Mbarak', birthday: '2000-07-01', yearUnknown: true, relationship: 'Family', reminderType: ReminderType.MORNING },
  { id: '23', name: 'Albert Puig', birthday: '2000-07-04', yearUnknown: true, relationship: 'Family', reminderType: ReminderType.MORNING },
  { id: '24', name: 'Vicky Ager', birthday: '2000-07-04', yearUnknown: true, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '25', name: 'Laura Longa', birthday: '2000-07-06', yearUnknown: true, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '26', name: 'Gaston Tossetti', birthday: '2000-07-13', yearUnknown: true, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '27', name: 'Andres Taradjkian', birthday: '2000-07-15', yearUnknown: true, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '28', name: 'Hugo Lehmann', birthday: '2000-07-15', yearUnknown: true, relationship: 'Family', reminderType: ReminderType.MORNING },
  { id: '29', name: 'Kayra Rubini', birthday: '2000-07-19', yearUnknown: true, relationship: 'Family', reminderType: ReminderType.MORNING },
  { id: '30', name: 'Rebecca Bolton', birthday: '2000-07-23', yearUnknown: true, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '31', name: 'Thibault Lafontainne', birthday: '2000-08-20', yearUnknown: true, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '32', name: 'Ana Reyes', birthday: '2000-08-31', yearUnknown: true, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '33', name: 'Luciana Fortunato', birthday: '2000-08-31', yearUnknown: true, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '34', name: 'Renata Lopes', birthday: '2000-09-26', yearUnknown: true, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '35', name: 'Leandro Mbarak', birthday: '2000-09-29', yearUnknown: true, relationship: 'Family', reminderType: ReminderType.MORNING },
  { id: '36', name: 'Luc Marteau', birthday: '2000-09-29', yearUnknown: true, relationship: 'Family', reminderType: ReminderType.MORNING },
  { id: '37', name: 'Beto Varas', birthday: '2000-10-10', yearUnknown: true, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '38', name: 'Tara Wood', birthday: '2000-10-17', yearUnknown: true, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '39', name: 'Wedding Anniversary', birthday: '2000-10-21', yearUnknown: true, relationship: 'Partner', reminderType: ReminderType.MORNING },
  { id: '40', name: 'Willie Loew', birthday: '2000-11-03', yearUnknown: true, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '41', name: 'Ting Europa School', birthday: '2000-11-09', yearUnknown: true, relationship: 'School', reminderType: ReminderType.MORNING },
  { id: '42', name: 'Elena Marteau', birthday: '2000-11-12', yearUnknown: true, relationship: 'Family', reminderType: ReminderType.MORNING },
  { id: '43', name: 'Stella Oliveria', birthday: '2000-11-22', yearUnknown: true, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '44', name: 'Noelle Lehmann', birthday: '2000-11-24', yearUnknown: true, relationship: 'Family', reminderType: ReminderType.MORNING },
  { id: '45', name: 'Leo Loeffer', birthday: '2000-11-22', yearUnknown: true, relationship: 'Friend', reminderType: ReminderType.MORNING },
  { id: '46', name: 'Teo Rubini', birthday: '2000-11-28', yearUnknown: true, relationship: 'Family', reminderType: ReminderType.MORNING },
  { id: '47', name: 'Hao Europa School', birthday: '2000-12-04', yearUnknown: true, relationship: 'School', reminderType: ReminderType.MORNING },
  { id: '48', name: 'Androulla Wolstenholme', birthday: '2000-12-15', yearUnknown: true, relationship: 'Family', reminderType: ReminderType.MORNING },
  { id: '49', name: 'Salman London', birthday: '2000-12-22', yearUnknown: true, relationship: 'Friend', reminderType: ReminderType.MORNING },
];