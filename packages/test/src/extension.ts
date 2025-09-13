import * as vscode from 'vscode';
import { spawn } from 'child_process';

export function activate(context: vscode.ExtensionContext) {
  const controller = vscode.tests.createTestController('zynTestController', 'zynC++ Tests');
  context.subscriptions.push(controller,
    vscode.commands.registerCommand('zyn.test.runAll', async () => {
      const ws = vscode.workspace.workspaceFolders?.[0];
      if (!ws) return;
      const root = ws.uri.fsPath;
      await exec('ctest', ['-j', String(Math.max(2, require('os').cpus().length * 2))], root);
    }),
    vscode.commands.registerCommand('zyn.test.runCurrent', async () => {
      const editor = vscode.window.activeTextEditor;
      const name = editor ? deriveTestName(editor.document.getText(), editor.selection.active.line) : undefined;
      if (!name) return vscode.window.showWarningMessage('Không xác định được test');
      const ws = vscode.workspace.workspaceFolders?.[0];
      if (!ws) return;
      await exec('ctest', ['-R', name], ws.uri.fsPath);
    })
  );
  discoverCtest(controller).catch(()=>{});
}

export function deactivate() {}

function exec(cmd: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, shell: process.platform === 'win32' });
    child.stdout.on('data', d => process.stdout.write(d));
    child.stderr.on('data', d => process.stderr.write(d));
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`${cmd} exited with ${code}`)));
  });
}

function deriveTestName(text: string, line: number): string | undefined {
  const lines = text.split(/\r?\n/);
  for (let i = line; i >= 0 && i > line - 20; i--) {
    const m = lines[i]?.match(/TEST\s*\(\s*([A-Za-z0-9_]+)\s*,\s*([A-Za-z0-9_]+)\s*\)/);
    if (m) return `${m[1]}.${m[2]}`;
  }
  return undefined;
}

async function discoverCtest(controller: vscode.TestController) {
  const ws = vscode.workspace.workspaceFolders?.[0];
  if (!ws) return;
  const buildDir = vscode.Uri.joinPath(ws.uri, 'build');
  const item = controller.createTestItem('ctest', 'CTest', buildDir);
  controller.items.add(item);
}


