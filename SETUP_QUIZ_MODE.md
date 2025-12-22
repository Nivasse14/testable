# 🎵 Quiz Xylophone Mode - Setup Complet

## ✅ Installation Réussie

### 1. Python 3.11 Environment (pyenv)

```bash
# Installé via Homebrew
brew install pyenv pyenv-virtualenv

# Configuration shell
echo 'eval "$(pyenv init -)"' >> ~/.zshrc
echo 'eval "$(pyenv virtualenv-init -)"' >> ~/.zshrc
source ~/.zshrc

# Installation Python 3.11.10
pyenv install 3.11.10
pyenv virtualenv 3.11.10 bubbles-quiz
pyenv local bubbles-quiz  # Active automatiquement dans ce dossier
```

### 2. Dependencies Python

```bash
# NumPy 1.x (requis pour TensorFlow 2.14)
pip install "numpy<2"

# TensorFlow 2.14 + basic-pitch
pip install tensorflow-macos==2.14.0 basic-pitch librosa

# Vérification
/Users/mounissamynivasse/.pyenv/versions/bubbles-quiz/bin/basic-pitch --version
```

### 3. FluidSynth + Soundfont

```bash
# Installation FluidSynth
brew install fluidsynth

# Téléchargement soundfont (142MB)
mkdir -p soundfonts
wget https://keymusician01.s3.amazonaws.com/FluidR3_GM.zip -O soundfonts/FluidR3_GM.zip
unzip soundfonts/FluidR3_GM.zip -d soundfonts/
rm soundfonts/FluidR3_GM.zip
```

### 4. Node.js Dependencies

```bash
npm install --save midi-parser-js
```

## 🎯 Utilisation

### Mode Quiz

```bash
# Configuration .env
MODE=quiz_xylophone
DIFFICULTY=medium  # easy | medium | hard

# Génération vidéo
node src/index.js audio/votre_audio.mp3
```

### Test Pipeline (sans rendu Blender)

```bash
node test-quiz.js audio/leo_10s.mp3 medium
```

## 🏗️ Architecture Quiz Mode

### 1. **extractMidi.js** (Audio → MIDI)
- Utilise `basic-pitch` (ML-based pitch detection)
- Détecte automatiquement le chemin Python 3.11
- Cache les résultats MIDI

### 2. **parseMidi.js** (MIDI → Notes)
- Parse avec `midi-parser-js`
- Extrait: temps, pitch, durée, vélocité
- Gère tempo et time signature

### 3. **simplifyMelody.js** (Notes → Mélodie mono)
- Extraction monophonique (note la plus haute)
- 3 difficultés:
  - **easy**: quantize 1/4, transpose +19
  - **medium**: quantize 1/8, transpose +12
  - **hard**: pas de quantize, transpose +7

### 4. **chooseHook.js** (Sélection segment 7-9s)
- Score par segment:
  - Densité (35%)
  - Variété pitch (30%)
  - Énergie velocity (20%)
  - Continuité (15%)

### 5. **renderXylophone.js** (Notes → WAV xylophone)
- Génère MIDI transposé
- Rendu avec FluidSynth
- Patch MIDI 13 (Xylophone)

### 6. **generateLevelFromNotes.js** (Notes → 3D Level)
- Mapping:
  - **Pitch (48-84)** → Hauteur Y (1-6m)
  - **Velocity** → Intensité lumineuse
  - **Duration** → Longueur plateforme
  - **Pitch % 12** → Couleur chromatique

### 7. **Rendu 3D Blender**
- Balle suit les notes (Y = pitch)
- Caméra dynamique
- Post-processing (bloom, motion blur)

## 🐛 Troubleshooting

### "basic-pitch non trouvé"
```bash
# Vérifier l'installation
ls /Users/mounissamynivasse/.pyenv/versions/bubbles-quiz/bin/basic-pitch

# Réinstaller si nécessaire
pyenv activate bubbles-quiz
pip install --force-reinstall basic-pitch
```

### "NumPy 2.x incompatibility"
```bash
# Downgrade vers 1.x
pip uninstall -y numpy
pip install "numpy<2"
```

### "TypeError: Unable to convert function return value"
- TensorFlow 2.14 incompatible avec NumPy 2.x
- Solution: NumPy 1.26.4

### "Aucune note disponible pour le hook"
- Audio trop court ou silencieux
- Essayer difficulté "hard" (moins de filtrage)
- Vérifier le MIDI avec: `midicsv data/midi/*.mid`

## 📊 Statistiques Génération

**Pipeline complet (10s audio)**:
- Extraction MIDI: ~8-10s (première fois, puis cache)
- Parsing + Simplification: ~0.01s
- Hook selection: ~0.01s
- Xylophone render: ~2-3s
- Level generation: ~0.01s
- **Rendu Blender 3D: ~3-5 minutes** (300 frames @ 30fps)
- Encoding vidéo: ~5-10s

**Total**: ~3-5 minutes par vidéo 10s

## 🔗 Fichiers Clés

```
src/quiz/
├── extractMidi.js          # basic-pitch wrapper
├── parseMidi.js            # MIDI → notes structurées
├── simplifyMelody.js       # Monophonic + quantize
├── chooseHook.js           # Score segments
├── renderXylophone.js      # FluidSynth integration
└── generateLevelFromNotes.js  # Notes → 3D platforms

src/pipeline.js             # processQuizXylophone()
src/config.js               # CONFIG.quiz settings
.env                        # MODE=quiz_xylophone
```

## 🎨 Exemples de Configuration

### Facile (débutants)
```env
MODE=quiz_xylophone
DIFFICULTY=easy
HOOK_DURATION=9.0
```
- Quantization forte (1/4 beat)
- Transpose +19 (3 octaves)
- Notes espacées, simples

### Difficile (experts)
```env
MODE=quiz_xylophone
DIFFICULTY=hard
HOOK_DURATION=7.0
```
- Pas de quantization
- Transpose +7 (octave)
- Mélodie originale préservée

## 📦 Prochaines Étapes

- [ ] Ajouter mode arpège (accord → notes séparées)
- [ ] Support multi-track MIDI (basse + mélodie)
- [ ] Détection automatique de difficulté selon tempo
- [ ] Export MIDI simplifié (pour analyse)
- [ ] Texte intro animé "Guess the song 🎵"
