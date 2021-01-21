interface TUser {
  tag: string;
}

interface TWs {
  ping: number;
}

interface TGet {
  get: Function;
}

interface TChannels {
  cache: TGet;
}

export interface TClient {
  user: TUser | null;
  ws: TWs;
  channels: TChannels;
  on: Function;
  login: Function;
}

interface TContent {
  startsWith: Function;
  slice: Function;
}

interface TAuthor {
  bot: string;
}

interface TMember {
  hasPermission: Function;
}

interface TChannel {
  send: Function;
}

export interface TMessage {
  content: TContent;
  author: TAuthor;
  createdTimestamp: number;
  member: TMember;
  channel: TChannel;
  react: Function;
}

export interface TSite {
  id: number;
  name: string;
  url: string;
  interval: string;
  statusCode: string;
  monitorStatus: boolean;
  firstRun: boolean;
  hasErrored: boolean;
}

export interface TMonitorInstance {
  on: Function;
  stop: Function;
  restart: Function;
}

export interface TMonitor {
  id: number;
  instance?: TMonitorInstance;
}

export interface TMonitorResponse {
  website: string;
  statusMessage: string;
}
