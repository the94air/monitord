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
  guild: any
}

export { TMessage }
