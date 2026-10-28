import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { rateLimit, resetMemoryLimits, clientIp } from "../src/middleware/rateLimit.js";

const fakeRes = () => {
  const res = { headers: {}, statusCode: 200, body: null };
  res.set = (k, v) => ((res.headers[k] = v), res);
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (body) => ((res.body = body), res);
  return res;
};

const call = async (mw, ip = "1.2.3.4") => {
  const res = fakeRes();
  let passed = false;
  await mw({ headers: { "x-forwarded-for": `${ip}, 10.0.0.1` }, socket: {} }, res, () => (passed = true));
  return { res, passed };
};

beforeEach(() => resetMemoryLimits());

test("allows up to the limit, then answers 429 with Retry-After", async () => {
  const mw = rateLimit({ name: "t1", limit: 2, windowSec: 60, by: "ip" });

  assert.equal((await call(mw)).passed, true);
  assert.equal((await call(mw)).passed, true);

  const { res, passed } = await call(mw);
  assert.equal(passed, false);
  assert.equal(res.statusCode, 429);
  assert.ok(Number(res.headers["Retry-After"]) > 0);
  assert.equal(res.body.retryAfter, Number(res.headers["Retry-After"]));
});

test("each client and each limit name is counted separately", async () => {
  const a = rateLimit({ name: "t2", limit: 1, windowSec: 60, by: "ip" });
  const b = rateLimit({ name: "t3", limit: 1, windowSec: 60, by: "ip" });

  assert.equal((await call(a, "1.1.1.1")).passed, true);
  assert.equal((await call(a, "2.2.2.2")).passed, true);
  assert.equal((await call(b, "1.1.1.1")).passed, true);
  assert.equal((await call(a, "1.1.1.1")).passed, false);
});

test("client ip comes from the first forwarded entry", () => {
  assert.equal(clientIp({ headers: { "x-forwarded-for": "9.9.9.9, 10.0.0.1" }, socket: {} }), "9.9.9.9");
  assert.equal(clientIp({ headers: { "x-real-ip": "8.8.8.8" }, socket: {} }), "8.8.8.8");
});
