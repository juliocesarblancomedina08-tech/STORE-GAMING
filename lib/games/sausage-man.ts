export type SausageManOffer = {
  id: string;
  name: string;
  price: number;
  supplierPrice: number;
  icon: string;
};

export const SAUSAGE_MAN = {
  categoryId: "sausage_man",

  name: "Sausage Man",

  image: "/images/sausage-man.jpg",

  note:
    "Región: Global. Recarga automática de Sausage Man. El producto seleccionado se entrega directamente a tu cuenta después de realizar el pedido.",

  field: {
    key: "character_id",
    label: "ID de personaje",
    type: "text",
  },

  offers: [
    {
      id: "61_candies",
      name: "61 Caramelos",
      price: 0.5909,
      supplierPrice: 0.3909,
      icon: "🍬",
    },

    {
      id: "186_candies",
      name: "186 Caramelos",
      price: 1.3717,
      supplierPrice: 1.1717,
      icon: "🍬",
    },

    {
      id: "318_candies",
      name: "318 Caramelos",
      price: 2.1525,
      supplierPrice: 1.9525,
      icon: "🍬",
    },

    {
      id: "686_candies",
      name: "686 Caramelos",
      price: 4.1051,
      supplierPrice: 3.9051,
      icon: "🍬",
    },

    {
      id: "1378_candies",
      name: "1378 Caramelos",
      price: 7.6092,
      supplierPrice: 7.4092,
      icon: "🍬",
    },

    {
      id: "2118_caramelos",
      name: "2118 Caramelos",
      price: 11.5142,
      supplierPrice: 11.3142,
      icon: "🍬",
    },

    {
      id: "3548_caramelos",
      name: "3548 Caramelos",
      price: 19.7153,
      supplierPrice: 19.5153,
      icon: "🍬",
    },

    {
      id: "7108_caramelos",
      name: "7108 Caramelos",
      price: 39.2195,
      supplierPrice: 39.0195,
      icon: "🍬",
    },
  ] satisfies SausageManOffer[],
} as const;
