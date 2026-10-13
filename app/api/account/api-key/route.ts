import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(
  message: string,
  status: number
) {
  return NextResponse.json(
    { success: false, error: message },
    { status }
  );
}

export async function POST(request: NextRequest) {
  try {
    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return errorResponse(
        "Debes iniciar sesión para administrar tu API.",
        401
      );
    }

    const accessToken = authorization
      .slice(7)
      .trim();

    if (!accessToken) {
      return errorResponse(
        "Token de sesión no válido.",
        401
      );
    }

    // Validar la sesión directamente con Supabase Auth.
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (authError || !user) {
      return errorResponse(
        "La sesión ha caducado. Inicia sesión nuevamente.",
        401
      );
    }

    // Buscar una clave asociada a esta cuenta.
    const { data: existing, error: searchError } =
      await supabaseAdmin
        .from("api_partners")
        .select("id, active, created_at")
        .eq("user_id", user.id)
        .maybeSingle();

    if (searchError) {
      console.error(
        "Error buscando la API del usuario:",
        searchError.message
      );

      return errorResponse(
        "No se pudo consultar tu API.",
        500
      );
    }

    // Si ya tiene API, no devolver ni regenerar su clave.
    if (existing) {
      return NextResponse.json({
        success: true,
        created: false,
        hasKey: true,
        active: existing.active,
        createdAt: existing.created_at,
        message: "Tu cuenta ya tiene una API.",
      });
    }

    // Generar una clave aleatoria segura.
    const apiKey =
      "sg_live_" + randomBytes(32).toString("hex");

    // Guardar únicamente el hash, nunca la clave original.
    const apiKeyHash = createHash("sha256")
      .update(apiKey)
      .digest("hex");

    const name =
      user.email?.trim().toLowerCase() ||
      `usuario-${user.id}`;

    const { data: created, error: insertError } =
      await supabaseAdmin
        .from("api_partners")
        .insert({
          user_id: user.id,
          name,
          api_key_hash: apiKeyHash,
          active: true,
        })
        .select("id, active, created_at")
        .single();

    if (insertError || !created) {
      // Si otra petición creó la clave al mismo tiempo,
      // no crear una segunda clave para la misma cuenta.
      if (insertError?.code === "23505") {
        const { data: concurrentKey } =
          await supabaseAdmin
            .from("api_partners")
            .select("id, active, created_at")
            .eq("user_id", user.id)
            .maybeSingle();

        if (concurrentKey) {
          return NextResponse.json({
            success: true,
            created: false,
            hasKey: true,
            active: concurrentKey.active,
            createdAt: concurrentKey.created_at,
            message: "Tu cuenta ya tiene una API.",
          });
        }
      }

      console.error(
        "Error creando la API:",
        insertError?.message
      );

      return errorResponse(
        "No se pudo crear tu clave API.",
        500
      );
    }

    // La clave original se entrega solo en esta respuesta.
    return NextResponse.json({
      success: true,
      created: true,
      hasKey: true,
      active: created.active,
      createdAt: created.created_at,
      apiKey,
      message:
        "API creada. Guarda la clave en un lugar seguro.",
    });
  } catch (error) {
    console.error("Error inesperado en la API:", error);

    return errorResponse(
      "Ocurrió un error inesperado.",
      500
    );
  }
}
