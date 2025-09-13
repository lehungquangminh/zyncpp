import * as fs from 'fs';
import * as path from 'path';

export async function generateLaunch(root: string): Promise<{ configurations: any[]; compound?: any; startName: string }> {
  const isWin = process.platform === 'win32';
  const entries = await fs.promises.readdir(root);
  const hasSln = isWin && entries.some(e => e.toLowerCase().endsWith('.sln'));
  const config = 'Debug';
  let program = '';

  if (hasSln) {
    // Simplified: assume out dir bin/Debug under root
    const exe = await findExecutable(root);
    program = exe;
  } else {
    const buildDir = path.join(root, 'build', process.platform, config);
    program = await findExecutable(buildDir);
  }

  const common = {
    name: 'Run (zynC++)',
    request: 'launch',
    args: [],
    cwd: path.dirname(program),
    env: {},
    console: 'integratedTerminal'
  } as any;

  let cfg: any;
  if (isWin && program.toLowerCase().endsWith('.exe')) {
    cfg = { ...common, type: 'cppvsdbg', program };
  } else if (process.platform === 'darwin') {
    cfg = { ...common, type: 'lldb', program };
  } else {
    cfg = { ...common, type: 'cppdbg', MIMode: 'gdb', miDebuggerPath: 'gdb', program };
  }

  return { configurations: [cfg], startName: cfg.name };
}

async function findExecutable(dir: string): Promise<string> {
  const entries = await walk(dir);
  const exes = entries.filter(f => {
    if (process.platform === 'win32') return f.toLowerCase().endsWith('.exe');
    return path.basename(f) === 'app' || /\b[a-zA-Z0-9_-]+$/.test(f);
  });
  if (exes.length === 0) throw new Error('Không tìm thấy file thực thi sau build');
  // Heuristic: shortest path
  exes.sort((a, b) => a.length - b.length);
  return exes[0];
}

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  const ents = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const ent of ents) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      const sub = await walk(full);
      out.push(...sub);
    } else {
      out.push(full);
    }
  }
  return out;
}


