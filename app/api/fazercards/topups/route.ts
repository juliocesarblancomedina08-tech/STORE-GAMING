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

export async function GET(request: Request) {
  try {
    if (!API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error: "Falta FAZERCARDS_API_KEY.",
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);

    const categoryId = searchParams.get("category_id");

    if (!categoryId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Falta category_id.",
          ejemplo:
            "/api/fazercards/topups?category_id=lol_id",
        },
        { status: 400 }
      );
    }

    const supplierUrl =
      `${FAZERCARDS_API}/topups/offers?category_id=` +
      encodeURIComponent(categoryId);

    console.log(
      "[FazerCards Offers]",
      supplierUrl.replace(API_KEY, "***")
    );

    const response = await fetch(supplierUrl, {
      method: "GET",
      headers: {
        "X-API-Key": API_KEY,
        Accept: "application/json",
        "User-Agent": "STORE-GAMING/1.0",
      },
      cache: "no-store",
    });

    const text = await response.text();

    let data: unknown;

    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          supplier: "FazerCards",
          category_id: categoryId,
          status: response.status,
          error: data ?? text.slice(0, 5000),
        },
        { status: 502 }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          ok: false,
          supplier: "FazerCards",
          category_id: categoryId,
          status: response.status,
          error: "FazerCards no devolvió JSON válido.",
          raw: text.slice(0, 5000),
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      supplier: "FazerCards",
      category_id: categoryId,
      catalog: data,
    });
  } catch (error) {
    console.error("[FazerCards Offers]", error);

    return NextResponse.json(
      {
        ok: false,
        supplier: "FazerCards",
        error: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}
