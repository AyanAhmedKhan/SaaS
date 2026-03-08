import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.geminiapi) {
  console.warn('[GEMINI] WARNING: geminiapi key not set in environment');
}

const genAI = new GoogleGenerativeAI(process.env.geminiapi || '');

const DEFAULT_SYSTEM = `You are EduYantra AI, an intelligent school management assistant for Indian schools.
You help administrators, teachers, and parents with academics, attendance, fees, exams, and school administration.
Be concise, professional, and helpful. Use bullet points when listing. Respond in the same language as the user.`;

/**
 * One-shot text generation
 */
export async function generateText(prompt, systemInstruction = DEFAULT_SYSTEM) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction,
  });

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
  });

  return result.response.text();
}

/**
 * Multi-turn chat with history
 * messages: [{ role: 'user' | 'model', content: string }]
 */
export async function chatWithHistory(messages, systemInstruction = DEFAULT_SYSTEM) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction,
  });

  // All messages except the last go into history
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === 'assistant' ? 'model' : m.role,
    parts: [{ text: m.content }],
  }));

  const chat = model.startChat({
    history,
    generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
  });

  const lastMessage = messages[messages.length - 1];
  const result = await chat.sendMessage(lastMessage.content);
  return result.response.text();
}
