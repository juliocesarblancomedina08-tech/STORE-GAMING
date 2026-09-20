export const FC_MOBILE_ID = {
  game: "EAFC Mobile (ID)",

  categoryId: "eafc_mobile_id",

  image: "/images/fc-mobile.jpg",

  note:
    "Región: Indonesia. Recarga de EA Sports FC Mobile. Ingrese su ID de jugador antes de realizar el pedido. Asegúrese de que su cuenta EA esté registrada en la región de Indonesia; los códigos están bloqueados por región. El producto seleccionado se entrega directamente a su cuenta después de realizar el pedido.",

  playerField: {
    name: "player_id",

    label: "ID DEL JUGADOR",

    description:
      "Introduzca el ID de la cuenta donde desea recibir la compra.",

    placeholder: "Introduzca su ID",
  },

  offers: [
    {
      id: "fc-40",
      supplierOfferId: "40_fc_points",
      name: "40 FC Points",
      display: "40 FC",
      price: 0.51,
      supplierPrice: 0.3526,
      icon: "⚽",
    },

    {
      id: "fc-100",
      supplierOfferId: "100_fc_points",
      name: "100 FC Points",
      display: "100 FC",
      price: 1.02,
      supplierPrice: 0.8665,
      icon: "⚽",
    },

    {
      id: "fc-520",
      supplierOfferId: "520_fc_points",
      name: "520 FC Points",
      display: "520 FC",
      price: 4.41,
      supplierPrice: 4.2617,
      icon: "⚽",
    },

    {
      id: "fc-1070",
      supplierOfferId: "1070_fc_points",
      name: "1070 FC Puntos",
      display: "1070 FC",
      price: 8.72,
      supplierPrice: 8.5738,
      icon: "⚽",
    },

    {
      id: "fc-2200",
      supplierOfferId: "2200_fc_points",
      name: "2200 FC Points",
      display: "2200 FC",
      price: 17.89,
      supplierPrice: 17.7421,
      icon: "⚽",
    },

    {
      id: "fc-5750",
      supplierOfferId: "5750_fc_points",
      name: "5750 FC Points",
      display: "5750 FC",
      price: 43.24,
      supplierPrice: 43.0908,
      icon: "⚽",
    },

    {
      id: "fc-12000",
      supplierOfferId: "12000_fc_points",
      name: "12000 FC Points",
      display: "12000 FC",
      price: 86.39,
      supplierPrice: 86.242,
      icon: "⚽",
    },

    {
      id: "fc-39-silver",
      supplierOfferId: "39_silver",
      name: "39 Silver",
      display: "39 Plata",
      price: 0.51,
      supplierPrice: 0.3526,
      icon: "🪙",
    },

    {
      id: "fc-99-silver",
      supplierOfferId: "99_silver",
      name: "99 Silver",
      display: "99 Plata",
      price: 1.02,
      supplierPrice: 0.8665,
      icon: "🪙",
    },

    {
      id: "fc-499-silver",
      supplierOfferId: "499_silver",
      name: "499 Silver",
      display: "499 Plata",
      price: 4.41,
      supplierPrice: 4.2617,
      icon: "🪙",
    },

    {
      id: "fc-999-plata",
      supplierOfferId: "999_plata",
      name: "999 Plata",
      display: "999 Plata",
      price: 8.72,
      supplierPrice: 8.5738,
      icon: "🪙",
    },

    {
      id: "fc-1999-plata",
      supplierOfferId: "1999_plata",
      name: "1999 Plata",
      display: "1999 Plata",
      price: 17.89,
      supplierPrice: 17.7421,
      icon: "🪙",
    },

    {
      id: "fc-4999-plata",
      supplierOfferId: "4999_plata",
      name: "4999 Plata",
      display: "4999 Plata",
      price: 43.24,
      supplierPrice: 43.0908,
      icon: "🪙",
    },

    {
      id: "fc-9999-plata",
      supplierOfferId: "9999_plata",
      name: "9999 Plata",
      display: "9999 Plata",
      price: 86.39,
      supplierPrice: 86.242,
      icon: "🪙",
    },
  ],
} as const;

export type FcMobileIdOffer =
  (typeof FC_MOBILE_ID.offers)[number];
