import * as functions from "firebase-functions";
import { Persistence } from "../freeze/persistence";
import { ProbotOctokit } from "probot";
import { createAppAuth } from "@octokit/auth-app";

const config = functions.config();

export const probotOptions = {
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

export function getOctokitFromPersistence(persistence: Persistence) {
  const installationId = parseInt(persistence.ref.id);
  return newOctokit(installationId);
}

export function getPersistenceFromProbot(context: {
  payload: { installation?: { id: number } };
}) {
  const persistenceId = context.payload.installation?.id;
  if (!persistenceId) throw new Error("No installation");

  return Persistence.retrieve(persistenceId);
}
