# 🎵 Alternatives pour Extraction MIDI Professionnelle

## Problème Actuel
- **basic-pitch** : Bon pour prototypage, mais :
  - Notes manquantes (surtout basses fréquences)
  - Timing imprécis
  - Polyphonie limitée
  - Pas de séparation instruments

## ✅ Solutions Professionnelles

### 1. **AnthemScore** (Meilleur pour qualité)
- **Précision** : 95%+ sur mélodies claires
- **Polyphonie** : Excellent
- **Format** : MusicXML, MIDI, PDF
- **Prix** : $49-99 (licence permanente)
- **Usage** : GUI ou API
```bash
# Installation
brew install --cask anthemscore
```

### 2. **Melodyne** (Studio standard)
- **Précision** : Professionnel (industrie musicale)
- **Édition** : Manuel avancé post-extraction
- **Prix** : €99-699
- **Intégration** : Standalone ou plugin DAW

### 3. **OMNIZART** (Open source, mieux que basic-pitch)
```bash
pip install omnizart
omnizart music transcribe leo.mp3 --output leo_omni.mid
```
- **Avantages** :
  - Multi-instruments
  - Beat tracking
  - Chord recognition
- **Modèles** : Vocal, Piano, Guitar, Drums

### 4. **Spotify Basic-Pitch v2** (API Cloud)
```bash
curl -X POST https://basic-pitch-api.spotify.com/v1/transcribe \
  -F "audio=@leo.mp3" \
  -F "save_midi=true"
```
- Meilleure qualité que la version locale
- Nécessite API key gratuite

### 5. **MT3 (Music Transformer)** - Google
```python
from mt3 import transcribe
midi = transcribe.audio_to_midi('leo.mp3', model='mt3')
```
- État de l'art pour polyphonie
- Très lourd (GPU requis)

## 🎯 Solution Hybride Recommandée

### Option A : Dual-Source
1. **OMNIZART** pour mélodie principale
2. **basic-pitch** pour backup/validation
3. **Merge** les deux MIDI (prendre le meilleur)

### Option B : Pre-processing Audio
```bash
# 1. Isoler mélodie avec Demucs (spleeter)
pip install demucs
demucs leo.mp3 -n mdx_extra

# 2. Extraire MIDI de la piste "vocals" ou "other"
basic-pitch data/midi separated/mdx_extra/leo/vocals.wav --save-midi
```
- **Résultat** : MIDI beaucoup plus propre

### Option C : Post-processing MIDI
```python
# Quantization intelligente
from mido import MidiFile
mid = MidiFile('leo_basic_pitch.mid')

# 1. Snap to grid (1/16)
# 2. Remove notes < 50ms
# 3. Velocity smoothing
# 4. Octave correction
```

## 🚀 Action Immédiate

### Test OMNIZART (5 min)
```bash
pip install omnizart
omnizart music transcribe leo.mp3 --output /tmp/leo_omnizart.mid
fluidsynth -ni -F /tmp/leo_omni_xylo.wav -r 44100 -g 1.0 \
  ./soundfonts/FluidR3_GM.sf2 /tmp/leo_omnizart.mid
afplay /tmp/leo_omni_xylo.wav
```

### Test Demucs + basic-pitch (10 min)
```bash
# Séparer pistes
demucs --two-stems=vocals leo.mp3

# MIDI sur vocal isolé
basic-pitch /tmp separated/htdemucs/leo/vocals.wav --save-midi

# Comparer
fluidsynth ... /tmp/vocals_basic_pitch.mid
```

## 📊 Comparaison Qualité

| Outil | Précision | Vitesse | Polyphonie | Prix |
|-------|-----------|---------|------------|------|
| basic-pitch | 65% | ⚡⚡⚡ | Faible | Free |
| OMNIZART | 78% | ⚡⚡ | Moyenne | Free |
| AnthemScore | 92% | ⚡ | Excellent | $49 |
| Melodyne | 98% | ⚡ | Parfait | €99 |
| Demucs+BP | 75% | ⚡⚡ | Moyenne | Free |

