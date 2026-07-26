#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import arg from 'arg';
import pc from 'picocolors';
import * as p from '@clack/prompts';
import { downloadTemplate } from 'giget';
import logUpdate from 'log-update';

const TEMPLATE_MANIFEST_URL = 'https://raw.githubusercontent.com/pphlx/pphlx/main/templates/template.json';

const DEFAULT_TEMPLATES = [
    { value: 'minimal', label: 'Minimal starter project', hint: 'recommended' }
];

const ADJECTIVES = [
    'pale', 'silent', 'cosmic', 'hyper', 'quantum', 'stellar', 'neon', 'shadow',
    'vivid', 'solar', 'lunar', 'cyber', 'swift', 'radiant', 'prime', 'vertex'
];

const NOUNS = [
    'spiral', 'nebula', 'pulse', 'vector', 'matrix', 'prism', 'vortex', 'horizon',
    'orbit', 'beacon', 'canvas', 'signal', 'spark', 'nexus', 'engine', 'core'
];

function generateProjectName() {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    return `./${adj}-${noun}`;
}

function promptBadge(label) {
    const padded = label.padStart(4, ' ').padEnd(4, ' ');
    return pc.bgMagenta(` ${pc.bold(pc.white(padded))} `);
}

function renderBadge(label, bgFn = pc.bgMagenta, textFn = pc.black) {
    return bgFn(` ${textFn(label)} `);
}

async function fetchRemoteTemplates() {
    try {
        const res = await fetch(TEMPLATE_MANIFEST_URL, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                return data.map(t => ({
                    value: t.name || t.value,
                    label: t.title || t.label || t.name,
                    hint: t.name === 'minimal' ? 'recommended' : (t.description || t.hint || '')
                }));
            }
        }
    } catch {
        // Fall back to default local registry definition if offline or unreleased manifest
    }
    return DEFAULT_TEMPLATES;
}

function resolveShellCommand(command, args) {
    if (process.platform === 'win32') {
        const cmdShims = new Set(['npm', 'npx', 'pnpm', 'yarn']);
        if (cmdShims.has(command.toLowerCase())) {
            return ['cmd.exe', ['/d', '/s', '/c', `${command}.cmd`, ...args]];
        }
    }
    return [command, args];
}

async function runCommand(command, args, cwd) {
    const [execCmd, execArgs] = resolveShellCommand(command, args);
    return new Promise((resolve, reject) => {
        const child = spawn(execCmd, execArgs, {
            cwd,
            stdio: 'ignore',
            shell: false
        });
        child.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Command ${command} exited with code ${code}`));
        });
        child.on('error', reject);
    });
}

const BAR_FRAMES = [
    pc.bgMagenta(' ') + pc.bgBlue(' ') + pc.bgCyan('   '),
    pc.bgMagenta('█') + pc.bgBlue(' ') + pc.bgCyan('   '),
    pc.bgMagenta('██') + pc.bgBlue(' ') + pc.bgCyan('  '),
    pc.bgMagenta('███') + pc.bgBlue(' ') + pc.bgCyan(' '),
    pc.bgMagenta('████') + pc.bgBlue(' '),
    pc.bgMagenta('█████')
];

async function main() {
    console.log('');
    p.intro(`${renderBadge('pphlx', pc.bgMagenta, pc.black)}  ${pc.bold('PPHLX Project initializing...')}`);

    const args = arg({
        '--template': String,
        '--install': Boolean,
        '--no-install': Boolean,
        '--git': Boolean,
        '--no-git': Boolean,
        '--yes': Boolean,
        '-y': '--yes',
        '-t': '--template'
    }, { permissive: true });

    let targetDir = args._[0];
    let template = args['--template'];
    let installDeps = args['--install'] ?? (args['--no-install'] ? false : undefined);
    let initGit = args['--git'] ?? (args['--no-git'] ? false : undefined);
    const isYes = args['--yes'];

    // 1. Target Directory Prompt
    if (!targetDir) {
        const defaultName = generateProjectName();
        if (isYes) {
            targetDir = defaultName;
            console.log(`  ${promptBadge('dir')} Where should we create your new project?\n        ${pc.dim(targetDir)}`);
        } else {
            const dirInput = await p.text({
                message: `${promptBadge('dir')} Where should we create your new project?`,
                placeholder: defaultName,
                defaultValue: defaultName,
                validate(val) {
                    if (val.trim().length === 0) return 'Directory name cannot be empty';
                }
            });
            if (p.isCancel(dirInput)) {
                p.cancel('Launch sequence aborted.');
                process.exit(0);
            }
            targetDir = dirInput.trim();
        }
    }

    const projectPath = path.resolve(process.cwd(), targetDir);
    const projectName = path.basename(projectPath);

    // 2. Template Selection Prompt
    if (!template) {
        if (isYes) {
            template = 'minimal';
            console.log(`  ${promptBadge('tmpl')} How would you like to start your new project?\n        ${pc.dim('Minimal starter project')}`);
        } else {
            const availableTemplates = await fetchRemoteTemplates();
            const templateChoice = await p.select({
                message: `${promptBadge('tmpl')} How would you like to start your new project?`,
                options: availableTemplates
            });

            if (p.isCancel(templateChoice)) {
                p.cancel('Launch sequence aborted.');
                process.exit(0);
            }
            template = templateChoice;
        }
    }

    // 3. Install Dependencies Prompt
    if (installDeps === undefined) {
        if (isYes) {
            installDeps = true;
            console.log(`  ${promptBadge('deps')} Install dependencies?\n        ${pc.dim('Yes')}`);
        } else {
            const depsChoice = await p.confirm({
                message: `${promptBadge('deps')} Install dependencies?`,
                initialValue: true
            });
            if (p.isCancel(depsChoice)) {
                p.cancel('Launch sequence aborted.');
                process.exit(0);
            }
            installDeps = depsChoice;
        }
    }

    // 4. Git Init Prompt
    if (initGit === undefined) {
        if (isYes) {
            initGit = true;
            console.log(`  ${promptBadge('git')} Initialize a new git repository?\n        ${pc.dim('Yes')}`);
        } else {
            const gitChoice = await p.confirm({
                message: `${promptBadge('git')} Initialize a new git repository?`,
                initialValue: true
            });
            if (p.isCancel(gitChoice)) {
                p.cancel('Launch sequence aborted.');
                process.exit(0);
            }
            initGit = gitChoice;
        }
    }

    if (!initGit) {
        console.log(`     ${pc.cyan('■')} ${pc.cyan('Sounds good!')} ${pc.dim('You can always run')} ${pc.bold('git init')} ${pc.dim('manually.')}`);
    }

    console.log('');

    // --- Dynamic Animated Task Runner ---
    const completedTasks = [];
    let currentTaskName = 'Template copying...';
    let frameIdx = 0;

    const taskInterval = setInterval(() => {
        const bar = BAR_FRAMES[frameIdx];
        let lines = `  ${bar} ${pc.bold('PPHLX Project initializing...')}\n`;
        for (const doneMsg of completedTasks) {
            lines += `      ${pc.green('✓')} ${pc.green(doneMsg)}\n`;
        }
        if (currentTaskName) {
            lines += `      ${pc.cyan('▶')} ${pc.cyan(currentTaskName)}`;
        }
        logUpdate(lines);
        frameIdx = (frameIdx + 1) % BAR_FRAMES.length;
    }, 100);

    // Step 1: Template Copy
    currentTaskName = 'Template copying...';
    const templateTarget = `github:pphlx/pphlx/templates/${template}`;
    try {
        await downloadTemplate(templateTarget, {
            force: true,
            cwd: projectPath,
            dir: '.'
        });
        completedTasks.push('Template copied');
    } catch (err) {
        clearInterval(taskInterval);
        logUpdate.done();
        p.note(
            `Please check that the template '${template}' exists under github:pphlx/pphlx/templates/`,
            'Template Download Error'
        );
        process.exit(1);
    }

    // Post-Processing: Update package.json name
    const pkgPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
        try {
            const pkgRaw = fs.readFileSync(pkgPath, 'utf-8');
            const pkgData = JSON.parse(pkgRaw);
            pkgData.name = projectName;
            delete pkgData.private;
            fs.writeFileSync(pkgPath, JSON.stringify(pkgData, null, 2), 'utf-8');
        } catch {
            // Non-fatal if package.json format differs
        }
    }

    // Step 2: Dependencies Installation
    if (installDeps) {
        currentTaskName = 'Dependencies installing with npm...';
        try {
            await runCommand('npm', ['install'], projectPath);
            completedTasks.push('Dependencies installed');
        } catch (err) {
            // Non-fatal npm install failure
        }
    }

    // Step 3: Git Initialization
    if (initGit) {
        currentTaskName = 'Git initializing...';
        try {
            await runCommand('git', ['init'], projectPath);
            await runCommand('git', ['add', '-A'], projectPath);
            await runCommand('git', ['commit', '-m', 'Initial commit from PPHLX'], projectPath);
            completedTasks.push('Git repository initialized');
        } catch {
            // Non-fatal git init failure
        }
    }

    currentTaskName = '';
    clearInterval(taskInterval);

    // Final Task Summary Output
    let finalSummary = `     ${pc.green('✔')} ${pc.bold(pc.green('Project initialized!'))}\n`;
    for (const doneMsg of completedTasks) {
        finalSummary += `       ${pc.dim('■')} ${pc.dim(doneMsg)}\n`;
    }
    logUpdate(finalSummary);
    logUpdate.done();

    // --- Completion Summary & Next Steps ---
    console.log('');
    p.outro(`${renderBadge('next', pc.bgCyan, pc.black)}  ${pc.bold('Project created. Explore your project!')}`);

    const targetFormatted = targetDir.includes(' ') ? `"./${targetDir}"` : `./${targetDir}`;
    console.log(`        Enter your project directory using ${pc.cyan(`cd ${targetFormatted}`)}`);
    console.log(`        Run ${pc.cyan('npm run dev')} to start the dev server. ${pc.cyan('q')} + ${pc.cyan('ENTER')} to stop.`);
    console.log(`        Add frameworks like ${pc.cyan('react')} or ${pc.cyan('tailwind')} using ${pc.cyan('pphlx add')}.`);
    console.log(`\n        Stuck? Join us at ${pc.cyan('https://pphlx.org/chat')}\n`);
}

main().catch((err) => {
    console.error(pc.red('\nFatal error during scaffolding:'), err);
    process.exit(1);
});
