import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Vérifie si un MIDI professionnel existe pour cet audio
 * Cherche dans data/midi/ un .mid avec le même nom
 */
export default async function useProfessionalMidi(audioPath) {
  const audioBasename = path.basename(audioPath, path.extname(audioPath));
  const projectRoot = path.resolve(__dirname, '../..');
  const midiDir = path.join(projectRoot, 'data', 'midi');
  const professionalMidiPath = path.join(midiDir, `${audioBasename}_professional.mid`);

  try {
    await fs.access(professionalMidiPath);
    logger.info(`✨ MIDI professionnel trouvé: ${professionalMidiPath}`);
    return professionalMidiPath;
  } catch {
    logger.info(`ℹ️  Aucun MIDI professionnel trouvé pour ${audioBasename}`);
    logger.info(`   Pour améliorer la qualité, convertis ${audioBasename}.mp3 avec:`);
    logger.info('   • https://www.bearaudiotool.com/audio-to-midi (gratuit, bon)');
    logger.info('   • https://www.lunaverus.com/cgi-bin/trial (AnthemScore)');
    logger.info(`   Puis place le .mid dans: data/midi/${audioBasename}_professional.mid`);
    return null;
  }
}
