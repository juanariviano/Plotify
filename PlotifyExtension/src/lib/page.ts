import type { PageInfo } from "../types";

// selector judul untuk situs yang sering dipakai. hasilnya dicoba lebih dulu
// sebelum tebakan umum (json-ld, og:title, h1, judul tab). tambah situs baru di sini
const SITE_SELECTORS: [host: string, selectors: string[]][] = [
  ["netflix.com", ['[data-uia="video-title"] h4', '[data-uia="video-title"]', '[data-uia="title-info-title"]']],
  ["primevideo.com", ['h1[data-automation-id="title"]']],
  ["crunchyroll.com", [".show-title-link h4", ".current-media-parent-ref h4", "h1.title"]],
  ["myanimelist.net", ["h1.title-name", ".h1-title .title-name"]],
  ["anilist.co", [".header .content h1"]],
  ["imdb.com", ['[data-testid="hero__pageTitle"]']],
  ["letterboxd.com", ["h1.headline-1", ".film-title-wrapper .name"]],
  ["goodreads.com", ['[data-testid="bookTitle"]', "h1#bookTitle"]],
  ["webtoons.com", [".subj_info .subj", "h1.subj"]],
  ["mangadex.org", [".manga-container .title p", "a[href^='/title/'] .line-clamp-1"]],
];

// dijalankan di dalam tab lewat chrome.scripting, jadi tidak boleh memakai apa pun
// dari luar fungsi ini (selector situs dikirim lewat argumen)
function readPage(sites: [string, string[]][]): Omit<PageInfo, "url"> {
  const found: string[] = [];
  // true kalau ada tanda jelas bahwa halaman ini film / seri / bacaan
  let confident = false;
  const push = (value: unknown) => {
    if (typeof value !== "string") return false;
    const clean = value.replace(/\s+/g, " ").trim();
    if (!clean || clean.length > 200) return false;
    found.push(clean);
    return true;
  };
  const meta = (key: string) =>
    document.querySelector<HTMLMetaElement>(`meta[property="${key}"], meta[name="${key}"]`)?.content ?? null;
  const textOf = (selector: string) => {
    try {
      return document.querySelector<HTMLElement>(selector)?.innerText ?? null;
    } catch {
      return null;
    }
  };

  const host = location.hostname;
  for (const [site, selectors] of sites) {
    if (host === site || host.endsWith(`.${site}`)) {
      selectors.forEach((s) => {
        if (push(textOf(s))) confident = true;
      });
    }
  }

  // json-ld: judul seri (partOfSeries) lebih berguna daripada judul episode
  const walk = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(walk);
    const item = node as Record<string, unknown>;
    walk(item["@graph"]);
    const type = ([] as unknown[]).concat(item["@type"]).join(" ");
    if (/Series|Season|Episode|Chapter|Movie|Book|Comic|CreativeWork|VideoObject/i.test(type)) {
      walk(item.partOfSeries);
      walk(item.isPartOf);
      if (push(item.name) && /Series|Season|Episode|Chapter|Movie|Book|Comic/i.test(type)) confident = true;
    }
  };
  document.querySelectorAll('script[type="application/ld+json"]').forEach((el) => {
    try {
      walk(JSON.parse(el.textContent ?? ""));
    } catch {
      // json-ld rusak di beberapa situs, lewati saja
    }
  });

  if (/^(video\.(movie|episode|tv_show)|book)/.test(meta("og:type") ?? "")) confident = true;
  push(meta("og:title"));
  push(meta("twitter:title"));
  push(textOf("h1"));
  push(document.title);

  const selection = window.getSelection()?.toString().replace(/\s+/g, " ").trim() ?? "";

  return {
    title: document.title,
    siteName: meta("og:site_name"),
    candidates: found,
    confident,
    selection: selection && selection.length <= 200 ? selection : null,
  };
}

// baca tab aktif. halaman yang tidak bisa disisipi script (chrome://, web store, pdf)
// tetap memberi url dan judul tab
export const loadPage = async (): Promise<PageInfo | null> => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) return null;

  const fallback: PageInfo = {
    url: tab.url,
    title: tab.title ?? "",
    siteName: null,
    candidates: tab.title ? [tab.title] : [],
    confident: false,
    selection: null,
  };
  if (!/^https?:/.test(tab.url)) return fallback;

  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: readPage,
      args: [SITE_SELECTORS],
    });
    return result?.result ? { url: tab.url, ...result.result } : fallback;
  } catch {
    return fallback;
  }
};
