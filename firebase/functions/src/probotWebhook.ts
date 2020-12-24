import { Probot } from "probot";
import { logger } from "firebase-functions";
import { getCheckStatus } from "./checkRunStatus";
import { getInstallationFromContext } from "./installationModel";
import { getPullRequests, getCheckOnRef } from "./githubApi";

export default (app: Probot) => {
  app.on(["check_suite.requested"], async function (context) {
    const startTime = new Date();

    const installation = await getInstallationFromContext(context);

    const checkSuite = context.payload.check_suite;
    const pullRequests = await getPullRequests(checkSuite, context);

    const checkRun = await context.octokit.checks.create(
      context.repo({
        name: "Freeze Merge",
        head_branch: checkSuite.head_branch,
        head_sha: checkSuite.head_sha,
        status: "completed",
        started_at: startTime.toISOString(),
        ...getCheckStatus(installation, pullRequests),
      })
    );

    const checkData = context.repo({
      check_run_id: checkRun.data.id,
    });
    logger.info("Created check", checkData);
    return installation.createCheck(checkData);
  });

  app.on(
    ["pull_request.opened", "pull_request.reopened", "pull_request.edited"],
    async function (context) {
      const installation = await getInstallationFromContext(context);

      const pullRequest = context.payload.pull_request;
      const checkRun = await getCheckOnRef(context, pullRequest.head.sha);

      const checkData = context.repo({
        check_run_id: checkRun.id,
      });
      logger.info("Updating check", checkData);

      await context.octokit.checks.update({
        ...checkData,
        ...getCheckStatus(installation, [pullRequest]),
      });
      return installation.createCheck(checkData);
    }
  );
};
