// preset animasi popup. dibuat pendek supaya popup tetap terasa cepat
export const ease = [0.16, 1, 0.3, 1] as const;

// pergantian tampilan (track / pilih judul / add)
export const page = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.32, ease } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.14 } },
};

// baris daftar muncul berurutan
export const rise = (index: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease, delay: Math.min(index, 8) * 0.04 } },
});

export const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

// panel yang membuka / menutup ke bawah
export const collapse = {
  initial: { height: 0, opacity: 0 },
  animate: { height: "auto", opacity: 1, transition: { duration: 0.3, ease } },
  exit: { height: 0, opacity: 0, transition: { duration: 0.18 } },
};

export const pop = { type: "spring", stiffness: 520, damping: 24 } as const;
