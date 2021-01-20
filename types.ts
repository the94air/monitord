interface TContent {
  startsWith: Function,
  slice: Function
}

interface TAuthor {
  bot: string;
}

interface TMessage {
  content: TContent;
  author: TAuthor;
  reply: Function;
  react: Function;
  guild: any;
  member: any;
  channel: any;
}

export { TMessage }
