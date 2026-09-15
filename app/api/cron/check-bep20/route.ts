import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
 
// =========================================================
// VARIABLES DE ENTORNO
// =========================================================

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL!;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY!;

const ETHERSCAN_API_KEY =
  process.env.ETHERSCAN_API_KEY!;

const CRON_SECRET =
  process.env.CRON_SECRET!;


// =========================================================
// CONFIGURACIÓN BEP20
// =========================================================

const BSC_CHAIN_ID = "56";

// Wallet que recibe los USDT
const RECEIVING_WALLET =
  "0xdcdEe992E26cDBe1b024e171a3a980078BeaAC77";

// USDT oficial en BNB Smart Chain
const USDT_CONTRACT =
  "0x55d398326f99059fF775485246999027B3197955";

// USDT BEP20 utiliza 18 decimales
const USDT_DECIMALS = 18;

// Solo buscamos pagos recientes
const LOOKBACK_MINUTES = 15;

// Cantidad máxima de transferencias consultadas
const TRANSFER_OFFSET = 100;


// =========================================================
// SUPABASE ADMIN
// =========================================================

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


// =========================================================
// TIPOS
// =========================================================

type PendingDeposit = {
  id: string;
  user_id: string;
  amount: number | string;
  network: string;
  wallet_address: string | null;
  status: string;
  created_at: string;
  expires_at: string | null;
};

type EtherscanTransfer = {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  contractAddress: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  confirmations: string;
  transactionIndex: string;
};


// =========================================================
// AUTORIZACIÓN DEL CRON
// =========================================================

function isAuthorized(
  request: NextRequest
): boolean {

  const authorization =
    request.headers.get("authorization");

  if (!authorization) {
    return false;
  }

  return (
    authorization ===
    `Bearer ${CRON_SECRET}`
  );
}


// =========================================================
// CONVERTIR UNIDADES USDT
// =========================================================

function rawToUsdt(
  value: string,
  decimals: number
): number {

  const raw = BigInt(value);

  /*
   * IMPORTANTE:
   * No usamos 10n porque TypeScript está
   * compilando con un target inferior a ES2020.
   */

  const divisor = BigInt(
    "1" + "0".repeat(decimals)
  );

  const whole =
    raw / divisor;

  const remainder =
    raw % divisor;

  const remainderString =
    remainder
      .toString()
      .padStart(
        decimals,
        "0"
      );

  const decimalPart =
    remainderString.replace(
      /0+$/,
      ""
    );

  if (!decimalPart) {
    return Number(whole);
  }

  return Number(
    `${whole}.${decimalPart}`
  );
}


// =========================================================
// COMPARACIÓN DE MONTOS
// =========================================================

function amountsMatch(
  blockchainAmount: number,
  requestedAmount: number
): boolean {

  const difference =
    Math.abs(
      blockchainAmount -
      requestedAmount
    );

  return difference < 0.000001;
}


// =========================================================
// NORMALIZAR DIRECCIONES
// =========================================================

function normalizeAddress(
  address: string | null | undefined
): string {

  return (
    address || ""
  )
    .trim()
    .toLowerCase();
}


// =========================================================
// OBTENER TRANSFERENCIAS DE ETHERSCAN
// =========================================================

async function getTransfers(): Promise<
  EtherscanTransfer[]
> {

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
    String(TRANSFER_OFFSET)
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
    await response.json();

  // Etherscan puede devolver esto
  // cuando no hay transacciones.
  if (
    data?.message ===
    "No transactions found"
  ) {
    return [];
  }

  if (
    Array.isArray(
      data?.result
    )
  ) {
    return data.result as EtherscanTransfer[];
  }

  if (
    typeof data?.result ===
    "string"
  ) {

    throw new Error(
      `ETHERSCAN: ${data.result}`
    );
  }

  return
