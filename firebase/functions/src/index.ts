import * as functions from "firebase-functions";
import appFn from "./probot";
import { Server, Probot, ProbotOctokit } from "probot";

const config = functions.config();
const probotOptions = {
  appId: config.github.app_id,
  secret: config.github.webhook_secret,
  privateKey: Buffer.from(config.github.private_key, "base64").toString(
    "ascii"
  ),
};

const Octokit = ProbotOctokit.defaults(probotOptions);
const server = new Server({ Probot: Probot.defaults(probotOptions) });
server
  .load(appFn)
  .catch((error) => console.error(`Error loading probot app ${error}`));

export const github_webhook = functions.https.onRequest(server.expressApp);

export const getCheckById = functions.https.onRequest(async (req, resp) => {
  const id = req.query.id;
  const checkRunId = typeof id === "string" ? parseInt(id) : 0;
  const octokit = new Octokit();

  const check = await octokit.checks.get({
    check_run_id: checkRunId,
    owner: "apibrac",
    repo: "FreezeMerge",
  });
  functions.logger.info(check);
  resp.send(check);
});

export const onAccountChange = functions.firestore
  .document("account/{accountId}")
  .onWrite(async (change, context) => {
    const octokit = new Octokit();
    const data = change.after.data();
    if (!data) throw new Error("Document is empty");

    const checks = await change.after.ref.collection("checks").get();
    const updates = checks.forEach((doc) => {
      const checkData = doc.data() as {
        owner: string;
        repo: string;
        check_run_id: number;
      };
      return octokit.checks.update({
        ...checkData,
        conclusion: data.freezed ? "failure" : "success",
      });
    });
    return updates;
  });
