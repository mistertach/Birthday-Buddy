import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const getAI = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('GEMINI_API_KEY not found in environment variables');
        return null;
    }
    return new GoogleGenAI({ apiKey });
};

export async function POST(request: NextRequest) {
    try {
        const { contact, tone, parentName } = await request.json();

        const ai = getAI();
        if (!ai) {
            return NextResponse.json(
                { message: `Happy Birthday, ${contact.name}! 🎉` },
                { status: 200 }
            );
        }

        const model = 'gemini-2.5-flash';

        let prompt = '';

        if (parentName) {
            prompt = `
        Write a short, ${tone} message to ${parentName}, wishing their child, ${contact.name}, a happy birthday.
        Your relationship is with ${parentName} (${contact.relationship}).
        Child's Name: ${contact.name}.
        Parent's Name: ${parentName}.
        Personal Notes: ${contact.notes || 'None'}.
        Make it warm and thoughtful. Keep it under 2 sentences.
      `;
        } else {
            prompt = `
        Write a short, ${tone} birthday message for ${contact.name}.
        Relationship: ${contact.relationship}.
        Personal Notes: ${contact.notes || 'None'}.
        Make it feel personal but concise (under 2 sentences). 
        Do not include hashtags or emojis unless the tone is 'fun'.
      `;
        }

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
        });

        const message = response.text?.trim() || `Happy Birthday, ${contact.name}!`;

        return NextResponse.json({ message });
    } catch (error) {
        console.error('Error generating wish:', error);
        return NextResponse.json(
            { message: 'Happy Birthday! Have a great one!' },
            { status: 500 }
        );
    }
}
