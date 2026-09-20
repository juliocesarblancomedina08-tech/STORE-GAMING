import { NextRequest, NextResponse } from "next/server";

const FAZERCARDS_API = "https://api.fzr.cards/api/v2";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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

    /*
     * =========================================================
     * 1. OBTENER CATÁLOGO COMPLETO
     * =========================================================
     */

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
     * =========================================================
     * 2. SI VIENE category_id, BUSCAR ESA CATEGORÍA
     * =========================================================
     */

    const requestedCategory =
      request.nextUrl.searchParams.get(
        "category_id"
      );

    if (requestedCategory) {
      const category = allItems.find(
        (item) =>
          String(item?.category_id)
            .trim()
            .toLowerCase() ===
          requestedCategory
            .trim()
            .toLowerCase()
      );

      if (!category) {
        return NextResponse.json(
          {
            ok: false,
            error: "Categoría no encontrada en el catálogo de FazerCards.",
            category_id: requestedCategory,
            total_categories: allItems.length,
          },
          { status: 404 }
        );
      }

      /*
       * =======================================================
       * 3. INTENTAR OBTENER LAS OFERTAS
       * =======================================================
       *
       * Usamos la categoría REAL encontrada en /topups.
       */

      const offersUrl = new URL(
        `${FAZERCARDS_API}/topups/offers`
      );

      offersUrl.searchParams.set(
        "category_id",
        String(category.category_id).trim()
      );

      const offersResponse = await fetch(
        offersUrl.toString(),
        {
          method: "GET",
          headers: {
            "X-API-Key": apiKey,
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      const offersText =
        await offersResponse.text();

      let offersData: any;

      try {
        offersData = offersText
          ? JSON.parse(offersText)
          : null;
      } catch {
        return NextResponse.json(
          {
            ok: false,
            step: "offers_parse",
            category: {
              category_id:
                category.category_id,
              name: category.name,
              note: category.note,
            },
            supplierStatus:
              offersResponse.status,
            raw: offersText,
          },
          {
            status:
              offersResponse.status,
          }
        );
      }

      if (!offersResponse.ok) {
        return NextResponse.json(
          {
            ok: false,
            step: "offers",
            category: {
              category_id:
                category.category_id,
              name: category.name,
              note: category.note,
            },
            supplierStatus:
              offersResponse.status,
            supplierResponse:
              offersData,
          },
          {
            status:
              offersResponse.status,
          }
        );
      }

      return NextResponse.json({
        ok: true,

        category_id:
          category.category_id,

        name:
          category.name,

        note:
          category.note,

        offers:
          Array.isArray(
            offersData?.offers
          )
            ? offersData.offers
            : [],

        fields:
          Array.isArray(
            offersData?.fields
          )
            ? offersData.fields
            : [],

        total_categories:
          allItems.length,
      });
    }

    /*
     * =========================================================
     * 4. SIN category_id
     * DEVOLVER CATÁLOGO COMPLETO
     * =========================================================
     */

    return NextResponse.json({
      ok: true,

      total:
        allItems.length,

      categories:
        allItems,
    });
  } catch (error: any) {
    console.error(
      "FAZERCARDS TOPUPS ERROR:",
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
