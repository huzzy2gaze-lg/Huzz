#!/usr/bin/env bash
# Wraps the artifact page the way claude.ai does, with the local stand-in for window.claude.
set -e
D="$(cd "$(dirname "$0")/.." && pwd)/dist-artifact"
cp "$(dirname "$0")/mock-claude.js" $D/mock-claude.js
{ printf '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui}img{max-width:100%%}[hidden]{display:none!important}</style></head><body><script src="mock-claude.js"></script>'; cat $D/orchard-sales.html; printf '</body></html>'; } > $D/_test.html
