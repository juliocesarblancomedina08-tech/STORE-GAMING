
"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const BUCKET = "profile-avatars";

export default function EditProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !sessionData.session?.user) {
        router.replace("/");
        return;
      }

      const user = sessionData.session.user;

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("username, avatar_url, email")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;

      if (profileError) {
        setError("No se pudo cargar tu perfil.");
      }

      const fallbackUsername =
        user.user_metadata?.username ||
        user.email?.split("@")[0] ||
        "usuario";

      setUserId(user.id);
      setEmail(user.email || data?.email || "");
      setUsername(data?.username?.trim() || fallbackUsername);
      setAvatarUrl(data?.avatar_url || "");
      setLoading(false);
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (!selectedFile) {
      setPreview("");
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setError("");
    setSuccess("");

    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Selecciona una imagen JPG, PNG o WEBP.");
      event.target.value = "";
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setError("La imagen no puede superar los 3 MB.");
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  }

  async function saveProfile() {
    setError("");
    setSuccess("");

    const cleanUsername = username.trim();

    if (cleanUsername.length < 3 || cleanUsername.length > 20) {
      setError("El nombre debe tener entre 3 y 20 caracteres.");
      return;
    }

    if (!/^[a-zA-Z0-9_.]+$/.test(cleanUsername)) {
      setError(
        "Usa solamente letras, números, puntos y guiones bajos."
      );
      return;
    }

    if (!userId) {
      setError("No se encontró tu sesión. Vuelve a iniciar sesión.");
      return;
    }

    setSaving(true);

    try {
      let newAvatarUrl = avatarUrl;

      if (selectedFile) {
        const extension = selectedFile.type === "image/png"
          ? "png"
          : selectedFile.type === "image/webp"
            ? "webp"
            : "jpg";

        const filePath = `${userId}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(filePath, selectedFile, {
            cacheControl: "3600",
            contentType: selectedFile.type,
            upsert: false,
          });

        if (uploadError) {
          throw new Error("No se pudo subir la foto. Inténtalo nuevamente.");
        }

        const { data: publicData } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(filePath);

        newAvatarUrl = publicData.publicUrl;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          username: cleanUsername,
          avatar_url: newAvatarUrl || null,
        })
        .eq("id", userId);

      if (updateError) {
        if (updateError.code === "23505") {
          throw new Error("Ese nombre de usuario ya está ocupado.");
        }

        throw new Error("No se pudieron guardar los cambios.");
      }

      setUsername(cleanUsername);
      setAvatarUrl(newAvatarUrl);
      setSelectedFile(null);
      setSuccess("¡Tu perfil se actualizó correctamente!");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al guardar el perfil."
      );
    } finally {
      setSaving(false);
    }
  }

  const displayedImage = preview || avatarUrl;

  if (loading) {
    return (
      <main className="edit-loading">
        <div className="loading-logo">STORE GAMING</div>
        <p>CARGANDO PERFIL...</p>
        <style jsx>{`
          .edit-loading {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #080808;
            color: white;
            font-family: Arial, sans-serif;
          }
          .loading-logo {
            color: #ff303b;
            font-size: 25px;
            font-weight: 900;
            letter-spacing: 2px;
          }
          p {
            color: #999;
            font-size: 11px;
            letter-spacing: 2px;
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="edit-page">
      <div className="edit-container">
        <button
          className="back-button"
          onClick={() => router.push("/profile")}
        >
          ← VOLVER AL PERFIL
        </button>

        <header className="page-header">
          <span className="eyebrow">STORE GAMING / CUENTA</span>
          <h1>EDITAR PERFIL</h1>
          <p>Personaliza la información de tu cuenta.</p>
        </header>

        <section className="edit-card">
          <div className="photo-section">
            <div className="avatar-wrapper">
              {displayedImage ? (
                <img
                  src={displayedImage}
                  alt="Foto de perfil"
                  className="avatar"
                />
              ) : (
                <div className="avatar-placeholder">
                  {username.charAt(0).toUpperCase() || "@"}
                </div>
              )}
            </div>

            <div className="photo-info">
              <strong>FOTO DE PERFIL</strong>
              <span>JPG, PNG o WEBP · Máximo 3 MB</span>

              <button
                className="photo-button"
                onClick={() => fileInputRef.current?.click()}
              >
                CAMBIAR FOTO
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                hidden
              />
            </div>
          </div>

          <div className="field">
            <label>NOMBRE DE USUARIO</label>
            <input
              type="text"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                setError("");
                setSuccess("");
              }}
              placeholder="Tu nombre de usuario"
              maxLength={20}
            />
            <small>Entre 3 y 20 caracteres.</small>
          </div>

          <div className="field">
            <label>CORREO ELECTRÓNICO</label>
            <input
              type="email"
              value={email}
              readOnly
              className="readonly"
            />
            <small>El correo de tu cuenta no se modifica desde aquí.</small>
          </div>

          {error && <div className="message error">{error}</div>}
          {success && <div className="message success">{success}</div>}

          <button
            className="save-button"
            onClick={saveProfile}
            disabled={saving}
          >
            {saving ? "GUARDANDO CAMBIOS..." : "GUARDAR CAMBIOS"}
          </button>
        </section>

        <p className="footer-text">
          STORE GAMING · TU CUENTA, TU ESPACIO.
        </p>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .edit-page {
          min-height: 100vh;
          padding: 35px 16px 45px;
          background:
            radial-gradient(ellipse at 50% 0%, #301013 0%, transparent 48%),
            #080808;
          color: #fff;
          font-family: Arial, sans-serif;
        }

        .edit-container {
          width: 100%;
          max-width: 620px;
          margin: 0 auto;
        }

        .back-button {
          border: 1px solid #292929;
          background: #111;
          color: #ddd;
          border-radius: 9px;
          padding: 11px 14px;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .page-header {
          margin: 35px 0 22px;
        }

        .eyebrow {
          color: #ff414b;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        h1 {
          margin: 9px 0 6px;
          font-size: clamp(25px, 6vw, 34px);
          font-weight: 950;
          letter-spacing: -1px;
        }

        .page-header p {
          margin: 0;
          color: #929292;
          font-size: 13px;
        }

        .edit-card {
          padding: 23px;
          background: linear-gradient(145deg, #171717, #101010);
          border: 1px solid #303030;
          border-radius: 15px;
          box-shadow: 0 15px 45px #0006;
        }

        .photo-section {
          display: flex;
          align-items: center;
          gap: 17px;
          padding-bottom: 23px;
          margin-bottom: 23px;
          border-bottom: 1px solid #292929;
        }

        .avatar-wrapper {
          width: 86px;
          height: 86px;
          flex-shrink: 0;
          border-radius: 50%;
          overflow: hidden;
          border: 3px solid #ff3541;
          background: #242424;
        }

        .avatar {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-placeholder {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          background: #281113;
          color: #ff4650;
          font-size: 32px;
          font-weight: 900;
        }

        .photo-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
        }

        .photo-info strong,
        .field label {
          color: #eee;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .photo-info span,
        .field small {
          color: #858585;
          font-size: 10px;
        }

        .photo-button {
          margin-top: 5px;
          padding: 9px 12px;
          border: 1px solid #9e252d;
          border-radius: 7px;
          background: #291013;
          color: #ff646c;
          font-size: 10px;
          font-weight: 900;
          cursor: pointer;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 9px;
          margin-bottom: 20px;
        }

        .field input {
          width: 100%;
          height: 45px;
          padding: 0 13px;
          border: 1px solid #353535;
          border-radius: 8px;
          outline: none;
          background: #090909;
          color: #fff;
          font-size: 13px;
        }

        .field input:focus {
          border-color: #ff3945;
        }

        .field input.readonly {
          color: #858585;
          background: #141414;
          cursor: not-allowed;
        }

        .message {
          padding: 12px;
          margin-bottom: 15px;
          border-radius: 8px;
          font-size: 12px;
          line-height: 1.5;
        }

        .error {
          color: #ff9298;
          background: #351216;
          border: 1px solid #76242b;
        }

        .success {
          color: #8ce5ad;
          background: #10291a;
          border: 1px solid #245b37;
        }

        .save-button {
          width: 100%;
          min-height: 47px;
          border: none;
          border-radius: 8px;
          background: linear-gradient(100deg, #d91f2c, #ff414b);
          color: #fff;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: 1px;
          cursor: pointer;
        }

        .save-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .footer-text {
          margin-top: 22px;
          color: #555;
          font-size: 9px;
          text-align: center;
          letter-spacing: 2px;
        }

        @media (max-width: 480px) {
          .edit-card {
            padding: 17px;
          }

          .avatar-wrapper {
            width: 72px;
            height: 72px;
          }
        }
      `}</style>
    </main>
  );
}
