import assert from "node:assert/strict";
import test from "node:test";
import { RateLimiter } from "../src/ratelimit.js";

test("blocks calls over the limit and recovers after the window", () => {
  const limiter = new RateLimiter(2, 1000);
  assert.equal(limiter.tryAcquire(0), true);
  assert.equal(limiter.tryAcquire(10), true);
  assert.equal(limiter.tryAcquire(20), false);
  assert.equal(limiter.tryAcquire(1500), true);
});
