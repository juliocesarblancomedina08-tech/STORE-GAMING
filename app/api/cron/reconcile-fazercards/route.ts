import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const FAZER_API_BASE = (
  process.env.FAZERCARDS_API_URL ||
  "https://api.fzr.cards/api/v2"
).replace(/\/+$/, "");

const FAZER_API_KEY = process.env.FAZERCARDS_API_KEY;
const FAZERCARDS_CRON_SECRET =
  process.env.FAZERCARDS_CRON_SECRET;

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const PENDING_STATUSES = [
  "SUPPLIER_PENDING",
  "PENDING",
  "PROCESSING",
  "CONFIRMED",
];

const MAX_ORDERS_PER_RUN = 100;

type GenericOrder = Record<string, any>;

function normalizeStatus(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function asObject(
  value: unknown
): GenericOrder | null {
  if (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as GenericOrder;
  }

  return null;
}

function getSupplierOrderId(
  order: GenericOrder
): string {
  const saved = asObject(order.supplier_response);
  const reconciliation = asObject(saved?.reconciliation);

  const candidates = [
    order.supplier_order_id,
    saved?.order?.id,
    saved?.data?.order?.id,
    saved?.data?.order_id,
    saved?.order_id,
    saved?.data?.id,
    reconciliation?.order?.id,
    reconciliation?.data?.order?.id,
    reconciliation?.data?.order_id,
    reconciliation?.order_id,
    reconciliation?.data?.id,
  ];

  for (const candidate of candidates) {
    if (
      typeof candidate === "string" ||
      typeof candidate === "number"
    ) {
      const value = String(candidate).trim();

      if (/^ord-[A-Za-z0-9_-]+$/.test(value)) {
        return value;
      }
    }
  }

  return "";
}

function getProviderOrder(
  payload: unknown
): GenericOrder {
  const root = asObject(payload) ?? {};
  const data = asObject(root.data);

  return (
    asObject(root.order) ??
    asObject(data?.order) ??
    data ??
    root
  );
}

function getProviderStatus(payload: unknown): string {
  const root = asObject(payload) ?? {};
  const data = asObject(root.data);
  const order = getProviderOrder(payload);

  return normalizeStatus(
    order.status ?? data?.status ?? root.status
  );
}

function isCompletedStatus(status: string): boolean {
  return [
    "completed",
    "complete",
    "success",
    "successful",
    "succeeded",
    "delivered",
    "done",
  ].includes(status);
}

function isRefundWorthyFailureStatus(
  status: string
): boolean {
  return [
    "failed",
    "failure",
    "rejected",
    "declined",
    "denied",
    "error",
    "refund",
    "refunded",
  ].includes(status);
}

function getNextPendingStatus(status: string): string {
  switch (status) {
    case "processing":
      return "PROCESSING";

    case "confirmed":
    case "accepted":
      return "CONFIRMED";

    case "created":
    default:
      return "SUPPLIER_PENDING";
  }
}

/**
 * Usa any para evitar la incompatibilidad entre los
 * genéricos del cliente Supabase y el parámetro de la función.
 */
async function readPendingOrders(
  supabaseAdmin: any
): Promise<GenericOrder[]> {
  const { data, error } = await supabaseAdmin
    .from("topup_orders")
    .select(
      "id, supplier_order_id, supplier_response, status, updated_at"
    )
    .in("status", PENDING_STATUSES)
    .order("updated_at", { ascending: true })
    .limit(MAX_ORDERS_PER_RUN);

  if (error) {
    throw new Error(
      `Error leyendo órdenes pendientes: ${error.message}`
    );
  }

  return (data ?? []) as GenericOrder[];
}

export async function GET(request: NextRequest) {
  if (!FAZERCARDS_CRON_SECRET) {
    console.error(
      "Falta configurar FAZERCARDS_CRON_SECRET."
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Cron de FazerCards no configurado.",
      },
      { status: 500 }
    );
  }

  const authorization =
    request.headers.get("authorization") ?? "";

  if (
    authorization !== `Bearer ${FAZERCARDS_CRON_SECRET}`
  ) {
    return NextResponse.json(
      { ok: false, error: "No autorizado." },
      { status: 401 }
    );
  }

  if (!FAZER_API_KEY) {
    return NextResponse.json(
      {
        ok: false,
        error: "Falta FAZERCARDS_API_KEY.",
      },
      { status: 500 }
    );
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      "Faltan variables de entorno de Supabase."
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Supabase no está configurado para el cron.",
      },
      { status: 500 }
    );
  }

  // El tipo explícito evita el error de incompatibilidad
  // de tipos que apareció en la compilación de Vercel.
  const supabaseAdmin: any = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  let orders: GenericOrder[];

  try {
    orders = await readPendingOrders(supabaseAdmin);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      "Error leyendo órdenes para reconciliación:",
      message
    );

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }

  console.info("FAZERCARDS_CRON_START", {
    apiBase: FAZER_API_BASE,
    selectedOrders: orders.length,
    maxOrdersPerRun: MAX_ORDERS_PER_RUN,
  });

  let checked = 0;
  let completed = 0;
  let refunded = 0;
  let stillPending = 0;
  let missingSupplierId = 0;

  const failures: Array<{
    orderId: string;
    supplierId?: string;
    message: string;
  }> = [];

  for (const order of orders) {
    const supplierId = getSupplierOrderId(order);

    if (!supplierId) {
      missingSupplierId += 1;

      console.warn(
        "Orden pendiente sin ID válido de FazerCards:",
        order.id
      );

      continue;
    }

    try {
      const response = await fetch(
        `${FAZER_API_BASE}/orders/${encodeURIComponent(
          supplierId
        )}`,
        {
          method: "GET",
          headers: {
            "X-API-Key": FAZER_API_KEY,
            Accept: "application/json",
          },
          cache: "no-store",
          signal: AbortSignal.timeout(15_000),
        }
      );

      const text = await response.text();

      let payload: unknown;

      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(
          `FazerCards devolvió una respuesta no JSON (HTTP ${response.status}).`
        );
      }

      if (!response.ok) {
        throw new Error(
          `FazerCards respondió HTTP ${response.status}: ${text.slice(0, 300)}`
        );
      }

      const providerStatus = getProviderStatus(payload);

      if (!providerStatus) {
        throw new Error(
          "FazerCards no devolvió un estado reconocible."
        );
      }

      console.info("FAZERCARDS_ORDER_STATUS", {
        orderId: order.id,
        supplierId,
        providerStatus,
      });

      // Conservar la respuesta original del proveedor.
      const previousResponse =
        asObject(order.supplier_response) ?? {};

      const previousReconciliation =
        asObject(previousResponse.reconciliation) ?? {};

      const savedResponse = {
        ...previousResponse,
        reconciliation: {
          ...previousReconciliation,
          last_response: payload,
          checked_at: new Date().toISOString(),
        },
      };

      const {
        data: savedRows,
        error: saveError,
      } = await supabaseAdmin
        .from("topup_orders")
        .update({
          supplier_order_id: supplierId,
          supplier_response: savedResponse,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id)
        .in("status", PENDING_STATUSES)
        .select("id");

      if (saveError) {
        throw new Error(
          `No se guardó la respuesta: ${saveError.message}`
        );
      }

      // Si la orden ya cambió de estado, no continuar
      // con los datos potencialmente desactualizados.
      if (!savedRows?.length) {
        console.warn(
          "Orden omitida porque su estado cambió durante la consulta:",
          order.id
        );

        continue;
      }

      checked += 1;

      if (isCompletedStatus(providerStatus)) {
        const { error: rpcError } =
          await supabaseAdmin.rpc(
            "complete_topup_order",
            {
              p_supplier_order_id: supplierId,
            }
          );

        if (rpcError) {
          throw new Error(
            `No se pudo completar: ${rpcError.message}`
          );
        }

        completed += 1;
        continue;
      }

      if (isRefundWorthyFailureStatus(providerStatus)) {
        const { error: rpcError } =
          await supabaseAdmin.rpc(
            "refund_topup_balance",
            {
              p_order_id: order.id,
            }
          );

        if (rpcError) {
          throw new Error(
            `No se pudo reembolsar: ${rpcError.message}`
          );
        }

        refunded += 1;
        continue;
      }

      const nextStatus =
        getNextPendingStatus(providerStatus);

      const { error: statusError } =
        await supabaseAdmin
          .from("topup_orders")
          .update({
            status: nextStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", order.id)
          .in("status", PENDING_STATUSES);

      if (statusError) {
        throw new Error(
          `No se pudo actualizar el estado: ${statusError.message}`
        );
      }

      stillPending += 1;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      console.error(
        "Error reconciliando orden FazerCards:",
        order.id,
        supplierId,
        message
      );

      failures.push({
        orderId: order.id,
        supplierId,
        message,
      });
    }
  }

  const result = {
    ok: failures.length === 0,
    selected: orders.length,
    checked,
    completed,
    refunded,
    stillPending,
    missingSupplierId,
    failures,
  };

  console.info("FAZERCARDS_CRON_RESULT", result);

  return NextResponse.json(result);
}
