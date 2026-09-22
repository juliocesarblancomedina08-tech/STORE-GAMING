"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type ChatMessage = {
  id: number;
  sender: "ai" | "user" | "admin";
  text: string;
};

type TicketStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED";

type SupportTicket = {
  id: number;
  user_id: string | null;
  username: string | null;
  email: string | null;
  category: string;
  subject: string;
  message: string;
  conversation: ChatMessage[];
  status: TicketStatus;
  created_at: string;
  updated_at: string;
};

const ADMIN_EMAIL =
  "juliocesarblancomedina08@gmail.com";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminSupportPage() {
  const router = useRouter();

  const chatEndRef =
    useRef<HTMLDivElement | null>(null);

  const [authorized, setAuthorized] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [ticketsLoading, setTicketsLoading] =
    useState(false);

  const [tickets, setTickets] =
    useState<SupportTicket[]>([]);

  const [selectedTicket, setSelectedTicket] =
    useState<SupportTicket | null>(null);

  const [reply, setReply] =
    useState("");

  const [replyLoading, setReplyLoading] =
    useState(false);

  const [statusLoading, setStatusLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [filter, setFilter] =
    useState<
      "ALL" |
      "PENDING" |
      "IN_PROGRESS" |
      "COMPLETED"
    >("ALL");

  /*
   * =====================================================
   * VERIFICAR ADMINISTRADOR
   * =====================================================
   */

  useEffect(() => {
    verifyAdmin();
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      chatEndRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [
    selectedTicket?.conversation,
    selectedTicket?.id,
  ]);

  async function verifyAdmin() {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (
        userError ||
        !user ||
        !user.email ||
        user.email.trim().toLowerCase() !==
          ADMIN_EMAIL.toLowerCase()
      ) {
        router.replace("/home");
        return;
      }

      setAuthorized(true);

      await loadTickets();
    } catch (error) {
      console.error(
        "ERROR VERIFICANDO ADMIN:",
        error
      );

      router.replace("/home");
    } finally {
      setLoading(false);
    }
  }

  /*
   * =====================================================
   * CARGAR TODOS LOS TICKETS
   * =====================================================
   */

  async function loadTickets() {
    try {
      setTicketsLoading(true);
      setError("");

      const response = await fetch(
        "/api/support/tickets?admin=true",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "No se pudieron cargar las consultas."
        );
      }

      const loadedTickets: SupportTicket[] =
        Array.isArray(data?.tickets)
          ? data.tickets
          : [];

      setTickets(loadedTickets);

      /*
       * Si estamos viendo un ticket,
       * actualizamos sus datos con la
       * versión más reciente.
       */
      if (selectedTicket) {
        const updated =
          loadedTickets.find(
            (ticket) =>
              ticket.id ===
              selectedTicket.id
          );

        if (updated) {
          setSelectedTicket(updated);
        }
      }
    } catch (error) {
      console.error(
        "ERROR CARGANDO SOPORTE ADMIN:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las consultas."
      );
    } finally {
      setTicketsLoading(false);
    }
  }

  /*
   * =====================================================
   * ABRIR TICKET
   * =====================================================
   */

  function openTicket(
    ticket: SupportTicket
  ) {
    setError("");
    setReply("");
    setSelectedTicket(ticket);
  }

  /*
   * =====================================================
   * VOLVER A LA LISTA
   * =====================================================
   */

  function closeTicket() {
    if (replyLoading) {
      return;
    }

    setSelectedTicket(null);
    setReply("");
    setError("");
  }

  /*
   * =====================================================
   * RESPONDER AL CLIENTE
   * =====================================================
   */

  async function sendReply() {
    const text = reply.trim();

    if (
      !selectedTicket ||
      !text ||
      replyLoading
    ) {
      return;
    }

    try {
      setReplyLoading(true);
      setError("");

      const newMessage: ChatMessage = {
        id: Date.now(),
        sender: "admin",
        text,
      };

      const currentConversation =
        Array.isArray(
          selectedTicket.conversation
        )
          ? selectedTicket.conversation
          : [];

      const updatedConversation = [
        ...currentConversation,
        newMessage,
      ];

      /*
       * El backend actualizará el mismo
       * ticket, no creará uno nuevo.
       */
      const response = await fetch(
        "/api/support/ticket",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ticketId:
              selectedTicket.id,

            userId:
              selectedTicket.user_id,

            username:
              selectedTicket.username,

            email:
              selectedTicket.email,

            category:
              selectedTicket.category,

            subject:
              selectedTicket.subject,

            messages:
              updatedConversation,

            sender: "admin",

            notifyAdmin: false,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "No se pudo enviar la respuesta."
        );
      }

      const updatedTicket: SupportTicket = {
        ...selectedTicket,

        conversation:
          updatedConversation,

        status:
          data?.status ||
          "IN_PROGRESS",

        updated_at:
          data?.updated_at ||
          new Date().toISOString(),
      };

      setSelectedTicket(
        updatedTicket
      );

      setTickets((current) =>
        current.map((ticket) =>
          ticket.id ===
          selectedTicket.id
            ? updatedTicket
            : ticket
        )
      );

      setReply("");
    } catch (error) {
      console.error(
        "ERROR RESPONDIENDO TICKET:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "No se pudo enviar la respuesta."
      );
    } finally {
      setReplyLoading(false);
    }
  }

  /*
   * =====================================================
   * CAMBIAR ESTADO
   * =====================================================
   */

  async function changeStatus(
    status: TicketStatus
  ) {
    if (
      !selectedTicket ||
      statusLoading
    ) {
      return;
    }

    try {
      setStatusLoading(true);
      setError("");

      const response = await fetch(
        "/api/support/ticket",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            ticketId:
              selectedTicket.id,

            userId:
              selectedTicket.user_id,

            username:
              selectedTicket.username,

            email:
              selectedTicket.email,

            category:
              selectedTicket.category,

            subject:
              selectedTicket.subject,

            messages:
              selectedTicket.conversation,

            status,

            sender: "admin",

            notifyAdmin: false,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "No se pudo actualizar el estado."
        );
      }

      const updatedTicket: SupportTicket = {
        ...selectedTicket,

        status:
          data?.status ||
          status,

        updated_at:
          data?.updated_at ||
          new Date().toISOString(),
      };

      setSelectedTicket(
        updatedTicket
      );

      setTickets((current) =>
        current.map((ticket) =>
          ticket.id ===
          selectedTicket.id
            ? updatedTicket
            : ticket
        )
      );
    } catch (error) {
      console.error(
        "ERROR ACTUALIZANDO ESTADO:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el estado."
      );
    } finally {
      setStatusLoading(false);
    }
  }

  /*
   * =====================================================
   * FILTROS
   * =====================================================
   */

  const filteredTickets =
    tickets.filter((ticket) => {
      if (filter === "ALL") {
        return true;
      }

      return ticket.status === filter;
    });

  const pendingCount =
    tickets.filter(
      (ticket) =>
        ticket.status === "PENDING"
    ).length;

  const inProgressCount =
    tickets.filter(
      (ticket) =>
        ticket.status ===
        "IN_PROGRESS"
    ).length;

  /*
   * =====================================================
   * FORMATO DE FECHA
   * =====================================================
   */

  function formatDate(
    value: string
  ) {
    try {
      return new Date(
        value
      ).toLocaleString("es-ES");
    } catch {
      return value;
    }
  }

  /*
   * =====================================================
   * TEXTO DE ESTADO
   * =====================================================
   */

  function statusLabel(
    status: TicketStatus
  ) {
    if (status === "COMPLETED") {
      return "FINALIZADA";
    }

    if (status === "IN_PROGRESS") {
      return "EN PROCESO";
    }

    return "PENDIENTE";
  }

  /*
   * =====================================================
   * LOADING
   * =====================================================
   */

  if (loading) {
    return (
      <main className="support-page">
        <div className="support-page-background" />

        <section className="support-content">
          <div
            className="support-main-card"
            style={{
              marginTop: "70px",
            }}
          >
            <div className="support-main-icon">
              👑
            </div>

            <h2>
              VERIFICANDO ACCESO
            </h2>

            <p>
              Comprobando permisos de
              administrador...
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (!authorized) {
    return null;
  }

  /*
   * =====================================================
   * TICKET ABIERTO
   * =====================================================
   */

  if (selectedTicket) {
    return (
      <main className="support-page">
        <div className="support-page-background" />

        <div className="support-chat-page">

          {/* HEADER */}

          <div className="support-chat-header">

            <button
              type="button"
              className="support-back-button"
              onClick={closeTicket}
            >
              ←
            </button>

            <div className="support-chat-title">

              <div className="support-chat-icon">
                👤
              </div>

              <div>
                <h2>
                  Consulta #
                  {selectedTicket.id}
                </h2>

                <p>
                  {selectedTicket.username ||
                    selectedTicket.email ||
                    "Cliente"}
                </p>
              </div>

            </div>

          </div>

          {/* DATOS DEL CLIENTE */}

          <div
            style={{
              padding:
                "12px 14px",
              borderBottom:
                "1px solid rgba(255,255,255,.08)",
              background:
                "rgba(8,8,8,.92)",
            }}
          >

            <div
              style={{
                color: "#fff",
                fontSize: "11px",
                fontWeight: 900,
                marginBottom: "5px",
              }}
            >
              {selectedTicket.subject}
            </div>

            <div
              style={{
                color: "#777",
                fontSize: "9px",
                lineHeight: 1.6,
              }}
            >
              <div>
                👤 Usuario:{" "}
                {selectedTicket.username ||
                  "Sin usuario"}
              </div>

              <div>
                📧 Email:{" "}
                {selectedTicket.email ||
                  "Sin email"}
              </div>

              <div>
                📂 Categoría:{" "}
                {selectedTicket.category}
              </div>

              <div>
                📅 Creada:{" "}
                {formatDate(
                  selectedTicket.created_at
                )}
              </div>

              <div>
                🔄 Actualizada:{" "}
                {formatDate(
                  selectedTicket.updated_at
                )}
              </div>
            </div>

          </div>

          {/* MENSAJES */}

          <div className="support-chat-messages">

            {selectedTicket.conversation.map(
              (chatMessage) => (
                <div
                  key={chatMessage.id}
                  className={`support-message ${
                    chatMessage.sender ===
                    "admin"
                      ? "support-message-user"
                      : chatMessage.sender ===
                        "user"
                      ? "support-message-ai"
                      : "support-message-ai"
                  }`}
                >

                  <div className="support-message-label">

                    {chatMessage.sender ===
                    "admin"
                      ? "Administrador"
                      : chatMessage.sender ===
                        "user"
                      ? "Cliente"
                      : "Soporte IA"}

                  </div>

                  <div className="support-message-bubble">

                    {chatMessage.text}

                  </div>

                </div>
              )
            )}

            <div ref={chatEndRef} />

          </div>

          {/* ERROR */}

          {error && (
            <div
              className="support-error"
              style={{
                margin:
                  "8px 12px",
              }}
            >
              {error}
            </div>
          )}

          {/* CONTROLES */}

          <div className="support-chat-bottom">

            {/* ESTADO */}

            <div
              style={{
                display: "flex",
                gap: "7px",
                padding:
                  "8px 10px",
                borderTop:
                  "1px solid rgba(255,255,255,.06)",
              }}
            >

              <button
                type="button"
                disabled={
                  statusLoading
                }
                onClick={() =>
                  changeStatus(
                    "PENDING"
                  )
                }
                style={{
                  flex: 1,
                  minHeight:
                    "36px",
                  border:
                    "1px solid rgba(255,255,255,.08)",
                  borderRadius:
                    "10px",
                  background:
                    selectedTicket.status ===
                    "PENDING"
                      ? "#e50914"
                      : "#111",
                  color:
                    "#fff",
                  fontSize:
                    "9px",
                  fontWeight:
                    900,
                }}
              >
                PENDIENTE
              </button>

              <button
                type="button"
                disabled={
                  statusLoading
                }
                onClick={() =>
                  changeStatus(
                    "IN_PROGRESS"
                  )
                }
                style={{
                  flex: 1,
                  minHeight:
                    "36px",
                  border:
                    "1px solid rgba(255,255,255,.08)",
                  borderRadius:
                    "10px",
                  background:
                    selectedTicket.status ===
                    "IN_PROGRESS"
                      ? "#e50914"
                      : "#111",
                  color:
                    "#fff",
                  fontSize:
                    "9px",
                  fontWeight:
                    900,
                }}
              >
                EN PROCESO
              </button>

              <button
                type="button"
                disabled={
                  statusLoading
                }
                onClick={() =>
                  changeStatus(
                    "COMPLETED"
                  )
                }
                style={{
                  flex: 1,
                  minHeight:
                    "36px",
                  border:
                    "1px solid rgba(255,255,255,.08)",
                  borderRadius:
                    "10px",
                  background:
                    selectedTicket.status ===
                    "COMPLETED"
                      ? "#16a34a"
                      : "#111",
                  color:
                    "#fff",
                  fontSize:
                    "9px",
                  fontWeight:
                    900,
                }}
              >
                FINALIZAR
              </button>

            </div>

            {/* RESPUESTA */}

            {selectedTicket.status !==
            "COMPLETED" ? (
              <form
                className="support-chat-input-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  sendReply();
                }}
              >

                <textarea
                  value={reply}
                  onChange={(event) =>
                    setReply(
                      event.target.value
                    )
                  }
                  placeholder="Responder al cliente..."
                  rows={1}
                  disabled={
                    replyLoading
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key ===
                        "Enter" &&
                      !event.shiftKey
                    ) {
                      event.preventDefault();

                      if (
                        reply.trim() &&
                        !replyLoading
                      ) {
                        sendReply();
                      }
                    }
                  }}
                />

                <button
                                    type="submit"
                  className="support-send-button"
                  disabled={
                    replyLoading ||
                    !reply.trim()
                  }
                >
                  {replyLoading
                    ? "..."
                    : "➤"}
                </button>

              </form>
            ) : (
              <div className="support-ticket-created">

                <div className="support-ticket-created-icon">
                  ✅
                </div>

                <strong>
                  Consulta finalizada
                </strong>

                <span>
                  Esta conversación está
                  marcada como completada.
                </span>

              </div>
            )}

          </div>

        </div>
      </main>
    );
  }

  /*
   * =====================================================
   * LISTA DE TICKETS
   * =====================================================
   */

  return (
    <main className="support-page">

      <div className="support-page-background" />

      <section className="support-content">

        {/* HEADER */}

        <div className="support-header">

          <button
            type="button"
            className="support-back-button"
            onClick={() =>
              router.push("/admin")
            }
          >
            ←
          </button>

          <div className="support-header-title">

            <span>
              🆘
            </span>

            <div>
              <h1>
                Soporte
              </h1>

              <p>
                Consultas y problemas de clientes
              </p>
            </div>

          </div>

        </div>

        {/* RESUMEN */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(3,1fr)",
            gap: "8px",
            marginTop: "20px",
          }}
        >

          <div
            style={{
              padding:
                "14px 8px",
              textAlign:
                "center",
              border:
                "1px solid rgba(255,255,255,.08)",
              borderRadius:
                "14px",
              background:
                "rgba(12,12,12,.94)",
            }}
          >
            <strong
              style={{
                display:
                  "block",
                color:
                  "#fff",
                fontSize:
                  "18px",
              }}
            >
              {tickets.length}
            </strong>

            <span
              style={{
                color:
                  "#777",
                fontSize:
                  "8px",
                fontWeight:
                  900,
              }}
            >
              TODAS
            </span>
          </div>

          <div
            style={{
              padding:
                "14px 8px",
              textAlign:
                "center",
              border:
                "1px solid rgba(229,9,20,.2)",
              borderRadius:
                "14px",
              background:
                "rgba(229,9,20,.06)",
            }}
          >
            <strong
              style={{
                display:
                  "block",
                color:
                  "#e50914",
                fontSize:
                  "18px",
              }}
            >
              {pendingCount}
            </strong>

            <span
              style={{
                color:
                  "#777",
                fontSize:
                  "8px",
                fontWeight:
                  900,
              }}
            >
              PENDIENTES
            </span>
          </div>

          <div
            style={{
              padding:
                "14px 8px",
              textAlign:
                "center",
              border:
                "1px solid rgba(255,255,255,.08)",
              borderRadius:
                "14px",
              background:
                "rgba(12,12,12,.94)",
            }}
          >
            <strong
              style={{
                display:
                  "block",
                color:
                  "#fff",
                fontSize:
                  "18px",
              }}
            >
              {inProgressCount}
            </strong>

            <span
              style={{
                color:
                  "#777",
                fontSize:
                  "8px",
                fontWeight:
                  900,
              }}
            >
              EN PROCESO
            </span>
          </div>

        </div>

        {/* FILTROS */}

        <div
          style={{
            display:
              "flex",
            gap:
              "7px",
            overflowX:
              "auto",
            padding:
              "16px 0 8px",
          }}
        >

          {(
            [
              ["ALL", "TODAS"],
              ["PENDING", "PENDIENTES"],
              ["IN_PROGRESS", "EN PROCESO"],
              ["COMPLETED", "FINALIZADAS"],
            ] as const
          ).map(
            ([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setFilter(
                    value
                  )
                }
                style={{
                  flex:
                    "0 0 auto",
                  minHeight:
                    "36px",
                  padding:
                    "0 13px",
                  border:
                    "1px solid rgba(255,255,255,.08)",
                  borderRadius:
                    "11px",
                  background:
                    filter ===
                    value
                      ? "#e50914"
                      : "#111",
                  color:
                    "#fff",
                  fontSize:
                    "9px",
                  fontWeight:
                    900,
                }}
              >
                {label}
              </button>
            )
          )}

        </div>

        {/* ERROR */}

        {error && (
          <div className="support-error">
            {error}
          </div>
        )}

        {/* LISTA */}

        <div
          style={{
            marginTop:
              "10px",
            paddingBottom:
              "30px",
          }}
        >

          {ticketsLoading ? (
            <div className="support-empty">

              <div className="support-empty-icon">
                ⏳
              </div>

              <h3>
                Cargando consultas...
              </h3>

              <p>
                Obteniendo los tickets
                registrados.
              </p>

            </div>
          ) : filteredTickets.length ===
            0 ? (
            <div className="support-empty">

              <div className="support-empty-icon">
                💬
              </div>

              <h3>
                No hay consultas
              </h3>

              <p>
                No existen tickets dentro
                del filtro seleccionado.
              </p>

            </div>
          ) : (
            <div className="support-ticket-list">

              {filteredTickets.map(
                (ticket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    className="support-ticket-card"
                    onClick={() =>
                      openTicket(
                        ticket
                      )
                    }
                  >

                    <div className="support-ticket-card-top">

                      <span className="support-ticket-id">
                        #{ticket.id}
                      </span>

                      <span
                        className={`support-ticket-status ${
                          ticket.status ===
                          "COMPLETED"
                            ? "completed"
                            : ticket.status ===
                              "IN_PROGRESS"
                            ? "in-progress"
                            : "pending"
                        }`}
                      >
                        {statusLabel(
                          ticket.status
                        )}
                      </span>

                    </div>

                    <div className="support-ticket-category">
                      {ticket.category}
                    </div>

                    <div className="support-ticket-subject">
                      {ticket.subject}
                    </div>

                    <div
                      style={{
                        marginTop:
                          "7px",
                        color:
                          "#aaa",
                        fontSize:
                          "9px",
                      }}
                    >
                      👤{" "}
                      {ticket.username ||
                        "Sin usuario"}
                    </div>

                    <div
                      style={{
                        color:
                          "#777",
                        fontSize:
                          "9px",
                        marginTop:
                          "3px",
                      }}
                    >
                      📧{" "}
                      {ticket.email ||
                        "Sin email"}
                    </div>

                    <div className="support-ticket-date">
                      {formatDate(
                        ticket.updated_at ||
                          ticket.created_at
                      )}
                    </div>

                  </button>
                )
              )}

            </div>
          )}

        </div>

        {/* ACTUALIZAR */}

        <button
          type="button"
          className="support-submit-button"
          onClick={loadTickets}
          disabled={
            ticketsLoading
          }
        >
          🔄 ACTUALIZAR CONSULTAS
        </button>

      </section>

    </main>
  );
}
