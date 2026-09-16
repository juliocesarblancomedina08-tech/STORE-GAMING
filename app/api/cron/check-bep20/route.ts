import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ======================================================
// VARIABLES DE ENTORNO
// ======================================================

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL!;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY!;

const ETHERSCAN_API_KEY =
  process.env.ETHERSCAN_API_KEY!;

const CRON_SECRET =
  process.env.CRON_SECRET!;

// ======================================================
// CONFIGURACIÓN BSC / USDT BEP20
// ======================================================

const BSC_CHAIN_ID = "56";

const RECEIVING_WALLET =
  "0xdcdEe992E26cDBe1b024e171a3a980078BeaAC77";

const USDT_CONTRACT =
  "0x55d398326f99059fF775485246999027B3197955";

const USDT_DECIMALS = 18;

// Revisamos transferencias de los últimos 15 minutos.
const LOOKBACK_MINUTES = 15;

// Mínimo de confirmaciones.
const MIN_CONFIRMATIONS = 2;

// ======================================================
// SUPABASE ADMIN
// ======================================================

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// ======================================================
// TIPOS
// ======================================================

type Deposit = {
  id: string;
  user_id: string;
  username: string | null;
  email: string | null;
  amount: number | string;
  currency: string | null;
  payment_method: string | null;
  network: string | null;
  wallet_address: string | null;
  tx_hash: string | null;
  status: string | null;
  created_at: string;
  confirmed_at: string | null;
  expires_at: string | null;
  credited_at: string | null;
};

type EtherscanTransfer = {
  blockNumber?: string;
  timeStamp?: string;
  hash?: string;
  from?: string;
  to?: string;
  value?: string;
  tokenName?: string;
  tokenSymbol?: string;
  contractAddress?: string;
  confirmations?: string;
  tokenDecimal?: string;
};

type EtherscanResponse = {
  status?: string;
  message?: string;
  result?: EtherscanTransfer[] | string;
};

type ProcessResult = {
  deposit_id: string;
  status: string;
  tx_hash?: string;
  amount?: number;
  error?: string;
};

// ======================================================
// AUTORIZACIÓN
// ======================================================

function isAuthorized(
  request: NextRequest
): boolean {
  if (!CRON_SECRET) {
    return false;
  }

  const authorization =
    request.headers.get("authorization");

  if (!authorization) {
    return false;
  }

  const expected =
    `Bearer ${CRON_SECRET}`;

  return authorization === expected;
}

// ======================================================
// NORMALIZAR DIRECCIONES
// ======================================================

function normalizeAddress(
  value: string | null | undefined
): string {
  return (value || "")
    .trim()
    .toLowerCase();
}

// ======================================================
// CONVERSIÓN RAW → USDT
// ======================================================
//
// No usamos literales como 10n porque el proyecto
// estaba compilando con un target inferior a ES2020.
//
// ======================================================

function rawToUsdt(
  value: string,
  decimals: number
): number {
  const raw = BigInt(value);

  const divisor = BigInt(
    "1" + "0".repeat(decimals)
  );

  const whole = raw / divisor;

  const remainder = raw % divisor;

  const remainderString =
    remainder
      .toString()
      .padStart(decimals, "0");

  const decimalPart =
    remainderString.replace(/0+$/, "");

  if (!decimalPart) {
    return Number(whole);
  }

  return Number(
    `${whole}.${decimalPart}`
  );
}

// ======================================================
// USDT → RAW
// ======================================================

function usdtToRaw(
  value: number | string,
  decimals: number
): bigint {
  const text =
    String(value).trim();

  if (!text) {
    throw new Error(
      "MONTO DE DEPÓSITO INVÁLIDO"
    );
  }

  const parts =
    text.split(".");

  const whole =
    parts[0] || "0";

  const fraction =
    parts[1] || "";

  if (!/^\d+$/.test(whole)) {
    throw new Error(
      "MONTO DE DEPÓSITO INVÁLIDO"
    );
  }

  if (
    fraction &&
    !/^\d+$/.test(fraction)
  ) {
    throw new Error(
      "MONTO DE DEPÓSITO INVÁLIDO"
    );
  }

  if (
    fraction.length >
    decimals
  ) {
    throw new Error(
      "EL MONTO TIENE DEMASIADOS DECIMALES"
    );
  }

  const paddedFraction =
    fraction.padEnd(
      decimals,
      "0"
    );

  const rawString =
    whole +
    paddedFraction;

  return BigInt(
    rawString
  );
}

// ======================================================
// OBTENER TRANSFERENCIAS BEP20
// ======================================================

async function getBep20Transfers(): Promise<
  EtherscanTransfer[]
> {
  if (!ETHERSCAN_API_KEY) {
    throw new Error(
      "ETHERSCAN_API_KEY NO CONFIGURADA"
    );
  }

  const url =
    new URL(
      "https://api.etherscan.io/v2/api"
    );

  url.searchParams.set(
    "chainid",
    BSC_CHAIN_ID
  );

  url.searchParams.set(
    "module",
    "account"
  );

  url.searchParams.set(
    "action",
    "tokentx"
  );

  url.searchParams.set(
    "contractaddress",
    USDT_CONTRACT
  );

  url.searchParams.set(
    "address",
    RECEIVING_WALLET
  );

  url.searchParams.set(
    "page",
    "1"
  );

  url.searchParams.set(
    "offset",
    "100"
  );

  url.searchParams.set(
    "sort",
    "desc"
  );

  url.searchParams.set(
    "apikey",
    ETHERSCAN_API_KEY
  );

  const response =
    await fetch(
      url.toString(),
      {
        method: "GET",
        cache: "no-store",
      }
    );

  if (!response.ok) {
    throw new Error(
      `ETHERSCAN HTTP ${response.status}`
    );
  }

  const data =
    (await response.json()) as EtherscanResponse;

  if (
    data.result &&
    !Array.isArray(data.result)
  ) {
    throw new Error(
      String(data.result)
    );
  }

  if (
    data.status === "0" &&
    data.message &&
    data.message !==
      "No transactions found"
  ) {
    throw new Error(
      data.message
    );
  }

  if (
    !Array.isArray(data.result)
  ) {
    return [];
  }

  return data.result;
}

// ======================================================
// EXPIRAR DEPÓSITOS VENCIDOS
// ======================================================

async function expireDeposits(): Promise<number> {
  const now =
    new Date()
      .toISOString();

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("deposits")
      .update({
        status: "EXPIRED",
      })
      .eq(
        "status",
        "PENDING"
      )
      .lt(
        "expires_at",
        now
      )
      .select("id");

  if (error) {
    throw new Error(
      `ERROR EXPIRANDO DEPÓSITOS: ${error.message}`
    );
  }

  return data?.length || 0;
}

// ======================================================
// OBTENER DEPÓSITOS PENDIENTES
// ======================================================

async function getPendingDeposits(): Promise<
  Deposit[]
> {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("deposits")
      .select(
        [
          "id",
          "user_id",
          "username",
          "email",
          "amount",
          "currency",
          "payment_method",
          "network",
          "wallet_address",
          "tx_hash",
          "status",
          "confirmed_at",
          "created_at",
          "expires_at",
          "credited_at",
        ].join(",")
      )
      .eq(
        "status",
        "PENDING"
      )
      .eq(
        "network",
        "BEP20"
      )
      .order(
        "created_at",
        {
          ascending: true,
        }
      );

  if (error) {
    throw new Error(
      `ERROR OBTENIENDO DEPÓSITOS: ${error.message}`
    );
  }

  // IMPORTANTE:
  // Se usa unknown antes de Deposit[]
  // para evitar el error de TypeScript
  // que apareció en Vercel.
  return (
    (data || []) as unknown as Deposit[]
  );
}

// ======================================================
// COMPROBAR SI TRANSFERENCIA ES VÁLIDA
// ======================================================

function isValidTransfer(
  transfer: EtherscanTransfer,
  deposit: Deposit
): boolean {
  // --------------------------------------------------
  // TX HASH
  // --------------------------------------------------

  if (!transfer.hash) {
    return false;
  }

  // --------------------------------------------------
  // WALLET DESTINO
  // --------------------------------------------------

  if (
    normalizeAddress(
      transfer.to
    ) !==
    normalizeAddress(
      RECEIVING_WALLET
    )
  ) {
    return false;
  }

  // --------------------------------------------------
  // CONTRATO USDT
  // --------------------------------------------------

  if (
    normalizeAddress(
      transfer.contractAddress
    ) !==
    normalizeAddress(
      USDT_CONTRACT
    )
  ) {
    return false;
  }

  // --------------------------------------------------
  // DECIMALES
  // --------------------------------------------------

  if (
    transfer.tokenDecimal &&
    Number(
      transfer.tokenDecimal
    ) !== USDT_DECIMALS
  ) {
    return false;
  }

  // --------------------------------------------------
  // CANTIDAD
  // --------------------------------------------------

  if (!transfer.value) {
    return false;
  }

  let transferRaw: bigint;
  let depositRaw: bigint;

  try {
    transferRaw =
      BigInt(
        transfer.value
      );

    depositRaw =
      usdtToRaw(
        deposit.amount,
        USDT_DECIMALS
      );
  } catch {
    return false;
  }

  if (
    transferRaw !==
    depositRaw
  ) {
    return false;
  }

  // --------------------------------------------------
  // CONFIRMACIONES
  // --------------------------------------------------

  const confirmations =
    Number(
      transfer.confirmations ||
        "0"
    );

  if (
    !Number.isFinite(
      confirmations
    ) ||
    confirmations <
      MIN_CONFIRMATIONS
  ) {
    return false;
  }

  // --------------------------------------------------
  // FECHA DE TRANSFERENCIA
  // --------------------------------------------------

  if (
    transfer.timeStamp
  ) {
    const transferTime =
      Number(
        transfer.timeStamp
      ) * 1000;

    const createdTime =
      new Date(
        deposit.created_at
      ).getTime();

    const expiresTime =
      deposit.expires_at
        ? new Date(
            deposit.expires_at
          ).getTime()
        : createdTime +
          LOOKBACK_MINUTES *
            60 *
            1000;

    if (
      transferTime <
      createdTime
    ) {
      return false;
    }

    if (
      transferTime >
      expiresTime
    ) {
      return false;
    }
  }

  return true;
}

// ======================================================
// PROCESAR UN DEPÓSITO
// ======================================================

async function processDeposit(
  deposit: Deposit,
  transfers: EtherscanTransfer[]
): Promise<ProcessResult> {
  // --------------------------------------------------
  // SEGURIDAD
  // --------------------------------------------------

  if (
    deposit.status !==
    "PENDING"
  ) {
    return {
      deposit_id:
        deposit.id,
      status:
        "SKIPPED_NOT_PENDING",
    };
  }

  // --------------------------------------------------
  // EXPIRACIÓN
  // --------------------------------------------------

  if (
    deposit.expires_at
  ) {
    const expiresAt =
      new Date(
        deposit.expires_at
      ).getTime();

    if (
      expiresAt <=
      Date.now()
    ) {
      return {
        deposit_id:
          deposit.id,
        status:
          "EXPIRED",
      };
    }
  }

  // --------------------------------------------------
  // BUSCAR TRANSFERENCIA
  // --------------------------------------------------

  const matchingTransfer =
    transfers.find(
      (transfer) =>
        isValidTransfer(
          transfer,
          deposit
        )
    );

  if (
    !matchingTransfer ||
    !matchingTransfer.hash
  ) {
    return {
      deposit_id:
        deposit.id,
      status:
        "WAITING_PAYMENT",
    };
  }

  // --------------------------------------------------
  // TX HASH
  // --------------------------------------------------

  const txHash =
    matchingTransfer.hash
      .trim()
      .toLowerCase();

  // --------------------------------------------------
  // CONFIRMAR ATÓMICAMENTE
  // --------------------------------------------------

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .rpc(
        "confirm_deposit_chain",
        {
          p_deposit_id:
            deposit.id,

          p_tx_hash:
            txHash,
        }
      );

  if (error) {
    return {
      deposit_id:
        deposit.id,

      status:
        "ERROR",

      tx_hash:
        txHash,

      error:
        error.message,
    };
  }

  const amount =
    Number(
      deposit.amount
    );

  return {
    deposit_id:
      deposit.id,

    status:
      "CONFIRMED",

    tx_hash:
      txHash,

    amount:
      Number.isFinite(
        amount
      )
        ? amount
        : undefined,
  };
}

// ======================================================
// GET
// ======================================================

export async function GET(
  request: NextRequest
) {
  // --------------------------------------------------
  // AUTORIZACIÓN
  // --------------------------------------------------

  if (
    !isAuthorized(
      request
    )
  ) {
    return NextResponse.json(
      {
        ok: false,

        error:
          "NO AUTORIZADO",
      },
      {
        status: 401,
      }
    );
  }

  try {
    // ------------------------------------------------
    // EXPIRAR DEPÓSITOS
    // ------------------------------------------------

    const expired =
      await expireDeposits();

    // ------------------------------------------------
    // DEPÓSITOS PENDIENTES
    // ------------------------------------------------

    const deposits =
      await getPendingDeposits();

    // ------------------------------------------------
    // TRANSFERENCIAS BSC
    // ------------------------------------------------

    let transfers:
      EtherscanTransfer[] = [];

    if (
      deposits.length >
      0
    ) {
      transfers =
        await getBep20Transfers();
    }

    // ------------------------------------------------
    // PROCESAR DEPÓSITOS
    // ------------------------------------------------

    const results:
      ProcessResult[] = [];

    for (
      const deposit of deposits
    ) {
      try {
        const result =
          await processDeposit(
            deposit,
            transfers
          );

        results.push(
          result
        );
      } catch (
        error
      ) {
        results.push({
          deposit_id:
            deposit.id,

          status:
            "ERROR",

          error:
            error instanceof Error
              ? error.message
              : "ERROR DESCONOCIDO",
        });
      }
    }

    // ------------------------------------------------
    // RESPUESTA
    // ------------------------------------------------

    return NextResponse.json({
      ok: true,

      expired,

      pending:
        deposits.length,

      transfers:
        transfers.length,

      processed:
        results.length,

      results,
    });
  } catch (
    error
  ) {
    console.error(
      "CHECK BEP20 ERROR:",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "ERROR INTERNO",
      },
      {
        status: 500,
      }
    );
  }
      }
