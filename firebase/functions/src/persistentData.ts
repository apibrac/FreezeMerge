interface InstallationData {
  freezed: boolean;
  whitelistedPullRequestUrls: string[];
  whitelistedTickets: string[];
}
export type CheckData = {
  owner: string;
  repo: string;
  check_run_id: number;
};

export interface Installation {
  data: InstallationData;
  ref: FirebaseFirestore.DocumentReference;
}
export function wrapInstallation(installation: Installation) {
  return {
    ...installation,

    createCheck(check: CheckData) {
      return this.ref.collection("checks").add(check);
    },

    async getChecks() {
      const checks = await this.ref.collection("checks").get();

      return checks.docs.map((doc) => {
        const data = doc.data() as CheckData;

        return {
          data,
          ref: doc.ref,
        };
      });
    },
  };
}
