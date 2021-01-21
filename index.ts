import dotenv from 'dotenv';
import { TMessage } from './types';
import client from './src/client';
import controller from './src/controller';

dotenv.config();

const PREFIX = process.env.PREFIX || '!';

client.on('ready', () => {
  // eslint-disable-next-line no-console
  console.log(`Logged in as ${client.user?.tag}!`);
  controller.init();
});

client.on('message', (message: TMessage) => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;

  const args: Array<string> = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift()?.toLowerCase() || '';

  if (!message.member.hasPermission('ADMINISTRATOR')) {
    message.react('😏');
    return;
  }

  if (controller.middleware(message, command)) {
    message.channel.send('You will need to setup a channel for logging first!');
    return;
  }

  switch (command) {
    case 'ping':
      controller.ping(message);
      break;

    case 'channel':
      controller.set(message, args);
      break;

    case 'list':
      controller.list(message);
      break;

    case 'new':
      controller.create(message, args);
      break;

    case 'remove':
      controller.delete(message, args);
      break;

    case 'mutate':
      controller.modify(message, args);
      break;

    case 'start':
      controller.start(message, args);
      break;

    case 'status':
      controller.status(message, args);
      break;

    case 'stop':
      controller.stop(message, args);
      break;

    case 'refresh':
      controller.refresh(message);
      break;

    case 'suspend':
      controller.suspend(message);
      break;

    case 'help':
      controller.help(message);
      break;

    default:
      controller.help(message);
      break;
  }
});

client.login(process.env.TOKEN);
