export type SausageManOffer = {
  id: string;
  supplierOfferId: string;
  name: string;
  displayName: string;
  price: number;
  supplierPrice: number;
  icon: string;
};

export const SAUSAGE_MAN = {
  name: "SAUSAGE MAN",
  categoryId: "sausage_man",
  image: "/images/sausage-man.jpg",

  note:
    "Recarga de Sausage Man. Introduce tu ID de personaje antes de realizar el pedido. El producto seleccionado se entrega directamente a tu cuenta después de realizar el pedido.",

  playerField: {
    name: "character_id",
    label: "ID de personaje",
    type: "text",
    description:
      "Introduce tu ID de personaje de Sausage Man.",
    placeholder: "Introduce tu ID de personaje",
  },

  offers: [
    {
      id: "sausage-61",
      supplierOfferId: "61_candies",
      name: "61 Candies",
      displayName: "61 Caramelos",
      price: 0.54,
      supplierPrice: 0.3909,
      icon: "🍬",
    },
    {
      id: "sausage-186",
      supplierOfferId: "186_candies",
      name: "186 Candies",
      displayName: "186 Caramelos",
      price: 1.32,
      supplierPrice: 1.1717,
      icon: "🍬",
    },
    {
      id: "sausage-318",
      supplierOfferId: "318_candies",
      name: "318 Candies",
      displayName: "318 Caramelos",
      price: 2.1,
      supplierPrice: 1.9525,
      icon: "🍬",
    },
    {
      id: "sausage-686",
      supplierOfferId: "686_candies",
      name: "686 Candies",
      displayName: "686 Caramelos",
      price: 4.06,
      supplierPrice: 3.9051,
      icon: "🍬",
    },
    {
      id: "sausage-1378",
      supplierOfferId: "1378_candies",
      name: "1378 Caramelos",
      displayName: "1378 Caramelos",
      price: 7.57,
      supplierPrice: 7.4192,
      icon: "🍬",
    },
    {
      id: "sausage-2118",
      supplierOfferId: "2118_caramelos",
      name: "2118 Caramelos",
      displayName: "2118 Caramelos",
      price: 11.46,
      supplierPrice: 11.3142,
      icon: "🍬",
    },
    {
      id: "sausage-3548",
      supplierOfferId: "3548_caramelos",
      name: "3548 Caramelos",
      displayName: "3548 Caramelos",
      price: 19.67,
      supplierPrice: 19.5153,
      icon: "🍬",
    },
    {
      id: "sausage-7108",
      supplierOfferId: "7108_caramelos",
      name: "7108 Caramelos",
      displayName: "7108 Caramelos",
      price: 39.18,
      supplierPrice: 39.0306,
      icon: "🍬",
    },
  ] satisfies SausageManOffer[],
} as const;
