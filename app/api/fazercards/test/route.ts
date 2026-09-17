import { NextResponse } from "next/server";

const FAZERCARDS_API =
  "https://api.fzr.cards/api/v2";

export async function GET() {
  try {
    const apiKey = process.env.FAZERCARDS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          error: "FAZERCARDS_API_KEY no está configurada en Vercel",
        },
        { status: 500 }
      );
    }

    const response = await fetch(
      `${FAZERCARDS_API}/me`,
      {
        method: "GET",
        headers: {
          "X-API-Key": apiKey,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok || data?.ok === false) {
      return NextResponse.json(
        {
          ok: false,
          error:
            data?.error ||
            `FazerCards respondió con HTTP ${response.status}`,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      ok: true,
      connected: true,
      message: "STORE GAMING está conectado con FazerCards",
    });
  } catch (error) {
    console.error("FAZERCARDS TEST ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "No se pudo conectar con FazerCards",
      },
      { status: 500 }
    );
  }
  }
