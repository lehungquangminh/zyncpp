import * as vscode from 'vscode';
import { spawn } from 'child_process';

export function showToolchainDoctor() {
  const panel = vscode.window.createWebviewPanel('zynToolchainDoctor', 'zynC++ Toolchain Doctor', vscode.ViewColumn.Active, { enableScripts: true });
  panel.webview.html = getHtml();
  (async () => {
    const detected = await detectTools();
    panel.webview.postMessage({ type: 'detected', payload: detected });
  })();
  panel.webview.onDidReceiveMessage(async (m)=>{
    if (m?.type === 'installConsent') {
      try{
        const mod = await import('zyn-cpp-bootstrap/dist/installer.js');
        await mod.runInstall({ mode: m.mode || 'guided', onEvent: (e: any)=> panel.webview.postMessage({ type:'progress', payload: e }) });
        const detected = await detectTools();
        panel.webview.postMessage({ type: 'detected', payload: detected });
      }catch(e:any){ panel.webview.postMessage({ type:'error', message: e?.message||String(e) }); }
    }
  });
}

function getHtml(): string {
  return `<!DOCTYPE html><html><body>
  <h2>Toolchain Doctor</h2>
  <div id="content">Đang kiểm tra toolchains...</div>
  <div class="consent">
    <button id="full">Full Auto Install</button>
    <button id="guided">Guided Install</button>
  </div>
  <script>
  const vscode = acquireVsCodeApi();
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'detected') {
      const d = e.data.payload;
      const rows = Object.entries(d).map(([k,v]) => '<tr><td>'+k+'</td><td>'+(v ? 'OK' : 'Missing')+'</td></tr>').join('');
      document.getElementById('content').innerHTML = '<table>'+rows+'</table>';
    }
    if (e.data?.type === 'progress') {
      // could render progress
    }
  });
  document.getElementById('full').onclick=()=>vscode.postMessage({type:'installConsent', mode:'full'});
  document.getElementById('guided').onclick=()=>vscode.postMessage({type:'installConsent', mode:'guided'});
  </script>
  </body></html>`;
}

async function detectTools(): Promise<Record<string, boolean>> {
  const tools = ['cmake', 'ninja'];
  if (process.platform === 'win32') tools.push('vswhere');
  if (process.platform === 'darwin') tools.push('lldb'); else tools.push('gdb');
  const out: Record<string, boolean> = {};
  for (const t of tools) out[t] = await which(t);
  return out;
}

function which(bin: string): Promise<boolean> {
  return new Promise(resolve => {
    const cmd = process.platform === 'win32' ? `where ${bin}` : `which ${bin}`;
    const child = spawn(cmd, { shell: true });
    child.on('close', code => resolve(code === 0));
  });
}


