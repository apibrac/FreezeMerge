import { Probot } from "probot";
import admin from "firebase-admin";
import { logger } from "firebase-functions";
import { extractKeys } from "./smartKeyExtract";

admin.initializeApp();
const db = admin.firestore();

export type Installation = {
  freezed: boolean;
  whitelistedPullRequestUrls: string[];
  whitelistedTickets: string[];
};

// const pull_requests = check.pull_requests.filter(
//   ({ head }) => head.sha === check.head_sha
// );

export function isCheckFreezed(
  installation: Installation,
  pull_requests: { title: string; url: string; head: { sha: string } }[]
) {
  if (!installation.freezed) return false;

  if (
    pull_requests.find((pr) =>
      installation.whitelistedPullRequestUrls.includes(pr.url)
    ) ||
    pull_requests.find((pr) =>
      extractKeys(pr.title).find((key) =>
        installation.whitelistedTickets.includes(key)
      )
    )
  )
    return false;

  return true;
}

export default (app: Probot) => {
  app.on(["check_suite.requested"], async function (context) {
    const startTime = new Date();

    const checkSuite = context.payload.check_suite;
    const installation_id = context.payload.installation?.id;
    if (!installation_id)
      throw new Error("No installation found for this check");

    const installation = db
      .collection("installations")
      .doc(installation_id.toString());
    const data = (await installation.get()).data() as Installation;

    const pullRequestsResults = await Promise.all(
      checkSuite.pull_requests
        .filter(({ head }) => head.sha === checkSuite.head_sha)
        .map((pr) =>
          context.octokit.pulls.get(context.repo({ pull_number: pr.number }))
        )
    );
    const pullRequests = pullRequestsResults.map((pr) => pr.data);

    const check = await context.octokit.checks.create(
      context.repo({
        name: "Freeze Merge",
        head_branch: checkSuite.head_branch,
        head_sha: checkSuite.head_sha,
        status: "completed",
        started_at: startTime.toISOString(),
        conclusion: isCheckFreezed(data, pullRequests) ? "failure" : "success",
        completed_at: new Date().toISOString(),
      })
    );

    return installation.collection("checks").add(
      context.repo({
        check_run_id: check.data.id,
      })
    );
  });

  app.on(
    ["pull_request.opened", "pull_request.reopened", "pull_request.edited"],
    async function (context) {
      logger.info("Pull request opened");
      const pullRequest = context.payload.pull_request;

      const installation_id = context.payload.installation?.id;
      if (!installation_id)
        throw new Error("No installation found for this check");

      const installation = db
        .collection("installations")
        .doc(installation_id.toString());
      const data = (await installation.get()).data() as Installation;

      const checksRequest = await context.octokit.checks.listForRef(
        context.repo({
          ref: pullRequest.head.sha,
        })
      );
      const checkRuns = checksRequest.data.check_runs;
      if (checkRuns.length === 0) {
        throw new Error("No check on this PR head");
      }
      if (checkRuns.length > 1) {
        logger.warn(
          "Case not implemented: Shouldn't have more than one check on a commit"
        );
      }
      const check = checkRuns[0];
      await context.octokit.checks.update(
        context.repo({
          check_run_id: check.id,
          conclusion: isCheckFreezed(data, [pullRequest])
            ? "failure"
            : "success",
        })
      );

      return installation.collection("checks").add(
        context.repo({
          check_run_id: check.id,
        })
      );
    }
  );
};
