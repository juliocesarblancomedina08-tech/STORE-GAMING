import { NextRequest, NextResponse } from "next/server";

const FAZERCARDS_API = "https://api.fzr.cards/api/v2";

export const dynamic = "force-dynamic";

function isDdosGuardResponse(
  status: number,
  text: string
) {
  const body = String(text || "").toLowerCase();

  return (
    status === 403 &&
    (
      body.includes("ddos-guard") ||
      body.includes("check.ddos-guard.net") ||
      body.includes("comprobando su navegador antes de acceder") ||
      body.includes("checking your browser")
    )
  );
}

async function parseSupplierResponse(
  response: Response
) {
  const text = await response.text();

  if (
    isDdosGuardResponse(
      response.status,
      text
    )
  ) {
    return {
      ok: false,
      ddosGuard: true,
      text,
      data: null,
    };
  }

  let data: any = null;

  try {
    data = text
      ? JSON.parse(text)
      : null;
  } catch {
    return {
      ok: false,
      ddosGuard: false,
      text,
      data: null,
    };
  }

  return {
    ok: true,
    ddosGuard: false,
    text,
    data,
  };
}

export async function GET(
  request: NextRequest
) {
  try {
    /*
     * =========================================================
     * 0. API KEY
     * =========================================================
     */

    const apiKey =
      process.env.FAZERCARDS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "FAZERCARDS_API_KEY no está configurada",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * =========================================================
     * 1. OBTENER CATÁLOGO COMPLETO
     * =========================================================
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

      let response: Response;

      try {
        response = await fetch(
          url.toString(),
          {
            method: "GET",

            headers: {
              "X-API-Key": apiKey,
              Accept:
                "application/json",
              "User-Agent":
                "STORE-GAMING/1.0",
            },

            cache: "no-store",
          }
        );
      } catch (networkError: any) {
        console.error(
          "FAZERCARDS NETWORK ERROR:",
          networkError
        );

        return NextResponse.json(
          {
            ok: false,
            step: "network",
            pages_checked:
              pagesChecked,
            error:
              networkError?.message ||
              "No se pudo conectar con FazerCards.",
          },
          {
            status: 502,
          }
        );
      }

      const parsed =
        await parseSupplierResponse(
          response
        );

      /*
       * =======================================================
       * DDoS-GUARD
       * =======================================================
       */

      if (parsed.ddosGuard) {
        console.error(
          "FAZERCARDS BLOQUEÓ LA SOLICITUD CON DDOS-GUARD."
        );

        return NextResponse.json(
          {
            ok: false,

            step: "supplier",

            pages_checked:
              pagesChecked,

            supplierStatus:
              response.status,

            error:
              "FazerCards está devolviendo una protección DDoS-Guard en lugar de la respuesta JSON de la API.",

            reason:
              "El servidor de STORE-GAMING no puede obtener el catálogo mientras el proveedor mantenga este bloqueo.",

            supplier:
              "FazerCards",

            endpoint:
              `${FAZERCARDS_API}/topups`,
          },
          {
            status: 503,
          }
        );
      }

      /*
       * =======================================================
       * RESPUESTA NO JSON
       * =======================================================
       */

      if (!parsed.ok) {
        console.error(
          "FAZERCARDS DEVOLVIÓ UNA RESPUESTA NO JSON:",
          response.status
        );

        return NextResponse.json(
          {
            ok: false,

            step: "parse",

            pages_checked:
              pagesChecked,

            supplierStatus:
              response.status,

            error:
              "FazerCards devolvió una respuesta que no es JSON.",

            raw:
              parsed.text,
          },
          {
            status:
              response.status ||
              502,
          }
        );
      }

      const data =
        parsed.data;

      /*
       * =======================================================
       * RESPUESTA HTTP / API NO OK
       * =======================================================
       */

      if (
        !response.ok ||
        !data?.ok
      ) {
        return NextResponse.json(
          {
            ok: false,

            step: "catalog",

            pages_checked:
              pagesChecked,

            supplierStatus:
              response.status,

            supplierResponse:
              data,
          },
          {
            status:
              response.status ||
              502,
          }
        );
      }

      /*
       * =======================================================
       * GUARDAR ITEMS
       * =======================================================
       */

      const items =
        Array.isArray(
          data.items
        )
          ? data.items
          : [];

      allItems.push(
        ...items
      );

      /*
       * =======================================================
       * PAGINACIÓN
       * =======================================================
       */

      const meta =
        data.meta || {};

      if (
        !meta.has_more ||
        !meta.next_cursor
      ) {
        break;
      }

      cursor =
        String(
          meta.next_cursor
        );
    }

    /*
     * =========================================================
     * 2. LEER category_id
     * =========================================================
     */

    const requestedCategory =
      request.nextUrl.searchParams.get(
        "category_id"
      );

    /*
     * =========================================================
     * 3. SI category_id FUE ENVIADO
     * =========================================================
     */

    if (requestedCategory) {
      const normalizedCategory =
        requestedCategory
          .trim()
          .toLowerCase();

      const category =
        allItems.find(
          (item) =>
            String(
              item?.category_id
            )
              .trim()
              .toLowerCase() ===
            normalizedCategory
        );

      /*
       * =======================================================
       * CATEGORÍA NO ENCONTRADA
       * =======================================================
       */

      if (!category) {
        return NextResponse.json(
          {
            ok: false,

            error:
              "Categoría no encontrada en el catálogo de FazerCards.",

            category_id:
              requestedCategory,

            total_categories:
              allItems.length,
          },
          {
            status: 404,
          }
        );
      }

      /*
       * =======================================================
       * 4. OBTENER OFERTAS
       * =======================================================
       */

      const offersUrl =
        new URL(
          `${FAZERCARDS_API}/topups/offers`
        );

      offersUrl.searchParams.set(
        "category_id",
        String(
          category.category_id
        ).trim()
      );

      let offersResponse: Response;

      try {
        offersResponse =
          await fetch(
            offersUrl.toString(),
            {
              method: "GET",

              headers: {
                "X-API-Key":
                  apiKey,

                Accept:
                  "application/json",

                "User-Agent":
                  "STORE-GAMING/1.0",
              },

              cache:
                "no-store",
            }
          );
      } catch (networkError: any) {
        console.error(
          "FAZERCARDS OFFERS NETWORK ERROR:",
          networkError
        );

        return NextResponse.json(
          {
            ok: false,

            step:
              "offers_network",

            category_id:
              category.category_id,

            error:
              networkError?.message ||
              "No se pudo conectar con FazerCards para obtener las ofertas.",
          },
          {
            status: 502,
          }
        );
      }

      const offersParsed =
        await parseSupplierResponse(
          offersResponse
        );

      /*
       * =======================================================
       * DDoS-GUARD EN OFFERS
       * =======================================================
       */

      if (
        offersParsed.ddosGuard
      ) {
        console.error(
          "FAZERCARDS OFFERS BLOQUEADO POR DDOS-GUARD."
        );

        return NextResponse.json(
          {
            ok: false,

            step:
              "offers_supplier",

            category_id:
              category.category_id,

            supplierStatus:
              offersResponse.status,

            error:
              "FazerCards está devolviendo una protección DDoS-Guard en lugar de las ofertas JSON.",

            supplier:
              "FazerCards",

            endpoint:
              `${FAZERCARDS_API}/topups/offers`,
          },
          {
            status: 503,
          }
        );
      }

      /*
       * =======================================================
       * OFFERS NO JSON
       * =======================================================
       */

      if (
        !offersParsed.ok
      ) {
        return NextResponse.json(
          {
            ok: false,

            step:
              "offers_parse",

            category_id:
              category.category_id,

            supplierStatus:
              offersResponse.status,

            error:
              "FazerCards devolvió una respuesta no JSON al solicitar las ofertas.",

            raw:
              offersParsed.text,
          },
          {
            status:
              offersResponse.status ||
              502,
          }
        );
      }

      const offersData =
        offersParsed.data;

      /*
       * =======================================================
       * OFFERS HTTP / API NO OK
       * =======================================================
       */

      if (
        !offersResponse.ok ||
        !offersData?.ok
      ) {
        return NextResponse.json(
          {
            ok: false,

            step:
              "offers",

            category_id:
              category.category_id,

            supplierStatus:
              offersResponse.status,

            supplierResponse:
              offersData,
          },
          {
            status:
              offersResponse.status ||
              502,
          }
        );
      }

      /*
       * =======================================================
       * 5. DEVOLVER CATEGORÍA + OFERTAS + CAMPOS
       * =======================================================
       */

      return NextResponse.json({
        ok: true,

        category_id:
          category.category_id,

        name:
          category.name,

        note:
          category.note,

        offers:
          Array.isArray(
            offersData?.offers
          )
            ? offersData.offers
            : [],

        fields:
          Array.isArray(
            offersData?.fields
          )
            ? offersData.fields
            : [],

        total_categories:
          allItems.length,
      });
    }

    /*
     * =========================================================
     * 6. SIN category_id
     * DEVOLVER CATÁLOGO COMPLETO
     * =========================================================
     */

    return NextResponse.json({
      ok: true,

      total:
        allItems.length,

      categories:
        allItems,
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
          "Error interno del servidor",
      },
      {
        status: 500,
      }
    );
  }
              }
