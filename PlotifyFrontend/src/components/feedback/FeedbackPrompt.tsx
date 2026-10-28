import { Link, useLocation } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { Heart } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Modal from "../ui/Modal";
import { StarPicker } from "../ui/Stars";
import { recordVisit, sendFeedback } from "../../services/feedback.service";
import { requireToken } from "../../lib/queries";
import { btn } from "../../lib/ui";
import {
  closeFeedback,
  FEEDBACK_AFTER_DAYS,
  feedbackKey,
  isSnoozed,
  openFeedback,
  snooze,
  useFeedbackOpen,
} from "../../lib/feedback";
import type { FeedbackStatus } from "../../types/feedback";

// pages where an automatic popup won't interrupt signing in or adding a title
const PROMPT_PAGES = ["/", "/screen", "/read", "/profile", "/card"];

const FeedbackPrompt = () => {
  const { isSignedIn, userId, getToken } = useAuth();
  const { pathname } = useLocation();
  const queryClient = useQueryClient();
  const open = useFeedbackOpen();
  const autoShown = useRef(false);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const status = useQuery({
    queryKey: feedbackKey(userId),
    // also counts today as a visit; the server counts each day once, so refetching is harmless
    queryFn: async ({ signal }) => recordVisit(await requireToken(getToken), signal),
    enabled: !!isSignedIn,
    staleTime: 1000 * 60 * 60,
  });
  const previous = status.data?.feedback ?? null;

  useEffect(() => {
    const data = status.data;
    if (autoShown.current || !data || data.feedback || data.visitDays < FEEDBACK_AFTER_DAYS) return;
    if (!PROMPT_PAGES.includes(pathname) || isSnoozed(userId)) return;

    const timer = setTimeout(() => {
      autoShown.current = true;
      openFeedback();
    }, 1500);
    return () => clearTimeout(timer);
  }, [status.data, pathname, userId]);

  // each time it opens, start from what they sent last time, if anything
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setRating(previous?.rating ?? 0);
      setComment(previous?.comment ?? "");
      setError("");
      setSent(false);
    }
  }

  const send = useMutation({
    mutationFn: async () => sendFeedback(await requireToken(getToken), { rating, comment }),
    onSuccess: (feedback) => {
      queryClient.setQueryData<FeedbackStatus>(feedbackKey(userId), (s) => s && { ...s, feedback });
      setSent(true);
    },
    onError: () => setError("couldn't send it. try again in a moment."),
  });

  const dismiss = () => {
    if (send.isPending) return;
    if (!sent && !previous) snooze(userId);
    closeFeedback();
  };

  if (!isSignedIn) return null;

  return (
    <Modal open={open} onClose={dismiss} title={sent ? "thank you." : previous ? "update your rating" : "enjoying plotify?"}>
      <AnimatePresence mode="wait" initial={false}>
        {sent ? (
          <motion.div key="sent" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <p className="mb-6 text-sm text-muted">
              every rating is read. if plotify keeps your shelves in order, you can also help keep it running.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/donate" onClick={closeFeedback} className={btn("accent", "lg")}>
                <Heart size={16} /> support
              </Link>
              <button type="button" className={btn("secondary", "lg")} onClick={closeFeedback}>
                close
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={(e) => {
              e.preventDefault();
              if (!rating) {
                setError("pick a rating from 1 to 5");
                return;
              }
              send.mutate();
            }}
          >
            <p className="mb-5 text-sm text-muted">rate the app out of five. it takes a second and helps a lot.</p>
            <StarPicker
              value={rating}
              onChange={(r) => {
                setRating(r);
                setError("");
              }}
            />
            <label htmlFor="feedback-comment" className="label mt-5">
              anything to add? <span className="font-normal text-muted">(optional)</span>
            </label>
            <textarea
              id="feedback-comment"
              rows={3}
              maxLength={1000}
              className="field"
              placeholder="what you like, what's missing…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            {error && <p className="mt-2 text-sm text-danger">{error}</p>}
            <div className="mt-7 flex gap-3">
              <button type="submit" className={btn("primary", "lg")} disabled={send.isPending}>
                {send.isPending ? "sending…" : "send rating"}
              </button>
              <button type="button" className={btn("secondary", "lg")} onClick={dismiss} disabled={send.isPending}>
                maybe later
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </Modal>
  );
};

export default FeedbackPrompt;
