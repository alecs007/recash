"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useSyncExternalStore,
} from "react";
import Image from "next/image";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { X, Send, RotateCcw } from "lucide-react";
import { PiStarFourBold } from "react-icons/pi";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { useI18n } from "@/context/I18nContext";
import {
  subscribeBottomRight,
  getBottomRightSnapshot,
} from "@/lib/ui/launcher-slot";

const AI_LOGO = "/images/ai-logo.svg";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const COPY = {
  open: { ro: "Asistent Recash", en: "Recash Assistant" },
  title: { ro: "Asistent Recash", en: "Recash Assistant" },
  reset: { ro: "Conversație nouă", en: "New chat" },
  close: { ro: "Închide", en: "Close" },
  placeholder: { ro: "Scrie un mesaj…", en: "Type a message…" },
  intro: {
    ro: "Bună! 👋 Sunt asistentul Recash. Îți pot găsi anunțuri în zona ta, îți pot arăta clasamentul, verific reputația unui utilizator sau calculez cât valorează un schimb. Cu ce te pot ajuta?",
    en: "Hi! 👋 I'm the Recash assistant. I can find listings near you, show the leaderboard, check a user's reputation, or work out what an exchange is worth. How can I help?",
  },
  error: {
    ro: "A apărut o eroare. Încearcă din nou.",
    en: "Something went wrong. Please try again.",
  },
  unconfigured: {
    ro: "Asistentul AI nu este configurat pe acest server.",
    en: "The AI assistant is not configured on this server.",
  },
  rateTooFast: {
    ro: "Trimiți mesaje prea repede. Așteaptă câteva secunde.",
    en: "You're sending messages too fast. Wait a few seconds.",
  },
  rateOverloaded: {
    ro: "Asistentul e suprasolicitat momentan — prea multe cereri în total. Încearcă din nou în câteva minute.",
    en: "The assistant is overloaded right now — too many requests overall. Try again in a few minutes.",
  },
  rateUserLimit: {
    ro: "Ai atins limita ta de mesaje pentru moment. Încearcă din nou mai târziu.",
    en: "You've reached your own message limit for now. Try again later.",
  },
};

const SUGGESTIONS = [
  {
    ro: "Arată-mi clasamentul Recash.",
    en: "Show me the Recash leaderboard.",
  },
  {
    ro: "Câte anunțuri există în București?",
    en: "How many listings are there in Bucharest?",
  },
  {
    ro: "Câte sticle a ajutat Recash să recicleze până acum?",
    en: "How many bottles has Recash helped recycle so far?",
  },
];

const MAX_HISTORY = 10;

function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block h-1.5 w-1.5 rounded-full bg-[#123424]/40"
          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </span>
  );
}

const MD_COMPONENTS: Components = {
  p: ({ children }) => (
    <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-2 last:mb-0 list-disc space-y-1 pl-5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 last:mb-0 list-decimal space-y-1 pl-5">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-slate-900">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-lime-700 underline underline-offset-2 hover:text-lime-800"
    >
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[12px] text-emerald-700">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-lg bg-slate-900 p-2.5 font-mono text-[12px] leading-relaxed text-slate-100">
      {children}
    </pre>
  ),
  h1: ({ children }) => (
    <p className="mb-1 mt-1 text-sm font-bold text-slate-900">{children}</p>
  ),
  h2: ({ children }) => (
    <p className="mb-1 mt-1 text-sm font-bold text-slate-900">{children}</p>
  ),
  h3: ({ children }) => (
    <p className="mb-1 mt-1 text-sm font-bold text-slate-900">{children}</p>
  ),
  hr: () => <hr className="my-2.5 border-slate-200" />,
};

function AssistantMarkdown({ content }: { content: string }) {
  return (
    <Markdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
      {content}
    </Markdown>
  );
}

export function AssistantWidget() {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [isMobile, setIsMobile] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cornerTaken =
    useSyncExternalStore(
      subscribeBottomRight,
      getBottomRightSnapshot,
      () => 0,
    ) > 0;

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!open || !isMobile) return;
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
  }, [open, isMobile]);

  const panelVariants: Variants = {
    hidden: isMobile ? { y: "100%" } : { opacity: 0, y: 28, scale: 0.96 },
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
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { type: "spring", stiffness: 320, damping: 28 },
        },
    exit: isMobile
      ? {
          y: "100%",
          transition: { type: "spring", damping: 36, stiffness: 320 },
        }
      : {
          opacity: 0,
          y: 20,
          scale: 0.96,
          transition: { duration: 0.16, ease: [0.4, 0, 1, 1] },
        },
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Abort any in-flight stream when the widget unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
    setMessages([]);
    setInput("");
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;

      const history = [
        ...messages,
        { role: "user" as const, content: trimmed },
      ];
      setMessages([...history, { role: "assistant", content: "" }]);
      setInput("");
      setStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/v1/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history.slice(-MAX_HISTORY) }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          let fallback = t(COPY.error);
          if (res.status === 503) {
            fallback = t(COPY.unconfigured);
          } else if (res.status === 429) {
            let code = "";
            try {
              const data = await res.json();
              code = typeof data?.code === "string" ? data.code : "";
            } catch {
              // keep the generic overloaded message below
            }
            fallback =
              code === "too_fast"
                ? t(COPY.rateTooFast)
                : code === "user_limit"
                  ? t(COPY.rateUserLimit)
                  : t(COPY.rateOverloaded);
          }
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { role: "assistant", content: fallback };
            return next;
          });
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { role: "assistant", content: acc };
            return next;
          });
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: t(COPY.error) };
          return next;
        });
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, streaming, t],
  );

  const logo = (size: number) => (
    <Image
      src={AI_LOGO}
      alt={t(COPY.title)}
      width={size}
      height={size}
      draggable={false}
      priority
    />
  );

  return (
    <>
      {/* Floating launcher */}
      <AnimatePresence>
        {!open && (
          <motion.div
            key="launcher"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`fixed z-[9995] right-5 ${cornerTaken ? "bottom-24" : "bottom-5"}`}
          >
            <motion.button
              onClick={() => setOpen(true)}
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.94 }}
              aria-label={t(COPY.open)}
              title={t(COPY.open)}
              className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-xs shadow-slate-500/20 ring-1 ring-slate-200 hover:ring-slate-300 cursor-pointer"
            >
              {logo(42)}

              <span className="absolute -right-0.5 -top-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-lime-400 ring-2 ring-white">
                <PiStarFourBold className="h-2.5 w-2.5 text-[#123424]" />
              </span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[10004] bg-black/40 backdrop-blur-[2px] sm:hidden"
          />
        )}
        {open && (
          <motion.div
            key="panel"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed bottom-0 left-0 right-0 z-[10005] flex h-[85dvh] max-h-[85dvh] flex-col overflow-hidden rounded-t-3xl bg-white shadow ring-1 ring-[#123424]/10 sm:bottom-5 sm:left-auto sm:right-5 sm:h-[600px] sm:max-h-[78vh] sm:w-[420px] sm:rounded-3xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-3">
              <div className="flex items-center gap-1">
                <div className="flex h-11 w-11 p-1 items-center justify-center overflow-hidden">
                  {logo(40)}
                </div>
                <p className="text-[15px] font-extrabold leading-tight text-[#123424]">
                  {t(COPY.title)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={reset}
                    aria-label={t(COPY.reset)}
                    title={t(COPY.reset)}
                    className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                  >
                    <RotateCcw className="h-4.5 w-4.5" />
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  aria-label={t(COPY.close)}
                  title={t(COPY.close)}
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 space-y-4 overflow-y-auto bg-slate-50/60 px-4 py-4"
            >
              {messages.length === 0 && (
                <div className="space-y-4">
                  <div className="flex items-end gap-2">
                    <span className="flex h-7 w-7 p-1 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
                      {logo(26)}
                    </span>
                    <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm ring-1 ring-slate-100">
                      {t(COPY.intro)}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 pl-9">
                    {SUGGESTIONS.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => send(t(s))}
                        className="group flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-3.5 py-2 text-left text-xs font-medium text-slate-600 transition-colors hover:border-[#123424] hover:bg-[#123424] hover:text-white cursor-pointer"
                      >
                        <PiStarFourBold className="h-3 w-3 shrink-0 text-lime-500 group-hover:text-lime-400" />
                        {t(s)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => {
                const isLast = i === messages.length - 1;
                const showTyping =
                  m.role === "assistant" && !m.content && streaming && isLast;
                if (m.role === "user") {
                  return (
                    <div key={i} className="flex justify-end">
                      <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-[#123424] px-3.5 py-2.5 text-sm text-white shadow-sm">
                        {m.content}
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={i} className="flex items-end gap-2">
                    <span className="flex h-7 w-7 p-1 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
                      {logo(26)}
                    </span>
                    <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm ring-1 ring-slate-100">
                      {showTyping ? (
                        <TypingDots />
                      ) : (
                        <AssistantMarkdown content={m.content} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2 border-t border-slate-100 bg-white p-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t(COPY.placeholder)}
                disabled={streaming}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-700 outline-none transition-[border-color,box-shadow] placeholder:text-slate-400 focus:border-lime-400 focus:bg-white focus:ring-2 focus:ring-lime-100/60 disabled:opacity-50"
                lang={locale}
              />
              <motion.button
                type="submit"
                whileTap={{ scale: 0.92 }}
                disabled={streaming || !input.trim()}
                aria-label="Send"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#123424] text-white transition-colors hover:bg-[#1a4d36] disabled:opacity-40 cursor-pointer"
              >
                <Send className="h-4 w-4" />
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
