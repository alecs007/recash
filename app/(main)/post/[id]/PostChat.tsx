"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { X, Send, MessageCircle, Loader2, ChevronDown } from "lucide-react";
import { usePostChat, type ChatMessage } from "@/hooks/usePostChat";

const MAX_TEXT = 500;
const MIN_H = 44;
const MAX_H = 120;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({
  name,
  image,
  size = 28,
}: {
  name: string | null;
  image: string | null;
  size?: number;
}) {
  return image ? (
    <Image
      src={image}
      alt={name ?? ""}
      width={size}
      height={size}
      className="rounded-full object-cover shrink-0"
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      className="rounded-full bg-lime-100 border border-lime-200 flex items-center justify-center text-lime-800 font-bold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

// ─── Typing bubble ────────────────────────────────────────────────────────────

function TypingBubble({
  partnerImage,
  partnerName,
}: {
  partnerImage: string | null;
  partnerName: string | null;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 350, damping: 26 }}
      className="flex items-end gap-2"
    >
      {/* same avatar slot as partner messages */}
      <div className="w-7 shrink-0 self-end mb-1">
        <Avatar name={partnerName} image={partnerImage} size={28} />
      </div>
      <div className="flex items-center gap-[3px] px-4 py-3 bg-slate-100 rounded-2xl rounded-bl-[4px] shadow-sm">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block w-[5px] h-[5px] rounded-full bg-slate-400"
            animate={{ y: [0, -5, 0] }}
            transition={{
              duration: 0.65,
              repeat: Infinity,
              delay: i * 0.13,
              ease: [0.45, 0, 0.55, 1],
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Scroll-to-bottom pill ────────────────────────────────────────────────────

function ScrollPill({
  visible,
  unread,
  onClick,
}: {
  visible: boolean;
  unread: number;
  onClick: () => void;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 6 }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
          onClick={onClick}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white border border-slate-200 shadow-md px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer z-10 whitespace-nowrap"
        >
          {unread > 0 ? (
            <span className="text-lime-700">
              {unread} mesaj{unread > 1 ? "e" : ""} noi
            </span>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-600">Jos</span>
            </>
          )}
        </motion.button>
      )}
    </AnimatePresence>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  isMe,
  showAvatar,
  isLastInGroup,
  partnerImage,
  partnerName,
  doAnimate,
}: {
  msg: ChatMessage;
  isMe: boolean;
  showAvatar: boolean;
  isLastInGroup: boolean;
  partnerImage: string | null;
  partnerName: string | null;
  doAnimate: boolean;
}) {
  return (
    <motion.div
      // Only newly arrived messages get an entrance animation.
      // Initial batch renders without any animation to avoid jitter.
      initial={doAnimate ? { opacity: 0, y: 12, scale: 0.95 } : false}
      animate={doAnimate ? { opacity: 1, y: 0, scale: 1 } : undefined}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}
      style={{ originX: isMe ? 1 : 0, originY: 1 }}
    >
      {/* Avatar slot always reserved for partner messages so columns don't shift */}
      {!isMe && (
        <div className="w-7 shrink-0 self-end mb-1">
          {showAvatar && (
            <Avatar name={partnerName} image={partnerImage} size={28} />
          )}
        </div>
      )}

      <div
        className={`flex flex-col gap-[3px] max-w-[72%] ${
          isMe ? "items-end" : "items-start"
        }`}
      >
        <div
          className={`px-3.5 py-2.5 text-sm leading-relaxed break-words whitespace-pre-wrap shadow-sm ${
            isMe
              ? "bg-[#123424] text-white rounded-2xl rounded-br-[4px]"
              : "bg-slate-100 text-slate-900 rounded-2xl rounded-bl-[4px]"
          }`}
        >
          {msg.text}
        </div>

        {isLastInGroup && (
          <span
            className={`text-[10px] text-slate-400 px-1 tabular-nums ${
              isMe ? "text-right" : "text-left"
            }`}
          >
            {formatTime(msg.createdAt)}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ─── Grouping ─────────────────────────────────────────────────────────────────

interface Grouped {
  msg: ChatMessage;
  isFirst: boolean;
  isLast: boolean;
}

function groupMessages(msgs: ChatMessage[]): Grouped[] {
  return msgs.map((msg, i) => ({
    msg,
    isFirst: i === 0 || msgs[i - 1].senderId !== msg.senderId,
    isLast: i === msgs.length - 1 || msgs[i + 1].senderId !== msg.senderId,
  }));
}

// ─── PostChat ─────────────────────────────────────────────────────────────────

interface PostChatProps {
  postId: string;
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  isParticipant: boolean;
  partnerName: string | null;
  partnerImage: string | null;
  partnerRole: string;
}

export function PostChat({
  postId,
  userId,
  isOpen,
  onClose,
  isParticipant,
  partnerName,
  partnerImage,
  partnerRole,
}: PostChatProps) {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(true);

  // Show content only after we've scrolled to bottom (prevents flash of scrolling)
  const [contentVisible, setContentVisible] = useState(false);

  // Pill: show when user scrolls up + new messages arrive
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unreadWhileScrolled, setUnreadWhileScrolled] = useState(0);

  const {
    messages,
    loading,
    sending,
    sendMessage,
    sendTyping,
    sendError,
    isPartnerTyping,
  } = usePostChat(postId, userId, isParticipant, isOpen);

  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Refs — don't need to trigger re-renders
  const prevMsgLen = useRef(0);
  const isAtBottomRef = useRef(true); // shadow isAtBottom for use in effects
  const initialScrollDoneRef = useRef(false);
  // Track which IDs have been through an animation cycle already
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDoneRef = useRef(false); // true after first load completes

  const grouped = useMemo(() => groupMessages(messages), [messages]);

  // ── Mount / responsive ────────────────────────────────────────────────────

  useEffect(() => {
    setMounted(true);
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Reset state when chat closes ──────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) {
      setContentVisible(false);
      initialScrollDoneRef.current = false;
      initialLoadDoneRef.current = false;
      seenIdsRef.current = new Set();
      prevMsgLen.current = 0;
      setUnreadWhileScrolled(0);
      setIsAtBottom(true);
      isAtBottomRef.current = true;
    }
  }, [isOpen]);

  // ── iOS scroll lock ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen || !isMobile) return;
    const scrollY = window.scrollY;
    const origHTML = document.documentElement.style.overflow;
    const origBody = document.body.getAttribute("style") ?? "";
    document.documentElement.style.overflow = "hidden";
    document.body.style.cssText += `;overflow:hidden;position:fixed;top:-${scrollY}px;width:100%`;
    return () => {
      document.documentElement.style.overflow = origHTML;
      document.body.setAttribute("style", origBody);
      window.scrollTo(0, scrollY);
    };
  }, [isOpen, isMobile]);

  // ── Scroll helpers ────────────────────────────────────────────────────────

  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollRef.current;
    if (!el) return;
    if (!smooth) {
      el.scrollTop = el.scrollHeight;
      return;
    }
    // Simple smooth scroll via rAF
    const start = el.scrollTop;
    const end = el.scrollHeight - el.clientHeight;
    const dist = end - start;
    if (dist < 2) return;
    const dur = Math.min(280, Math.max(80, dist * 0.3));
    let t0 = 0;
    const step = (ts: number) => {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / dur, 1);
      el.scrollTop = start + dist * (1 - Math.pow(1 - p, 3));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, []);

  const checkAtBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setIsAtBottom(atBottom);
    isAtBottomRef.current = atBottom;
    if (atBottom) setUnreadWhileScrolled(0);
  }, []);

  // ── Initial scroll — happens once after panel opens and messages load ──────
  // We wait for the panel spring animation to settle (~300ms) then snap to bottom.
  // Content stays invisible until the snap is done.

  useEffect(() => {
    if (!isOpen || loading || initialScrollDoneRef.current) return;

    const timer = setTimeout(() => {
      scrollToBottom(false); // instant snap
      initialScrollDoneRef.current = true;
      setContentVisible(true);

      // Mark all initial messages as seen (no animation for them)
      messages.forEach((m) => seenIdsRef.current.add(m.id));
      initialLoadDoneRef.current = true;
      prevMsgLen.current = messages.length;
    }, 80); // after first rAF paint inside the panel

    return () => clearTimeout(timer);
  }, [isOpen, loading, messages, scrollToBottom]);

  // ── New messages after initial load ───────────────────────────────────────

  useEffect(() => {
    if (!initialLoadDoneRef.current) return;
    const curr = messages.length;
    const prev = prevMsgLen.current;
    if (curr <= prev) return;
    prevMsgLen.current = curr;

    if (isAtBottomRef.current) {
      scrollToBottom(true);
    } else {
      setUnreadWhileScrolled((n) => n + (curr - prev));
    }

    // Mark new messages as seen after their animation (350ms spring)
    const newMsgs = messages.slice(prev);
    const timer = setTimeout(() => {
      newMsgs.forEach((m) => seenIdsRef.current.add(m.id));
    }, 400);
    return () => clearTimeout(timer);
  }, [messages, scrollToBottom]);

  // Scroll when typing indicator appears
  useEffect(() => {
    if (isPartnerTyping && isAtBottomRef.current) {
      scrollToBottom(true);
    }
  }, [isPartnerTyping, scrollToBottom]);

  // ── Textarea auto-resize ──────────────────────────────────────────────────
  // Drive height purely from the text value. When empty → collapse to MIN_H.

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    if (!text) {
      el.style.height = `${MIN_H}px`;
      return;
    }
    el.style.height = `${MIN_H}px`; // collapse first so scrollHeight is accurate
    el.style.height = `${Math.min(el.scrollHeight, MAX_H)}px`;
  }, [text]);

  // Focus on open
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => textareaRef.current?.focus(), 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // ── Send ──────────────────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setText(""); // triggers useEffect → collapses textarea
    textareaRef.current?.focus();
    await sendMessage(trimmed);
  }, [text, sending, sendMessage]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value.slice(0, MAX_TEXT));
    if (e.target.value) sendTyping();
  };

  const firstName = partnerName?.split(" ")[0] ?? "partener";

  if (!mounted) return null;

  // ── Panel variants ────────────────────────────────────────────────────────

  const panelVariants: Variants = {
    hidden: isMobile ? { y: "100%" } : { y: 16, opacity: 0, scale: 0.97 },
    visible: isMobile
      ? {
          y: 0,
          transition: {
            type: "spring",
            damping: 32,
            stiffness: 300,
            mass: 0.9,
          },
        }
      : {
          y: 0,
          opacity: 1,
          scale: 1,
          transition: { type: "spring", damping: 26, stiffness: 340 },
        },
    exit: isMobile
      ? {
          y: "100%",
          transition: { type: "spring", damping: 36, stiffness: 320 },
        }
      : {
          y: 10,
          opacity: 0,
          scale: 0.97,
          transition: { duration: 0.16, ease: [0.4, 0, 1, 1] },
        },
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const chatContent = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="bd"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-[3px] z-[9998] lg:hidden touch-none"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={[
              "flex flex-col bg-white shadow-2xl",
              "fixed bottom-0 left-0 w-full z-[9999]",
              "rounded-t-3xl overflow-hidden h-[92dvh]",
              "lg:absolute lg:inset-0 lg:rounded-none lg:h-auto lg:w-auto lg:z-10",
            ].join(" ")}
          >
            {/* Drag handle */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-9 h-1 rounded-full bg-slate-200 lg:hidden z-10 pointer-events-none" />

            {/* ── Header ── */}
            <div className="shrink-0 flex items-center gap-3 px-4 pt-6 pb-3 lg:pt-3 border-b border-slate-100 bg-white">
              <div className="relative shrink-0">
                <Avatar name={partnerName} image={partnerImage} size={36} />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-lime-400 border-2 border-white" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 leading-tight truncate">
                  {partnerName ?? "Partener"}
                </p>
                <div className="h-[18px] relative overflow-hidden">
                  <AnimatePresence mode="wait">
                    {isPartnerTyping ? (
                      <motion.p
                        key="typing"
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -10, opacity: 0 }}
                        transition={{ duration: 0.13 }}
                        className="absolute text-[11px] text-lime-600 font-semibold"
                      >
                        scrie...
                      </motion.p>
                    ) : (
                      <motion.p
                        key="role"
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -10, opacity: 0 }}
                        transition={{ duration: 0.13 }}
                        className="absolute text-[11px] text-slate-400"
                      >
                        {partnerRole}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                aria-label="Închide"
              >
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            {/* ── Messages ── */}
            <div className="relative flex-1 min-h-0 overflow-hidden">
              <div
                ref={scrollRef}
                onScroll={checkAtBottom}
                className="h-full overflow-y-auto overscroll-y-contain px-4 py-4"
                data-lenis-prevent
                style={{
                  // Hide until initial scroll is done — prevents flash of wrong position
                  visibility: contentVisible ? "visible" : "hidden",
                  // Hide scrollbar
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                }}
              >
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
                      <p className="text-xs text-slate-400">Se încarcă...</p>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex flex-col items-center justify-center h-full gap-4 text-center px-6"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                      <MessageCircle className="w-6 h-6 text-slate-300" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-600 mb-1">
                        Niciun mesaj
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed max-w-[200px]">
                        Coordonează cu{" "}
                        <span className="font-medium text-slate-600">
                          {firstName}
                        </span>{" "}
                        direct aici.
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  // Plain div — NO layout animation on the container.
                  // Individual new messages get their own entrance animation.
                  <div className="flex flex-col gap-1.5">
                    {grouped.map(({ msg, isFirst, isLast }) => (
                      <MessageBubble
                        key={msg.id}
                        msg={msg}
                        isMe={msg.senderId === userId}
                        showAvatar={isFirst}
                        isLastInGroup={isLast}
                        partnerImage={partnerImage}
                        partnerName={partnerName}
                        // Animate only messages that haven't been seen yet
                        doAnimate={!seenIdsRef.current.has(msg.id)}
                      />
                    ))}

                    <AnimatePresence>
                      {isPartnerTyping && (
                        <TypingBubble
                          key="typing-indicator"
                          partnerImage={partnerImage}
                          partnerName={partnerName}
                        />
                      )}
                    </AnimatePresence>

                    {/* Spacer */}
                    <div className="h-1 shrink-0" aria-hidden />
                  </div>
                )}
              </div>

              <ScrollPill
                visible={!isAtBottom && contentVisible}
                unread={unreadWhileScrolled}
                onClick={() => {
                  scrollToBottom(true);
                  setUnreadWhileScrolled(0);
                }}
              />
            </div>

            {/* ── Send error ── */}
            <AnimatePresence>
              {sendError && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="shrink-0 overflow-hidden"
                >
                  <p className="text-xs text-red-500 font-medium px-4 py-1.5 bg-red-50 border-t border-red-100">
                    {sendError}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Input bar ── */}
            <div className="shrink-0 border-t border-slate-100 px-3 py-3 bg-white">
              <div className="flex items-end gap-2">
                {/* Textarea — no scrollbar, auto-height, collapses on send */}
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={handleTextChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Mesaj…"
                    rows={1}
                    className="w-full resize-none px-3.5 py-[11px] rounded-2xl border border-slate-200 focus:border-lime-400 focus:ring-2 focus:ring-lime-100/60 outline-none text-sm text-slate-900 placeholder:text-slate-400 transition-[border-color,box-shadow] bg-slate-50 leading-[1.45] overflow-hidden"
                    style={{
                      height: MIN_H,
                      minHeight: MIN_H,
                      maxHeight: MAX_H,
                      // Hide scrollbar in all browsers
                      scrollbarWidth: "none",
                      msOverflowStyle: "none",
                    }}
                  />
                  {text.length > MAX_TEXT * 0.8 && (
                    <span
                      className={`absolute bottom-[11px] right-3 text-[9px] font-semibold pointer-events-none ${
                        text.length >= MAX_TEXT
                          ? "text-red-400"
                          : "text-slate-400"
                      }`}
                    >
                      {MAX_TEXT - text.length}
                    </span>
                  )}
                </div>

                {/* Send button — fixed 44×44 so it's always flush with single-line textarea */}
                <motion.button
                  whileTap={{ scale: 0.84 }}
                  animate={{
                    backgroundColor: text.trim() ? "#123424" : "#f1f5f9",
                  }}
                  transition={{ duration: 0.15 }}
                  onClick={() => void handleSend()}
                  disabled={!text.trim() || sending}
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 cursor-pointer disabled:cursor-not-allowed"
                  aria-label="Trimite"
                >
                  <AnimatePresence mode="wait">
                    {sending ? (
                      <motion.span
                        key="spin"
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 90 }}
                        transition={{ duration: 0.12 }}
                      >
                        <Loader2 className="w-[17px] h-[17px] text-lime-400 animate-spin" />
                      </motion.span>
                    ) : (
                      <motion.span
                        key="send"
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 45 }}
                        transition={{ duration: 0.12 }}
                      >
                        <Send
                          className={`w-[17px] h-[17px] ${
                            text.trim() ? "text-lime-400" : "text-slate-400"
                          }`}
                          style={{ transform: "translateX(1px)" }}
                        />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return isMobile ? createPortal(chatContent, document.body) : chatContent;
}

// ─── Chat trigger button ───────────────────────────────────────────────────────

export function ChatTriggerButton({
  isOpen,
  unread,
  partnerName,
  partnerImage,
  onClick,
}: {
  isOpen: boolean;
  unread: number;
  partnerName: string | null;
  partnerImage?: string | null;
  onClick: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;

  return (
    <AnimatePresence>
      {!isOpen && (
        <motion.div
          key="trigger"
          initial={{ scale: 0.5, opacity: 0, y: 24 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.65, opacity: 0, y: 16 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 26,
            delay: 0.08,
          }}
          className="fixed bottom-6 right-4 z-[9990] lg:absolute lg:bottom-6 lg:right-6"
        >
          <motion.button
            whileHover={{ scale: 1.04, y: -1 }}
            whileTap={{ scale: 0.92 }}
            onClick={onClick}
            className="relative flex items-center gap-3 bg-[#123424] text-white rounded-full shadow-xl shadow-black/25 cursor-pointer"
            style={{ padding: "8px 18px 8px 8px" }}
          >
            {/* Avatar + chat icon badge */}
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-lime-400/50 bg-[#1a4d36] flex items-center justify-center">
                {partnerImage ? (
                  <Image
                    src={partnerImage}
                    alt={partnerName ?? ""}
                    width={40}
                    height={40}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <span className="text-sm font-bold text-lime-300">
                    {partnerName?.[0]?.toUpperCase() ?? "?"}
                  </span>
                )}
              </div>
              {/* Small chat badge pinned to avatar */}
              <div className="absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] rounded-full bg-lime-400 border-2 border-[#123424] flex items-center justify-center">
                <MessageCircle className="w-2.5 h-2.5 text-[#123424]" />
              </div>
            </div>

            {/* Label */}
            <div className="flex flex-col items-start leading-none gap-[3px]">
              <span className="text-[9px] text-white/50 font-semibold tracking-widest uppercase">
                Chat
              </span>
              <span className="text-sm font-bold whitespace-nowrap">
                {partnerName?.split(" ")[0] ?? "Partener"}
              </span>
            </div>

            {/* Unread badge — positioned outside button so it's never clipped */}
            <AnimatePresence>
              {unread > 0 && (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 22 }}
                  className="absolute -top-2 -right-1.5 min-w-[22px] h-[22px] px-1.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[11px] font-black leading-none shadow-md"
                  style={{ border: "2.5px solid white" }}
                >
                  {unread > 9 ? "9+" : unread}
                </motion.span>
              )}
            </AnimatePresence>

            {/* Pulse ring */}
            {unread > 0 && (
              <motion.span
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{ border: "2px solid rgba(239,68,68,0.45)" }}
                animate={{ scale: [1, 1.09, 1], opacity: [0.7, 0, 0.7] }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            )}
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
