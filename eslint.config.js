"use strict";

const babelParser = require("@babel/eslint-parser");
const jimmy = require("./eslint-rules");

module.exports = [
  {
    ignores: ["node_modules/**", "artifacts/**", "treeLine-output/**", "docs/**"],
  },
  {
    files: ["tests/**/*.ts", "pages/**/*.ts", "helpers/**/*.ts", "reporters/**/*.ts", "db/**/*.ts", "unit/**/*.ts", "playwright.config.ts", "vitest.config.ts"],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          presets: ["@babel/preset-typescript"],
        },
        sourceType: "module",
        ecmaVersion: "latest",
      },
    },
    plugins: {
      jimmy,
    },
    rules: {
      "jimmy/no-comments": "error",
      "jimmy/no-blank-line-in-block": "error",
      "no-multiple-empty-lines": ["error", { max: 1, maxEOF: 0 }],
    },
  },
];
