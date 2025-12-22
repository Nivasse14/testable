/**
 * Utilitaires filesystem avec retry et gestion d'erreurs
 */

import { promises as fs, existsSync, mkdirSync, rmSync } from 'fs';
import { dirname } from 'path';
import retry from './retry.js';

/**
 * Crée un dossier récursivement
 */
export async function ensureDir(path) {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

/**
 * Lit un fichier JSON avec retry
 */
export async function readJSON(path) {
  return retry(async () => {
    const content = await fs.readFile(path, 'utf-8');
    return JSON.parse(content);
  }, { maxAttempts: 2 });
}

/**
 * Écrit un fichier JSON avec retry
 */
export async function writeJSON(path, data) {
  return retry(async () => {
    await ensureDir(dirname(path));
    await fs.writeFile(path, JSON.stringify(data, null, 2), 'utf-8');
  }, { maxAttempts: 2 });
}

/**
 * Copie un fichier
 */
export async function copyFile(src, dest) {
  await ensureDir(dirname(dest));
  await fs.copyFile(src, dest);
}

/**
 * Supprime un dossier récursivement
 */
export function removeDir(path) {
  if (existsSync(path)) {
    rmSync(path, { recursive: true, force: true });
  }
}

/**
 * Liste les fichiers d'un dossier avec filtre
 */
export async function listFiles(dir, extensions = []) {
  if (!existsSync(dir)) {
    return [];
  }

  const files = await fs.readdir(dir);
  
  if (extensions.length === 0) {
    return files;
  }

  return files.filter(file => {
    const ext = file.toLowerCase().split('.').pop();
    return extensions.includes(`.${ext}`);
  });
}

/**
 * Vérifie si un fichier existe
 */
export function fileExists(path) {
  return existsSync(path);
}

/**
 * Calcule un hash simple d'un fichier (pour cache)
 */
export async function fileHash(path) {
  const stats = await fs.stat(path);
  return `${path}-${stats.size}-${stats.mtimeMs}`;
}

export default {
  ensureDir,
  readJSON,
  writeJSON,
  copyFile,
  removeDir,
  listFiles,
  fileExists,
  fileHash,
};
