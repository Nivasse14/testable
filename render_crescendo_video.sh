#!/bin/bash
# Render audio-driven video with Meshy level

set -e

AUDIO="audio/leo_10s.mp3"
GLB="assets/leo_10s_crescendo_level.glb"
ANALYSIS="/tmp/leo_10s_analysis.json"
FRAMES_DIR="frames/leo_10s_crescendo"
OUTPUT="output/leo_10s_crescendo_v0.mp4"

# Create frames directory
mkdir -p "$FRAMES_DIR"
mkdir -p "output"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🎬 AUDIO-DRIVEN VIDEO RENDER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Audio: $AUDIO"
echo "  Level: $GLB"
echo "  Output: $OUTPUT"
echo ""

# Ensure analysis exists
if [ ! -f "$ANALYSIS" ]; then
    echo "❌ Audio analysis not found: $ANALYSIS"
    echo "Run: python3 src/audio/analyzeAudio.py $AUDIO --output $ANALYSIS"
    exit 1
fi

# Get duration
DURATION=$(cat "$ANALYSIS" | python3 -c "import json,sys; print(json.load(sys.stdin)['duration'])")
TOTAL_FRAMES=$(echo "$DURATION * 30" | bc | cut -d. -f1)

echo "  Duration: ${DURATION}s"
echo "  Frames: $TOTAL_FRAMES"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Render all frames with Blender
echo "📹 Step 1/2: Rendering frames with Blender..."
echo ""

blender -b -P render_audio_driven_batch.py -- \
    --glb "$GLB" \
    --analysis "$ANALYSIS" \
    --output "$FRAMES_DIR" \
    --fps 30

echo ""
echo "✓ Frames rendered"
echo ""

# Step 2: Encode video with FFmpeg
echo "🎞️  Step 2/2: Encoding video..."
echo ""

ffmpeg -y \
    -framerate 30 \
    -pattern_type glob \
    -i "$FRAMES_DIR/*.png" \
    -i "$AUDIO" \
    -c:v libx264 \
    -preset medium \
    -crf 23 \
    -pix_fmt yuv420p \
    -c:a aac \
    -b:a 192k \
    -shortest \
    "$OUTPUT" \
    2>&1 | grep -E "frame=|Duration|time=|Output" || true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✨ VIDEO READY: $OUTPUT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Show file info
ls -lh "$OUTPUT"
echo ""
echo "▶️  Play: open $OUTPUT"
echo ""
