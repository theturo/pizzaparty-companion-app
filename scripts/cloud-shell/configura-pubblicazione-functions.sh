#!/bin/bash
# Da lanciare UNA VOLTA in Google Cloud Shell, dopo configura-pubblicazione-regole.sh.
# Prepara la pubblicazione delle Cloud Functions da GitHub Actions, senza chiavi (D-034):
#   1. attiva i servizi Google che le Functions usano (build, esecuzione, eventi del database);
#   2. crea l'account tecnico "github-functions" con i soli permessi per pubblicare le Functions;
#   3. prepara una volta per tutte i permessi degli "agenti" Google che collegano Firestore alle Functions;
#   4. permette ai token GitHub di questa repo (ambiente firebase-produzione) di agire come quell'account.
set -euo pipefail

PROGETTO="pizzaparty-companion"
REPO_ID="1416056972"            # theturo/pizzaparty-companion-app
ACCOUNT="github-functions"
POOL="github"

gcloud config set project "$PROGETTO"
NUMERO=$(gcloud projects describe "$PROGETTO" --format='value(projectNumber)')
EMAIL="$ACCOUNT@$PROGETTO.iam.gserviceaccount.com"
COMPUTE="$NUMERO-compute@developer.gserviceaccount.com"   # account che esegue le Functions
PUBSUB="service-$NUMERO@gcp-sa-pubsub.iam.gserviceaccount.com"

echo "▶ Servizi necessari (può richiedere qualche minuto)"
gcloud services enable cloudfunctions.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com run.googleapis.com eventarc.googleapis.com \
  pubsub.googleapis.com compute.googleapis.com firestore.googleapis.com \
  identitytoolkit.googleapis.com firebaseextensions.googleapis.com cloudbilling.googleapis.com

echo "▶ Account tecnico $EMAIL"
gcloud iam service-accounts describe "$EMAIL" >/dev/null 2>&1 ||
  gcloud iam service-accounts create "$ACCOUNT" --display-name="GitHub Actions: pubblicazione Cloud Functions"

echo "▶ Permessi per pubblicare le Functions (nessun accesso ai dati)"
# datastore.indexAdmin: legge le informazioni sul database (non i documenti) per i trigger di Firestore.
# browser: legge nome e impostazioni del progetto, compresa la fatturazione collegata (piano Blaze).
for RUOLO in roles/cloudfunctions.admin roles/run.admin roles/artifactregistry.admin \
  roles/cloudbuild.builds.editor roles/serviceusage.serviceUsageConsumer \
  roles/firebaseextensions.viewer roles/iam.securityReviewer roles/datastore.indexAdmin roles/browser; do
  gcloud projects add-iam-policy-binding "$PROGETTO" --member="serviceAccount:$EMAIL" \
    --role="$RUOLO" --condition=None --quiet >/dev/null
done
# Può "usare" solo l'account che esegue le Functions e l'account predefinito del progetto
# (Firebase controlla quest'ultimo prima di ogni pubblicazione), non altri.
for ACCOUNT_USATO in "$COMPUTE" "$PROGETTO@appspot.gserviceaccount.com"; do
  gcloud iam service-accounts add-iam-policy-binding "$ACCOUNT_USATO" --role=roles/iam.serviceAccountUser \
    --member="serviceAccount:$EMAIL" --quiet >/dev/null
done

echo "▶ Permessi degli agenti Google (build e collegamento Firestore → Functions)"
gcloud projects add-iam-policy-binding "$PROGETTO" --member="serviceAccount:$COMPUTE" \
  --role=roles/cloudbuild.builds.builder --condition=None --quiet >/dev/null
for RUOLO in roles/run.invoker roles/eventarc.eventReceiver; do
  gcloud projects add-iam-policy-binding "$PROGETTO" --member="serviceAccount:$COMPUTE" \
    --role="$RUOLO" --condition=None --quiet >/dev/null
done
gcloud beta services identity create --service=pubsub.googleapis.com --project="$PROGETTO" >/dev/null 2>&1 || true
gcloud projects add-iam-policy-binding "$PROGETTO" --member="serviceAccount:$PUBSUB" \
  --role=roles/iam.serviceAccountTokenCreator --condition=None --quiet >/dev/null

echo "▶ Accesso da GitHub (stesso pool e stesso ambiente delle regole)"
gcloud iam service-accounts add-iam-policy-binding "$EMAIL" --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/$NUMERO/locations/global/workloadIdentityPools/$POOL/attribute.repository_id/$REPO_ID" \
  --quiet >/dev/null

echo
echo "✅ Fatto. Il workflow .github/workflows/functions.yml usa: $EMAIL"
