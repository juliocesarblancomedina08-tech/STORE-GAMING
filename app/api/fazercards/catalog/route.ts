import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FAZERCARDS_API =
  process.env.FAZERCARDS_API_URL ||
  "https://api.fzr.cards/api/v2";

const API_KEY = process.env.FAZERCARDS_API_KEY;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  try {
    return JSON.stringify(error);
  } catch {
    return "Error desconocido";
  }
}

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null;
}

function extractArray(data: unknown, possibleKeys: string[]): unknown[] {
  if (Array.isArray(data)) return data;

  if (!isObject(data)) return [];

  for (const key of possibleKeys) {
    const value = data[key];

    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

function getString(
  object: JsonObject,
  keys: string[]
): string | null {
  for (const key of keys) {
    const value = object[key];

    if (
      typeof value === "string" ||
      typeof value === "number"
    ) {
      return String(value);
    }
  }

  return null;
}

async function fazerCardsFetch(
  endpoint: string
): Promise<{
  ok: boolean;
  status: number;
  data: unknown;
  raw: string;
}> {
  const response = await fetch(
    `${FAZERCARDS_API}${endpoint}`,
    {
      method: "GET",
      headers: {
        "X-API-Key": API_KEY!,
        Accept: "application/json",
        "User-Agent": "STORE-GAMING/1.0",
      },
      cache: "no-store",
    }
  );

  const raw = await response.text();

  let data: unknown = null;

  try {
    data = JSON.parse(raw);
  } catch {
    data = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
    raw,
  };
}

export async function GET() {
  try {
    if (!API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error: "Falta FAZERCARDS_API_KEY.",
        },
        { status: 500 }
      );
    }

    /*
     * 1. Obtener TODAS las categorías
     */
    const categoriesResponse =
      await fazerCardsFetch("/topups");

    if (!categoriesResponse.ok) {
      return NextResponse.json(
        {
          ok: false,
          supplier: "FazerCards",
          step: "categories",
          status: categoriesResponse.status,
          error:
            categoriesResponse.data ??
            categoriesResponse.raw.slice(0, 5000),
        },
        { status: 502 }
      );
    }

    const categories =
      extractArray(
        categoriesResponse.data,
        [
          "categories",
          "data",
          "results",
          "items",
          "topups",
        ]
      );

    /*
     * 2. Consultar las ofertas de TODAS las categorías
     */
    const catalog: unknown[] = [];

    for (const category of categories) {
      if (!isObject(category)) {
        continue;
      }

      const categoryId = getString(
        category,
        [
          "category_id",
          "categoryId",
          "id",
        ]
      );

      if (!categoryId) {
        continue;
      }

      const categoryName =
        getString(
          category,
          [
            "name",
            "title",
            "category_name",
            "categoryName",
          ]
        ) ?? categoryId;

      try {
        const offersResponse =
          await fazerCardsFetch(
            `/topups/offers?category_id=${encodeURIComponent(
              categoryId
            )}`
          );

        if (!offersResponse.ok) {
          catalog.push({
            category_id: categoryId,
            category_name: categoryName,
            offers: [],
            error: {
              status: offersResponse.status,
              response:
                offersResponse.data ??
                offersResponse.raw.slice(
                  0,
                  2000
                ),
            },
          });

          continue;
        }

        const offers =
          extractArray(
            offersResponse.data,
            [
              "offers",
              "data",
              "results",
              "items",
            ]
          );

        catalog.push({
          category_id: categoryId,
          category_name: categoryName,
          offers,
        });
      } catch (error) {
        catalog.push({
          category_id: categoryId,
          category_name: categoryName,
          offers: [],
          error: getErrorMessage(error),
        });
      }
    }

    /*
     * 3. Crear una búsqueda rápida
     * para localizar juegos por nombre.
     */
    const searchCatalog = catalog
      .filter(isObject)
      .map((category) => ({
        category_id:
          category.category_id ?? null,

        category_name:
          category.category_name ?? null,

        offers:
          Array.isArray(category.offers)
            ? category.offers
            : [],
      }));

    return NextResponse.json({
      ok: true,
      supplier: "FazerCards",

      total_categories:
        searchCatalog.length,

      catalog: searchCatalog,
    });
  } catch (error) {
    console.error(
      "[FazerCards Catalog]",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        supplier: "FazerCards",
        error: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}
