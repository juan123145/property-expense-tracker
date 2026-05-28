/**
 * Hermes-Claude Code Hybrid Pipeline
 * 
 * Workflow:
 * 1. Receive task instruction
 * 2. Launch Claude Code (notify Juan to click Accept)
 * 3. Feed instruction, manage back-and-forth
 * 4. On completion → run npm run build
 * 5. If build fails → re-feed errors to Claude Code (max 3 attempts)
 * 6. If build passes → run QA browser test
 * 7. If QA errors → re-feed to Claude Code (max 3 attempts)
 * 8. Cleanup temp files, report to Juan
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_DIR = 'C:/Users/M225735/property-expense-tracker';
const HERMES_DIR = path.join(PROJECT_DIR, '.hermes');
const SCREENSHOTS_DIR = path.join(HERMES_DIR, 'screenshots');
const MAX_ATTEMPTS = 3;

// Ensure dirs exist
[HERMES_DIR, SCREENSHOTS_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

// ─── Logging ────────────────────────────────────────────────────────────────
function log(msg) {
  const ts = new Date().toISOString().split('T')[1].split('.')[0];
  const line = `[${ts}] ${msg}`;
  console.log(line);
  fs.appendFileSync(path.join(HERMES_DIR, 'pipeline.log'), line + '\n');
}

// ─── Run Claude Code silently with a prompt ──────────────────────────────────
function runClaudeCode(prompt) {
  return new Promise((resolve) => {
    log('Running Claude Code...');
    const proc = spawn('claude', ['--dangerously-skip-permissions', '--model', 'claude-haiku-4-5-20251001', '-p', prompt], {
      cwd: PROJECT_DIR,
      shell: true,
      env: {
        ...process.env,
        ANTHROPIC_BASE_URL: 'https://palantir.mcloud.merckgroup.com/language-model-service/api/proxy/anthropic',
        NODE_EXTRA_CA_CERTS: 'C:\\certs\\corp-cert.pem',
      }
    });

    let output = '';
    proc.stdout.on('data', d => { output += d.toString(); process.stdout.write(d); });
    proc.stderr.on('data', d => { output += d.toString(); process.stderr.write(d); });
    proc.on('close', code => resolve({ output, code }));
  });
}

// ─── Run npm build ───────────────────────────────────────────────────────────
function runBuild() {
  return new Promise((resolve) => {
    log('Running npm run build...');
    const proc = spawn('npm', ['run', 'build'], {
      cwd: PROJECT_DIR,
      shell: true,
    });

    let output = '';
    proc.stdout.on('data', d => { output += d.toString(); process.stdout.write(d); });
    proc.stderr.on('data', d => { output += d.toString(); process.stderr.write(d); });
    proc.on('close', code => {
      const passed = code === 0;
      log(passed ? '✅ Build PASSED' : '❌ Build FAILED');
      resolve({ passed, output, code });
    });
  });
}

// ─── Run QA browser test ─────────────────────────────────────────────────────
function runQATest() {
  return new Promise((resolve) => {
    log('Running QA browser test...');
    const qaScript = path.join(HERMES_DIR, 'qa_runner.js');
    const proc = spawn('node', [qaScript], {
      cwd: PROJECT_DIR,
      shell: true,
    });

    let output = '';
    proc.stdout.on('data', d => { output += d.toString(); process.stdout.write(d); });
    proc.stderr.on('data', d => { output += d.toString(); });
    proc.on('close', code => {
      // Parse errors from output
      const errors = output.split('\n')
        .filter(l => l.includes('[error]') || l.includes('❌') || l.includes('[PAGE ERROR]') || l.includes('[NET FAIL]'))
        .join('\n');
      resolve({ errors, output, passed: !errors });
    });
  });
}

// ─── Cleanup temp files ───────────────────────────────────────────────────────
function cleanup() {
  log('Cleaning up temp files...');
  // Delete screenshots
  const shots = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png'));
  shots.forEach(f => fs.unlinkSync(path.join(SCREENSHOTS_DIR, f)));
  // Delete error log
  const errLog = path.join(HERMES_DIR, 'dev-errors.md');
  if (fs.existsSync(errLog)) fs.unlinkSync(errLog);
  log(`Deleted ${shots.length} screenshots and temp files.`);
}

// ─── Main Pipeline ────────────────────────────────────────────────────────────
async function runPipeline(task) {
  log('═══════════════════════════════════════');
  log(`PIPELINE START: ${task.substring(0, 80)}...`);
  log('═══════════════════════════════════════');

  const basePrompt = `You are a focused Next.js developer working on a property expense tracker app.
Project pages: /dashboard, /properties, /transactions, /reports, /settings.
Do NOT over-engineer. Fix only what is asked.
Always run npm run build at the end and report if it passed.

TASK:
${task}`;

  let attempt = 0;
  let lastErrors = '';

  // ── Phase 1: Claude Code + Build loop ──────────────────────────────────────
  while (attempt < MAX_ATTEMPTS) {
    attempt++;
    log(`\n─── Attempt ${attempt}/${MAX_ATTEMPTS} ───`);

    const prompt = attempt === 1
      ? basePrompt
      : `${basePrompt}\n\nPrevious attempt failed. Build errors:\n${lastErrors}\nPlease fix these errors and run npm run build again.`;

    const { output: claudeOutput } = await runClaudeCode(prompt);
    const { passed: buildPassed, output: buildOutput } = await runBuild();

    if (buildPassed) {
      log('✅ Build passed! Moving to QA...');
      break;
    }

    lastErrors = buildOutput.split('\n').filter(l =>
      l.includes('error') || l.includes('Error') || l.includes('failed')
    ).slice(0, 30).join('\n');

    if (attempt === MAX_ATTEMPTS) {
      log('❌ Build failed after 3 attempts — escalating to Juan');
      console.log('\n🚨 ESCALATE_TO_JUAN: Build failed after 3 attempts.\n' + lastErrors);
      return;
    }
  }

  // ── Phase 2: QA Test loop ──────────────────────────────────────────────────
  attempt = 0;
  while (attempt < MAX_ATTEMPTS) {
    attempt++;
    log(`\n─── QA Attempt ${attempt}/${MAX_ATTEMPTS} ───`);

    const { errors, passed: qaPassed } = await runQATest();

    if (qaPassed) {
      log('✅ QA passed! No errors found.');
      break;
    }

    log(`QA errors found:\n${errors}`);

    const fixPrompt = `The following browser/console errors were found after your last change. Please fix them:

${errors}

Run npm run build when done.`;

    await runClaudeCode(fixPrompt);
    await runBuild();

    if (attempt === MAX_ATTEMPTS) {
      log('❌ QA failed after 3 attempts — escalating to Juan');
      console.log('\n🚨 ESCALATE_TO_JUAN: QA errors after 3 attempts.\n' + errors);
      return;
    }
  }

  // ── Phase 3: Cleanup & Report ──────────────────────────────────────────────
  cleanup();
  log('═══════════════════════════════════════');
  log('✅ PIPELINE COMPLETE');
  log('═══════════════════════════════════════');
  console.log('\n✅ PIPELINE_COMPLETE: Task done, build passed, QA clean.');
}

// ─── Entry point ─────────────────────────────────────────────────────────────
const task = process.argv[2];
if (!task) {
  console.error('Usage: node pipeline.js "your task description"');
  process.exit(1);
}

runPipeline(task).catch(err => {
  log('PIPELINE ERROR: ' + err.message);
  console.log('\n🚨 ESCALATE_TO_JUAN: Pipeline crashed: ' + err.message);
});
