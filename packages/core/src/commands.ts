import * as vscode from 'vscode';
import { SolutionTreeProvider } from './solution/tree';
import { setStatusBuilding, setStatusConfiguration, setStatusKit, setStatusPlatform } from './statusBar';
import { spawn } from 'child_process';
import * as path from 'path';
import { showToolchainDoctor } from './toolchainDoctor/webview/panel';

export function registerCoreCommands(context: vscode.ExtensionContext, tree: SolutionTreeProvider) {
  context.subscriptions.push(
    vscode.commands.registerCommand('zyn.openSolution', async () => {
      await tree.refresh();
    }),
    vscode.commands.registerCommand('zyn.runStartup', async () => {
      await vscode.commands.executeCommand('zyn.debug');
    }),
    vscode.commands.registerCommand('zyn.setConfiguration', async () => {
      const pick = await vscode.window.showQuickPick(['Debug','Release','RelWithDebInfo','MinSizeRel'], { placeHolder: 'Chọn cấu hình' });
      if (pick) {
        setStatusConfiguration(pick);
        await vscode.workspace.getConfiguration('zyn.build').update('configuration', pick, vscode.ConfigurationTarget.Workspace);
      }
    }),
    vscode.commands.registerCommand('zyn.setPlatform', async () => {
      const list = process.platform === 'win32' ? ['x86','x64','arm64'] : ['x64','arm64'];
      const pick = await vscode.window.showQuickPick(list, { placeHolder: 'Chọn nền tảng' });
      if (pick) {
        setStatusPlatform(pick);
        await vscode.workspace.getConfiguration('zyn.build').update('platform', pick, vscode.ConfigurationTarget.Workspace);
      }
    }),
    vscode.commands.registerCommand('zyn.setCompilerKit', async () => {
      const pick = await vscode.window.showQuickPick(['auto', 'MSVC', 'Clang', 'GCC'], { placeHolder: 'Chọn compiler kit' });
      if (pick) {
        setStatusKit(pick);
        await vscode.workspace.getConfiguration('zyn.build').update('kit', pick, vscode.ConfigurationTarget.Workspace);
      }
    }),
    vscode.commands.registerCommand('zyn.toolchainDoctor', async () => {
      showToolchainDoctor();
    }),
    vscode.commands.registerCommand('zyn.build', async () => {
      setStatusBuilding(true);
      try {
        await vscode.commands.executeCommand('zyn.build.invoke');
        vscode.window.showInformationMessage('Build thành công.');
      } catch (e: any) {
        vscode.window.showErrorMessage(`Build lỗi: ${e?.message ?? e}`);
      } finally {
        setStatusBuilding(false);
      }
    })
  );
}

// build logic moved to build package (zyn.build.invoke)

async function hasPattern(dir: string, match: (name: string) => boolean): Promise<boolean> {
  const list = await vscode.workspace.fs.readDirectory(vscode.Uri.file(dir));
  return list.some(([name, _type]) => match(name));
}

async function hasFile(dir: string, file: string): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(vscode.Uri.file(path.join(dir, file)));
    return true;
  } catch {
    return false;
  }
}

function execChild(cmd: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, shell: process.platform === 'win32' });
    child.stdout.on('data', d => process.stdout.write(d));
    child.stderr.on('data', d => process.stderr.write(d));
    child.on('close', code => {
      if (code === 0) resolve(); else reject(new Error(`${cmd} exited with ${code}`));
    });
  });
}

// msbuild invocation handled by build package

async function runAndCapture(cmd: string, args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, shell: true });
    let out = '';
    let err = '';
    child.stdout.on('data', d => (out += d.toString()));
    child.stderr.on('data', d => (err += d.toString()));
    child.on('close', code => {
      if (code === 0) resolve(out); else reject(new Error(err || `exit ${code}`));
    });
  });
}

// cmake invocation handled by build package


