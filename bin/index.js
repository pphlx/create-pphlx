#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import arg from 'arg';
import pc from 'picocolors';
import * as p from '@clack/prompts';
import { downloadTemplate } from 'giget';
import logUpdate from 'log-update';

const TEMPLATE_MANIFEST_URL = 'https://raw.githubusercontent.com/pphlx/pphlx/main/templates/templates.json';

const DEFAULT_TEMPLATES = [
    { value: 'minimal', label: 'Minimal starter project', hint: '(recommended)' }
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

const TASK_BAR_FRAMES = [
    pc.bgCyan('      '),
    pc.bgCyan('█     '),
    pc.bgCyan('██    '),
    pc.bgCyan('███   '),
    pc.bgCyan('████  '),
    pc.bgCyan('█████ '),
    pc.bgCyan('██████')
];

function renderBadge(label, bgFn = pc.bgMagenta, textFn = pc.whiteBold) {
    return bgFn(` ${textFn(label)} `);
}

function createBlockTaskRunner(title) {
    let frameIdx = 0;
    const interval = setInterval(() => {
        const bar = TASK_BAR_FRAMES[frameIdx];
        logUpdate(`  ${bar}  ${pc.bold(title)}`);
        frameIdx = (frameIdx + 1) % TASK_BAR_FRAMES.length;
    }, 120);

    return {
        stop(successText, isError = false) {
            clearInterval(interval);
            if (isError) {
                logUpdate(`  ${pc.red('✖')}  ${pc.red(successText)}\n`);
            } else {
                logUpdate(`  ${pc.green('✔')}  ${pc.bold(successText)}\n`);
            }
            logUpdate.done();
        }
    };
}

async function fetchRemoteTemplates() {
    try {
        const res = await fetch(TEMPLATE_MANIFEST_URL, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                return data;
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

async function main() {
    console.log('');
    p.intro(`${renderBadge('pphlx', pc.bgMagenta, pc.black)} ${pc.bold('Initializing PPHLX Project Setup')}`);

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

    // 1. Target Directory Prompt with Random Default Name
    if (!targetDir) {
        const defaultName = generateProjectName();
        if (isYes) {
            targetDir = defaultName;
        } else {
            const dirInput = await p.text({
                message: 'Where should we create your new project?',
                placeholder: defaultName,
                defaultValue: defaultName,
                validate(val) {
                    if (val.trim().length === 0) return 'Directory name cannot be empty';
                }
            });
            if (p.isCancel(dirInput)) {
                p.cancel('Scaffolding cancelled.');
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
        } else {
            const availableTemplates = await fetchRemoteTemplates();
            const templateChoice = await p.select({
                message: 'How would you like to start your new project?',
                options: availableTemplates
            });

            if (p.isCancel(templateChoice)) {
                p.cancel('Scaffolding cancelled.');
                process.exit(0);
            }
            template = templateChoice;
        }
    }

    // 3. Install Dependencies Prompt
    if (installDeps === undefined) {
        if (isYes) {
            installDeps = true;
        } else {
            const depsChoice = await p.confirm({
                message: 'Install dependencies with npm?',
                initialValue: true
            });
            if (p.isCancel(depsChoice)) {
                p.cancel('Scaffolding cancelled.');
                process.exit(0);
            }
            installDeps = depsChoice;
        }
    }

    // 4. Git Init Prompt
    if (initGit === undefined) {
        if (isYes) {
            initGit = true;
        } else {
            const gitChoice = await p.confirm({
                message: 'Initialize a new git repository?',
                initialValue: true
            });
            if (p.isCancel(gitChoice)) {
                p.cancel('Scaffolding cancelled.');
                process.exit(0);
            }
            initGit = gitChoice;
        }
    }

    console.log('');

    // --- Task 1: Template Download & Extraction ---
    const taskRunner = createBlockTaskRunner('Project initializing...');
    const templateTarget = `github:pphlx/pphlx/templates/${template}`;

    try {
        await downloadTemplate(templateTarget, {
            force: true,
            cwd: projectPath,
            dir: '.'
        });
    } catch (err) {
        taskRunner.stop(`Failed to download template '${template}' from github:pphlx/pphlx/templates/${template}`, true);
        p.note(
            `Please check that the template '${template}' exists under github:pphlx/pphlx/templates/`,
            'Template Download Error'
        );
        process.exit(1);
    }

    // --- Post-Processing: Update package.json name ---
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

    // --- Task 2: Install Dependencies ---
    if (installDeps) {
        try {
            await runCommand('npm', ['install'], projectPath);
        } catch (err) {
            // Log error silently, task finishes
        }
    }

    // --- Task 3: Initialize Git Repository ---
    if (initGit) {
        try {
            await runCommand('git', ['init'], projectPath);
            await runCommand('git', ['add', '-A'], projectPath);
            await runCommand('git', ['commit', '-m', 'Initial commit from PPHLX'], projectPath);
        } catch {
            // Non-fatal git init failure
        }
    }

    taskRunner.stop('Project initialized!');

    // --- Completion Summary & Next Steps ---
    console.log('');
    p.outro(`${renderBadge('next', pc.bgCyan, pc.black)} ${pc.bold('Project setup complete. Explore your project!')}`);

    console.log(`  ${pc.dim('Enter your project directory using:')}`);
    console.log(`  ${pc.cyan(`cd ${targetDir}`)}\n`);
    console.log(`  ${pc.dim('Run the development server:')}`);
    console.log(`  ${pc.cyan('npm run dev')}\n`);
}

main().catch((err) => {
    console.error(pc.red('\nFatal error during scaffolding:'), err);
    process.exit(1);
});
