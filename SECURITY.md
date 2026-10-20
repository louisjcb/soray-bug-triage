# Security policy

## Reporting a vulnerability

Please do not open a public issue for security problems. Email
**contact@soraylabs.me** with a description and, if possible, steps to reproduce.
You will get a reply as soon as possible.

## Handling secrets

- Never commit `.env`. It is listed in `.gitignore`.
- Use a GitHub fine-grained token limited to a single repository with
  **Issues: read and write** only.
- Rotate the Discord token and the Anthropic API key immediately if they leak.
