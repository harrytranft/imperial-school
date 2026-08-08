
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateEdict = async (name: string, title: string, isLevelUp: boolean) => {
  try {
    const prompt = `Bạn là Thái giám truyền tin trong triều đình phong kiến. 
    Hãy viết một đoạn "Thánh chỉ" ngắn (tối đa 30 chữ) 
    chúc mừng hoặc thông báo cho học sinh tên "${name}" 
    vừa mới ${isLevelUp ? 'được thăng chức thành' : 'bị giáng chức xuống'} "${title}". 
    Văn phong trang trọng, uy nghiêm nhưng có phần hóm hỉnh phù hợp môi trường học đường.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Phụng thiên thừa vận, Hoàng đế chiếu viết...";
  } catch (error) {
    console.error("Gemini Error:", error);
    return isLevelUp ? "Chúc mừng khanh đã thăng tiến!" : "Lùi bước để tiến xa hơn, cố gắng nhé!";
  }
};
