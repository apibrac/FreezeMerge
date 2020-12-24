import * as functions from "firebase-functions";
import { getPullRequests } from "./githubApi";
import { getInstallationFromDoc } from "./installationModel";
import { getCheckStatus, checkRunStatus } from "./checkRunStatus";
import { getOctokitFromInstallation } from "./probotConfig";

export const onInstallationChange = functions.firestore
  .document("installations/{installationId}")
  .onWrite(async (change, context) => {
    const installation = getInstallationFromDoc(change.after);
    const octokit = getOctokitFromInstallation(installation);
    const checks = await installation.getChecks();

    return checks.map(async ({ data: checkData, ref }) => {
      functions.logger.info("Syncing check", checkData);

      const check = await octokit.checks.get(checkData);
      const pullRequests = await getPullRequests(check.data, {
        octokit,
        checkData,
      });

      if (!pullRequests.length) {
        functions.logger.info("Deleting check", checkData);

        await octokit.checks.update({
          ...checkData,
          ...checkRunStatus.notSynced(),
        });

        return ref.delete();
      } else {
        functions.logger.info("Updating check", checkData);

        return octokit.checks.update({
          ...checkData,
          ...getCheckStatus(installation, pullRequests),
        });
      }
    });
  });
