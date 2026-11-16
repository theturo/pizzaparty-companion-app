// Operazioni sui dati di una persona, condivise da rifiuto, eliminazione e pulizia (D-033, D-035).
import { db, auth } from './comune.js';

/** Raccolte che contengono dati di una persona, indicizzate per uid (più la sottoraccolta dispositivi). */
const DOCUMENTI_PERSONALI = ['utenti', 'profili', 'richieste'] as const;

/**
 * Cancella tutto ciò che riguarda una persona: account di accesso, profilo privato e pubblico,
 * richiesta e codici d'invito. Ogni nuova funzione che salva dati personali va aggiunta qui.
 */
export async function cancellaTuttoDi(uid: string): Promise<void> {
  const [inviti, dispositivi, presenze] = await Promise.all([
    db.collection('inviti').where('proprietario', '==', uid).get(),
    db.collection(`utenti/${uid}/dispositivi`).get(),
    presenzeDi(uid),
  ]);
  const batch = db.batch();
  dispositivi.forEach((d) => batch.delete(d.ref));
  for (const raccolta of DOCUMENTI_PERSONALI) batch.delete(db.doc(`${raccolta}/${uid}`));
  inviti.forEach((invito) => batch.delete(invito.ref));
  presenze.forEach((presenza) => batch.delete(presenza.ref));
  await batch.commit();
  await auth.deleteUser(uid).catch((e: { code?: string }) => {
    if (e.code !== 'auth/user-not-found') throw e;
  });
}

/** Le presenze di una persona alle feste, in tutte le edizioni (D-058): collection group `presenze`. */
function presenzeDi(uid: string) {
  return db.collectionGroup('presenze').where('uid', '==', uid).get();
}

/** Trasforma i valori di Firestore (date, ecc.) in qualcosa di leggibile e serializzabile. */
export function semplifica(valore: unknown): unknown {
  if (valore === null || valore === undefined) return valore ?? null;
  if (typeof (valore as { toDate?: unknown }).toDate === 'function')
    return (valore as { toDate(): Date }).toDate().toISOString();
  if (Array.isArray(valore)) return valore.map(semplifica);
  if (typeof valore === 'object')
    return Object.fromEntries(
      Object.entries(valore as Record<string, unknown>).map(([k, v]) => [k, semplifica(v)]),
    );
  return valore;
}

/** Tutto ciò che l'app conserva su una persona (diritto di accesso e portabilità, D-035). */
export async function raccogliDatiDi(uid: string) {
  const utente = await auth.getUser(uid);
  const [privato, pubblico, richiesta, inviti, dispositivi, presenze] = await Promise.all([
    db.doc(`utenti/${uid}`).get(),
    db.doc(`profili/${uid}`).get(),
    db.doc(`richieste/${uid}`).get(),
    db.collection('inviti').where('proprietario', '==', uid).get(),
    db.collection(`utenti/${uid}/dispositivi`).get(),
    presenzeDi(uid),
  ]);
  // Il nome dell'edizione si legge a parte: la presenza salva solo il riferimento.
  const edizioni = await Promise.all(
    presenze.docs.map((p) => db.doc(`edizioni/${p.ref.parent.parent?.id ?? ''}`).get()),
  );
  return {
    generatoIl: new Date().toISOString(),
    account: {
      uid,
      email: utente.email ?? null,
      emailVerificata: utente.emailVerified,
      creatoIl: utente.metadata.creationTime,
      ultimoAccesso: utente.metadata.lastSignInTime,
      ultimaAttivita: utente.metadata.lastRefreshTime ?? null,
      permessi: utente.customClaims ?? {},
    },
    profilo: privato.exists ? semplifica(privato.data()) : null,
    schedaPubblica: pubblico.exists ? semplifica(pubblico.data()) : null,
    richiestaInAttesa: richiesta.exists ? semplifica(richiesta.data()) : null,
    codiciInvito: inviti.docs.map((d) => ({ codice: d.id, ...(semplifica(d.data()) as object) })),
    presenzeAlleFeste: presenze.docs.map((p, i) => ({
      edizione: {
        id: p.ref.parent.parent?.id ?? null,
        nome: (edizioni[i].get('nome') as string | undefined) ?? null,
      },
      registrata: (semplifica(p.get('registrata')) as string | null) ?? null,
      via: p.get('via') ?? null,
      // Le presenze senza `tipo` sono quelle degli account (prima della 0.19.0). Per l'ospite
      // si mostra anche il nome scritto al check-in (D-067).
      ...(p.get('tipo') === 'ospite' ? { ospite: true, nome: p.get('nome') ?? null } : {}),
    })),
    // Il codice del dispositivo non si mostra per intero: basta riconoscere quali dispositivi sono.
    dispositiviConNotifiche: dispositivi.docs.map((d) => ({
      codice: `${d.id.slice(0, 8)}…`,
      ...(semplifica(d.data()) as object),
    })),
  };
}
