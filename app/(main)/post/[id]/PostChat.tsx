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
import {
  X,
  Send,
  MessageCircle,
  MessageCircleMore,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { usePostChat, type ChatMessage } from "@/hooks/usePostChat";
import { useI18n, type Locale } from "@/context/I18nContext";

const MAX_TEXT = 500;
const MIN_H = 44;
const MAX_H = 120;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string, locale: Locale) {
  return new Date(iso).toLocaleTimeString(locale === "ro" ? "ro-RO" : "en-GB", {
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
      <div className="w-8 shrink-0 self-start mt-1">
        <Avatar name={partnerName} image={partnerImage} size={32} />
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
  const { t } = useI18n();
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 6 }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
          onClick={onClick}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer z-10 whitespace-nowrap"
        >
          {unread > 0 ? (
            <span className="text-lime-700">
              {t({
                ro: `${unread} mesaj${unread > 1 ? "e noi" : " nou"}`,
                en: `${unread} new message${unread > 1 ? "s" : ""}`,
              })}
            </span>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-600">
                {t({ ro: "Mergi jos", en: "Go to bottom" })}
              </span>
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
  isPending,
}: {
  msg: ChatMessage;
  isMe: boolean;
  showAvatar: boolean;
  isLastInGroup: boolean;
  partnerImage: string | null;
  partnerName: string | null;
  doAnimate: boolean;
  isPending: boolean;
}) {
  const { locale } = useI18n();
  return (
    <motion.div
      initial={doAnimate ? { opacity: 1, y: 10, scale: 0.97 } : false}
      animate={doAnimate ? { opacity: 1, y: 0, scale: 1 } : undefined}
      transition={{
        type: "spring",
        stiffness: 380,
        damping: 28,
        delay: isPending ? 0.1 : 0,
      }}
      className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"} ${
        isLastInGroup ? "" : "mb-[6px]"
      }`}
      style={{ originX: isMe ? 1 : 0, originY: 1 }}
    >
      {!isMe && (
        <div className="w-8 shrink-0 self-start mt-1">
          {showAvatar && (
            <Avatar name={partnerName} image={partnerImage} size={32} />
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
          <span className="h-3.5 flex items-center text-[10px] leading-none text-slate-400 px-1 tabular-nums">
            {formatTime(msg.createdAt, locale)}
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
  readOnly?: boolean;
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
  readOnly = false,
}: PostChatProps) {
  const { t } = useI18n();
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

  // Refs — purely for reading in effects, never accessed in render phase
  const isAtBottomRef = useRef(true);
  const initialScrollDoneRef = useRef(false);
  const initialLoadDoneRef = useRef(false);
  const stableCountRef = useRef(0);
  const lingerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lingeringTypingRef = useRef(false);

  // State arrays and sets safe for conditional rendering
  const [seenIds, setSeenIds] = useState<Set<string>>(() => new Set());
  const [pendingAnimIds, setPendingAnimIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [lingeringTyping, setLingeringTyping] = useState(false);

  const grouped = useMemo(() => groupMessages(messages), [messages]);

  // ── Mount / responsive ────────────────────────────────────────────────────

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const check = () => setIsMobile(window.innerWidth < 1024);
    check(); // synchronously set the mobile state on mount
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Reset scroll/visibility state when chat closes ────────────────────────

  useEffect(() => {
    if (!isOpen) {
      setContentVisible(false);
      initialScrollDoneRef.current = false;
      initialLoadDoneRef.current = false;
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

  // ── Initial scroll — snap to bottom after panel opens ────────────────────

  useEffect(() => {
    if (!isOpen || loading || initialScrollDoneRef.current) return;

    const timer = setTimeout(() => {
      scrollToBottom(false);
      initialScrollDoneRef.current = true;
      setContentVisible(true);

      // Mark all currently visible messages as "seen" so they don't animate
      setSeenIds((prev) => {
        const next = new Set(prev);
        messages.forEach((m) => next.add(m.id));
        return next;
      });

      stableCountRef.current = messages.length;
      initialLoadDoneRef.current = true;
    }, 80);

    return () => clearTimeout(timer);
  }, [isOpen, loading, messages, scrollToBottom]);

  // ── New messages after initial load ───────────────────────────────────────

  useEffect(() => {
    if (!initialLoadDoneRef.current) return;
    const curr = messages.length;
    const prev = stableCountRef.current;
    if (curr <= prev) return;

    // Handle Pending Animations: new messages arriving while typing indicator exits
    if (lingeringTypingRef.current) {
      const ids = messages
        .slice(prev)
        .filter((m) => !seenIds.has(m.id))
        .map((m) => m.id);

      if (ids.length > 0) {
        setPendingAnimIds((prevIds) => new Set([...prevIds, ...ids]));
      }
    }

    stableCountRef.current = curr;
    const newCount = curr - prev;

    if (isAtBottomRef.current) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToBottom(true);
        });
      });
    } else {
      setUnreadWhileScrolled((n) => n + newCount);
    }
  }, [messages, seenIds, scrollToBottom]);

  // Scroll when typing indicator appears
  useEffect(() => {
    if (isPartnerTyping && isAtBottomRef.current) {
      requestAnimationFrame(() => scrollToBottom(true));
    }
  }, [isPartnerTyping, scrollToBottom]);

  // ── Textarea auto-resize ──────────────────────────────────────────────────

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    if (!text) {
      el.style.height = `${MIN_H}px`;
      return;
    }
    el.style.height = `${MIN_H}px`;
    el.style.height = `${Math.min(el.scrollHeight, MAX_H)}px`;
  }, [text]);

  // Focus on open
  useEffect(() => {
    if (isOpen && !readOnly) {
      const t = setTimeout(() => textareaRef.current?.focus(), 300);
      return () => clearTimeout(t);
    }
  }, [isOpen, readOnly]);

  // ── Send ──────────────────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setText("");
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

  // ── Lingering typing indicator ────────────────────────────────────────────

  useEffect(() => {
    if (isPartnerTyping) {
      setLingeringTyping(true);
      lingeringTypingRef.current = true;
      if (lingerTimerRef.current) clearTimeout(lingerTimerRef.current);
    } else {
      lingerTimerRef.current = setTimeout(() => {
        setLingeringTyping(false);
        lingeringTypingRef.current = false;
      }, 140);
    }
    return () => {
      if (lingerTimerRef.current) clearTimeout(lingerTimerRef.current);
    };
  }, [isPartnerTyping]);

  if (!mounted) return null;

  const firstName =
    partnerName?.split(" ")[0] ?? t({ ro: "partener", en: "partner" });

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
            {/* ── Header ── */}
            <div className="shrink-0">
              {/* <div className="flex justify-center pt-2.5 pb-0 lg:hidden">
                <div className="w-9 h-1 rounded-full bg-slate-200" />
              </div> */}

              <div className="flex items-center gap-3 p-5 border-b border-slate-100 bg-white">
                <div className="relative shrink-0">
                  <Avatar name={partnerName} image={partnerImage} size={36} />
                  {/*<span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-lime-400 border-2 border-white" /> */}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 leading-tight truncate">
                    {partnerName ?? t({ ro: "Partener", en: "Partner" })}
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
                          {t({ ro: "scrie...", en: "typing..." })}
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
                  aria-label={t({ ro: "Închide", en: "Close" })}
                >
                  <X className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            </div>

            {/* ── Messages ── */}
            <div className="relative flex-1 min-h-0 overflow-hidden">
              <div
                ref={scrollRef}
                onScroll={checkAtBottom}
                className="h-full overflow-y-auto overscroll-y-contain px-4 py-4"
                data-lenis-prevent
                style={{
                  visibility: contentVisible ? "visible" : "hidden",
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                }}
              >
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
                      <p className="text-xs text-slate-400">
                        {t({ ro: "Se încarcă...", en: "Loading..." })}
                      </p>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex flex-col items-center justify-center h-full gap-4 text-center px-6"
                  >
                    <MessageCircleMore className="w-10 h-10 text-slate-300" />

                    <div>
                      <p className="text-xs text-slate-400 leading-relaxed max-w-[200px]">
                        {readOnly
                          ? t({
                              ro: "Nu există mesaje în această conversație.",
                              en: "There are no messages in this conversation.",
                            })
                          : t({
                              ro: (
                                <>
                                  Conversează cu{" "}
                                  <span className="font-medium text-slate-600">
                                    {firstName}
                                  </span>{" "}
                                  direct pe Recash.
                                </>
                              ),
                              en: (
                                <>
                                  Chat with{" "}
                                  <span className="font-medium text-slate-600">
                                    {firstName}
                                  </span>{" "}
                                  directly on Recash.
                                </>
                              ),
                            })}
                      </p>
                    </div>
                  </motion.div>
                ) : (
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
                        doAnimate={!seenIds.has(msg.id)}
                        isPending={pendingAnimIds.has(msg.id)}
                      />
                    ))}

                    <AnimatePresence>
                      {lingeringTyping && (
                        <TypingBubble
                          key="typing-indicator"
                          partnerImage={partnerImage}
                          partnerName={partnerName}
                        />
                      )}
                    </AnimatePresence>

                    {/* Bottom spacer so last message isn't flush against input */}
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
            {readOnly ? (
              <div className="shrink-0 border-t border-slate-100 px-5 py-4 bg-slate-50">
                <p className="text-xs text-slate-400 text-center leading-relaxed">
                  {t({
                    ro: "Colectarea s-a încheiat. Conversația este disponibilă doar pentru citire.",
                    en: "This collection has ended. The conversation is read-only.",
                  })}
                </p>
              </div>
            ) : (
              <div className="shrink-0 border-t border-slate-100 px-5 py-4 bg-white">
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <textarea
                      ref={textareaRef}
                      value={text}
                      onChange={handleTextChange}
                      onKeyDown={handleKeyDown}
                      placeholder={t({
                        ro: "Trimite un mesaj…",
                        en: "Send a message…",
                      })}
                      rows={1}
                      className="w-full resize-none px-3.5 py-[10px] rounded-2xl border border-slate-200 focus:border-lime-400 focus:ring-2 focus:ring-lime-100/60 outline-none text-slate-900 placeholder:text-slate-400 transition-[border-color,box-shadow] bg-slate-50 leading-[1.45] overflow-hidden"
                      style={{
                        height: MIN_H,
                        minHeight: MIN_H,
                        maxHeight: MAX_H,
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

                  <motion.button
                    whileTap={{ scale: 0.84 }}
                    animate={{
                      backgroundColor: text.trim() ? "#123424" : "#f1f5f9",
                    }}
                    transition={{ duration: 0.15 }}
                    onClick={() => void handleSend()}
                    disabled={!text.trim() || sending}
                    className="w-11 h-11 mb-1.5 rounded-2xl flex items-center justify-center shrink-0 cursor-pointer disabled:cursor-not-allowed"
                    aria-label={t({ ro: "Trimite", en: "Send" })}
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
                          <Loader2 className="w-[18px] h-[18px] text-lime-400 animate-spin" />
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
                            className={`w-[18px] h-[18px] ${
                              text.trim() ? "text-lime-400" : "text-slate-400"
                            }`}
                          />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </div>
              </div>
            )}
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
  readOnly = false,
}: {
  isOpen: boolean;
  unread: number;
  partnerName: string | null;
  partnerImage?: string | null;
  onClick: () => void;
  readOnly?: boolean;
}) {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
            className="relative flex items-center gap-3 bg-[#123424] text-white rounded-2xl cursor-pointer"
            style={{ padding: "8px 18px 8px 8px" }}
          >
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
              <div className="absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] rounded-full bg-lime-400 border-2 border-[#123424] flex items-center justify-center">
                <MessageCircle className="w-2 h-2 text-[#123424]" />
              </div>
            </div>

            <div className="flex flex-col items-start leading-none gap-[2px]">
              <span className="text-[10px] text-white/70 font-semibold">
                {readOnly
                  ? t({
                      ro: "Vezi conversația cu",
                      en: "View conversation with",
                    })
                  : t({ ro: "Ia legătura cu", en: "Get in touch with" })}
              </span>
              <span className="text-sm font-bold whitespace-nowrap">
                {partnerName ?? t({ ro: "Partener", en: "Partner" })}
              </span>
            </div>

            <AnimatePresence>
              {unread > 0 && (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 22 }}
                  className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[11px] font-black leading-none shadow-md"
                  style={{ border: "2.5px solid white" }}
                >
                  {unread > 9 ? "9+" : unread}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
