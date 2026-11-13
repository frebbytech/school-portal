import reactHooks from "eslint-plugin-react-hooks";
import base from "./eslint.config.js";

// React hooks rules as warnings (a report, not a gate): `npm run lint:report`.
// The accessibility plugin is added to this app's dev dependencies in the U7 stage.
export default [
  ...base,
  {
    files: ["**/*.{js,jsx}"],
    plugins: { "react-hooks": reactHooks },
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    rules: Object.fromEntries(Object.keys(reactHooks.configs.recommended.rules).map((r) => [r, "warn"])),
  },
];
