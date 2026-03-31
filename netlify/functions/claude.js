exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: "Brak ANTHROPIC_API_KEY!" }) };
  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid body" }) }; }
  const configs = [
    { reqHeaders: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-beta": "web-search-2025-03-05" }, reqBody: { model: "claude-sonnet-4-20250514", max_tokens: 1200, tools: [{ type: "web_search_20250305", name: "web_search" }], messages: body.messages } },
    { reqHeaders: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" }, reqBody: { model: "claude-sonnet-4-20250514", max_tokens: 1200, messages: body.messages } },
  ];
  let lastError = "Unknown error";
  for (const cfg of configs) {
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: cfg.reqHeaders, body: JSON.stringify(cfg.reqBody) });
      const text = await resp.text();
      if (!text || !text.trim()) { lastError = "Empty response"; continue; }
      let data;
      try { data = JSON.parse(text); } catch { lastError = "Bad JSON: " + text.slice(0, 100); continue; }
      if (data.error) { lastError = data.error.message || JSON.stringify(data.error); if (data.error.type === "authentication_error") return { statusCode: 401, headers, body: JSON.stringify({ error: "Zły klucz API: " + lastError }) }; continue; }
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    } catch (err) { lastError = err.message; }
  }
  return { statusCode: 500, headers, body: JSON.stringify({ error: lastError }) };
};
