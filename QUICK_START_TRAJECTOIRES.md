# 🎬 Guide Rapide - Trajectoires Temporelles

## ⚡ Quick Start

### 1. Générer depuis audio (RECOMMANDÉ)
```bash
# Analyser l'audio
python3 src/audio/analyzeAudio.py audio/leo_10s.mp3 --output /tmp/audio.json

# Générer la trajectoire synchronisée
node generate_timed_from_json.js /tmp/audio.json data/my_timed.json
```

### 2. Visualiser
```bash
# Démarrer le serveur
python3 -m http.server 8001

# Ouvrir dans le navigateur
open http://localhost:8001/test_timed_trajectory_viewer.html
```

### 3. Utiliser dans le viewer
1. Cliquez **"Load Timed Mode"**
2. Cliquez **"START"**
3. La balle suit précisément les keyframes !

## 📋 Deux Modes

| Mode | Description | Usage |
|------|-------------|-------|
| **physics** | Simulation réaliste | Test, prototypage |
| **keyframes** | Trajectoire précise | Sync audio, export vidéo |

## 🎯 Format JSON

```json
{
  "ball": {
    "trajectoryMode": "keyframes",
    "keyframes": [
      { "time": 0, "position": {x:0, y:20, z:0}, "velocity": {x:0, y:0, z:0} },
      { "time": 500, "position": {x:0, y:18, z:2}, "velocity": {x:0, y:-2, z:1} }
    ]
  }
}
```

## 🛠️ Scripts Disponibles

| Script | Usage |
|--------|-------|
| `generate_zigzag_path.js` | Mode physics manuel |
| `generate_timed_from_json.js` | Sync avec analyse audio |
| `test_timed_trajectory_viewer.html` | Viewer avec timeline |

## 💡 Exemples

**Physics mode (par défaut):**
```bash
node generate_zigzag_path.js data/simple.json
```

**Keyframes depuis audio:**
```bash
python3 src/audio/analyzeAudio.py audio/song.mp3 --output /tmp/song.json
node generate_timed_from_json.js /tmp/song.json data/song_timed.json
```

## ✅ Avantages Keyframes

- ✅ Synchronisation parfaite avec l'audio
- ✅ Reproductible à 100%
- ✅ Contrôle total du timing
- ✅ Export vidéo précis
- ✅ Timeline scrubbing

## 📚 Documentation Complète

Voir `TRAJECTOIRES_TEMPORELLES.md` pour les détails complets.
