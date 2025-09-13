import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { openProfilerPanel } from './ui/panel';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('zyn.profiler.start', async () => {
      const ws = vscode.workspace.workspaceFolders?.[0];
      if (!ws) return;
      const root = ws.uri.fsPath;
      if (process.platform === 'win32') await exec('wpr', ['-start', 'GeneralProfile'], root);
      else if (process.platform === 'darwin') await exec('instruments', ['-s'], root).catch(() => {});
      else await exec('perf', ['record', '-F', '99', '--', 'sleep', '1'], root);
      vscode.window.showInformationMessage('Profiling bắt đầu (hoặc đã ghi nhanh)');
    }),
    vscode.commands.registerCommand('zyn.profiler.report', async () => {
      const ws = vscode.workspace.workspaceFolders?.[0];
      if (!ws) return;
      const panel = vscode.window.createWebviewPanel('zynProfiler', 'zynC++ Profiler', vscode.ViewColumn.Active, { enableScripts: true });
      panel.webview.html = `<html><body><h2>Profiling Report</h2><p>Trình xem đơn giản. Dùng công cụ hệ thống để phân tích sâu.</p></body></html>`;
    })
  );
  context.subscriptions.push(vscode.commands.registerCommand('zyn.showProfiler', () => openProfilerPanel()));
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


