import * as functions from "firebase-functions";
import appFn, { isCheckFreezed, Installation } from "./probot";
import { Server, Probot, ProbotOctokit } from "probot";
import { createAppAuth } from "@octokit/auth-app";

const config = functions.config();
const probotOptions = {
  appId: config.github.app_id,
  secret: config.github.webhook_secret,
  privateKey: Buffer.from(config.github.private_key, "base64").toString(
    "ascii"
  ),
};

const server = new Server({ Probot: Probot.defaults(probotOptions) });
server
  .load(appFn)
  .catch((error) => console.error(`Error loading probot app ${error}`));
const newOctokit = (installationId: number) =>
  new ProbotOctokit({
    authStrategy: createAppAuth,
    auth: {
      ...probotOptions,
      installationId,
    },
  });

export const github_webhook = functions.https.onRequest(server.expressApp);

export const onInstallationChange = functions.firestore
  .document("installations/{installationId}")
  .onWrite(async (change, context) => {
    const data = change.after.data() as Installation;
    const installationRef = change.after.ref;
    const octokit = newOctokit(parseInt(installationRef.id));

    const checks = await installationRef.collection("checks").get();
    return checks.docs.map(async (doc) => {
      const checkData = doc.data() as {
        owner: string;
        repo: string;
        check_run_id: number;
      };
      functions.logger.info("Updating check", checkData);

      const check = await octokit.checks.get(checkData);
      if (
        check.data.pull_requests.find((p) => p.head.sha === check.data.head_sha)
      ) {
        functions.logger.info(
          "Check should be removed",
          checkData.check_run_id
        );
        await octokit.checks.update({
          ...checkData,
          conclusion: "success",
        });
        return doc.ref.delete();
      } else {
        return octokit.checks.update({
          ...checkData,
          conclusion: isCheckFreezed(data, check.data) ? "failure" : "success",
        });
      }
    });
  });
