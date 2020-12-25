import { logger } from "firebase-functions";
import { DocumentSnapshot } from "firebase-functions/lib/providers/firestore";
import { checkRunStatus, CheckAttributes } from "../checkStatus";
import { extractTags } from "./smartTagExtract";
import admin from "firebase-admin";

export const PERSISTENCES = "installations";
const HOOKS = "checks";

admin.initializeApp();
const db = admin.firestore();

interface PersistenceData {
  freezed: boolean;
  whitelistedPullRequestUrls: string[];
  whitelistedTickets: string[];
}
export type HookData = {
  owner: string;
  repo: string;
  check_run_id: number;
};

export class Persistence {
  data: PersistenceData;
  ref: FirebaseFirestore.DocumentReference;

  constructor(doc: DocumentSnapshot) {
    const data = doc.data();
    if (!data) throw new Error("No installation found ");

    this.data = data as {
      freezed: boolean;
      whitelistedPullRequestUrls: string[];
      whitelistedTickets: string[];
    };
    this.ref = doc.ref;
  }

  static async retrieve(persistenceId: number) {
    const persistenceDoc = db
      .collection(PERSISTENCES)
      .doc(persistenceId.toString());

    const doc = await persistenceDoc.get();
    return new Persistence(doc);
  }

  /**
   * Method to choose which status attributes to use for override new or existing checkRun on github
   *
   * @param pullRequests - array of pull requests' details
   * @returns checkAttributes: CheckAttributes - a substract of github's check_run attributes. Meant to be merged in check_run value for create or update
   * @returns shouldKeepHook: boolean - tells if the specific check run reference should be kept for later synchronization
   */
  getCheckStatus(
    pullRequests: { title: string; url: string; head: { sha: string } }[]
  ): [CheckAttributes, boolean] {
    const {
      freezed,
      whitelistedPullRequestUrls,
      whitelistedTickets,
    } = this.data;

    if (!pullRequests.length) return [checkRunStatus.notSynced(), false];

    if (!freezed) return [checkRunStatus.success(), true];

    if (
      pullRequests.find((pr) => whitelistedPullRequestUrls.includes(pr.url)) ||
      pullRequests.find((pr) =>
        extractTags(pr.title).find((key) => whitelistedTickets.includes(key))
      )
    )
      return [checkRunStatus.success(), true];

    return [checkRunStatus.freezed(), true];
  }

  async getHooks() {
    const checks = await this.ref.collection("checks").get();

    return checks.docs.map((doc) => {
      const checkData = doc.data() as HookData;

      return {
        checkData,
        hookRef: doc.ref,
      };
    });
  }

  onCreateCheck(data: HookData) {
    logger.info("Created check", data);
    return this.ref.collection(HOOKS).add(data);
  }

  onUpdateCheck(data: HookData) {
    logger.info("Updating check", data);
    return this.ref.collection(HOOKS).add(data);
  }

  async onSyncCheck(
    data: HookData,
    hookRef: FirebaseFirestore.DocumentReference,
    shouldKeepHook: boolean
  ) {
    if (shouldKeepHook) {
      logger.info("Syncing check", data);
    } else {
      logger.info("Deleting check", data);
      await hookRef.delete();
    }
  }
}
