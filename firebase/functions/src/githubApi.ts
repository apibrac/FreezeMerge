import { Context } from "probot";
import { logger } from "firebase-functions";
import { Octokit } from "@octokit/rest";

type RepoData = { owner: string; repo: string };
const contextRepo = ({ owner, repo }: RepoData, pull_number: number) => ({
  owner,
  repo,
  pull_number,
});

export async function getPullRequests(
  check: {
    head_sha: string;
    pull_requests: { number: number; head: { sha: string } }[];
  },
  context: Context | { octokit: Octokit; checkData: RepoData }
) {
  const pullRequests = check.pull_requests.filter(
    ({ head }) => head.sha === check.head_sha
  );

  const results = await Promise.all(
    pullRequests.map((pr) =>
      context.octokit.pulls.get(
        "checkData" in context
          ? contextRepo(context.checkData, pr.number)
          : context.repo({ pull_number: pr.number })
      )
    )
  );

  return results.map(({ data }) => data);
}
export async function getCheckOnRef(context: Context, ref: string) {
  const checkRunsRequest = await context.octokit.checks.listForRef(
    context.repo({ ref })
  );
  const checkRuns = checkRunsRequest.data.check_runs;

  if (checkRuns.length === 0) {
    throw new Error("No check on this PR head");
  }
  if (checkRuns.length > 1) {
    logger.warn(
      "Case not implemented: shouldn't have more than one check on a commit"
    );
  }

  return checkRuns[0];
}
