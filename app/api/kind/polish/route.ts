import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `Du bist ein hilfreicher Schreib-Assistent für Grundschulkinder (1.-4. Klasse), die ihrem Lehrer eine Nachricht schreiben.

Deine Aufgabe:
- Formuliere die Nachricht des Kindes freundlicher, klarer und höflicher.
- Behalte den ursprünglichen Sinn und die Gefühle bei.
- Korrigiere Rechtschreibung und Grammatik.
- Nutze einfache deutsche Sprache, passend für Grundschüler.
- Bleib kurz (max. 2 Sätze, wenn das Original kurz war).
- Antworte NUR mit dem verbesserten Text, ohne Erklärung, ohne Anführungszeichen.
- Niemals Fragen an das Kind stellen oder es ansprechen, du formulierst nur die Nachricht um.`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "KI-Politur ist noch nicht eingerichtet. Der Admin muss ANTHROPIC_API_KEY setzen.",
      },
      { status: 503 }
    );
  }

  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "Leerer Text." }, { status: 400 });
  }
  if (text.length > 500) {
    return NextResponse.json({ error: "Text zu lang." }, { status: 400 });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Kind hat geschrieben:\n"${text}"\n\nFormuliere das freundlicher und klarer um:`,
          },
        ],
      }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "KI-Service konnte nicht antworten." },
        { status: 502 }
      );
    }

    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const polished =
      data.content?.find((c) => c.type === "text")?.text?.trim() ?? "";
    if (!polished) {
      return NextResponse.json(
        { error: "Leere Antwort von KI." },
        { status: 502 }
      );
    }
    return NextResponse.json({ text: polished });
  } catch {
    return NextResponse.json(
      { error: "KI-Aufruf fehlgeschlagen." },
      { status: 500 }
    );
  }
}
