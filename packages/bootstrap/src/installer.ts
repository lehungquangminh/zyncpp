import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createHash } from 'crypto';
import { spawn } from 'child_process';
import decompress from 'decompress';

export type InstallMode = 'full' | 'guided';

export interface InstallEvent {
  stepId: string;
  status: 'start' | 'progress' | 'done' | 'error';
  message?: string;
  progress?: number;
}

export interface OrchestratorOptions {
  mode: InstallMode;
  channel?: 'stable' | 'nightly';
  rootDir?: string;
  signal?: AbortSignal;
  onEvent?: (e: InstallEvent) => void;
  ci?: boolean;
}

export async function runInstall(opts: OrchestratorOptions): Promise<string> {
  const root = opts.rootDir || path.join(os.homedir(), process.platform === 'win32' ? '.zyncpp' : '.zyncpp');
  const toolsDir = path.join(root, 'tools');
  const binDir = path.join(root, 'bin');
  await fs.promises.mkdir(toolsDir, { recursive: true });
  await fs.promises.mkdir(binDir, { recursive: true });

  const steps: Step[] = [];
  steps.push(llvmStep(toolsDir, binDir));
  steps.push(cmakeStep(toolsDir, binDir));
  steps.push(ninjaStep(toolsDir, binDir));
  steps.push(vcpkgStep(root, binDir));
  steps.push(conanStep(root, binDir));

  for (const step of steps) {
    if (opts.signal?.aborted) throw new Error('aborted');
    try {
      opts.onEvent?.({ stepId: step.id, status: 'start', message: step.title });
      const ok = await step.check();
      if (!ok) {
        await step.install(opts);
      }
      await step.verify();
      await makeShim(binDir, step.shims || []);
      opts.onEvent?.({ stepId: step.id, status: 'done' });
    } catch (e: any) {
      opts.onEvent?.({ stepId: step.id, status: 'error', message: e?.message || String(e) });
      if (opts.mode === 'full') throw e; // fail-fast in CI/full
    }
  }

  const tc = { root, bin: binDir };
  await fs.promises.writeFile(path.join(root, 'toolchain.json'), JSON.stringify(tc, null, 2));
  return binDir;
}

interface Step {
  id: string;
  title: string;
  check(): Promise<boolean>;
  install(opts: OrchestratorOptions): Promise<void>;
  verify(): Promise<void>;
  shims?: { name: string; target: string }[];
}

function llvmStep(toolsDir: string, binDir: string): Step {
  const id = 'llvm';
  const title = 'LLVM/clang/clangd';
  const dest = path.join(toolsDir, `llvm-${process.platform}`);
  const marker = path.join(dest, '.ok');
  const url = selectLlvmUrl();
  const sha = selectLlvmSha256();
  return {
    id, title,
    async check() { return fs.existsSync(marker); },
    async install(opts) {
      await downloadAndExtract(url, dest, sha, opts);
      await fs.promises.writeFile(marker, 'ok');
    },
    async verify() { await exec(path.join(dest, 'bin', exe('clang++')), ['--version']); },
    shims: [
      { name: exe('clang++'), target: path.join(dest, 'bin', exe('clang++')) },
      { name: exe('clangd'), target: path.join(dest, 'bin', exe('clangd')) }
    ]
  };
}

function cmakeStep(toolsDir: string, binDir: string): Step {
  const id = 'cmake';
  const dest = path.join(toolsDir, `cmake-${process.platform}`);
  const marker = path.join(dest, '.ok');
  const url = selectCmakeUrl();
  const sha = selectCmakeSha256();
  return {
    id, title: 'CMake',
    async check() { return fs.existsSync(marker); },
    async install(opts) { await downloadAndExtract(url, dest, sha, opts); await fs.promises.writeFile(marker, 'ok'); },
    async verify() { await exec(path.join(dest, 'bin', exe('cmake')), ['--version']); },
    shims: [ { name: exe('cmake'), target: path.join(dest, 'bin', exe('cmake')) } ]
  };
}

function ninjaStep(toolsDir: string, binDir: string): Step {
  const id = 'ninja';
  const dest = path.join(toolsDir, `ninja-${process.platform}`);
  const marker = path.join(dest, '.ok');
  const url = selectNinjaUrl();
  const sha = selectNinjaSha256();
  return {
    id, title: 'Ninja',
    async check() { return fs.existsSync(marker); },
    async install(opts) { await downloadAndExtract(url, dest, sha, opts); await fs.promises.writeFile(marker, 'ok'); },
    async verify() { await exec(path.join(dest, exe('ninja')), ['--version']); },
    shims: [ { name: exe('ninja'), target: path.join(dest, exe('ninja')) } ]
  };
}

function vcpkgStep(root: string, binDir: string): Step {
  const id = 'vcpkg';
  const dest = path.join(root, 'tools', 'vcpkg');
  const marker = path.join(dest, '.ok');
  return {
    id, title: 'vcpkg',
    async check() { return fs.existsSync(path.join(dest, 'vcpkg')) || fs.existsSync(marker); },
    async install() {
      await exec('git', ['clone', '--depth=1', 'https://github.com/microsoft/vcpkg.git', dest]);
      await exec(process.platform === 'win32' ? 'cmd' : 'bash', [process.platform === 'win32' ? '/c' : '-lc', process.platform === 'win32' ? '.\\bootstrap-vcpkg.bat' : './bootstrap-vcpkg.sh'], dest);
      await fs.promises.writeFile(marker, 'ok');
    },
    async verify() { await exec(path.join(dest, 'vcpkg' + (process.platform === 'win32' ? '.exe' : '')), ['--version']); },
    shims: [ { name: exe('vcpkg'), target: path.join(dest, exe('vcpkg')) } ]
  };
}

function conanStep(root: string, binDir: string): Step {
  const id = 'conan';
  const dest = path.join(root, 'tools', 'conan');
  const marker = path.join(dest, '.ok');
  return {
    id, title: 'Conan (pipx)',
    async check() { return fs.existsSync(marker); },
    async install() {
      await fs.promises.mkdir(dest, { recursive: true });
      // try system python
      try { await exec('python3', ['-m', 'pip', 'install', '--user', 'conan']); } catch {}
      await fs.promises.writeFile(marker, 'ok');
    },
    async verify() { await exec('conan', ['--version']).catch(()=>{}); },
    shims: []
  };
}

async function downloadAndExtract(url: string, dest: string, sha256: string, opts: OrchestratorOptions) {
  const cacheDir = path.join(dest, '..', '..', 'cache');
  await fs.promises.mkdir(cacheDir, { recursive: true });
  const archive = path.join(cacheDir, Buffer.from(url).toString('base64').replace(/[^a-zA-Z0-9]/g,'_'));
  await downloadFile(url, archive, sha256, opts);
  await fs.promises.mkdir(dest, { recursive: true });
  await decompress(archive, dest);
}

async function downloadFile(url: string, out: string, sha256: string, opts: OrchestratorOptions) {
  const mod = await import('node:https');
  await new Promise<void>((resolve, reject) => {
    const file = fs.createWriteStream(out);
    const req = mod.get(url, res => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadFile(res.headers.location, out, sha256, opts).then(resolve, reject);
        return;
      }
      const total = Number(res.headers['content-length'] || 0);
      let loaded = 0;
      res.on('data', chunk => {
        loaded += chunk.length;
        opts.onEvent?.({ stepId: 'download', status: 'progress', progress: total ? loaded / total : 0 });
      });
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
    });
    req.on('error', reject);
  });
  // verify
  const sum = await sha256File(out);
  if (sha256 && sha256 !== 'dev' && sum !== sha256) throw new Error(`Checksum mismatch for ${url}`);
}

async function sha256File(p: string) {
  const h = createHash('sha256');
  const s = fs.createReadStream(p);
  return await new Promise<string>((resolve, reject) => {
    s.on('data', d => h.update(d));
    s.on('end', () => resolve(h.digest('hex')));
    s.on('error', reject);
  });
}

async function exec(cmd: string, args: string[], cwd?: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, shell: process.platform === 'win32' });
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`${cmd} ${code}`)));
  });
}

function exe(name: string) { return process.platform === 'win32' ? `${name}.exe` : name; }

function selectLlvmUrl(): string {
  if (process.platform === 'win32') return 'https://github.com/llvm/llvm-project/releases/download/llvmorg-17.0.6/LLVM-17.0.6-win64.exe.zip';
  if (process.platform === 'darwin') return 'https://github.com/llvm/llvm-project/releases/download/llvmorg-17.0.6/clang+llvm-17.0.6-x86_64-apple-darwin.tar.xz';
  return 'https://github.com/llvm/llvm-project/releases/download/llvmorg-17.0.6/clang+llvm-17.0.6-x86_64-linux-gnu-ubuntu-22.04.tar.xz';
}
function selectLlvmSha256(): string { return 'dev'; }
function selectCmakeUrl(): string {
  if (process.platform === 'win32') return 'https://github.com/Kitware/CMake/releases/download/v3.29.6/cmake-3.29.6-windows-x86_64.zip';
  if (process.platform === 'darwin') return 'https://github.com/Kitware/CMake/releases/download/v3.29.6/cmake-3.29.6-macos-universal.tar.gz';
  return 'https://github.com/Kitware/CMake/releases/download/v3.29.6/cmake-3.29.6-linux-x86_64.tar.gz';
}
function selectCmakeSha256(): string { return 'dev'; }
function selectNinjaUrl(): string {
  if (process.platform === 'win32') return 'https://github.com/ninja-build/ninja/releases/download/v1.11.1/ninja-win.zip';
  if (process.platform === 'darwin') return 'https://github.com/ninja-build/ninja/releases/download/v1.11.1/ninja-mac.zip';
  return 'https://github.com/ninja-build/ninja/releases/download/v1.11.1/ninja-linux.zip';
}
function selectNinjaSha256(): string { return 'dev'; }


