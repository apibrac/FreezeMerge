// Référence https://github.com/integrations/jira/blob/7e180cc3b38dc03a9f2b5abcf53b9778842cd2bd/lib/transforms/smart-commit.js

import { Tokenizer } from "./tokenizer";

export const extractTags = (source: string) => {
  const tokenizer = Tokenizer();
  tokenizer.reset(source);
  const keys = [];

  for (const token of tokenizer) {
    if (token.type === "issueKey") {
      keys.push(token.value);
    }
  }

  return keys;
};
