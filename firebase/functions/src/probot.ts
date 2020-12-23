import { Probot } from "probot";
import admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

const ACCOUNT_ID = "pass-culture";

export default (app: Probot) => {
  app.on(["check_suite.requested"], async function (context) {
    const startTime = new Date();

    const {
      head_branch: headBranch,
      head_sha: headSha,
    } = context.payload.check_suite;

    const account = db.collection("account").doc(ACCOUNT_ID);
    const data = (await account.get()).data();
    if (!data) throw new Error("Did not found account");
    data.freezed;

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

    return account.collection("checks").add(
      context.repo({
        check_run_id: check.data.id,
      })
    );
  });
};
