import * as vscode from 'vscode';
import { SolutionTreeProvider } from './solution/tree';
import { registerCoreCommands } from './commands';
import { initStatusBar, setStatusBuilding } from './statusBar';
import { registerWelcomeWebview } from './home/home';

let treeProvider: SolutionTreeProvider | undefined;

export async function activate(context: vscode.ExtensionContext) {
  treeProvider = new SolutionTreeProvider(context);
  context.subscriptions.push(vscode.window.registerTreeDataProvider('zynSolution', treeProvider));
  initStatusBar(context);
  registerCoreCommands(context, treeProvider);
  registerWelcomeWebview(context);
}

export function deactivate() {
  setStatusBuilding(false);
}


