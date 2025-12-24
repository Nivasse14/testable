# 🎬 Système de Trajectoires Temporelles

## Vue d'ensemble

Ce système permet de définir **précisément** les positions et vélocités de la balle à des timestamps spécifiques (millisecondes), synchronisés avec de l'audio ou des fichiers MIDI.

## 🎯 Deux Modes de Fonctionnement

### 1. **Mode PHYSICS** (Par défaut)
- Simulation physique réaliste avec Cannon-ES
- La balle rebondit naturellement sur les plateformes
- Gravité, friction, rebonds contrôlés par la physique
- Imprévisible mais réaliste

### 2. **Mode KEYFRAMES** (Synchronisé)
- La balle suit **exactement** une trajectoire prédéfinie
- Positions et vélocités spécifiées à chaque milliseconde clé
- Parfait pour synchroniser avec de l'audio/MIDI
- Reproductible à 100%

## 📁 Structure JSON

### Configuration dans `metadata.config.ball`

```json
{
  "ball": {
    "radius": 0.5,
    "startVelocity": { "x": 0, "y": 0, "z": 0 },
    "trajectoryMode": "keyframes",
    "keyframes": [
      {
        "time": 0,
        "position": { "x": 0, "y": 20.75, "z": 0 },
        "velocity": { "x": 0, "y": 0, "z": 0 }
      },
      {
        "time": 500,
        "position": { "x": 0, "y": 19.0, "z": 1.5 },
        "velocity": { "x": 0, "y": -2, "z": 1 }
      }
    ]
  }
}
```

### Paramètres

- **`trajectoryMode`**: `"physics"` ou `"keyframes"`
- **`keyframes`**: Array de points temporels avec:
  - `time`: Timestamp en **millisecondes**
  - `position`: Coordonnées 3D `{x, y, z}`
  - `velocity`: Vélocité 3D `{x, y, z}` (m/s)

## 🛠️ Génération de Trajectoires

### Option 1: Manuel
Éditez `generate_zigzag_path.js` et ajoutez des keyframes:

```javascript
ball: {
  trajectoryMode: 'keyframes',
  keyframes: [
    { time: 0, position: {x:0, y:20.75, z:0}, velocity: {x:0, y:0, z:0} },
    { time: 300, position: {x:0, y:18.5, z:2}, velocity: {x:0, y:-1.5, z:1.2} }
  ]
}
```

### Option 2: Depuis Analyse Audio (RECOMMANDÉ)

```bash
# 1. Analyser l'audio avec librosa
python3 src/audio/analyzeAudio.py audio/leo_10s.mp3 --output /tmp/audio_analysis.json

# 2. Générer la trajectoire synchronisée
node generate_timed_from_json.js /tmp/audio_analysis.json data/timed_path.json
```

Cette méthode:
- ✅ Lit les **onsets** (moments d'attaque sonore)
- ✅ Calcule automatiquement les keyframes
- ✅ Synchronise la balle pour qu'elle touche chaque plateforme exactement au moment d'un onset
- ✅ Calcule les vélocités pour un mouvement fluide entre plateformes

### Option 3: Depuis MIDI (À venir)

```bash
# Extraire les notes d'un fichier MIDI
node generate_timed_trajectory.js data/midi/song.mid data/timed_path.json
```

## 📊 Interpolation

Le système utilise une **interpolation linéaire** entre les keyframes:

```
Si keyframes: [A à 0ms, B à 1000ms]
Position à 500ms = (A + B) / 2
```

Pour un mouvement plus fluide, ajoutez plus de keyframes intermédiaires.

## 🎮 Utilisation

### 1. Générer le JSON

**Mode Physics (simple):**
```bash
node generate_zigzag_path.js data/my_path.json
```

**Mode Keyframes (synchronisé):**
```bash
python3 src/audio/analyzeAudio.py audio/song.mp3 --output /tmp/song.json
node generate_timed_from_json.js /tmp/song.json data/my_timed_path.json
```

### 2. Visualiser

Ouvrir `test_timed_trajectory_viewer.html`:

```bash
python3 -m http.server 8001
open http://localhost:8001/test_timed_trajectory_viewer.html
```

### 3. Charger et Tester

- Cliquez sur **"Load Physics Mode"** pour `zigzag_path.json` (physique)
- Cliquez sur **"Load Timed Mode"** pour `leo_timed_path.json` (synchronisé)
- Cliquez sur **"▶️ START"** pour lancer

### 4. Contrôles

- **Timeline Slider** (mode keyframes): Naviguer dans le temps
- **Camera Toggle**: Changer la vue (Side / Follow / Orbit)
- **Debug Panel**: Voir position, vitesse, mode en temps réel

## 🎵 Synchronisation Audio

Pour ajouter du son (à implémenter):

```javascript
// Dans le viewer HTML
const audio = new Audio('audio/leo_10s.mp3');
audio.currentTime = elapsedMs / 1000;
audio.play();

// À chaque collision de plateforme:
const synth = new Tone.Synth().toDestination();
synth.triggerAttackRelease(note, "8n");
```

## 📈 Calcul des Vélocités

Pour atteindre une plateforme au bon moment:

```javascript
const timeDelta = nextOnset - currentOnset; // secondes
const positionDelta = nextPos - currentPos;

velocity = positionDelta / timeDelta - 0.5 * gravity * timeDelta;
```

## 🔧 Fichiers Principaux

| Fichier | Description |
|---------|-------------|
| `generate_zigzag_path.js` | Générateur manuel de parcours |
| `generate_timed_from_json.js` | Générateur depuis analyse audio |
| `generate_timed_trajectory.js` | Générateur depuis MIDI (WIP) |
| `test_timed_trajectory_viewer.html` | Viewer avec support keyframes |
| `test_zigzag_viewer.html` | Viewer simple (physics uniquement) |

## 📊 Exemple Complet

### 1. Analyser l'audio
```bash
python3 src/audio/analyzeAudio.py audio/leo_10s.mp3 --output /tmp/leo.json
```

Output:
```
SUCCESS: 28 onsets, 6 beats
```

### 2. Générer la trajectoire
```bash
node generate_timed_from_json.js /tmp/leo.json data/leo_timed.json
```

Output:
```
🎬 Génération de trajectoire temporelle...
📖 Lecture: /tmp/leo.json
🎵 28 onsets trouvés
⏱️  Durée: 10.0s
📦 10 plateformes générées
⏱️  11 keyframes générés
✅ Trajectoire sauvegardée
```

### 3. Visualiser
```bash
open http://localhost:8001/test_timed_trajectory_viewer.html
```

Cliquez sur **"Load Timed Mode"** → **"START"**

La balle touchera chaque plateforme **exactement** au moment des onsets audio !

## 🎯 Cas d'Usage

### Vidéo Musicale
- Synchroniser la balle avec les beats d'une chanson
- Chaque plateforme = une note de musique
- Flash visuel au moment précis du beat

### Tutorial Interactif
- Montrer un parcours prédéfini
- Contrôle précis du timing pour les explications
- Possibilité de pause/replay

### Export Vidéo
- Trajectoire reproductible à 100%
- Rendu frame-par-frame avec Blender
- Audio sync parfait

## 🚀 Prochaines Étapes

1. ✅ **Système de keyframes** - FAIT
2. ✅ **Génération depuis audio** - FAIT
3. 🔄 **Intégration MIDI** - En cours
4. ⏳ **Audio playback dans le viewer**
5. ⏳ **Export vidéo avec Blender**
6. ⏳ **Courbes d'interpolation avancées** (Bézier, ease-in-out)

## 💡 Tips

- **Plus de keyframes** = mouvement plus fluide
- **Moins de keyframes** = fichier plus léger, interpolation plus visible
- Pour un effet "robotique", utilisez des keyframes espacés
- Pour un effet "naturel", ajoutez des keyframes intermédiaires
- Testez en mode **physics** d'abord pour voir le comportement naturel
- Puis créez des **keyframes** pour corriger/synchroniser

## 🐛 Troubleshooting

**La balle ne bouge pas:**
- Vérifiez `trajectoryMode: "keyframes"` dans le JSON
- Vérifiez que `keyframes` contient au moins 2 entrées

**La balle saute:**
- Les keyframes sont trop espacés
- Ajoutez des keyframes intermédiaires

**Pas de synchronisation audio:**
- Les onsets sont extraits correctement ?
- `python3 src/audio/analyzeAudio.py <audio> --output /tmp/test.json`
- Vérifiez les timestamps dans le JSON

**Timeline ne s'affiche pas:**
- Chargez un fichier avec `trajectoryMode: "keyframes"`
- Rafraîchissez la page après avoir chargé

---

**Développé pour bubblesVideos** 🎥
Version 1.0 - Décembre 2024
