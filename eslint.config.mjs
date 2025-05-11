import globals from "globals";
import typescriptPlugin from "@typescript-eslint/eslint-plugin";
import prettierRecommendedPlugin from "eslint-plugin-prettier/recommended";

export default [
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },

      ecmaVersion: 5,
      sourceType: "module",

      parserOptions: {
        parser: "@typescript-eslint/parser",
      },
    },

    rules: {
      "no-debugger": "warn",
    },
  },
  typescriptPlugin.configs.recommended,
  prettierRecommendedPlugin,
];
