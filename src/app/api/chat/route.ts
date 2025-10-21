import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

const systemPrompt = `You are an English speaking coach for Vietnamese learners.
- Reply in English with 1-2 short sentences, friendly and motivating.
- Encourage natural conversation; always ask a light follow-up question.
- Return ONLY valid JSON with keys: reply (string), ipa (array of {word, ipa}), tips (string in Vietnamese giving quick pronunciation advice for difficult sounds).
- For ipa, infer IPA for the user's text word-by-word and include common mispronunciation notes for Vietnamese learners.
- Keep it concise.`;

export async function POST(req: NextRequest) {
  try {
    const {
      userText,
      provider = "openai",
      model = "gpt-4o-mini",
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
      let parsed: {
        reply: string;
        ipa: { word: string; ipa: string }[];
        tips: string;
      };
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = { reply: raw, ipa: [], tips: "" };
      }
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
      const modelId = "gemini-1.5-flash";
      const modelGemini = genAI.getGenerativeModel({ model: modelId });
      const prompt = `${systemPrompt}\nUser: ${userText}`;
      const result = await modelGemini.generateContent(prompt);
      const text = result.response.text() || "";
      let parsed: {
        reply: string;
        ipa: { word: string; ipa: string }[];
        tips: string;
      };
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { reply: text, ipa: [], tips: "" };
      }
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
