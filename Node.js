// webhook.js - обработчик для Telegram
const express = require('express');
const app = express();
app.use(express.json());

app.post('/webhook', async (req, res) => {
  const { callback_query } = req.body;
  if (callback_query) {
    const data = JSON.parse(callback_query.data);
    if (data.action === 'reply') {
      // Отвечаем на callback, чтобы Telegram показал поле ввода
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callback_query.id,
          text: 'Введите текст ответа:'
        })
      });
      
      // Запрашиваем у пользователя текст ответа
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: callback_query.from.id,
          text: `✏️ Ответ для @${data.userName} (${data.userId}):\n\nСообщение: "${data.messageText}"\n\nВведите текст ответа:`,
          reply_markup: {
            force_reply: true
          }
        })
      });
    }
  }
  
  // Обработка ответа с текстом
  if (req.body.message && req.body.message.reply_to_message) {
    const replyTo = req.body.message.reply_to_message;
    const text = req.body.message.text;
    // Извлекаем userId из текста
    const match = replyTo.text.match(/\(([^)]+)\)/);
    if (match) {
      const userId = match[1];
      // Отправляем ответ пользователю на сайт
      await fetch(`https://ваш-сайт.com/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, text })
      });
    }
  }
  
  res.send('OK');
});

app.listen(3000);
