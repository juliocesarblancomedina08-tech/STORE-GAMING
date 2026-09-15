import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// =========================================================
// VARIABLES DE ENTORNO
// =========================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
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
) {
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

  // Evitamos usar 10n porque el proyecto
  // actualmente apunta a un target inferior a ES2020.
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


// =========================================================
// COMPARACIÓN DE MONTOS
// =========================================================

function amountsMatch(
  blockchainAmount: number,
  requestedAmount: number
) {
  return (
    Math.abs(
      blockchainAmount -
        requestedAmount
    ) < 0.000001
  );
}


// =========================================================
// CONSULTAR ETHERSCAN V2
// =========================================================

async function getUsdtTransfers() {
  const params =
    new URLSearchParams({
      chainid: BSC_CHAIN_ID,
      module: "account",
      action: "tokentx",
      contractaddress:
        USDT_CONTRACT,
      address:
        RECEIVING_WALLET,
      page: "1",
      offset:
        String(TRANSFER_OFFSET),
      sort: "desc",
      apikey:
        ETHERSCAN_API_KEY,
    });

  const response =
    await fetch(
      `https://api.etherscan.io/v2/api?${params.toString()}`,
      {
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

  // Cuando no existen transferencias,
  // Etherscan puede devolver status 0.
  if (
    data.status !== "1"
  ) {
    const message =
      String(
        data.result ||
        data.message ||
        ""
      ).toLowerCase();

    if (
      message.includes(
        "no transactions found"
      ) ||
      message.includes(
        "no transactions"
      )
    ) {
      return [];
    }

    throw new Error(
      data.result ||
        data.message ||
        "ERROR CONSULTANDO ETHERSCAN"
    );
  }

  if (!Array.isArray(data.result)) {
    return [];
  }

  return data.result as EtherscanTransfer[];
}


// =========================================================
// EXPIRAR DEPÓSITOS
// =========================================================

async function expireDeposits(
  deposits: PendingDeposit[]
) {
  const now =
    Date.now();

  const expired =
    deposits.filter(
      (deposit) => {
        if (
          !deposit.expires_at
        ) {
          return false;
        }

        return (
          new Date(
            deposit.expires_at
          ).getTime() <= now
        );
      }
    );

  for (
    const deposit of expired
  ) {
    const {
      error,
    } =
      await supabaseAdmin
        .from("deposits")
        .update({
          status: "EXPIRED",
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
    }
  }

  return expired.length;
}


// =========================================================
// PROCESAR UN DEPÓSITO
// =========================================================

async function processDeposit(
  deposit: PendingDeposit,
  transfers: EtherscanTransfer[]
) {

  // -------------------------------------------------------
  // Solo BEP20
  // -------------------------------------------------------

  if (
    deposit.network !==
    "BEP20"
  ) {
    return {
      depositId:
        deposit.id,
      result:
        "SKIPPED_NETWORK",
    };
  }


  // -------------------------------------------------------
  // Verificar wallet registrada
  // -------------------------------------------------------

  if (
    !deposit.wallet_address ||
    deposit.wallet_address.toLowerCase() !==
      RECEIVING_WALLET.toLowerCase()
  ) {
    return {
      depositId:
        deposit.id,
      result:
        "SKIPPED_WALLET",
    };
  }


  // -------------------------------------------------------
  // Comprobar ventana de tiempo
  // -------------------------------------------------------

  const createdAt =
    new Date(
      deposit.created_at
    ).getTime();

  const now =
    Date.now();

  const lookback =
    now -
    LOOKBACK_MINUTES *
      60 *
      1000;

  const minimumTimestamp =
    Math.max(
      createdAt,
      lookback
    );


  // -------------------------------------------------------
  // Buscar transferencia válida
  // -------------------------------------------------------

  const matchingTransfer =
    transfers.find(
      (transfer) => {

        // Contrato USDT correcto
        if (
          transfer.contractAddress.toLowerCase() !==
          USDT_CONTRACT.toLowerCase()
        ) {
          return false;
        }


        // Wallet destino correcta
        if (
          transfer.to.toLowerCase() !==
          RECEIVING_WALLET.toLowerCase()
        ) {
          return false;
        }


        // TX posterior a la creación
        // del depósito
        const timestamp =
          Number(
            transfer.timeStamp
          ) * 1000;

        if (
          timestamp <
          minimumTimestamp
        ) {
          return false;
        }


        // TX válida
        if (
          !transfer.hash
        ) {
          return false;
        }


        // Debe tener confirmaciones
        const confirmations =
          Number(
            transfer.confirmations ||
              "0"
          );

        if (
          confirmations < 2
        ) {
          return false;
        }


        // Decimales del token
        const decimals =
          Number(
            transfer.tokenDecimal ||
              USDT_DECIMALS
          );


        // Convertir cantidad
        const receivedAmount =
          rawToUsdt(
            transfer.value,
            decimals
          );


        // Comparar cantidad
        return amountsMatch(
          receivedAmount,
          Number(
            deposit.amount
          )
        );
      }
    );


  // -------------------------------------------------------
  // No se encontró pago
  // -------------------------------------------------------

  if (
    !matchingTransfer
  ) {
    return {
      depositId:
        deposit.id,
      result:
        "WAITING_PAYMENT",
    };
  }


  // -------------------------------------------------------
  // Comprobar TX ya utilizada
  // -------------------------------------------------------

  const {
    data: existingTx,
    error:
      existingTxError,
  } =
    await supabaseAdmin
      .from("deposits")
      .select(
        "id,status,user_id"
      )
      .ilike(
        "tx_hash",
        matchingTransfer.hash
      )
      .maybeSingle();


  if (
    existingTxError
  ) {
    console.error(
      "ERROR BUSCANDO TX:",
      existingTxError
    );

    return {
      depositId:
        deposit.id,
      result:
        "TX_CHECK_ERROR",
      error:
        existingTxError.message,
    };
  }


  // TX ya utilizada
  if (
    existingTx
  ) {
    return {
      depositId:
        deposit.id,
      result:
        "TX_ALREADY_USED",
      existingDepositId:
        existingTx.id,
    };
  }


  // -------------------------------------------------------
  // ACREDITACIÓN ATÓMICA
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
          matchingTransfer.hash,
      }
    );


  if (error) {
    console.error(
      "ERROR CONFIRMANDO DEPÓSITO:",
      deposit.id,
      error
    );

    return {
      depositId:
        deposit.id,
      result:
        "CONFIRM_ERROR",
      error:
        error.message,
    };
  }


  // -------------------------------------------------------
  // Confirmado
  // -------------------------------------------------------

  return {
    depositId:
      deposit.id,

    result:
      "CONFIRMED",

    txHash:
      matchingTransfer.hash,

    amount:
      deposit.amount,

    data,
  };
}


// =========================================================
// GET — CRON
// =========================================================

export async function GET(
  request: NextRequest
) {

  try {

    // -----------------------------------------------------
    // Verificar CRON_SECRET
    // -----------------------------------------------------

    if (
      !CRON_SECRET
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "CRON_SECRET NO CONFIGURADO",
        },
        {
          status: 500,
        }
      );
    }


    // -----------------------------------------------------
    // Verificar autorización
    // -----------------------------------------------------

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


    // -----------------------------------------------------
    // Verificar Supabase
    // -----------------------------------------------------

    if (
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_ROLE_KEY
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "VARIABLES DE SUPABASE NO CONFIGURADAS",
        },
        {
          status: 500,
        }
      );
    }


    // -----------------------------------------------------
    // Verificar Etherscan
    // -----------------------------------------------------

    if (
      !ETHERSCAN_API_KEY
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "ETHERSCAN_API_KEY NO CONFIGURADA",
        },
        {
          status: 500,
        }
      );
    }


    // -----------------------------------------------------
    // Obtener depósitos pendientes
    // -----------------------------------------------------

    const {
      data: deposits,
      error:
        depositsError,
    } =
      await supabaseAdmin
        .from("deposits")
        .select(
          `
            id,
            user_id,
            amount,
            network,
            wallet_address,
            status,
            created_at,
            expires_at
          `
        )
        .eq(
          "status",
          "PENDING"
        )
        .order(
          "created_at",
          {
            ascending: true,
          }
        );


    if (
      depositsError
    ) {
      throw depositsError;
    }


    const pendingDeposits =
      (deposits || []) as PendingDeposit[];


    // -----------------------------------------------------
    // Expirar depósitos vencidos
    // -----------------------------------------------------

    const expiredCount =
      await expireDeposits(
        pendingDeposits
      );


    // -----------------------------------------------------
    // Filtrar BEP20 todavía vigentes
    // -----------------------------------------------------

    const bep20Deposits =
      pendingDeposits.filter(
        (deposit) => {

          if (
            deposit.network !==
            "BEP20"
          ) {
            return false;
          }

          if (
            !deposit.expires_at
          ) {
            return true;
          }

          return (
            new Date(
              deposit.expires_at
            ).getTime() >
            Date.now()
          );
        }
      );


    // -----------------------------------------------------
    // No hay depósitos BEP20
    // -----------------------------------------------------

    if (
      bep20Deposits.length === 0
    ) {
      return NextResponse.json({
        ok: true,

        message:
          "NO HAY DEPÓSITOS BEP20 PENDIENTES",

        pending: 0,

        expired:
          expiredCount,

        processed: [],
      });
    }


    // -----------------------------------------------------
    // Consultar blockchain
    // -----------------------------------------------------

    const transfers =
      await getUsdtTransfers();


    // -----------------------------------------------------
    // Procesar depósitos
    // -----------------------------------------------------

    const results = [];

    for (
      const deposit of bep20Deposits
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


    // -----------------------------------------------------
    // Respuesta
    // -----------------------------------------------------

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
