import { NextResponse } from "next/server";

const FAZERCARDS_API = "https://api.fzr.cards/api/v2";

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

    let cursor: string | null = null;
    let category: any = null;
    let pagesChecked = 0;

    // Buscar Free Fire LATAM recorriendo todas las páginas
    while (pagesChecked < 20) {
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
        },
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        return NextResponse.json(
          {
            ok: false,
            step: "categories",
            error:
              data?.error ||
              "No se pudieron obtener las categorías de FazerCards",
          },
          { status: response.status }
        );
      }

      const items = Array.isArray(data.items) ? data.items : [];

      // Buscar Free Fire LATAM
      category = items.find((item: any) => {
        const name = String(item.name || "").toLowerCase();

        return (
          name.includes("free fire") &&
          name.includes("latam")
        );
      });

      if (category) {
        break;
      }

      const meta = data.meta || {};

      if (!meta.has_more || !meta.next_cursor) {
        break;
      }

      cursor = meta.next_cursor;
    }

    // No encontrado
    if (!category) {
      return NextResponse.json({
        ok: false,
        step: "search_category",
        message:
          "No se encontró Free Fire LATAM en el catálogo de FazerCards.",
        pages_checked: pagesChecked,
      });
    }

    // Obtener ofertas reales
    const offersUrl = new URL(
      `${FAZERCARDS_API}/topups/offers`
    );

    offersUrl.searchParams.set(
      "category_id",
      category.category_id
    );

    const offersResponse = await fetch(
      offersUrl.toString(),
      {
        method: "GET",
        headers: {
          "X-API-Key": apiKey,
        },
        cache: "no-store",
      }
    );

    const offersData = await offersResponse.json();

    if (!offersResponse.ok || !offersData.ok) {
      return NextResponse.json(
        {
          ok: false,
          step: "offers",
          category,
          error:
            offersData?.error ||
            "No se pudieron obtener las ofertas de Free Fire LATAM",
        },
        { status: offersResponse.status }
      );
    }

    return NextResponse.json({
      ok: true,

      game: {
        name: category.name,
        category_id: category.category_id,
        note: category.note || null,
      },

      fields: offersData.fields || [],

      offers: (offersData.offers || []).map((offer: any) => ({
        offer_id: offer.offer_id,
        name: offer.name,
        price_usd: offer.price_usd,
      })),

      pages_checked: pagesChecked,
    });
  } catch (error: any) {
    console.error(
      "FAZERCARDS FREE FIRE LATAM ERROR:",
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
