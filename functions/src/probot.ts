import { logger } from "firebase-functions";
import { Probot } from "probot";

export default (app: Probot) => {
  app.on(
    ["check_suite.requested", "check_run.rerequested"],
    async function (context) {
      logger.info("Check context payload", context.payload);
      // const startTime = new Date();

      // const {
      //   head_branch: headBranch,
      //   head_sha: headSha,
      // } = context.payload.check_suite;
      // // Probot API note: context.repo() => {username: 'hiimbex', repo: 'testing-things'}
      // return context.octokit.checks.create(
      //   context.repo({
      //     name: "My app!",
      //     head_branch: headBranch,
      //     head_sha: headSha,
      //     status: "completed",
      //     started_at: startTime,
      //     conclusion: "success",
      //     completed_at: new Date(),
      //     output: {
      //       title: "Probot check!",
      //       summary: "The check has passed!",
      //     },
      //   })
      // );
    }
  );

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
};
