import { extractTags } from "./smartTagExtract";
import { Octokit } from "@octokit/rest";
import { Installation } from "./persistentData";

type ArgsType<T> = T extends (arg: infer U) => any ? U : never;
type CheckAttributes = Partial<
  ArgsType<Octokit["checks"]["create"]> & ArgsType<Octokit["checks"]["update"]>
>;

export const checkRunStatus = {
  success: (): CheckAttributes => ({
    conclusion: "success",
    completed_at: new Date().toISOString(),
  }),

  freezed: (): CheckAttributes => ({
    conclusion: "failure",
    completed_at: new Date().toISOString(),
  }),

  notSynced: (): CheckAttributes => ({
    conclusion: "success",
    completed_at: new Date().toISOString(),
  }),
};

export function getCheckStatus(
  installation: Installation,
  pull_requests: { title: string; url: string; head: { sha: string } }[]
) {
  const {
    freezed,
    whitelistedPullRequestUrls,
    whitelistedTickets,
  } = installation.data;

  if (!freezed) return checkRunStatus.success();

  if (
    pull_requests.find((pr) => whitelistedPullRequestUrls.includes(pr.url)) ||
    pull_requests.find((pr) =>
      extractTags(pr.title).find((key) => whitelistedTickets.includes(key))
    )
  )
    return checkRunStatus.success();

  return checkRunStatus.freezed();
}
