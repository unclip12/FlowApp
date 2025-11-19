import { GoogleGenAI, Type } from "@google/genai";

// NOTE: In a real app, use import.meta.env.VITE_API_KEY
const apiKey = ''; 

let ai: GoogleGenAI | null = null;

try {
  if (apiKey) {
    ai = new GoogleGenAI({ apiKey: apiKey });
  }
} catch (error) {
  console.error("Failed to initialize GoogleGenAI:", error);
}

export const generateStudyChecklist = async (topic: string, duration: number): Promise<string[]> => {
  if (!ai) {
    // console.warn("Gemini API key not found. Mocking response.");
    return [
      "Review core definitions",
      "Practice 3 basic problems",
      "Summarize key concepts"
    ];
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Create a concise, actionable study checklist for the topic: "${topic}". 
      The study session is ${duration} minutes long. 
      Return strictly a JSON array of strings.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Error generating study plan:", error);
    return ["Review key concepts", "Practice problems", "Summarize notes"];
  }
};

export const analyzeProgress = async (sessions: any[]): Promise<string> => {
    return "Great job tracking your study sessions!";
}
