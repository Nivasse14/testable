# 🎵 Note-by-Note Reveal - Guide Complet

## Concept
Système audio interactif où **chaque collision boule-plateforme déclenche une note MIDI** comme un xylophone géant. L'utilisateur voit la mélodie visuellement (couleurs) mais ne l'entend que progressivement au fur et à mesure des rebonds.

---

## 🎨 Fonctionnalités Implémentées

### 1. **Web Audio API**
- Synthèse audio temps-réel (pas de fichiers audio)
- Oscillateur triangle (son xylophone)
- Enveloppe ADSR (Attack-Decay-Sustain-Release)
- Volume dynamique basé sur la force de l'impact

### 2. **Mapping MIDI → Couleur**
Chaque note MIDI a une couleur unique :
```
C  (Do)  = Rouge     #ff6b6b
C# (Do#) = Orange    #ff8a6b
D  (Ré)  = Orange    #ffa500
D# (Ré#) = Jaune-O   #ffc46b
E  (Mi)  = Jaune     #ffff00
F  (Fa)  = Vert clair #98fb98
F# (Fa#) = Cyan-vert #6bffb4
G  (Sol) = Cyan      #4ecdc4
G# (Sol#)= Bleu clair #6ba3ff
A  (La)  = Bleu roi  #4169e1
A# (La#) = Violet cl. #8a6bff
B  (Si)  = Violet    #9b59b6
```

### 3. **Détection de Collision**
- Event listener `ballBody.addEventListener('collide')`
- Debounce 200ms pour éviter notes multiples
- Calcul vélocité d'impact pour volume dynamique
- Flash lumineux sur plateforme touchée

### 4. **Contrôles Audio**
- **Bouton 🔊 Son ON/OFF** : Toggle activation
- **Volume master** : 50% par défaut
- **Gestion autoplay** : Résume AudioContext automatiquement

---

## 🎯 Stratégie "Guess the Song"

### Format TikTok Viral

#### Phase 1 : Setup (0-3 sec)
```
- Texte overlay : "🤔 DEVINE LA CHANSON !"
- Boule drop sur première plateforme
- Première note joue → intrigue
```

#### Phase 2 : Build-up (3-8 sec)
```
- Mélodie se construit note par note
- Couleurs révèlent le pattern (indices visuels)
- Rythme du zigzag = rythme de la chanson
```

#### Phase 3 : Hook (8-12 sec)
```
- Partie reconnaissable de la mélodie
- Accélération (augmenter vitesse boule)
- Texte : "Tu sais ? 👇 Commente !"
```

#### Phase 4 : Cliffhanger (12-15 sec)
```
- Freeze frame sur dernière note
- Call-to-action : "Réponds en commentaire !"
- Indice final (genre, année, emoji)
```

---

## 🎼 Exemples de Chansons MIDI

### Easy Mode (1M+ streams)
1. **Happy Birthday** - Universel, 8 notes
2. **Twinkle Twinkle** - Comptine, évident
3. **Jingle Bells** - Saisonnier, viral

### Medium Mode (100k-1M)
1. **Tetris Theme** - Gamers adorent
2. **Hedwig's Theme** (Harry Potter) - Iconique
3. **Pirates des Caraïbes** - Mémorable

### Hard Mode (Niches)
1. **Fur Elise** (Beethoven) - Classique
2. **Giorno's Theme** (JoJo) - Anime
3. **Megalovania** (Undertale) - Indie game

### Expert Mode (Trolls)
1. **Rickroll** - Never Gonna Give You Up
2. **Coffin Dance** - Astronomia
3. **Among Us Drip** - Mème 2021

---

## 🛠️ Configuration Technique

### Structure du Code

#### 1. Audio Context Setup
```javascript
const audioContext = new AudioContext();
const masterGain = audioContext.createGain();
masterGain.gain.value = 0.5;
masterGain.connect(audioContext.destination);
```

#### 2. Note Playing Function
```javascript
function playNote(midiNote, duration, velocity) {
  const osc = audioContext.createOscillator();
  osc.type = 'triangle'; // Xylophone sound
  osc.frequency.value = midiToFreq(midiNote);
  
  const noteGain = audioContext.createGain();
  // ADSR envelope
  noteGain.gain.linearRampToValueAtTime(velocity * 0.8, now + 0.01);
  noteGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
  
  osc.connect(noteGain).connect(masterGain);
  osc.start(now);
  osc.stop(now + duration);
}
```

#### 3. Collision Detection
```javascript
ballBody.addEventListener('collide', (event) => {
  const platformIndex = event.body.userData.platformIndex;
  const midiNote = platforms[platformIndex].userData.midiNote;
  const velocity = Math.abs(event.contact.getImpactVelocityAlongNormal()) / 20;
  
  playNote(midiNote, 0.4, velocity);
});
```

#### 4. Platform MIDI Assignment
```javascript
const scale = [60, 62, 64, 65, 67, 69, 71, 72]; // C major
platforms[i].userData.midiNote = scale[i % scale.length];
```

---

## 📱 Optimisations TikTok

### 1. **Texte Overlay** (à ajouter)
```html
<div id="challenge" style="position:absolute; top:20px; text-align:center; width:100%;">
  <div style="font-size:40px; font-weight:bold; color:white; text-shadow:0 0 10px cyan;">
    🤔 DEVINE LA CHANSON !
  </div>
  <div style="font-size:20px; color:#ffff00; margin-top:10px;">
    Indice : Pop 2020 🎤
  </div>
</div>
```

### 2. **Hashtags Viraux**
```
#GuessSong #MusicChallenge #DevineLaMusique 
#ViralChallenge #MusicQuiz #XylophoneBall
#SongGuess #TikTokChallenge #MusicGame
```

### 3. **Caption Template**
```
🎵 Qui devine en PREMIER ? 🏆

Indice 1 : [GENRE] [ANNÉE]
Indice 2 : [ARTISTE INITIALES]
Indice 3 : [EMOJI THÈME]

👇 Commente ta réponse !
Le premier gagne un shoutout 📢

#GuessSong #MusicChallenge
```

### 4. **Series Strategy**
```
Épisode 1/100 : Songs des années 2000
Épisode 2/100 : Disney Classics
Épisode 3/100 : Anime Openings
Épisode 4/100 : Video Game OST
...
```

---

## 🎬 Workflow de Production

### Étape 1 : Choisir la chanson
```bash
# Télécharger MIDI depuis musescore.com ou freemidi.org
wget https://musescore.com/download/song.mid -O song.mid
```

### Étape 2 : Extraire mélodie principale
```bash
# Utiliser src/quiz/simplifyMelody.js
node src/quiz/parseMidi.js song.mid
```

### Étape 3 : Importer dans test_music_ball.html
```javascript
// Remplacer le scale[] dans buildPlatforms()
const melody = [60, 62, 64, 65, 67, 69, 71, 72]; // Your melody
```

### Étape 4 : Ajuster paramètres
- **Velocity X** : Contrôle vitesse de la mélodie
- **Spacing** : Ajuster timing entre notes
- **Zigzag Width** : Pattern visuel

### Étape 5 : Recording
```
Option A : Screen capture (QuickTime, OBS)
Option B : MediaRecorder API (automatique)
Option C : Puppeteer render (web-render/render_web.js)
```

### Étape 6 : Post-production
```bash
# Ajouter texte overlay avec FFmpeg
ffmpeg -i video.mp4 \
  -vf "drawtext=text='DEVINE LA CHANSON':x=(w-text_w)/2:y=50:fontsize=40:fontcolor=white" \
  -c:a copy output.mp4
```

---

## 🚀 Prochaines Améliorations

### Fonctionnalités à Ajouter

1. **Import MIDI File**
   - Bouton "📂 Charger MIDI"
   - Parser avec midi-parser-js
   - Auto-créer plateformes depuis notes

2. **Multiple Sound Presets**
   - Piano (sine wave)
   - Xylophone (triangle) ✅
   - Marimba (sawtooth)
   - Bells (complex harmonics)

3. **Audio Effects**
   - Reverb (ConvolverNode)
   - Delay (DelayNode)
   - Filter sweep (BiquadFilterNode)

4. **Visual Audio Sync**
   - Platform pulse au beat
   - Camera shake sur basse
   - Particle burst sur note haute

5. **Difficulty Modes**
   - Easy : Notes complètes + indices
   - Medium : Notes + couleurs
   - Hard : Silhouettes seulement
   - Expert : Audio inversé

6. **Recording Built-in**
   ```javascript
   const stream = canvas.captureStream(30);
   const recorder = new MediaRecorder(stream);
   recorder.start();
   ```

7. **Share Feature**
   - Export level as JSON
   - QR code pour partage
   - Leaderboard temps de résolution

---

## 🎓 Références Techniques

### Web Audio API
- [MDN Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [ADSR Envelope Tutorial](https://alemangui.github.io/blog/2015/12/26/ramp-to-value.html)

### MIDI
- [MIDI Note Numbers](https://www.inspiredacoustics.com/en/MIDI_note_numbers_and_center_frequencies)
- [MIDI.js Library](https://github.com/mudcube/MIDI.js)

### Physics
- [Cannon.js Docs](https://pmndrs.github.io/cannon-es/)
- [Collision Events](https://github.com/pmndrs/cannon-es/blob/master/examples/collision_events.html)

---

## 📊 Métriques de Succès

### KPIs TikTok
- **Engagement Rate** : >5% (commentaires/vues)
- **Watch Time** : >80% completion
- **Shares** : >2% des vues
- **Comments** : >500 par vidéo

### Contenu Viral Checklist
- ✅ Hook dans les 3 premières secondes
- ✅ Call-to-action clair
- ✅ Challenge accessible (pas trop dur)
- ✅ Variété (facile → difficile)
- ✅ Consistency (1 vidéo/jour min)
- ✅ Engagement replies (répondre commentaires)

---

## 🎉 Test Maintenant !

1. Ouvre `test_music_ball.html`
2. Clique "🔊 Son ON"
3. Drop la boule (▶ Drop)
4. Écoute la mélodie se révéler !
5. Change les notes en mode édition

**La mélodie actuelle** : Gamme C majeur pentatonique (Do-Ré-Mi-Fa-Sol-La-Si-Do)

---

**Prochaine étape** : Importer une vraie chanson MIDI et créer ta première vidéo TikTok viral ! 🚀
