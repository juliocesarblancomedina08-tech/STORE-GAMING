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
            "FAZERCARDS_API_KEY no está configurada.",
        },
        { status: 500 }
      );
    }

    const categoryId =
      "codm_activision_us";

    const url =
      `${FAZERCARDS_API}/topups/offers` +
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
          category_id: categoryId,
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
        "Call of Duty Mobile - Activision (EE. UU.)",

      offers:
        Array.isArray(data?.offers)
          ? data.offers
          : [],

      fields:
        Array.isArray(data?.fields)
          ? data.fields
          : [],

      supplierResponse:
        data,
    });
  } catch (error: any) {
    console.error(
      "FAZERCARDS COD MOBILE OFFERS ERROR:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        category_id:
          "codm_activision_us",
        error:
          error?.message ||
          "Error obteniendo ofertas de Call of Duty Mobile.",
      },
      { status: 500 }
    );
  }
          }
