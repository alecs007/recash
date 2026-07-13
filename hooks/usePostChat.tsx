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

function storageKey(postId: string, userId: string) {
  return `chat:${postId}:${userId}:lastSeenAt`;
}

function getLastSeenAt(postId: string, userId: string): string | null {
  try {
    return localStorage.getItem(storageKey(postId, userId));
  } catch {
    return null;
  }
}

function saveLastSeenAt(postId: string, userId: string, timestamp: string) {
  try {
    localStorage.setItem(storageKey(postId, userId), timestamp);
  } catch {}
}

function countUnread(
  messages: ChatMessage[],
  userId: string,
  lastSeenAt: string | null,
): number {
  if (!lastSeenAt) return 0;
  const cutoff = new Date(lastSeenAt).getTime();
  return messages.filter(
    (m) => m.senderId !== userId && new Date(m.createdAt).getTime() > cutoff,
  ).length;
}

function lastTimestamp(messages: ChatMessage[]): string | null {
  return messages.length > 0 ? messages[messages.length - 1].createdAt : null;
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
  const [prevPostId, setPrevPostId] = useState(postId);

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
      const ts = lastTimestamp(messages);
      if (ts) saveLastSeenAt(postId, userId, ts);
    }
  }

  if (postId !== prevPostId) {
    setPrevPostId(postId);
    setMessages([]);
    setLoading(true);
    setUnread(0);
    setIsPartnerTyping(false);
  }

  useEffect(() => {
    if (!isParticipant) return;

    // Guards against a slow response for a previous post landing in this
    // post's chat after the postId changed (stale-response race). Also makes
    // the effect re-runnable under StrictMode's mount/cleanup/mount cycle.
    let stale = false;

    fetch(`/api/v1/posts/${postId}/chat`)
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json() as Promise<{ messages?: ChatMessage[] }>;
      })
      .then((d) => {
        if (stale) return;
        const msgs = (d.messages ?? []).filter((m) => m.postId === postId);
        setMessages(msgs);

        if (isOpenRef.current) {
          // Panel is already open — treat everything as read immediately
          const ts = lastTimestamp(msgs);
          if (ts) saveLastSeenAt(postId, userId, ts);
          setUnread(0);
        } else {
          // Panel is closed — calculate how many messages the user missed
          const lastSeenAt = getLastSeenAt(postId, userId);
          setUnread(countUnread(msgs, userId, lastSeenAt));
        }
      })
      .catch(() => {
        // Non-fatal — messages will still arrive via WS
      })
      .finally(() => {
        if (!stale) setLoading(false);
      });

    return () => {
      stale = true;
    };
  }, [postId, isParticipant, userId]);

  const handleMsg = useCallback(
    (payload: ChatMessage) => {
      if (payload.postId !== postId) return;

      setMessages((prev) =>
        prev.some((m) => m.id === payload.id) ? prev : [...prev, payload],
      );

      if (payload.senderId !== userId) {
        setIsPartnerTyping(false);
        clearTimeout(partnerTypingTimer.current);

        if (isOpenRef.current) {
          saveLastSeenAt(postId, userId, payload.createdAt);
        } else {
          setUnread((n) => n + 1);
        }
      }
    },
    [postId, userId],
  );

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
