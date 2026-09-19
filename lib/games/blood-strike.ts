export type BloodStrikeOffer = {
  id: string;
  supplierOfferId: string;
  name: string;
  displayName: string;
  price: number;
  supplierPrice: number;
};

export type BloodStrikeGame = {
  id: string;
  categoryId: string;
  name: string;
  image: string;
  description: string;
  playerField: {
    name: string;
    label: string;
    description: string;
    placeholder: string;
    type: "text" | "number";
  };
  offers: BloodStrikeOffer[];
};

/*
|--------------------------------------------------------------------------
| BLOOD STRIKE
|--------------------------------------------------------------------------
|
| Todas las ofertas y precios se mantienen en el servidor.
| El frontend solo debe enviar el offerId seleccionado.
|
|--------------------------------------------------------------------------
*/

export const BLOOD_STRIKE: BloodStrikeGame = {
  id: "blood-strike",
  categoryId: "blood_strike",
  name: "Blood Strike",

  image: "/images/blood-strike.jpg",

  description:
    "Recarga Global de Blood Strike. Los Gold y pases se entregan automáticamente después de realizar el pedido.",

  playerField: {
    name: "player_id",
    label: "PONGA SU ID",
    description:
      "Introduzca el ID de la cuenta de Blood Strike donde desea recibir la compra.",
    placeholder: "Introduzca su ID",
    type: "text",
  },

  offers: [
    {
      id: "bs-51",
      supplierOfferId: "51_gold",
      name: "51 Gold",
      displayName: "51🪙",
      price: 0.52,
      supplierPrice: 0,
    },

    {
      id: "bs-105",
      supplierOfferId: "105_gold",
      name: "105 Gold",
      displayName: "105🪙",
      price: 0.85,
      supplierPrice: 0,
    },

    {
      id: "bs-320",
      supplierOfferId: "320_gold",
      name: "320 Gold",
      displayName: "320🪙",
      price: 2.35,
      supplierPrice: 0,
    },

    {
      id: "bs-540",
      supplierOfferId: "540_gold",
      name: "540 Gold",
      displayName: "540🪙",
      price: 3.85,
      supplierPrice: 0,
    },

    {
      id: "bs-1100",
      supplierOfferId: "1100_gold",
      name: "1100 Gold",
      displayName: "1100🪙",
      price: 7.6,
      supplierPrice: 0,
    },

    {
      id: "bs-2260",
      supplierOfferId: "2260_gold",
      name: "2260 Gold",
      displayName: "2260🪙",
      price: 15.1,
      supplierPrice: 0,
    },

    {
      id: "bs-5800",
      supplierOfferId: "5800_gold",
      name: "5800 Gold",
      displayName: "5800🪙",
      price: 37.4,
      supplierPrice: 0,
    },

    {
      id: "bs-pass",
      supplierOfferId: "pass",
      name: "Pase",
      displayName: "Pase",
      price: 3.4,
      supplierPrice: 0,
    },

    {
      id: "bs-premium-pass",
      supplierOfferId: "premium_pass",
      name: "Pase Premium",
      displayName: "Pase Premium",
      price: 7.5,
      supplierPrice: 0,
    },
  ],
};
