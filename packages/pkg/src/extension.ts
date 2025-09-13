import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { openPackagesPanel } from './ui/panel';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(vscode.commands.registerCommand('zyn.addPackage', async () => {
    const choice = await vscode.window.showQuickPick(['vcpkg', 'Conan'], { placeHolder: 'Chọn trình quản lý gói' });
    if (!choice) return;
    const ws = vscode.workspace.workspaceFolders?.[0];
    if (!ws) return;
    const root = ws.uri.fsPath;
    if (choice === 'vcpkg') await ensureVcpkgManifest(root);
    if (choice === 'Conan') await ensureConanProfile(root);
  }));
  context.subscriptions.push(vscode.commands.registerCommand('zyn.showPackages', async () => openPackagesPanel()));
}

export function deactivate() {}

async function ensureVcpkgManifest(root: string) {
  const manifest = path.join(root, 'vcpkg.json');
  if (!fs.existsSync(manifest)) {
    await fs.promises.writeFile(manifest, JSON.stringify({ name: 'app', version: '0.0.0', dependencies: [] }, null, 2));
  }
  await exec('vcpkg', ['install'], root);
  vscode.window.showInformationMessage('vcpkg install hoàn tất');
}

async function ensureConanProfile(root: string) {
  const profile = path.join(root, 'conanprofile');
  if (!fs.existsSync(profile)) {
    await fs.promises.writeFile(profile, '[settings]\nbuild_type=Debug\n', 'utf8');
  }
  await exec('conan', ['install', '.', '--build=missing', '-s', 'build_type=Debug'], root);
  vscode.window.showInformationMessage('Conan install hoàn tất');
}

function exec(cmd: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, shell: process.platform === 'win32' });
    child.stdout.on('data', d => process.stdout.write(d));
    child.stderr.on('data', d => process.stderr.write(d));
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`${cmd} exited with ${code}`)));
  });
}


