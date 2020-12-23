import { Probot } from "probot";
import admin from "firebase-admin";
import { logger } from "firebase-functions";

admin.initializeApp();
const db = admin.firestore();

export type Installation = {
  freezed: boolean;
  whitelist: string[];
};

export function isCheckFreezed(
  installation: Installation,
  check?: {
    pull_requests: { url: string; head: { sha: string } }[];
    head_sha: string;
  }
) {
  if (!installation.freezed) return false;
  if (check) {
    const pull_requests = check.pull_requests.filter(
      ({ head }) => head.sha === check.head_sha
    );
    if (pull_requests.find((pr) => installation.whitelist.includes(pr.url)))
      return false;
  }
  return true;
}

export default (app: Probot) => {
  app.on(["check_suite.requested"], async function (context) {
    const startTime = new Date();

    const {
      head_branch: headBranch,
      head_sha: headSha,
    } = context.payload.check_suite;
    const installation_id = context.payload.installation?.id;
    if (!installation_id)
      throw new Error("No installation found for this check");

    const installation = db
      .collection("installations")
      .doc(installation_id.toString());
    const data = (await installation.get()).data() as Installation;

    const check = await context.octokit.checks.create(
      context.repo({
        name: "Freeze Merge",
        head_branch: headBranch,
        head_sha: headSha,
        status: "completed",
        started_at: startTime.toISOString(),
        conclusion: isCheckFreezed(data) ? "failure" : "success",
        completed_at: new Date().toISOString(),
      })
    );

    return installation.collection("checks").add(
      context.repo({
        check_run_id: check.data.id,
      })
    );
  });

  app.on(["pull_request.opened"], async function (context) {
    logger.info("Pull request opened");
    const headSha = context.payload.pull_request.head.sha;

    const installation_id = context.payload.installation?.id;
    if (!installation_id)
      throw new Error("No installation found for this check");

    const installation = db
      .collection("installations")
      .doc(installation_id.toString());
    const data = (await installation.get()).data() as Installation;

    const checksRequest = await context.octokit.checks.listForRef(
      context.repo({
        ref: headSha,
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
        conclusion: isCheckFreezed(data, check) ? "failure" : "success",
      })
    );

    return installation.collection("checks").add(
      context.repo({
        check_run_id: check.id,
      })
    );
  });
};
