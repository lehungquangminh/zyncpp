#!/usr/bin/env node
import { runInstall } from './installer';

async function main(){
  const ci = process.argv.includes('--ci');
  const bin = await runInstall({ mode: 'full', ci, onEvent: e => {
    if (e.status === 'progress') process.stdout.write(`\r${e.stepId}: ${Math.round((e.progress||0)*100)}%`);
    else console.log(`${e.stepId}: ${e.status}${e.message ? ' - ' + e.message : ''}`);
  }});
  console.log(`BIN=${bin}`);
}
main().catch(e => { console.error(e); process.exit(1); });


