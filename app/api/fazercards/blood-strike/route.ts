import { NextResponse } from "next/server";

const FAZERCARDS_API =
  "https://api.fzr.cards/api/v2";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const apiKey =
      process.env.FAZERCARDS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "FAZERCARDS_API_KEY no está configurada",
        },
        { status: 500 }
      );
    }

    let cursor: string | null = null;
    let pagesChecked = 0;

    const matches: any[] = [];

    /*
    |--------------------------------------------------------------------------
    | RECORRER EL CATÁLOGO
    |--------------------------------------------------------------------------
    */

    while (pagesChecked < 50) {
      pagesChecked++;

      const url = new URL(
        `${FAZERCARDS_API}/topups`
      );

      url.searchParams.set(
        "limit",
        "50"
      );

      if (cursor) {
        url.searchParams.set(
          "cursor",
          cursor
        );
      }

      const response = await fetch(
        url.toString(),
        {
          method: "GET",

          headers: {
            "X-API-Key": apiKey,
          },

          cache: "no-store",
        }
      );

      let data: any;

      try {
        data = await response.json();
      } catch {
        return NextResponse.json(
          {
            ok: false,
            step: "categories",
            pages_checked:
              pagesChecked,
            error:
              "FazerCards devolvió una respuesta que no es JSON",
          },
          { status: 502 }
        );
      }

      if (!response.ok || !data.ok) {
        return NextResponse.json(
          {
            ok: false,
            step: "categories",
            pages_checked:
              pagesChecked,
            error:
              data?.error ||
              "Error obteniendo catálogo de FazerCards",
          },
          {
            status:
              response.status || 502,
          }
        );
      }

      const items =
        Array.isArray(data.items)
          ? data.items
          : [];

      /*
      |--------------------------------------------------------------------------
      | BUSCAR BLOOD STRIKE
      |--------------------------------------------------------------------------
      */

      for (const item of items) {
        const text = [
          item.category_id,
          item.name,
          item.note,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (
          text.includes("blood strike") ||
          text.includes("blood_strike")
        ) {
          matches.push(item);
        }
      }

      /*
      |--------------------------------------------------------------------------
      | PAGINACIÓN
      |--------------------------------------------------------------------------
      */

      const meta =
        data.meta || {};

      if (
        !meta.has_more ||
        !meta.next_cursor
      ) {
        break;
      }

      cursor =
        meta.next_cursor;
    }

    /*
    |--------------------------------------------------------------------------
    | RESULTADO
    |--------------------------------------------------------------------------
    */

    return NextResponse.json({
      ok: true,

      game: "Blood Strike",

      pages_checked:
        pagesChecked,

      matches_found:
        matches.length,

      matches,
    });
  } catch (error: any) {
    console.error(
      "FAZERCARDS BLOOD STRIKE CATALOG SEARCH ERROR:",
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
