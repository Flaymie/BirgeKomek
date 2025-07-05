import { GoogleGenerativeAI } from "@google/generative-ai";

// Ключ API и инстанс клиента Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const getModerationPrompt = (title, description) => {
  return `Ты — ИИ-модератор для платформы "Бирге Комек", где студенты помогают друг другу с учебой. Твоя задача — сделать входящие запросы о помощи понятными, вежливыми и безопасными.

Проанализируй следующий текст запроса:
Название: "${title}"
Описание: "${description}"

Твои задачи:
1.  **Проверка на запрещенку:** Проверь, не содержит ли запрос просьб о выполнении работы за деньги, плагиате, продаже готовых работ, оскорблений, мата или другого запрещенного контента.
2.  **Улучшение текста:** Если запрос легитимный, перепиши его. Сделай название более четким, а описание — более понятным и структурированным. Убери опечатки, добавь вежливости.

Верни результат СТРОГО в формате JSON со следующей структурой:
{
  "is_safe": <boolean>,
  "rejection_reason": "<string>",
  "suggested_title": "<string>",
  "suggested_description": "<string>"
}`;
};

// Функция для очистки ответа от Gemini и парсинга JSON
const parseGeminiResponse = (text) => {
  // Gemini иногда оборачивает JSON в ```json ... ```
  const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
  return JSON.parse(cleanedText);
};

const moderateRequest = async (title, description) => {
  // Проверяем, включена ли фича в .env
  if (process.env.GEMINI_AUTOMOD_ENABLED !== "true") {
    console.log("Автомодерация отключена. Пропускаем.");
    return {
      is_safe: true,
      suggested_title: title,
      suggested_description: description,
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const prompt = getModerationPrompt(title, description);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log("Ответ от Gemini:", text);

    const moderatedContent = parseGeminiResponse(text);
    return moderatedContent;
  } catch (error) {
    console.error("Ошибка при обращении к Gemini API:", error);
    // В случае ошибки возвращаем исходные данные, чтобы не ломать основной флоу
    return {
      is_safe: true, // Считаем безопасным, чтобы не блокировать по ошибке
      suggested_title: title,
      suggested_description: description,
      error: "Gemini moderation failed",
    };
  }
};

export default {
  moderateRequest,
}; 