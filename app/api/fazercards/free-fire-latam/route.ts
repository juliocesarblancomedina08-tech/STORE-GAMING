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

    // 1. Obtener categorías de top-ups
    const categoriesResponse = await fetch(
      `${FAZERCARDS_API}/topups?limit=50`,
      {
        method: "GET",
        headers: {
          "X-API-Key": apiKey,
        },
        cache: "no-store",
      }
    );

    const categoriesData = await categoriesResponse.json();

    if (!categoriesResponse.ok || !categoriesData.ok) {
      return NextResponse.json(
        {
          ok: false,
          step: "categories",
          error:
            categoriesData?.error ||
            "No se pudieron obtener las categorías de FazerCards",
        },
        { status: categoriesResponse.status }
      );
    }

    // 2. Buscar Free Fire LATAM
    const category = categoriesData.items?.find((item: any) => {
      const name = String(item.name || "").toLowerCase();

      return (
        name.includes("free fire") &&
        name.includes("latam")
      );
    });

    if (!category) {
      return NextResponse.json({
        ok: false,
        step: "search_category",
        message: "No se encontró Free Fire LATAM en el catálogo.",
        categories: categoriesData.items || [],
      });
    }

    // 3. Obtener ofertas reales de esa categoría
    const offersResponse = await fetch(
      `${FAZERCARDS_API}/topups/offers?category_id=${encodeURIComponent(
        category.category_id
      )}`,
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

    // 4. Devolver solamente la información necesaria
    return NextResponse.json({
      ok: true,

      game: {
        name: category.name,
        category_id: category.category_id,
      },

      fields: offersData.fields || [],

      offers: (offersData.offers || []).map((offer: any) => ({
        offer_id: offer.offer_id,
        name: offer.name,
        price_usd: offer.price_usd,
      })),
    });
  } catch (error: any) {
    console.error("FAZERCARDS FREE FIRE ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Error interno",
      },
      { status: 500 }
    );
  }
        }
