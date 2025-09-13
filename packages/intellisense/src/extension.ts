import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(() => ensureClangdConfig()));
  ensureClangdConfig();
  context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(async (doc)=>{
    if (/CMakeLists\.txt$/.test(doc.fileName)) await ensureClangdConfig();
  }));
}

export function deactivate() {}

async function ensureClangdConfig() {
  const ws = vscode.workspace.workspaceFolders?.[0];
  if (!ws) return;
  const root = ws.uri.fsPath;
  const buildDir = path.join(root, 'build', process.platform, 'Debug');
  const cc = path.join(buildDir, 'compile_commands.json');
  try {
    await fs.promises.access(cc, fs.constants.R_OK);
  } catch {
    // Attempt to generate via CMake if present
    const cmakeLists = path.join(root, 'CMakeLists.txt');
    if (fs.existsSync(cmakeLists)) {
      await vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: 'zynC++: Generating compile_commands.json' }, async () => {
        await vscode.commands.executeCommand('zyn.build');
      });
    }
  }
  const clangd = path.join(root, '.clangd');
  if (!fs.existsSync(clangd)) {
    const content = `CompileFlags:\n  CompilationDatabase: ${buildDir.replace(/\\/g,'/')}\n`;
    await fs.promises.writeFile(clangd, content, 'utf8');
  }
}


