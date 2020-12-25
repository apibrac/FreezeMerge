import * as functions from "firebase-functions";
import synchronizeCheckRunFn from "./probotWebhook";
import { getOctokitFromPersistence, serverlessProbot } from "./probotConfig";
import { getPersistenceFromProbot } from "./installationModel";
import { Persistence, PERSISTENCES } from "./persistentData";
import { synchronizeCheckRuns } from "./firebaseCallbacks";

export const github_webhook = functions.https.onRequest(
  serverlessProbot((app) =>
    synchronizeCheckRunFn(app, getPersistenceFromProbot)
  )
);

export const onSynchronisationChange = functions.firestore
  .document(`${PERSISTENCES}/{persistenceId}`)
  .onWrite(async (change, context) => {
    const persistence = new Persistence(change.after);
    const octokit = getOctokitFromPersistence(persistence);

    return synchronizeCheckRuns(octokit, persistence);
  });
