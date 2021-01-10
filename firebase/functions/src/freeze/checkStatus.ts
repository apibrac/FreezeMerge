import { Octokit } from "@octokit/rest";

type ArgsType<T> = T extends (arg: infer U) => any ? U : never;
export type CheckAttributes = Partial<
  ArgsType<Octokit["checks"]["create"]> & ArgsType<Octokit["checks"]["update"]>
>;

export const checkRunStatus = {
  success: (): CheckAttributes => ({
    conclusion: "success",
    completed_at: new Date().toISOString(),
    output: {
      title: "OK",
      summary: "Freeze not running",
    },
  }),

  freezed: (): CheckAttributes => ({
    conclusion: "failure",
    completed_at: new Date().toISOString(),
    output: {
      title: "FREEZED",
      summary: "Not mergable, freeze is running",
    },
  }),

  notSynced: (): CheckAttributes => ({
    conclusion: "success",
    completed_at: new Date().toISOString(),
    output: {
      title: "Outdated",
      summary: "This commit is not ctracked anymore",
    },
  }),

  whtelistedPullRequest: (number: number): CheckAttributes => ({
    conclusion: "success",
    completed_at: new Date().toISOString(),
    output: {
      title: "Whitelisted PR",
      summary: `This commit is whitelisted because PR #${number} is.`,
    },
  }),

  whitelistedTicket: (tag: string): CheckAttributes => ({
    conclusion: "success",
    completed_at: new Date().toISOString(),
    output: {
      title: "Whitelisted ticket",
      summary: `This commit is whitelisted because ticket ${tag} is.`,
    },
  }),
};
