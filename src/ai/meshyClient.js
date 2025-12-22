/**
 * Meshy.ai API Client
 * Génération de modèles 3D à partir de prompts texte
 */

import fetch from 'node-fetch';
import { writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import Logger from '../utils/logger.js';

const logger = new Logger('MESHY');

const MESHY_API_KEY = 'msy_RiLZ2DAjeigr0ACUwh8RciNvjpSf7ElNHI9m';
const MESHY_API_URL = 'https://api.meshy.ai/v2/text-to-3d';

/**
 * Génère un modèle 3D depuis un prompt texte
 * @param {string} prompt - Description du modèle 3D
 * @param {Object} options - Options de génération
 * @returns {Promise<Object>} - {taskId, status, modelUrl}
 */
export async function generateModel(prompt, options = {}) {
  const {
    artStyle = 'realistic',  // realistic, cartoon, low-poly, sculpt
    negativePrompt = 'low quality, blurry, distorted',
    aiModel = 'meshy-4',
    targetPolycount = 30000,
  } = options;

  logger.info(`Génération 3D Meshy: "${prompt.substring(0, 50)}..."`);

  try {
    const response = await fetch(MESHY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MESHY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: 'preview',  // preview (rapide) ou refine (qualité)
        prompt,
        art_style: artStyle,
        negative_prompt: negativePrompt,
        ai_model: aiModel,
        target_polycount: targetPolycount,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Meshy API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    const taskId = data.result;

    logger.success(`✓ Task créée: ${taskId}`);
    logger.info('Attente génération (30-120s)...');

    return { taskId, status: 'PENDING' };
  } catch (error) {
    logger.error(`Erreur Meshy API: ${error.message}`);
    throw error;
  }
}

/**
 * Vérifie le statut d'une génération
 * @param {string} taskId - ID de la tâche Meshy
 * @returns {Promise<Object>} - {status, progress, modelUrl, thumbnailUrl}
 */
export async function checkTaskStatus(taskId) {
  try {
    const response = await fetch(`${MESHY_API_URL}/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MESHY_API_KEY}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Status check failed (${response.status}): ${error}`);
    }

    const data = await response.json();
    
    return {
      status: data.status,  // PENDING, IN_PROGRESS, SUCCEEDED, FAILED
      progress: data.progress || 0,
      modelUrl: data.model_urls?.glb,  // URL du fichier GLB
      thumbnailUrl: data.thumbnail_url,
      taskId: data.id,
    };
  } catch (error) {
    logger.error(`Erreur vérification status: ${error.message}`);
    throw error;
  }
}

/**
 * Attend la fin de génération et retourne le modèle
 * @param {string} taskId - ID de la tâche
 * @param {number} maxWaitSeconds - Temps d'attente max
 * @returns {Promise<Object>} - {modelUrl, thumbnailUrl, glbPath}
 */
export async function waitForCompletion(taskId, maxWaitSeconds = 180) {
  const startTime = Date.now();
  const pollInterval = 5000; // 5 secondes

  while (true) {
    const elapsed = (Date.now() - startTime) / 1000;
    
    if (elapsed > maxWaitSeconds) {
      throw new Error(`Timeout: génération non terminée après ${maxWaitSeconds}s`);
    }

    const result = await checkTaskStatus(taskId);
    
    if (result.status === 'SUCCEEDED') {
      logger.success(`✓ Génération terminée (${elapsed.toFixed(0)}s)`);
      return result;
    }
    
    if (result.status === 'FAILED') {
      throw new Error('Génération Meshy échouée');
    }

    logger.info(`Progression: ${result.progress}% (${elapsed.toFixed(0)}s)`);
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
}

/**
 * Télécharge le modèle GLB généré
 * @param {string} modelUrl - URL du modèle GLB
 * @param {string} outputPath - Chemin de sauvegarde local
 * @returns {Promise<string>} - Chemin du fichier téléchargé
 */
export async function downloadModel(modelUrl, outputPath) {
  logger.info(`Téléchargement modèle: ${modelUrl}`);

  try {
    const response = await fetch(modelUrl);
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    await writeFile(outputPath, Buffer.from(buffer));

    const sizeMB = (buffer.byteLength / (1024 * 1024)).toFixed(2);
    logger.success(`✓ Modèle téléchargé: ${outputPath} (${sizeMB} MB)`);

    return outputPath;
  } catch (error) {
    logger.error(`Erreur téléchargement: ${error.message}`);
    throw error;
  }
}

/**
 * Pipeline complet: génération + attente + téléchargement
 * @param {string} prompt - Description du modèle
 * @param {string} outputPath - Chemin de sauvegarde
 * @param {Object} options - Options de génération
 * @returns {Promise<string>} - Chemin du fichier GLB
 */
export async function generateAndDownload(prompt, outputPath, options = {}) {
  logger.info('━'.repeat(60));
  logger.info('🎨 MESHY.AI - Génération 3D');
  logger.info('━'.repeat(60));

  // 1. Créer la tâche de génération
  const { taskId } = await generateModel(prompt, options);

  // 2. Attendre la fin
  const result = await waitForCompletion(taskId, options.maxWaitSeconds || 180);

  // 3. Télécharger le modèle
  const glbPath = await downloadModel(result.modelUrl, outputPath);

  logger.info('━'.repeat(60));
  logger.success('✨ Modèle 3D prêt !');
  logger.info(`📦 Fichier: ${glbPath}`);
  logger.info(`🖼️  Preview: ${result.thumbnailUrl}`);
  logger.info('━'.repeat(60));

  return glbPath;
}

export default {
  generateModel,
  checkTaskStatus,
  waitForCompletion,
  downloadModel,
  generateAndDownload,
};
