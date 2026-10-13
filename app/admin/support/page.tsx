
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type ChatMessage = {
  id?: string | number;
  sender: "ai" | "user" | "admin";
  text?: string;
  message?: string;
  created_at?: string;
};

type TicketStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

type SupportTicket = {
  id: string | number;
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

const ADMIN_EMAIL = "juliocesarblancomedina08@gmail.com";

function normalizeMessage(
  message: ChatMessage,
  index: number
): ChatMessage {
  return {
    id: message.id ?? `${message.created_at ?? "message"}-${index}`,
    sender: ["ai", "user", "admin"].includes(message.sender)
      ? message.sender
      : "ai",
    text: message.text ?? message.message ?? "",
    created_at: message.created_at,
  };
}

function normalizeTicket(ticket: SupportTicket): SupportTicket {
  return {
    ...ticket,
    category: ticket.category || "Otro/pregunta",
    subject: ticket.subject || "Solicitud de soporte",
    message: ticket.message || "",
    conversation: Array.isArray(ticket.conversation)
      ? ticket.conversation.map((message, index) =>
          normalizeMessage(message, index)
        )
      : [],
    status: ticket.status || "PENDING",
  };
}

function getErrorMessage(data: any, fallback: string): string {
  return typeof data?.error === "string" ? data.error : fallback;
}

export default function AdminSupportPage() {
  const router = useRouter();
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] =
    useState<SupportTicket | null>(null);
  const [reply, setReply] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"ALL" | TicketStatus>("ALL");

  // Obtener el token real de la sesión de Supabase.
  const getAccessToken = useCallback(async () => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      throw new Error(
        "Tu sesión ha expirado. Cierra sesión e inicia sesión nuevamente."
      );
    }

    return session.access_token;
  }, []);

  // Todas las llamadas a la API incluyen autenticación.
  const apiFetch = useCallback(
    async (url: string, init: RequestInit = {}) => {
      const token = await getAccessToken();
      const headers = new Headers(init.headers);

      headers.set("Authorization", `Bearer ${token}`);

      if (init.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }

      return fetch(url, {
        ...init,
        headers,
        cache: "no-store",
      });
    },
    [getAccessToken]
  );

  // Cargar tickets y mantener sincronizada la conversación abierta.
  const loadTickets = useCallback(async () => {
    try {
      setTicketsLoading(true);
      setError("");

      const response = await apiFetch("/api/support/tickets", {
        method: "GET",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "No se pudieron cargar los tickets.")
        );
      }

      if (data?.isAdmin === false) {
        throw new Error(
          "El servidor no reconoce esta cuenta como administradora."
        );
      }

      if (!Array.isArray(data?.tickets)) {
        throw new Error(
          "La API no devolvió una lista válida de tickets."
        );
      }

      const loadedTickets: SupportTicket[] =
        data.tickets.map(normalizeTicket);

      setTickets(loadedTickets);

      setSelectedTicket((current) => {
        if (!current) return null;

        const refreshed = loadedTickets.find(
          (ticket) => String(ticket.id) === String(current.id)
        );

        return refreshed ?? current;
      });
    } catch (err) {
      console.error("ERROR CARGANDO SOPORTE ADMIN:", err);

      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los tickets."
      );
    } finally {
      setTicketsLoading(false);
    }
  }, [apiFetch]);

  // Comprobar la cuenta antes de mostrar el panel.
  useEffect(() => {
    let active = true;

    async function verifyAdmin() {
      try {
        setLoading(true);
        setError("");

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          router.replace("/");
          return;
        }

        const email = session.user.email?.trim().toLowerCase();

        if (email !== ADMIN_EMAIL.toLowerCase()) {
          setError(
            "Esta cuenta no tiene acceso al panel de administración."
          );
          router.replace("/home");
          return;
        }

        if (active) {
          setAuthorized(true);
          await loadTickets();
        }
      } catch (err) {
        console.error("ERROR VERIFICANDO ADMIN:", err);

        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo verificar el acceso."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void verifyAdmin();

    return () => {
      active = false;
    };
  }, [loadTickets, router]);

  useEffect(() => {
    if (selectedTicket) {
      chatEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [
    selectedTicket?.id,
    selectedTicket?.conversation,
  ]);

  // Enviar solamente el mensaje nuevo.
  // La API debe guardarlo en la conversación de Supabase.
  async function sendReply() {
    const text = reply.trim();

    if (
      !selectedTicket ||
      !text ||
      replyLoading ||
      selectedTicket.status === "COMPLETED"
    ) {
      return;
    }

    const ticketId = selectedTicket.id;

    try {
      setReplyLoading(true);
      setError("");

      const response = await apiFetch("/api/support/ticket", {
        method: "POST",
        body: JSON.stringify({
          ticketId,
          message: text,
        }),
      });

      const data = await response.json();

      if (!response.ok || data?.success !== true) {
        throw new Error(
          getErrorMessage(data, "No se pudo enviar la respuesta.")
        );
      }

      // No borrar el texto hasta que el servidor confirme el envío.
      setReply("");

      // Mostrar el ticket devuelto por el servidor.
      if (data.ticket) {
        const updated = normalizeTicket(data.ticket);

        setSelectedTicket(updated);

        setTickets((current) =>
          current.map((ticket) =>
            String(ticket.id) === String(updated.id)
              ? updated
              : ticket
          )
        );
      }

      // Confirmar la conversación guardada en el servidor.
      await loadTickets();
    } catch (err) {
      console.error("ERROR RESPONDIENDO TICKET:", err);

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo enviar la respuesta."
      );
    } finally {
      setReplyLoading(false);
    }
  }

  // Cambiar estado sin necesidad de enviar un mensaje.
  async function changeStatus(status: TicketStatus) {
    if (
      !selectedTicket ||
      statusLoading ||
      selectedTicket.status === status
    ) {
      return;
    }

    const ticketId = selectedTicket.id;

    try {
      setStatusLoading(true);
      setError("");

      const response = await apiFetch("/api/support/ticket", {
        method: "POST",
        body: JSON.stringify({
          ticketId,
          status,
        }),
      });

      const data = await response.json();

      if (!response.ok || data?.success !== true) {
        throw new Error(
          getErrorMessage(data, "No se pudo actualizar el estado.")
        );
      }

      if (data.ticket) {
        const updated = normalizeTicket(data.ticket);

        setSelectedTicket(updated);

        setTickets((current) =>
          current.map((ticket) =>
            String(ticket.id) === String(updated.id)
              ? updated
              : ticket
          )
        );
      } else if (data.status) {
        setSelectedTicket((current) =>
          current &&
          String(current.id) === String(ticketId)
            ? {
                ...current,
                status: data.status as TicketStatus,
                updated_at:
                  data.updated_at || new Date().toISOString(),
              }
            : current
        );
      }

      // Volver a consultar para comprobar el estado persistido.
      await loadTickets();
    } catch (err) {
      console.error("ERROR ACTUALIZANDO ESTADO:", err);

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo actualizar el estado."
      );
    } finally {
      setStatusLoading(false);
    }
  }

  function openTicket(ticket: SupportTicket) {
    setSelectedTicket(ticket);
    setReply("");
    setError("");
  }

  function formatDate(value?: string) {
    if (!value) return "Fecha no disponible";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleString("es-ES");
  }

  const filteredTickets = tickets.filter(
    (ticket) =>
      filter === "ALL" || ticket.status === filter
  );

  const pendingCount = tickets.filter(
    (ticket) => ticket.status === "PENDING"
  ).length;

  const inProgressCount = tickets.filter(
    (ticket) => ticket.status === "IN_PROGRESS"
  ).length;

  const completedCount = tickets.filter(
    (ticket) => ticket.status === "COMPLETED"
  ).length;

  if (loading) {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <div style={styles.bigIcon}>👑</div>
          <h2>VERIFICANDO ACCESO</h2>
          <p style={styles.muted}>Comprobando tu sesión...</p>
        </section>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <div style={styles.bigIcon}>🔒</div>
          <h2>ACCESO NO DISPONIBLE</h2>
          <p style={styles.muted}>
            {error || "No se pudo verificar el acceso al panel."}
          </p>
          <button
            style={styles.button}
            onClick={() => router.push("/home")}
          >
            VOLVER
          </button>
        </section>
      </main>
    );
  }

  if (selectedTicket) {
    return (
      <main style={styles.page}>
        <section style={styles.panel}>
          <header style={styles.header}>
            <button
              type="button"
              style={styles.smallButton}
              onClick={() => {
                setSelectedTicket(null);
                setError("");
              }}
            >
              ← Volver
            </button>

            <div>
              <h1 style={styles.heading}>
                Consulta #{selectedTicket.id}
              </h1>
              <p style={styles.muted}>
                {selectedTicket.username ||
                  selectedTicket.email ||
                  "Cliente"}
              </p>
            </div>

            <button
              type="button"
              style={styles.smallButton}
              disabled={ticketsLoading}
              onClick={() => void loadTickets()}
            >
              {ticketsLoading ? "..." : "↻ Actualizar"}
            </button>
          </header>

          <div style={styles.ticketInfo}>
            <strong>{selectedTicket.subject}</strong>
            <p>{selectedTicket.category}</p>
            <p>
              Correo: {selectedTicket.email || "No disponible"}
            </p>
            <p>Creada: {formatDate(selectedTicket.created_at)}</p>
            <p>
              Estado: <strong>{selectedTicket.status}</strong>
            </p>
          </div>

          <div style={styles.messages}>
            {selectedTicket.conversation.map((item, index) => {
              const sender = item.sender || "ai";
              const text = item.text ?? item.message ?? "";

              return (
                <div
                  key={`${String(item.id ?? index)}-${index}`}
                  style={{
                    ...styles.message,
                    alignSelf:
                      sender === "admin" ? "flex-end" : "flex-start",
                    background:
                      sender === "admin" ? "#8d080f" : "#1b1b1b",
                  }}
                >
                  <strong style={styles.messageLabel}>
                    {sender === "admin"
                      ? "Administrador"
                      : sender === "user"
                        ? "Cliente"
                        : "Soporte IA"}
                  </strong>

                  <div
                    style={{
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {text}
                  </div>

                  {item.created_at && (
                    <small style={styles.messageTime}>
                      {formatDate(item.created_at)}
                    </small>
                  )}
                </div>
              );
            })}

            {selectedTicket.conversation.length === 0 && (
              <p style={styles.muted}>
                No hay mensajes en esta conversación.
              </p>
            )}

            <div ref={chatEndRef} />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.statusButtons}>
            <button
              type="button"
              style={
                selectedTicket.status === "PENDING"
                  ? styles.button
                  : styles.secondary
              }
              disabled={statusLoading}
              onClick={() => void changeStatus("PENDING")}
            >
              {statusLoading &&
              selectedTicket.status !== "PENDING"
                ? "ACTUALIZANDO..."
                : "PENDIENTE"}
            </button>

            <button
              type="button"
              style={
                selectedTicket.status === "IN_PROGRESS"
                  ? styles.button
                  : styles.secondary
              }
              disabled={statusLoading}
              onClick={() => void changeStatus("IN_PROGRESS")}
            >
              EN PROCESO
            </button>

            <button
              type="button"
              style={
                selectedTicket.status === "COMPLETED"
                  ? styles.button
                  : styles.secondary
              }
              disabled={statusLoading}
              onClick={() => void changeStatus("COMPLETED")}
            >
              {statusLoading &&
              selectedTicket.status !== "COMPLETED"
                ? "ACTUALIZANDO..."
                : "FINALIZAR"}
            </button>
          </div>

          {selectedTicket.status === "COMPLETED" && (
            <div style={styles.notice}>
              Este ticket está finalizado. Si necesitas contestar,
              cambia primero su estado a pendiente o en proceso.
            </div>
          )}

          {selectedTicket.status !== "COMPLETED" && (
            <form
              style={styles.replyForm}
              onSubmit={(event) => {
                event.preventDefault();
                void sendReply();
              }}
            >
              <textarea
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                placeholder="Escribe tu respuesta al cliente..."
                rows={3}
                maxLength={4000}
                style={styles.textarea}
                disabled={replyLoading}
              />

              <button
                type="submit"
                style={styles.button}
                disabled={replyLoading || !reply.trim()}
              >
                {replyLoading
                  ? "ENVIANDO RESPUESTA..."
                  : "📨 ENVIAR RESPUESTA"}
              </button>
            </form>
          )}
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <section style={styles.panel}>
        <header style={styles.header}>
          <button
            type="button"
            style={styles.smallButton}
            onClick={() => router.push("/admin")}
          >
            ← Panel
          </button>

          <div>
            <h1 style={styles.heading}>🆘 Soporte</h1>
            <p style={styles.muted}>
              Administración de consultas de clientes
            </p>
          </div>
        </header>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.stats}>
          <div style={styles.stat}>
            <strong>{tickets.length}</strong>
            <span>TODAS</span>
          </div>

          <div style={styles.stat}>
            <strong>{pendingCount}</strong>
            <span>PENDIENTES</span>
          </div>

          <div style={styles.stat}>
            <strong>{inProgressCount}</strong>
            <span>EN PROCESO</span>
          </div>

          <div style={styles.stat}>
            <strong>{completedCount}</strong>
            <span>FINALIZADAS</span>
          </div>
        </div>

        <div style={styles.filters}>
          {(
            [
              ["ALL", "Todas"],
              ["PENDING", "Pendientes"],
              ["IN_PROGRESS", "En proceso"],
              ["COMPLETED", "Finalizadas"],
            ] as const
          ).map(([value, label]) => (
            <button
              type="button"
              key={value}
              style={
                filter === value ? styles.button : styles.secondary
              }
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>

        {ticketsLoading ? (
          <p style={styles.muted}>Cargando consultas...</p>
        ) : filteredTickets.length === 0 ? (
          <section style={styles.card}>
            <div style={styles.bigIcon}>📭</div>
            <h2>No hay consultas</h2>
            <p style={styles.muted}>
              No hay tickets para mostrar con este filtro.
            </p>
          </section>
        ) : (
          <div style={styles.ticketList}>
            {filteredTickets.map((ticket) => (
              <button
                type="button"
                key={String(ticket.id)}
                style={styles.ticketCard}
                onClick={() => openTicket(ticket)}
              >
                <div style={styles.ticketTop}>
                  <strong>
                    #{ticket.id} · {ticket.subject}
                  </strong>
                  <span style={styles.status}>
                    {ticket.status}
                  </span>
                </div>

                <p style={styles.muted}>{ticket.category}</p>

                <p style={styles.muted}>
                  Cliente:{" "}
                  {ticket.username ||
                    ticket.email ||
                    "No identificado"}
                </p>

                <small style={styles.muted}>
                  Actualizado: {formatDate(ticket.updated_at)}
                </small>
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          style={styles.button}
          disabled={ticketsLoading}
          onClick={() => void loadTickets()}
        >
          {ticketsLoading
            ? "ACTUALIZANDO..."
            : "🔄 ACTUALIZAR CONSULTAS"}
        </button>
      </section>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100dvh",
    background: "#050505",
    color: "#fff",
    padding: "24px 12px",
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  panel: {
    width: "min(100%, 850px)",
    margin: "0 auto",
  },
  card: {
    width: "min(100%, 560px)",
    margin: "60px auto",
    padding: "28px 20px",
    border: "1px solid #292929",
    borderRadius: 20,
    background: "#111",
    textAlign: "center",
  },
  bigIcon: {
    fontSize: 38,
    marginBottom: 14,
  },
  header: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 22,
  },
  heading: {
    margin: 0,
    fontSize: 23,
    fontWeight: 900,
  },
  muted: {
    color: "#999",
    fontSize: 12,
    lineHeight: 1.6,
  },
  smallButton: {
    padding: "10px 13px",
    border: "1px solid #333",
    borderRadius: 10,
    background: "#171717",
    color: "#fff",
    cursor: "pointer",
  },
  button: {
    padding: "12px 15px",
    border: "1px solid #bd1019",
    borderRadius: 10,
    background: "#d10d17",
    color: "#fff",
    fontSize: 11,
    fontWeight: 900,
    cursor: "pointer",
  },
  secondary: {
    padding: "12px 15px",
    border: "1px solid #333",
    borderRadius: 10,
    background: "#151515",
    color: "#fff",
    fontSize: 11,
    fontWeight: 900,
    cursor: "pointer",
  },
  error: {
    margin: "12px 0",
    padding: 13,
    border: "1px solid #7f1d1d",
    borderRadius: 10,
    background: "#25090b",
    color: "#ff9a9f",
    fontSize: 12,
    overflowWrap: "anywhere",
  },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
    gap: 9,
    marginBottom: 16,
  },
  stat: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    alignItems: "center",
    padding: 15,
    border: "1px solid #292929",
    borderRadius: 13,
    background: "#111",
  },
  filters: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },
  ticketList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginBottom: 18,
  },
  ticketCard: {
    width: "100%",
    padding: 16,
    border: "1px solid #292929",
    borderRadius: 14,
    background: "#111",
    color: "#fff",
    textAlign: "left",
    cursor: "pointer",
  },
  ticketTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
  },
  status: {
    color: "#ff777e",
    fontSize: 10,
    fontWeight: 900,
  },
  ticketInfo: {
    padding: 15,
    marginBottom: 12,
    border: "1px solid #292929",
    borderRadius: 13,
    background: "#101010",
    fontSize: 12,
    overflowWrap: "anywhere",
  },
  messages: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    maxHeight: "48dvh",
    overflowY: "auto",
    padding: 12,
    border: "1px solid #222",
    borderRadius: 13,
    background: "#090909",
  },
  message: {
    maxWidth: "85%",
    padding: 12,
    border: "1px solid #333",
    borderRadius: 13,
    fontSize: 13,
    lineHeight: 1.6,
    overflowWrap: "anywhere",
  },
  messageLabel: {
    display: "block",
    marginBottom: 6,
    fontSize: 10,
    color: "#ffb4b8",
  },
  messageTime: {
    display: "block",
    marginTop: 6,
    color: "#ccc",
    fontSize: 9,
  },
  statusButtons: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    margin: "12px 0",
  },
  replyForm: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  textarea: {
    width: "100%",
    padding: 13,
    border: "1px solid #333",
    borderRadius: 12,
    background: "#111",
    color: "#fff",
    font: "inherit",
    fontSize: 13,
    resize: "vertical",
  },
  notice: {
    margin: "12px 0",
    padding: 12,
    border: "1px solid #5a4545",
    borderRadius: 10,
    background: "#171111",
    color: "#ffb4b8",
    fontSize: 12,
    lineHeight: 1.6,
  },
};
