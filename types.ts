interface TContent {
  startsWith: Function
}

interface TAuthor {
  bot: string;
}

interface TMessage {
  content: TContent;
  author: TAuthor;
  reply: Function;
}

export { TMessage }
