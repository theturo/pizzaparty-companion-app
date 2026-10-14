#!/bin/sh
# Emulatori Firebase in locale con un progetto "demo-": nessun accesso al progetto reale, nessun login.
#   sh scripts/emulatori.sh         → avvia gli emulatori (npm run emulatori)
#   sh scripts/emulatori.sh test    → avvia Firestore e Storage, lancia i test delle regole e chiude
#                                     (npm run test:regole)
# Java: se non è installato nel sistema, usa la JDK estratta in ~/.jdks (vedi README).
set -e

# Su macOS /usr/bin/java esiste sempre ma senza JDK fallisce: si controlla che funzioni davvero.
if ! java -version >/dev/null 2>&1; then
  for jdk in "$HOME"/.jdks/*/Contents/Home "$HOME"/.jdks/*; do
    if [ -x "$jdk/bin/java" ]; then
      export JAVA_HOME="$jdk"
      export PATH="$JAVA_HOME/bin:$PATH"
      break
    fi
  done
fi

if [ "$1" = "test" ]; then
  exec npx firebase emulators:exec --only firestore,storage --project demo-pizzaparty \
    "npx vitest run --config tests/vitest.config.ts"
fi
exec npx firebase emulators:start --project demo-pizzaparty "$@"
