import { Server, Probot } from "probot";
import { probotOptions } from "../config";

export const serverlessProbot = (fn: (app: Probot) => void) => {
  const server = new Server({ Probot: Probot.defaults(probotOptions) });
  server
    .load(fn)
    .catch((error) => console.error(`Error loading probot app ${error}`));

  return server.expressApp;
};
