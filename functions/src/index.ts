import * as functions from "firebase-functions";
import appFn from "./probot";
import { Server, Probot } from "probot";

const config = functions.config();
const server = new Server({
  Probot: Probot.defaults({
    appId: config.github.app_id,
    secret: config.github.webhook_secret,
    privateKey: Buffer.from(config.github.private_key, "base64").toString(
      "ascii"
    ),
  }),
});

server
  .load(appFn)
  .catch((error) => console.error(`Error loading probot app ${error}`));

export const github_webhook = functions.https.onRequest(server.expressApp);
