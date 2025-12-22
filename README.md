# 🎬 TikTok 3D Video Generator v2.0

**Système industrialisable de génération automatique de vidéos TikTok 3D ultra-premium, synchronisées avec la musique via Blender.**

Génère des vidéos 3D type "bouncing ball on neon tiles" où chaque rebond est parfaitement synchronisé avec les temps forts de votre musique. Rendu professionnel avec bloom, DOF, motion blur, et caméra cinématique.

**🆕 MODE QUIZ XYLOPHONE** - Transforme n'importe quelle musique en version xylophone aiguë pour des vidéos virales "Guess the song 🎵" !

---

## 🎯 Caractéristiques

### Mode Normal
✅ **Rendu 3D Premium** - Blender EEVEE avec bloom, motion blur, DOF  
✅ **Synchronisation Audio Parfaite** - Analyse BPM, onsets, énergie (librosa)  
✅ **Caméra Cinématique** - Follow automatique avec anticipation  
✅ **10 Palettes Visuelles** - Néon cyberpunk, électrique, feu, matrix...  
✅ **Mode Batch Industriel** - 100+ vidéos automatiquement  

### Mode Quiz Xylophone 🎵 (Legacy)
✅ **Extraction MIDI** - Audio → MIDI via basic-pitch  
✅ **Rendu Xylophone** - Transposition +12/+19 demi-tons, son aiguë viral  
✅ **Hook Intelligent** - Sélection automatique du meilleur segment 7-9s  
✅ **3 Difficultés** - Easy/Medium/Hard (simplification mélodique)  
✅ **Visuels Notes** - Chaque rebond = une note MIDI (pitch → hauteur)  
✅ **Format Viral** - "Guess the song" optimisé TikTok  

### 🆕 Mode MIDI Clean Pipeline (Nouveau)
✅ **Pipeline Professionnel** - Audio → MIDI brut → MIDI propre → Xylophone WAV  
✅ **Nettoyage Automatique** - Polyphonique → Monophonique avec règles PRO  
✅ **Quantification Optionnelle** - Grille 1/16, force réglable  
✅ **Transposition Intelligente** - +12 demi-tons (xylophone aigu)  
✅ **Durées Contrôlées** - Min 110ms, Max 600ms par note  
✅ **Velocities Normalisées** - Plage 70-115 pour son cohérent  
✅ **3 Presets Difficulté** - Easy/Medium/Hard avec paramètres optimisés  
✅ **Hook Auto** - Meilleur segment 7-9s (densité + variance + énergie)  
✅ **MIDI Exportable** - Fichiers MIDI propres réutilisables  
✅ **FluidSynth Render** - WAV xylophone haute qualité (44.1kHz)  

---

## 🚀 Installation

### 1. Prérequis Communs

**Node.js >= 18**
```bash
node --version
```

**Blender >= 3.0**
```bash
# macOS
brew install --cask blender

# Linux
sudo snap install blender --classic

# Windows - Télécharger depuis https://www.blender.org/download/
```

**FFmpeg**
```bash
# macOS
brew install ffmpeg

# Linux
sudo apt install ffmpeg
```

**Python 3 + librosa** (optionnel mais recommandé)
```bash
pip3 install librosa numpy
```

### 2. Prérequis Mode Quiz Xylophone

**basic-pitch** (Audio → MIDI)
```bash
pip3 install basic-pitch
```

**FluidSynth** (MIDI → WAV avec soundfont)
```bash
# macOS
brew install fluidsynth

# Linux
sudo apt install fluidsynth
```

**Soundfont Xylophone** (recommandé)
```bash
mkdir soundfonts
cd soundfonts
wget https://keymusician01.s3.amazonaws.com/FluidR3_GM.zip
unzip FluidR3_GM.zip
```

### 3. Configuration

```bash
# Installation des dépendances Node.js
npm install

# Copier le template
cp .env.example .env

# Éditer et ajuster les chemins
nano .env
```

**.env minimal :**
```bash
BLENDER_PATH=/Applications/Blender.app/Contents/MacOS/Blender
FFMPEG_PATH=/opt/homebrew/bin/ffmpeg
VARIANTS_PER_TRACK=5

# Mode Quiz (optionnel)
MODE=normal
DIFFICULTY=medium
SOUNDFONT_PATH=./soundfonts/FluidR3_GM.sf2
```

---

## 📖 Utilisation

### Mode Normal (Bouncing Ball)

```bash
# Single track
node src/index.js audio/ma_musique.mp3
node src/index.js audio/ma_musique.mp3 3  # Variante 3

# Mode Batch
node src/index.js --batch
```

### Mode Quiz Xylophone 🎵

```bash
# Single track - Difficulté medium (défaut)
MODE=quiz_xylophone node src/index.js audio/ma_musique.mp3

# Choisir la difficulté
MODE=quiz_xylophone DIFFICULTY=easy node src/index.js audio/song.mp3
MODE=quiz_xylophone DIFFICULTY=hard node src/index.js audio/song.mp3

# Quiz xylophone (mode legacy, compatible ancien système)
MODE=quiz_xylophone DIFFICULTY=medium node src/index.js audio/leo_10s.mp3

# 🆕 MIDI Clean Pipeline (nouveau système professionnel)
MODE=midi_clean node src/index.js audio/leo.mp3

# MIDI Clean avec preset difficulté
MODE=midi_clean DIFFICULTY=easy node src/index.js audio/song.mp3

# MIDI Clean personnalisé (sans preset)
MODE=midi_clean TRANSPOSE_SEMITONES=12 ENABLE_QUANTIZE=true node src/index.js audio/track.mp3

# Batch MIDI Clean
MODE=midi_clean DIFFICULTY=medium node src/index.js --batch
```

**Exemples Mode MIDI Clean :**
```bash
# Easy preset - notes longues, quantize fort, hook 7s
MODE=midi_clean DIFFICULTY=easy node src/index.js audio/leo.mp3

# Medium preset - équilibré, quantize léger, hook 8s
MODE=midi_clean DIFFICULTY=medium node src/index.js audio/song.mp3

# Hard preset - notes courtes, pas de quantize, hook 9s
MODE=midi_clean DIFFICULTY=hard node src/index.js audio/track.mp3

# Custom - contrôle total des paramètres
MODE=midi_clean \
  TRANSPOSE_SEMITONES=19 \
  MIN_NOTE_MS=90 \
  MAX_NOTE_SEC=0.5 \
  ENABLE_QUANTIZE=true \
  CHOOSE_HOOK=true \
  HOOK_SECONDS=7 \
  node src/index.js audio/file.mp3

# Utiliser un soundfont personnalisé
MODE=midi_clean SOUND_FONT_PATH=./assets/xylophone.sf2 node src/index.js audio/song.mp3
```

**Exemples Quiz Legacy :**
```bash
# Batch quiz (5 variantes par track)
MODE=quiz_xylophone VARIANTS_PER_TRACK=5 node src/index.js --batch

# Personnaliser la durée du hook
MODE=quiz_xylophone HOOK_DURATION=9.0 node src/index.js audio/song.mp3
```

**Exemples complets :**
```bash
# Quiz facile avec intro text
MODE=quiz_xylophone DIFFICULTY=easy INTRO_TEXT=true node src/index.js audio/leo_10s.mp3

# Quiz difficile, hook de 7 secondes
MODE=quiz_xylophone DIFFICULTY=hard HOOK_DURATION=7.0 node src/index.js audio/track.mp3

# Batch production : 10 variantes easy + medium + hard
MODE=quiz_xylophone DIFFICULTY=easy VARIANTS_PER_TRACK=10 node src/index.js --batch
```

---

## ⚙️ Configuration

### Variables d'Environnement (.env)

**Commun**
- `BLENDER_PATH` - Chemin Blender
- `FFMPEG_PATH` - Chemin FFmpeg
- `VARIANTS_PER_TRACK` - Nombre de variantes (batch)
- `FPS` - Images/seconde (30)
- `SAMPLES` - Qualité Blender (8-64, défaut 8)

**Mode Quiz (Legacy)**
- `MODE` - `normal` | `quiz_xylophone` | `midi_clean`
- `DIFFICULTY` - `easy` | `medium` | `hard`
- `HOOK_DURATION` - Durée hook en secondes (7-9, défaut 8.0)
- `INTRO_TEXT` - Afficher "Guess the song" (true/false)
- `INTRO_TEXT_CONTENT` - Texte intro personnalisé
- `SOUNDFONT_PATH` - Chemin soundfont (legacy, auto-détecté si vide)

**Mode MIDI Clean Pipeline (Nouveau)**
- `MODE` - Mettre à `midi_clean`
- `MIDI_WORK_DIR` - Dossier de travail (défaut: `./work`)
- `TRANSPOSE_SEMITONES` - Transposition (+12 = 1 octave, défaut: 12)
- `MIN_NOTE_MS` - Durée minimum par note (défaut: 110ms)
- `MAX_NOTE_SEC` - Durée maximum par note (défaut: 0.6s)
- `VELOCITY_MIN` / `VELOCITY_MAX` - Normalisation velocity (défaut: 70-115)
- `ENABLE_QUANTIZE` - Activer quantize (défaut: false)
- `QUANTIZE_STRENGTH` - Force quantize 0-1 (défaut: 0.8)
- `CHOOSE_HOOK` - Sélectionner meilleur hook (défaut: true)
- `HOOK_SECONDS` - Durée hook (défaut: 8s)
- `SOUND_FONT_PATH` - Soundfont SF2 personnalisé (auto-détecté si vide)
- `MIDI_GAIN` - Gain FluidSynth 0-10 (défaut: 1.0)
- `SAMPLE_RATE` - Fréquence échantillonnage (défaut: 44100)
- `MIDI_INSTRUMENT` - Programme MIDI GM (défaut: 13 = Xylophone)
- `DIFFICULTY` - Preset easy/medium/hard (overrides individuels)

**Presets Difficulté MIDI Clean**
- **Easy** : Notes longues (min 150ms, max 0.8s), quantize fort (0.9), transpose +12, hook 7s
- **Medium** : Équilibré (min 110ms, max 0.6s), quantize léger (0.7), transpose +12, hook 8s
- **Hard** : Notes courtes (min 90ms, max 0.5s), pas de quantize, transpose +19, hook 9s

**Difficultés Quiz Legacy**
- **Easy** : Mélodie simplifiée, quantization 1/4, transpose +19 (très aigu)
- **Medium** : Mélodie top notes, quantization 1/8, transpose +12 (1 octave)
- **Hard** : Notes originales, transpose +7 (quinte), timing précis

Voir `.env.example` pour tous les paramètres.

---

## 🏗️ Architecture

```
src/
├── index.js                  # Point d'entrée
├── config.js                 # Configuration centralisée
├── pipeline.js               # Orchestrateur principal
├── audio/
│   ├── analyzeAudio.py       # Analyse audio (librosa)
│   └── analyzeAudio.node.js  # Wrapper Node.js
├── level/
│   └── generateLevel.js      # Génération level 3D (mode normal)
├── blender/
│   └── render_blender.py     # Script Blender (scène + animation)
├── export/
│   └── encodeVideo.js        # Encodage FFmpeg
├── quiz/                     # 🎵 SYSTÈMES MIDI
│   ├── midiPipeline.js       # 🆕 Pipeline MIDI propre (audioToMelodyMidiAndWav)
│   ├── toolsCheck.js         # Vérification outils (basic-pitch, fluidsynth)
│   ├── runBasicPitch.js      # Wrapper basic-pitch CLI
│   ├── parseMidi.js          # Parse MIDI → notes [{start,end,pitch,velocity}]
│   ├── cleanMelody.js        # 🆕 Nettoyage PRO (polyphonic→monophonic)
│   ├── quantize.js           # Quantification grille temporelle
│   ├── writeMidi.js          # 🆕 Écriture MIDI propre
│   ├── renderXylophone.js    # 🆕 FluidSynth wrapper (MIDI→WAV)
│   ├── chooseHook.js         # Sélection hook intelligent
│   ├── extractMidi.js        # (Legacy) Audio → MIDI basic-pitch
│   ├── simplifyMelody.js     # (Legacy) Simplification easy/medium/hard
│   ├── generateLevelFromNotes.js  # Notes → level 3D
│   └── useProfessionalMidi.js     # Détection MIDI professionnel
└── utils/
    ├── logger.js             # Logs colorés
    ├── retry.js              # Retry logic
    └── fsx.js                # Filesystem utilities
```

---

## 🎹 Mode MIDI Clean Pipeline - Nouveau Système

### Objectif
Pipeline **professionnel et industrialisable** : Audio → MIDI brut → MIDI propre → Xylophone WAV

### Pipeline en 6 Étapes

1. **Vérification Outils** - `toolsCheck()` vérifie basic-pitch, fluidsynth, ffmpeg
2. **Extraction MIDI Brut** - `runBasicPitch()` transcrit audio → `raw.mid`
3. **Parsing Notes** - `parseMidi()` extrait notes avec {start, end, pitch, velocity}
4. **Nettoyage Professionnel** - `cleanMelody()` applique règles PRO
5. **Écriture MIDI Propre** - `writeMidi()` génère `melody_xylophone.mid`
6. **Rendu Xylophone** - `renderXylophone()` via FluidSynth → `xylophone.wav`

### Règles de Nettoyage PRO (cleanMelody)

**Conversion Polyphonique → Monophonique**
- Groupement notes par bins temporels (20ms = tolérance humaine)
- 1 note par bin : priorité pitch haut (mélodie), puis velocity forte
- Suppression notes trop courtes (< 110ms configurable)
- Durée max limitée (0.6s pour xylophone)

**Transformations**
- **Transpose** : +12 demi-tons (1 octave up, xylophone aigu)
- **Velocity normalisée** : Plage 70-115 (son cohérent)
- **Quantification optionnelle** : Grille 1/16, force 0.8
- **Hook intelligent** : Meilleur segment 7-9s (score = densité + variance + énergie)

**Sorties**
- `./work/{track}/raw.mid` - MIDI brut (polyphonique, chaotique)
- `./work/{track}/melody_xylophone.mid` - MIDI propre (monophonique, lisible)
- `./work/{track}/xylophone.wav` - Audio xylophone final

### Différences vs Mode Quiz Legacy

| Aspect | Quiz Legacy | MIDI Clean (Nouveau) |
|--------|-------------|----------------------|
| Architecture | Étapes séparées | Pipeline unifié |
| Nettoyage | simplifyMelody() basique | cleanMelody() règles PRO |
| Écriture MIDI | Via ancien système | writeMidi() dédié |
| FluidSynth | Appel direct | renderXylophone() wrapper |
| Quantize | Non | Optionnel, configurable |
| MIDI exportable | Non | Oui, melody_xylophone.mid |
| Presets difficulté | 3 niveaux fixes | 3 presets + custom full |
| Logs | Basique | Détaillés, 6 étapes |

### Utilisation

```javascript
import { audioToMelodyMidiAndWav } from './src/quiz/midiPipeline.js';

const result = await audioToMelodyMidiAndWav('audio/song.mp3', {
  workDir: './work',
  transposeSemitones: 12,
  minDurationMs: 110,
  maxNoteDurationSec: 0.6,
  enableQuantize: true,
  chooseHook: true,
  hookDurationSec: 8,
  difficulty: 'medium', // ou null pour custom
});

console.log(result.melodyMidiPath); // ./work/song/melody_xylophone.mid
console.log(result.xylophoneWavPath); // ./work/song/xylophone.wav
console.log(result.notesCount); // { raw: 1247, clean: 186 }
```

---

## 🎵 Mode Quiz Xylophone - Détails Techniques (Legacy)

### Pipeline Complet

1. **Extraction MIDI** - `basic-pitch` analyse l'audio et génère un fichier MIDI
2. **Parsing Notes** - Extraction time, pitch, duration, velocity de chaque note
3. **Simplification** - Filtrage selon difficulté (monophonic, quantization, density)
4. **Hook Selection** - Algorithme de scoring sur 7-9s (densité, variété, énergie, continuité)
5. **Rendu Xylophone** - FluidSynth + transposition (+7/+12/+19 demi-tons)
6. **Level 3D** - Mapping notes → plateformes (pitch = hauteur Y, velocity = intensité)
7. **Rendu Blender** - Animation 3D avec caméra follow
8. **Encodage** - FFmpeg merge frames + audio xylophone

### Mapping Visuel Notes → 3D

- **Pitch (hauteur MIDI)** → Position Y (48-84 MIDI = 1-6m hauteur)
- **Velocity** → Intensité du rebond + bloom
- **Duration** → Longueur de la plateforme (notes longues = tiles plus larges)
- **Timing** → Position Z (progression temporelle)
- **Chromatique** → Couleur (12 couleurs pour 12 notes chromatiques)

### Algorithme de Scoring Hook

Le meilleur segment 7-9s est choisi selon :
- **Densité** (35%) : ~5 notes/seconde = optimal
- **Variété Mélodique** (30%) : Range de pitches (2 octaves = parfait)
- **Énergie** (20%) : Velocity moyenne élevée
- **Continuité** (15%) : Peu de silences

---

## 🎨 Exemples d'Outputs

### Mode Normal
```
output/
└── ma_musique/
    ├── variant_00.mp4  (neon_cyberpunk)
    ├── variant_01.mp4  (electric_gold)
    ├── variant_02.mp4  (fire_storm)
    └── ...
```

### Mode Quiz
```
output/
└── ma_musique_quiz/
    ├── variant_00.mp4  (easy, +19 semitones)
    ├── variant_01.mp4  (medium, +12 semitones)
    └── variant_02.mp4  (hard, +7 semitones)
```

**Metadata sauvegardé** dans `data/<track>_quiz_level_v0.json` :
```json
{
  "metadata": {
    "mode": "quiz_xylophone",
    "originalTrackName": "ma_musique",
    "difficulty": "medium",
    "hookStart": 45.2,
    "hookEnd": 53.2,
    "transposeSemitones": 12,
    "hookScore": 0.87,
    "notesCount": 42
  }
}
```

---

## 🔧 Troubleshooting

### basic-pitch non trouvé
```bash
pip3 install basic-pitch
# ou
python3 -m pip install basic-pitch
```

### fluidsynth non trouvé
```bash
# macOS
brew install fluidsynth

# Linux
sudo apt install fluidsynth

# Vérifier
fluidsynth --version
```

### Soundfont introuvable
```bash
# Télécharger FluidR3_GM.sf2
mkdir -p soundfonts
cd soundfonts
wget https://keymusician01.s3.amazonaws.com/FluidR3_GM.zip
unzip FluidR3_GM.zip

# Ou spécifier chemin dans .env
SOUNDFONT_PATH=/chemin/vers/soundfont.sf2
```

### Rendu Blender trop lent
```bash
# Réduire qualité pour tests
SAMPLES=8 node src/index.js audio/track.mp3

# Skip rendu (test pipeline seulement)
SKIP_RENDER=true node src/index.js audio/track.mp3
```

### Pas assez de notes détectées
Le MIDI extraction dépend de la qualité audio. Essayez :
- Audio source de meilleure qualité
- Ajuster `DIFFICULTY=easy` (moins de filtrage)
- Vérifier que l'audio contient des notes claires (pas juste percussions)

---

## 📝 Licence

MIT

---

## 🚀 Roadmap

- [ ] Mode quiz: intro text overlay avec Blender Text objects
- [ ] GPU acceleration (Cycles + OptiX)
- [ ] Résolution adaptive (preview 540p, final 1080p)
- [ ] Mode "Duet" : 2 balls simultanées (mélodie + basse)
- [ ] Export direct TikTok API
- [ ] Web UI (optionnel)

---

**Made with ❤️ by Node.js + Blender + Python**
├── pipeline.js               # Orchestration
├── audio/analyzeAudio.py     # Analyse audio
├── level/generateLevel.js    # Génération level 3D
├── blender/render_blender.py # Rendu Blender
└── export/encodeVideo.js     # Encodage FFmpeg
```

---

## 📊 Performance

| Durée | Samples | Temps |
|-------|---------|-------|
| 30s   | 64      | ~8min |
| 60s   | 64      | ~15min|

---

## 🐛 Dépannage

**Blender introuvable :**
```bash
which blender
# Mettre à jour BLENDER_PATH dans .env
```

**Librosa manquant :**
```bash
pip3 install librosa numpy
```

---

## 📄 Licence

MIT - Usage commercial autorisé

---

**🎬 Bon rendu !**
