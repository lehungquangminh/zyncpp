import * as vscode from 'vscode';

export function openProfilerPanel() {
  const panel = vscode.window.createWebviewPanel('zynProfiler', 'Zyn Profiler', vscode.ViewColumn.Active, { enableScripts: true });
  panel.webview.html = `<!DOCTYPE html><html><body>
  <h3>Profiler</h3>
  <button id="start">Start</button> <button id="stop">Stop</button> <button id="report">Report</button>
  <div id="view">Report sẽ hiển thị tại đây.</div>
  <script>const v=acquireVsCodeApi();
  start.onclick=()=>v.postMessage({type:'start'});
  stop.onclick=()=>v.postMessage({type:'stop'});
  report.onclick=()=>v.postMessage({type:'report'});
  </script>
  </body></html>`;
  panel.webview.onDidReceiveMessage(async (m)=>{
    if(m?.type==='start') await vscode.commands.executeCommand('zyn.profiler.start');
    if(m?.type==='report') await vscode.commands.executeCommand('zyn.profiler.report');
  });
}


