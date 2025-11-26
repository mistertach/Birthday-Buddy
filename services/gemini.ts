import { GoogleGenAI } from "@google/genai";
import { Contact } from "../types";

// Initialize Gemini
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key not found");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateBirthdayWish = async (contact: Contact, tone: string = "warm", parentName?: string): Promise<string> => {
  const ai = getAI();
  if (!ai) return "Happy Birthday! 🎉";

  const model = "gemini-2.5-flash";
  
  let prompt = "";
  
  if (parentName) {
    prompt = `
      Write a short, ${tone} message to ${parentName}, wishing their child, ${contact.name}, a happy birthday.
      Your relationship is with ${parentName} (${contact.relationship}).
      Child's Name: ${contact.name}.
      Parent's Name: ${parentName}.
      Personal Notes: ${contact.notes || "None"}.
      Make it warm and thoughtful. Keep it under 2 sentences.
    `;
  } else {
    prompt = `
      Write a short, ${tone} birthday message for ${contact.name}.
      Relationship: ${contact.relationship}.
      Personal Notes: ${contact.notes || "None"}.
      Make it feel personal but concise (under 2 sentences). 
      Do not include hashtags or emojis unless the tone is 'fun'.
    `;
  }

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });
    return response.text?.trim() || `Happy Birthday, ${contact.name}!`;
  } catch (error) {
    console.error("Error generating wish:", error);
    return `Happy Birthday, ${contact.name}! Have a great one!`;
  }
};
