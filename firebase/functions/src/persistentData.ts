import { logger } from "firebase-functions";
import { DocumentSnapshot } from "firebase-functions/lib/providers/firestore";
import { checkRunStatus, CheckAttributes } from "./checkRunStatus";
import { extractTags } from "./smartTagExtract";

export const PERSISTENCES = "installations";
const HOOKS = "checks";

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
