import { Context, Probot } from "probot";
import { getCheckOnRef, getPullRequests } from "./helpers/api";
import { Persistence } from "../freeze/persistence";

export const synchronizeCheckRunsFn = (
  app: Probot,
  getPersistence: (context: Context) => Promise<Persistence>
) => {
  app.on(["check_suite.requested"], async function (context) {
    const startTime = new Date();

    const persistence = await getPersistence(context);

    const checkSuite = context.payload.check_suite;
    const pullRequests = await getPullRequests(checkSuite, context);
    const [checkAttributes] = persistence.getCheckStatus(pullRequests);

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

    const checkData = context.repo({
      check_run_id: checkRun.data.id,
    });
    return persistence.onCreateCheck(checkData);
  });

  app.on(
    ["pull_request.opened", "pull_request.reopened", "pull_request.edited"],
    async function (context) {
      const persistence = await getPersistence(context);

      const pullRequest = context.payload.pull_request;
      const checkRun = await getCheckOnRef(context, pullRequest.head.sha);

      const checkData = context.repo({
        check_run_id: checkRun.id,
      });
      const [checkAttributes] = persistence.getCheckStatus([pullRequest]);

      await context.octokit.checks.update({
        ...checkData,
        ...checkAttributes,
      });
      return persistence.onUpdateCheck(checkData);
    }
  );
};
