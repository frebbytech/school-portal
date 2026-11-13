import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import base from "./eslint.config.js";

// A wider check than the everyday lint: React hooks rules and accessibility rules, all as
// warnings. It is a report (`npm run lint:report`), not a gate: existing findings are fixed
// screen by screen as each screen is rebuilt, and the gate is tightened at the end.
export default [
  ...base,
  {
    files: ["**/*.{js,jsx}"],
    plugins: { "react-hooks": reactHooks, "jsx-a11y": jsxA11y },
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    rules: {
      ...Object.fromEntries(Object.keys(reactHooks.configs.recommended.rules).map((r) => [r, "warn"])),
      ...Object.fromEntries(Object.keys(jsxA11y.flatConfigs.recommended.rules).map((r) => [r, "warn"])),
    },
  },
];
