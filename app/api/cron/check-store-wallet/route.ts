import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ======================================================
// CONFIGURACIÓN
// ======================================================

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "";

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const ANKR_API_KEY =
  process.env.ANKR_API_KEY || "";

const CRON_SECRET =
  process.env.CRON_SECRET || "";

const BSC_RPC_URL =
  `https://rpc.ankr.com/bsc/${ANKR_API_KEY}`;

// ======================================================
// WALLET STORE GAMING
// ======================================================

const RECEIVING_WALLET =
  "0xdcdEe992E26cDBe1b024e171a3a980078BeaAC77";

// ======================================================
// CONTRATO USDT BEP20
// ======================================================

const USDT_CONTRACT =
  "0x55d398326f99059fF775485246999027B3197955";

// ======================================================
// USDT
// ======================================================

const USDT_DECIMALS = 18;

// ======================================================
// CONFIRMACIONES MÍNIMAS
// ======================================================

const MIN_CONFIRMATIONS = 2;

// ======================================================
// BLOQUES A REVISAR
// ======================================================

const BLOCK_LOOKBACK = 800;

// ======================================================
// EVENT Transfer(address,address,uint256)
// ======================================================

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

// ======================================================
// SUPABASE ADMIN
// ======================================================

const supabaseAdmin =
  createClient(
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

type RpcResponse<T> = {
  jsonrpc: string;
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
  };
};

type RpcLog = {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  transactionHash: string;
  transactionIndex?: string;
  logIndex?: string;
  removed?: boolean;
};

type BlockData = {
  timestamp: string;
};

type TransactionReceipt = {
  status?: string;
  blockNumber?: string;
  transactionHash?: string;
};

type CustomerDeposit = {
  id: string;
  user_id: string;
  amount: number | string;
  currency?: string | null;
  network?: string | null;
  wallet_address?: string | null;
  status?: string | null;
  created_at: string;
  expires_at?: string | null;
};

type Bep20Transfer = {
  hash: string;
  contractAddress: string;
  from: string;
  to: string;
  rawValue: string;
  amount: string;
  blockNumber: number;
  timestamp: number;
  confirmations: number;
  successful: boolean;
};

type ProcessedResult = {
  tx_hash: string;
  amount?: string;
  status:
    | "PROCESSED"
    | "ALREADY_PROCESSED"
    | "WAITING"
    | "ERROR";
  customer_deposit_id?: string | null;
  customer_credited?: boolean;
  recharge_created?: boolean;
  recharge_id?: string | null;
  error?: string;
};

// ======================================================
// NORMALIZAR DIRECCIÓN
// ======================================================

function normalizeAddress(
  address: string | null | undefined
): string {
  return String(address || "")
    .trim()
    .toLowerCase();
}

// ======================================================
// CONVERTIR DIRECCIÓN A TOPIC
// ======================================================

function addressToTopic(
  address: string
): string {
  return (
    "0x" +
    normalizeAddress(address)
      .replace(/^0x/, "")
      .padStart(64, "0")
  );
}

// ======================================================
// RPC
// ======================================================

async function rpcCall<T>(
  method: string,
  params: unknown[]
): Promise<T> {
  const response =
    await fetch(
      BSC_RPC_URL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method,
          params,
        }),

        cache: "no-store",
      }
    );

  if (!response.ok) {
    throw new Error(
      `RPC HTTP ${response.status}`
    );
  }

  const json =
    (await response.json()) as RpcResponse<T>;

  if (json.error) {
    throw new Error(
      `RPC ${method}: ${json.error.message}`
    );
  }

  if (
    json.result === undefined
  ) {
    throw new Error(
      `RPC ${method}: RESPUESTA VACÍA`
    );
  }

  return json.result;
}

// ======================================================
// ÚLTIMO BLOQUE
// ======================================================

async function getLatestBlockNumber(): Promise<number> {
  const result =
    await rpcCall<string>(
      "eth_blockNumber",
      []
    );

  return Number(
    BigInt(result)
  );
}

// ======================================================
// BLOQUE
// ======================================================

async function getBlockByNumber(
  blockNumber: number
): Promise<BlockData> {
  const hex =
    "0x" +
    blockNumber.toString(16);

  return rpcCall<BlockData>(
    "eth_getBlockByNumber",
    [
      hex,
      false,
    ]
  );
}

// ======================================================
// RECEIPT
// ======================================================

async function getTransactionReceipt(
  txHash: string
): Promise<TransactionReceipt | null> {
  return rpcCall<TransactionReceipt | null>(
    "eth_getTransactionReceipt",
    [txHash]
  );
}

// ======================================================
// CONVERTIR RAW USDT A DECIMAL
// ======================================================

function rawToUsdt(
  rawValue: string
): string {
  const raw =
    BigInt(rawValue);

  const base =
    10n ** BigInt(USDT_DECIMALS);

  const whole =
    raw / base;

  const decimals =
    raw % base;

  if (decimals === 0n) {
    return whole.toString();
  }

  let decimalText =
    decimals
      .toString()
      .padStart(
        USDT_DECIMALS,
        "0"
      );

  decimalText =
    decimalText.replace(
      /0+$/,
      ""
    );

  return `${whole.toString()}.${decimalText}`;
}

// ======================================================
// USDT DECIMAL A RAW
// ======================================================

function usdtToRaw(
  amount: number | string
): string {
  const text =
    String(amount)
      .trim();

  if (
    !/^\d+(\.\d+)?$/.test(
      text
    )
  ) {
    throw new Error(
      `MONTO USDT INVÁLIDO: ${text}`
    );
  }

  const [
    wholePart,
    decimalPart = "",
  ] =
    text.split(".");

  const decimals =
    decimalPart
      .padEnd(
        USDT_DECIMALS,
        "0"
      )
      .slice(
        0,
        USDT_DECIMALS
      );

  return (
    BigInt(wholePart) *
      10n **
        BigInt(USDT_DECIMALS) +
    BigInt(decimals || "0")
  ).toString();
}

// ======================================================
// OBTENER LOGS USDT
// ======================================================

async function getBep20Logs(): Promise<RpcLog[]> {
  const latestBlock =
    await getLatestBlockNumber();

  const fromBlock =
    Math.max(
      0,
      latestBlock -
        BLOCK_LOOKBACK
    );

  const params = [
    {
      address:
        USDT_CONTRACT,

      fromBlock:
        "0x" +
        fromBlock.toString(16),

      toBlock:
        "0x" +
        latestBlock.toString(16),

      topics: [
        TRANSFER_TOPIC,

        null,

        addressToTopic(
          RECEIVING_WALLET
        ),
      ],
    },
  ];

  const logs =
    await rpcCall<RpcLog[]>(
      "eth_getLogs",
      params
    );

  return logs;
}

// ======================================================
// CONVERTIR LOG A TRANSFERENCIA
// ======================================================

async function parseTransfer(
  log: RpcLog,
  latestBlock: number
): Promise<Bep20Transfer | null> {
  try {
    if (
      !log.topics ||
      log.topics.length < 3
    ) {
      return null;
    }

    if (
      normalizeAddress(
        log.address
      ) !==
      normalizeAddress(
        USDT_CONTRACT
      )
    ) {
      return null;
    }

    if (
      !log.transactionHash
    ) {
      return null;
    }

    const from =
      "0x" +
      log.topics[1]
        .replace(/^0x/, "")
        .slice(-40);

    const to =
      "0x" +
      log.topics[2]
        .replace(/^0x/, "")
        .slice(-40);

    if (
      normalizeAddress(to) !==
      normalizeAddress(
        RECEIVING_WALLET
      )
    ) {
      return null;
    }

    const rawValue =
      BigInt(
        log.data
      ).toString();

    if (
      rawValue === "0"
    ) {
      return null;
    }

    const blockNumber =
      Number(
        BigInt(
          log.blockNumber
        )
      );

    const block =
      await getBlockByNumber(
        blockNumber
      );

    const timestamp =
      Number(
        BigInt(
          block.timestamp
        )
      ) *
      1000;

    const receipt =
      await getTransactionReceipt(
        log.transactionHash
      );

    if (!receipt) {
      return null;
    }

    const successful =
      receipt.status ===
      "0x1";

    if (
      !successful
    ) {
      return null;
    }

    const confirmations =
      Math.max(
        0,
        latestBlock -
          blockNumber +
          1
      );

    return {
      hash:
        log.transactionHash,

      contractAddress:
        log.address,

      from,

      to,

      rawValue,

      amount:
        rawToUsdt(
          rawValue
        ),

      blockNumber,

      timestamp,

      confirmations,

      successful,
    };

  } catch (error) {
    console.error(
      "ERROR PARSEANDO TRANSFERENCIA:",
      error
    );

    return null;
  }
}

// ======================================================
// OBTENER TRANSFERENCIAS VÁLIDAS
// ======================================================

async function getBep20Transfers(): Promise<Bep20Transfer[]> {
  const latestBlock =
    await getLatestBlockNumber();

  const logs =
    await getBep20Logs();

  const transfers:
    Bep20Transfer[] = [];

  for (
    const log of logs
  ) {
    const transfer =
      await parseTransfer(
        log,
        latestBlock
      );

    if (!transfer) {
      continue;
    }

    if (
      transfer.confirmations <
      MIN_CONFIRMATIONS
    ) {
      continue;
    }

    transfers.push(
      transfer
    );
  }

  return transfers;
}

// ======================================================
// OBTENER DEPÓSITOS DE CLIENTES PENDIENTES
// ======================================================

async function getPendingCustomerDeposits(): Promise<
  CustomerDeposit[]
> {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("deposits")
      .select(
        `
        id,
        user_id,
        amount,
        currency,
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
      `ERROR OBTENIENDO DEPÓSITOS DE CLIENTES: ${error.message}`
    );
  }

  return (
    (data || []) as CustomerDeposit[]
  );
}

// ======================================================
// BUSCAR DEPÓSITO DE CLIENTE PARA UNA TX
// ======================================================

function findCustomerDeposit(
  transfer: Bep20Transfer,
  deposits: CustomerDeposit[]
): CustomerDeposit | null {
  const transferTime =
    transfer.timestamp;

  const transferRaw =
    transfer.rawValue;

  for (
    const deposit of deposits
  ) {
    if (
      normalizeAddress(
        deposit.wallet_address
      ) !==
      normalizeAddress(
        RECEIVING_WALLET
      )
    ) {
      continue;
    }

    if (
      String(
        deposit.currency ||
          "USDT"
      ).toUpperCase() !==
      "USDT"
    ) {
      continue;
    }

    let expectedRaw: string;

    try {
      expectedRaw =
        usdtToRaw(
          deposit.amount
        );
    } catch {
      continue;
    }

    if (
      expectedRaw !==
      transferRaw
    ) {
      continue;
    }

    const createdAt =
      new Date(
        deposit.created_at
      ).getTime();

    if (
      !Number.isFinite(
        createdAt
      )
    ) {
      continue;
    }

    const expiresAt =
      deposit.expires_at
        ? new Date(
            deposit.expires_at
          ).getTime()
        : createdAt +
          10 * 60 * 1000;

    if (
      !Number.isFinite(
        expiresAt
      )
    ) {
      continue;
    }

    if (
      transferTime <
        createdAt ||
      transferTime >
        expiresAt
    ) {
      continue;
    }

    return deposit;
  }

  return null;
}

// ======================================================
// COMPROBAR SI TX YA ESTÁ REGISTRADA
// ======================================================

async function isAlreadyProcessed(
  txHash: string
): Promise<boolean> {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "store_wallet_deposits"
      )
      .select("id")
      .eq(
        "tx_hash",
        txHash.toLowerCase()
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      `ERROR COMPROBANDO TX EXISTENTE: ${error.message}`
    );
  }

  return !!data;
}

// ======================================================
// PROCESAR UNA TRANSFERENCIA
// ======================================================

async function processTransfer(
  transfer: Bep20Transfer,
  customerDeposits: CustomerDeposit[]
): Promise<ProcessedResult> {
  const txHash =
    transfer.hash.toLowerCase();

  try {
    // --------------------------------------------------
    // SEGURIDAD
    // --------------------------------------------------

    if (
      !transfer.successful
    ) {
      return {
        tx_hash:
          txHash,

        status:
          "ERROR",

        error:
          "TRANSFERENCIA FALLIDA",
      };
    }

    if (
      normalizeAddress(
        transfer.to
      ) !==
      normalizeAddress(
        RECEIVING_WALLET
      )
    ) {
      return {
        tx_hash:
          txHash,

        status:
          "ERROR",

        error:
          "DESTINO INCORRECTO",
      };
    }

    if (
      normalizeAddress(
        transfer.contractAddress
      ) !==
      normalizeAddress(
        USDT_CONTRACT
      )
    ) {
      return {
        tx_hash:
          txHash,

        status:
          "ERROR",

        error:
          "CONTRATO USDT INCORRECTO",
      };
    }

    if (
      transfer.confirmations <
      MIN_CONFIRMATIONS
    ) {
      return {
        tx_hash:
          txHash,

        status:
          "WAITING",

        amount:
          transfer.amount,
      };
    }

    // --------------------------------------------------
    // EVITAR DUPLICADOS
    // --------------------------------------------------

    if (
      await isAlreadyProcessed(
        txHash
      )
    ) {
      return {
        tx_hash:
          txHash,

        status:
          "ALREADY_PROCESSED",

        amount:
          transfer.amount,
      };
    }

    // --------------------------------------------------
    // BUSCAR SI PERTENECE A CLIENTE
    // --------------------------------------------------

    const customerDeposit =
      findCustomerDeposit(
        transfer,
        customerDeposits
      );

    // --------------------------------------------------
    // LLAMAR FUNCIÓN ATÓMICA
    // --------------------------------------------------

    const {
      data,
      error,
    } =
      await supabaseAdmin.rpc(
        "process_store_wallet_transfer",
        {
          p_network:
            "BEP20",

          p_token:
            "USDT",

          p_wallet_address:
            RECEIVING_WALLET,

          p_amount:
            transfer.amount,

          p_tx_hash:
            txHash,

          p_block_number:
            transfer.blockNumber,

          p_from_address:
            transfer.from,

          p_to_address:
            transfer.to,

          p_confirmations:
            transfer.confirmations,

          p_customer_deposit_id:
            customerDeposit?.id ??
            null,
        }
      );

    if (error) {
      throw new Error(
        error.message
      );
    }

    const result =
      data as {
        ok?: boolean;
        already_processed?: boolean;
        customer_credited?: boolean;
        recharge_created?: boolean;
        recharge_id?: string | null;
        customer_deposit_id?: string | null;
      };

    return {
      tx_hash:
        txHash,

      amount:
        transfer.amount,

      status:
        result?.already_processed
          ? "ALREADY_PROCESSED"
          : "PROCESSED",

      customer_deposit_id:
        result
          ?.customer_deposit_id ??
        customerDeposit?.id ??
        null,

      customer_credited:
        Boolean(
          result?.customer_credited
        ),

      recharge_created:
        Boolean(
          result?.recharge_created
        ),

      recharge_id:
        result?.recharge_id ??
        null,
    };

  } catch (error) {
    console.error(
      `ERROR PROCESANDO ${txHash}:`,
      error
    );

    return {
      tx_hash:
        txHash,

      amount:
        transfer.amount,

      status:
        "ERROR",

      error:
        error instanceof Error
          ? error.message
          : "ERROR PROCESANDO TRANSFERENCIA",
    };
  }
}

// ======================================================
// AUTORIZACIÓN CRON
// ======================================================

function isAuthorized(
  request: NextRequest
): boolean {
  if (!CRON_SECRET) {
    console.error(
      "CRON_SECRET NO CONFIGURADO"
    );

    return false;
  }

  const authorization =
    request.headers.get(
      "authorization"
    );

  if (!authorization) {
    return false;
  }

  const [
    scheme,
    token,
  ] =
    authorization.split(" ");

  if (
    scheme !==
    "Bearer"
  ) {
    return false;
  }

  return token ===
    CRON_SECRET;
}

// ======================================================
// GET
// ======================================================

export async function GET(
  request: NextRequest
) {
  try {
    // ==================================================
    // AUTORIZACIÓN
    // ==================================================

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

    // ==================================================
    // CONFIGURACIÓN
    // ==================================================

    if (
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_ROLE_KEY
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "FALTAN VARIABLES DE SUPABASE",
        },
        {
          status: 500,
        }
      );
    }

    if (
      !ANKR_API_KEY
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "FALTA ANKR_API_KEY",
        },
        {
          status: 500,
        }
      );
    }

    // ==================================================
    // OBTENER DEPÓSITOS DE CLIENTES
    // ==================================================

    const customerDeposits =
      await getPendingCustomerDeposits();

    // ==================================================
    // BUSCAR TODAS LAS TRANSFERENCIAS USDT
    // ==================================================

    const transfers =
      await getBep20Transfers();

    // ==================================================
    // PROCESAR
    // ==================================================

    const results:
      ProcessedResult[] = [];

    for (
      const transfer of transfers
    ) {
      const result =
        await processTransfer(
          transfer,
          customerDeposits
        );

      results.push(
        result
      );
    }

    // ==================================================
    // ESTADÍSTICAS
    // ==================================================

    const processed =
      results.filter(
        (item) =>
          item.status ===
          "PROCESSED"
      ).length;

    const alreadyProcessed =
      results.filter(
        (item) =>
          item.status ===
          "ALREADY_PROCESSED"
      ).length;

    const errors =
      results.filter(
        (item) =>
          item.status ===
          "ERROR"
      ).length;

    const customerCredits =
      results.filter(
        (item) =>
          item.customer_credited ===
          true
      ).length;

    const rechargesCreated =
      results.filter(
        (item) =>
          item.recharge_created ===
          true
      ).length;

    // ==================================================
    // RESPUESTA
    // ==================================================

    return NextResponse.json({
      ok: true,

      wallet:
        RECEIVING_WALLET,

      network:
        "BEP20",

      token:
        "USDT",

      confirmations_required:
        MIN_CONFIRMATIONS,

      block_lookback:
        BLOCK_LOOKBACK,

      transfers_found:
        transfers.length,

      processed,

      already_processed:
        alreadyProcessed,

      customer_credits:
        customerCredits,

      recharges_created:
        rechargesCreated,

      errors,

      results,
    });

  } catch (error) {
    console.error(
      "CHECK STORE WALLET ERROR:",
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
