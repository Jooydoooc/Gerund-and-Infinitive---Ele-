export default async function handler(req, res) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      return res.status(500).json({
        ok: false,
        error:
          "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in Vercel Environment Variables."
      });
    }

    const body = req.body || {};
    const message = typeof body.message === "string" ? body.message : "";

    if (!message.trim()) {
      return res.status(400).json({ ok: false, error: "Missing message" });
    }

    // Telegram message limit ~4096 chars — split safely
    const chunks = splitIntoChunks(message, 3800);

    for (const chunk of chunks) {
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: chunk,
          parse_mode: "HTML",
          disable_web_page_preview: true
        })
      });

      const data = await resp.json();
      if (!data.ok) {
        return res.status(500).json({
          ok: false,
          error: "Telegram API error",
          details: data
        });
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: "Server error",
      details: String(err?.message || err)
    });
  }
}

function splitIntoChunks(text, maxLen) {
  const chunks = [];
  let remaining = text;

  while (remaining.length > maxLen) {
    // try to split at a newline
    let idx = remaining.lastIndexOf("\n", maxLen);
    if (idx < 0) idx = maxLen;
    chunks.push(remaining.slice(0, idx));
    remaining = remaining.slice(idx);
  }

  if (remaining.trim().length) chunks.push(remaining);
  return chunks;
}
