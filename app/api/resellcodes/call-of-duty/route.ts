import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const RESELL_CODES_BASE_URL =
  process.env.RESELL_CODES_BASE_URL ||
  "https://resell.codes";

const RESELL_CODES_API_KEY =
  process.env.RESELL_CODES_API_KEY || "";

const CATEGORY_ID = "codm_activision_us";

const TARGET_OFFERS = [
  {
    id: "cod-88",
    name: "88 CP",
    display: "88 CP",
    retailPrice: 1.14,
  },
  {
    id: "cod-460",
    name: "460 CP",
    display: "460 CP",
    retailPrice: 5.14,
  },
  {
    id: "cod-960",
    name: "960 CP",
    display: "960 CP",
    retailPrice: 10.14,
  },
  {
    id: "cod-2600",
    name: "2600 CP",
    display: "2600 CP",
    retailPrice: 25.14,
  },
  {
    id: "cod-5400",
    name: "5400 CP",
    display: "5400 CP",
    retailPrice: 50.14,
  },
];

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function findOffer(
  offers: any[],
  targetName: string
) {
  const target = normalize(targetName);

  return offers.find((offer) => {
    const name = normalize(
      String(offer?.name || "")
    );

    /*
     * ReSellCodes muestra las denominaciones
     * como:
     *
     * 80 + 8 CP
     * 400 + 60 CP
     * 800 + 160 CP
     * 2000 + 600 CP
     * 4000 + 1400 CP
     *
     * Estas corresponden a:
     *
     * 88 CP
     * 460 CP
     * 960 CP
     * 2600 CP
     * 5400 CP
     */

    if (target === "88 cp") {
      return (
        name.includes("80") &&
        name.includes("8") &&
        name.includes("cp")
      );
    }

    if (target === "460 cp") {
      return (
        name.includes("400") &&
        name.includes("60") &&
        name.includes("cp")
      );
    }

    if (target === "960 cp") {
      return (
        name.includes("800") &&
        name.includes("160") &&
        name.includes("cp")
      );
    }

    if (target === "2600 cp") {
      return (
        name.includes("2000") &&
        name.includes("600") &&
        name.includes("cp")
      );
    }

    if (target === "5400 cp") {
      return (
        name.includes("4000") &&
        name.includes("1400") &&
        name.includes("cp")
      );
    }

    return false;
  });
}

export async function GET() {
  try {
    if (!RESELL_CODES_API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Falta configurar RESELL_CODES_API_KEY en las variables de entorno.",
        },
        { status: 500 }
      );
    }

    const response = await fetch(
      `${RESELL_CODES_BASE_URL}/api/v1/top-ups/categories/${CATEGORY_ID}/offers`,
      {
        method: "GET",
        headers: {
          Authorization:
            `Bearer ${RESELL_CODES_API_KEY}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            data?.error ||
            "ReSellCodes rechazó la consulta del catálogo.",
          resellerResponse: data,
        },
        { status: response.status }
      );
    }

    const resellerOffers =
      Array.isArray(data)
        ? data
        : Array.isArray(data?.offers)
          ? data.offers
          : Array.isArray(data?.items)
            ? data.items
            : [];

    const offers = TARGET_OFFERS.map(
      (target) => {
        const resellerOffer =
          findOffer(
            resellerOffers,
            target.name
          );

        if (!resellerOffer) {
          return {
            ...target,
            available: false,
            resellerOfferId: null,
            resellerName: null,
            resellerPrice: null,
          };
        }

        return {
          ...target,
          available: true,
          resellerOfferId:
            resellerOffer.offer_id ||
            resellerOffer.id ||
            null,
          resellerName:
            resellerOffer.name ||
            null,
          resellerPrice:
            resellerOffer.price_usd ||
            resellerOffer.price ||
            null,
        };
      }
    );

    return NextResponse.json({
      ok: true,
      categoryId: CATEGORY_ID,
      name:
        "Call of Duty Mobile - Activision (US)",
      offers,
      resellerOffers,
    });
  } catch (error) {
    console.error(
      "RESELLCODES COD MOBILE ERROR:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se pudo conectar con ReSellCodes.",
      },
      { status: 500 }
    );
  }
  }
