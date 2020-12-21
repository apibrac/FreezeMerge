import * as functions from "firebase-functions";
import appFn from "./probot";
import { Server, Probot } from "probot";

const appId = "env.APP_ID";
const privateKey = "env.PRIVATE_KEY";
const secret = "env.WEBHOOK_SECRET";

const server = new Server({
  Probot: Probot.defaults({ appId, privateKey, secret }),
});

server
  .load(appFn)
  .catch((error) => console.error(`Error loading probot app ${error}`));
export const github_webhook = functions.https.onRequest(server.expressApp);
