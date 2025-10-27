import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

const systemPrompt = `You are an English speaking coach for Vietnamese learners.
- Reply in English with 1-2 short sentences, friendly and motivating.
- Encourage natural conversation; always ask a light follow-up question.
- Return ONLY valid JSON with keys: reply (string), ipa (array of {word, ipa}), tips (string in Vietnamese giving quick pronunciation advice for difficult sounds).
- Do NOT include markdown code fences or triple backticks; return pure JSON only.
- For ipa, infer IPA for the user's text word-by-word and include common mispronunciation notes for Vietnamese learners.
- Keep it concise.`;

// Helper to robustly parse model output into our schema
type ChatSchema = {
  reply: string;
  ipa: { word: string; ipa: string }[];
  tips: string;
};

function isWordIpa(o: unknown): o is { word: string; ipa: string } {
  if (typeof o !== "object" || o === null) return false;
  const t = o as { word?: unknown; ipa?: unknown };
  return typeof t.word === "string" && typeof t.ipa === "string";
}

function parseResponseToSchema(text: string): ChatSchema {
  const cleaned = (text || "")
    // remove typical markdown code fences
    .replace(/^```json\s*/i, "")
    .replace(/```/g, "")
    .trim();

  const tryParse = (s: string): ChatSchema | null => {
    try {
      const obj = JSON.parse(s) as {
        reply?: unknown;
        ipa?: unknown;
        tips?: unknown;
      };
      const ipaArr = Array.isArray(obj.ipa)
        ? (obj.ipa as unknown[])
            .filter(isWordIpa)
            .map((i) => ({ word: i.word, ipa: i.ipa }))
        : [];
      const tipsStr = typeof obj.tips === "string" ? obj.tips : "";
      const replyStr = typeof obj.reply === "string" ? obj.reply : cleaned;
      return { reply: replyStr, ipa: ipaArr, tips: tipsStr };
    } catch {
      return null;
    }
  };

  let parsed = tryParse(cleaned);
  if (parsed) return parsed;

  // Fallback: extract JSON object substring if present
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const sub = cleaned.slice(start, end + 1);
    parsed = tryParse(sub);
    if (parsed) return parsed;
  }

  // Last resort: treat entire text as plain reply
  return { reply: cleaned, ipa: [], tips: "" };
}

export async function POST(req: NextRequest) {
  try {
    const {
      userText,
      // provider = "openai",
      // model = "gpt-4o-mini",
      provider = "gemini",
      model = "gemini-2.0-flash-001",
      history = [],
    } = await req.json();

    if (!userText || typeof userText !== "string") {
      return NextResponse.json({ error: "Missing userText" }, { status: 400 });
    }

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: userText },
    ];

    if (provider === "openai") {
      const key = process.env.OPENAI_API_KEY;
      if (!key)
        return NextResponse.json(
          { error: "OPENAI_API_KEY not set" },
          { status: 500 }
        );
      const client = new OpenAI({ apiKey: key });
      const resp = await client.chat.completions.create({
        model,
        messages,
        temperature: 0.7,
      });
      const raw = resp.choices?.[0]?.message?.content || "";
      const parsed = parseResponseToSchema(raw);
      return NextResponse.json(parsed);
    }

    if (provider === "gemini") {
      const key = process.env.GEMINI_API_KEY;
      if (!key)
        return NextResponse.json(
          { error: "GEMINI_API_KEY not set" },
          { status: 500 }
        );
      const genAI = new GoogleGenerativeAI(key);
      const modelGemini = genAI.getGenerativeModel({ model });
      const prompt = `${systemPrompt}\nUser: ${userText}`;
      const result = await modelGemini.generateContent(prompt);
      const text = result.response.text() || "";
      const parsed = parseResponseToSchema(text);
      return NextResponse.json(parsed);
    }

    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  } catch (e: unknown) {
    const error = e as Error;
    return NextResponse.json(
      { error: "Server error", message: error?.message },
      { status: 500 }
    );
  }
}
