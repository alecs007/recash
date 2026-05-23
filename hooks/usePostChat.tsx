"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRecashSocket } from "./useRecashSocket";

export interface ChatMessage {
  id: string;
  postId: string;
  senderId: string;
  senderName: string | null;
  senderImage: string | null;
  text: string;
  createdAt: string;
}

export function usePostChat(
  postId: string,
  userId: string,
  isParticipant: boolean,
  isOpen: boolean,
  onUnreadChange?: (updater: (n: number) => number) => void,
) {
  const { on, off } = useRecashSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [unread, setUnread] = useState(0);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);

  const loadedRef = useRef(false);
  const partnerTypingTimer = useRef<ReturnType<typeof setTimeout>>();
  const lastTypingSent = useRef(0);

  // Initial load
  useEffect(() => {
    if (!isParticipant || loadedRef.current) return;
    loadedRef.current = true;
    fetch(`/api/v1/posts/${postId}/chat`)
      .then((r) => r.json())
      .then((d) => {
        setMessages(d.messages ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [postId, isParticipant]);

  // Clear unread when opened
  useEffect(() => {
    if (isOpen) setUnread(0);
  }, [isOpen]);

  // WS: new message
  const handleMsg = useCallback(
    (payload: ChatMessage) => {
      if (payload.postId !== postId) return;
      setMessages((prev) =>
        prev.some((m) => m.id === payload.id) ? prev : [...prev, payload],
      );
      if (payload.senderId !== userId) {
        setIsPartnerTyping(false);
        clearTimeout(partnerTypingTimer.current);
        if (!isOpen) {
          setUnread((n) => n + 1);
          onUnreadChange?.((n) => n + 1);
        } else {
          setUnread(0);
          onUnreadChange?.(() => 0);
        }
      }
    },
    [postId, userId, isOpen, onUnreadChange],
  );

  // WS: typing
  const handleTyping = useCallback(
    (payload: { postId: string; senderId: string }) => {
      if (payload.postId !== postId || payload.senderId === userId) return;
      setIsPartnerTyping(true);
      clearTimeout(partnerTypingTimer.current);
      partnerTypingTimer.current = setTimeout(
        () => setIsPartnerTyping(false),
        3000,
      );
    },
    [postId, userId],
  );

  useEffect(() => {
    on("chat:message", handleMsg);
    on("chat:typing", handleTyping);
    return () => {
      off("chat:message", handleMsg);
      off("chat:typing", handleTyping);
    };
  }, [on, off, handleMsg, handleTyping]);

  // Client-side typing debounce (fire at most once per 2s)
  const sendTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingSent.current < 2000) return;
    lastTypingSent.current = now;
    fetch(`/api/v1/posts/${postId}/chat/typing`, { method: "POST" }).catch(
      () => {},
    );
  }, [postId]);

  const sendMessage = useCallback(
    async (text: string): Promise<boolean> => {
      setSending(true);
      setSendError("");
      try {
        const res = await fetch(`/api/v1/posts/${postId}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) {
          const j = await res.json();
          setSendError(j.error ?? "Eroare la trimitere");
          return false;
        }
        return true;
      } catch {
        setSendError("Eroare de rețea");
        return false;
      } finally {
        setSending(false);
      }
    },
    [postId],
  );

  return {
    messages,
    loading,
    sending,
    sendMessage,
    sendTyping,
    sendError,
    unread,
    isPartnerTyping,
  };
}
