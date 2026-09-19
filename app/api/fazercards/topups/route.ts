import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FAZER_API_BASE =
  "https://api.fzr.cards/api/v2";

export async function GET(
  request: NextRequest
) {
  try {
    const apiKey =
      process.env.FAZERCARDS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "FAZERCARDS_API_KEY no está configurada.",
        },
        { status: 500 }
      );
    }

    const categoryId =
      request.nextUrl.searchParams.get(
        "category_id"
      );

    if (!categoryId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Falta category_id. Ejemplo: ?category_id=blood_strike",
        },
        { status: 400 }
      );
    }

    const url =
      `${FAZER_API_BASE}/topups/offers` +
      `?category_id=${encodeURIComponent(
        categoryId
      )}`;

    const response = await fetch(
      url,
      {
        method: "GET",
        headers: {
          "X-API-Key": apiKey,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    const text =
      await response.text();

    let data: any;

    try {
      data = text
        ? JSON.parse(text)
        : null;
    } catch {
      data = {
        raw: text,
      };
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          supplierStatus:
            response.status,
          supplierResponse:
            data,
        },
        {
          status:
            response.status,
        }
      );
    }

    return NextResponse.json({
      ok: true,

      category_id:
        data?.category_id ??
        categoryId,

      name:
        data?.name ??
        categoryId,

      offers:
        Array.isArray(data?.offers)
          ? data.offers
          : [],

      fields:
        Array.isArray(data?.fields)
          ? data.fields
          : [],
    });
  } catch (error) {
    console.error(
      "ERROR OBTENIENDO OFERTAS DE FAZERCARDS:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error desconocido.",
      },
      { status: 500 }
    );
  }
      }
