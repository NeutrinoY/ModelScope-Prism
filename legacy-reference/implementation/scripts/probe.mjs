import { runProbeCli } from './probe/cli.mjs';

const exitCode = await runProbeCli();
process.exit(exitCode);
