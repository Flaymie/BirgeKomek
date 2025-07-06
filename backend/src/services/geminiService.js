import { GoogleGenerativeAI } from "@google/generative-ai";

// Ключ API и инстанс клиента Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const getModerationPrompt = (title, description) => {
  return `Ты — ИИ-модератор для платформы "Бирге Комек", где студенты помогают друг другу с учебой. Твоя задача — сделать входящие запросы о помощи понятными, вежливыми и безопасными.

Проанализируй следующий текст запроса:
Название: "${title}"
Описание: "${description}"

Твои задачи:
Твои задачи:
1. **Проверка на запрещённый контент.**
   Убедись, что текст не содержит:
   - просьб о выполнении задания за пользователя (в т.ч. завуалированных, вроде “скиньте готовый ответ”),
   - предложений денег/оплаты за помощь,
   - нарушений авторских прав, просьб об антиплагиате, продаже готовых работ,
   - мата, оскорблений, унижений, угроз, токсичности.

2. **Проверка на смысл.**
   Если запрос представляет собой бессмысленный набор символов, случайный текст (например: “ывфывлдвльв”) или капслоческий ор (“ПОМОГИТЕ СРОЧНО!!!!”), 
   и в нём невозможно распознать суть — считаем его невалидным.
   ❗️В таких случаях не пытайся угадывать или генерировать вместо пользователя — просто отклоняй.

3. **Переформулировка.**
   Если запрос допустим, перепиши его:
   - Сделай название чётким, лаконичным, отражающим суть запроса.
   - Сделай описание структурированным, понятным и вежливым.
   - Исправь опечатки, грамматику, но **не меняй суть**.
   ❗️Никаких вымышленных деталей, уточнений, приглашений к диалогу (“давайте разберёмся вместе”) и вопросов (“какие темы непонятны?”).
   ❗️Сохраняй стиль пользователя, если он не нарушает правила.

Верни результат СТРОГО в формате JSON со следующей структурой:
{
  "is_safe": <boolean>, // true, если запрос нормальный, false — если содержит запрещенку или скрытую просьбу.
  "rejection_reason": "<string>", // Если is_safe: false, кратко объясни причину (например, "Попытка заказать готовую работу" или "Завуалированная просьба выполнить задание целиком"). Иначе null.
  "suggested_title": "<string>", // Предложенное тобой, улучшенное название. Только на основе исходного названия.
  "suggested_description": "<string>" // Предложенное тобой, улучшенное описание. Только на основе оригинального текста пользователя, без новых смыслов.
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