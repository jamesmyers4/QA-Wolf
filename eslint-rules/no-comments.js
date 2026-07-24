"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "disallow all comments; reasoning belongs in SESSION_LOG.md",
    },
    schema: [],
    messages: {
      noComment: "Comments are not allowed in this codebase — put reasoning in SESSION_LOG.md instead.",
    },
  },
  create(context) {
    return {
      Program() {
        const sourceCode = context.sourceCode ?? context.getSourceCode();
        for (const comment of sourceCode.getAllComments()) {
          context.report({ node: comment, messageId: "noComment" });
        }
      },
    };
  },
};
