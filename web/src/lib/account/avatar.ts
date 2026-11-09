// Avatar a tema PizzaParty (D-026): dipinti a mano nello stile del dinosauro, in web/static/avatar/<id>.webp
// (192 px, sfondo trasparente: il cerchio colorato lo disegna ImmagineAvatar con il campo sfondo).
// L'id è quello salvato in utenti/{uid}.avatar e deve restare allineato con l'elenco in firebase/firestore.rules.

import { asset } from '$app/paths';

export interface Avatar {
  id: string;
  nome: string;
  sfondo: string;
}

export const AVATAR: readonly Avatar[] = [
  { id: 'margherita', nome: 'Margherita', sfondo: '#5c8a4a' },
  { id: 'diavola', nome: 'Diavola', sfondo: '#2a1a2e' },
  { id: 'fetta', nome: 'Fetta filante', sfondo: '#d24a30' },
  { id: 'peperoncino', nome: 'Peperoncino', sfondo: '#c99a1e' },
  { id: 'basilico', nome: 'Basilico', sfondo: '#c2477f' },
  { id: 'pomodoro', nome: 'Pomodoro', sfondo: '#3d8fb0' },
  { id: 'forno', nome: 'Forno a legna', sfondo: '#1d2b4a' },
  { id: 'chef', nome: 'Pizzaiolo', sfondo: '#ff8a4d' },
  { id: 'pala', nome: 'Pala', sfondo: '#8a5cc2' },
  { id: 'funghi', nome: 'Funghi', sfondo: '#5c8a4a' },
  { id: 'birra', nome: 'Birra', sfondo: '#3d8fb0' },
  { id: 'fiamma', nome: 'Fiamma', sfondo: '#4a2414' },
  { id: 'dinosauro', nome: 'Dinosauro', sfondo: '#e8dcc4' },
];

/** Percorso dell'immagine di un avatar (file statico, anche con un base path diverso). */
export const immagineAvatar = (id: string): string => asset(`/avatar/${id}.webp`);

export const ID_AVATAR = AVATAR.map((a) => a.id);
