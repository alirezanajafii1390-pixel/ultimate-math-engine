#!/data/data/com.termux/files/usr/bin/bash
set -e

SRC="resources/icon.png"
RES="android/app/src/main/res"

echo "== Launcher icons (legacy, square) =="
declare -A LEGACY=( [mdpi]=48 [hdpi]=72 [xhdpi]=96 [xxhdpi]=144 [xxxhdpi]=192 )
for d in "${!LEGACY[@]}"; do
  size=${LEGACY[$d]}
  convert "$SRC" -resize "${size}x${size}" "$RES/mipmap-$d/ic_launcher.png"
  convert "$SRC" -resize "${size}x${size}" "$RES/mipmap-$d/ic_launcher_round.png"
  echo "  mipmap-$d -> ${size}x${size}"
done

echo "== Adaptive icon foreground layer (bigger canvas, logo centered/padded) =="
declare -A FORE=( [mdpi]=108 [hdpi]=162 [xhdpi]=216 [xxhdpi]=324 [xxxhdpi]=432 )
for d in "${!FORE[@]}"; do
  size=${FORE[$d]}
  inner=$(( size * 66 / 100 ))
  convert "$SRC" -resize "${inner}x${inner}" -background none -gravity center -extent "${size}x${size}" "$RES/mipmap-$d/ic_launcher_foreground.png"
  echo "  mipmap-$d foreground -> ${size}x${size} (logo at ${inner}x${inner}, padded)"
done

echo "== Splash screens (logo centered on brand dark background) =="
BG="#0a0a0f"
declare -A SPLASH_PORT=( [mdpi]="320x480" [hdpi]="480x800" [xhdpi]="720x1280" [xxhdpi]="960x1600" [xxxhdpi]="1280x1920" )
declare -A SPLASH_LAND=( [mdpi]="480x320" [hdpi]="800x480" [xhdpi]="1280x720" [xxhdpi]="1600x960" [xxxhdpi]="1920x1280" )

for d in "${!SPLASH_PORT[@]}"; do
  wh=${SPLASH_PORT[$d]}
  w=${wh%x*}
  logo=$(( w * 40 / 100 ))
  convert resources/splash.png -resize "${logo}x${logo}" -background "$BG" -gravity center -extent "$wh" "$RES/drawable-port-$d/splash.png"
  echo "  drawable-port-$d -> $wh"
done

for d in "${!SPLASH_LAND[@]}"; do
  wh=${SPLASH_LAND[$d]}
  h=${wh#*x}
  logo=$(( h * 40 / 100 ))
  convert resources/splash.png -resize "${logo}x${logo}" -background "$BG" -gravity center -extent "$wh" "$RES/drawable-land-$d/splash.png"
  echo "  drawable-land-$d -> $wh"
done

# Default (non-density) fallback bucket — used when the device doesn't match any of the above
convert resources/splash.png -resize "384x384" -background "$BG" -gravity center -extent "960x1600" "$RES/drawable/splash.png"
echo "  drawable/splash.png (fallback) -> 960x1600"

echo "== Done =="
