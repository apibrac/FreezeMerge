import { logger } from "firebase-functions";
import { Probot } from "probot";

export default (app: Probot) => {
  app.on(
    ["check_suite.requested"], // , "check_run.rerequested"
    async function (context) {
      const startTime = new Date();

      const {
        head_branch: headBranch,
        head_sha: headSha,
      } = context.payload.check_suite;

      const check = await context.octokit.checks.create(
        context.repo({
          name: "Freeze Merge",
          head_branch: headBranch,
          head_sha: headSha,
          status: "completed",
          started_at: startTime.toISOString(),
          conclusion: "success",
          completed_at: new Date().toISOString(),
        })
      );
      logger.info("checkId", check.data.id);
      return check;
    }
  );
};
