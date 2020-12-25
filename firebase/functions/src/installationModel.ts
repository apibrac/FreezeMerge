import admin from "firebase-admin";
import { Persistence, PERSISTENCES } from "./persistentData";

admin.initializeApp();
const db = admin.firestore();

export async function getPersistenceFromProbot(context: {
  payload: { installation?: { id: number } };
}) {
  const persistenceId = context.payload.installation?.id;
  if (!persistenceId) throw new Error("No installation");

  const persistenceDoc = db
    .collection(PERSISTENCES)
    .doc(persistenceId.toString());

  const doc = await persistenceDoc.get();

  return new Persistence(doc);
}
