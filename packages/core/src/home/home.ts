import * as vscode from 'vscode';

export function registerWelcomeWebview(context: vscode.ExtensionContext) {
  context.subscriptions.push(vscode.commands.registerCommand('zyn.showHome', () => openHome(context)));
  const showHome = vscode.workspace.getConfiguration('zyn.ui').get<boolean>('showHome', true);
  if (showHome) {
    // auto show when folder or workspace opens
    setTimeout(() => openHome(context), 500);
  }
}

function openHome(context: vscode.ExtensionContext) {
  const panel = vscode.window.createWebviewPanel('zynHome', 'Zyn Home', vscode.ViewColumn.Active, { enableScripts: true, retainContextWhenHidden: true });
  panel.webview.html = renderHtml();
  panel.webview.onDidReceiveMessage(async (msg) => {
    if (msg?.type === 'openSolution') vscode.commands.executeCommand('zyn.openSolution');
    if (msg?.type === 'newProject') vscode.commands.executeCommand('zyn.newProject');
    if (msg?.type === 'detectToolchain') vscode.commands.executeCommand('zyn.toolchainDoctor');
    if (msg?.type === 'buildRun') {
      await vscode.commands.executeCommand('zyn.build');
      await vscode.commands.executeCommand('zyn.debug');
    }
    if (msg?.type === 'dontShow') {
      await vscode.workspace.getConfiguration('zyn.ui').update('showHome', false, vscode.ConfigurationTarget.Global);
    }
  });
}

function renderHtml(): string {
  const css = `
  body { font-family: var(--vscode-font-family); }
  .grid { display:grid; grid-template-columns: 2fr 1fr; gap:16px; }
  .card { border:1px solid var(--vscode-editorWidget-border); border-radius:8px; padding:24px; margin-bottom:16px; }
  .big { display:flex; gap:16px; }
  .big button { flex:1; font-size:16px; padding:20px; }
  .footer { margin-top:16px; display:flex; justify-content:space-between; align-items:center; }
  ul { margin:0; padding-left:20px; }
  `;
  const html = `<!DOCTYPE html><html><body>
    <style>${css}</style>
    <div class="grid">
      <div>
        <div class="card big">
          <button id="open">Open Solution (.sln / CMake)</button>
          <button id="new">New Project</button>
          <button id="detect">Detect Toolchain</button>
        </div>
        <div class="card footer">
          <button id="quick" disabled>Quick Build & Run</button>
          <a href="#" id="trouble">Troubleshooting</a>
          <label><input type="checkbox" id="dont"> Don't show again</label>
        </div>
      </div>
      <div>
        <div class="card">
          <h3>Recent Solutions/Workspaces</h3>
          <ul id="recent"><li>None</li></ul>
        </div>
      </div>
    </div>
    <script>
    const vscode = acquireVsCodeApi();
    document.getElementById('open').onclick = ()=>vscode.postMessage({type:'openSolution'});
    document.getElementById('new').onclick = ()=>vscode.postMessage({type:'newProject'});
    document.getElementById('detect').onclick = ()=>vscode.postMessage({type:'detectToolchain'});
    document.getElementById('quick').onclick = ()=>vscode.postMessage({type:'buildRun'});
    document.getElementById('dont').onchange = (e)=>{ if(e.target.checked) vscode.postMessage({type:'dontShow'}); };
    document.getElementById('trouble').onclick = ()=>vscode.postMessage({type:'openDoc', path:'docs/Troubleshooting.md'});
    </script>
  </body></html>`;
  return html;
}


