import * as functions from "firebase-functions";

import { synchronizeCheckRunsFn } from "./github/checkRuns";
import {
  getOctokitFromPersistence,
  getPersistenceFromProbot,
} from "./github/config";
import { serverlessProbot } from "./github/helpers/probot";
import { Persistence, PERSISTENCES } from "./freeze/persistence";
import { synchronizeCheckRuns } from "./freeze/synchronize";

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
