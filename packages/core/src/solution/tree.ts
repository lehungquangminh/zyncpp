import * as vscode from 'vscode';
import { parseWorkspace } from './workspaceDetect';

export class SolutionTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private _onDidChangeTreeData: vscode.EventEmitter<TreeNode | undefined | null | void> = new vscode.EventEmitter<TreeNode | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TreeNode | undefined | null | void> = this._onDidChangeTreeData.event;
  private root: TreeNode | undefined;

  constructor(private readonly context: vscode.ExtensionContext) {}

  async refresh(): Promise<void> {
    this.root = await buildModel();
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TreeNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TreeNode): Thenable<TreeNode[]> {
    if (!this.root) {
      return (async () => {
        await this.refresh();
        return this.root ? [this.root] : [];
      })();
    }
    if (!element) return Promise.resolve([this.root]);
    return Promise.resolve(element.children ?? []);
  }
}

export class TreeNode extends vscode.TreeItem {
  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly children?: TreeNode[],
    public contextValue?: string
  ) {
    super(label, collapsibleState);
  }
}

async function buildModel(): Promise<TreeNode> {
  const ws = vscode.workspace.workspaceFolders?.[0];
  const wsInfo = await parseWorkspace(ws?.uri.fsPath ?? process.cwd());
  const projectNodes: TreeNode[] = [];
  for (const proj of wsInfo.projects) {
    const executable = new TreeNode('app (executable)', vscode.TreeItemCollapsibleState.None, undefined, 'executableTarget');
    executable.tooltip = 'Executable target';
    executable.iconPath = new vscode.ThemeIcon('play-circle');
    executable.command = { command: 'zyn.runStartup', title: 'Run' };
    const targets = new TreeNode('Targets', vscode.TreeItemCollapsibleState.Collapsed, [
      nodeCmd('Build All', 'zyn.build'),
      executable,
      nodeCmd('Tests', 'zyn.test.runAll')
    ], 'targets');
    const src = new TreeNode('Sources', vscode.TreeItemCollapsibleState.Collapsed, proj.sources.map(s => leaf(s)));
    const hdr = new TreeNode('Headers', vscode.TreeItemCollapsibleState.Collapsed, proj.headers.map(s => leaf(s)));
    const pkgs = new TreeNode('Packages', vscode.TreeItemCollapsibleState.Collapsed, wsInfo.packages.map(p => leaf(p)));
    const projNode = new TreeNode(proj.name, vscode.TreeItemCollapsibleState.Collapsed, [targets, src, hdr, pkgs], 'project');
    projectNodes.push(projNode);
  }
  const root = new TreeNode(wsInfo.solutionName, vscode.TreeItemCollapsibleState.Expanded, projectNodes, 'solution');
  root.contextValue = 'solution';
  return root;
}

function nodeCmd(label: string, command: string): TreeNode {
  const n = new TreeNode(label, vscode.TreeItemCollapsibleState.None, undefined, 'command');
  n.command = { command, title: label };
  return n;
}

function leaf(label: string): TreeNode {
  const n = new TreeNode(label, vscode.TreeItemCollapsibleState.None, undefined, 'file');
  n.resourceUri = vscode.Uri.file(label);
  n.command = { command: 'vscode.open', title: 'Open', arguments: [n.resourceUri] };
  return n;
}


