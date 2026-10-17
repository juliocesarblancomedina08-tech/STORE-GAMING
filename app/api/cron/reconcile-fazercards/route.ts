
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

const TERMINAL_STATUSES = [
  "COMPLETED",
  "SUCCESS",
  "SUCCESSFUL",
  "FAILED",
  "REFUNDED",
  "CANCELLED",
  "CANCELED",
];

const MAX_ORDERS_PER_RUN = 100;

type GenericOrder = Record<string, any>;

function asObject(value: unknown): GenericOrder | null {
  if (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as GenericOrder;
  }

  return null;
}

function normalizeStatus(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function getSupplierOrderId(order: GenericOrder): string {
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

function getProviderOrder(payload: unknown): GenericOrder {
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

function isRefundWorthyFailureStatus(status: string): boolean {
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

function isPendingStatus(status: unknown): boolean {
  return PENDING_STATUSES.includes(String(status ?? ""));
}

function isTerminalStatus(status: unknown): boolean {
  return TERMINAL_STATUSES.includes(String(status ?? "").toUpperCase());
}

async function readPendingOrders(
  supabaseAdmin: any
): Promise<GenericOrder[]> {
  const { data, error } = await supabaseAdmin
    .from("topup_orders")
    .select(
      "id, supplier_order_id, supplier_response, status, updated_at"
    )
    .in("status", PENDING_STATUSES)
    // Priorizar órdenes actualizadas recientemente.
    .order("updated_at", { ascending: false })
    .limit(MAX_ORDERS_PER_RUN);

  if (error) {
    throw new Error(
      `Error leyendo órdenes pendientes: ${error.message}`
    );
  }

  return (data ?? []) as GenericOrder[];
}

async function readCurrentOrder(
  supabaseAdmin: any,
  orderId: string
): Promise<GenericOrder | null> {
  const { data, error } = await supabaseAdmin
    .from("topup_orders")
    .select(
      "id, supplier_order_id, supplier_response, status, updated_at"
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Error consultando el estado actual de ${orderId}: ${error.message}`
    );
  }

  return (data as GenericOrder | null) ?? null;
}

async function saveReconciliationResponse(
  supabaseAdmin: any,
  orderId: string,
  supplierId: string,
  payload: unknown
): Promise<void> {
  // Leer la respuesta más reciente antes de fusionar.
  const current = await readCurrentOrder(
    supabaseAdmin,
    orderId
  );

  if (!current) {
    throw new Error(
      `La orden ${orderId} ya no existe en STORE GAMING.`
    );
  }

  const previousResponse =
    asObject(current.supplier_response) ?? {};

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

  const { error } = await supabaseAdmin
    .from("topup_orders")
    .update({
      supplier_order_id: supplierId,
      supplier_response: savedResponse,
    })
    .eq("id", orderId);

  if (error) {
    throw new Error(
      `No se guardó la respuesta de FazerCards: ${error.message}`
    );
  }
}

export async function GET(request: NextRequest) {
  if (!FAZERCARDS_CRON_SECRET) {
    console.error("Falta FAZERCARDS_CRON_SECRET.");

    return NextResponse.json(
      { ok: false, error: "Cron de FazerCards no configurado." },
      { status: 500 }
    );
  }

  const authorization =
    request.headers.get("authorization") ?? "";

  if (authorization !== `Bearer ${FAZERCARDS_CRON_SECRET}`) {
    return NextResponse.json(
      { ok: false, error: "No autorizado." },
      { status: 401 }
    );
  }

  if (!FAZER_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "Falta FAZERCARDS_API_KEY." },
      { status: 500 }
    );
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Faltan variables de entorno de Supabase.");

    return NextResponse.json(
      { ok: false, error: "Supabase no está configurado para el cron." },
      { status: 500 }
    );
  }

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
      error instanceof Error ? error.message : String(error);

    console.error("Error leyendo órdenes para reconciliación:", message);

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }

  console.info("FAZERCARDS_CRON_START", {
    selectedOrders: orders.length,
    maxOrdersPerRun: MAX_ORDERS_PER_RUN,
  });

  let checked = 0;
  let completed = 0;
  let refunded = 0;
  let stillPending = 0;
  let missingSupplierId = 0;
  let skippedChanged = 0;

  const failures: Array<{
    orderId: string;
    supplierId?: string;
    message: string;
  }> = [];

  for (const order of orders) {
    const supplierId = getSupplierOrderId(order);

    if (!supplierId) {
      missingSupplierId += 1;

      console.warn("Orden pendiente sin ID válido de FazerCards:", {
        orderId: order.id,
        status: order.status,
      });

      continue;
    }

    try {
      console.info("FAZERCARDS_ORDER_CHECK_START", {
        orderId: order.id,
        supplierId,
        selectedStatus: order.status,
      });

      const response = await fetch(
        `${FAZER_API_BASE}/orders/${encodeURIComponent(supplierId)}`,
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

      // Guardar la respuesta del proveedor incluso si la orden
      // cambió de estado mientras se hacía la consulta.
      await saveReconciliationResponse(
        supabaseAdmin,
        order.id,
        supplierId,
        payload
      );

      checked += 1;

      // Volver a leer el estado actual; no confiar en el estado
      // que tenía la orden al inicio de esta ejecución.
      const currentOrder = await readCurrentOrder(
        supabaseAdmin,
        order.id
      );

      if (!currentOrder) {
        skippedChanged += 1;

        console.warn("Orden ya no existe tras consultar proveedor:", {
          orderId: order.id,
          supplierId,
        });

        continue;
      }

      const currentStatus = String(currentOrder.status ?? "");

      console.info("FAZERCARDS_CURRENT_STORE_STATUS", {
        orderId: order.id,
        supplierId,
        currentStatus,
        providerStatus,
      });

      if (!isPendingStatus(currentStatus)) {
        skippedChanged += 1;

        console.info("FAZERCARDS_ORDER_NOT_PENDING", {
          orderId: order.id,
          supplierId,
          currentStatus,
          providerStatus,
          terminal: isTerminalStatus(currentStatus),
        });

        // No sobrescribir el estado de STORE GAMING ni volver
        // a completar/reembolsar una orden que ya cambió.
        continue;
      }

      if (isCompletedStatus(providerStatus)) {
        const { error: rpcError } =
          await supabaseAdmin.rpc("complete_topup_order", {
            p_supplier_order_id: supplierId,
          });

        if (rpcError) {
          throw new Error(
            `No se pudo completar: ${rpcError.message}`
          );
        }

        completed += 1;
        continue;
      }

      if (isRefundWorthyFailureStatus(providerStatus)) {
        // Última comprobación antes de solicitar el reembolso.
        const latestOrder = await readCurrentOrder(
          supabaseAdmin,
          order.id
        );

        if (
          !latestOrder ||
          !isPendingStatus(latestOrder.status)
        ) {
          skippedChanged += 1;

          console.warn(
            "Reembolso omitido porque la orden ya cambió:",
            {
              orderId: order.id,
              supplierId,
              currentStatus: latestOrder?.status ?? "NOT_FOUND",
            }
          );

          continue;
        }

        const { error: rpcError } =
          await supabaseAdmin.rpc("refund_topup_balance", {
            p_order_id: order.id,
          });

        if (rpcError) {
          throw new Error(
            `No se pudo reembolsar: ${rpcError.message}`
          );
        }

        refunded += 1;
        continue;
      }

      const nextStatus = getNextPendingStatus(providerStatus);

      const { data: updatedRows, error: statusError } =
        await supabaseAdmin
          .from("topup_orders")
          .update({
            status: nextStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", order.id)
          .in("status", PENDING_STATUSES)
          .select("id");

      if (statusError) {
        throw new Error(
          `No se pudo actualizar el estado: ${statusError.message}`
        );
      }

      if (!updatedRows?.length) {
        skippedChanged += 1;

        console.info(
          "Estado no cambiado porque otra operación actualizó la orden:",
          {
            orderId: order.id,
            supplierId,
            providerStatus,
          }
        );

        continue;
      }

      stillPending += 1;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

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
    skippedChanged,
    failures,
  };

  console.info("FAZERCARDS_CRON_RESULT", result);

  return NextResponse.json(result);
}
