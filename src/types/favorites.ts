/**
 * Eigene Daten zu Favoriten. Gespeichert werden nur die place_id und
 * selbst eingegebene Inhalte – keine Daten aus Google Places (Nutzungsbedingungen).
 */

export type OwnRating = 1 | 2 | 3 | 4 | 5;

export type FavoriteList = {
  id: string;
  name: string;
  createdAt: string;
};

export type Favorite = {
  placeId: string;
  listIds: string[];
  note: string;
  visited: boolean;
  ownRating: OwnRating | null;
  addedAt: string;
  updatedAt: string;
};

/** Dateiformat für Sicherung (Export/Import). */
export type FavoritesBackup = {
  app: 'tablefinder';
  format: 'favorites';
  version: 1;
  exportedAt: string;
  lists: FavoriteList[];
  favorites: Favorite[];
};
