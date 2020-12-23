import { Probot } from "probot";
import admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

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
    const data = (await installation.get()).data();
    if (!data) throw new Error("Did not found installation");

    const check = await context.octokit.checks.create(
      context.repo({
        name: "Freeze Merge",
        head_branch: headBranch,
        head_sha: headSha,
        status: "completed",
        started_at: startTime.toISOString(),
        conclusion: data.freezed ? "failure" : "success",
        completed_at: new Date().toISOString(),
      })
    );

    return installation.collection("checks").add(
      context.repo({
        check_run_id: check.data.id,
      })
    );
  });
};
