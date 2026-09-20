import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FAZERCARDS_API =
  process.env.FAZERCARDS_API_URL ||
  "https://api.fzr.cards/api/v2";

const FAZERCARDS_API_KEY =
  process.env.FAZERCARDS_API_KEY;

type JsonObject = Record<string, unknown>;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Error desconocido";
  }
}

function isDdosGuardResponse(
  status: number,
  text: string
): boolean {
  const lower = text.toLowerCase();

  return (
    status === 403 &&
    (
      lower.includes("ddos-guard") ||
      lower.includes("check.ddos-guard.net") ||
      lower.includes("ddos guard") ||
      lower.includes("checking your browser")
    )
  );
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function fetchFazerCards(
  url: string
): Promise<{
  response: Response;
  text: string;
  data: unknown;
}> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-API-Key": FAZERCARDS_API_KEY || "",
      "Accept": "application/json",
      "User-Agent": "STORE-GAMING/1.0",
    },
    cache: "no-store",
  });

  const text = await response.text();

  return {
    response,
    text,
    data: parseJson(text),
  };
}

export async function GET(request: Request) {
  try {
    /*
     * ============================================================
     * CONFIGURACIÓN
     * ============================================================
     */

    if (!FAZERCARDS_API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          step: "config",
          error:
            "Falta la variable FAZERCARDS_API_KEY en las variables de entorno.",
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);

    const categoryId =
      searchParams.get("category_id");

    /*
     * ============================================================
     * MODO 1:
     * OBTENER OFERTAS DE UNA CATEGORÍA
     *
     * Ejemplo:
     *
     * ?category_id=delta_force
     *
     * ?category_id=eafc_mobile_id
     *
     * IMPORTANTE:
     *
     * Cuando category_id existe, NO hacemos primero una consulta
     * al catálogo /topups.
     *
     * Vamos directamente a:
     *
     * /topups/offers?category_id=...
     * ============================================================
     */

    if (categoryId) {
      const offersUrl =
        `${FAZERCARDS_API}/topups/offers` +
        `?category_id=${encodeURIComponent(categoryId)}`;

      let supplierResult;

      try {
        supplierResult =
          await fetchFazerCards(offersUrl);
      } catch (error) {
        return NextResponse.json(
          {
            ok: false,
            step: "supplier-network",
            category_id: categoryId,
            error:
              "No se pudo conectar con FazerCards.",
            details: getErrorMessage(error),
            supplier: "FazerCards",
            endpoint:
              `${FAZERCARDS_API}/topups/offers`,
          },
          { status: 502 }
        );
      }

      const {
        response,
        text,
        data,
      } = supplierResult;

      /*
       * ==========================================================
       * DDOS-GUARD
       * ==========================================================
       */

      if (
        isDdosGuardResponse(
          response.status,
          text
        )
      ) {
        return NextResponse.json(
          {
            ok: false,
            step: "supplier",
            category_id: categoryId,
            supplierStatus: response.status,
            error:
              "FazerCards está bloqueando la consulta de ofertas con DDoS-Guard.",
            reason:
              "La solicitud llegó directamente al endpoint de ofertas, pero el proveedor devolvió una página de protección en lugar de JSON.",
            supplier: "FazerCards",
            endpoint:
              `${FAZERCARDS_API}/topups/offers`,
          },
          { status: 502 }
        );
      }

      /*
       * ==========================================================
       * RESPUESTA NO JSON
       * ==========================================================
       */

      if (data === null) {
        return NextResponse.json(
          {
            ok: false,
            step: "parse",
            category_id: categoryId,
            supplierStatus: response.status,
            error:
              "FazerCards no devolvió JSON.",
            contentType:
              response.headers.get(
                "content-type"
              ),
            raw:
              text.slice(0, 1000),
            supplier: "FazerCards",
          },
          { status: 502 }
        );
      }

      /*
       * ==========================================================
       * ERROR HTTP
       * ==========================================================
       */

      if (!response.ok) {
        return NextResponse.json(
          {
            ok: false,
            step: "supplier",
            category_id: categoryId,
            supplierStatus: response.status,
            error:
              "FazerCards rechazó la consulta de ofertas.",
            supplierResponse: data,
            supplier: "FazerCards",
          },
          { status: 502 }
        );
      }

      /*
       * ==========================================================
       * ERROR LÓGICO DE FAZERCARDS
       * ==========================================================
       */

      if (
        typeof data === "object" &&
        data !== null &&
        "ok" in data &&
        (data as JsonObject).ok === false
      ) {
        return NextResponse.json(
          {
            ok: false,
            step: "supplier",
            category_id: categoryId,
            supplierStatus: response.status,
            error:
              "FazerCards devolvió un error.",
            supplierResponse: data,
            supplier: "FazerCards",
          },
          { status: 502 }
        );
      }

      /*
       * ==========================================================
       * RESPUESTA CORRECTA
       * ==========================================================
       */

      const result =
        data as JsonObject;

      const offers =
        Array.isArray(result.offers)
          ? result.offers
          : [];

      const fields =
        Array.isArray(result.fields)
          ? result.fields
          : [];

      return NextResponse.json({
        ok: true,
        category_id: categoryId,

        name:
          typeof result.name === "string"
            ? result.name
            : categoryId,

        note:
          typeof result.note === "string"
            ? result.note
            : null,

        offers,

        fields,

        total_offers:
          offers.length,

        supplier: "FazerCards",
      });
    }

    /*
     * ============================================================
     * MODO 2:
     * CATÁLOGO GENERAL
     *
     * Si NO se proporciona category_id, obtenemos las categorías
     * disponibles en /topups.
     * ============================================================
     */

    const categories: unknown[] = [];

    let cursor: string | null = null;

    const maxPages = 50;

    for (
      let page = 1;
      page <= maxPages;
      page++
    ) {
      const url =
        new URL(
          `${FAZERCARDS_API}/topups`
        );

      url.searchParams.set(
        "limit",
        "50"
      );

      if (cursor) {
        url.searchParams.set(
          "cursor",
          cursor
        );
      }

      let supplierResult;

      try {
        supplierResult =
          await fetchFazerCards(
            url.toString()
          );
      } catch (error) {
        return NextResponse.json(
          {
            ok: false,
            step: "catalog-network",
            error:
              "No se pudo conectar con FazerCards.",
            details:
              getErrorMessage(error),
            supplier: "FazerCards",
          },
          { status: 502 }
        );
      }

      const {
        response,
        text,
        data,
      } = supplierResult;

      /*
       * DDoS-Guard del catálogo
       */

      if (
        isDdosGuardResponse(
          response.status,
          text
        )
      ) {
        return NextResponse.json(
          {
            ok: false,
            step: "catalog",
            supplierStatus:
              response.status,
            error:
              "FazerCards está bloqueando el catálogo con DDoS-Guard.",
            supplier: "FazerCards",
            endpoint:
              `${FAZERCARDS_API}/topups`,
          },
          { status: 502 }
        );
      }

      /*
       * Respuesta no JSON
       */

      if (data === null) {
        return NextResponse.json(
          {
            ok: false,
            step: "catalog-parse",
            supplierStatus:
              response.status,
            error:
              "FazerCards no devolvió JSON para el catálogo.",
            contentType:
              response.headers.get(
                "content-type"
              ),
            raw:
              text.slice(0, 1000),
            supplier: "FazerCards",
          },
          { status: 502 }
        );
      }

      /*
       * Error HTTP
       */

      if (!response.ok) {
        return NextResponse.json(
          {
            ok: false,
            step: "catalog-supplier",
            supplierStatus:
              response.status,
            error:
              "FazerCards rechazó la consulta del catálogo.",
            supplierResponse: data,
            supplier: "FazerCards",
          },
          { status: 502 }
        );
      }

      if (
        typeof data !== "object" ||
        data === null
      ) {
        return NextResponse.json(
          {
            ok: false,
            step: "catalog-format",
            error:
              "La respuesta del catálogo de FazerCards tiene un formato inesperado.",
            supplierResponse: data,
            supplier: "FazerCards",
          },
          { status: 502 }
        );
      }

      const catalog =
        data as JsonObject;

      /*
       * Buscar categorías.
       *
       * FazerCards puede devolver:
       *
       * {
       *   categories: [...]
       * }
       *
       * o directamente un array.
       */

      if (
        Array.isArray(
          catalog.categories
        )
      ) {
        categories.push(
          ...catalog.categories
        );
      } else if (
        Array.isArray(data)
      ) {
        categories.push(
          ...(data as unknown[])
        );
      }

      /*
       * Cursor de paginación.
       */

      const nextCursor =
        typeof catalog.next_cursor ===
        "string"
          ? catalog.next_cursor
          : typeof catalog.nextCursor ===
              "string"
            ? catalog.nextCursor
            : null;

      if (!nextCursor) {
        break;
      }

      cursor = nextCursor;
    }

    /*
     * ============================================================
     * RESPUESTA DEL CATÁLOGO
     * ============================================================
     */

    return NextResponse.json({
      ok: true,
      total: categories.length,
      categories,
      supplier: "FazerCards",
    });
  } catch (error) {
    console.error(
      "[FazerCards] Error general:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        step: "server",
        error:
          "Error interno consultando FazerCards.",
        details:
          getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}
