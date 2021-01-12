import { TMessage } from './types';
// import low from 'lowdb';
// import FileSync from 'lowdb/adapters/FileSync';

const Monitor = require('ping-monitor');

// const adapter = new FileSync('db.json');
// const db = low(adapter);

require('dotenv').config()

const Discord = require('discord.js');
const client = new Discord.Client();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);

  const channel = client.channels.cache.get(process.env.MONITORING_CHANNEL);

  const monitor = new Monitor({
    website: 'http://127.0.0.1:3000',
    title: 'Testing url',
    interval: 1,
    expect: {
      statusCode: 200
    }
  });

  monitor.on('up', function (res: any, state: any) {
    channel.send('Yay!! ' + res.website + ' is up.');
  });

  monitor.on('down', function (res: any) {
    channel.send('Oh Snap!! ' + res.website + ' is down! ' + res.statusMessage);
  });

  monitor.on('stop', function (website: any) {
    channel.send(website + ' monitor has stopped.');
  });

  monitor.on('error', function (error: any) {
    channel.send(error);
  });

  monitor.on('timeout', function (error: any, res: any) {
    channel.send(error);
  });

});

client.on('message', (message: TMessage) => {
  if (!message.content.startsWith(process.env.PREFIX) || message.author.bot) return;

  message.reply('Pong!');
});

client.login(process.env.TOKEN);
