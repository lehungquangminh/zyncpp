import * as vscode from 'vscode';

let left: vscode.StatusBarItem;
let configItem: vscode.StatusBarItem;
let kitItem: vscode.StatusBarItem;
let platformItem: vscode.StatusBarItem;
let buildItem: vscode.StatusBarItem;

export function initStatusBar(context: vscode.ExtensionContext) {
  left = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  left.text = '$(project) Solution';
  left.tooltip = 'zynC++ Solution';
  left.command = 'zyn.openSolution';
  left.show();
  configItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
  const cfg = vscode.workspace.getConfiguration('zyn.build');
  configItem.text = cfg.get<string>('configuration') || 'Debug';
  configItem.command = 'zyn.setConfiguration';
  configItem.show();
  kitItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 98);
  kitItem.text = `Kit: ${cfg.get<string>('kit') || 'auto'}`;
  kitItem.command = 'zyn.setCompilerKit';
  kitItem.show();
  platformItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 97);
  platformItem.text = cfg.get<string>('platform') || 'x64';
  platformItem.command = 'zyn.setPlatform';
  platformItem.show();
  buildItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 96);
  buildItem.text = 'Build: idle';
  buildItem.command = 'zyn.build';
  buildItem.show();
  context.subscriptions.push(left, configItem, kitItem, platformItem, buildItem);
}

export function setStatusConfiguration(cfg: string) {
  configItem.text = cfg;
}

export function setStatusKit(kit: string) {
  kitItem.text = `Kit: ${kit}`;
}

export function setStatusPlatform(p: string) {
  platformItem.text = p;
}

export function setStatusBuilding(isBuilding: boolean) {
  buildItem.text = `Build: ${isBuilding ? 'building' : 'idle'}`;
}


