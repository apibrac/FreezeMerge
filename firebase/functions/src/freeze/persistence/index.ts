import { logger } from "firebase-functions";
import { DocumentSnapshot } from "firebase-functions/lib/providers/firestore";
import { db, HOOKS, PERSISTENCES } from "../../firestore/config";
import { checkRunStatus, CheckAttributes } from "../checkStatus";
import { extractTags } from "./smartTagExtract";

interface PersistenceData {
  freezed: boolean;
  whitelistedPullRequestUrls: string[];
  whitelistedTickets: string[];
}
type HookData = {
  owner: string;
  repo: string;
  check_run_id: number;
};

export class Persistence {
  ref: FirebaseFirestore.DocumentReference;
  _data?: PersistenceData;

  constructor(persistence: string | DocumentSnapshot) {
    if (typeof persistence === "string") {
      this.ref = db.collection(PERSISTENCES).doc(persistence);
    } else {
      this.ref = persistence.ref;
      this._data = this.extractData(persistence);
    }
  }

  async data() {
    if (this._data) return this._data;

    const doc = await this.ref.get();
    return (this._data = this.extractData(doc));
  }

  private extractData(doc: DocumentSnapshot) {
    const data = doc.data();
    if (!data) throw new Error("No installation found ");

    return data as {
      freezed: boolean;
      whitelistedPullRequestUrls: string[];
      whitelistedTickets: string[];
    };
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

  freeze() {
    return this.ref.update({ freezed: true });
  }
  unfreeze() {
    return this.ref.update({
      freezed: false,
      whitelistedPullRequestUrls: [],
      whitelistedTickets: [],
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

// @TODO Correct les args
/**
 * Method to choose which status attributes to use for override new or existing checkRun on github
 *
 * @param pullRequests - array of pull requests' details
 * @returns checkAttributes: CheckAttributes - a substract of github's check_run attributes. Meant to be merged in check_run value for create or update
 * @returns shouldKeepHook: boolean - tells if the specific check run reference should be kept for later synchronization
 */
export function getCheckStatus(
  pullRequests: { title: string; url: string; head: { sha: string } }[],
  { freezed, whitelistedPullRequestUrls, whitelistedTickets }: PersistenceData
): [CheckAttributes, boolean] {
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
