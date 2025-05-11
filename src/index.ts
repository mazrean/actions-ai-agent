import core from "@actions/core";

try {
  core.info("Hello, world!");
} catch (error) {
  const err = error as Error;
  core.error(`Failed to run: ${error}, ${err.stack}`);
  core.setFailed(err.message);
}
