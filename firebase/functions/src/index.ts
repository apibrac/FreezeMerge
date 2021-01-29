import * as functions from "firebase-functions";

import { synchronizeCheckRunsFn } from "./github/checkRuns";
import {
  getOctokitFromPersistence,
  getPersistenceFromProbot,
} from "./github/config";
import { serverlessProbot } from "./github/helpers/probot";
import { Persistence } from "./freeze/persistence";
import { synchronizeCheckRuns } from "./freeze/synchronize";
import { onSlackWebhook } from "./slack/webhook";
import { PERSISTENCES } from "./firestore/config";

export const github_webhook = functions.https.onRequest(
  serverlessProbot((app) =>
    synchronizeCheckRunsFn(app, getPersistenceFromProbot)
  )
);

export const onSynchronisationChange = functions.firestore
  .document(`${PERSISTENCES}/{persistenceId}`)
  .onWrite(async (change, context) => {
    const persistence = new Persistence(change.after);
    const octokit = getOctokitFromPersistence(persistence);

    return synchronizeCheckRuns(octokit, persistence);
  });

// TODO intégrer le functions.https ainsi que le new Persistence dans le slack helper
export const freeze = functions.https.onRequest(
  onSlackWebhook(async (id) => {
    const persistence = new Persistence(id);

    await persistence.freeze();
    return {
      "blocks": [
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": "[FREEZE] Tous les repositories ont été freeze",
          },
        },
      ],
    }
  })
);

export const unfreeze = functions.https.onRequest(
  onSlackWebhook(async (id) => {
    const persistence = new Persistence(id);

    await persistence.unfreeze();
    return {
      "blocks": [
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": "[UNFREEZE] Tous les repositories ont été unfreeze",
          },
        },
      ],
    }
  })
);

export const whitelistTicket = functions.https.onRequest(
  onSlackWebhook((id, tag) => {
    const persistence = new Persistence(id);

    return persistence.whitelistTicket(tag);
  })
);
