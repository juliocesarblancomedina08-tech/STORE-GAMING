import { supabaseAdmin } from "./supabase-admin";

const ADMIN_EMAIL =
  "juliocesarblancomedina08@gmail.com";

export async function isAdminUser(
  accessToken: string
): Promise<boolean> {
  try {
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(
      accessToken
    );

    if (error || !user?.email) {
      return false;
    }

    return (
      user.email.trim().toLowerCase() ===
      ADMIN_EMAIL.toLowerCase()
    );
  } catch {
    return false;
  }
}
