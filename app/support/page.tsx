"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type SupportCategory = {
  id: string;
  label: string;
  icon: string;
};

type ChatMessage = {
  id: number;
  sender: "ai" | "user";
  text: string;
};

const SUPPORT_CATEGORIES: SupportCategory[] = [
  {
    id: "deposit",
    label: "Depósito/pago no acreditado",
    icon: "💳",
  },
  {
    id: "order_delayed",
    label: "Pedido atascado / tarda demasiado",
    icon: "◷",
  },
  {
    id: "product_missing",
    label: "Artículo/código no recibido o incompleto",
    icon: "🛍",
  },
  {
    id: "code_not_working",
    label: "El código/llave/tarjeta no funciona o está en uso",
    icon: "▣",
  },
  {
    id: "subscription",
    label: "Suscripción y planes",
    icon: "▤",
  },
  {
    id: "api",
    label: "API e integración",
    icon: "ϟ",
  },
  {
    id: "product_availability",
    label: "Disponibilidad/solicitud del producto",
    icon: "🎁",
  },
  {
    id: "other",
    label: "Otro/pregunta",
    icon: "♧",
  },
];

export default function SupportPage() {
  const router = useRouter();

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [supportView, setSupportView] = useState<
    "closed" | "form" | "chat"
  >("closed");

  const [categoryOpen, setCategoryOpen] = useState(false);

  const [selectedCategory, setSelectedCategory] =
    useState<SupportCategory | null>(null);

  const [subject, setSubject] = useState("");

  const [message, setMessage] = useState("");

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [loading, setLoading] = useState(false);

  const [showAdminButton, setShowAdminButton] =
    useState(false);

  const [creatingTicket, setCreatingTicket] =
    useState(false);

  const [ticketCreated, setTicketCreated] =
    useState(false);

  useEffect(() => {
    if (supportView === "chat") {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [messages, loading, supportView]);

  function openSupportForm() {
    setSupportView("form");
    setCategoryOpen(false);
    setSelectedCategory(null);
    setSubject("");
    setMessage("");
    setMessages([]);
    setShowAdminButton(false);
    setTicketCreated(false);
  }

  function closeSupport() {
    if (loading || creatingTicket) {
      return;
    }

    setSupportView("closed");
    setCategoryOpen(false);
  }

  function selectCategory(category: SupportCategory) {
    setSelectedCategory(category);
    setCategoryOpen(false);
  }

  function addChatMessage(
    sender: "ai" | "user",
    text: string
  ) {
    setMessages((current) => [
      ...current,
      {
        id: Date.now() + Math.random(),
        sender,
        text,
      },
    ]);
  }

  async function sendInitialSupportRequest() {
    if (
      !selectedCategory ||
      !subject.trim() ||
      !message.trim() ||
      loading
    ) {
      return;
    }

    const currentSubject = subject.trim();
    const currentMessage = message.trim();
    const currentCategory = selectedCategory;

    setSupportView("chat");

    const userMessage =
      `📌 ${currentSubject}\n\n${currentMessage}`;

    const initialChatMessage: ChatMessage = {
      id: Date.now(),
      sender: "user",
      text: userMessage,
    };

    setMessages([initialChatMessage]);
    setMessage("");
    setLoading(true);

    try {
      const aiContext =
        `Categoría de soporte: ${currentCategory.label}\n` +
        `Sujeto: ${currentSubject}\n` +
        `Mensaje del cliente: ${currentMessage}`;

      const response = await fetch("/api/support/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: aiContext,
            },
          ],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "No se pudo obtener una respuesta."
        );
      }

      const answer =
        typeof data?.answer === "string"
          ? data.answer
          : typeof data?.message === "string"
          ? data.message
          : "No pude procesar tu consulta.";

      addChatMessage("ai", answer);

      if (
        data?.needsAdmin === true ||
        data?.showAdminButton === true
      ) {
        setShowAdminButton(true);
      }
    } catch (error) {
      console.error(
        "ERROR INICIANDO SOPORTE:",
        error
      );

      addChatMessage(
        "ai",
        "No pude procesar tu consulta en este momento. Si necesitas ayuda con este problema, puedes solicitar atención del administrador."
      );

      setShowAdminButton(true);
    } finally {
      setLoading(false);
    }
  }

  async function sendChatMessage() {
    const text = message.trim();

    if (!text || loading || ticketCreated) {
      return;
    }

    setMessage("");

    const updatedMessages = [
      ...messages,
      {
        id: Date.now(),
        sender: "user" as const,
        text,
      },
    ];

    setMessages(updatedMessages);
    setLoading(true);

    try {
      const response = await fetch("/api/support/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: updatedMessages.map((item) => ({
            role:
              item.sender === "ai"
                ? "assistant"
                : "user",
            content: item.text,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "No se pudo obtener una respuesta."
        );
      }

      const answer =
        typeof data?.answer === "string"
          ? data.answer
          : "No pude procesar tu consulta.";

      addChatMessage("ai", answer);

      if (
        data?.needsAdmin === true ||
        data?.showAdminButton === true
      ) {
        setShowAdminButton(true);
      }
    } catch (error) {
      console.error(
        "ERROR EN CHAT DE SOPORTE:",
        error
      );

      addChatMessage(
        "ai",
        "No pude responder en este momento. Puedes solicitar atención del administrador."
      );

      setShowAdminButton(true);
    } finally {
      setLoading(false);
    }
  }

  function handleChatKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      sendChatMessage();
    }
  }

  async function callAdministrator() {
    if (creatingTicket || ticketCreated) {
      return;
    }

    setCreatingTicket(true);

    try {
      const response = await fetch(
        "/api/support/ticket",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            category:
              selectedCategory?.label ||
              "Otro/pregunta",

            subject:
              subject.trim() ||
              "Solicitud de soporte",

            messages,
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

      addChatMessage(
        "ai",
        "✅ Tu solicitud fue enviada al administrador. Hemos registrado esta conversación para que pueda revisar tu problema y ayudarte."
      );
    } catch (error) {
      console.error(
        "ERROR CREANDO TICKET:",
        error
      );

      addChatMessage(
        "ai",
        "❌ No se pudo enviar la solicitud al administrador. Inténtalo nuevamente."
      );
    } finally {
      setCreatingTicket(false);
    }
  }

  /*
   * =====================================================
   * PÁGINA PRINCIPAL DE SOPORTE
   * =====================================================
   */

  if (supportView === "closed") {
    return (
      <main className="support-page">
        <button
          type="button"
          className="support-page-back-button"
          onClick={() => router.push("/home")}
          aria-label="Regresar"
        >
          ←
        </button>

        <section className="support-landing">
          <div className="support-landing-card">
            <div className="support-landing-icon">
              🎧
            </div>

            <h1>SOPORTE</h1>

            <p>
              ¿Necesitas ayuda con STORE GAMING?
            </p>

            <p className="support-landing-small">
              Pulsa el botón 📩 para crear una
              consulta.
            </p>
          </div>
        </section>

        <button
          type="button"
          className="support-floating-button"
          onClick={openSupportForm}
          aria-label="Abrir soporte"
        >
          <span>✉</span>
        </button>
      </main>
    );
  }

  /*
   * =====================================================
   * FORMULARIO PARA CREAR LA CONSULTA
   * =====================================================
   */

  if (supportView === "form") {
    return (
      <main className="support-page">
        <div
          className="support-overlay"
          onClick={() => {
            if (!categoryOpen) {
              closeSupport();
            }
          }}
        />

        <section
          className="support-bottom-sheet"
          onClick={(event) =>
            event.stopPropagation()
          }
        >
          <div className="support-sheet-handle" />

          <div className="support-sheet-header">
            <div>
              <h2>Crear nueva consulta</h2>

              <p>
                Describe tu problema y te
                ayudaremos.
              </p>
            </div>

            <button
              type="button"
              className="support-sheet-close"
              onClick={closeSupport}
            >
              ×
            </button>
          </div>

          <div className="support-form">
            <label>
              Problema <span>*</span>
            </label>

            <button
              type="button"
              className="support-category-selector"
              onClick={() =>
                setCategoryOpen(
                  (current) => !current
                )
              }
            >
              <span>
                {selectedCategory ? (
                  <>
                    <b className="support-category-icon">
                      {selectedCategory.icon}
                    </b>

                    {selectedCategory.label}
                  </>
                ) : (
                  <>
                    <span className="support-headset-icon">
                      ♧
                    </span>

                    Seleccione un problema
                  </>
                )}
              </span>

              <span>
                {categoryOpen ? "⌃" : "⌄"}
              </span>
            </button>

            {categoryOpen && (
              <div className="support-category-list">
                {SUPPORT_CATEGORIES.map(
                  (category) => (
                    <button
                      type="button"
                      key={category.id}
                      onClick={() =>
                        selectCategory(
                          category
                        )
                      }
                    >
                      <span className="support-category-list-icon">
                        {category.icon}
                      </span>

                      <span>
                        {category.label}
                      </span>
                    </button>
                  )
                )}
              </div>
            )}

            <label>
              Sujeto <span>*</span>
            </label>

            <div className="support-subject-wrapper">
              <input
                type="text"
                value={subject}
                maxLength={100}
                onChange={(event) =>
                  setSubject(
                    event.target.value
                  )
                }
                placeholder="Breve descripción del problema"
              />

              <small>
                {subject.length} / 100
              </small>
            </div>

            <label>
              Mensaje <span>*</span>
            </label>

            <div className="support-message-wrapper">
              <textarea
                value={message}
                maxLength={2000}
                onChange={(event) =>
                  setMessage(
                    event.target.value
                  )
                }
                placeholder="Describe tu problema en detalle..."
                rows={6}
              />

              <small>
                {message.length} / 2000
              </small>
            </div>

            <button
              type="button"
              className="support-submit-button"
              onClick={
                sendInitialSupportRequest
              }
              disabled={
                !selectedCategory ||
                !subject.trim() ||
                !message.trim() ||
                loading
              }
            >
              <span>➤</span>
              Enviar
            </button>
          </div>
        </section>
      </main>
    );
  }

  /*
   * =====================================================
   * CHAT CON LA IA
   * =====================================================
   */

  return (
    <main className="support-page">
      <section className="support-chat-window">
        <div className="support-chat-header">
          <div className="support-chat-header-left">
            <div className="support-ai-avatar">
              🤖
            </div>

            <div>
              <strong>
                STORE GAMING
              </strong>

              <span>
                <i />
                Asistente de soporte
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={closeSupport}
            className="support-chat-close"
            disabled={
              loading || creatingTicket
            }
          >
            ×
          </button>
        </div>

        <div className="support-chat-messages">
          {messages.map((item) => (
            <div
              key={item.id}
              className={
                item.sender === "user"
                  ? "support-chat-row support-chat-row-user"
                  : "support-chat-row support-chat-row-ai"
              }
            >
              {item.sender === "ai" && (
                <div className="support-chat-avatar">
                  🤖
                </div>
              )}

              <div
                className={
                  item.sender === "user"
                    ? "support-chat-bubble support-chat-bubble-user"
                    : "support-chat-bubble support-chat-bubble-ai"
                }
              >
                {item.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="support-chat-row support-chat-row-ai">
              <div className="support-chat-avatar">
                🤖
              </div>

              <div className="support-chat-bubble support-chat-bubble-ai support-typing">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {showAdminButton &&
          !ticketCreated && (
            <div className="support-admin-area">
              <button
                type="button"
                onClick={
                  callAdministrator
                }
                disabled={creatingTicket}
                className="support-admin-button"
              >
                {creatingTicket ? (
                  "ENVIANDO..."
                ) : (
                  <>
                    👨‍💻 LLAMAR AL
                    ADMINISTRADOR
                  </>
                )}
              </button>
            </div>
          )}

        {ticketCreated && (
          <div className="support-ticket-success">
            ✓ Solicitud enviada al
            administrador
          </div>
        )}

        <div className="support-chat-input-area">
          <textarea
            value={message}
            onChange={(event) =>
              setMessage(
                event.target.value
              )
            }
            onKeyDown={
              handleChatKeyDown
            }
            placeholder="Escribe un mensaje..."
            rows={1}
            disabled={
              loading || ticketCreated
            }
          />

          <button
            type="button"
            onClick={sendChatMessage}
            disabled={
              !message.trim() ||
              loading ||
              ticketCreated
            }
            aria-label="Enviar"
          >
            ➤
          </button>
        </div>
      </section>
    </main>
  );
}
