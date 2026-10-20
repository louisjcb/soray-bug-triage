/** Sliding-window limiter used to cap the number of Claude calls per minute. */
export class RateLimiter {
  private timestamps: number[] = [];

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  tryAcquire(now: number = Date.now()): boolean {
    this.timestamps = this.timestamps.filter((time) => now - time < this.windowMs);
    if (this.timestamps.length >= this.max) return false;
    this.timestamps.push(now);
    return true;
  }
}
