import { useSyncExternalStore } from "react";

type Uid = string | null | undefined;

// the rating popup opens by itself on the second day they open plotify, or from the footer link
export const FEEDBACK_AFTER_DAYS = 2;
// "maybe later" hides the automatic popup for this long
const SNOOZE_MS = 1000 * 60 * 60 * 24 * 30;

export const feedbackKey = (uid: Uid) => ["feedback", uid] as const;

let open = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const openFeedback = () => {
  open = true;
  emit();
};

export const closeFeedback = () => {
  open = false;
  emit();
};

export const useFeedbackOpen = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => open,
  );

const snoozeKey = (uid: Uid) => `plotify:feedback-snooze:${uid}`;

export const isSnoozed = (uid: Uid) => {
  try {
    const until = Number(localStorage.getItem(snoozeKey(uid)));
    return until > Date.now();
  } catch {
    return false;
  }
};

export const snooze = (uid: Uid) => {
  try {
    localStorage.setItem(snoozeKey(uid), String(Date.now() + SNOOZE_MS));
  } catch {
    // storage can be unavailable (private mode); the popup may just ask again
  }
};
