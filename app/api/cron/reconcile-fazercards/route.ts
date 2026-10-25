
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FAZER_API_BASE = (
  process.env.FAZERCARDS_API_URL ||
  "https://api.fzr.cards/api/v2"
).replace(/\/+$/, "");

const FAZER_API_KEY = process.env.FAZERCARDS_API_KEY;
const FAZERCARDS_CRON_SECRET =
  process.env.FAZERCARDS_CRON_SECRET;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

type AnyObject = Record<string, any>;

function json(
  data: AnyObject,
  status = 200
) {
  return NextResponse.json(data, { status });
}

function normalizeStatus(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function getNestedObjects(
  value: unknown,
  depth = 0
): AnyObject[] {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    depth > 5
  ) {
    return [];
  }

  const object = value as AnyObject;
  const result: AnyObject[] = [object];

  for (const key of [
    "data",
    "order",
    "result",
    "response",
    "payload",
    "details",
  ]) {
    const child = object[key];

    if (
      child &&
      typeof child === "object" &&
      !Array.isArray(child)
    ) {
      result.push(...getNestedObjects(child, depth + 1));
    }
  }

  return result;
}

function getProviderOrderId(
  value: unknown
): string | null {
  for (const object of getNestedObjects(value)) {
    for (const key of [
      "supplier_order_id",
      "order_id",
      "orderId",
      "order_number",
      "orderNumber",
      "id",
    ]) {
      const candidate = object[key];

      if (
        typeof candidate === "string" &&
        /^ord-[a-zA-Z0-9_-]+$/.test(candidate.trim())
      ) {
        return candidate.trim();
      }
    }
  }

  return null;
}

function getProviderStatus(value: unknown): string {
  for (const object of getNestedObjects(value)) {
    for (const key of [
      "status",
      "order_status",
      "orderStatus",
      "state",
    ]) {
      const candidate = object[key];

      if (
        typeof candidate === "string" &&
        candidate.trim()
      ) {
        return normalizeStatus(candidate);
      }
    }
  }

  return "";
}

function isCompletedStatus(status: string): boolean {
  return [
    "COMPLETED",
    "COMPLETE",
    "SUCCESS",
    "SUCCESSFUL",
    "DELIVERED",
    "FINISHED",
  ].includes(status);
}

function isFailedStatus(status: string): boolean {
  return [
    "FAILED",
    "FAILURE",
    "CANCELLED",
    "CANCELED",
    "REJECTED",
    "DECLINED",
    "EXPIRED",
  ].includes(status);
}

function getGiftCodes(value: unknown): string[] {
  const codes: string[] = [];
  const seen = new Set<string>();

  const addCode = (candidate: unknown) => {
    if (typeof candidate === "string") {
      const code = candidate.trim();

      if (code && !seen.has(code)) {
        seen.add(code);
        codes.push(code);
      }

      return;
    }

    if (
      candidate &&
      typeof candidate === "object" &&
      !Array.isArray(candidate)
    ) {
      const object = candidate as AnyObject;

      for (const key of [
        "code",
        "gift_code",
        "giftCode",
        "serial",
        "serial_number",
        "serialNumber",
        "pin",
        "key",
        "card_code",
        "cardCode",
        "redeem_code",
        "redeemCode",
      ]) {
        if (typeof object[key] === "string") {
          addCode(object[key]);
        }
      }
    }
  };

  for (const object of getNestedObjects(value)) {
    for (const key of [
      "gift_codes",
      "giftCodes",
      "codes",
      "keys",
      "serials",
      "gift_code",
      "giftCode",
      "code",
      "serial",
      "pin",
      "card_codes",
      "cardCodes",
      "items",
      "cards",
      "products",
      "deliveries",
    ]) {
      const candidate = object[key];

      if (Array.isArray(candidate)) {
        for (const item of candidate) {
          addCode(item);
        }
      } else if (
        typeof candidate === "string" ||
        (candidate && typeof candidate === "object")
      ) {
        addCode(candidate);
      }
    }
  }

  return codes;
}

async function providerRequest(
  path: string
): Promise<{
  ok: boolean;
  status: number;
  data: AnyObject;
}> {
  const response = await fetch(
    `${FAZER_API_BASE}${path}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-API-Key": FAZER_API_KEY!,
        Authorization: `Bearer ${FAZER_API_KEY}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    }
  );

  const text = await response.text();

  let data: AnyObject;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw_response: text };
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

function createAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

function getSupplierIdFromRow(
  row: AnyObject
): string | null {
  const direct = row.supplier_order_id;

  if (
    typeof direct === "string" &&
    /^ord-[a-zA-Z0-9_-]+$/.test(direct.trim())
  ) {
    return direct.trim();
  }

  const savedResponse = row.supplier_response;

  if (savedResponse) {
    return getProviderOrderId(savedResponse);
  }

  return null;
}

async function reconcileTopups(supabase: any) {
  const result: AnyObject = {
    checked: 0,
    completed: 0,
    failed: 0,
    pending: 0,
    skipped: 0,
    errors: [] as string[],
  };

  const { data: orders, error } = await supabase
    .from("topup_orders")
    .select("*")
    .in("status", [
      "SUPPLIER_PENDING",
      "PENDING",
      "PROCESSING",
      "CONFIRMED",
    ])
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    throw new Error(
      `Error consultando topup_orders: ${error.message}`
    );
  }

  for (const order of orders ?? []) {
    result.checked++;

    try {
      const supplierId = getSupplierIdFromRow(order);

      if (!supplierId) {
        result.skipped++;
        result.errors.push(
          `Recarga ${order.id}: no tiene supplier_order_id recuperable.`
        );
        continue;
      }

      const provider = await providerRequest(
        `/orders/${encodeURIComponent(supplierId)}`
      );

      if (!provider.ok) {
        result.errors.push(
          `Recarga ${order.id}: proveedor HTTP ${provider.status}.`
        );
        continue;
      }

      const providerStatus = getProviderStatus(provider.data);

      const previousResponse =
        order.supplier_response &&
        typeof order.supplier_response === "object"
          ? order.supplier_response
          : {};

      const savedResponse = {
        ...previousResponse,
        reconciliation: {
          checked_at: new Date().toISOString(),
          last_response: provider.data,
        },
      };

      if (isCompletedStatus(providerStatus)) {
        const { error: rpcError } = await supabase.rpc(
          "complete_topup_order",
          {
            p_supplier_order_id: supplierId,
          }
        );

        if (rpcError) {
          result.errors.push(
            `Recarga ${order.id}: error completando por RPC: ${rpcError.message}`
          );
          continue;
        }

        await supabase
          .from("topup_orders")
          .update({
            supplier_response: savedResponse,
          })
          .eq("id", order.id);

        result.completed++;
        continue;
      }

      if (isFailedStatus(providerStatus)) {
        /*
         * El RPC debe verificar que la orden no esté completada
         * antes de devolver el saldo.
         */
        const { error: refundError } = await supabase.rpc(
          "refund_topup_balance",
          {
            p_order_id: order.id,
          }
        );

        if (refundError) {
          result.errors.push(
            `Recarga ${order.id}: error reembolsando: ${refundError.message}`
          );
          continue;
        }

        await supabase
          .from("topup_orders")
          .update({
            supplier_response: savedResponse,
          })
          .eq("id", order.id);

        result.failed++;
        continue;
      }

      const mappedStatus = [
        "PROCESSING",
        "CONFIRMED",
        "PENDING",
      ].includes(providerStatus)
        ? providerStatus
        : "SUPPLIER_PENDING";

      const { error: updateError } = await supabase
        .from("topup_orders")
        .update({
          status: mappedStatus,
          supplier_order_id: supplierId,
          supplier_response: savedResponse,
        })
        .eq("id", order.id);

      if (updateError) {
        result.errors.push(
          `Recarga ${order.id}: ${updateError.message}`
        );
      } else {
        result.pending++;
      }
    } catch (error) {
      result.errors.push(
        `Recarga ${order.id}: ${
          error instanceof Error
            ? error.message
            : String(error)
        }`
      );
    }
  }

  return result;
}

async function reconcileGiftCards(supabase: any) {
  const result: AnyObject = {
    checked: 0,
    completed: 0,
    failed: 0,
    pending: 0,
    skipped: 0,
    missingSupplierId: [] as string[],
    errors: [] as string[],
  };

  const { data: orders, error } = await supabase
    .from("gift_card_orders")
    .select("*")
    .in("status", [
      "SUPPLIER_PENDING",
      "PENDING",
      "PROCESSING",
      "CONFIRMED",
    ])
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    throw new Error(
      `Error consultando gift_card_orders: ${error.message}`
    );
  }

  for (const order of orders ?? []) {
    result.checked++;

    try {
      const supplierId = getSupplierIdFromRow(order);

      if (!supplierId) {
        result.skipped++;
        result.missingSupplierId.push(order.id);
        continue;
      }

      const provider = await providerRequest(
        `/orders/${encodeURIComponent(supplierId)}`
      );

      if (!provider.ok) {
        result.errors.push(
          `Tarjeta ${order.id}: proveedor HTTP ${provider.status}.`
        );
        continue;
      }

      const providerStatus = getProviderStatus(provider.data);
      const codes = getGiftCodes(provider.data);

      const previousResponse =
        order.supplier_response &&
        typeof order.supplier_response === "object"
          ? order.supplier_response
          : {};

      const savedResponse = {
        ...previousResponse,
        reconciliation: {
          checked_at: new Date().toISOString(),
          last_response: provider.data,
        },
      };

      /*
       * Solo se marca COMPLETED si el proveedor confirma la
       * finalización y devuelve al menos un código.
       */
      if (
        isCompletedStatus(providerStatus) &&
        codes.length > 0
      ) {
        const { error: updateError } = await supabase
          .from("gift_card_orders")
          .update({
            status: "COMPLETED",
            gift_codes: codes,
            supplier_order_id: supplierId,
            supplier_response: savedResponse,
            completed_at: new Date().toISOString(),
            failed_at: null,
          })
          .eq("id", order.id)
          .in("status", [
            "SUPPLIER_PENDING",
            "PENDING",
            "PROCESSING",
            "CONFIRMED",
          ]);

        if (updateError) {
          result.errors.push(
            `Tarjeta ${order.id}: error guardando códigos: ${updateError.message}`
          );
        } else {
          result.completed++;
        }

        continue;
      }

      if (isFailedStatus(providerStatus)) {
        /*
         * No cambiamos primero la orden a FAILED. El RPC de
         * reembolso debe comprobar su estado y evitar devolver
         * saldo a órdenes completadas.
         */
        const { error: refundError } = await supabase.rpc(
          "refund_gift_card_order",
          {
            p_order_id: order.id,
          }
        );

        if (refundError) {
          result.errors.push(
            `Tarjeta ${order.id}: error reembolsando: ${refundError.message}`
          );
          continue;
        }

        await supabase
          .from("gift_card_orders")
          .update({
            supplier_response: savedResponse,
          })
          .eq("id", order.id);

        result.failed++;
        continue;
      }

      const mappedStatus = [
        "PROCESSING",
        "CONFIRMED",
        "PENDING",
      ].includes(providerStatus)
        ? providerStatus
        : "SUPPLIER_PENDING";

      const { error: updateError } = await supabase
        .from("gift_card_orders")
        .update({
          status: mappedStatus,
          supplier_order_id: supplierId,
          supplier_response: savedResponse,
        })
        .eq("id", order.id)
        .in("status", [
          "SUPPLIER_PENDING",
          "PENDING",
          "PROCESSING",
          "CONFIRMED",
        ]);

      if (updateError) {
        result.errors.push(
          `Tarjeta ${order.id}: ${updateError.message}`
        );
      } else {
        result.pending++;
      }
    } catch (error) {
      result.errors.push(
        `Tarjeta ${order.id}: ${
          error instanceof Error
            ? error.message
            : String(error)
        }`
      );
    }
  }

  return result;
}

export async function GET(request: NextRequest) {
  try {
    if (!FAZER_API_KEY) {
      return json(
        {
          success: false,
          error: "Falta configurar FAZERCARDS_API_KEY.",
        },
        500
      );
    }

    if (!FAZERCARDS_CRON_SECRET) {
      return json(
        {
          success: false,
          error: "Falta configurar FAZERCARDS_CRON_SECRET.",
        },
        500
      );
    }

    const authorization =
      request.headers.get("authorization");

    const bearerToken = authorization?.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : "";

    const headerSecret =
      request.headers.get("x-cron-secret") ?? "";

    const providedSecret = bearerToken || headerSecret;

    if (providedSecret !== FAZERCARDS_CRON_SECRET) {
      return json(
        {
          success: false,
          error: "No autorizado.",
        },
        401
      );
    }

    const supabase = createAdminClient();

    const summary: AnyObject = {
      success: true,
      service: "STORE GAMING FazerCards Reconciliation",
      timestamp: new Date().toISOString(),
      topup: null,
      giftcards: null,
      errors: [] as string[],
    };

    try {
      summary.topup = await reconcileTopups(supabase);
    } catch (error) {
      summary.errors.push(
        `Recargas: ${
          error instanceof Error
            ? error.message
            : String(error)
        }`
      );
    }

    try {
      summary.giftcards = await reconcileGiftCards(supabase);
    } catch (error) {
      summary.errors.push(
        `Tarjetas regalo: ${
          error instanceof Error
            ? error.message
            : String(error)
        }`
      );
    }

    if (summary.errors.length > 0) {
      summary.success = false;
    }

    return json(summary, 200);
  } catch (error) {
    return json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error interno al reconciliar las órdenes.",
      },
      500
    );
  }
}
