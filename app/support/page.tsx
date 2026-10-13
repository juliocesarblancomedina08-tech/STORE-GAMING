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

const SUPPORT_CSS = `
  .support-page {
    position: relative;
    min-height: 100dvh;
    overflow-x: hidden;
    background: #050505;
    color: #fff;
    font-family: Arial, Helvetica, sans-serif;
    isolation: isolate;
  }

  .support-page-background {
    position: fixed;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    background:
      radial-gradient(ellipse at 50% 0%, rgba(229,9,20,.18), transparent 50%),
      radial-gradient(ellipse at 0% 70%, rgba(120,0,8,.12), transparent 40%),
      #050505;
  }

  .support-content {
    position: relative;
    width: min(100% - 28px, 760px);
    min-height: 100dvh;
    margin: 0 auto;
    padding: 22px 0 35px;
    box-sizing: border-box;
  }

  .support-header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 24px;
  }

  .support-back-button {
    display: flex;
    flex: 0 0 42px;
    width: 42px;
    height: 42px;
    align-items: center;
    justify-content: center;
    border: 1px solid #303030;
    border-radius: 13px;
    background: #141414;
    color: #fff;
    font-size: 25px;
    cursor: pointer;
    transition: background .2s, border-color .2s;
  }

  .support-back-button:hover {
    background: #252525;
    border-color: #e50914;
  }

  .support-header-title {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 10px;
  }

  .support-header-title > span {
    font-size: 25px;
  }

  .support-header-title h1 {
    margin: 0;
    color: #fff;
    font-size: clamp(20px, 4vw, 27px);
    font-weight: 900;
    letter-spacing: -.5px;
  }

  .support-main-card {
    padding: 28px 22px;
    border: 1px solid rgba(255,255,255,.09);
    border-radius: 22px;
    background: linear-gradient(145deg, #151515, #0b0b0b 70%);
    box-shadow: 0 18px 45px rgba(0,0,0,.3);
    text-align: center;
  }

  .support-main-icon {
    display: flex;
    width: 76px;
    height: 76px;
    align-items: center;
    justify-content: center;
    margin: 0 auto 18px;
    border: 1px solid rgba(255,255,255,.14);
    border-radius: 23px;
    background: linear-gradient(145deg, #e50914, #750008);
    box-shadow: 0 10px 30px rgba(229,9,20,.2);
    font-size: 34px;
  }

  .support-main-card h2 {
    margin: 0 0 12px;
    color: #fff;
    font-size: clamp(20px, 4vw, 25px);
    font-weight: 900;
  }

  .support-main-card p {
    max-width: 480px;
    margin: 0 auto 22px;
    color: #a5a5a5;
    font-size: 14px;
    line-height: 1.7;
  }

  .support-main-button,
  .support-secondary-button,
  .support-submit-button {
    display: inline-flex;
    min-height: 48px;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 13px 18px;
    border: 1px solid rgba(255,255,255,.12);
    border-radius: 13px;
    color: #fff;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: .35px;
    cursor: pointer;
    transition: transform .2s, filter .2s, background .2s;
  }

  .support-main-button,
  .support-submit-button {
    background: linear-gradient(135deg, #f01825, #970009);
    box-shadow: 0 8px 22px rgba(229,9,20,.16);
  }

  .support-secondary-button {
    margin-top: 10px;
    background: #191919;
  }

  .support-main-button:hover,
  .support-secondary-button:hover,
  .support-submit-button:hover {
    filter: brightness(1.13);
    transform: translateY(-1px);
  }

  .support-form {
    display: flex;
    flex-direction: column;
    gap: 19px;
    margin-top: 20px;
    padding: 24px;
    border: 1px solid rgba(255,255,255,.09);
    border-radius: 20px;
    background: #0d0d0d;
    box-shadow: 0 15px 35px rgba(0,0,0,.24);
  }

  .support-field {
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .support-field label {
    color: #e6e6e6;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 1px;
  }

  .support-field input,
  .support-field select,
  .support-field textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 14px;
    border: 1px solid #303030;
    border-radius: 12px;
    outline: none;
    background: #151515;
    color: #fff;
    font: inherit;
    font-size: 14px;
    transition: border-color .2s, box-shadow .2s;
  }

  .support-field select {
    color-scheme: dark;
  }

  .support-field textarea {
    min-height: 130px;
    resize: vertical;
    line-height: 1.6;
  }

  .support-field input::placeholder,
  .support-field textarea::placeholder {
    color: #666;
  }

  .support-field input:focus,
  .support-field select:focus,
  .support-field textarea:focus {
    border-color: #e50914;
    box-shadow: 0 0 0 3px rgba(229,9,20,.12);
  }

  .support-field input:disabled,
  .support-field select:disabled,
  .support-field textarea:disabled {
    opacity: .6;
    cursor: not-allowed;
  }

  .support-form .support-submit-button {
    width: 100%;
    min-height: 52px;
  }

  .support-error {
    margin: 15px 0;
    padding: 13px 15px;
    border: 1px solid rgba(229,9,20,.35);
    border-radius: 12px;
    background: rgba(229,9,20,.09);
    color: #ff8b91;
    font-size: 13px;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }

  .support-tickets-list {
    display: flex;
    flex-direction: column;
    gap: 13px;
  }

  .support-item {
    display: flex;
    width: 100%;
    align-items: center;
    gap: 14px;
    padding: 17px;
    border: 1px solid #282828;
    border-radius: 16px;
    background: linear-gradient(135deg, #151515, #0c0c0c);
    color: #fff;
    text-align: left;
    cursor: pointer;
    transition: border-color .2s, transform .2s;
  }

  .support-item:hover {
    border-color: rgba(229,9,20,.7);
    transform: translateY(-2px);
  }

  .support-item-icon {
    display: flex;
    flex: 0 0 44px;
    width: 44px;
    height: 44px;
    align-items: center;
    justify-content: center;
    border-radius: 13px;
    background: rgba(229,9,20,.14);
    font-size: 22px;
  }

  .support-item-content {
    flex: 1;
    min-width: 0;
  }

  .support-item-content strong {
    display: block;
    margin-bottom: 7px;
    font-size: 14px;
    overflow-wrap: anywhere;
  }

  .support-item-content p {
    margin: 0 0 8px;
    color: #999;
    font-size: 12px;
    line-height: 1.5;
  }

  .support-item-content span {
    display: inline-block;
    padding: 5px 8px;
    border: 1px solid rgba(229,9,20,.25);
    border-radius: 7px;
    background: rgba(229,9,20,.09);
    color: #ff777e;
    font-size: 10px;
    font-weight: 800;
  }

  .support-item > b {
    color: #e50914;
    font-size: 23px;
  }

  .support-user-info {
    display: flex;
    align-items: center;
    gap: 13px;
    margin-top: 20px;
    padding: 16px;
    border: 1px solid #262626;
    border-radius: 15px;
    background: #101010;
  }

  .support-user-info > span {
    display: flex;
    width: 42px;
    height: 42px;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #222;
    font-size: 21px;
  }

  .support-user-info strong {
    color: #fff;
    font-size: 13px;
  }

  .support-user-info p {
    margin: 5px 0 0;
    color: #888;
    font-size: 12px;
    overflow-wrap: anywhere;
  }

  .game-service-footer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 7px;
    margin-top: 30px;
    padding: 20px 0;
    border-top: 1px solid #202020;
    text-align: center;
  }

  .game-service-footer strong {
    color: #fff;
    font-size: 15px;
    font-weight: 950;
  }

  .game-service-footer span {
    color: #777;
    font-size: 10px;
    letter-spacing: 2px;
  }

  .support-floating-button {
    position: fixed;
    right: max(20px, env(safe-area-inset-right));
    bottom: max(20px, env(safe-area-inset-bottom));
    z-index: 10;
    display: flex;
    width: 56px;
    height: 56px;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255,255,255,.2);
    border-radius: 50%;
    background: linear-gradient(135deg, #f01825, #8c0008);
    color: #fff;
    font-size: 24px;
    box-shadow: 0 8px 28px rgba(229,9,20,.3);
    cursor: pointer;
    transition: transform .2s;
  }

  .support-floating-button:hover {
    transform: scale(1.06);
  }

  .support-admin-button {
    cursor: pointer;
  }

  .support-admin-button:disabled,
  .support-send-button:disabled,
  .support-submit-button:disabled {
    opacity: .5;
    cursor: not-allowed;
    transform: none;
  }

  .support-chat-container {
    box-sizing: border-box;
  }

  .support-chat-messages {
    scrollbar-width: thin;
    scrollbar-color: #373737 #0b0b0b;
  }

  .support-chat-messages::-webkit-scrollbar {
    width: 5px;
  }

  .support-chat-messages::-webkit-scrollbar-thumb {
    border-radius: 10px;
    background: #383838;
  }

  .support-chat-input-row input:focus {
    border-color: #e50914 !important;
    box-shadow: 0 0 0 3px rgba(229,9,20,.1);
  }

  .support-send-button {
    cursor: pointer;
    transition: filter .2s, transform .2s;
  }

  .support-send-button:hover:not(:disabled) {
    filter: brightness(1.15);
    transform: scale(1.04);
  }

  @media (max-width: 600px) {
    .support-content {
      width: calc(100% - 22px);
      padding-top: 14px;
      padding-bottom: 24px;
    }

    .support-header {
      gap: 10px;
      margin-bottom: 17px;
    }

    .support-main-card {
      padding: 24px 16px;
      border-radius: 18px;
    }

    .support-form {
      padding: 17px;
      gap: 16px;
    }

    .support-item {
      gap: 10px;
      padding: 13px;
    }

    .support-chat-container {
      border-radius: 15px !important;
    }

    .support-floating-button {
      width: 50px;
      height: 50px;
      right: 14px;
      bottom: 14px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .support-page *,
    .support-page *::before,
    .support-page *::after {
      scroll-behavior: auto !important;
      transition-duration: .01ms !important;
    }
  }
`;

function SupportStyles() {
  return (
    <style jsx global>
      {SUPPORT_CSS}
    </style>
  );
}
