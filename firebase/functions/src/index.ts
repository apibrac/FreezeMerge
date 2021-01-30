import * as functions from "firebase-functions";

import { probotApp } from "./github/checkRuns";
import { getOctokitFromPersistence } from "./github/config";
import { serverlessProbot as probotWebhook } from "./github/helpers/webhook";
import { Persistence } from "./freeze/persistence";
import { synchronizeCheckRuns } from "./freeze/synchronize";
import { slackWebhook } from "./slack/helpers/webhook";
import { PERSISTENCES } from "./freeze/config";

export const github_webhook = probotWebhook(probotApp);

export const onSynchronisationChange = functions.firestore
  .document(`${PERSISTENCES}/{persistenceId}`)
  .onWrite(async (change, context) => {
    const persistence = new Persistence(change.after);
    const octokit = getOctokitFromPersistence(persistence);

    return synchronizeCheckRuns(octokit, persistence);
  });

export const freeze = slackWebhook(async (id) => {
  const persistence = new Persistence(id);
  await persistence.freeze();

  return {
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "[FREEZE] Tous les repositories ont été freeze",
        },
      },
    ],
  };
});

export const unfreeze = slackWebhook(async (id) => {
  const persistence = new Persistence(id);
  await persistence.unfreeze();

  return {
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "[UNFREEZE] Tous les repositories ont été unfreeze",
        },
      },
    ],
  };
});

export const whitelistTicket = slackWebhook(async (id, tag) => {
  const persistence = new Persistence(id);
  await persistence.whitelistTicket(tag);

  return {
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `[WHITELIST] Le ticket ${tag} a été whitelisté`,
        },
      },
    ],
  };
});
