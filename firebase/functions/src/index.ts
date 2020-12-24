import * as functions from "firebase-functions";
import appFn from "./probotWebhook";
import { serverlessProbot } from "./probotConfig";

export * from "./firebaseCallbacks";

export const github_webhook = functions.https.onRequest(
  serverlessProbot(appFn)
);
