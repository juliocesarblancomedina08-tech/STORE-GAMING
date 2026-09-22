"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Message = {
  id: number;
  sender: "ai" | "user";
  text: string;
};

export default function SupportPage() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: "ai",
      text:
        "Hola 👋 Soy el asistente de soporte de 🛒STORE GAMING🎮. ¿En qué puedo ayudarte?",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAdminButton, setShowAdminButton] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [ticketCreated, setTicketCreated] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  function addMessage(sender: "ai" | "user", text: string) {
    setMessages((current) => [
      ...current,
      {
        id: Date.now() + Math.random(),
        sender,
        text,
      },
    ]);
  }

  async function sendMessage() {
    const text = input.trim();

    if (!text || loading || ticketCreated) {
      return;
    }

    setInput("");

    addMessage("user", text);
    setLoading(true);

    try {
      /*
       * Esta API la crearemos en el siguiente paso:
       *
       * /api/support/chat
       *
       * Recibirá toda la conversación y devolverá
       * la respuesta de la IA.
       */
      const response = await fetch("/api/support/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            ...messages.map((message) => ({
              role: message.sender === "ai" ? "assistant" : "user",
              content: message.text,
            })),
            {
              role: "user",
              content: text,
            },
          ],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "No se pudo obtener una respuesta."
        );
      }

      const answer =
        typeof data?.answer === "string"
          ? data.answer
          : typeof data?.message === "string"
          ? data.message
          : "No pude procesar tu consulta en este momento.";

      addMessage("ai", answer);

      /*
       * La API podrá indicar cuando la IA no pudo resolver
       * correctamente el problema.
       */
      if (
        data?.needsAdmin === true ||
        data?.showAdminButton === true
      ) {
        setShowAdminButton(true);
      }
    } catch (error) {
      console.error("ERROR SOPORTE:", error);

      addMessage(
        "ai",
        "No pude resolver tu consulta en este momento. Si necesitas ayuda con tu problema, puedes solicitar atención del administrador."
      );

      setShowAdminButton(true);
    } finally {
      setLoading(false);
    }
  }

  async function callAdministrator() {
    if (creatingTicket || ticketCreated) {
      return;
    }

    setCreatingTicket(true);

    try {
      /*
       * Esta API será creada después:
       *
       * /api/support/ticket
       *
       * Guardará el ticket en Supabase y enviará
       * la notificación al administrador.
       */
      const response = await fetch("/api/support/ticket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "No se pudo crear la solicitud."
        );
      }

      setTicketCreated(true);

      addMessage(
        "ai",
        "✅ Tu solicitud fue enviada al administrador. Hemos registrado esta conversación para que pueda revisar tu problema y ayudarte."
      );
    } catch (error) {
      console.error("ERROR CREANDO TICKET:", error);

      addMessage(
        "ai",
        "❌ No se pudo enviar la solicitud al administrador. Inténtalo nuevamente en unos segundos."
      );
    } finally {
      setCreatingTicket(false);
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  return (
    <main className="support-page">
      <div className="support-background" />

      <header className="support-header">
        <button
          type="button"
          className="support-back-button"
          onClick={() => router.push("/home")}
          aria-label="Regresar"
        >
          ←
        </button>

        <div className="support-header-title">
          <div className="support-header-icon">🤖</div>

          <div>
            <h1>ASISTENTE DE SOPORTE</h1>
            <span>
              <span className="support-online-dot" />
              EN LÍNEA
            </span>
          </div>
        </div>
      </header>

      <section className="support-chat-wrapper">
        <div className="support-chat-card">
          <div className="support-chat-top">
            <div className="support-ai-avatar">🤖</div>

            <div className="support-ai-info">
              <strong>STORE GAMING</strong>
              <span>Asistente de soporte IA</span>
            </div>

            <div className="support-status">
              <span />
              ONLINE
            </div>
          </div>

          <div className="support-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.sender === "ai"
                    ? "support-message support-message-ai"
                    : "support-message support-message-user"
                }
              >
                {message.sender === "ai" && (
                  <div className="support-message-avatar">🤖</div>
                )}

                <div className="support-message-content">
                  <div className="support-message-name">
                    {message.sender === "ai"
                      ? "STORE GAMING IA"
                      : "TÚ"}
                  </div>

                  <div className="support-message-bubble">
                    {message.text}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="support-message support-message-ai">
                <div className="support-message-avatar">🤖</div>

                <div className="support-message-content">
                  <div className="support-message-name">
                    STORE GAMING IA
                  </div>

                  <div className="support-message-bubble support-typing">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {showAdminButton && !ticketCreated && (
            <div className="support-admin-section">
              <div className="support-admin-warning">
                <span className="support-admin-warning-icon">
                  👨‍💻
                </span>

                <div>
                  <strong>¿Necesitas más ayuda?</strong>

                  <p>
                    Si la respuesta de la IA no resolvió tu
                    problema, puedes solicitar atención del
                    administrador.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="support-admin-button"
                onClick={callAdministrator}
                disabled={creatingTicket}
              >
                {creatingTicket ? (
                  <>
                    <span className="support-button-spinner" />
                    ENVIANDO SOLICITUD...
                  </>
                ) : (
                  <>
                    👨‍💻 LLAMAR AL ADMINISTRADOR
                  </>
                )}
              </button>
            </div>
          )}

          {ticketCreated && (
            <div className="support-ticket-created">
              <div className="support-ticket-check">✓</div>

              <div>
                <strong>SOLICITUD ENVIADA</strong>

                <p>
                  El administrador ha recibido tu solicitud de
                  soporte.
                </p>
              </div>
            </div>
          )}

          <div className="support-input-area">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu pregunta..."
              rows={1}
              disabled={loading || ticketCreated}
            />

            <button
              type="button"
              className="support-send-button"
              onClick={sendMessage}
              disabled={
                !input.trim() ||
                loading ||
                ticketCreated
              }
              aria-label="Enviar mensaje"
            >
              ➤
            </button>
          </div>

          <div className="support-input-hint">
            Presiona ENTER para enviar
          </div>
        </div>

        <div className="support-help-card">
          <div className="support-help-title">
            <span>💡</span>
            <strong>¿QUÉ PUEDES PREGUNTAR?</strong>
          </div>

          <div className="support-help-options">
            <button
              type="button"
              onClick={() => {
                setInput("¿Dónde puedo ver mis pedidos?");
              }}
            >
              📦 Mis pedidos
            </button>

            <button
              type="button"
              onClick={() => {
                setInput("¿Cómo puedo depositar saldo?");
              }}
            >
              💰 Depósitos
            </button>

            <button
              type="button"
              onClick={() => {
                setInput("¿Cómo funciona una recarga?");
              }}
            >
              🎮 Recargas
            </button>

            <button
              type="button"
              onClick={() => {
                setInput("Tengo un problema con mi compra");
              }}
            >
              🛒 Problema con una compra
            </button>
          </div>
        </div>
      </section>

      <div className="support-footer">
        <button
          type="button"
          onClick={() => router.push("/home")}
        >
          ← REGRESAR A STORE GAMING
        </button>
      </div>
    </main>
  );
                    }
