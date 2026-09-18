import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FAZER_API_BASE = "https://api.fzr.cards/api/v2";

export async function GET() {
  try {
    const apiKey = process.env.FAZERCARDS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          error: "FAZERCARDS_API_KEY no está configurada.",
        },
        { status: 500 }
      );
    }

    const response = await fetch(
      `${FAZER_API_BASE}/topups?limit=100`,
      {
        method: "GET",
        headers: {
          "X-API-Key": apiKey,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    const text = await response.text();

    let data: any;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = {
        raw: text,
      };
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          supplierStatus: response.status,
          supplierResponse: data,
        },
        { status: response.status }
      );
    }

    const items = Array.isArray(data?.items)
      ? data.items
      : [];

    // Buscar Mobile Legends / Legends Mobile.
    const mobileLegends = items.filter(
      (item: any) => {
        const name = String(
          item?.name ?? ""
        ).toLowerCase();

        return (
          name.includes("mobile legends") ||
          name.includes("legends mobile")
        );
      }
    );

    return NextResponse.json({
      ok: true,

      total: data?.meta?.total ?? items.length,

      mobileLegends,

      meta: data?.meta ?? null,
    });
  } catch (error) {
    console.error(
      "ERROR CONSULTANDO FAZERCARDS TOPUPS:",
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
