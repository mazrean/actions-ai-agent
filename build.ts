import esbuild from "esbuild";

await esbuild.build({
  bundle: true,
  entryPoints: ["./src/index.ts"],
  outdir: "./dist",
  outExtension: {
    ".js": ".mjs",
  },
  platform: "node",
  format: "esm",
  minify: true,
  banner: {
    js: 'import { createRequire } from "module"; import url from "url"; const require = createRequire(import.meta.url); const __filename = url.fileURLToPath(import.meta.url); const __dirname = url.fileURLToPath(new URL(".", import.meta.url));',
  },
  // workaround for `Error: Cannot find module '@libsql/linux-x64-gnu'`
  // ref: https://github.com/tursodatabase/libsql-client-ts/issues/112#issuecomment-2701403335
  alias: {
    "@libsql/client": "@libsql/client/web",
  },
});
