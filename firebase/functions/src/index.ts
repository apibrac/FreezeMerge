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
import { db, PERSISTENCES } from "./firestore/config";

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

export const freeze = functions.https.onRequest(
  onSlackWebhook((id) => {
    const persistenceDoc = db.collection(PERSISTENCES).doc(id);

    return persistenceDoc.update({ freezed: true });
  })
);

export const unfreeze = functions.https.onRequest(
  onSlackWebhook((id) => {
    const persistenceDoc = db.collection(PERSISTENCES).doc(id);

    return persistenceDoc.update({
      freezed: false,
      whitelistedPullRequestUrls: [],
      whitelistedTickets: [],
    });
  })
);
