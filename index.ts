import { TMessage } from './types';
import { client } from './src/client';
import controller from './src/controller';

require('dotenv').config()
const PREFIX = process.env.PREFIX || '!';

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  controller.init();
});

client.on('message', (message: TMessage) => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if(controller.middleware(message, command)) {
    message.reply('You will need to setup a channel for logging first!');
    return;
  }

  switch (command) {
    case "ping":
      controller.ping(message, args);
      break;

    case "channel":
      controller.set(message, args);
      break;

    case "list":
      controller.list(message, args);
      break;

    case "new":
      controller.create(message, args);
      break;

    case "mutate":
      controller.modify(message, args);
      break;

    case "start":
      controller.start(message, args);
      break;

    case "status":
      controller.status(message, args);
      break;

    case "stop":
      controller.stop(message, args);
      break;

    case "refresh":
      controller.refresh(message, args);
      break;

    case "suspend":
      controller.suspend(message, args);
      break;

    case "help":
      controller.help(message, args);
      break;

    default:
      controller.help(message, args);
      break;
  }
});

client.login(process.env.TOKEN);
