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

    let cursor: string | null = null;
    let pagesChecked = 0;
    const allItems: any[] = [];

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
            pages_checked: pagesChecked,
            supplierStatus: response.status,
            raw: text,
          },
          { status: response.status }
        );
      }

      if (!response.ok || !data?.ok) {
        return NextResponse.json(
          {
            ok: false,
            step: "catalog",
            pages_checked: pagesChecked,
            supplierStatus: response.status,
            supplierResponse: data,
          },
          { status: response.status }
        );
      }

      const items = Array.isArray(data.items)
        ? data.items
        : [];

      allItems.push(...items);

      const meta = data.meta || {};

      if (
        !meta.has_more ||
        !meta.next_cursor
      ) {
        break;
      }

      cursor = meta.next_cursor;
    }

    /*
     * Buscar específicamente todo lo relacionado
     * con Call of Duty.
     *
     * NO elegimos una categoría todavía.
     */
    const callOfDuty = allItems.filter((item) => {
      const text = [
        item?.category_id,
        item?.name,
        item?.note,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        text.includes("call of duty") ||
        text.includes("cod mobile") ||
        text.includes("codm")
      );
    });

    return NextResponse.json({
      ok: true,

      pages_checked: pagesChecked,

      total_categories: allItems.length,

      call_of_duty_found: callOfDuty.length,

      call_of_duty: callOfDuty,

      /*
       * También devolvemos el catálogo completo por si
       * necesitamos revisar otro juego después.
       */
      all_categories: allItems,
    });
  } catch (error: any) {
    console.error(
      "FAZERCARDS ALL TOPUPS ERROR:",
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
