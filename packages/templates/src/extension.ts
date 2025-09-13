import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(vscode.commands.registerCommand('zyn.newProject', async () => {
    const ws = vscode.workspace.workspaceFolders?.[0];
    if (!ws) return;
    const panel = vscode.window.createWebviewPanel('zynNewProject', 'New Project', vscode.ViewColumn.Active, { enableScripts: true });
    panel.webview.html = html();
    panel.webview.onDidReceiveMessage(async (msg) => {
      if (msg?.type === 'create') {
        const { kind, name } = msg;
        if (process.platform === 'win32' && kind === 'MSBuild ConsoleApp') await scaffoldMSBuild(ws.uri.fsPath, name);
        else await scaffoldCMake(ws.uri.fsPath, kind);
        vscode.window.showInformationMessage(`Đã tạo template ${kind}`);
      }
    });
  }));
}

export function deactivate() {}

async function scaffoldCMake(root: string, kind: string) {
  const src = path.join(root, 'src');
  await fs.promises.mkdir(src, { recursive: true });
  const main = `#include <iostream>\nint main(){ std::cout << "Hello zynC++\\n"; return 0; }\n`;
  await fs.promises.writeFile(path.join(src, 'main.cpp'), main);
  const cmakelists = `cmake_minimum_required(VERSION 3.20)\nproject(HelloZyn CXX)\nset(CMAKE_CXX_STANDARD 17)\nadd_executable(app src/main.cpp)\n`;
  await fs.promises.writeFile(path.join(root, 'CMakeLists.txt'), cmakelists);
}

async function scaffoldMSBuild(root: string, name: string) {
  const proj = `${name || 'App'}.vcxproj`;
  const content = `<?xml version="1.0" encoding="utf-8"?>\n<Project DefaultTargets=\"Build\" xmlns=\"http://schemas.microsoft.com/developer/msbuild/2003\">\n  <ItemGroup>\n    <ClCompile Include=\"src\\main.cpp\" />\n  </ItemGroup>\n  <PropertyGroup Label=\"Configuration\">\n    <ConfigurationType>Application</ConfigurationType>\n    <PlatformToolset>v143</PlatformToolset>\n  </PropertyGroup>\n</Project>`;
  await fs.promises.mkdir(path.join(root, 'src'), { recursive: true });
  await fs.promises.writeFile(path.join(root, proj), content, 'utf8');
  await fs.promises.writeFile(path.join(root, 'src', 'main.cpp'), `#include <iostream>\nint main(){ std::cout<<"Hello MSBuild"; }\n`);
}

function html() {
  return `<!DOCTYPE html><html><body>
  <h3>New Project</h3>
  <label>Template: <select id="kind"><option>ConsoleApp</option><option>StaticLib</option><option>SharedLib</option><option>GTest</option><option>Catch2</option><option>MSBuild ConsoleApp</option></select></label>
  <label>Name: <input id="name" placeholder="App" /></label>
  <button id="create">Create</button>
  <script>const v=acquireVsCodeApi(); create.onclick=()=>v.postMessage({type:'create', kind:kind.value, name:name.value});</script>
  </body></html>`;
}


