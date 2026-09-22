"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type SupportView = "closed" | "form" | "chat";

type ChatMessage = {
  id: number;
  sender: "ai" | "user";
  text: string;
};

const SUPPORT_CATEGORIES = [
  "Depósito/pago no acreditado",
  "Pedido atascado / tarda demasiado",
  "Artículo/código no recibido o incompleto",
  "El código/llave/tarjeta no funciona o está en uso",
  "Suscripción y planes",
  "API e integración",
  "Disponibilidad/solicitud del producto",
  "Otro/pregunta",
];

export default function SupportPage() {
  const router = useRouter();

  const [supportView, setSupportView] =
    useState<SupportView>("closed");

  const [category, setCategory] = useState(
    SUPPORT_CATEGORIES[0]
  );

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [chatMessages, setChatMessages] =
    useState<ChatMessage[]>([]);

  const [chatInput, setChatInput] = useState("");

  const [loading, setLoading] = useState(false);
  const [ticketLoading, setTicketLoading] =
    useState(false);

  const [showAdminButton, setShowAdminButton] =
    useState(false);

  const [ticketCreated, setTicketCreated] =
    useState(false);

  const [error, setError] = useState("");

  async function sendToSupportAI(
    messages: ChatMessage[]
  ) {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/support/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            category,
            subject,
            messages,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "No se pudo conectar con soporte."
        );
      }

      const aiText =
        typeof data?.answer === "string"
          ? data.answer
          : "No pude procesar tu solicitud.";

      const aiMessage: ChatMessage = {
        id: Date.now() + 1,
        sender: "ai",
        text: aiText,
      };

      setChatMessages((previous) => [
        ...previous,
        aiMessage,
      ]);

      if (
        data?.needsAdmin === true ||
        data?.showAdminButton === true
      ) {
        setShowAdminButton(true);
      }
    } catch (err) {
      console.error(
        "ERROR SOPORTE IA:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al conectar con soporte."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateConversation(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!subject.trim()) {
      setError("Escribe un sujeto.");
      return;
    }

    if (!message.trim()) {
      setError("Escribe tu mensaje.");
      return;
    }

    setError("");

    const firstMessage: ChatMessage = {
      id: Date.now(),
      sender: "user",
      text: [
        `Categoría: ${category}`,
        `Sujeto: ${subject.trim()}`,
        "",
        message.trim(),
      ].join("\n"),
    };

    setChatMessages([firstMessage]);
    setSupportView("chat");

    await sendToSupportAI([firstMessage]);
  }

  async function handleSendChat(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const text = chatInput.trim();

    if (!text || loading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now(),
      sender: "user",
      text,
    };

    const updatedMessages = [
      ...chatMessages,
      userMessage,
    ];

    setChatMessages(updatedMessages);
    setChatInput("");

    await sendToSupportAI(updatedMessages);
  }

  async function handleCallAdministrator() {
    if (ticketLoading || ticketCreated) {
      return;
    }

    try {
      setTicketLoading(true);
      setError("");

      const response = await fetch(
        "/api/support/ticket",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            category,
            subject,
            messages: chatMessages,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "No se pudo crear la solicitud."
        );
      }

      setTicketCreated(true);
    } catch (err) {
      console.error(
        "ERROR CREANDO TICKET:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo crear la solicitud."
      );
    } finally {
      setTicketLoading(false);
    }
  }

  function closeSupport() {
    if (loading || ticketLoading) {
      return;
    }

    setSupportView("closed");
    setError("");
  }

  function openSupportForm() {
    setError("");
    setSupportView("form");
  }

  function goBackToForm() {
    if (loading || ticketLoading) {
      return;
    }

    setSupportView("form");
    setChatMessages([]);
    setShowAdminButton(false);
    setTicketCreated(false);
    setError("");
  }

  return (
    <main className="support-page">
      <div className="support-page-background" />

      <section className="support-content">
        <div className="support-header">
          <button
            type="button"
            className="support-back-button"
            onClick={() => router.back()}
          >
            ←
          </button>

          <div className="support-header-title">
            <span>🛠️</span>
            <h1>Soporte</h1>
          </div>
        </div>

        <div className="support-main-card">
          <div className="support-main-icon">
            🎧
          </div>

          <h2>
            ¿Necesitas ayuda?
          </h2>

          <p>
            Nuestro asistente puede ayudarte con
            tus dudas sobre STORE GAMING.
          </p>

          <button
            type="button"
            className="support-main-button"
            onClick={openSupportForm}
          >
            📩 Crear nueva consulta
          </button>
        </div>
      </section>

      {supportView === "closed" && (
        <button
          type="button"
          className="support-floating-button"
          onClick={openSupportForm}
          aria-label="Crear nueva consulta"
        >
          📩
        </button>
      )}

      {supportView === "form" && (
        <div className="support-sheet-overlay">
          <div className="support-sheet">
            <div className="support-sheet-handle" />

            <div className="support-sheet-header">
              <div>
                <span className="support-sheet-icon">
                  📩
                </span>

                <div>
                  <h2>
                    Crear nueva consulta
                  </h2>

                  <p>
                    Cuéntanos cuál es tu problema.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="support-close-button"
                onClick={closeSupport}
              >
                ✕
              </button>
            </div>

            <form
              className="support-form"
              onSubmit={handleCreateConversation}
            >
              <label
                className="support-field"
              >
                <span>
                  Categoría
                </span>

                <select
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value)
                  }
                >
                  {SUPPORT_CATEGORIES.map(
                    (item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label
                className="support-field"
              >
                <span>
                  Sujeto
                </span>

                <input
                  type="text"
                  value={subject}
                  onChange={(event) =>
                    setSubject(event.target.value)
                  }
                  placeholder="Escribe el asunto"
                  maxLength={120}
                />
              </label>

              <label
                className="support-field"
              >
                <span>
                  Mensaje
                </span>

                <textarea
                  value={message}
                  onChange={(event) =>
                    setMessage(event.target.value)
                  }
                  placeholder="Describe tu problema..."
                  rows={6}
                />
              </label>

              {error && (
                <div className="support-error">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="support-submit-button"
              >
                Enviar
              </button>
            </form>
          </div>
        </div>
      )}

      {supportView === "chat" && (
        <div className="support-chat-container">
          <div className="support-chat-header">
            <button
              type="button"
              className="support-chat-back"
              onClick={goBackToForm}
              disabled={
                loading || ticketLoading
              }
            >
              ←
            </button>

            <div>
              <h2>
                Soporte STORE GAMING
              </h2>

              <p>
                Asistente de soporte
              </p>
            </div>

            <button
              type="button"
              className="support-chat-close"
              onClick={closeSupport}
              disabled={
                loading || ticketLoading
              }
            >
              ✕
            </button>
          </div>

          <div className="support-chat-info">
            <span>📂</span>

            <div>
              <strong>
                {category}
              </strong>

              <small>
                {subject}
              </small>
            </div>
          </div>

          <div className="support-chat-messages">
            {chatMessages.map((chatMessage) => (
              <div
                key={chatMessage.id}
                className={
                  chatMessage.sender === "user"
                    ? "support-message support-message-user"
                    : "support-message support-message-ai"
                }
              >
                <div className="support-message-label">
                  {chatMessage.sender === "user"
                    ? "Tú"
                    : "🤖 Soporte"}
                </div>

                <div className="support-message-text">
                  {chatMessage.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="support-message support-message-ai">
                <div className="support-message-label">
                  🤖 Soporte
                </div>

                <div className="support-typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}

            {error && (
              <div className="support-error support-chat-error">
                {error}
              </div>
            )}

            {showAdminButton &&
              !ticketCreated && (
                <div className="support-admin-box">
                  <div className="support-admin-icon">
                    👨‍💻
                  </div>

                  <div className="support-admin-content">
                    <strong>
                      ¿Necesitas atención humana?
                    </strong>

                    <p>
                      Si el asistente no pudo
                      solucionar tu problema,
                      puedes enviar la conversación
                      al administrador.
                    </p>

                    <button
                      type="button"
                      className="support-admin-button"
                      onClick={
                        handleCallAdministrator
                      }
                      disabled={ticketLoading}
                    >
                      {ticketLoading
                        ? "Enviando..."
                        : "👨‍💻 LLAMAR AL ADMINISTRADOR"}
                    </button>
                  </div>
                </div>
              )}

            {ticketCreated && (
              <div className="support-ticket-success">
                <div className="support-success-icon">
                  ✓
                </div>

                <strong>
                  Solicitud enviada
                </strong>

                <p>
                  Tu consulta fue enviada al
                  administrador. Te responderemos
                  lo antes posible.
                </p>
              </div>
            )}
          </div>

          {!ticketCreated && (
            <form
              className="support-chat-input-area"
              onSubmit={handleSendChat}
            >
              <input
                type="text"
                value={chatInput}
                onChange={(event) =>
                  setChatInput(event.target.value)
                }
                placeholder="Escribe tu mensaje..."
                disabled={loading}
              />

              <button
                type="submit"
                disabled={
                  loading ||
                  !chatInput.trim()
                }
                aria-label="Enviar mensaje"
              >
                ➤
              </button>
            </form>
          )}
        </div>
      )}
    </main>
  );
      }
