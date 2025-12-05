import { Contact } from './types';

export const generateBirthdayWish = async (
    contact: Contact,
    tone: string = 'warm',
    parentName?: string
): Promise<string> => {
    try {
        const response = await fetch('/api/generate-wish', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contact,
                tone,
                parentName,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to generate wish');
        }

        const data = await response.json();
        return data.message || `Happy Birthday, ${contact.name}!`;
    } catch (error) {
        console.error('Error generating wish:', error);
        return `Happy Birthday, ${contact.name}! Have a great one!`;
    }
};
