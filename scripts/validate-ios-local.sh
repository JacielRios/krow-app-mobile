#!/usr/bin/env bash
set -euo pipefail
if [[ "$(uname -s)" != "Darwin" ]]; then
  echo 'La validación iOS requiere macOS con Xcode. No se ha ejecutado una compilación.' >&2
  exit 2
fi
cd "$(dirname "$0")/../ios"
command -v xcodebuild >/dev/null
bundle exec pod install
mkdir -p ../artifacts/ios
xcodebuild -resolvePackageDependencies -workspace KrownMobileApp.xcworkspace -scheme KrownMobileApp \
  | tee ../artifacts/ios/dependencies.log
xcodebuild -workspace KrownMobileApp.xcworkspace -scheme KrownMobileApp -configuration Debug \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO \
  -derivedDataPath ../artifacts/ios/DerivedData build | tee ../artifacts/ios/build.log
echo 'Compilación de simulador terminada. Dispositivo físico, firma, push y modo avión siguen requiriendo validación.'
