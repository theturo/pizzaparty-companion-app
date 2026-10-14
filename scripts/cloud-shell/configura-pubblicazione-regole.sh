#!/bin/bash
# Da lanciare UNA VOLTA in Google Cloud Shell (già autenticata con l'account del progetto).
# Prepara l'accesso senza chiavi di GitHub Actions per pubblicare le regole di Firebase (D-022):
#   1. un account tecnico con i soli permessi su regole e indici (nessun accesso ai dati);
#   2. un "pool di identità" che accetta solo i token di GitHub di questa repo
#      (verificata con il suo ID numerico) e solo nell'ambiente "firebase-produzione";
#   3. il permesso, per quei token, di agire come l'account tecnico.
set -euo pipefail

PROGETTO="pizzaparty-companion"
REPO_ID="1416056972"            # theturo/pizzaparty-companion-app (ID numerico: non cambia se la repo viene rinominata)
AMBIENTE="firebase-produzione"
ACCOUNT="github-regole"
POOL="github"
PROVIDER="github-actions"

gcloud config set project "$PROGETTO"
NUMERO=$(gcloud projects describe "$PROGETTO" --format='value(projectNumber)')
EMAIL="$ACCOUNT@$PROGETTO.iam.gserviceaccount.com"

echo "▶ Servizi necessari"
gcloud services enable iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com \
  firebaserules.googleapis.com firestore.googleapis.com firebasestorage.googleapis.com

echo "▶ Account tecnico $EMAIL"
gcloud iam service-accounts describe "$EMAIL" >/dev/null 2>&1 ||
  gcloud iam service-accounts create "$ACCOUNT" --display-name="GitHub Actions: pubblicazione regole Firebase"

echo "▶ Permessi minimi (regole, indici, lettura dei servizi attivi e del bucket predefinito)"
# firebasestorage.viewer: serve a Firebase per sapere qual è il bucket a cui applicare le regole di Storage
# (legge solo le informazioni sul bucket, non i file).
for RUOLO in roles/firebaserules.admin roles/datastore.indexAdmin roles/serviceusage.serviceUsageConsumer \
  roles/firebasestorage.viewer; do
  gcloud projects add-iam-policy-binding "$PROGETTO" --member="serviceAccount:$EMAIL" \
    --role="$RUOLO" --condition=None --quiet >/dev/null
done

echo "▶ Pool di identità per GitHub"
gcloud iam workload-identity-pools describe "$POOL" --location=global >/dev/null 2>&1 ||
  gcloud iam workload-identity-pools create "$POOL" --location=global --display-name="GitHub"

echo "▶ Collegamento a GitHub, solo per questa repo e questo ambiente"
gcloud iam workload-identity-pools providers describe "$PROVIDER" --location=global \
  --workload-identity-pool="$POOL" >/dev/null 2>&1 ||
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" --location=global \
    --workload-identity-pool="$POOL" --display-name="GitHub Actions" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository_id=assertion.repository_id,attribute.environment=assertion.environment" \
    --attribute-condition="assertion.repository_id == '$REPO_ID' && assertion.environment == '$AMBIENTE'"

echo "▶ Permesso di agire come l'account tecnico"
gcloud iam service-accounts add-iam-policy-binding "$EMAIL" --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/$NUMERO/locations/global/workloadIdentityPools/$POOL/attribute.repository_id/$REPO_ID" \
  --quiet >/dev/null

echo
echo "✅ Fatto. Valori usati dal workflow .github/workflows/regole.yml:"
echo "   workload_identity_provider: projects/$NUMERO/locations/global/workloadIdentityPools/$POOL/providers/$PROVIDER"
echo "   service_account:            $EMAIL"
