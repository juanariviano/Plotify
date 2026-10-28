// recap tahunan: semua judul yang selesai dalam satu tahun, dihitung jadi angka-angka untuk halaman recap.
// tz = menit selisih dari UTC seperti Date.getTimezoneOffset() di browser (WIB = -420),
// supaya batas tahun, bulan dan hari ikut jam lokal user

const MINUTE = 60 * 1000;

export const yearRange = (year, tz = 0) => ({
  start: new Date(Date.UTC(year, 0, 1) + tz * MINUTE).toISOString(),
  end: new Date(Date.UTC(year + 1, 0, 1) + tz * MINUTE).toISOString(),
});

// tanggal lokal user, dibaca dengan getUTC*
const local = (iso, tz) => new Date(Date.parse(iso) - tz * MINUTE);

// episode / halaman yang ditempuh: progress semua season, atau progress judul kalau belum ada riwayat season
const unitsOf = (m) =>
  m.seasons?.length ? m.seasons.reduce((sum, s) => sum + (s.last_episode ?? 0), 0) : (m.last_episode ?? 0);

const pick = (m) => ({
  id: m.id,
  title: m.title,
  type: m.type,
  image_url: m.image_url,
  rating: m.rating >= 1 ? m.rating : null,
  completed_at: m.completed_at,
  units: m.units,
});

const indexOfMax = (counts) => {
  const max = Math.max(...counts);
  return max > 0 ? counts.indexOf(max) : null;
};

/**
 * rows: media selesai dalam tahun itu, urut completed_at (kolom: lihat RECAP_FIELDS di mediaRoutes)
 * added: jumlah judul yang ditambahkan ke rak tahun itu
 */
export function buildRecap(rows, { year, tz = 0, added = 0 }) {
  const items = rows
    .map((m) => ({ ...m, units: unitsOf(m) }))
    .sort((a, b) => Date.parse(a.completed_at) - Date.parse(b.completed_at));

  const screen = items.filter((m) => m.type === "screen");
  const read = items.filter((m) => m.type === "read");
  const rated = items.filter((m) => m.rating >= 1);

  const months = new Array(12).fill(0);
  const weekdays = new Array(7).fill(0);
  const days = new Map();
  for (const m of items) {
    const d = local(m.completed_at, tz);
    months[d.getUTCMonth()] += 1;
    weekdays[d.getUTCDay()] += 1;
    const day = d.toISOString().slice(0, 10);
    days.set(day, (days.get(day) ?? 0) + 1);
  }

  // kategori ditulis bebas oleh user ("Drama" / "drama"), jadi digabung tanpa membedakan huruf besar
  const categories = new Map();
  for (const m of items) {
    for (const c of new Set((m.category ?? []).map((c) => c.trim().toLowerCase()).filter(Boolean))) {
      categories.set(c, (categories.get(c) ?? 0) + 1);
    }
  }

  const busiest = [...days].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  const biggest = items.reduce((best, m) => (m.units > (best?.units ?? 0) ? m : best), null);

  return {
    year,
    totals: {
      finished: items.length,
      screen: screen.length,
      read: read.length,
      rated: rated.length,
      added,
    },
    progress: {
      episodes: screen.reduce((sum, m) => sum + m.units, 0),
      pages: read.reduce((sum, m) => sum + m.units, 0),
    },
    averageRating: rated.length
      ? Math.round((rated.reduce((sum, m) => sum + m.rating, 0) / rated.length) * 10) / 10
      : null,
    months,
    topMonth: indexOfMax(months),
    weekdays,
    topWeekday: indexOfMax(weekdays),
    busiestDay: busiest && busiest[1] > 1 ? { date: busiest[0], count: busiest[1] } : null,
    topCategories: [...categories]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5),
    topRated: [...rated]
      .sort((a, b) => b.rating - a.rating || Date.parse(a.completed_at) - Date.parse(b.completed_at))
      .slice(0, 5)
      .map(pick),
    first: items.length ? pick(items[0]) : null,
    last: items.length > 1 ? pick(items[items.length - 1]) : null,
    biggest: biggest ? pick(biggest) : null,
  };
}
