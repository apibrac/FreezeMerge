import { Probot } from "probot";
import { getCheckOnRef, getPullRequests } from "./helpers/api";
import { getPersistenceFromProbot } from "./config";

export const probotApp = (app: Probot) => {
  app.on(["check_suite.requested"], async function (context) {
    const startTime = new Date();

    const persistence = getPersistenceFromProbot(context);

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
      const persistence = await getPersistenceFromProbot(context);

      const pullRequest = context.payload.pull_request;
      const checkRun = await getCheckOnRef(context, pullRequest.head.sha);
      if (!checkRun) {
        console.log("No check on this PR for now");
        return;
      }

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
