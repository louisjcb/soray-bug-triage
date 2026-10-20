import {
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
  PermissionFlagsBits,
  type ButtonInteraction,
  type Message,
} from "discord.js";
import { config } from "./config.js";
import { buildIssueBody, buildIssueTitle } from "./format.js";
import { createIssue } from "./github.js";
import { RateLimiter } from "./ratelimit.js";
import { triageMessage } from "./triage.js";
import type { TriageResult } from "./types.js";
import { buildButtons, buildProposalEmbed } from "./ui.js";

const MAX_INPUT_CHARS = 4000;
const PROPOSAL_TTL_MS = 24 * 60 * 60 * 1000;

interface Proposal {
  triage: TriageResult;
  messageUrl: string;
  attachments: string[];
  createdAt: number;
  status: "pending" | "creating" | "done" | "dismissed";
}

/** Pending proposals live in memory. They are lost on restart, which is fine for an alpha. */
const proposals = new Map<string, Proposal>();
const inFlight = new Set<string>();
const limiter = new RateLimiter(config.maxTriagesPerMinute, 60_000);

function pruneProposals(): void {
  const now = Date.now();
  for (const [id, proposal] of proposals) {
    if (now - proposal.createdAt > PROPOSAL_TTL_MS) proposals.delete(id);
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, (ready) => {
  console.log(`Logged in as ${ready.user.tag}`);
  console.log(`Watching ${config.bugChannelIds.size} channel(s). Model: ${config.model}`);
  console.log(
    config.github
      ? `GitHub target: ${config.github.owner}/${config.github.repo} (${config.autoCreate ? "auto-create" : "moderator approval"})`
      : "GitHub not configured: running in preview mode",
  );
});

async function handleMessage(message: Message): Promise<void> {
  if (message.author.bot || !message.inGuild()) return;

  const channelId = message.channel.isThread() ? message.channel.parentId : message.channelId;
  if (!channelId || !config.bugChannelIds.has(channelId)) return;

  const text = message.content.trim();
  if (text.length < config.minMessageLength) return;
  if (inFlight.has(message.id)) return;

  if (!limiter.tryAcquire()) {
    console.warn("Rate limit reached, skipping a message");
    return;
  }

  inFlight.add(message.id);
  try {
    const attachments = [...message.attachments.values()].map((attachment) => attachment.url);
    const triage = await triageMessage(text.slice(0, MAX_INPUT_CHARS), attachments.length);

    if (!triage.isBugReport || triage.confidence < config.minConfidence) {
      console.log(
        `Skipped message ${message.id} (bug=${triage.isBugReport}, confidence=${triage.confidence})`,
      );
      return;
    }

    const embed = buildProposalEmbed(triage);

    if (config.github && config.autoCreate) {
      const issue = await createIssue(
        buildIssueTitle(triage),
        buildIssueBody(triage, { messageUrl: message.url, attachments, reviewed: false }),
        triage.labels,
      );
      await message.reply({
        content: `Issue created: ${issue.url}`,
        embeds: [embed],
        allowedMentions: { repliedUser: false },
      });
      return;
    }

    pruneProposals();
    proposals.set(message.id, {
      triage,
      messageUrl: message.url,
      attachments,
      createdAt: Date.now(),
      status: "pending",
    });

    await message.reply({
      content: config.github
        ? "This looks like a bug report. A moderator can create a GitHub issue from it:"
        : "This looks like a bug report. Preview mode: GitHub is not configured, so no issue can be created.",
      embeds: [embed],
      components: config.github ? [buildButtons(message.id)] : [],
      allowedMentions: { repliedUser: false },
    });
  } finally {
    inFlight.delete(message.id);
  }
}

async function handleButton(interaction: ButtonInteraction): Promise<void> {
  const [prefix, action, id] = interaction.customId.split(":");
  if (prefix !== "soray" || !id) return;

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
    await interaction.reply({
      content: "Only moderators with the Manage Messages permission can do this.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const proposal = proposals.get(id);
  if (!proposal) {
    await interaction.reply({
      content: "This report has expired or the bot was restarted.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  if (proposal.status !== "pending") {
    await interaction.reply({
      content: "This report was already handled.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (action === "dismiss") {
    proposal.status = "dismissed";
    await interaction.update({
      content: `Dismissed by ${interaction.user.displayName}.`,
      components: [],
    });
    return;
  }

  if (action === "create") {
    proposal.status = "creating";
    await interaction.deferUpdate();
    try {
      const issue = await createIssue(
        buildIssueTitle(proposal.triage),
        buildIssueBody(proposal.triage, {
          messageUrl: proposal.messageUrl,
          attachments: proposal.attachments,
          reviewed: true,
        }),
        proposal.triage.labels,
      );
      proposal.status = "done";
      await interaction.editReply({ content: `Issue created: ${issue.url}`, components: [] });
    } catch (error) {
      proposal.status = "pending";
      console.error("Failed to create the GitHub issue:", error);
      await interaction.followUp({
        content: "Could not create the issue. Check the bot logs and your GitHub token.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}

client.on(Events.MessageCreate, (message) => {
  handleMessage(message).catch((error) => console.error("Failed to handle a message:", error));
});

client.on(Events.InteractionCreate, (interaction) => {
  if (!interaction.isButton()) return;
  handleButton(interaction).catch(async (error) => {
    console.error("Failed to handle a button:", error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({ content: "Something went wrong.", flags: MessageFlags.Ephemeral })
        .catch(() => undefined);
    }
  });
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    console.log(`${signal} received, shutting down`);
    void client.destroy().finally(() => process.exit(0));
  });
}

await client.login(config.discordToken);
