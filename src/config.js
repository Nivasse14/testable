/**
 * Configuration centrale du système
 * Charge les variables d'environnement et expose la config
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Chargement manuel du .env (simple parser)
function loadEnv() {
  const envPath = join(__dirname, '..', '.env');
  if (!existsSync(envPath)) {
    return {};
  }

  const env = {};
  const content = readFileSync(envPath, 'utf-8');
  
  content.split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=').trim();
    env[key] = value;
  });

  return env;
}

const env = loadEnv();

// Helper pour récupérer une variable d'env avec fallback
function getEnv(key, defaultValue) {
  return process.env[key] || env[key] || defaultValue;
}

export const CONFIG = {
  // Exécutables
  blender: {
    path: getEnv('BLENDER_PATH', '/Applications/Blender.app/Contents/MacOS/Blender'),
  },
  
  ffmpeg: {
    path: getEnv('FFMPEG_PATH', 'ffmpeg'),
  },

  // Vidéo
  video: {
    fps: parseInt(getEnv('FPS', '30')),
    width: parseInt(getEnv('RESOLUTION_WIDTH', '1080')),
    height: parseInt(getEnv('RESOLUTION_HEIGHT', '1920')),
    codec: 'libx264',
    preset: 'medium',
    crf: 23,
    pixelFormat: 'yuv420p',
  },

  // Audio
  audio: {
    codec: 'aac',
    bitrate: '192k',
    sampleRate: 44100,
  },

  // Rendering Blender
  render: {
    engine: getEnv('RENDER_ENGINE', 'EEVEE'),
    samples: parseInt(getEnv('SAMPLES', '64')),
    motionBlur: getEnv('MOTION_BLUR', 'true') === 'true',
    bloomIntensity: parseFloat(getEnv('BLOOM_INTENSITY', '0.8')),
    useGpu: false, // Désactivé par défaut pour compatibilité
  },

  // Batch
  batch: {
    variantsPerTrack: parseInt(getEnv('VARIANTS_PER_TRACK', '10')),
    parallelJobs: 1, // Séquentiel par défaut (Blender gourmand)
  },

  // Chemins
  paths: {
    audio: getEnv('AUDIO_DIR', './audio'),
    output: getEnv('OUTPUT_DIR', './output'),
    data: getEnv('DATA_DIR', './data'),
    frames: getEnv('FRAMES_DIR', './frames'),
    cache: getEnv('CACHE_DIR', './cache'),
    blenderTemplate: './src/blender/template',
    blenderScript: './src/blender/render_blender.py',
  },

  // Physique 3D
  physics: {
    gravity: 9.8,
    ballRadius: 0.18,
    ballRestitution: 0.92,
    ballFriction: 0.1,
  },

  // Caméra
  camera: {
    followSmooth: 0.12,
    lookAhead: 0.35,
    fov: 50,
    dofAperture: 2.8,
    dofFocusDistance: 5.0,
    shakeIntensity: 0.02,
  },

  // Niveau
  level: {
    platformSpacing: 2.5,
    platformSizeMin: [0.8, 0.1, 0.8],
    platformSizeMax: [2.0, 0.15, 2.0],
    maxPlatforms: 50,
    onsetThreshold: 0.08,  // Seuil adapté à la distribution réelle
    quantizeGrid: 8, // 1/8 de beat
  },

  // Styles visuels
  styles: {
    palettes: [
      {
        name: 'neon_cyberpunk',
        ball: '#FF00FF',
        platforms: ['#00FFFF', '#FF00FF', '#00FF00'],
        background: '#0a0015',
        fog: '#1a0030',
      },
      {
        name: 'electric_gold',
        ball: '#FFD700',
        platforms: ['#00BFFF', '#FFD700', '#FF8C00'],
        background: '#000510',
        fog: '#001530',
      },
      {
        name: 'fire_storm',
        ball: '#FF4500',
        platforms: ['#FF6347', '#FFA500', '#FF1493'],
        background: '#100000',
        fog: '#300000',
      },
      {
        name: 'matrix_green',
        ball: '#00FF00',
        platforms: ['#39FF14', '#00FF00', '#00CC00'],
        background: '#000000',
        fog: '#001a00',
      },
      {
        name: 'purple_haze',
        ball: '#BA55D3',
        platforms: ['#9370DB', '#FFB6C1', '#DA70D6'],
        background: '#0f0010',
        fog: '#1a001a',
      },
      {
        name: 'arctic_blue',
        ball: '#00CED1',
        platforms: ['#87CEEB', '#00CED1', '#4682B4'],
        background: '#000a10',
        fog: '#00152a',
      },
      {
        name: 'sunset_orange',
        ball: '#FF8C00',
        platforms: ['#FF6347', '#FFD700', '#FF4500'],
        background: '#0a0500',
        fog: '#1a0a00',
      },
      {
        name: 'toxic_lime',
        ball: '#ADFF2F',
        platforms: ['#7FFF00', '#ADFF2F', '#32CD32'],
        background: '#050a00',
        fog: '#0a1500',
      },
      {
        name: 'royal_purple',
        ball: '#8A2BE2',
        platforms: ['#9370DB', '#8A2BE2', '#BA55D3'],
        background: '#0a0015',
        fog: '#15002a',
      },
      {
        name: 'ocean_deep',
        ball: '#1E90FF',
        platforms: ['#00BFFF', '#1E90FF', '#4169E1'],
        background: '#000510',
        fog: '#000a1a',
      },
    ],
    bloomStrength: 0.8,
    fogDensity: 0.05,
    glowIntensity: 2.0,
  },

  // Debug
  debug: getEnv('DEBUG', 'false') === 'true',
  skipRender: getEnv('SKIP_RENDER', 'false') === 'true',
  keepFrames: getEnv('KEEP_FRAMES', 'false') === 'true',

  // Mode de génération
  mode: getEnv('MODE', 'normal'), // 'normal' | 'quiz_xylophone' | 'midi_clean'

  // Configuration Quiz Xylophone (legacy, compatible avec ancien système)
  quiz: {
    // Difficulté: easy, medium, hard
    difficulty: getEnv('DIFFICULTY', 'medium'),
    
    // Durée du hook (7-9s)
    hookDuration: parseFloat(getEnv('HOOK_DURATION', '8.0')),
    
    // Transposition par difficulté (en demi-tons)
    transposeSemitones: {
      easy: 19,    // +19 (octave + quinte)
      medium: 12,  // +12 (1 octave)
      hard: 7,     // +7 (quinte juste)
    },
    
    // Intro text (optionnel)
    introText: getEnv('INTRO_TEXT', 'true') === 'true',
    introTextContent: getEnv('INTRO_TEXT_CONTENT', 'Guess the song 🎵'),
    introDuration: parseFloat(getEnv('INTRO_DURATION', '0.4')),
    
    // Chemin soundfont xylophone (optionnel, auto-détecté sinon)
    soundfontPath: getEnv('SOUNDFONT_PATH', null),
  },

  // Configuration Pipeline MIDI (nouveau système propre)
  midiPipeline: {
    // Répertoire de travail
    workDir: getEnv('MIDI_WORK_DIR', './work'),
    
    // Nettoyage mélodie
    transposeSemitones: parseInt(getEnv('TRANSPOSE_SEMITONES', '12')),
    minNoteDurationMs: parseInt(getEnv('MIN_NOTE_MS', '110')),
    maxNoteDurationSec: parseFloat(getEnv('MAX_NOTE_SEC', '0.6')),
    velocityMin: parseInt(getEnv('VELOCITY_MIN', '70')),
    velocityMax: parseInt(getEnv('VELOCITY_MAX', '115')),
    
    // Quantification
    enableQuantize: getEnv('ENABLE_QUANTIZE', 'false') === 'true',
    quantizeStrength: parseFloat(getEnv('QUANTIZE_STRENGTH', '0.8')),
    
    // Hook (extrait court)
    chooseHook: getEnv('CHOOSE_HOOK', 'true') === 'true',
    hookDurationSec: parseFloat(getEnv('HOOK_SECONDS', '8')),
    
    // Rendu audio
    soundfontPath: getEnv('SOUND_FONT_PATH', null),
    gain: parseFloat(getEnv('MIDI_GAIN', '1.0')),
    sampleRate: parseInt(getEnv('SAMPLE_RATE', '44100')),
    instrument: parseInt(getEnv('MIDI_INSTRUMENT', '13')), // 13 = Xylophone
    
    // Difficulté (preset automatique)
    difficulty: getEnv('DIFFICULTY', null), // null = custom, ou 'easy'|'medium'|'hard'
  },
};

export default CONFIG;
