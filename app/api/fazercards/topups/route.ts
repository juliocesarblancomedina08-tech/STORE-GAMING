import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FAZERCARDS_API =
  process.env.FAZERCARDS_API_URL || "https://api.fzr.cards/api/v2";

const FAZERCARDS_API_KEY = process.env.FAZERCARDS_API_KEY || "";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

function isDdosGuardResponse(text: string) {
  const lower = text.toLowerCase();

  return (
    lower.includes("ddos-guard") ||
    lower.includes("comprobando su navegador") ||
    lower.includes("check.ddos-guard.net") ||
    lower.includes(".well-known/ddos-guard")
  );
}

async function fetchFazerCards(
  url: string,
  options: RequestInit = {}
) {
  if (!FAZERCARDS_API_KEY) {
    throw new Error(
      "Falta configurar FAZERCARDS_API_KEY en las variables de entorno."
    );
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      "X-API-Key": FAZERCARDS_API_KEY,
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
      Referer: "https://reseller.fazercards.com/",
      Origin: "https://reseller.fazercards.com",
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  const ddosGuard = isDdosGuardResponse(text);

  let data: unknown = null;

  if (contentType.includes("application/json")) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  } else {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  return {
    response,
    contentType,
    text,
    data,
    ddosGuard,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const categoryId = searchParams.get("category_id");

    /*
     * ============================================================
     * CONSULTA DE UNA CATEGORÍA ESPECÍFICA
     * ============================================================
     *
     * Ejemplo:
     *
     * /api/fazercards/topups?category_id=delta_force
     *
     * Esta es la consulta que estamos utilizando para obtener
     * las ofertas reales de FazerCards.
     */

    if (categoryId) {
      const url =
        `${FAZERCARDS_API}/topups/offers` +
        `?category_id=${encodeURIComponent(categoryId)}`;

      const result = await fetchFazerCards(url);

      if (result.ddosGuard) {
        return NextResponse.json(
          {
            ok: false,
            step: "supplier",
            category_id: categoryId,
            supplierStatus: result.response.status,
            error:
              "FazerCards devolvió DDoS-Guard. La consulta no utilizó la variante de headers que funciona en el diagnóstico.",
            supplier: "FazerCards",
          },
          { status: 502 }
        );
      }

      if (!result.response.ok) {
        return NextResponse.json(
          {
            ok: false,
            step: "supplier",
            category_id: categoryId,
            supplierStatus: result.response.status,
            error:
              typeof result.data === "object" &&
              result.data !== null &&
              "message" in result.data
                ? String(
                    (result.data as { message?: unknown }).message
                  )
                : result.text.slice(0, 1000),
            supplier: "FazerCards",
          },
          { status: 502 }
        );
      }

      if (!result.data) {
        return NextResponse.json(
          {
            ok: false,
            step: "parse",
            category_id: categoryId,
            supplierStatus: result.response.status,
            contentType: result.contentType,
            error:
              "FazerCards respondió correctamente, pero la respuesta no pudo convertirse a JSON.",
            raw: result.text.slice(0, 2000),
          },
          { status: 502 }
        );
      }

      const data = result.data as Record<string, unknown>;

      if (data.ok === false) {
        return NextResponse.json(
          {
            ok: false,
            step: "supplier",
            category_id: categoryId,
            supplierStatus: result.response.status,
            supplierResponse: data,
            supplier: "FazerCards",
          },
          { status: 502 }
        );
      }

      /*
       * Devolvemos la respuesta real de FazerCards.
       *
       * No modificamos los offer_id ni los precios aquí.
       * La página/API de compra podrá utilizar posteriormente
       * exactamente los IDs entregados por el proveedor.
       */

      return NextResponse.json({
        ok: true,
        category_id:
          typeof data.category_id === "string"
            ? data.category_id
            : categoryId,

        name:
          typeof data.name === "string"
            ? data.name
            : categoryId,

        note:
          typeof data.note === "string"
            ? data.note
            : "",

        offers:
          Array.isArray(data.offers)
            ? data.offers
            : [],

        fields:
          Array.isArray(data.fields)
            ? data.fields
            : [],

        total_offers:
          Array.isArray(data.offers)
            ? data.offers.length
            : 0,

        supplier: "FazerCards",
      });
    }

    /*
     * ============================================================
     * CATÁLOGO COMPLETO
     * ============================================================
     *
     * Si no se proporciona category_id, consultamos /topups.
     */

    const categories: unknown[] = [];

    let cursor: string | null = null;
    let pagesChecked = 0;

    const maxPages = 50;

    while (pagesChecked < maxPages) {
      pagesChecked++;

      const url = new URL(`${FAZERCARDS_API}/topups`);

      if (cursor) {
        url.searchParams.set("cursor", cursor);
      }

      const result = await fetchFazerCards(url.toString());

      if (result.ddosGuard) {
        return NextResponse.json(
          {
            ok: false,
            step: "supplier",
            supplierStatus: result.response.status,
            error:
              "FazerCards devolvió DDoS-Guard al consultar el catálogo.",
            supplier: "FazerCards",
            pages_checked: pagesChecked,
          },
          { status: 502 }
        );
      }

      if (!result.response.ok) {
        return NextResponse.json(
          {
            ok: false,
            step: "supplier",
            supplierStatus: result.response.status,
            error: result.text.slice(0, 1000),
            supplier: "FazerCards",
            pages_checked: pagesChecked,
          },
          { status: 502 }
        );
      }

      if (!result.data) {
        return NextResponse.json(
          {
            ok: false,
            step: "parse",
            supplierStatus: result.response.status,
            contentType: result.contentType,
            error: "La respuesta del catálogo no es JSON válido.",
            supplier: "FazerCards",
            pages_checked: pagesChecked,
          },
          { status: 502 }
        );
      }

      const data = result.data as Record<string, unknown>;

      if (data.ok === false) {
        return NextResponse.json(
          {
            ok: false,
            step: "supplier",
            supplierStatus: result.response.status,
            supplierResponse: data,
            supplier: "FazerCards",
            pages_checked: pagesChecked,
          },
          { status: 502 }
        );
      }

      /*
       * El proveedor puede devolver las categorías directamente
       * como "categories".
       */

      if (Array.isArray(data.categories)) {
        categories.push(...data.categories);
      }

      /*
       * También dejamos compatibilidad con respuestas que
       * utilicen "data".
       */

      if (
        categories.length === 0 &&
        Array.isArray(data.data)
      ) {
        categories.push(...data.data);
      }

      /*
       * Buscar cursor de paginación.
       */

      let nextCursor: string | null = null;

      if (
        typeof data.next_cursor === "string" &&
        data.next_cursor.length > 0
      ) {
        nextCursor = data.next_cursor;
      } else if (
        typeof data.nextCursor === "string" &&
        data.nextCursor.length > 0
      ) {
        nextCursor = data.nextCursor;
      } else if (
        typeof data.cursor === "string" &&
        data.cursor.length > 0
      ) {
        nextCursor = data.cursor;
      }

      if (!nextCursor || nextCursor === cursor) {
        break;
      }

      cursor = nextCursor;
    }

    return NextResponse.json({
      ok: true,
      total: categories.length,
      pages_checked: pagesChecked,
      categories,
      supplier: "FazerCards",
    });
  } catch (error) {
    console.error("FazerCards topups error:", error);

    return NextResponse.json(
      {
        ok: false,
        step: "server",
        error: getErrorMessage(error),
        supplier: "FazerCards",
      },
      { status: 500 }
    );
  }
            }
