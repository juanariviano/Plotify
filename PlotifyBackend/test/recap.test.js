import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRecap, yearRange } from "../src/utils/recap.js";

const media = (over) => ({
  id: 1,
  title: "x",
  type: "screen",
  image_url: null,
  category: [],
  rating: 0,
  last_episode: 0,
  completed_at: "2026-03-10T12:00:00Z",
  seasons: [],
  ...over,
});

test("yearRange follows the user's timezone", () => {
  // WIB (UTC+7): getTimezoneOffset() = -420, so the year starts at 17:00 UTC the day before
  assert.deepEqual(yearRange(2026, -420), {
    start: "2025-12-31T17:00:00.000Z",
    end: "2026-12-31T17:00:00.000Z",
  });
  assert.equal(yearRange(2026).start, "2026-01-01T00:00:00.000Z");
});

test("empty year", () => {
  const r = buildRecap([], { year: 2026 });
  assert.equal(r.totals.finished, 0);
  assert.equal(r.topMonth, null);
  assert.equal(r.averageRating, null);
  assert.equal(r.first, null);
  assert.equal(r.last, null);
  assert.equal(r.biggest, null);
});

test("totals, progress and ratings", () => {
  const r = buildRecap(
    [
      media({ id: 1, rating: 5, seasons: [{ last_episode: 10 }, { last_episode: 12 }] }),
      media({ id: 2, rating: 4, last_episode: 3, completed_at: "2026-03-11T00:00:00Z" }),
      media({ id: 3, type: "read", rating: 0, last_episode: 320, completed_at: "2026-07-01T00:00:00Z" }),
    ],
    { year: 2026, added: 7 },
  );

  assert.deepEqual(r.totals, { finished: 3, screen: 2, read: 1, rated: 2, added: 7 });
  assert.deepEqual(r.progress, { episodes: 25, pages: 320 });
  assert.equal(r.averageRating, 4.5);
  assert.deepEqual(r.topRated.map((m) => m.id), [1, 2]);
  assert.equal(r.biggest.id, 3);
  // unrated titles report null, not 0
  assert.equal(r.biggest.rating, null);
});

test("months, weekdays and days use local time", () => {
  // 20:00 UTC on 31 march is already 1 april in WIB
  const rows = [media({ completed_at: "2026-03-31T20:00:00Z" })];
  assert.equal(buildRecap(rows, { year: 2026 }).topMonth, 2);
  assert.equal(buildRecap(rows, { year: 2026, tz: -420 }).topMonth, 3);
  // 1 april 2026 is a wednesday
  assert.equal(buildRecap(rows, { year: 2026, tz: -420 }).topWeekday, 3);
});

test("first and last follow completion order, busiest day needs two titles", () => {
  const rows = [
    media({ id: 2, completed_at: "2026-05-02T10:00:00Z" }),
    media({ id: 1, completed_at: "2026-01-05T10:00:00Z" }),
    media({ id: 3, completed_at: "2026-05-02T18:00:00Z" }),
  ];
  const r = buildRecap(rows, { year: 2026 });
  assert.equal(r.first.id, 1);
  assert.equal(r.last.id, 3);
  assert.deepEqual(r.busiestDay, { date: "2026-05-02", count: 2 });

  assert.equal(buildRecap([rows[0]], { year: 2026 }).busiestDay, null);
  assert.equal(buildRecap([rows[0]], { year: 2026 }).last, null);
});

test("categories are merged case-insensitively and counted once per title", () => {
  const r = buildRecap(
    [
      media({ category: ["Drama", "drama ", "Thriller"] }),
      media({ category: ["drama"] }),
      media({ category: ["comedy"] }),
    ],
    { year: 2026 },
  );
  assert.deepEqual(r.topCategories, [
    ["drama", 2],
    ["comedy", 1],
    ["thriller", 1],
  ]);
});
