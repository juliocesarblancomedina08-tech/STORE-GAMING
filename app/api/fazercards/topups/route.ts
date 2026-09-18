import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FAZER_API_BASE = "https://api.fzr.cards/api/v2";

function normalize(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function isMobileLegends(item: any): boolean {
  const values = [
    item?.name,
    item?.title,
    item?.product_name,
    item?.productName,
    item?.slug,
    item?.code,
    item?.category,
  ];

  const text = values
    .map(normalize)
    .join(" ");

  return (
    text.includes("mobile legends") ||
    text.includes("legends mobile")
  );
}

async function getTopupsPage(
  apiKey: string,
  cursor?: string
) {
  const url = new URL(
    `${FAZER_API_BASE}/topups`
  );

  url.searchParams.set("limit", "100");

  if (cursor) {
    url.searchParams.set(
      "cursor",
      cursor
    );
  }

  const response = await fetch(
    url.toString(),
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
    data = text
      ? JSON.parse(text)
      : null;
  } catch {
    data = {
      raw: text,
    };
  }

  return {
    response,
    data,
  };
}

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

    const allMatches: any[] = [];

    let cursor: string | undefined =
      undefined;

    let pagesChecked = 0;

    const MAX_PAGES = 10;

    while (
      pagesChecked < MAX_PAGES
    ) {
      const {
        response,
        data,
      } = await getTopupsPage(
        apiKey,
        cursor
      );

      pagesChecked++;

      if (!response.ok) {
        return NextResponse.json(
          {
            ok: false,
            supplierStatus:
              response.status,
            supplierResponse:
              data,
            pagesChecked,
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

      for (const item of items) {
        if (
          isMobileLegends(item)
        ) {
          allMatches.push(item);
        }
      }

      const hasMore =
        Boolean(
          data?.meta?.has_more
        );

      const nextCursor =
        data?.meta?.next_cursor;

      if (
        !hasMore ||
        !nextCursor
      ) {
        break;
      }

      cursor =
        String(nextCursor);
    }

    return NextResponse.json({
      ok: true,

      found:
        allMatches.length > 0,

      count:
        allMatches.length,

      pagesChecked,

      mobileLegends:
        allMatches,

      message:
        allMatches.length > 0
          ? "Se encontraron productos de Mobile Legends en FazerCards."
          : "No se encontró Mobile Legends en las páginas consultadas.",
    });
  } catch (error) {
    console.error(
      "ERROR CONSULTANDO CATÁLOGO FAZERCARDS:",
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
