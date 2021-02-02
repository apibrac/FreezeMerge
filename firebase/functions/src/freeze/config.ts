import admin from "firebase-admin";

export const PERSISTENCES = "controllers";
export const HOOKS = "hooks";

admin.initializeApp();
export const db = admin.firestore();
