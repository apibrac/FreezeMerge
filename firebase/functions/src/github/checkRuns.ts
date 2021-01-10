import { Context, Probot } from "probot";
import { getCheckOnRef, getPullRequests } from "./helpers/api";
import { Persistence } from "../freeze/persistence";

export const synchronizeCheckRunsFn = (
  app: Probot,
  getPersistence: (context: Context) => Persistence
) => {
  app.on(["check_suite.requested"], async function (context) {
    const startTime = new Date();

    const persistence = getPersistence(context);

    const checkSuite = context.payload.check_suite;
    const pullRequests = await getPullRequests(checkSuite, context);

    return persistence.synchronizeCheck({
      pullRequests,

      saveAndBuildHook: async (checkAttributes) => {
        const checkRun = await context.octokit.checks.create(
          context.repo({
            name: "Freeze Merge",
            head_branch: checkSuite.head_branch,
            head_sha: checkSuite.head_sha,
            status: "completed",
            started_at: startTime.toISOString(),
            ...checkAttributes,
          })
        );

        const hook = context.repo({
          check_run_id: checkRun.data.id,
        });
        return hook;
      },
    });
  });

  app.on(
    [
      "pull_request.opened",
      "pull_request.reopened",
      "pull_request.edited",
      "pull_request.synchronize",
    ],
    async function (context) {
      const persistence = await getPersistence(context);

      const pullRequest = context.payload.pull_request;
      const checkRun = await getCheckOnRef(context, pullRequest.head.sha);

      const checkData = context.repo({
        check_run_id: checkRun.id,
      });

      return persistence.synchronizeCheck({
        pullRequests: [pullRequest],

        saveAndBuildHook: async (checkAttributes) => {
          await context.octokit.checks.update({
            ...checkData,
            ...checkAttributes,
          });

          return checkData;
        },
      });
    }
  );
};
