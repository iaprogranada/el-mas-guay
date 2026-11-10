// Lo que el servidor envía al navegador. Nunca incluye el email ni la clave de nadie.

export interface Card {
  id: string;
  name: string;
  photo: string | null;
  emoji: string | null;
  hue: number;
  times: number; // veces que ha sido el nº 1
}

export interface Player extends Card {
  link: string | null;
  crownedAt: string; // la última vez que subió al nº 1
  lastReignMs: number; // lo que duró su último reinado
}

export interface Row extends Player {
  pos: number;
}

export interface FeedItem {
  id: number;
  at: string;
  ms: number | null; // lo que reinó el destronado
  w: Card; // quien subió
  l: Card | null; // a quien le quitó el trono
}

export interface Snapshot {
  now: string;
  version: number; // id de la última coronación
  total: number;
  today: number;
  page: number;
  lastPage: number;
  king: Player | null;
  kingPrev: { name: string; ms: number | null } | null;
  rows: Row[];
  feed: FeedItem[];
  fame: {
    record: (Card & { ms: number }) | null;
    most: Card | null;
    shortest: (Card & { ms: number }) | null;
  };
  pique: { a: Card; b: Card } | null;
}

export interface Me extends Player {
  pos: number;
  total: number;
  credits: number;
}

export interface SearchHit extends Card {
  pos: number;
}

export const EMPTY_SNAPSHOT: Snapshot = {
  now: new Date(0).toISOString(),
  version: 0,
  total: 0,
  today: 0,
  page: 1,
  lastPage: 1,
  king: null,
  kingPrev: null,
  rows: [],
  feed: [],
  fame: { record: null, most: null, shortest: null },
  pique: null,
};
