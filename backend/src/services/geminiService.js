import { GoogleGenerativeAI } from "@google/generative-ai";

// Ключ API и инстанс клиента Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const getModerationPrompt = (title, description) => {
  return `Ты — ИИ-модератор для платформы "Бирге Комек", где студенты помогают друг другу с учебой. Твоя задача — сделать входящие запросы о помощи понятными, вежливыми и безопасными.

Проанализируй следующий текст запроса:
Название: "${title}"
Описание: "${description}"

Твои задачи:
1.  **Проверка на запрещенку:** Проверь, не содержит ли запрос прямых просьб о выполнении работы за деньги, плагиате, продаже готовых работ, оскорблений или мата.
2.  **Распознавание скрытых просьб:** Также проверь, не содержит ли запрос скрытых или завуалированных просьб выполнить задание полностью за пользователя (например, “просто скиньте ответ”, “мне нужно решение, потом разберусь”, “времени нет — сделайте пожалуйста” и т.д.). Если такая просьба есть — это запрещено.
3.  **Улучшение текста:** Если запрос легитимный (не нарушает пункты 1 и 2), перепиши его. Сделай название более четким, а описание — более понятным и структурированным. Убери опечатки, добавь вежливости.

Верни результат СТРОГО в формате JSON со следующей структурой:
{
  "is_safe": <boolean>, // true, если запрос нормальный, false — если содержит запрещенку или скрытую просьбу.
  "rejection_reason": "<string>", // Если is_safe: false, кратко объясни причину (например, "Попытка заказать готовую работу" или "Завуалированная просьба выполнить задание целиком"). Иначе null.
  "suggested_title": "<string>", // Предложенное тобой, улучшенное название.
  "suggested_description": "<string>" // Предложенное тобой, улучшенное описание.
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