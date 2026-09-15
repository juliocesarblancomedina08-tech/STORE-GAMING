import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

// Buscamos transferencias de los últimos 15 minutos.
const LOOKBACK_MINUTES = 15;

// Consideramos la transacción suficientemente confirmada
// después de al menos 2 bloques.
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

// ======================================================
// AUTORIZACIÓN DEL CRON
// ======================================================

function isAuthorized(request: NextRequest): boolean {
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
// CONVERSIÓN SEGURA DE TOKEN RAW A USDT
// ======================================================
//
// IMPORTANTE:
// NO usamos:
//   10n
//
// porque Vercel estaba compilando con un target
// inferior a ES2020.
//
// En su lugar construimos el divisor con BigInt()
// a partir de un string.
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
// COMPARAR CANTIDADES
// ======================================================

function amountsMatch(
  depositAmount: number,
  transferAmount: number
): boolean {
  const deposit =
    Number(depositAmount);

  const transfer =
    Number(transferAmount);

  if (!Number.isFinite(deposit)) {
    return false;
  }

  if (!Number.isFinite(transfer)) {
    return false;
  }

  // Tolerancia extremadamente pequeña
  // para evitar problemas de representación decimal.
  return (
    Math.abs(deposit - transfer) <
    0.000001
  );
}

// ======================================================
// NORMALIZAR DIRECCIONES
// ======================================================

function normalizeAddress(
  address: string | null | undefined
): string {
  return (
    address
      ?.trim()
      .toLowerCase() || ""
  );
}

// ======================================================
// OBTENER TRANSFERENCIAS USDT BEP20
// ======================================================

async function getTransfers(): Promise<
  EtherscanTransfer[]
> {
  if (!ETHERSCAN_API_KEY) {
    throw new Error(
      "ETHERSCAN_API_KEY NO ESTÁ CONFIGURADA"
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
    Array.isArray(data.result)
  ) {
    return data.result;
  }

  if (
    typeof data.result === "string"
  ) {
    if (
      data.result.toLowerCase() ===
      "no transactions found"
    ) {
      return [];
    }

    throw new Error(
      data.result
    );
  }

  return [];
}

// ======================================================
// VERIFICAR SI UNA TX YA FUE UTILIZADA
// ======================================================

async function transactionAlreadyUsed(
  txHash: string
): Promise<boolean> {
  const normalized =
    txHash
      .trim()
      .toLowerCase();

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("deposits")
      .select("id")
      .ilike(
        "tx_hash",
        normalized
      )
      .limit(1);

  if (error) {
    throw error;
  }

  return (
    Array.isArray(data) &&
    data.length > 0
  );
}

// ======================================================
// EXPIRAR DEPÓSITOS
// ======================================================

async function expireDeposits(): Promise<number> {
  const now =
    new Date().toISOString();

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
      .not(
        "expires_at",
        "is",
        null
      )
      .lte(
        "expires_at",
        now
      )
      .select("id");

  if (error) {
    throw error;
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
      .select("*")
      .eq(
        "status",
        "PENDING"
      )
      .eq(
        "payment_method",
        "CRYPTO"
      )
      .order(
        "created_at",
        {
          ascending: true,
        }
      );

  if (error) {
    throw error;
  }

  return (
    (data as Deposit[]) ||
    []
  );
}

// ======================================================
// VERIFICAR FECHA DE LA TRANSFERENCIA
// ======================================================

function transferIsRecent(
  transfer: EtherscanTransfer
): boolean {
  if (!transfer.timeStamp) {
    return false;
  }

  const timestamp =
    Number(
      transfer.timeStamp
    );

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  const transferDate =
    new Date(
      timestamp * 1000
    );

  const now =
    Date.now();

  const difference =
    now -
    transferDate.getTime();

  const maximumAge =
    LOOKBACK_MINUTES *
    60 *
    1000;

  return (
    difference >= 0 &&
    difference <= maximumAge
  );
}

// ======================================================
// VERIFICAR SI TRANSFERENCIA COINCIDE
// ======================================================

function transferMatchesDeposit(
  transfer: EtherscanTransfer,
  deposit: Deposit
): boolean {
  // ----------------------------------------------------
  // HASH
  // ----------------------------------------------------

  if (!transfer.hash) {
    return false;
  }

  // ----------------------------------------------------
  // CONTRATO USDT
  // ----------------------------------------------------

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

  // ----------------------------------------------------
  // TOKEN
  // ----------------------------------------------------

  if (
    transfer.tokenSymbol &&
    transfer.tokenSymbol
      .toUpperCase() !==
      "USDT"
  ) {
    return false;
  }

  // ----------------------------------------------------
  // DESTINO
  // ----------------------------------------------------

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

  // ----------------------------------------------------
  // WALLET DEL DEPÓSITO
  // ----------------------------------------------------

  if (
    deposit.wallet_address &&
    normalizeAddress(
      deposit.wallet_address
    ) !==
    normalizeAddress(
      RECEIVING_WALLET
    )
  ) {
    return false;
  }

  // ----------------------------------------------------
  // NETWORK
  // ----------------------------------------------------

  const network =
    (
      deposit.network ||
      ""
    )
      .trim()
      .toUpperCase();

  if (
    network !==
    "BEP20"
  ) {
    return false;
  }

  // ----------------------------------------------------
  // FECHA
  // ----------------------------------------------------

  if (
    !transferIsRecent(
      transfer
    )
  ) {
    return false;
  }

  // ----------------------------------------------------
  // VALOR
  // ----------------------------------------------------

  if (!transfer.value) {
    return false;
  }

  const decimals =
    transfer.tokenDecimal
      ? Number(
          transfer.tokenDecimal
        )
      : USDT_DECIMALS;

  if (
    !Number.isFinite(
      decimals
    )
  ) {
    return false;
  }

  const transferAmount =
    rawToUsdt(
      transfer.value,
      decimals
    );

  // ----------------------------------------------------
  // CANTIDAD EXACTA
  // ----------------------------------------------------

  if (
    !amountsMatch(
      Number(
        deposit.amount
      ),
      transferAmount
    )
  ) {
    return false;
  }

  // ----------------------------------------------------
  // CONFIRMACIONES
  // ----------------------------------------------------

  const confirmations =
    transfer.confirmations
      ? Number(
          transfer.confirmations
        )
      : 0;

  if (
    !Number.isFinite(
      confirmations
    )
  ) {
    return false;
  }

  if (
    confirmations <
    MIN_CONFIRMATIONS
  ) {
    return false;
  }

  return true;
}

// ======================================================
// PROCESAR UN DEPÓSITO
// ======================================================

async function processDeposit(
  deposit: Deposit,
  transfers: EtherscanTransfer[]
) {
  for (
    const transfer of transfers
  ) {
    if (
      !transferMatchesDeposit(
        transfer,
        deposit
      )
    ) {
      continue;
    }

    const txHash =
      transfer.hash;

    if (!txHash) {
      continue;
    }

    // --------------------------------------------------
    // PROTEGER CONTRA REUTILIZACIÓN
    // --------------------------------------------------

    const alreadyUsed =
      await transactionAlreadyUsed(
        txHash
      );

    if (alreadyUsed) {
      continue;
    }

    // --------------------------------------------------
    // CONFIRMAR Y ACREDITAR
    // --------------------------------------------------

    const {
      data,
      error,
    } =
      await supabaseAdmin.rpc(
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

    return {
      deposit_id:
        deposit.id,

      status:
        "CONFIRMED",

      tx_hash:
        txHash,

      result:
        data,
    };
  }

  return {
    deposit_id:
      deposit.id,

    status:
      "WAITING",
  };
}

// ======================================================
// GET
// ======================================================

export async function GET(
  request: NextRequest
) {
  try {
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

    // --------------------------------------------------
    // EXPIRAR DEPÓSITOS
    // --------------------------------------------------

    const expired =
      await expireDeposits();

    // --------------------------------------------------
    // OBTENER PENDIENTES
    // --------------------------------------------------

    const deposits =
      await getPendingDeposits();

    if (
      deposits.length === 0
    ) {
      return NextResponse.json({
        ok: true,

        message:
          "NO HAY DEPÓSITOS PENDIENTES",

        expired,

        processed: 0,

        results: [],
      });
    }

    // --------------------------------------------------
    // OBTENER TRANSFERENCIAS
    // --------------------------------------------------

    const transfers =
      await getTransfers();

    // --------------------------------------------------
    // PROCESAR
    // --------------------------------------------------

    const results = [];

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

    // --------------------------------------------------
    // RESPUESTA
    // --------------------------------------------------

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
