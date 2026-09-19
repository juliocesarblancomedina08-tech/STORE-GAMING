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
    const matches: any[] = [];

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

      let data: any = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        return NextResponse.json(
          {
            ok: false,
            step: "categories",
            pages_checked: pagesChecked,
            supplierStatus: response.status,
            status_text: response.statusText,
            content_type:
              response.headers.get("content-type"),
            error:
              "FazerCards devolvió una respuesta que no es JSON.",
            raw: text.slice(0, 3000),
          },
          { status: response.status }
        );
      }

      if (!response.ok || !data?.ok) {
        return NextResponse.json(
          {
            ok: false,
            step: "categories",
            pages_checked: pagesChecked,
            supplierStatus: response.status,
            error:
              data?.error ||
              "Error obteniendo catálogo de FazerCards",
            supplierResponse: data,
          },
          { status: response.status }
        );
      }

      const items = Array.isArray(data.items)
        ? data.items
        : [];

      for (const item of items) {
        const categoryId = String(
          item?.category_id || ""
        )
          .trim()
          .replace(/,$/, "");

        const name = String(
          item?.name || ""
        ).toLowerCase();

        const note = String(
          item?.note || ""
        ).toLowerCase();

        if (
          categoryId === "codm_activision_us" ||
          (
            name.includes("call of duty mobile") &&
            name.includes("activision") &&
            (
              name.includes("ee. uu.") ||
              name.includes("us") ||
              note.includes("estados unidos") ||
              note.includes("united states")
            )
          )
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
      category_id: "codm_activision_us",
      pages_checked: pagesChecked,
      matches_found: matches.length,
      matches,
    });
  } catch (error: any) {
    console.error(
      "FAZERCARDS COD MOBILE CATALOG ERROR:",
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
