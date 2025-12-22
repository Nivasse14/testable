# 🎵 Mode Quiz Xylophone - Guide d'Installation et Test

## Installation Complète des Dépendances

### 1. basic-pitch (Audio → MIDI)
```bash
pip3 install basic-pitch

# Vérifier
basic-pitch --version
```

### 2. FluidSynth (MIDI → WAV)
```bash
# macOS
brew install fluidsynth

# Linux
sudo apt install fluidsynth

# Vérifier
fluidsynth --version
```

### 3. Soundfont Xylophone
```bash
# Créer dossier
mkdir -p soundfonts
cd soundfonts

# Télécharger FluidR3_GM
wget https://keymusician01.s3.amazonaws.com/FluidR3_GM.zip
unzip FluidR3_GM.zip

# Ou alternative
wget https://github.com/urish/cinto/raw/master/media/FluidR3 GM.sf2
mv "FluidR3 GM.sf2" FluidR3_GM.sf2

cd ..
```

### 4. Configurer .env
```bash
# Ajouter à .env
MODE=quiz_xylophone
DIFFICULTY=medium
SOUNDFONT_PATH=./soundfonts/FluidR3_GM.sf2
```

---

## Tests Rapides

### Test 1: Pipeline sans rendu (rapide, ~10s)
```bash
node test-quiz.js audio/leo_10s.mp3 medium
```

### Test 2: Full pipeline avec rendu (lent, ~15 min)
```bash
MODE=quiz_xylophone SKIP_RENDER=true node src/index.js audio/leo_10s.mp3 0
```

### Test 3: Les 3 difficultés
```bash
# Easy - Très simplifié, +19 semitones (très aigu)
MODE=quiz_xylophone DIFFICULTY=easy node src/index.js audio/leo_10s.mp3 0

# Medium - Équilibré, +12 semitones (1 octave)
MODE=quiz_xylophone DIFFICULTY=medium node src/index.js audio/leo_10s.mp3 1

# Hard - Précis, +7 semitones (quinte)
MODE=quiz_xylophone DIFFICULTY=hard node src/index.js audio/leo_10s.mp3 2
```

---

## Utilisation Production

### Single Track
```bash
MODE=quiz_xylophone DIFFICULTY=medium node src/index.js audio/ma_chanson.mp3
```

### Batch (tous les fichiers audio/)
```bash
MODE=quiz_xylophone VARIANTS_PER_TRACK=3 node src/index.js --batch
```

### Batch avec 3 difficultés
```bash
# Script pour générer easy/medium/hard
for diff in easy medium hard; do
  MODE=quiz_xylophone DIFFICULTY=$diff VARIANTS_PER_TRACK=2 node src/index.js --batch
done
```

---

## Structure des Outputs

```
output/
├── ma_chanson_quiz/
│   ├── variant_00.mp4  (palette 0)
│   ├── variant_01.mp4  (palette 1)
│   └── variant_02.mp4  (palette 2)
└── ...

data/
├── midi/
│   └── ma_chanson.mid  (cached)
├── xylophone/
│   └── ma_chanson_xylo_v0.wav  (cached)
└── ma_chanson_quiz_level_v0.json  (level metadata)
```

---

## Troubleshooting

### "basic-pitch non trouvé"
```bash
pip3 install --upgrade basic-pitch
python3 -m pip install basic-pitch

# Vérifier PATH
which basic-pitch
```

### "fluidsynth non trouvé"
```bash
# macOS
brew install fluidsynth

# Linux
sudo apt install fluidsynth

# Ajouter au PATH si nécessaire
export PATH="/usr/local/bin:$PATH"
```

### "Soundfont introuvable"
Le système cherche automatiquement dans:
- `/usr/share/sounds/sf2/FluidR3_GM.sf2`
- `/usr/share/soundfonts/FluidR3_GM.sf2`
- `/opt/homebrew/share/sound/sf2/FluidR3_GM.sf2`
- `./soundfonts/FluidR3_GM.sf2`

Ou spécifier manuellement:
```bash
SOUNDFONT_PATH=/chemin/vers/soundfont.sf2 MODE=quiz_xylophone node src/index.js audio/track.mp3
```

### "Pas assez de notes détectées"
- Vérifier qualité audio (MP3 320kbps recommandé)
- Éviter audio avec trop de percussion pure
- Essayer `DIFFICULTY=easy` (moins de filtrage)
- Vérifier que basic-pitch a bien fonctionné: `ls data/midi/`

### Rendu Blender trop lent
```bash
# Tests rapides: réduire qualité
SAMPLES=8 MODE=quiz_xylophone node src/index.js audio/track.mp3

# Skip rendu complètement (test pipeline)
SKIP_RENDER=true MODE=quiz_xylophone node src/index.js audio/track.mp3
```

---

## Exemples de Commandes Complètes

```bash
# Quiz facile, 10 secondes, intro text
MODE=quiz_xylophone DIFFICULTY=easy HOOK_DURATION=10.0 INTRO_TEXT=true \
  node src/index.js audio/hit_song.mp3

# Quiz difficile, sans intro, soundfont custom
MODE=quiz_xylophone DIFFICULTY=hard INTRO_TEXT=false \
  SOUNDFONT_PATH=/custom/xylophone.sf2 \
  node src/index.js audio/track.mp3

# Batch production: 5 variantes par track
MODE=quiz_xylophone VARIANTS_PER_TRACK=5 DIFFICULTY=medium \
  node src/index.js --batch
```

---

## Validation Visuelle

Après génération, vérifier:

1. **Audio xylophone** : `data/xylophone/<track>_xylo_v0.wav`
   - Doit être aigu/cristallin
   - Durée 7-9 secondes

2. **Level JSON** : `data/<track>_quiz_level_v0.json`
   - Vérifier `metadata.notesCount` > 10
   - `hookStart` et `hookEnd` dans les bonnes bornes

3. **Vidéo finale** : `output/<track>_quiz/variant_00.mp4`
   - Durée ~7-9 secondes
   - Rebonds synchronisés avec notes xylophone
   - Hauteur des plateformes varie (pitch mapping)

---

**Prêt pour TikTok viral ! 🚀🎵**
