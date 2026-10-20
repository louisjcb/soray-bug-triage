function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name} (see .env.example)`);
  }
  return value;
}

function optionalNumber(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a number, got "${raw}"`);
  }
  return value;
}

function parseGithub(): { token: string; owner: string; repo: string } | null {
  const token = process.env.GITHUB_TOKEN?.trim();
  const target = process.env.GITHUB_REPO?.trim();
  if (!token || !target) return null;
  const [owner, repo, ...rest] = target.split("/");
  if (!owner || !repo || rest.length > 0) {
    throw new Error('GITHUB_REPO must look like "owner/repo"');
  }
  return { token, owner, repo };
}

export const config = {
  discordToken: required("DISCORD_TOKEN"),
  anthropicApiKey: required("ANTHROPIC_API_KEY"),
  model: process.env.ANTHROPIC_MODEL?.trim() || "claude-haiku-5-5",
  bugChannelIds: new Set(
    required("BUG_CHANNEL_IDS")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  ),
  github: parseGithub(),
  autoCreate: process.env.AUTO_CREATE?.trim().toLowerCase() === "true",
  minConfidence: optionalNumber("MIN_CONFIDENCE", 0.6),
  minMessageLength: optionalNumber("MIN_MESSAGE_LENGTH", 20),
  maxTriagesPerMinute: optionalNumber("MAX_TRIAGES_PER_MINUTE", 10),
};
