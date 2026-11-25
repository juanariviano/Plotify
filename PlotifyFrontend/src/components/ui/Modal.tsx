import { AnimatePresence, motion, useIsPresent } from "motion/react";
import { useId, useLayoutEffect, useRef, type PointerEvent, type ReactNode } from "react";
import { easeOut } from "../../lib/motion";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  tone?: "default" | "danger";
  dismissDisabled?: boolean;
};

const isBackdrop = ({ currentTarget, clientX, clientY }: PointerEvent<HTMLDialogElement>) => {
  const { left, right, top, bottom } = currentTarget.getBoundingClientRect();
  return clientX < left || clientX > right || clientY < top || clientY > bottom;
};

const ModalPanel = ({ onClose, title, children, tone, dismissDisabled }: Omit<ModalProps, "open">) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressedBackdrop = useRef(false);
  const titleId = useId();
  const isPresent = useIsPresent();
  const canDismiss = isPresent && !dismissDisabled;

  useLayoutEffect(() => {
    const dialog = dialogRef.current!;
    dialog.querySelector("[data-autofocus]")?.setAttribute("autofocus", "");
    dialog.showModal();
    // Keep the dialog modal through its exit animation, then let the browser restore focus.
    return () => dialog.close();
  }, []);

  return (
    <motion.dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      closedby={canDismiss ? "any" : "none"}
      data-closing={!isPresent || undefined}
      className={`plotify-modal fixed inset-0 m-auto mb-0 max-h-[100dvh] w-full max-w-md overflow-auto bg-white p-7 shadow-[0_24px_60px_-20px_rgb(23_22_15/0.35)] sm:mb-auto sm:max-h-[calc(100dvh-3rem)] sm:p-8 ${
        tone === "danger" ? "border-t-4 border-danger" : "border-t-4 border-ink"
      }`}
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.35, ease: easeOut }}
      onCancel={(event) => {
        event.preventDefault();
        if (canDismiss) onClose();
      }}
      onPointerDown={(event) => {
        pressedBackdrop.current =
          canDismiss && !("closedBy" in event.currentTarget) && event.button === 0 && isBackdrop(event);
      }}
      onPointerUp={(event) => {
        const dismiss = canDismiss && pressedBackdrop.current && isBackdrop(event);
        pressedBackdrop.current = false;
        if (dismiss) onClose();
      }}
      onPointerCancel={() => { pressedBackdrop.current = false; }}
    >
      <h1 id={titleId} className="mb-3 font-serif text-[28px] leading-tight tracking-[-0.01em]">{title}</h1>
      {children}
    </motion.dialog>
  );
};

const Modal = ({ open, ...props }: ModalProps) => {
  return (
    <AnimatePresence>
      {open && <ModalPanel {...props} />}
    </AnimatePresence>
  );
};

export default Modal;
