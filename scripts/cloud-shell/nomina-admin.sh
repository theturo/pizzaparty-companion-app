#!/bin/bash
# Dà il permesso "admin" (D-028, D-034) a un account GIÀ REGISTRATO nell'app.
# Da lanciare in Google Cloud Shell:  bash nomina-admin.sh tua-email@esempio.it
# Usa le credenziali con cui sei entrato in Cloud Shell: nessuna chiave, e l'email non finisce
# nel codice. Dopo, apri l'app, esci e rientra: dal profilo trovi il pannello admin, dove puoi
# approvare anche la tua richiesta.
set -euo pipefail

PROGETTO="pizzaparty-companion"
EMAIL="${1:?Indica l'email dell'account: bash nomina-admin.sh tua-email@esempio.it}"
API="https://identitytoolkit.googleapis.com/v1/projects/$PROGETTO"
TOKEN=$(gcloud auth print-access-token)
INTESTAZIONI=(-H "Authorization: Bearer $TOKEN" -H "x-goog-user-project: $PROGETTO" -H "Content-Type: application/json")

echo "▶ Cerco l'account $EMAIL"
UTENTE=$(curl -sS "${INTESTAZIONI[@]}" -X POST "$API/accounts:lookup" -d "{\"email\": [\"$EMAIL\"]}")
UID_UTENTE=$(echo "$UTENTE" | python3 -c "import json,sys; u=json.load(sys.stdin).get('users',[]); print(u[0]['localId'] if u else '')")
if [ -z "$UID_UTENTE" ]; then
  echo "✗ Nessun account con questa email: registrati prima dall'app."
  exit 1
fi
PERMESSI=$(echo "$UTENTE" | python3 -c "
import json,sys
u=json.load(sys.stdin)['users'][0]
p=json.loads(u.get('customAttributes') or '{}')
p['admin']=True
print(json.dumps(json.dumps(p)))")

echo "▶ Assegno il permesso admin"
curl -sS -o /dev/null -w "%{http_code}\n" "${INTESTAZIONI[@]}" -X POST "$API/accounts:update" \
  -d "{\"localId\": \"$UID_UTENTE\", \"customAttributes\": $PERMESSI}" | grep -q '^200$' ||
  { echo "✗ Permesso non assegnato"; exit 1; }

echo "✅ $EMAIL ora è admin. Nell'app: esci e rientra, poi Profilo → Pannello admin."
