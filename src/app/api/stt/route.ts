import { NextRequest, NextResponse } from "next/server";
import { SpeechClient } from "@google-cloud/speech";

export const runtime = "nodejs";

function mapEncoding(
  mime?: string
): "WEBM_OPUS" | "OGG_OPUS" | "LINEAR16" | null {
  const m = (mime || "").toLowerCase();
  if (m.includes("webm")) return "WEBM_OPUS";
  if (m.includes("ogg")) return "OGG_OPUS";
  if (m.includes("wav") || m.includes("x-wav")) return "LINEAR16";
  return null;
}

function getSpeechClient() {
  const base64 = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (base64) {
    try {
      const jsonStr = Buffer.from(base64, "base64").toString("utf-8");
      const json = JSON.parse(jsonStr);
      return new SpeechClient({
        credentials: {
          client_email: json.client_email,
          private_key: json.private_key,
        },
        projectId: json.project_id,
      });
    } catch (e) {
      console.warn("Failed to parse GCP_SA_KEY_BASE64", e);
      return new SpeechClient();
    }
  }
  // Fallback: rely on GOOGLE_APPLICATION_CREDENTIALS or application default credentials
  return new SpeechClient();
}

export async function POST(req: NextRequest) {
  try {
    const mime = req.headers.get("x-mime-type") ?? "audio/webm";
    const languageCode = req.headers.get("x-language") ?? "en-US";
    const encoding = mapEncoding(mime);
    if (!encoding) {
      return NextResponse.json(
        { error: `Unsupported mime type: ${mime}` },
        { status: 400 }
      );
    }

    const arrayBuffer = await req.arrayBuffer();
    const audioBytes = Buffer.from(arrayBuffer).toString("base64");

    const client = getSpeechClient();

    const [response] = await client.recognize({
      audio: { content: audioBytes },
      config: {
        encoding,
        languageCode,
        enableAutomaticPunctuation: true,
        // sampleRateHertz is optional for OPUS encodings; omit to let API infer.
      },
    });

    const transcript = (response.results || [])
      .map((r) => r.alternatives?.[0]?.transcript || "")
      .join(" ")
      .trim();

    return NextResponse.json({ transcript });
  } catch (e: unknown) {
    const msg =
      typeof e === "object" && e && (e as { message?: string }).message
        ? (e as { message: string }).message
        : "Speech-to-Text error";
    console.error("STT POST error:", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
