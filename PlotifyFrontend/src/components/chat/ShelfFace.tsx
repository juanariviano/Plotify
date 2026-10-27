import { motion, useReducedMotion, type TargetAndTransition } from "motion/react";

export type FaceMood = "idle" | "open" | "thinking";

type ShelfFaceProps = {
  mood?: FaceMood;
  className?: string;
};

// bentuk mulut: semua pakai perintah yang sama (M Q Q Z) supaya bisa di-morph
const MOUTH = {
  smile: "M16.4 25.6 Q20 29 23.6 25.6 Q20 27.2 16.4 25.6 Z",
  small: "M17.8 26.2 Q20 27.6 22.2 26.2 Q20 26.4 17.8 26.2 Z",
  open: "M17.6 25.4 Q20 30.2 22.4 25.4 Q20 24.6 17.6 25.4 Z",
  flat: "M17.2 26.4 Q20 27 22.8 26.4 Q20 26.6 17.2 26.4 Z",
};

// arah lirikan mata per mood
const GAZE: Record<FaceMood, TargetAndTransition> = {
  idle: {
    x: [0, 0, 1.3, 1.3, -1.1, -1.1, 0, 0],
    y: 0,
    transition: { duration: 9, times: [0, 0.18, 0.24, 0.46, 0.52, 0.72, 0.78, 1], repeat: Infinity, ease: "easeInOut" },
  },
  open: { x: -1, y: -1.1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
  thinking: {
    x: [-1.4, 1.4],
    y: 0.4,
    transition: { duration: 0.7, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" },
  },
};

// gerak mulut: bergumam pelan saat idle, lebih cepat saat thinking
const MOUTH_LOOP: Record<FaceMood, TargetAndTransition> = {
  idle: {
    d: [MOUTH.smile, MOUTH.small, MOUTH.smile, MOUTH.open, MOUTH.small, MOUTH.smile],
    transition: { duration: 3.2, times: [0, 0.15, 0.3, 0.45, 0.6, 1], repeat: Infinity, repeatDelay: 1.6, ease: "easeInOut" },
  },
  open: { d: MOUTH.smile, transition: { duration: 0.4 } },
  thinking: {
    d: [MOUTH.flat, MOUTH.small, MOUTH.flat, MOUTH.open, MOUTH.flat],
    transition: { duration: 1.4, repeat: Infinity, ease: "easeInOut" },
  },
};

/**
 * karakter chatbot plotify: wajah bergaris tinta dengan pita bookmark di atasnya.
 * matanya berkedip dan membaca kiri-kanan, mulutnya bergerak pelan.
 */
const ShelfFace = ({ mood = "idle", className = "" }: ShelfFaceProps) => {
  const reduce = useReducedMotion();

  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      {/* pita bookmark, bergoyang pelan dari ujung atasnya */}
      <motion.path
        d="M24 0 H29.5 V10.5 L26.75 8.4 L24 10.5 Z"
        fill="var(--color-accent)"
        style={{ transformBox: "fill-box", originX: 0.5, originY: 0 }}
        animate={reduce ? undefined : { rotate: [-5, 5] }}
        transition={{ duration: 2.6, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
      />

      {/* alis tipis, naik sedikit saat panel terbuka */}
      <motion.g
        stroke="var(--color-ink)"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
        animate={{ y: mood === "open" ? -0.9 : mood === "thinking" ? 0.4 : 0 }}
        transition={{ duration: 0.4 }}
      >
        <path d="M12.8 15.4 Q14.9 14.4 17 15.2" />
        <path d="M23 15.2 Q25.1 14.4 27.2 15.4" />
      </motion.g>

      {/* mata: lirikan (luar) + kedipan (dalam) */}
      <motion.g animate={reduce ? undefined : GAZE[mood]}>
        <motion.g
          fill="var(--color-ink)"
          style={{ transformBox: "fill-box", originY: 0.5 }}
          animate={
            reduce
              ? undefined
              : {
                  scaleY: [1, 1, 0.1, 1, 1, 0.1, 1, 0.1, 1, 1],
                  transition: {
                    duration: 7,
                    times: [0, 0.3, 0.32, 0.34, 0.78, 0.8, 0.82, 0.84, 0.86, 1],
                    repeat: Infinity,
                  },
                }
          }
        >
          <ellipse cx="15" cy="19.4" rx="1.55" ry="2.15" />
          <ellipse cx="25" cy="19.4" rx="1.55" ry="2.15" />
        </motion.g>
      </motion.g>

      {/* mulut */}
      <motion.path
        d={MOUTH.smile}
        fill="var(--color-ink)"
        stroke="var(--color-ink)"
        strokeWidth="0.6"
        strokeLinejoin="round"
        animate={reduce ? undefined : MOUTH_LOOP[mood]}
      />
    </svg>
  );
};

export default ShelfFace;
