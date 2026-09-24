"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { supabase } from "../../lib/supabase";

type View =
  | "closed"
  | "form"
  | "chat"
  | "tickets";

type ChatSender =
  | "ai"
  | "user"
  | "admin";

type ChatMessage = {
  sender: ChatSender;
  message: string;
  created_at?: string;
};

type SupportTicket = {
  id: number;
  user_id: string | null;
  username: string | null;
  email: string | null;
  category: string | null;
  subject: string;
  message: string;
  conversation: ChatMessage[];
  status: string;
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

const ADMIN_EMAIL =
  "juliocesarblancomedina08@gmail.com";

export default function SupportPage() {
  const router = useRouter();

  const [view, setView] =
    useState<View>("closed");

  const [loading, setLoading] =
    useState(false);

  const [ticketLoading, setTicketLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [currentUserId, setCurrentUserId] =
    useState("");

  const [currentUsername, setCurrentUsername] =
    useState("");

  const [currentEmail, setCurrentEmail] =
    useState("");

  const [category, setCategory] =
    useState(
      SUPPORT_CATEGORIES[0]
    );

  const [subject, setSubject] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [chatInput, setChatInput] =
    useState("");

  const [conversation, setConversation] =
    useState<ChatMessage[]>([]);

  const [tickets, setTickets] =
    useState<SupportTicket[]>([]);

  const [selectedTicket, setSelectedTicket] =
    useState<SupportTicket | null>(null);

  const [ticketId, setTicketId] =
    useState<number | null>(null);

  const [ticketStatus, setTicketStatus] =
    useState("PENDING");

  const [adminRequested, setAdminRequested] =
    useState(false);

  const chatEndRef =
    useRef<HTMLDivElement | null>(null);

  /*
   * ============================================================
   * USUARIO ACTUAL
   * ============================================================
   */

  useEffect(() => {
    loadCurrentUser();
  }, []);

  async function loadCurrentUser() {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (
        sessionError ||
        !session?.user
      ) {
        router.replace("/");
        return;
      }

      const user =
        session.user;

      setCurrentUserId(user.id);

      setCurrentEmail(
        user.email || ""
      );

      const metadata =
        user.user_metadata || {};

      const username =
        metadata.username ||
        metadata.user_name ||
        metadata.name ||
        user.email?.split("@")[0] ||
        "";

      setCurrentUsername(
        username
      );

      await loadTickets(user.id);
    } catch (err) {
      console.error(
        "ERROR CARGANDO USUARIO:",
        err
      );
    }
  }

  /*
   * ============================================================
   * CARGAR TICKETS DEL USUARIO
   * ============================================================
   */

  async function loadTickets(
    finalUserId?: string
  ) {
    try {
      setTicketLoading(true);
      setError("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (
        !session?.access_token
      ) {
        throw new Error(
          "Tu sesión ha expirado. Vuelve a iniciar sesión."
        );
      }

      const userId =
        finalUserId ||
        session.user.id;

      const response =
        await fetch(
          `/api/support/tickets?user_id=${encodeURIComponent(
            userId
          )}`,
          {
            method: "GET",
            headers: {
              Authorization:
                `Bearer ${session.access_token}`,
            },
            cache: "no-store",
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "No se pudieron cargar las consultas."
        );
      }

      const loadedTickets =
        Array.isArray(
          result.tickets
        )
          ? result.tickets
          : [];

      setTickets(
        loadedTickets
      );
    } catch (err) {
      console.error(
        "ERROR CARGANDO TICKETS:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar las consultas."
      );
    } finally {
      setTicketLoading(false);
    }
  }

  /*
   * ============================================================
   * SCROLL DEL CHAT
   * ============================================================
   */

  useEffect(() => {
    if (view !== "chat") {
      return;
    }

    requestAnimationFrame(() => {
      chatEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    });
  }, [
    conversation,
    view,
  ]);

  /*
   * ============================================================
   * CREAR NUEVA CONSULTA
   * ============================================================
   */

  function openNewTicket() {
    setError("");

    setCategory(
      SUPPORT_CATEGORIES[0]
    );

    setSubject("");

    setMessage("");

    setChatInput("");

    setConversation([]);

    setTicketId(null);

    setSelectedTicket(null);

    setTicketStatus("PENDING");

    setAdminRequested(false);

    setView("form");
  }

  /*
   * ============================================================
   * CREAR TICKET
   * ============================================================
   */

  async function createTicket(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (ticketLoading) {
      return;
    }

    const cleanSubject =
      subject.trim();

    const cleanMessage =
      message.trim();

    if (!cleanSubject) {
      setError(
        "Escriba el sujeto de la consulta."
      );
      return;
    }

    if (!cleanMessage) {
      setError(
        "Escriba el mensaje."
      );
      return;
    }

    try {
      setTicketLoading(true);
      setError("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (
        !session?.user ||
        !session.access_token
      ) {
        throw new Error(
          "Tu sesión ha expirado. Vuelve a iniciar sesión."
        );
      }

      const firstMessage: ChatMessage = {
        sender: "user",
        message: cleanMessage,
        created_at:
          new Date().toISOString(),
      };

      const response =
        await fetch(
          "/api/support/ticket",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              subject:
                cleanSubject,
              message:
                cleanMessage,
              category,
              conversation: [
                firstMessage,
              ],
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "No se pudo crear la consulta."
        );
      }

      const createdTicket =
        result.ticket ||
        result.data ||
        null;

      const createdId =
        createdTicket?.id ||
        result.ticketId ||
        result.id ||
        null;

      setTicketId(
        createdId
      );

      setTicketStatus(
        createdTicket?.status ||
          result.status ||
          "PENDING"
      );

      setConversation([
        firstMessage,
      ]);

      setChatInput("");

      setMessage("");

      setAdminRequested(false);

      if (createdId) {
        await sendToSupportAI(
          [
            firstMessage,
          ],
          createdId
        );
      }

      await loadTickets(
        session.user.id
      );

      setView("chat");
    } catch (err) {
      console.error(
        "ERROR CREANDO TICKET:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo crear la consulta."
      );
    } finally {
      setTicketLoading(false);
    }
  }

  /*
   * ============================================================
   * ENVIAR MENSAJE AL CHAT IA
   * ============================================================
   */

  async function sendToSupportAI(
    messagesOverride?: ChatMessage[],
    ticketIdOverride?: number | null
  ) {
    try {
      setLoading(true);
      setError("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (
        !session?.access_token
      ) {
        throw new Error(
          "Tu sesión ha expirado. Vuelve a iniciar sesión."
        );
      }

      const messages =
        messagesOverride ||
        conversation;

      const response =
        await fetch(
          "/api/support/chat",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              messages,
              ticketId:
                ticketIdOverride ??
                ticketId,
              category,
              subject,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "No se pudo obtener una respuesta del soporte."
        );
      }

      const aiText =
        result.message ||
        result.response ||
        result.answer ||
        "";

      if (!aiText) {
        throw new Error(
          "El soporte no devolvió una respuesta."
        );
      }

      const aiMessage: ChatMessage = {
        sender:
          result.sender === "admin"
            ? "admin"
            : "ai",
        message: aiText,
        created_at:
          new Date().toISOString(),
      };

      setConversation(
        (current) => [
          ...current,
          aiMessage,
        ]
      );

      if (
        result.ticket
      ) {
        setTicketStatus(
          result.ticket.status ||
            "PENDING"
        );
      }

      if (
        result.status
      ) {
        setTicketStatus(
          result.status
        );
      }

      /*
       * Si la IA indica que hace falta
       * administrador, mostramos el botón.
       */

      if (
        result.requiresAdmin === true ||
        result.escalate === true ||
        result.needsAdmin === true
      ) {
        setAdminRequested(
          true
        );
      }

      /*
       * También reconocemos algunas
       * respuestas explícitas del backend.
       */

      const lower =
        aiText.toLowerCase();

      if (
        lower.includes(
          "llamar al administrador"
        ) ||
        lower.includes(
          "contactar al administrador"
        ) ||
        lower.includes(
          "necesitas contactar"
        )
      ) {
        setAdminRequested(
          true
        );
      }
    } catch (err) {
      console.error(
        "ERROR CHAT SOPORTE:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo obtener una respuesta."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * ============================================================
   * ENVIAR MENSAJE
   * ============================================================
   */

  async function handleSendChat(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      loading ||
      ticketLoading
    ) {
      return;
    }

    if (
      ticketStatus ===
        "COMPLETED" ||
      ticketStatus ===
        "CLOSED"
    ) {
      return;
    }

    const cleanMessage =
      chatInput.trim();

    if (!cleanMessage) {
      return;
    }

    setChatInput("");

    const userMessage: ChatMessage = {
      sender: "user",
      message: cleanMessage,
      created_at:
        new Date().toISOString(),
    };

    const nextConversation = [
      ...conversation,
      userMessage,
    ];

    setConversation(
      nextConversation
    );

    /*
     * Actualizamos el ticket primero.
     */

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (
        !session?.access_token
      ) {
        throw new Error(
          "Tu sesión ha expirado. Vuelve a iniciar sesión."
        );
      }

            if (ticketId) {
        await fetch(
          "/api/support/ticket",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              ticketId,
              message:
                cleanMessage,
              conversation:
                nextConversation,
              category,
              subject,
            }),
          }
        );
      }

      await sendToSupportAI(
        nextConversation,
        ticketId
      );
    } catch (err) {
      console.error(
        "ERROR ENVIANDO MENSAJE:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo enviar el mensaje."
      );
    }
  }

  /*
   * ============================================================
   * LLAMAR AL ADMINISTRADOR
   * ============================================================
   */

  async function requestAdmin() {
    if (
      ticketLoading ||
      !ticketId
    ) {
      return;
    }

    try {
      setTicketLoading(true);
      setError("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (
        !session?.access_token
      ) {
        throw new Error(
          "Tu sesión ha expirado."
        );
      }

      const adminMessage: ChatMessage = {
        sender: "user",
        message:
          "👨‍💻 Solicito llamar al administrador para continuar con mi consulta.",
        created_at:
          new Date().toISOString(),
      };

      const nextConversation = [
        ...conversation,
        adminMessage,
      ];

      setConversation(
        nextConversation
      );

      const response =
        await fetch(
          "/api/support/ticket",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              ticketId,
              message:
                adminMessage.message,
              conversation:
                nextConversation,
              category,
              subject,
              notifyAdmin: true,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "No se pudo llamar al administrador."
        );
      }

      setAdminRequested(
        false
      );

      setTicketStatus(
        result.status ||
          "PENDING"
      );

      await loadTickets(
        session.user.id
      );
    } catch (err) {
      console.error(
        "ERROR SOLICITANDO ADMIN:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo contactar al administrador."
      );
    } finally {
      setTicketLoading(false);
    }
  }

  /*
   * ============================================================
   * ABRIR TICKET EXISTENTE
   * ============================================================
   */

  function openTicket(
    ticket: SupportTicket
  ) {
    setSelectedTicket(
      ticket
    );

    setTicketId(
      ticket.id
    );

    setCategory(
      ticket.category ||
        "Otro/pregunta"
    );

    setSubject(
      ticket.subject ||
        ""
    );

    setTicketStatus(
      ticket.status ||
        "PENDING"
    );

    setConversation(
      Array.isArray(
        ticket.conversation
      )
        ? ticket.conversation
        : ticket.message
        ? [
            {
              sender:
                "user",
              message:
                ticket.message,
              created_at:
                ticket.created_at,
            },
          ]
        : []
    );

    setAdminRequested(
      false
    );

    setError("");

    setView("chat");
  }

  /*
   * ============================================================
   * REABRIR TICKET
   * ============================================================
   */

  async function reopenTicket() {
    if (!ticketId) {
      return;
    }

    try {
      setTicketLoading(true);
      setError("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (
        !session?.access_token
      ) {
        throw new Error(
          "Tu sesión ha expirado."
        );
      }

      const response =
        await fetch(
          "/api/support/ticket",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              ticketId,
              status: "PENDING",
              category,
              subject,
              conversation,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "No se pudo reabrir la consulta."
        );
      }

      setTicketStatus(
        "PENDING"
      );

      await loadTickets(
        session.user.id
      );
    } catch (err) {
      console.error(
        "ERROR REABRIENDO TICKET:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo reabrir la consulta."
      );
    } finally {
      setTicketLoading(false);
    }
  }

  /*
   * ============================================================
   * FORMULARIO
   * ============================================================
   */

  if (view === "form") {
    return (
      <main className="support-page">
        <div className="support-page-background" />

        <div className="support-content">
          <header className="support-header">
            <button
              type="button"
              className="support-back-button"
              onClick={() =>
                setView("closed")
              }
            >
              ←
            </button>

            <div className="support-header-title">
              <span>📩</span>

              <h1>
                Crear nueva consulta
              </h1>
            </div>
          </header>

          <section className="support-main-card">
            <div className="support-main-icon">
              📩
            </div>

            <h2>
              ¿En qué podemos ayudarte?
            </h2>

            <p>
              Selecciona una categoría y
              explica tu problema. Primero
              te atenderá nuestro asistente.
            </p>
          </section>

          <form
            className="support-form"
            onSubmit={createTicket}
          >
            <div className="support-field">
              <label>
                CATEGORÍA
              </label>

              <select
                value={category}
                onChange={(event) =>
                  setCategory(
                    event.target.value
                  )
                }
                disabled={
                  ticketLoading
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
            </div>

            <div className="support-field">
              <label>
                SUJETO
              </label>

              <input
                type="text"
                value={subject}
                onChange={(event) =>
                  setSubject(
                    event.target.value
                  )
                }
                placeholder="Ejemplo: No me llegó mi recarga"
                maxLength={120}
                autoComplete="off"
                disabled={
                  ticketLoading
                }
              />
            </div>

            <div className="support-field">
              <label>
                MENSAJE
              </label>

              <textarea
                value={message}
                onChange={(event) =>
                  setMessage(
                    event.target.value
                  )
                }
                placeholder="Explique detalladamente su problema..."
                rows={6}
                maxLength={3000}
                disabled={
                  ticketLoading
                }
              />
            </div>

            {error && (
              <div className="support-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="support-submit-button"
              disabled={
                ticketLoading ||
                !subject.trim() ||
                !message.trim()
              }
            >
              {ticketLoading
                ? "CREANDO CONSULTA..."
                : "CREAR CONSULTA →"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  /*
   * ============================================================
   * CHAT
   * ============================================================
   */

  if (view === "chat") {
    const isClosed =
      ticketStatus ===
        "COMPLETED" ||
      ticketStatus ===
        "CLOSED";

    return (
      <main
        className="support-page"
        style={{
          minHeight:
            "100dvh",
          height:
            "100dvh",
          overflow:
            "hidden",
        }}
      >
        <div className="support-page-background" />

        <div
          className="support-content"
          style={{
            height:
              "100dvh",
            minHeight:
              "100dvh",
            paddingBottom:
              "16px",
            boxSizing:
              "border-box",
            display:
              "flex",
            flexDirection:
              "column",
            overflow:
              "hidden",
          }}
        >
          <header
            className="support-header"
            style={{
              flex:
                "0 0 auto",
            }}
          >
            <button
              type="button"
              className="support-back-button"
              onClick={() =>
                setView(
                  selectedTicket
                    ? "tickets"
                    : "closed"
                )
              }
            >
              ←
            </button>

            <div className="support-header-title">
              <span>💬</span>

              <h1>
                Soporte
              </h1>
            </div>
          </header>

          <section
            className="support-chat-container"
            style={{
              flex:
                "1 1 0",
              minHeight:
                0,
              width:
                "100%",
              maxWidth:
                "620px",
              margin:
                "12px auto 0",
              display:
                "flex",
              flexDirection:
                "column",
              overflow:
                "hidden",
              border:
                "1px solid rgba(255,255,255,.10)",
              borderRadius:
                "18px",
              background:
                "rgba(7,7,7,.96)",
              boxShadow:
                "0 18px 45px rgba(0,0,0,.55)",
            }}
          >
            <div
              style={{
                flex:
                  "0 0 auto",
                minHeight:
                  "58px",
                display:
                  "flex",
                alignItems:
                  "center",
                gap:
                  "10px",
                padding:
                  "10px 13px",
                borderBottom:
                  "1px solid rgba(255,255,255,.08)",
                background:
                  "#0b0b0b",
              }}
            >
              <div
                style={{
                  width:
                    "38px",
                  height:
                    "38px",
                  flex:
                    "0 0 38px",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  borderRadius:
                    "50%",
                  background:
                    "linear-gradient(135deg,#e50914,#760007)",
                  color:
                    "#fff",
                  fontSize:
                    "18px",
                }}
              >
                🤖
              </div>

              <div
                style={{
                  minWidth:
                    0,
                  flex:
                    1,
                }}
              >
                <strong
                  style={{
                    display:
                      "block",
                    color:
                      "#fff",
                    fontSize:
                      "12px",
                    fontWeight:
                      950,
                  }}
                >
                  STORE GAMING
                </strong>

                <span
                  style={{
                    display:
                      "block",
                    marginTop:
                      "3px",
                    color:
                      "#777",
                    fontSize:
                      "9px",
                  }}
                >
                  {isClosed
                    ? "Consulta cerrada"
                    : "Asistente de soporte"}
                </span>
              </div>

              <span
                style={{
                  width:
                    "8px",
                  height:
                    "8px",
                  borderRadius:
                    "50%",
                  background:
                    isClosed
                      ? "#777"
                      : "#20c55a",
                  boxShadow:
                    isClosed
                      ? "none"
                      : "0 0 9px rgba(32,197,90,.65)",
                }}
              />
            </div>

            <div
              className="support-chat-messages"
              style={{
                flex:
                  "1 1 0",
                minHeight:
                  0,
                overflowY:
                  "auto",
                overflowX:
                  "hidden",
                padding:
                  "14px 11px",
                display:
                  "flex",
                flexDirection:
                  "column",
                gap:
                  "8px",
                WebkitOverflowScrolling:
                  "touch",
              }}
            >
              {conversation.length ===
                0 && (
                <div
                  style={{
                    margin:
                      "auto",
                    maxWidth:
                      "280px",
                    padding:
                      "20px 15px",
                    textAlign:
                      "center",
                    color:
                      "#666",
                    fontSize:
                      "10px",
                    lineHeight:
                      1.5,
                  }}
                >
                  💬
                  <br />
                  Escribe tu mensaje para
                  comenzar la conversación.
                </div>
              )}

              {conversation.map(
                (
                  item,
                  index
                ) => {
                  const isUser =
                    item.sender ===
                    "user";

                  const isAdmin =
                    item.sender ===
                    "admin";

                  return (
                    <div
                      key={`${index}-${item.created_at || ""}`}
                      style={{
                        width:
                          "100%",
                        display:
                          "flex",
                        justifyContent:
                          isUser
                            ? "flex-end"
                            : "flex-start",
                      }}
                    >
                      <div
                        style={{
                          width:
                            "fit-content",
                          maxWidth:
                            "84%",
                          minWidth:
                            "70px",
                          padding:
                            "8px 10px",
                          borderRadius:
                            isUser
                              ? "15px 15px 4px 15px"
                              : "15px 15px 15px 4px",
                          background:
                            isUser
                              ? "linear-gradient(135deg,#e50914,#a50008)"
                              : isAdmin
                              ? "linear-gradient(135deg,#242424,#151515)"
                              : "#151515",
                          border:
                            isAdmin
                              ? "1px solid rgba(255,255,255,.12)"
                              : isUser
                              ? "1px solid rgba(255,70,70,.28)"
                              : "1px solid rgba(255,255,255,.06)",
                          color:
                            "#fff",
                          boxShadow:
                            "0 5px 15px rgba(0,0,0,.22)",
                        }}
                      >
                        <span
                          style={{
                            display:
                              "block",
                            marginBottom:
                              "4px",
                            color:
                              isUser
                                ? "rgba(255,255,255,.72)"
                                : isAdmin
                                ? "#ff6d74"
                                : "#888",
                            fontSize:
                              "8px",
                            fontWeight:
                              950,
                            textTransform:
                              "uppercase",
                          }}
                        >
                          {isUser
                            ? "Tú"
                            : isAdmin
                            ? "Administrador"
                            : "Soporte IA"}
                        </span>

                        <div
                          style={{
                            whiteSpace:
                              "pre-wrap",
                            wordBreak:
                              "break-word",
                            color:
                              "#fff",
                            fontSize:
                              "11px",
                            lineHeight:
                              1.5,
                          }}
                        >
                          {item.message}
                        </div>

                        {item.created_at && (
                          <span
                            style={{
                              display:
                                "block",
                              marginTop:
                                "4px",
                              textAlign:
                                "right",
                              color:
                                isUser
                                  ? "rgba(255,255,255,.5)"
                                  : "#555",
                              fontSize:
                                "7px",
                            }}
                          >
                            {new Date(
                              item.created_at
                            ).toLocaleTimeString(
                              [],
                              {
                                hour:
                                  "2-digit",
                                minute:
                                  "2-digit",
                              }
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }
              )}

              {loading && (
                <div
                  style={{
                    width:
                      "100%",
                    display:
                      "flex",
                    justifyContent:
                      "flex-start",
                  }}
                >
                  <div
                    style={{
                      padding:
                        "10px 13px",
                      borderRadius:
                        "15px 15px 15px 4px",
                      background:
                        "#151515",
                      border:
                        "1px solid rgba(255,255,255,.06)",
                      color:
                        "#888",
                      fontSize:
                        "10px",
                    }}
                  >
                    Escribiendo •••
                  </div>
                </div>
              )}

              <div
                ref={
                  chatEndRef
                }
              />
            </div>

            {adminRequested &&
              !isClosed && (
                <div
                  style={{
                    flex:
                      "0 0 auto",
                    padding:
                      "9px 10px 0",
                    background:
                      "#090909",
                  }}
                >
                  <button
                    type="button"
                    className="support-admin-button"
                    onClick={
                      requestAdmin
                    }
                    disabled={
                      ticketLoading
                    }
                    style={{
                      width:
                        "100%",
                      minHeight:
                        "42px",
                      borderRadius:
                        "11px",
                      border:
                        "1px solid rgba(229,9,20,.45)",
                      background:
                        "linear-gradient(135deg,#e50914,#8e0008)",
                      color:
                        "#fff",
                      fontSize:
                        "10px",
                      fontWeight:
                        950,
                    }}
                  >
                    {ticketLoading
                      ? "CONTACTANDO..."
                      : "👨‍💻 LLAMAR AL ADMINISTRADOR"}
                  </button>
                </div>
              )}

            {error && (
              <div
                style={{
                  flex:
                    "0 0 auto",
                  margin:
                    "8px 10px 0",
                  padding:
                    "8px 10px",
                  border:
                    "1px solid rgba(229,9,20,.3)",
                  borderRadius:
                    "10px",
                  background:
                    "rgba(229,9,20,.08)",
                  color:
                    "#ff7b82",
                  fontSize:
                    "9px",
                  lineHeight:
                    1.4,
                }}
              >
                {error}
              </div>
            )}

            {!isClosed ? (
              <div
                className="support-chat-input-area"
                style={{
                  flex:
                    "0 0 auto",
                  width:
                    "100%",
                  boxSizing:
                    "border-box",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap:
                    "8px",
                  padding:
                    "9px 10px",
                  paddingBottom:
                    "max(9px, env(safe-area-inset-bottom))",
                  borderTop:
                    "1px solid rgba(255,255,255,.08)",
                  background:
                    "#090909",
                }}
              >
                <form
                  className="support-chat-input-row"
                  onSubmit={
                    handleSendChat
                  }
                  style={{
                    width:
                      "100%",
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap:
                      "8px",
                    margin:
                      0,
                  }}
                >
                  <input
                    type="text"
                    value={
                      chatInput
                    }
                    onChange={(
                      event
                    ) =>
                      setChatInput(
                        event.target.value
                      )
                    }
                    placeholder="Escribe tu mensaje..."
                    disabled={
                      loading ||
                      ticketLoading
                    }
                    autoComplete="off"
                    style={{
                      flex:
                        "1 1 auto",
                      minWidth:
                        0,
                      width:
                        "100%",
                      height:
                        "45px",
                      boxSizing:
                        "border-box",
                      padding:
                        "0 13px",
                      border:
                        "1px solid rgba(255,255,255,.10)",
                      borderRadius:
                        "22px",
                      outline:
                        "none",
                      background:
                        "#151515",
                      color:
                        "#fff",
                      fontFamily:
                        "inherit",
                      fontSize:
                        "11px",
                    }}
                  />

                  <button
                    type="submit"
                    className="support-send-button"
                    disabled={
                      loading ||
                      ticketLoading ||
                      !chatInput.trim()
                    }
                    aria-label="Enviar mensaje"
                    style={{
                      width:
                        "45px",
                      height:
                        "45px",
                      flex:
                        "0 0 45px",
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      border:
                        "0",
                      borderRadius:
                        "50%",
                      background:
                        "linear-gradient(135deg,#e50914,#a00008)",
                      color:
                        "#fff",
                      fontSize:
                        "19px",
                      fontWeight:
                        950,
                      opacity:
                        loading ||
                        ticketLoading ||
                        !chatInput.trim()
                          ? 0.45
                          : 1,
                    }}
                  >
                    ➤
                  </button>
                </form>
              </div>
            ) : (
              <div
                style={{
                  flex:
                    "0 0 auto",
                  padding:
                    "12px",
                  borderTop:
                    "1px solid rgba(255,255,255,.08)",
                  background:
                    "#090909",
                }}
              >
                <button
                  type="button"
                  className="support-submit-button"
                  onClick={
                    reopenTicket
                  }
                  disabled={
                    ticketLoading
                  }
                  style={{
                    width:
                      "100%",
                    minHeight:
                      "44px",
                    borderRadius:
                      "12px",
                    border:
                      "1px solid rgba(229,9,20,.35)",
                    background:
                      "linear-gradient(135deg,#e50914,#8e0008)",
                    color:
                      "#fff",
                    fontSize:
                      "10px",
                    fontWeight:
                      950,
                  }}
                >
                  {ticketLoading
                    ? "REABRIENDO..."
                    : "↻ REABRIR CONSULTA"}
                </button>
              </div>
            )}
          </section>
        </div>
      </main>
    );
  }

  /*
   * ============================================================
   * HISTORIAL
   * ============================================================
   */

  if (view === "tickets") {
    return (
      <main className="support-page">
        <div className="support-page-background" />

        <div className="support-content">
          <header className="support-header">
            <button
              type="button"
              className="support-back-button"
              onClick={() =>
                setView("closed")
              }
            >
              ←
            </button>

            <div className="support-header-title">
              <span>📋</span>

              <h1>
                Mis consultas
              </h1>
            </div>
          </header>

          <section className="support-tickets-list">
            {tickets.length ===
              0 ? (
              <div className="support-main-card">
                <div className="support-main-icon">
                  📭
                </div>

                <h2>
                  No tienes consultas
                </h2>

                <p>
                  Cuando crees una
                  consulta aparecerá aquí.
                </p>

                <button
                  type="button"
                  className="support-main-button"
                  onClick={
                    openNewTicket
                  }
                >
                  CREAR CONSULTA
                </button>
              </div>
            ) : (
              <>
                {tickets.map(
                  (ticket) => (
                    <button
                      type="button"
                      key={ticket.id}
                      className="support-item"
                      onClick={() =>
                        openTicket(
                          ticket
                        )
                      }
                    >
                      <div className="support-item-icon">
                        💬
                      </div>

                      <div className="support-item-content">
                        <strong>
                          {ticket.subject}
                        </strong>

                        <p>
                          {ticket.category ||
                            "Otro/pregunta"}
                        </p>

                        <span>
                          {ticket.status}
                        </span>
                      </div>

                      <b>
                        →
                      </b>
                    </button>
                  )
                )}

                <button
                  type="button"
                  className="support-main-button"
                  onClick={
                    openNewTicket
                  }
                >
                  + NUEVA CONSULTA
                </button>
              </>
            )}
          </section>
        </div>
      </main>
    );
  }

  /*
   * ============================================================
   * INICIO SOPORTE
   * ============================================================
   */

  return (
    <main className="support-page">
      <div className="support-page-background" />

      <div className="support-content">
        <header className="support-header">
          <button
            type="button"
            className="support-back-button"
            onClick={() =>
              router.push("/home")
            }
          >
            ←
          </button>

          <div className="support-header-title">
            <span>📩</span>

            <h1>
              Soporte
            </h1>
          </div>
        </header>

        <section className="support-main-card">
          <div className="support-main-icon">
            🆘
          </div>

          <h2>
            ¿Necesitas ayuda?
          </h2>

          <p>
            Crea una consulta y nuestro
            asistente de soporte intentará
            resolverla contigo.
          </p>

          <button
            type="button"
            className="support-main-button"
            onClick={
              openNewTicket
            }
          >
            📩 CREAR NUEVA CONSULTA
          </button>

          {tickets.length >
            0 && (
            <button
              type="button"
              className="support-secondary-button"
              onClick={() =>
                setView(
                  "tickets"
                )
              }
            >
              📋 VER MIS CONSULTAS
            </button>
          )}
        </section>

        {error && (
          <div className="support-error">
            {error}
          </div>
        )}

        <div className="support-user-info">
          <span>
            👤
          </span>

          <div>
            <strong>
              {currentUsername ||
                "Usuario"}
            </strong>

            <p>
              {currentEmail}
            </p>
          </div>
        </div>

        <footer className="game-service-footer">
          <strong>
            🛒STORE GAMING🎮
          </strong>

          <span>
            CENTRO DE SOPORTE
          </span>
        </footer>
      </div>

      <button
        type="button"
        className="support-floating-button"
        onClick={
          openNewTicket
        }
        aria-label="Crear consulta"
      >
        📩
      </button>
    </main>
  );
}
