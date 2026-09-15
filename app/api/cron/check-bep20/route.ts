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
   * No usamos:
   *
   * 10n ** BigInt(decimals)
   *
   * porque el proyecto actualmente apunta
   * a un target inferior a ES2020.
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
      .padStart(decimals, "0");

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

  /*
   * Permitimos una diferencia extremadamente pequeña
   * para evitar problemas de representación decimal.
   */

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

  /*
   * Cuando no existen transferencias,
   * Etherscan puede responder:
   *
   * status: "0"
   * message: "No transactions found"
   *
   * Eso no es un error para nuestro cron.
   */

  if (
    data?.message ===
    "No transactions found"
  ) {
    return [];
  }

  if (
    Array.isArray(data?.result)
  ) {
    return data.result as EtherscanTransfer[];
  }

  /*
   * Algunas respuestas de error de Etherscan
   * vienen con result como texto.
   */

  if (
    typeof data?.result ===
    "string"
  ) {

    throw new Error(
      `ETHERSCAN: ${data.result}`
    );
  }

  return [];
}


// =========================================================
// COMPROBAR SI EL TX HASH YA FUE UTILIZADO
// =========================================================

async function transactionAlreadyUsed(
  txHash: string
): Promise<boolean> {

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("deposits")
      .select("id")
      .ilike(
        "tx_hash",
        txHash
      )
      .limit(1);

  if (error) {

    throw new Error(
      `ERROR COMPROBANDO TX HASH: ${error.message}`
    );
  }

  return (
    Array.isArray(data) &&
    data.length > 0
  );
}


// =========================================================
// EXPIRAR DEPÓSITOS VENCIDOS
// =========================================================

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

  return (
    Array.isArray(data)
      ? data.length
      : 0
  );
}


// =========================================================
// OBTENER DEPÓSITOS PENDIENTES BEP20
// =========================================================

async function getPendingDeposits(): Promise<
  PendingDeposit[]
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
          "amount",
          "network",
          "wallet_address",
          "status",
          "created_at",
          "expires_at",
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

  return (
    (data || []) as PendingDeposit[]
  );
}


// =========================================================
// COMPROBAR SI TRANSFERENCIA ESTÁ DENTRO DEL TIEMPO
// =========================================================

function transferIsRecent(
  transfer: EtherscanTransfer
): boolean {

  const timestamp =
    Number(
      transfer.timeStamp
    );

  if (
    !Number.isFinite(timestamp)
  ) {
    return false;
  }

  const now =
    Date.now();

  const transferTime =
    timestamp * 1000;

  const minimumTime =
    now -
    LOOKBACK_MINUTES *
      60 *
      1000;

  return (
    transferTime >=
    minimumTime
  );
}


// =========================================================
// COMPROBAR TRANSFERENCIA VÁLIDA
// =========================================================

function transferMatchesDeposit(
  transfer: EtherscanTransfer,
  deposit: PendingDeposit
): boolean {

  // -------------------------------------------------------
  // 1. Contrato USDT correcto
  // -------------------------------------------------------

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


  // -------------------------------------------------------
  // 2. Wallet destino correcta
  // -------------------------------------------------------

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


  // -------------------------------------------------------
  // 3. Wallet guardada en el depósito
  // -------------------------------------------------------

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


  // -------------------------------------------------------
  // 4. Transferencia reciente
  // -------------------------------------------------------

  if (
    !transferIsRecent(
      transfer
    )
  ) {
    return false;
  }


  // -------------------------------------------------------
  // 5. Confirmaciones
  // -------------------------------------------------------

  const confirmations =
    Number(
      transfer.confirmations
    );

  if (
    !Number.isFinite(
      confirmations
    )
  ) {
    return false;
  }

  if (
    confirmations < 2
  ) {
    return false;
  }


  // -------------------------------------------------------
  // 6. Monto exacto
  // -------------------------------------------------------

  const blockchainAmount =
    rawToUsdt(
      transfer.value,
      USDT_DECIMALS
    );

  const requestedAmount =
    Number(
      deposit.amount
    );

  if (
    !Number.isFinite(
      requestedAmount
    )
  ) {
    return false;
  }

  if (
    !amountsMatch(
      blockchainAmount,
      requestedAmount
    )
  ) {
    return false;
  }


  return true;
}


// =========================================================
// PROCESAR UN DEPÓSITO
// =========================================================

async function processDeposit(
  deposit: PendingDeposit,
  transfers: EtherscanTransfer[]
) {

  /*
   * Volvemos a comprobar que el depósito
   * siga pendiente antes de procesarlo.
   */

  if (
    deposit.status !==
    "PENDING"
  ) {

    return {
      depositId:
        deposit.id,

      status:
        "SKIPPED",

      reason:
        "EL DEPÓSITO YA NO ESTÁ PENDIENTE",
    };
  }


  // -------------------------------------------------------
  // Comprobar expiración
  // -------------------------------------------------------

  if (
    deposit.expires_at
  ) {

    const expiresAt =
      new Date(
        deposit.expires_at
      ).getTime();

    if (
      Number.isFinite(
        expiresAt
      ) &&
      expiresAt <=
        Date.now()
    ) {

      const {
        error,
      } =
        await supabaseAdmin
          .from("deposits")
          .update({
            status:
              "EXPIRED",
          })
          .eq(
            "id",
            deposit.id
          )
          .eq(
            "status",
            "PENDING"
          );

      if (error) {

        console.error(
          "ERROR EXPIRANDO DEPÓSITO:",
          deposit.id,
          error
        );

        return {
          depositId:
            deposit.id,

          status:
            "ERROR",

          reason:
            error.message,
        };
      }

      return {
        depositId:
          deposit.id,

        status:
          "EXPIRED",

        reason:
          "DEPÓSITO EXPIRADO",
      };
    }
  }


  // -------------------------------------------------------
  // Buscar transferencia compatible
  // -------------------------------------------------------

  const matchingTransfer =
    transfers.find(
      (transfer) =>
        transferMatchesDeposit(
          transfer,
          deposit
        )
    );


  // -------------------------------------------------------
  // No encontrado todavía
  // -------------------------------------------------------

  if (
    !matchingTransfer
  ) {

    return {
      depositId:
        deposit.id,

      status:
        "PENDING",

      reason:
        "NO SE ENCONTRÓ UN PAGO COMPATIBLE",
    };
  }


  // -------------------------------------------------------
  // TX HASH
  // -------------------------------------------------------

  const txHash =
    matchingTransfer.hash
      ?.trim()
      .toLowerCase();

  if (
    !txHash
  ) {

    return {
      depositId:
        deposit.id,

      status:
        "ERROR",

      reason:
        "TX HASH INVÁLIDO",
    };
  }


  // -------------------------------------------------------
  // Comprobar que el TX no haya sido usado
  // -------------------------------------------------------

  const alreadyUsed =
    await transactionAlreadyUsed(
      txHash
    );

  if (
    alreadyUsed
  ) {

    return {
      depositId:
        deposit.id,

      status:
        "REJECTED",

      reason:
        "ESTA TRANSACCIÓN YA FUE UTILIZADA",
    };
  }


  // -------------------------------------------------------
  // Confirmar y acreditar mediante RPC segura
  // -------------------------------------------------------

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


  // -------------------------------------------------------
  // Error RPC
  // -------------------------------------------------------

  if (error) {

    console.error(
      "ERROR CONFIRMANDO DEPÓSITO:",
      deposit.id,
      error
    );

    return {
      depositId:
        deposit.id,

      status:
        "ERROR",

      reason:
        error.message,
    };
  }


  // -------------------------------------------------------
  // Confirmado
  // -------------------------------------------------------

  return {
    depositId:
      deposit.id,

    status:
      "CONFIRMED",

    txHash,

    amount:
      rawToUsdt(
        matchingTransfer.value,
        USDT_DECIMALS
      ),

    transaction:
      data,
  };
}


// =========================================================
// GET - CRON BEP20
// =========================================================

export async function GET(
  request: NextRequest
) {

  // =======================================================
  // AUTORIZACIÓN
  // =======================================================

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

    // =====================================================
    // COMPROBAR VARIABLES
    // =====================================================

    if (
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_ROLE_KEY
    ) {

      throw new Error(
        "FALTAN VARIABLES DE SUPABASE"
      );
    }

    if (
      !ETHERSCAN_API_KEY
    ) {

      throw new Error(
        "FALTA ETHERSCAN_API_KEY"
      );
    }

    if (
      !CRON_SECRET
    ) {

      throw new Error(
        "FALTA CRON_SECRET"
      );
    }


    // =====================================================
    // EXPIRAR DEPÓSITOS VENCIDOS
    // =====================================================

    const expiredCount =
      await expireDeposits();


    // =====================================================
    // OBTENER DEPÓSITOS PENDIENTES
    // =====================================================

    const pendingDeposits =
      await getPendingDeposits();


    // =====================================================
    // FILTRAR SOLO BEP20
    // =====================================================

    const bep20Deposits =
      pendingDeposits.filter(
        (deposit) =>
          deposit.network
            ?.toUpperCase() ===
          "BEP20"
      );


    // =====================================================
    // OBTENER TRANSFERENCIAS BLOCKCHAIN
    // =====================================================

    const transfers =
      await getTransfers();


    // =====================================================
    // PROCESAR DEPÓSITOS
    // =====================================================

    const results = [];


    for (
      const deposit
      of bep20Deposits
    ) {

      const result =
        await processDeposit(
          deposit,
          transfers
        );

      results.push(
        result
      );
    }


    // =====================================================
    // RESPUESTA
    // =====================================================

    return NextResponse.json({
      ok: true,

      network:
        "BEP20",

      wallet:
        RECEIVING_WALLET,

      pending:
        bep20Deposits.length,

      expired:
        expiredCount,

      transfersChecked:
        transfers.length,

      processed:
        results,

      timestamp:
        new Date().toISOString(),
    });

  } catch (
    error
  ) {

    console.error(
      "ERROR CRON BEP20:",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "ERROR DESCONOCIDO",
      },
      {
        status: 500,
      }
    );
  }
    }
