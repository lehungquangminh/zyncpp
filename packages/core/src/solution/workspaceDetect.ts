import * as fs from 'fs';
import * as path from 'path';

export interface WorkspaceInfo {
  solutionName: string;
  projects: { name: string; root: string; sources: string[]; headers: string[] }[];
  packages: string[];
  usesSln: boolean;
  usesCMake: boolean;
}

export async function parseWorkspace(root: string): Promise<WorkspaceInfo> {
  const entries = await fs.promises.readdir(root);
  const usesSln = entries.some(e => e.toLowerCase().endsWith('.sln'));
  const usesCMake = entries.includes('CMakeLists.txt') || entries.includes('CMakePresets.json');
  const solutionName = path.basename(root);

  // simple scan for sources & headers
  const sources: string[] = [];
  const headers: string[] = [];
  const pkgs: string[] = [];

  async function walk(dir: string) {
    const ents = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const ent of ents) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === 'build' || ent.name === 'dist' || ent.name === 'out' || ent.name === 'node_modules') continue;
        await walk(full);
      } else {
        if (/\.(c|cc|cpp|cxx)$/i.test(ent.name)) sources.push(full);
        if (/\.(h|hpp|hh)$/i.test(ent.name)) headers.push(full);
        if (ent.name === 'vcpkg.json' || ent.name === 'conanfile.txt' || ent.name === 'conanfile.py') pkgs.push(full);
      }
    }
  }

  await walk(root);
  const project = { name: solutionName, root, sources, headers };
  return { solutionName, projects: [project], packages: pkgs, usesSln, usesCMake };
}


