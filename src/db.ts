import low from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync';

const adapter = new FileSync('db.json');
const db: any = low(adapter);

db.defaults({
  sites: [],
  config: {
    channel: null,
  },
  increment: {
    sites: 1,
  },
}).write();

export default db;
