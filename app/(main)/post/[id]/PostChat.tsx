"use client";

import { useEffect, useRef, useState, useCallback, KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  motion,
  AnimatePresence,
  type Variants,
  type Transition,
} from "framer-motion";
import { X, Send, MessageCircle, Loader2 } from "lucide-react";
import { usePostChat, type ChatMessage } from "@/hooks/usePostChat";

const MAX_TEXT = 500;

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
      className="rounded-full bg-lime-100 border border-lime-200 flex items-center justify-center text-lime-800 font-bold text-xs shrink-0"
      style={{ width: size, height: size }}
    >
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex items-end gap-2">
      <div className="flex items-center gap-1 px-4 py-3 bg-slate-100 rounded-2xl rounded-bl-sm">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block w-1.5 h-1.5 rounded-full bg-slate-400"
            animate={{ y: [0, -4, 0] }}
            transition={{
              duration: 0.7,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
}

interface BubbleProps {
  msg: ChatMessage;
  isMe: boolean;
  showAvatar: boolean;
  isLastInGroup: boolean;
  partnerImage: string | null;
  partnerName: string | null;
}

function MessageBubble({
  msg,
  isMe,
  showAvatar,
  isLastInGroup,
  partnerImage,
  partnerName,
}: BubbleProps) {
  return (
    <div
      className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}
    >
      {!isMe && (
        <div className="w-7 shrink-0 self-end">
          {showAvatar && (
            <Avatar name={partnerName} image={partnerImage} size={28} />
          )}
        </div>
      )}

      <div
        className={`flex flex-col gap-0.5 max-w-[72%] ${isMe ? "items-end" : "items-start"}`}
      >
        <div
          className={`px-3.5 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap ${
            isMe
              ? "bg-[#123424] text-white rounded-2xl rounded-br-sm"
              : "bg-slate-100 text-slate-900 rounded-2xl rounded-bl-sm"
          }`}
        >
          {msg.text}
        </div>

        {isLastInGroup && (
          <span
            className={`text-[10px] text-slate-400 px-1 ${isMe ? "text-right" : "text-left"}`}
          >
            {formatTime(msg.createdAt)}
          </span>
        )}
      </div>
    </div>
  );
}

function groupMessages(msgs: ChatMessage[]) {
  return msgs.map((msg, i) => ({
    msg,
    isFirst: i === 0 || msgs[i - 1].senderId !== msg.senderId,
    isLast: i === msgs.length - 1 || msgs[i + 1].senderId !== msg.senderId,
  }));
}

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

const EXIT_TRANSITION: Transition = {
  duration: 0.2,
  ease: "easeOut",
};

const panelVariants: Variants = {
  hidden: {
    y: 20,
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 350,
      mass: 0.8,
    },
  },
  exit: {
    y: 10,
    opacity: 0,
    scale: 0.98,
    transition: EXIT_TRANSITION,
  },
};

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
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const grouped = groupMessages(messages);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile(); // Check pe mount
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Blocare scroll nativă (mai ales pentru varianta de mobil)
  useEffect(() => {
    if (isOpen && isMobile) {
      const scrollY = window.scrollY;

      const originalHtmlOverflow = document.documentElement.style.overflow;
      const originalBodyOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalTop = document.body.style.top;
      const originalWidth = document.body.style.width;

      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";

      // Fix specific iOS pentru a împiedica rubber-banding când e deschis portalul
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";

      return () => {
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.body.style.overflow = originalBodyOverflow;

        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.width = originalWidth;
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen, isMobile]);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, [messages, isPartnerTyping, isOpen]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 320);
  }, [isOpen]);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setText("");
    if (inputRef.current) inputRef.current.style.height = "42px";
    await sendMessage(trimmed);
  }, [text, sending, sendMessage]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value.slice(0, MAX_TEXT);
    setText(val);
    e.target.style.height = "42px";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
    if (val) sendTyping();
  };

  const firstName = partnerName?.split(" ")[0] ?? "partener";

  if (!mounted) return null;

  // Împachetăm conținutul chat-ului pentru a fi returnat fie direct, fie prin Portal
  const chatContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop (doar pe mobil vizibil) */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 h-[100dvh] bg-black/40 backdrop-blur-[2px] z-[9998] lg:hidden touch-none"
            onClick={onClose}
          />

          <motion.div
            key="panel"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={[
              "flex flex-col bg-white",
              "fixed top-0 left-0 w-full h-[100dvh] z-[9999]", // Pe mobil: portal fullscreen
              "lg:absolute lg:inset-0 lg:h-auto lg:w-auto lg:z-10", // Pe desktop: stă cum era, în părintele său
              "origin-bottom lg:origin-center",
            ].join(" ")}
          >
            <div className="shrink-0 flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
              <Avatar name={partnerName} image={partnerImage} size={36} />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 leading-tight truncate">
                  {partnerName ?? "Partener"}
                </p>
                <p className="text-[11px] text-slate-400 leading-tight">
                  {isPartnerTyping ? (
                    <span className="text-lime-600 font-medium">Scrie...</span>
                  ) : (
                    partnerRole
                  )}
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                aria-label="Închide"
              >
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            <div
              className="flex-1 overflow-y-auto overscroll-y-contain px-4 py-5 space-y-1.5 min-h-0"
              data-lenis-prevent
            >
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-12 px-6">
                  <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-slate-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-600 mb-1">
                      Niciun mesaj
                    </p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Coordonează colectarea direct cu {firstName}.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {grouped.map(({ msg, isFirst, isLast }) => (
                    <MessageBubble
                      key={msg.id}
                      msg={msg}
                      isMe={msg.senderId === userId}
                      showAvatar={isFirst}
                      isLastInGroup={isLast}
                      partnerImage={partnerImage}
                      partnerName={partnerName}
                    />
                  ))}

                  <AnimatePresence>
                    {isPartnerTyping && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-end gap-2"
                      >
                        <div className="w-7 shrink-0 self-end">
                          <Avatar
                            name={partnerName}
                            image={partnerImage}
                            size={28}
                          />
                        </div>
                        <TypingBubble />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
              <div ref={bottomRef} />
            </div>

            <AnimatePresence>
              {sendError && (
                <motion.p
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="shrink-0 text-xs text-red-500 font-medium px-4 overflow-hidden"
                >
                  {sendError}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="shrink-0 border-t border-slate-100 px-4 py-3 bg-white">
              <div className="flex items-center justify-center gap-2.5">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={text}
                    onChange={handleTextChange}
                    onKeyDown={handleKeyDown}
                    placeholder={`Mesaj către ${firstName}…`}
                    className="w-full resize-none px-3.5 py-2.5 rounded-2xl border border-slate-200 focus:border-lime-400 focus:ring-2 focus:ring-lime-100 outline-none text-slate-900 placeholder:text-slate-400 transition-shadow bg-slate-50 overflow-y-auto"
                    style={{ height: 46, minHeight: 46, maxHeight: 120 }}
                  />
                  {text.length > MAX_TEXT * 0.8 && (
                    <span
                      className={`absolute bottom-2 right-3 text-[9px] font-medium pointer-events-none ${
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
                  whileTap={{ scale: 0.88 }}
                  onClick={() => void handleSend()}
                  disabled={!text.trim() || sending}
                  className="w-10 h-10 mb-1 rounded-full bg-[#123424] flex items-center justify-center shrink-0 cursor-pointer hover:bg-[#1a4d36] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Trimite"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 text-lime-400 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 text-lime-400" />
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  // Returnăm Portal pe mobil, și inline pe desktop (așa cum era layout-ul inițial)
  return isMobile ? createPortal(chatContent, document.body) : chatContent;
}

export function ChatTriggerButton({
  isOpen,
  unread,
  partnerName,
  onClick,
}: {
  isOpen: boolean;
  unread: number;
  partnerName: string | null;
  onClick: () => void;
}) {
  const firstName = partnerName?.split(" ")[0] ?? "partener";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {!isOpen && (
        <motion.div
          key="chat-trigger-btn"
          // Am înlocuit type="spring" cu o apariție "easeOut" mult mai fină și mai calmă
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="fixed bottom-6 right-4 z-[9990] lg:absolute lg:bottom-6 lg:right-6"
        >
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className="relative flex items-center gap-2.5 bg-[#123424] text-white pl-3.5 pr-4 py-2.5 lg:pl-4 rounded-full shadow-lg shadow-black/20 cursor-pointer hover:bg-[#1a4d36] transition-colors"
          >
            <MessageCircle className="w-4 h-4 text-lime-400 shrink-0" />
            <span className="text-sm font-semibold whitespace-nowrap">
              Vorbește cu {firstName}
            </span>
            {unread > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none border-2 border-white"
              >
                {unread > 9 ? "9+" : unread}
              </motion.span>
            )}
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
