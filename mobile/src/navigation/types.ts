export type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
};

// Nested stacks inside each tab
export type BirthdaysStackParamList = {
    Contacts: undefined;
    ContactForm: { id?: string };
};

export type CalendarStackParamList = {
    Calendar: undefined;
};

export type EventsStackParamList = {
    Events: undefined;
};

// Bottom tab param list
export type AppTabParamList = {
    BirthdaysTab: undefined;
    CalendarTab: undefined;
    EventsTab: undefined;
};

// Keep legacy alias so ContactCard/ContactsScreen don't need changes
export type AppStackParamList = BirthdaysStackParamList;
