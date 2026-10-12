#!/bin/sh
# Avvia gli emulatori Firebase in locale con un progetto "demo-":
# nessun accesso al progetto reale, nessun login richiesto.
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
exec npx firebase emulators:start --project demo-pizzaparty "$@"
