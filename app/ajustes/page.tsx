
import { NextRequest, NextResponse } from "next/server";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { success: false, error: message },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

function encryptionKey(): Buffer {
  const secret = process.env.API_KEY_ENCRYPTION_SECRET || "";

  if (!/^[a-fA-F0-9]{64}$/.test(secret)) {
    throw new Error(
      "API_KEY_ENCRYPTION_SECRET debe contener 64 caracteres hexadecimales."
    );
  }

  return Buffer.from(secret, "hex");
}

function encryptApiKey(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);

  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("hex"),
    tag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

function decryptApiKey(value: string): string {
  const [version, ivHex, tagHex, encryptedHex] = value.split(":");

  if (
    version !== "v1" ||
    !ivHex ||
    !tagHex ||
    !encryptedHex
  ) {
    throw new Error("Formato de clave cifrada no válido.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivHex, "hex")
  );

  decipher.setAuthTag(Buffer.from(tagHex, "hex"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}

function generateApiKey(): string {
  return "sg_live_" + randomBytes(32).toString("hex");
}

function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

async function authenticate(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return { user: null, response: errorResponse("Debes iniciar sesión.", 401) };
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    return { user: null, response: errorResponse("Sesión no válida.", 401) };
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return {
      user: null,
      response: errorResponse("La sesión ha caducado. Inicia sesión nuevamente.", 401),
    };
  }

  return { user, response: null };
}

function json(data: Record<string, unknown>, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store, private" },
  });
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!auth.user) return auth.response!;

    const { data, error } = await supabaseAdmin
      .from("api_partners")
      .select("id, active, created_at, api_key_encrypted")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (error) {
      console.error("Error consultando API:", error.message);
      return errorResponse("No se pudo consultar tu API.", 500);
    }

    if (!data) {
      return json({
        success: true,
        hasKey: false,
        active: null,
        createdAt: null,
      });
    }

    if (!data.api_key_encrypted) {
      return json({
        success: true,
        hasKey: true,
        needsRecovery: true,
        active: data.active,
        createdAt: data.created_at,
        message:
          "La clave anterior no se puede recuperar. Debes generar una nueva.",
      });
    }

    let apiKey: string;

    try {
      apiKey = decryptApiKey(data.api_key_encrypted);
    } catch (error) {
      console.error("Error descifrando clave API:", error);
      return errorResponse(
        "No se pudo descifrar la clave. Comprueba la variable de cifrado.",
        500
      );
    }

    return json({
      success: true,
      hasKey: true,
      needsRecovery: false,
      active: data.active,
      createdAt: data.created_at,
      apiKey,
    });
  } catch (error) {
    console.error("Error GET API:", error);
    return errorResponse("Ocurrió un error inesperado.", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!auth.user) return auth.response!;

    const { data: existing, error: searchError } =
      await supabaseAdmin
        .from("api_partners")
        .select("id, active, created_at, api_key_encrypted")
        .eq("user_id", auth.user.id)
        .maybeSingle();

    if (searchError) {
      console.error("Error buscando API:", searchError.message);
      return errorResponse("No se pudo consultar tu API.", 500);
    }

    if (existing) {
      return json({
        success: true,
        created: false,
        hasKey: true,
        needsRecovery: !existing.api_key_encrypted,
        active: existing.active,
        createdAt: existing.created_at,
      });
    }

    const apiKey = generateApiKey();
    const apiKeyHash = hashApiKey(apiKey);
    const encrypted = encryptApiKey(apiKey);

    const { data: created, error } = await supabaseAdmin
      .from("api_partners")
      .insert({
        user_id: auth.user.id,
        name: auth.user.email?.trim().toLowerCase() ||
          `usuario-${auth.user.id}`,
        api_key_hash: apiKeyHash,
        api_key_encrypted: encrypted,
        active: true,
      })
      .select("id, active, created_at")
      .single();

    if (error || !created) {
      if (error?.code === "23505") {
        return json({
          success: false,
          error: "Ya existe una API para esta cuenta. Actualiza la pantalla.",
        }, 409);
      }

      console.error("Error creando API:", error?.message);
      return errorResponse("No se pudo crear la clave API.", 500);
    }

    return json({
      success: true,
      created: true,
      hasKey: true,
      needsRecovery: false,
      active: created.active,
      createdAt: created.created_at,
      apiKey,
    });
  } catch (error) {
    console.error("Error POST API:", error);
    return errorResponse("Ocurrió un error inesperado.", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!auth.user) return auth.response!;

    const { data: existing, error: searchError } =
      await supabaseAdmin
        .from("api_partners")
        .select("id")
        .eq("user_id", auth.user.id)
        .maybeSingle();

    if (searchError) {
      console.error("Error buscando API:", searchError.message);
      return errorResponse("No se pudo consultar tu API.", 500);
    }

    if (!existing) {
      return errorResponse("Primero debes crear tu clave API.", 404);
    }

    // La clave anterior dejará de funcionar después de esta operación.
    const apiKey = generateApiKey();

    const { data: updated, error } = await supabaseAdmin
      .from("api_partners")
      .update({
        api_key_hash: hashApiKey(apiKey),
        api_key_encrypted: encryptApiKey(apiKey),
        active: true,
      })
      .eq("id", existing.id)
      .eq("user_id", auth.user.id)
      .select("id, active, created_at")
      .single();

    if (error || !updated) {
      console.error("Error renovando API:", error?.message);
      return errorResponse("No se pudo generar la nueva clave.", 500);
    }

    return json({
      success: true,
      created: false,
      rotated: true,
      hasKey: true,
      active: updated.active,
      createdAt: updated.created_at,
      apiKey,
      message: "Clave renovada correctamente.",
    });
  } catch (error) {
    console.error("Error PATCH API:", error);
    return errorResponse("Ocurrió un error inesperado.", 500);
  }
}
