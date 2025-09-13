import * as vscode from 'vscode';
import { spawn } from 'child_process';

export function openPackagesPanel() {
  const panel = vscode.window.createWebviewPanel('zynPackages', 'Zyn Packages', vscode.ViewColumn.Active, { enableScripts: true });
  panel.webview.html = html();
  panel.webview.onDidReceiveMessage(async (msg) => {
    const ws = vscode.workspace.workspaceFolders?.[0];
    if (!ws) return;
    if (msg?.type === 'vcpkgInstall') await exec('vcpkg', ['install'], ws.uri.fsPath);
    if (msg?.type === 'conanInstall') await exec('conan', ['install', '.', '--build=missing'], ws.uri.fsPath);
  });
}

function html() {
  return `<!DOCTYPE html><html><body>
  <h3>Packages</h3>
  <div style="display:flex; gap:16px;">
    <div style="flex:1">
      <h4>Installed</h4>
      <div id="installed">Use vcpkg/conan commands</div>
    </div>
    <div style="flex:2">
      <h4>Search & Add</h4>
      <input id="q" placeholder="Search name"> <button id="vcpkg">vcpkg install</button> <button id="conan">Conan install</button>
    </div>
  </div>
  <script>
  const vscode=acquireVsCodeApi();
  document.getElementById('vcpkg').onclick=()=>vscode.postMessage({type:'vcpkgInstall'});
  document.getElementById('conan').onclick=()=>vscode.postMessage({type:'conanInstall'});
  </script>
  </body></html>`;
}

function exec(cmd: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, shell: process.platform === 'win32' });
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`${cmd} ${code}`)));
  });
}


