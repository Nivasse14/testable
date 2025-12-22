# ⚠️ Mode Quiz Xylophone - Python 3.13 Incompatibilité

## Problème

Python 3.13 est trop récent pour les dépendances audio/ML requises :
- `basic-pitch` nécessite TensorFlow < 2.15 (incompatible Python 3.13)
- `aubio` pas compilé pour Python 3.13 ARM64
- `tensorflow-macos` pas disponible pour Python 3.13

## Solution Recommandée : Python 3.11

### Option 1: Installer Python 3.11 via pyenv

```bash
# Installer pyenv
brew install pyenv

# Installer Python 3.11
pyenv install 3.11.10

# Créer environnement virtuel
pyenv virtualenv 3.11.10 bubbles-quiz
pyenv activate bubbles-quiz

# Installer dépendances
pip install basic-pitch tensorflow==2.14.0 librosa

# Tester
basic-pitch --version
```

### Option 2: Conda (recommandé pour ML)

```bash
# Installer miniconda
brew install --cask miniconda

# Créer environnement
conda create -n bubbles-quiz python=3.11
conda activate bubbles-quiz

# Installer
pip install basic-pitch tensorflow librosa

# Ajouter au PATH du projet
echo 'export PATH="$HOME/miniconda3/envs/bubbles-quiz/bin:$PATH"' >> .envrc
```

### Option 3: Docker (production)

```dockerfile
FROM python:3.11-slim
RUN pip install basic-pitch tensorflow librosa
# ... reste du setup
```

## Alternative Sans MIDI (Mode Normal Seulement)

Le mode normal (bouncing ball avec onsets) fonctionne parfaitement :

```bash
# Mode normal OK avec Python 3.13
MODE=normal node src/index.js audio/track.mp3
```

## Vérification Installation

```bash
# Avec bon environnement Python activé
python3 --version  # Doit afficher 3.11.x
pip list | grep -E "basic-pitch|tensorflow"
basic-pitch --version

# Test extraction MIDI
basic-pitch ./test-output audio/leo_10s.mp3 --save-midi
ls test-output/*.mid
```

## Mise à Jour extractMidi.js

Une fois Python 3.11 configuré, mettre à jour `.env` :

```bash
# .env
PYTHON3_PATH=/Users/USER/.pyenv/versions/3.11.10/bin/python3
# ou
PYTHON3_PATH=$HOME/miniconda3/envs/bubbles-quiz/bin/python3
```

Puis le code cherchera automatiquement basic-pitch dans cet environnement.

---

**Status**: Mode Quiz nécessite Python 3.11. Mode Normal fonctionne avec Python 3.13 ✅
