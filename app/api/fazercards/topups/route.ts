import { NextResponse } from "next/server";
import { FazerCardsClient } from "fazercards";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const API_KEY = process.env.FAZERCARDS_API_KEY;

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

function getErrorStatus(error: unknown): number | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error
  ) {
    const status = (error as { status?: unknown }).status;

    if (typeof status === "number") {
      return status;
    }
  }

  return null;
}

function getErrorCode(error: unknown): string | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error
  ) {
    const code = (error as { code?: unknown }).code;

    if (typeof code === "string") {
      return code;
    }
  }

  return null;
}

function getResponseBody(error: unknown): unknown {
  if (
    typeof error === "object" &&
    error !== null &&
    "responseBody" in error
  ) {
    return (error as { responseBody?: unknown }).responseBody;
  }

  return null;
}

export async function GET(request: Request) {
  try {
    if (!API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          step: "config",
          error:
            "Falta la variable de entorno FAZERCARDS_API_KEY.",
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);

    const requestedCategory = searchParams.get("category_id");

    /*
     * Cliente oficial de FazerCards.
     *
     * El SDK utiliza:
     * https://api.fzr.cards/api/v2
     *
     * y autentica mediante X-API-Key.
     */
    const fz = new FazerCardsClient({
      apiKey: API_KEY,
      appName: "STORE-GAMING/1.0",
      timeoutMs: 30_000,
      retries: 2,
    });

    /*
     * ============================================================
     * MODO 1
     * Obtener las ofertas de una categoría concreta.
     *
     * Ejemplo:
     *
     * /api/fazercards/topups?category_id=delta_force
     *
     * /api/fazercards/topups?category_id=eafc_mobile_id
     * ============================================================
     */
    if (requestedCategory) {
      try {
        const result = await fz.topups.offers(
          requestedCategory
        );

        /*
         * Normalizamos solamente lo necesario para nuestro frontend.
         * Conservamos también el objeto completo que devuelve FazerCards.
         */
        return NextResponse.json({
          ok: true,
          category_id: requestedCategory,
          name:
            typeof result?.name === "string"
              ? result.name
              : requestedCategory,
          offers: Array.isArray(result?.offers)
            ? result.offers
            : [],
          fields: Array.isArray(result?.fields)
            ? result.fields
            : [],
          total_offers: Array.isArray(result?.offers)
            ? result.offers.length
            : 0,

          /*
           * Útil para comprobar exactamente qué devolvió
           * el SDK durante esta fase de diagnóstico.
           */
          supplier: "FazerCards",
        });
      } catch (error) {
        const supplierStatus = getErrorStatus(error);
        const supplierCode = getErrorCode(error);
        const responseBody = getResponseBody(error);
        const message = getErrorMessage(error);

        console.error(
          "[FazerCards] Error obteniendo ofertas:",
          {
            category_id: requestedCategory,
            status: supplierStatus,
            code: supplierCode,
            message,
            responseBody,
          }
        );

        /*
         * Si FazerCards devuelve 403, lo mostramos claramente.
         * Esto nos permitirá comprobar si el SDK también recibe
         * el bloqueo de DDoS-Guard.
         */
        if (supplierStatus === 403) {
          return NextResponse.json(
            {
              ok: false,
              step: "supplier-sdk",
              category_id: requestedCategory,
              supplierStatus: 403,
              error:
                "FazerCards rechazó la consulta de ofertas mediante el SDK oficial.",
              code: supplierCode,
              message,
              responseBody,
              supplier: "FazerCards",
              sdk: "fazercards",
            },
            { status: 502 }
          );
        }

        return NextResponse.json(
          {
            ok: false,
            step: "supplier-sdk",
            category_id: requestedCategory,
            supplierStatus,
            error:
              "No se pudieron obtener las ofertas de FazerCards mediante el SDK oficial.",
            code: supplierCode,
            message,
            responseBody,
            supplier: "FazerCards",
            sdk: "fazercards",
          },
          { status: 502 }
        );
      }
    }

    /*
     * ============================================================
     * MODO 2
     * Obtener el catálogo completo de top-ups.
     *
     * El SDK oficial permite recorrer el catálogo mediante
     * iterCategories().
     * ============================================================
     */

    const categories: unknown[] = [];

    try {
      for await (const category of fz.topups.iterCategories()) {
        categories.push(category);
      }
    } catch (error) {
      const supplierStatus = getErrorStatus(error);
      const supplierCode = getErrorCode(error);
      const responseBody = getResponseBody(error);
      const message = getErrorMessage(error);

      console.error(
        "[FazerCards] Error obteniendo categorías:",
        {
          status: supplierStatus,
          code: supplierCode,
          message,
          responseBody,
        }
      );

      return NextResponse.json(
        {
          ok: false,
          step: "catalog-sdk",
          supplierStatus,
          error:
            "No se pudo obtener el catálogo de top-ups mediante el SDK oficial.",
          code: supplierCode,
          message,
          responseBody,
          supplier: "FazerCards",
          sdk: "fazercards",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      total: categories.length,
      categories,
      supplier: "FazerCards",
      sdk: "fazercards",
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
        error: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
          }
