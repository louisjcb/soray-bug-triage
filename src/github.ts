import { Octokit } from "@octokit/rest";
import { config } from "./config.js";

let octokit: Octokit | null = null;

export interface CreatedIssue {
  url: string;
  number: number;
}

export async function createIssue(title: string, body: string, labels: string[]): Promise<CreatedIssue> {
  const github = config.github;
  if (!github) {
    throw new Error("GitHub is not configured");
  }
  octokit ??= new Octokit({ auth: github.token });

  const response = await octokit.rest.issues.create({
    owner: github.owner,
    repo: github.repo,
    title,
    body,
    labels: [...new Set([...labels, "needs-triage", "bot-generated"])],
  });

  return { url: response.data.html_url, number: response.data.number };
}
