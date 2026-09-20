import { NextRequest, NextResponse } from "next/server";

const FAZERCARDS_API = "https://api.fzr.cards/api/v2";

export const dynamic = "force-dynamic";

function isDdosGuardResponse(
  status: number,
  text: string
): boolean {
  const body = text.toLowerCase();

  return (
    status === 403 &&
    (
      body.includes("ddos-guard") ||
      body.includes("check.ddos-guard.net") ||
      body.includes("comprobando su navegador") ||
      body.includes("checking your browser") ||
      body.includes("checking your browser before accessing")
    )
  );
}

async function fetchSupplier(
  url: string,
  apiKey: string
) {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-Key": apiKey,
        Accept: "application/json",
        "User-Agent": "STORE-GAMING/1.0",
      },
      cache: "no-store",
    });

    const text = await response.text();

    return {
      response,
      text,
      ddosGuard: isDdosGuardResponse(response.status, text),
    };
  } catch (error: any) {
    return {
      response: null,
      text: "",
      ddosGuard: false,
      networkError:
        error?.message ||
        "No se pudo conectar con FazerCards.",
    };
  }
}

function parseJson(text: string) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.FAZERCARDS_API_KEY;

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

    const requestedCategory =
      request.nextUrl.searchParams.get(
        "category_id"
      )?.trim();

    /*
     * ============================================================
     * MODO 1:
     * Buscar una categoría específica.
     *
     * IMPORTANTE:
     * No descargamos primero /topups.
     *
     * Vamos directamente a:
     *
     * /api/v2/topups/offers?category_id=...
     *
     * Esto permite localizar las ofertas aunque el catálogo
     * general /topups esté siendo bloqueado.
     * ============================================================
     */

    if (requestedCategory) {
      const offersUrl = new URL(
        `${FAZERCARDS_API}/topups/offers`
      );

      offersUrl.searchParams.set(
        "category_id",
        requestedCategory
      );

      const supplier = await fetchSupplier(
        offersUrl.toString(),
        apiKey
      );

      if (supplier.networkError) {
        console.error(
          "FAZERCARDS OFFERS NETWORK ERROR:",
          supplier.networkError
        );

        return NextResponse.json(
          {
            ok: false,
            step: "supplier",
            category_id: requestedCategory,
            error:
              "No se pudo conectar con FazerCards.",
            reason: supplier.networkError,
            endpoint:
              `${FAZERCARDS_API}/topups/offers`,
          },
          { status: 502 }
        );
      }

      if (!supplier.response) {
        return NextResponse.json(
          {
            ok: false,
            step: "supplier",
            category_id: requestedCategory,
            error:
              "FazerCards no respondió.",
          },
          { status: 502 }
        );
      }

      /*
       * Detección específica de DDoS-Guard.
       */
      if (supplier.ddosGuard) {
        console.error(
          "FAZERCARDS OFFERS DDOS-GUARD:",
          supplier.response.status
        );

        return NextResponse.json(
          {
            ok: false,
            step: "supplier",
            category_id: requestedCategory,
            supplierStatus:
              supplier.response.status,
            error:
              "FazerCards está bloqueando la consulta de ofertas con DDoS-Guard.",
            reason:
              "La solicitud llegó directamente al endpoint de ofertas, pero el proveedor devolvió una página de protección en lugar de JSON.",
            supplier: "FazerCards",
            endpoint:
              `${FAZERCARDS_API}/topups/offers`,
          },
          { status: 503 }
        );
      }

      const offersData = parseJson(
        supplier.text
      );

      /*
       * Si FazerCards devuelve HTML u otra respuesta
       * que no sea JSON.
       */
      if (!offersData) {
        return NextResponse.json(
          {
            ok: false,
            step: "parse",
            category_id: requestedCategory,
            supplierStatus:
              supplier.response.status,
            error:
              "FazerCards no devolvió una respuesta JSON válida.",
            raw:
              supplier.text.slice(0, 5000),
          },
          {
            status:
              supplier.response.status >= 400
                ? supplier.response.status
                : 502,
          }
        );
      }

      /*
       * Error HTTP del proveedor.
       */
      if (!supplier.response.ok) {
        return NextResponse.json(
          {
            ok: false,
            step: "offers",
            category_id: requestedCategory,
            supplierStatus:
              supplier.response.status,
            supplierResponse: offersData,
          },
          {
            status:
              supplier.response.status,
          }
        );
      }

      /*
       * Error lógico devuelto por FazerCards.
       */
      if (
        offersData?.ok === false
      ) {
        return NextResponse.json(
          {
            ok: false,
            step: "offers",
            category_id: requestedCategory,
            supplierStatus:
              supplier.response.status,
            supplierResponse: offersData,
          },
          {
            status:
              supplier.response.status >= 400
                ? supplier.response.status
                : 502,
          }
        );
      }

      /*
       * ========================================================
       * RESPUESTA NORMAL DE UNA CATEGORÍA
       * ========================================================
       */

      const offers = Array.isArray(
        offersData?.offers
      )
        ? offersData.offers
        : [];

      const fields = Array.isArray(
        offersData?.fields
      )
        ? offersData.fields
        : [];

      return NextResponse.json({
        ok: true,

        category_id:
          requestedCategory,

        name:
          offersData?.name ||
          offersData?.category?.name ||
          null,

        note:
          offersData?.note ||
          offersData?.category?.note ||
          null,

        offers,

        fields,

        total_offers:
          offers.length,

        supplierResponse:
          offersData,
      });
    }

    /*
     * ============================================================
     * MODO 2:
     * CATÁLOGO COMPLETO
     *
     * Solo se ejecuta cuando NO se especifica category_id.
     *
     * Ejemplo:
     *
     * /api/fazercards/topups
     *
     * ============================================================
     */

    let cursor: string | null = null;

    let pagesChecked = 0;

    const allItems: any[] = [];

    while (pagesChecked < 50) {
      pagesChecked++;

      const url = new URL(
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

      const supplier = await fetchSupplier(
        url.toString(),
        apiKey
      );

      if (supplier.networkError) {
        console.error(
          "FAZERCARDS CATALOG NETWORK ERROR:",
          supplier.networkError
        );

        return NextResponse.json(
          {
            ok: false,
            step: "supplier",
            pages_checked:
              pagesChecked,
            error:
              "No se pudo conectar con FazerCards.",
            reason:
              supplier.networkError,
            endpoint:
              `${FAZERCARDS_API}/topups`,
          },
          { status: 502 }
        );
      }

      if (!supplier.response) {
        return NextResponse.json(
          {
            ok: false,
            step: "supplier",
            pages_checked:
              pagesChecked,
            error:
              "FazerCards no respondió.",
          },
          { status: 502 }
        );
      }

      /*
       * DDoS-Guard del catálogo general.
       */
      if (supplier.ddosGuard) {
        console.error(
          "FAZERCARDS CATALOG DDOS-GUARD:",
          supplier.response.status
        );

        return NextResponse.json(
          {
            ok: false,
            step: "supplier",
            pages_checked:
              pagesChecked,
            supplierStatus:
              supplier.response.status,
            error:
              "FazerCards está devolviendo una protección DDoS-Guard en lugar de la respuesta JSON del catálogo.",
            reason:
              "El proveedor está bloqueando la consulta del catálogo general.",
            supplier: "FazerCards",
            endpoint:
              `${FAZERCARDS_API}/topups`,
          },
          { status: 503 }
        );
      }

      const data = parseJson(
        supplier.text
      );

      if (!data) {
        return NextResponse.json(
          {
            ok: false,
            step: "parse",
            pages_checked:
              pagesChecked,
            supplierStatus:
              supplier.response.status,
            error:
              "FazerCards no devolvió una respuesta JSON válida.",
            raw:
              supplier.text.slice(0, 5000),
          },
          {
            status:
              supplier.response.status >= 400
                ? supplier.response.status
                : 502,
          }
        );
      }

      if (!supplier.response.ok) {
        return NextResponse.json(
          {
            ok: false,
            step: "catalog",
            pages_checked:
              pagesChecked,
            supplierStatus:
              supplier.response.status,
            supplierResponse:
              data,
          },
          {
            status:
              supplier.response.status,
          }
        );
      }

      if (data?.ok === false) {
        return NextResponse.json(
          {
            ok: false,
            step: "catalog",
            pages_checked:
              pagesChecked,
            supplierStatus:
              supplier.response.status,
            supplierResponse:
              data,
          },
          {
            status:
              supplier.response.status >= 400
                ? supplier.response.status
                : 502,
          }
        );
      }

      const items = Array.isArray(
        data?.items
      )
        ? data.items
        : [];

      allItems.push(
        ...items
      );

      const meta =
        data?.meta || {};

      if (
        !meta.has_more ||
        !meta.next_cursor
      ) {
        break;
      }

      cursor =
        meta.next_cursor;
    }

    /*
     * ========================================================
     * CATÁLOGO COMPLETO
     * ========================================================
     */

    return NextResponse.json({
      ok: true,
      total: allItems.length,
      pages_checked:
        pagesChecked,
      categories: allItems,
    });
  } catch (error: any) {
    console.error(
      "FAZERCARDS TOPUPS ERROR:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "Error interno del servidor.",
      },
      { status: 500 }
    );
  }
            }
