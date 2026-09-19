export const FREE_FIRE_LATAM = {
  game: "Free Fire LATAM",

  categoryId: "free_fire_latam",

  image: "/images/free-fire-latam.jpg",

  note:
    "Región: LATAM Y N.A. Recarga automática de Free Fire. Los diamantes se entregan automáticamente después de realizar el pedido.",

  playerField: {
    name: "player_id",

    label: "PONGA SU ID",

    description:
      "Introduzca el ID de la cuenta donde desea recibir la compra.",

    placeholder: "Introduzca su ID",
  },

  offers: [
    {
      id: "ff-110",

      supplierOfferId: "110_diamonds",

      name: "110 Diamonds",

      display: "110💎",

      price: 0.78,

      supplierPrice: 0.6972,

      icon: "💎",
    },

    {
      id: "ff-341",

      supplierOfferId: "341_diamonds",

      name: "341 Diamonds",

      display: "341💎",

      price: 2.2,

      supplierPrice: 2.0796,

      icon: "💎",
    },

    {
      id: "ff-572",

      supplierOfferId: "572_diamonds",

      name: "572 Diamonds",

      display: "572💎",

      price: 3.67,

      supplierPrice: 3.5131,

      icon: "💎",
    },

    {
      id: "ff-1166",

      supplierOfferId: "1166_diamonds",

      name: "1166 Diamonds",

      display: "1166💎",

      price: 6.73,

      supplierPrice: 6.5214,

      icon: "💎",
    },

    {
      id: "ff-2398",

      supplierOfferId: "2398_diamonds",

      name: "2398 Diamonds",

      display: "2398💎",

      price: 13.27,

      supplierPrice: 12.9519,

      icon: "💎",
    },

    {
      id: "ff-6160",

      supplierOfferId: "6160_diamonds",

      name: "6160 Diamonds",

      display: "6160💎",

      price: 33.7,

      supplierPrice: 32.9602,

      icon: "💎",
    },

    {
      id: "ff-elite-pass",

      supplierOfferId: "booyah_pass",

      name: "Pase Elite",

      display: "PASE ELITE",

      price: 4,

      supplierPrice: 3.8738,

      icon: "🎟️",
    },

    {
      id: "ff-weekly-membership",

      supplierOfferId: "weekly_membership",

      name: "Membresía semanal",

      display: "MEMBRESÍA SEMANAL",

      price: 2.3,

      supplierPrice: 2.1893,

      icon: "⭐",
    },

    {
      id: "ff-monthly-membership",

      supplierOfferId: "monthly_membership",

      name: "Membresía mensual",

      display: "MEMBRESÍA MENSUAL",

      price: 10.72,

      supplierPrice: 10.482,

      icon: "⭐",
    },
  ],
} as const;

export type FreeFireLatamOffer =
  (typeof FREE_FIRE_LATAM.offers)[number];
