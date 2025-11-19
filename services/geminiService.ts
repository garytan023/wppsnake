import { GoogleGenAI, Type } from "@google/genai";
import { GeminiAnalysis } from "../types";

const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getGameOverCommentary = async (score: number, snakeLength: number): Promise<GeminiAnalysis> => {
  try {
    const model = "gemini-2.5-flash";
    const prompt = `
      The player just lost a game of 3D Snake.
      Score: ${score}
      Snake Length: ${snakeLength}
      
      Provide a witty, sarcastic, or philosophical comment about their performance as if you are an ancient Snake Deity. 
      Also give them a grade (S, A, B, C, D, F).
      
      Respond in JSON.
    `;

    const response = await genAI.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            commentary: { type: Type.STRING },
            grade: { type: Type.STRING },
          },
          required: ["commentary", "grade"],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as GeminiAnalysis;
    }
    throw new Error("No response text");
  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      commentary: "The Snake Deity is silent... (API Error)",
      grade: "?",
    };
  }
};
