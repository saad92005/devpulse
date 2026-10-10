// Minimal OpenAI-compatible chat client. Defaults to Groq's free tier; any
// compatible endpoint works via LLM_BASE_URL / LLM_API_KEY / LLM_MODEL.

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export function llmConfig() {
  const model = process.env.LLM_MODEL ?? "openai/gpt-oss-120b";
  return {
    baseUrl: process.env.LLM_BASE_URL ?? "https://api.groq.com/openai/v1",
    apiKey: process.env.LLM_API_KEY ?? process.env.GROQ_API_KEY ?? "",
    model,
    checkerModel: process.env.LLM_CHECKER_MODEL ?? model,
  };
}

export function llmConfigured() {
  return Boolean(llmConfig().apiKey);
}

export class LlmError extends Error {}

export async function chatJson<T>(
  messages: ChatMessage[],
  opts: { model?: string; temperature?: number; maxTokens?: number } = {},
): Promise<T> {
  const cfg = llmConfig();
  if (!cfg.apiKey) throw new LlmError("No LLM API key configured (set GROQ_API_KEY).");

  let lastError = "";
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({
        model: opts.model ?? cfg.model,
        messages,
        temperature: opts.temperature ?? 0.1,
        max_tokens: opts.maxTokens ?? 8192,
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429 || res.status >= 500) {
      lastError = `${res.status}`;
      const wait = Number(res.headers.get("retry-after")) || 2 ** attempt * 2;
      await new Promise((r) => setTimeout(r, Math.min(wait, 20) * 1000));
      continue;
    }
    if (!res.ok) {
      throw new LlmError(`LLM request failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content ?? "";
    try {
      return JSON.parse(content) as T;
    } catch {
      const match = /\{[\s\S]*\}/.exec(content);
      if (match) return JSON.parse(match[0]) as T;
      lastError = "model did not return JSON";
    }
  }
  throw new LlmError(`LLM call failed after retries (${lastError}).`);
}
