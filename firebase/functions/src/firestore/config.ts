import admin from "firebase-admin";

export const PERSISTENCES = "installations";
export const HOOKS = "checks";

admin.initializeApp();
export const db = admin.firestore();
