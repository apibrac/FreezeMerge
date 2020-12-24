import * as functions from "firebase-functions";
import { Installation } from "./persistentData";
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

const newOctokit = (installationId: number) =>
  new ProbotOctokit({
    authStrategy: createAppAuth,
    auth: {
      ...probotOptions,
      installationId,
    },
  });

export function getOctokitFromInstallation(installation: Installation) {
  const installationId = parseInt(installation.ref.id);
  return newOctokit(installationId);
}

export const serverlessProbot = (fn: (app: Probot) => void) => {
  const server = new Server({ Probot: Probot.defaults(probotOptions) });
  server
    .load(fn)
    .catch((error) => console.error(`Error loading probot app ${error}`));

  return server.expressApp;
};
