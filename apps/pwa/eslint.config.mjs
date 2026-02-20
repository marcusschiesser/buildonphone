import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx,js,jsx,mjs,mts}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            "fs",
            "path",
            "os",
            "child_process",
            "worker_threads",
            "stream",
            "crypto",
            "node:fs",
            "node:path",
            "node:os",
            "node:child_process",
            "node:worker_threads",
            "node:stream",
            "node:crypto"
          ]
        }
      ]
    }
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts"
  ]),
]);

export default eslintConfig;
