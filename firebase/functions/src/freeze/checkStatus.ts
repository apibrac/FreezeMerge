import { Octokit } from "@octokit/rest";

type ArgsType<T> = T extends (arg: infer U) => any ? U : never;
export type CheckAttributes = Partial<
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
