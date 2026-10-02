import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FAZERCARDS_API =
  process.env.FAZERCARDS_API_URL ||
  "https://api.fzr.cards/api/v2";

const API_KEY = process.env.FAZERCARDS_API_KEY;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  try {
    return JSON.stringify(error);
  } catch {
    return "Error desconocido";
  }
}

export async function GET() {
  try {
    if (!API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          step: "config",
          error: "Falta FAZERCARDS_API_KEY.",
        },
        { status: 500 }
      );
    }

    const response = await fetch(
      `${FAZERCARDS_API}/topups`,
      {
        method: "GET",
        headers: {
          "X-API-Key": API_KEY,
          Accept: "application/json",
          "User-Agent": "STORE-GAMING/1.0",
        },
        cache: "no-store",
      }
    );

    const text = await response.text();

    let data: unknown = null;

    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          step: "supplier",
          supplier: "FazerCards",
          status: response.status,
          error: data ?? text.slice(0, 3000),
        },
        { status: 502 }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          ok: false,
          step: "parse",
          supplier: "FazerCards",
          status: response.status,
          error: "FazerCards no devolvió JSON válido.",
          raw: text.slice(0, 3000),
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      supplier: "FazerCards",
      catalog: data,
    });
  } catch (error) {
    console.error("[FazerCards Catalog]", error);

    return NextResponse.json(
      {
        ok: false,
        step: "server",
        supplier: "FazerCards",
        error: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
  }
