#!/bin/bash
# Renders every view in every mood. Usage: render-all.sh <python-with-bpy> <home.glb> <out_dir> [width] [samples]
PY=$1; GLB=$2; OUT=$3; W=${4:-1600}; SM=${5:-96}
HERE=$(cd "$(dirname "$0")" && pwd)
for mood in dusk day night; do
  for cam in cam_hero cam_corner cam_close; do
    "$PY" "$HERE/render.py" "$GLB" "$OUT" "$mood" "$cam" "$W" "$SM" 2>&1 | grep -E "written|Error" 
  done
done
echo ALL DONE
