import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FAZERCARDS_API = "https://api.fzr.cards/api/v2";
const CATEGORY_ID = "codm_activision_us";

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

    let cursor: string | null = null;
    let pagesChecked = 0;

    while (pagesChecked < 50) {
      pagesChecked++;

      const url = new URL(`${FAZERCARDS_API}/topups`);
      url.searchParams.set("limit", "50");

      if (cursor) {
        url.searchParams.set("cursor", cursor);
      }

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
            step: "topups",
            supplierStatus: response.status,
            supplierResponse: data,
          },
          { status: response.status }
        );
      }

      const items = Array.isArray(data?.items) ? data.items : [];

      // Buscar exactamente la categoría de COD Mobile US.
      const match = items.find(
        (item: any) =>
          String(item?.category_id || "").trim() === CATEGORY_ID
      );

      if (match) {
        return NextResponse.json({
          ok: true,
          category_id: CATEGORY_ID,
          pages_checked: pagesChecked,

          // Objeto completo que devuelve FazerCards
          category: match,

          // Por comodidad también exponemos estos campos
          name: match?.name ?? "Call of Duty Mobile - Activision (EE. UU.)",
          note: match?.note ?? null,
          offers: Array.isArray(match?.offers) ? match.offers : [],
          fields: Array.isArray(match?.fields) ? match.fields : [],
        });
      }

      const meta = data?.meta || {};

      if (!meta?.has_more || !meta?.next_cursor) {
        break;
      }

      cursor = meta.next_cursor;
    }

    return NextResponse.json({
      ok: false,
      category_id: CATEGORY_ID,
      pages_checked: pagesChecked,
      error: "No se encontró la categoría en el catálogo de FazerCards.",
    });
  } catch (error) {
    console.error("FazerCards COD Mobile error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error desconocido",
      },
      { status: 500 }
    );
  }
}
