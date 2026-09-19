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
        { status: 500 }
      );
    }

    const allCategories: any[] = [];

    let cursor: string | null = null;

    while (true) {
      const params = new URLSearchParams();

      params.set("limit", "100");

      if (cursor) {
        params.set("cursor", cursor);
      }

      const response = await fetch(
        `${FAZER_API_BASE}/topups?${params.toString()}`,
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

      const items = Array.isArray(
        data?.items
      )
        ? data.items
        : [];

      allCategories.push(...items);

      const hasMore =
        Boolean(
          data?.meta?.has_more
        );

      const nextCursor =
        data?.meta?.next_cursor ??
        null;

      if (
        !hasMore ||
        !nextCursor
      ) {
        break;
      }

      cursor = nextCursor;
    }

    const mobileLegends =
      allCategories.filter(
        (item) =>
          String(
            item?.name ?? ""
          )
            .toLowerCase()
            .includes(
              "mobile legends"
            )
      );

    const bloodStrike =
      allCategories.filter(
        (item) =>
          String(
            item?.name ?? ""
          )
            .toLowerCase()
            .includes(
              "blood strike"
            )
      );

    return NextResponse.json({
      ok: true,

      total:
        allCategories.length,

      categories:
        allCategories,

      mobileLegends,

      bloodStrike,
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
