/**
 * Système de retry avec backoff exponentiel
 */

import Logger from './logger.js';

const logger = new Logger('RETRY');

/**
 * Exécute une fonction avec retry automatique
 * @param {Function} fn - Fonction async à exécuter
 * @param {Object} options - Options de retry
 * @returns {Promise<any>}
 */
export async function retry(fn, options = {}) {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoffFactor = 2,
    onRetry = null,
    retryIf = null,
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Vérifier si on doit retry
      if (retryIf && !retryIf(error)) {
        throw error;
      }

      if (attempt < maxAttempts) {
        const delay = delayMs * Math.pow(backoffFactor, attempt - 1);
        logger.warn(`Tentative ${attempt}/${maxAttempts} échouée, retry dans ${delay}ms`, {
          error: error.message,
        });

        if (onRetry) {
          onRetry(attempt, error);
        }

        await sleep(delay);
      }
    }
  }

  logger.error(`Échec après ${maxAttempts} tentatives`);
  throw lastError;
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default retry;
