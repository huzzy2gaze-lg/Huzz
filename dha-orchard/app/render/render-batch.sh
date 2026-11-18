#!/bin/bash
# The second batch: the dusk video of the 1 Kanal home, then the street view of every plot size and style in three moods.
# Usage: render-batch.sh <python-with-bpy> <dir with home-<size>-<style>.glb> <out_dir>
PY=$1; IN=$2; OUT=$3
HERE=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$OUT/video/frames" "$OUT/stills"
# video: 8 seconds, rendered at 12 frames a second (97 frames), smoothed to 24 by ffmpeg
"$PY" "$HERE/render.py" "$IN/home-1K-white.glb" "$OUT/video" dusk orbit 1280 14 96 2>&1 | grep -E "Error|Traceback"
ffmpeg -y -loglevel error -framerate 12 -i "$OUT/video/frames/f_%04d.png" -vf "minterpolate=fps=24:mi_mode=mci:mc_mode=aobmc:vsbmc=1,format=yuv420p" -c:v libx264 -crf 22 -preset slow -movflags +faststart "$OUT/video/home-dusk.mp4" && echo "VIDEO DONE"
for size in 10M 14M 1K; do for style in white brick dark; do
  [ "$size-$style" = "1K-white" ] && continue
  for mood in dusk day night; do
    "$PY" "$HERE/render.py" "$IN/home-$size-$style.glb" "$OUT/stills" "$mood" cam_hero 1280 64 2>&1 | grep -E "Error|Traceback"
    mv "$OUT/stills/$mood-cam_hero.png" "$OUT/stills/$size-$style-$mood.png" && echo "still $size-$style-$mood"
  done
done; done
echo ALL DONE
