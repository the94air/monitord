import { LowSync, JSONFileSync } from 'lowdb';

export interface Website {
  id: number;
  name: string;
  url: string;
  interval: string;
  statusCode: string;
  monitorStatus: boolean;
  firstRun: boolean;
  hasErrored: boolean;
}

type Data = {
  sites: Array<Website>,
  config: {
    channel: string | null,
  },
  increment: {
    sites: number,
  },
}

const db = new LowSync<Data>(new JSONFileSync<Data>('db.json'));

db.read();

// region default data

if (!db.data) {

  db.data = {
    sites: [],
    config: {
      channel: null,
    },
    increment: {
      sites: 1,
    },
  };

  db.write();
}
// endregion

export default db;
