import { useAuth } from "@clerk/clerk-react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { btn } from "../../lib/ui";
import { easeOut } from "../../lib/motion";
import ShelfFace from "./ShelfFace";
import Formatted from "./Formatted";
import { useChat } from "./useChat";

const SUGGESTIONS = [
  "what am i still watching?",
  "what did i read last?",
  "what should i watch next?",
  "recap my current show, no spoilers",
];

const TOOL_LABELS: Record<string, string> = {
  search_my_shelf: "searched your shelf",
  list_my_shelf: "read your shelf",
  search_external: "looked it up",
  get_external_details: "fetched details",
  get_recommendations: "found similar titles",
};

// tombol wajah di pojok kanan bawah + panel chat yang muncul di atasnya
const ChatWidget = () => {
  const { isSignedIn } = useAuth();
  const { messages, loading, error, send, reset } = useChat();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const mood = loading ? "thinking" : open ? "open" : "idle";

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  // esc menutup panel dan mengembalikan fokus ke tombol
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        launcherRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!isSignedIn) return null;

  const submit = async (text: string) => {
    setInput("");
    const ok = await send(text);
    if (!ok) setInput(text);
    inputRef.current?.focus();
  };

  return (
    <div className="lowercase">
      <AnimatePresence>
        {open && (
          <motion.section
            role="dialog"
            aria-label="ask your shelf"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.45, ease: easeOut }}
            style={{ originX: 1, originY: 1 }}
            className="fixed inset-x-3 bottom-[88px] z-50 flex h-[min(620px,calc(100dvh-112px))] flex-col border border-line bg-paper text-ink shadow-[0_32px_64px_-32px_rgb(23_22_15/0.35)] sm:inset-x-auto sm:right-6 sm:bottom-[96px] sm:w-[392px]"
          >
            <header className="flex items-center gap-3 border-b border-line px-5 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line-strong bg-white">
                <ShelfFace mood={mood} className="h-full w-full" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-serif text-[22px] leading-none tracking-[-0.02em]">ask your shelf.</h2>
                <p className="mt-1 font-mono text-[11px] text-muted">
                  {loading ? "reading…" : "your shelf + tmdb, anilist, open library"}
                </p>
              </div>
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={reset}
                  aria-label="start over"
                  title="start over"
                  className={btn("ghost", "sm", "w-9 px-0")}
                >
                  <RotateCcw size={16} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="close"
                className={btn("ghost", "sm", "w-9 px-0")}
              >
                <X size={18} />
              </button>
            </header>

            <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5" aria-live="polite">
              {messages.length === 0 && (
                <motion.div
                  initial="hidden"
                  animate="show"
                  variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } } }}
                  className="flex flex-col gap-2"
                >
                  <motion.p
                    variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                    className="mb-2 font-serif text-[26px] leading-[1.1] tracking-[-0.02em]"
                  >
                    where did you leave off?
                  </motion.p>
                  <motion.p
                    variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                    className="eyebrow mb-1"
                  >
                    try asking
                  </motion.p>
                  {SUGGESTIONS.map((s) => (
                    <motion.button
                      key={s}
                      type="button"
                      variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                      onClick={() => submit(s)}
                      className="border border-line bg-white px-3.5 py-2.5 text-left text-sm text-body transition-colors hover:border-ink hover:text-ink"
                    >
                      {s}
                    </motion.button>
                  ))}
                </motion.div>
              )}

              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: easeOut }}
                  className={m.role === "user" ? "max-w-[85%] self-end" : "self-start"}
                >
                  {m.role === "user" ? (
                    <div className="bg-ink px-3.5 py-2.5 text-sm text-white normal-case">{m.text}</div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {!!m.toolsUsed?.length && (
                        <span className="font-mono text-[11px] text-muted">
                          {[...new Set(m.toolsUsed)].map((t) => TOOL_LABELS[t] || t).join(" · ")}
                        </span>
                      )}
                      <div className="border border-line bg-white px-4 py-3 text-sm leading-relaxed text-body normal-case">
                        <Formatted text={m.text} />
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}

              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-1.5 self-start"
                  aria-label="thinking"
                >
                  {[0, 1, 2].map((d) => (
                    <motion.span
                      key={d}
                      className="h-1.5 w-1.5 bg-muted"
                      animate={{ opacity: [0.25, 1, 0.25] }}
                      transition={{ duration: 1.1, repeat: Infinity, delay: d * 0.18 }}
                    />
                  ))}
                </motion.div>
              )}

              <div ref={endRef} />
            </div>

            <form
              className="flex flex-col gap-2 border-t border-line px-5 py-4"
              onSubmit={(e) => {
                e.preventDefault();
                submit(input);
              }}
            >
              {error && <p className="text-[13px] text-danger">{error}</p>}
              <div className="flex gap-2">
                <label htmlFor="chat-widget-input" className="sr-only">your question</label>
                <input
                  id="chat-widget-input"
                  ref={inputRef}
                  className="field h-11 text-sm normal-case"
                  placeholder="ask about your shelf…"
                  value={input}
                  maxLength={2000}
                  onChange={(e) => setInput(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  aria-label="send"
                  className={btn("primary", "md", "w-11 shrink-0 px-0")}
                >
                  <ArrowUp size={18} />
                </button>
              </div>
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      <div className="group fixed right-4 bottom-4 z-50 sm:right-6 sm:bottom-6">
        {!open && (
          <span className="pointer-events-none absolute top-1/2 right-[72px] -translate-y-1/2 bg-ink px-2.5 py-1 font-mono text-[11px] whitespace-nowrap text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            ask your shelf
          </span>
        )}
        <motion.button
          ref={launcherRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "close chat" : "open chat"}
          aria-expanded={open}
          initial={{ opacity: 0, scale: 0.6, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, ease: easeOut, delay: 0.6 }}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.94 }}
          className={`flex h-[60px] w-[60px] items-center justify-center overflow-hidden rounded-full border bg-white shadow-[0_12px_28px_-14px_rgb(23_22_15/0.4)] transition-colors duration-200 ${
            open ? "border-ink" : "border-line-strong hover:border-ink"
          }`}
        >
          <ShelfFace mood={mood} className="h-full w-full" />
        </motion.button>
      </div>
    </div>
  );
};

export default ChatWidget;
