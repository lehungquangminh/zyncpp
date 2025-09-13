import * as vscode from 'vscode';
import { generateLaunch } from './generateLaunch';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(vscode.commands.registerCommand('zyn.debug', async () => {
    const ws = vscode.workspace.workspaceFolders?.[0];
    if (!ws) return vscode.window.showErrorMessage('Không có workspace');
    // ensure build before debugging
    try { await vscode.commands.executeCommand('zyn.build.invoke'); } catch {}
    const launch = await generateLaunch(ws.uri.fsPath);
    const launchConfig = vscode.workspace.getConfiguration('launch', ws.uri);
    await launchConfig.update('configurations', launch.configurations, vscode.ConfigurationTarget.Workspace);
    if (launch.compound) await launchConfig.update('compounds', [launch.compound], vscode.ConfigurationTarget.Workspace);
    await vscode.debug.startDebugging(ws, launch.startName);
  }));
}

export function deactivate() {}


