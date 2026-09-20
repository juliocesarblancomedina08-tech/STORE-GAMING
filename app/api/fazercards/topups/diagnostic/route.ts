import { NextResponse } from "next/server";
import { FazerCardsClient } from "fazercards";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const API_BASE =
  process.env.FAZERCARDS_API_URL ||
  "https://api.fzr.cards/api/v2";

const API_KEY =
  process.env.FAZERCARDS_API_KEY;

function errorMessage(error: unknown): string {
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

function errorStatus(error: unknown): number | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error
  ) {
    const value = (error as { status?: unknown }).status;

    return typeof value === "number"
      ? value
      : null;
  }

  return null;
}

function errorCode(error: unknown): string | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error
  ) {
    const value = (error as { code?: unknown }).code;

    return typeof value === "string"
      ? value
      : null;
  }

  return null;
}

function errorResponseBody(
  error: unknown
): unknown {
  if (
    typeof error === "object" &&
    error !== null &&
    "responseBody" in error
  ) {
    return (
      error as {
        responseBody?: unknown;
      }
    ).responseBody;
  }

  return null;
}

function detectDdosGuard(
  status: number,
  text: string
): boolean {
  const body = text.toLowerCase();

  return (
    status === 403 &&
    (
      body.includes("ddos-guard") ||
      body.includes("check.ddos-guard.net") ||
      body.includes("ddos guard") ||
      body.includes("checking your browser")
    )
  );
}

async function restRequest(
  url: string,
  headers: HeadersInit
) {
  const started =
    Date.now();

  try {
    const response =
      await fetch(url, {
        method: "GET",
        headers,
        cache: "no-store",
      });

    const text =
      await response.text();

    let json: unknown = null;

    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }

    return {
      ok: response.ok,
      status: response.status,
      contentType:
        response.headers.get(
          "content-type"
        ),
      durationMs:
        Date.now() - started,
      isJson:
        json !== null,
      isDdosGuard:
        detectDdosGuard(
          response.status,
          text
        ),
      data: json,
      raw:
        json === null
          ? text.slice(0, 1500)
          : undefined,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      contentType: null,
      durationMs:
        Date.now() - started,
      isJson: false,
      isDdosGuard: false,
      error:
        errorMessage(error),
    };
  }
}

export async function GET(
  request: Request
) {
  const started =
    Date.now();

  try {
    if (!API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          step: "config",
          error:
            "Falta FAZERCARDS_API_KEY.",
        },
        { status: 500 }
      );
    }

    const { searchParams } =
      new URL(request.url);

    /*
     * Por defecto probamos Delta Force.
     *
     * También puedes utilizar:
     *
     * ?category_id=eafc_mobile_id
     */

    const categoryId =
      searchParams.get(
        "category_id"
      ) ||
      "delta_force";

    const offersUrl =
      `${API_BASE}/topups/offers` +
      `?category_id=${encodeURIComponent(
        categoryId
      )}`;

    /*
     * ============================================================
     * PRUEBA 1
     * REST + X-API-Key
     * ============================================================
     */

    const test1 =
      await restRequest(
        offersUrl,
        {
          "X-API-Key":
            API_KEY,
          "Accept":
            "application/json",
          "User-Agent":
            "STORE-GAMING-DIAGNOSTIC/1.0",
        }
      );

    /*
     * ============================================================
     * PRUEBA 2
     * REST + Authorization: Bearer
     * ============================================================
     */

    const test2 =
      await restRequest(
        offersUrl,
        {
          "Authorization":
            `Bearer ${API_KEY}`,
          "Accept":
            "application/json",
          "User-Agent":
            "STORE-GAMING-DIAGNOSTIC/1.0",
        }
      );

    /*
     * ============================================================
     * PRUEBA 3
     * SDK OFICIAL
     *
     * No hacemos ninguna compra.
     * Solo GET de ofertas.
     * ============================================================
     */

    let test3;

    try {
      const fz =
        new FazerCardsClient({
          apiKey: API_KEY,
          baseUrl: API_BASE,
          timeoutMs: 30000,
          retries: 0,
          appName:
            "STORE-GAMING-DIAGNOSTIC/1.0",
        });

      const sdkStarted =
        Date.now();

      const result =
        await fz.topups.offers(
          categoryId
        );

      test3 = {
        ok: true,
        status: 200,
        durationMs:
          Date.now() -
          sdkStarted,
        category_id:
          categoryId,
        result,
      };
    } catch (error) {
      test3 = {
        ok: false,
        status:
          errorStatus(error),
        code:
          errorCode(error),
        message:
          errorMessage(error),
        responseBody:
          errorResponseBody(
            error
          ),
      };
    }

    /*
     * ============================================================
     * RESUMEN
     * ============================================================
     */

    return NextResponse.json({
      ok: true,

      diagnostic: true,

      category_id:
        categoryId,

      endpoint:
        "/topups/offers",

      url:
        offersUrl,

      elapsedMs:
        Date.now() - started,

      tests: {
        rest_x_api_key: test1,

        rest_bearer: test2,

        official_sdk: test3,
      },

      interpretation: {
        rest_x_api_key:
          test1.ok
            ? "RESPONDE"
            : test1.isDdosGuard
              ? "403 DDOS-GUARD"
              : "ERROR",

        rest_bearer:
          test2.ok
            ? "RESPONDE"
            : test2.isDdosGuard
              ? "403 DDOS-GUARD"
              : "ERROR",

        official_sdk:
          test3.ok
            ? "RESPONDE"
            : test3.status === 403
              ? "403 / AUTH O PROTECCIÓN"
              : "ERROR",
      },
    });
  } catch (error) {
    console.error(
      "[FazerCards Diagnostic]",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        step: "diagnostic",
        error:
          errorMessage(error),
      },
      { status: 500 }
    );
  }
    }
