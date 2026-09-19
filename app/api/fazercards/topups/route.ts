import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FAZER_API_BASE =
  "https://api.fzr.cards/api/v2";

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
        {
          status: 500,
        }
      );
    }

    const allCategories: any[] = [];

    let cursor: string | null = null;

    let hasMore = true;

    while (hasMore) {
      const url =
        `${FAZER_API_BASE}/topups` +
        `?limit=100` +
        (cursor
          ? `&cursor=${encodeURIComponent(cursor)}`
          : "");

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

      const categories =
        Array.isArray(data)
          ? data
          : Array.isArray(
              data?.topups
            )
          ? data.topups
          : Array.isArray(
              data?.categories
            )
          ? data.categories
          : [];

      allCategories.push(
        ...categories
      );

      hasMore =
        Boolean(
          data?.meta?.has_more
        );

      cursor =
        data?.meta?.next_cursor ??
        null;

      if (!cursor) {
        hasMore = false;
      }
    }

    return NextResponse.json({
      ok: true,

      total:
        allCategories.length,

      categories:
        allCategories,

      mobileLegends:
        allCategories.filter(
          (item) =>
            String(
              item?.name ?? ""
            )
              .toLowerCase()
              .includes(
                "mobile legends"
              )
        ),

      bloodStrike:
        allCategories.filter(
          (item) =>
            String(
              item?.name ?? ""
            )
              .toLowerCase()
              .includes(
                "blood strike"
              )
        ),
    });
  } catch (error) {
    console.error(
      "ERROR OBTENIENDO CATEGORÍAS DE FAZERCARDS:",
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
      {
        status: 500,
      }
    );
  }
          }
