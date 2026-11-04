#!/bin/bash
# mixel.sh <tag> <outfile>  — places 4 trimmed lines on cues, ducks music, muxes onto video
tag=$1; out=$2
V=/home/user/Huzz/ads/margalla-orchards/video/WH-Margalla-Sunrise_EN_Video-9x16_Reels-Status_no-audio.mp4
M=/tmp/claude-0/-home-user-Huzz/7d7c7b96-75f0-58f0-aa68-28f3b25109a4/scratchpad/tts/music.wav
C=(400 3700 6850 9800)
ffmpeg -v error -y -i $V -i ${tag}_0.wav -i ${tag}_1.wav -i ${tag}_2.wav -i ${tag}_3.wav -i $M -filter_complex "\
[1:a]aresample=48000,adelay=${C[0]}:all=1[l0];[2:a]aresample=48000,adelay=${C[1]}:all=1[l1];\
[3:a]aresample=48000,adelay=${C[2]}:all=1[l2];[4:a]aresample=48000,adelay=${C[3]}:all=1[l3];\
[l0][l1][l2][l3]amix=inputs=4:normalize=0,apad=whole_dur=15,highpass=f=80,acompressor=threshold=-18dB:ratio=2.5:attack=5:release=150:makeup=2,asplit=2[vo][sc];\
[5:a]aresample=48000,volume=0.30[mu];[mu][sc]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=400[duck];\
[vo][duck]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=9,aresample=48000,pan=stereo|c0=c0|c1=c0[a]" \
-map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -t 15 -movflags +faststart "$out"
