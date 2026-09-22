"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type SupportView =
  | "closed"
  | "form"
  | "chat"
  | "tickets";

type ChatMessage = {
  id: number;
  sender: "ai" | "user" | "admin";
  text: string;
};

type SupportTicket = {
  id: number;
  user_id: string | null;
  username: string | null;
  email: string | null;
  category: string;
  subject: string;
  message: string;
  conversation: ChatMessage[];
  status:
    | "PENDING"
    | "IN_PROGRESS"
    | "COMPLETED";
  created_at: string;
  updated_at: string;
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

  const [ticketsLoading, setTicketsLoading] =
    useState(false);

  const [showAdminButton, setShowAdminButton] =
    useState(false);

  const [ticketCreated, setTicketCreated] =
    useState(false);

  const [currentTicketId, setCurrentTicketId] =
    useState<number | null>(null);

  const [currentTicketStatus, setCurrentTicketStatus] =
    useState<
      "PENDING" |
      "IN_PROGRESS" |
      "COMPLETED" |
      null
    >(null);

  const [tickets, setTickets] = useState<
    SupportTicket[]
  >([]);

  const [error, setError] = useState("");

  const [userId, setUserId] = useState<string | null>(
    null
  );

  const [username, setUsername] = useState<string | null>(
    null
  );

  const [email, setEmail] = useState<string | null>(
    null
  );

  /*
   * =====================================================
   * CARGAR USUARIO
   * =====================================================
   */

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error(
          "ERROR OBTENIENDO USUARIO:",
          userError
        );

        return;
      }

      if (!user) {
        return;
      }

      setUserId(user.id);

      setEmail(
        user.email || null
      );

      const metadataUsername =
        typeof user.user_metadata?.username ===
        "string"
          ? user.user_metadata.username
          : null;

      setUsername(
        metadataUsername ||
          user.email ||
          null
      );

      await loadTickets(user.id);
    } catch (error) {
      console.error(
        "ERROR CARGANDO USUARIO:",
        error
      );
    }
  }

  /*
   * =====================================================
   * CARGAR TICKETS
   * =====================================================
   */

  async function loadTickets(
    id?: string
  ) {
    try {
      const finalUserId = id || userId;

      if (!finalUserId) {
        return;
      }

      setTicketsLoading(true);
      setError("");

      const response = await fetch(
        `/api/support/tickets?user_id=${encodeURIComponent(
          finalUserId
        )}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "No se pudieron cargar tus consultas."
        );
      }

      const loadedTickets: SupportTicket[] =
        Array.isArray(data?.tickets)
          ? data.tickets
          : [];

      setTickets(loadedTickets);
    } catch (error) {
      console.error(
        "ERROR CARGANDO TICKETS:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar tus consultas."
      );
    } finally {
      setTicketsLoading(false);
    }
  }

  /*
   * =====================================================
   * GUARDAR / ACTUALIZAR TICKET
   * =====================================================
   */

  async function saveTicket(
    messages: ChatMessage[],
    ticketId?: number | null
  ) {
    if (!userId) {
      throw new Error(
        "No se pudo identificar tu cuenta."
      );
    }

    const response = await fetch(
      "/api/support/ticket",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticketId:
            ticketId ?? currentTicketId,
          userId,
          username,
          email,
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
          "No se pudo guardar la consulta."
      );
    }

    if (data?.ticketId) {
      setCurrentTicketId(
        Number(data.ticketId)
      );
    }

    if (data?.status) {
      setCurrentTicketStatus(
        data.status
      );
    }

    return data;
  }

  /*
   * =====================================================
   * ENVIAR A IA
   * =====================================================
   */

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

      const finalMessages = [
        ...messages,
        aiMessage,
      ];

      setChatMessages(finalMessages);

      if (
        data?.needsAdmin === true ||
        data?.showAdminButton === true
      ) {
        setShowAdminButton(true);
      }

      /*
       * Guardamos también la respuesta de la IA
       * dentro del ticket.
       */
      await saveTicket(
        finalMessages,
        currentTicketId
      );
    } catch (error) {
      console.error(
        "ERROR SOPORTE IA:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Ocurrió un error al conectar con soporte."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * =====================================================
   * CREAR NUEVA CONVERSACIÓN
   * =====================================================
   */

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

    if (!userId) {
      setError(
        "No se pudo identificar tu cuenta. Vuelve a iniciar sesión."
      );
      return;
    }

    try {
      setError("");
      setTicketLoading(true);

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
      setCurrentTicketId(null);
      setCurrentTicketStatus("PENDING");
      setTicketCreated(false);
      setShowAdminButton(false);
      setSupportView("chat");

      /*
       * Primero creamos el ticket.
       */
      const ticketData = await saveTicket(
        [firstMessage],
        null
      );

      if (ticketData?.ticketId) {
        setCurrentTicketId(
          Number(ticketData.ticketId)
        );
      }

      setTicketLoading(false);

      /*
       * Después enviamos la consulta a la IA.
       */
      await sendToSupportAI(
        [firstMessage]
      );

      /*
       * Actualizamos la lista de tickets.
       */
      await loadTickets(userId);
    } catch (error) {
      console.error(
        "ERROR CREANDO CONVERSACIÓN:",
        error
      );

      setTicketLoading(false);

      setError(
        error instanceof Error
          ? error.message
          : "No se pudo crear la consulta."
      );
    }
  }

  /*
   * =====================================================
   * ENVIAR MENSAJE EN CHAT
   * =====================================================
   */

  async function handleSendChat(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const text = chatInput.trim();

    if (
      !text ||
      loading ||
      ticketLoading ||
      currentTicketStatus === "COMPLETED"
    ) {
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

    try {
      /*
       * Guardamos primero el mensaje del usuario.
       */
      await saveTicket(
        updatedMessages,
        currentTicketId
      );

      /*
       * Luego pedimos respuesta a la IA.
       */
      await sendToSupportAI(
        updatedMessages
      );
    } catch (error) {
      console.error(
        "ERROR ENVIANDO MENSAJE:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "No se pudo enviar el mensaje."
      );
    }
  }

  /*
   * =====================================================
   * ABRIR TICKET EXISTENTE
   * =====================================================
   */

  function openExistingTicket(
    ticket: SupportTicket
  ) {
    setError("");

    setCurrentTicketId(ticket.id);

    setCurrentTicketStatus(
      ticket.status
    );

    setCategory(
      ticket.category ||
        SUPPORT_CATEGORIES[0]
    );

    setSubject(
      ticket.subject || ""
    );

    setChatMessages(
      Array.isArray(ticket.conversation)
        ? ticket.conversation
        : []
    );

    setTicketCreated(
      ticket.status === "COMPLETED"
    );

    setShowAdminButton(
      ticket.status !== "COMPLETED"
    );

    setSupportView("chat");
  }

  /*
   * =====================================================
   * ABRIR LISTA DE TICKETS
   * =====================================================
   */

  async function openTickets() {
    setError("");
    await loadTickets();
    setSupportView("tickets");
  }

  /*
   * =====================================================
   * ADMINISTRADOR
   * =====================================================
   */

  async function handleCallAdministrator() {
    if (
      ticketLoading ||
      ticketCreated ||
      currentTicketStatus === "COMPLETED"
    ) {
      return;
    }

    try {
      setTicketLoading(true);
      setError("");

      /*
       * El ticket ya existe desde que comenzó
       * la conversación.
       *
       * Aquí solamente actualizamos la conversación
       * y la marcamos para atención administrativa.
       */
      const data = await saveTicket(
        chatMessages,
        currentTicketId
      );

      if (data?.ticketId) {
        setCurrentTicketId(
          Number(data.ticketId)
        );
      }

      setTicketCreated(true);

      await loadTickets(userId);
    } catch (error) {
      console.error(
        "ERROR ENVIANDO AL ADMINISTRADOR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "No se pudo enviar la solicitud."
      );
    } finally {
      setTicketLoading(false);
    }
  }

  /*
   * =====================================================
   * CERRAR VISTA
   * =====================================================
   */

  function closeSupport() {
    if (
      loading ||
      ticketLoading
    ) {
      return;
    }

    setSupportView("closed");
    setError("");
  }

  /*
   * =====================================================
   * NUEVA CONSULTA
   * =====================================================
   */

  function openSupportForm() {
    setError("");
    setSubject("");
    setMessage("");
    setChatMessages([]);
    setCurrentTicketId(null);
    setCurrentTicketStatus(null);
    setShowAdminButton(false);
    setTicketCreated(false);
    setSupportView("form");
  }

  /*
   * =====================================================
   * VOLVER A LISTA
   * =====================================================
   */

  function goBackToTickets() {
    if (
      loading ||
      ticketLoading
    ) {
      return;
    }

    setError("");
    setSupportView("tickets");
    loadTickets();
  }

  /*
   * =====================================================
   * VOLVER A FORMULARIO
   * =====================================================
   */

  function goBackToForm() {
    if (
      loading ||
      ticketLoading
    ) {
      return;
    }

    setSupportView("form");
    setChatMessages([]);
    setCurrentTicketId(null);
    setCurrentTicketStatus(null);
    setShowAdminButton(false);
    setTicketCreated(false);
    setError("");
  }

  /*
   * =====================================================
   * RENDER
   * =====================================================
   */

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

          {tickets.length > 0 && (
            <button
              type="button"
              className="support-main-button"
              onClick={openTickets}
            >
              💬 Mis consultas
            </button>
          )}

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

      {supportView === "tickets" && (
        <div className="support-sheet-overlay">
          <div className="support-sheet">
            <div className="support-sheet-handle" />

            <div className="support-sheet-header">
              <div>
                <span className="support-sheet-icon">
                  💬
                </span>

                <div>
                  <h2>
                    Mis consultas
                  </h2>

                  <p>
                    Aquí puedes continuar tus
                    conversaciones.
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

            {ticketsLoading ? (
              <div className="support-error">
                Cargando consultas...
              </div>
            ) : tickets.length === 0 ? (
              <div className="support-error">
                No tienes consultas abiertas.
              </div>
            ) : (
              <div className="support-chat-messages">
                {tickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    className="support-main-button"
                    onClick={() =>
                      openExistingTicket(ticket)
                    }
                  >
                    <strong>
                      📂 {ticket.subject}
                    </strong>

                    <br />

                    <small>
                      {ticket.category}
                    </small>

                    <br />

                    <small>
                      {ticket.status ===
                      "COMPLETED"
                        ? "✓ FINALIZADA"
                        : ticket.status ===
                          "IN_PROGRESS"
                        ? "🟡 EN REVISIÓN"
                        : "🔴 PENDIENTE"}
                    </small>
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              className="support-submit-button"
              onClick={openSupportForm}
            >
              📩 Nueva consulta
            </button>
          </div>
        </div>
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
              onSubmit={
                handleCreateConversation
              }
            >
              <label className="support-field">
                <span>
                  Categoría
                </span>

                <select
                  value={category}
                  onChange={(event) =>
                    setCategory(
                      event.target.value
                    )
                  }
                >
                  {                    SUPPORT_CATEGORIES.map(
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
                </div>

                <div className="support-field">
                  <label>Sujeto</label>

                  <input
                    type="text"
                    value={subject}
                    onChange={(event) =>
                      setSubject(event.target.value)
                    }
                    placeholder="¿Cuál es el problema?"
                    maxLength={120}
                  />
                </div>

                <div className="support-field">
                  <label>Mensaje</label>

                  <textarea
                    value={message}
                    onChange={(event) =>
                      setMessage(event.target.value)
                    }
                    placeholder="Explícanos detalladamente tu problema..."
                    rows={5}
                    maxLength={2000}
                  />
                </div>

                {error && (
                  <div className="support-error">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="support-main-button"
                  disabled={loading}
                >
                  {loading
                    ? "Creando consulta..."
                    : "ENVIAR"}
                </button>

                <button
                  type="button"
                  className="support-cancel-button"
                  onClick={() => {
                    setSupportView("closed");
                    setError("");
                  }}
                  disabled={loading}
                >
                  CANCELAR
                </button>
              </form>
            </div>
          </div>
        )}

        {supportView === "tickets" && (
          <div className="support-overlay">
            <div className="support-sheet support-tickets-sheet">
              <div className="support-sheet-header">
                <button
                  type="button"
                  className="support-back-button"
                  onClick={() =>
                    setSupportView("closed")
                  }
                >
                  ←
                </button>

                <div>
                  <h2>Mis consultas</h2>
                  <p>
                    Revisa tus conversaciones de soporte.
                  </p>
                </div>
              </div>

              {ticketsLoading ? (
                <div className="support-loading">
                  Cargando consultas...
                </div>
              ) : tickets.length === 0 ? (
                <div className="support-empty">
                  <div className="support-empty-icon">
                    💬
                  </div>

                  <h3>No tienes consultas</h3>

                  <p>
                    Cuando necesites ayuda, crea una nueva
                    consulta desde el botón 📩.
                  </p>
                </div>
              ) : (
                <div className="support-ticket-list">
                  {tickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      type="button"
                      className="support-ticket-card"
                      onClick={() =>
                        openExistingTicket(ticket)
                      }
                    >
                      <div className="support-ticket-card-top">
                        <span className="support-ticket-id">
                          #{ticket.id}
                        </span>

                        <span
                          className={`support-ticket-status ${
                            ticket.status === "COMPLETED"
                              ? "completed"
                              : ticket.status ===
                                "IN_PROGRESS"
                              ? "in-progress"
                              : "pending"
                          }`}
                        >
                          {ticket.status ===
                          "COMPLETED"
                            ? "FINALIZADA"
                            : ticket.status ===
                              "IN_PROGRESS"
                            ? "EN PROCESO"
                            : "PENDIENTE"}
                        </span>
                      </div>

                      <div className="support-ticket-category">
                        {ticket.category}
                      </div>

                      <div className="support-ticket-subject">
                        {ticket.subject}
                      </div>

                      <div className="support-ticket-date">
                        {new Date(
                          ticket.updated_at ||
                            ticket.created_at
                        ).toLocaleString("es-ES")}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                className="support-cancel-button"
                onClick={() =>
                  setSupportView("closed")
                }
              >
                CERRAR
              </button>
            </div>
          </div>
        )}

        {supportView === "chat" && (
          <div className="support-chat-page">
            <div className="support-chat-header">
              <button
                type="button"
                className="support-back-button"
                onClick={() => {
                  setSupportView("closed");
                  loadTickets();
                }}
              >
                ←
              </button>

              <div className="support-chat-title">
                <div className="support-chat-icon">
                  🤖
                </div>

                <div>
                  <h2>Soporte STORE GAMING</h2>

                  <p>
                    {currentTicketId
                      ? `Consulta #${currentTicketId}`
                      : "Asistente de soporte"}
                  </p>
                </div>
              </div>
            </div>

            <div className="support-chat-messages">
              {chatMessages.map((chatMessage) => (
                <div
                  key={chatMessage.id}
                  className={`support-message ${
                    chatMessage.sender === "user"
                      ? "support-message-user"
                      : "support-message-ai"
                  }`}
                >
                  <div className="support-message-label">
                    {chatMessage.sender === "user"
                      ? "Tú"
                      : chatMessage.sender === "admin"
                      ? "Administrador"
                      : "Soporte IA"}
                  </div>

                  <div className="support-message-bubble">
                    {chatMessage.text}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="support-message support-message-ai">
                  <div className="support-message-label">
                    Soporte IA
                  </div>

                  <div className="support-message-bubble support-typing">
                    Escribiendo...
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            <div className="support-chat-bottom">
              {ticketCreated ? (
                <div className="support-ticket-created">
                  <div className="support-ticket-created-icon">
                    ✅
                  </div>

                  <strong>
                    Consulta enviada al administrador
                  </strong>

                  <span>
                    El administrador revisará tu caso y
                    responderá en esta conversación.
                  </span>
                </div>
              ) : (
                <>
                  {showAdminButton && (
                    <button
                      type="button"
                      className="support-admin-button"
                      onClick={
                        handleCallAdministrator
                      }
                      disabled={ticketLoading}
                    >
                      {ticketLoading
                        ? "ENVIANDO..."
                        : "👨‍💻 LLAMAR AL ADMINISTRADOR"}
                    </button>
                  )}

                  <div className="support-chat-input-row">
                    <textarea
                      value={chatInput}
                      onChange={(event) =>
                        setChatInput(event.target.value)
                      }
                      placeholder="Escribe tu mensaje..."
                      rows={1}
                      disabled={loading}
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          !event.shiftKey
                        ) {
                          event.preventDefault();

                          if (
                            chatInput.trim() &&
                            !loading
                          ) {
                            handleSendChat();
                          }
                        }
                      }}
                    />

                    <button
                      type="button"
                      className="support-send-button"
                      onClick={handleSendChat}
                      disabled={
                        loading ||
                        !chatInput.trim()
                      }
                    >
                      ➤
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {supportView === "closed" && (
          <>
            <div className="support-page">
              <div className="support-header">
                <div>
                  <h1>Soporte</h1>

                  <p>
                    ¿Necesitas ayuda con tu compra?
                  </p>
                </div>
              </div>

              <div className="support-main-card">
                <div className="support-main-icon">
                  🎧
                </div>

                <h2>
                  ¿En qué podemos ayudarte?
                </h2>

                <p>
                  Nuestro asistente puede ayudarte a
                  resolver tus dudas y problemas.
                </p>

                <button
                  type="button"
                  className="support-main-button"
                  onClick={() => {
                    setCategory(
                      SUPPORT_CATEGORIES[0]
                    );
                    setSubject("");
                    setMessage("");
                    setError("");
                    setSupportView("form");
                  }}
                >
                  CREAR NUEVA CONSULTA
                </button>

                <button
                  type="button"
                  className="support-history-button"
                  onClick={() => {
                    loadTickets();
                    setSupportView("tickets");
                  }}
                >
                  📋 MIS CONSULTAS
                </button>
              </div>
            </div>

            <button
              type="button"
              className="support-floating-button"
              onClick={() => {
                setCategory(
                  SUPPORT_CATEGORIES[0]
                );
                setSubject("");
                setMessage("");
                setError("");
                setSupportView("form");
              }}
              aria-label="Crear consulta de soporte"
            >
              📩
            </button>
          </>
        )}
      </main>
    </>
  );
}
