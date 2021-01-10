import { Octokit } from "@octokit/rest";
import { getPullRequests } from "../github/helpers/api";
import { Persistence } from "./persistence";

export async function synchronizeCheckRuns(
  octokit: Octokit,
  persistence: Persistence
) {
  const hooks = await persistence.getHooks();

  return hooks.map(async ({ checkData, hookRef }) => {
    const check = await octokit.checks.get(checkData);
    const pullRequests = await getPullRequests(check.data, {
      octokit,
      checkData,
    });

    return persistence.synchronizeCheck({
      pullRequests,

      hookRef,

      saveAndBuildHook: async (checkAttributes) => {
        await octokit.checks.update({
          ...checkData,
          ...checkAttributes,
        });

        return checkData;
      },
    });
  });
}
