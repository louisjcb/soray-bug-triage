# soray-bug-triage

A Discord bot that turns player bug reports into structured GitHub issues using
[Claude](https://www.anthropic.com/claude), with a human in the loop.

Built by [SorayLabs](https://soraylabs.me). Status: **early prototype (v0.1)**.

## The problem

Players report bugs in Discord in every possible way: one-line complaints,
screenshots, long stories. Someone has to read them, work out whether they are
real bugs, and copy the useful details into the issue tracker. For a small
studio, that is hours of repetitive work every week.

## What it does

1. Watches the Discord channels you choose.
2. Sends each message to Claude, which decides whether it is a bug report and
   extracts the title, steps to reproduce, expected and actual behavior,
   platform and severity.
3. Replies in the channel with a clean summary and a **Create GitHub issue**
   button.
4. A moderator clicks the button, and the bot opens the issue in your
   repository, labeled `needs-triage` and `bot-generated`.

```
Discord message
      |
      v
 Claude (forced tool use, JSON schema)
      |
      v
 Validation (types, lengths, label allow-list)
      |
      v
 Summary in Discord ---> moderator clicks ---> GitHub issue
```

## How Claude is used

- **Model:** Claude through the Anthropic API. The default is
  `claude-haiku-5-5` (fast and cheap for classification), configurable with
  `ANTHROPIC_MODEL`.
- **Structured output:** the bot forces a tool call (`submit_triage`) with a
  fixed JSON schema. Every field is then validated in `src/parse.ts` before use.
- **Untrusted input:** player messages are passed as data. The system prompt
  tells the model to ignore any instructions inside them, and the output can
  only fill the schema, so a malicious message cannot trigger actions.
- **No invention:** the prompt requires `Unknown` or `Not specified` for
  missing details instead of guesses.
- **Cost control:** short messages are skipped, non-bug messages produce no
  reply, and calls are capped per minute.

## Quick start

### 1. Create the Discord bot

1. Open the [Discord Developer Portal](https://discord.com/developers/applications)
   and create an application.
2. In **Bot**, click **Reset Token** and copy the token.
3. In **Bot > Privileged Gateway Intents**, enable **Message Content Intent**.
4. In **OAuth2 > URL Generator**, select the `bot` scope and the permissions
   **View Channels**, **Send Messages**, **Read Message History** and
   **Embed Links**. Open the generated URL to add the bot to your server.
5. In Discord, enable Developer Mode (User Settings > Advanced), then
   right-click your bug channel and **Copy Channel ID**.

### 2. Get your keys

- An Anthropic API key from the [Claude Console](https://console.anthropic.com).
- Optional: a GitHub **fine-grained personal access token** limited to the
  target repository with **Issues: read and write**. Without it, the bot runs
  in preview mode and shows the proposed issue without creating it.

### 3. Run it

```bash
git clone https://github.com/louisjcb/soray-bug-triage.git
cd soray-bug-triage
npm install
cp .env.example .env     # then fill in your values
npm run dev              # development, restarts on change
```

For production:

```bash
npm run build
npm start
```

Requires Node.js 20.6 or newer.

## Configuration

| Variable | Required | Description |
| --- | --- | --- |
| `DISCORD_TOKEN` | yes | Bot token |
| `ANTHROPIC_API_KEY` | yes | Anthropic API key |
| `BUG_CHANNEL_IDS` | yes | Comma-separated channel IDs to watch (threads of these channels are included) |
| `GITHUB_TOKEN` | no | Fine-grained token with Issues read/write on one repo |
| `GITHUB_REPO` | no | Target repository as `owner/repo` |
| `ANTHROPIC_MODEL` | no | Default `claude-haiku-5-5` |
| `MIN_CONFIDENCE` | no | Default `0.6` |
| `MIN_MESSAGE_LENGTH` | no | Default `20` |
| `MAX_TRIAGES_PER_MINUTE` | no | Default `10` |
| `AUTO_CREATE` | no | `true` skips moderator approval. Not recommended |

## Running on a Linux server

A minimal systemd unit (`/etc/systemd/system/soray-bug-triage.service`):

```ini
[Unit]
Description=soray-bug-triage Discord bot
After=network-online.target

[Service]
WorkingDirectory=/opt/soray-bug-triage
ExecStart=/usr/bin/node --env-file=.env dist/index.js
Restart=on-failure
User=soray

[Install]
WantedBy=multi-user.target
```

Then `sudo systemctl enable --now soray-bug-triage`.

## Privacy and safety

- The text of messages posted in the watched channels is sent to the Anthropic
  API for analysis. Tell your community and only watch public bug channels.
- The bot does not store messages. Pending proposals are kept in memory for 24
  hours and are lost on restart.
- Only members with the **Manage Messages** permission can create or dismiss an
  issue.
- Issue text is sanitized so it cannot ping GitHub users, and the issue links
  back to the Discord message instead of copying the author's name.

## Development

```bash
npm run typecheck
npm test
npm run build
```

Project layout:

```
src/
  index.ts      Discord client, message and button handlers
  triage.ts     Claude call (forced tool use)
  parse.ts      Validation of the model output
  format.ts     GitHub issue title and body
  github.ts     Issue creation
  ui.ts         Discord embed and buttons
  ratelimit.ts  Sliding-window limiter
  config.ts     Environment configuration
tests/          Unit tests (node:test)
```

## Roadmap

- Duplicate detection against existing issues
- Persistent storage for pending proposals
- Slash commands to triage a specific message on demand
- Per-server configuration

## License

[MIT](LICENSE)
