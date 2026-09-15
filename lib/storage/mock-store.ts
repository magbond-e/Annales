import { Matiere, Epreuve, Profil } from '@/types';

// Toutes les données proviennent de la base de données Neon.
// Ce store n'est utilisé qu'en fallback local (dev sans connexion DB).
export const INITIAL_MATIERES: Matiere[] = [];
export const INITIAL_EPREUVES: Epreuve[] = [];
export const INITIAL_PROFILS: Profil[] = [];

// En mémoire globale pour persister entre requêtes en dev
class LocalStore {
  matieres: Matiere[] = [];
  epreuves: Epreuve[] = [];
  profils: Profil[] = [];
}

const globalForMock = globalThis as unknown as { mockStoreInstance?: LocalStore };

export const mockStore = globalForMock.mockStoreInstance || new LocalStore();
if (process.env.NODE_ENV !== 'production') globalForMock.mockStoreInstance = mockStore;
