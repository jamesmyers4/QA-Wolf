"use strict";

function checkStatementList(context, statements) {
  for (let i = 1; i < statements.length; i++) {
    const previous = statements[i - 1];
    const current = statements[i];
    if (current.loc.start.line - previous.loc.end.line > 1) {
      context.report({ node: current, messageId: "noBlankLine" });
    }
  }
}

function isDescribeCall(node) {
  if (!node || node.type !== "CallExpression") return false;
  const callee = node.callee;
  if (callee.type === "Identifier") return callee.name === "describe";
  if (callee.type === "MemberExpression") {
    if (callee.property.type === "Identifier" && callee.property.name === "describe") return true;
    if (callee.object.type === "Identifier" && callee.object.name === "describe") return true;
  }
  return false;
}

function isDescribeBlockBody(node) {
  const fn = node.parent;
  if (!fn || (fn.type !== "FunctionExpression" && fn.type !== "ArrowFunctionExpression")) return false;
  return isDescribeCall(fn.parent);
}

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "disallow blank lines between statements inside a block",
    },
    schema: [],
    messages: {
      noBlankLine: "No blank lines between statements inside a function or block — one blank line belongs only after the enclosing function/block ends.",
    },
  },
  create(context) {
    return {
      BlockStatement(node) {
        if (isDescribeBlockBody(node)) return;
        checkStatementList(context, node.body);
      },
      SwitchCase(node) {
        checkStatementList(context, node.consequent);
      },
    };
  },
};
