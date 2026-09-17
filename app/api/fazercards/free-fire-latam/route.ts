import { NextResponse } from "next/server";

const FAZERCARDS_API = "https://api.fzr.cards/api/v2";

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
    const matches: any[] = [];

    while (pagesChecked < 50) {
      pagesChecked++;

      const url = new URL(`${FAZERCARDS_API}/topups`);

      url.searchParams.set("limit", "50");

      if (cursor) {
        url.searchParams.set("cursor", cursor);
      }

      const response = await fetch(url.toString(), {
        headers: {
          "X-API-Key": apiKey,
        },
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        return NextResponse.json(
          {
            ok: false,
            step: "categories",
            pages_checked: pagesChecked,
            error:
              data?.error ||
              "Error obteniendo catálogo de FazerCards",
          },
          { status: response.status }
        );
      }

      const items = Array.isArray(data.items)
        ? data.items
        : [];

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
          text.includes("free fire") ||
          text.includes("garena") ||
          text.includes("latam")
        ) {
          matches.push(item);
        }
      }

      const meta = data.meta || {};

      if (
        !meta.has_more ||
        !meta.next_cursor
      ) {
        break;
      }

      cursor = meta.next_cursor;
    }

    return NextResponse.json({
      ok: true,
      pages_checked: pagesChecked,
      matches_found: matches.length,
      matches,
    });
  } catch (error: any) {
    console.error(
      "FAZERCARDS CATALOG SEARCH ERROR:",
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
