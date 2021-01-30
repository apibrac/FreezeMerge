import { Server, Probot } from "probot";
import { probotOptions } from "../config";
import * as functions from "firebase-functions";

export const serverlessProbot = (fn: (app: Probot) => void) => {
  const server = new Server({ Probot: Probot.defaults(probotOptions) });
  server
    .load(fn)
    .catch((error) => console.error(`Error loading probot app ${error}`));

  return functions.https.onRequest(server.expressApp);
};
