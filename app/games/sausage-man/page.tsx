"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  SAUSAGE_MAN,
  SausageManOffer,
} from "../../../lib/games/sausage-man";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SausageManPage() {
  const router = useRouter();

  const [showOffers, setShowOffers] =
    useState(true);

  const [selectedOffer, setSelectedOffer] =
    useState<SausageManOffer | null>(null);

  const [characterId, setCharacterId] =
    useState("");

  const [error, setError] =
    useState("");

  const [orderCreated, setOrderCreated] =
    useState(false);

  const [orderNumber, setOrderNumber] =
    useState("");

  const [supplierOrderId, setSupplierOrderId] =
    useState("");

  const [orderStatus, setOrderStatus] =
    useState("");

  const [processing, setProcessing] =
    useState(false);

  useEffect(() => {
    if (orderCreated) {
      document
        .getElementById(
          "success-section"
        )
        ?.scrollIntoView({
          behavior: "smooth",
        });
    }
  }, [orderCreated]);

  function handleSelectOffer(
    offer: SausageManOffer
  ) {
    setSelectedOffer(offer);
    setError("");
    setOrderCreated(false);

    setTimeout(() => {
      document
        .getElementById(
          "order-section"
        )
        ?.scrollIntoView({
          behavior: "smooth",
        });
    }, 50);
  }

  async function createOrder() {
    if (!selectedOffer) {
      setError(
        "Seleccione una oferta."
      );
      return;
    }

    const cleanCharacterId =
      characterId.trim();

    if (
      !/^\d{4,20}$/.test(
        cleanCharacterId
      )
    ) {
      setError(
        "El Character ID debe contener entre 4 y 20 números."
      );
      return;
    }

    setProcessing(true);
    setError("");

    try {
      const {
        data: {
          session,
        },
      } =
        await supabase.auth.getSession();

      if (!session?.access_token) {
        setError(
          "Debes iniciar sesión para realizar una compra."
        );
        return;
      }

      const idempotencyKey =
        crypto.randomUUID();

      const response =
        await fetch(
          "/api/topups/sausage-man",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${session.access_token}`,
            },

            body: JSON.stringify({
              offerId:
                selectedOffer.id,

              offerName:
                selectedOffer.name,

              characterId:
                cleanCharacterId,

              retailPrice:
                selectedOffer.price,

              idempotencyKey,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        /*
         * Mostrar el error real
         * que devuelve FazerCards.
         */

        const provider =
          data?.providerResponse;

        const providerMessage =
          provider?.error ||
          provider?.message ||
          provider?.detail;

        throw new Error(
          providerMessage ||
            data?.error ||
            "No se pudo realizar la orden."
        );
      }

      setOrderNumber(
        data.orderNumber ||
          "Pendiente"
      );

      setSupplierOrderId(
        data.supplierOrderId ||
          ""
      );

      setOrderStatus(
        data.orderStatus ||
          "SUPPLIER_PENDING"
      );

      setOrderCreated(true);

      localStorage.setItem(
        "last_sausage_man_order",
        JSON.stringify({
          orderNumber:
            data.orderNumber ||
            "",

          supplierOrderId:
            data.supplierOrderId ||
            "",

          status:
            data.orderStatus ||
            "SUPPLIER_PENDING",
        })
      );

      setSelectedOffer(null);
      setCharacterId("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo realizar la orden."
      );
    } finally {
      setProcessing(false);
    }
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    void createOrder();
  }

  return (
    <main className="sausage-man-page">
      {/* 
        AQUÍ CONSERVA EL RESTO DEL DISEÑO
        DEL APP QUE YA TE ENVIÉ:
        banner,
        ofertas,
        formulario,
        éxito,
        footer
        y el style jsx.
      */}
    </main>
  );
}
