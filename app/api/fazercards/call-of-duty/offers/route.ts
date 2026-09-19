import { NextResponse } from "next/server";

const FAZERCARDS_API = "https://api.fzr.cards/api/v2";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const apiKey = process.env.FAZERCARDS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          error: "FAZERCARDS_API_KEY no está configurada",
        },
        { status: 500 }
      );
    }

    // Categoría confirmada directamente en el catálogo de FazerCards
    const categoryId = "codm_activision_us";

    const url = new URL(`${FAZERCARDS_API}/topups/offers`);

    url.searchParams.set("category_id", categoryId);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "X-API-Key": apiKey,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const text = await response.text();

    let data: any;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      return NextResponse.json(
        {
          ok: false,
          step: "parse",
          category_id: categoryId,
          supplierStatus: response.status,
          raw: text,
        },
        { status: response.status }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          step: "offers",
          category_id: categoryId,
          supplierStatus: response.status,
          supplierResponse: data,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      ok: true,

      category_id: categoryId,

      name:
        data?.name ||
        "Call of Duty Mobile - Activision (EE. UU.)",

      note: data?.note || "",

      offers: Array.isArray(data?.offers)
        ? data.offers
        : [],

      fields: Array.isArray(data?.fields)
        ? data.fields
        : [],

      supplierResponse: data,
    });
  } catch (error: any) {
    console.error(
      "FAZERCARDS CALL OF DUTY OFFERS ERROR:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}
