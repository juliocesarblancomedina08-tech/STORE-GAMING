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

function extractArray(
data: unknown,
possibleKeys: string[]
): unknown[] {
if (Array.isArray(data)) return data;

if (!isObject(data)) return [];

for (const key of possibleKeys) {
const value = data[key];

if (Array.isArray(value)) return value;

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
"${FAZERCARDS_API}${endpoint}",
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

// Consultar solamente las categorías de juegos.
// No se consultan ofertas ni precios.
const response = await fazerCardsFetch("/topups");

if (!response.ok) {
  return NextResponse.json(
    {
      ok: false,
      supplier: "FazerCards",
      step: "categories",
      status: response.status,
      error:
        response.data ??
        response.raw.slice(0, 3000),
    },
    { status: 502 }
  );
}

const categories = extractArray(
  response.data,
  [
    "categories",
    "data",
    "results",
    "items",
    "topups",
  ]
);

const games = categories
  .filter(isObject)
  .map((category) => {
    const categoryId = getString(category, [
      "category_id",
      "categoryId",
      "id",
    ]);

    const categoryName = getString(category, [
      "category_name",
      "categoryName",
      "name",
      "title",
    ]);

    if (!categoryId || !categoryName) {
      return null;
    }

    return {
      category_id: categoryId,
      category_name: categoryName,
    };
  })
  .filter(
    (
      game
    ): game is {
      category_id: string;
      category_name: string;
    } => game !== null
  );

return NextResponse.json({
  ok: true,
  supplier: "FazerCards",
  total_games: games.length,
  games,
});

} catch (error) {
console.error(
"[FazerCards Games]",
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
