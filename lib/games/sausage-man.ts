export type SausageManOffer = {
  id: string;
  name: string;
  supplierPrice: number;
  price: number;
  icon: string;
};

export const SAUSAGE_MAN = {
  categoryId: "sausage_man",
  name: "Sausage Man",
  image: "/images/sausage-man.jpg",

  note:
    "Recarga de Sausage Man. Ingrese su ID de personaje antes de realizar el pedido. El producto seleccionado se entrega directamente a su cuenta después de realizar el pedido.",

  field: {
    key: "character_id",
    label: "ID de personaje",
    type: "text",
  },

  offers: [
    {
      id: "61_candies",
      name: "61 Candies",
      supplierPrice: 0.3909,
      price: 0.5909,
      icon: "🍬",
    },

    {
      id: "186_candies",
      name: "186 Candies",
      supplierPrice: 1.1717,
      price: 1.3717,
      icon: "🍬",
    },

    {
      id: "318_candies",
      name: "318 Candies",
      supplierPrice: 1.9525,
      price: 2.1525,
      icon: "🍬",
    },

    {
      id: "686_candies",
      name: "686 Candies",
      supplierPrice: 3.9051,
      price: 4.1051,
      icon: "🍬",
    },

    {
      id: "1378_candies",
      name: "1378 Caramelos",
      supplierPrice: 7.4092,
      price: 7.6092,
      icon: "🍬",
    },

    {
      id: "2118_caramelos",
      name: "2118 Caramelos",
      supplierPrice: 11.3142,
      price: 11.5142,
      icon: "🍬",
    },

    {
      id: "3548_caramelos",
      name: "3548 Caramelos",
      supplierPrice: 19.5153,
      price: 19.7153,
      icon: "🍬",
    },

    {
      id: "7108_caramelos",
      name: "7108 Caramelos",
      supplierPrice: 39.0195,
      price: 39.2195,
      icon: "🍬",
    },
  ] satisfies SausageManOffer[],
} as const;
