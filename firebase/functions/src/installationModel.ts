import admin from "firebase-admin";
import { DocumentSnapshot } from "firebase-functions/lib/providers/firestore";
import { wrapInstallation } from "./persistentData";

admin.initializeApp();
const db = admin.firestore();

export async function getInstallationFromContext(context: {
  payload: { installation?: { id: number } };
}) {
  const installation_id = context.payload.installation?.id;
  if (!installation_id) throw new Error("No installation");

  const installationDoc = db
    .collection("installations")
    .doc(installation_id.toString());

  const doc = await installationDoc.get();
  const data = doc.data();
  if (!data) throw new Error("No installation found ");

  return wrapInstallation({
    data: data as {
      freezed: boolean;
      whitelistedPullRequestUrls: string[];
      whitelistedTickets: string[];
    },
    ref: installationDoc,
  });
}

export function getInstallationFromDoc(doc: DocumentSnapshot) {
  const data = doc.data();
  if (!data) throw new Error("No installation found ");

  return wrapInstallation({
    data: data as {
      freezed: boolean;
      whitelistedPullRequestUrls: string[];
      whitelistedTickets: string[];
    },
    ref: doc.ref,
  });
}
