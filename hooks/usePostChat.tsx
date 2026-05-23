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
) {
  const { on, off } = useRecashSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [unread, setUnread] = useState(0);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);

  const fetchedForPost = useRef<string | null>(null);
  const partnerTypingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const lastTypingSent = useRef(0);

  const isOpenRef = useRef(isOpen);
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setUnread(0);
    }
  }

  useEffect(() => {
    if (!isParticipant) return;
    if (fetchedForPost.current === postId) return;
    fetchedForPost.current = postId;
    setLoading(true);
    setMessages([]);
    fetch(`/api/v1/posts/${postId}/chat`)
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json() as Promise<{ messages?: ChatMessage[] }>;
      })
      .then((d) => setMessages(d.messages ?? []))
      .catch(() => {
        // Non-fatal — messages will still arrive via WS
      })
      .finally(() => setLoading(false));
  }, [postId, isParticipant]);

  // WS: new chat message
  const handleMsg = useCallback(
    (payload: ChatMessage) => {
      if (payload.postId !== postId) return;
      setMessages((prev) =>
        prev.some((m) => m.id === payload.id) ? prev : [...prev, payload],
      );
      if (payload.senderId !== userId) {
        setIsPartnerTyping(false);
        clearTimeout(partnerTypingTimer.current);
        if (!isOpenRef.current) {
          setUnread((n) => n + 1);
        }
      }
    },
    [postId, userId],
  );

  // WS: partner typing indicator
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
          const j = (await res.json()) as { error?: string };
          setSendError(j.error ?? "Eroare la trimitere");
          return false;
        }
        setSendError("");
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
