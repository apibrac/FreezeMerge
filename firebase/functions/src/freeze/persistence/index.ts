import { logger } from "firebase-functions";
import { DocumentSnapshot } from "firebase-functions/lib/providers/firestore";
import { db, HOOKS, PERSISTENCES } from "../../firestore/config";
import { checkRunStatus, CheckAttributes } from "../checkStatus";
import { extractTags } from "./smartTagExtract";
import admin from "firebase-admin";

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
  whitelistTicket(tag: string) {
    return this.ref.update({
      whitelistedTickets: admin.firestore.FieldValue.arrayUnion(tag),
    });
  }

  async synchronizeCheck({
    pullRequests,
    saveAndBuildHook,
    hookRef,
  }: {
    pullRequests: {
      title: string;
      url: string;
      number: number;
      head: { sha: string };
    }[];
    saveAndBuildHook: (status: CheckAttributes) => Promise<HookData>;
    hookRef?: FirebaseFirestore.DocumentReference;
  }) {
    if (!pullRequests.length) {
      const hook = await saveAndBuildHook(checkRunStatus.notSynced());
      logger.info("Deleting check", hook);
      return hookRef && hookRef.delete();
    } else {
      const {
        freezed,
        whitelistedPullRequestUrls,
        whitelistedTickets,
      } = await this.data();

      let status;

      if (!freezed) status = checkRunStatus.success();

      const whitelistedPullRequest = pullRequests.find((pr) =>
        whitelistedPullRequestUrls.includes(pr.url)
      );
      if (whitelistedPullRequest)
        status = checkRunStatus.whtelistedPullRequest(
          whitelistedPullRequest.number
        );

      const whitelistedTag = pullRequests
        .map((pr) => extractTags(pr.title))
        .flat()
        .find((tag) => whitelistedTickets.includes(tag));
      if (whitelistedTag)
        status = checkRunStatus.whitelistedTicket(whitelistedTag);

      if (!status) status = checkRunStatus.freezed();

      const hook = await saveAndBuildHook(status);

      if (hookRef) {
        return hookRef.update(hook);
      } else {
        return this.ref.collection(HOOKS).add(hook);
      }
    }
  }
}
