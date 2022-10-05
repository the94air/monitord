import dotenv from "dotenv";
import controller from "./controller.js";
import { Message, PermissionFlagsBits } from "discord.js";

import { Client, GatewayIntentBits } from "discord.js";

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

dotenv.config();

const PREFIX = process.env.PREFIX || "!";

client.on("ready", () => {
  console.log(`Logged in as ${client.user?.tag}!`);
  controller.init();
});

client.on("interactionCreate", (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  // TODO: run command
});

client.on("messageCreate", (message: Message) => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) {
    return;
  }

  const args = message.content.substring(PREFIX.length).trim().split(/ +/);
  const command = args.shift()?.toLowerCase() || "";

  if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
    message.react("😏");
    return;
  }

  if (controller.middleware(message, command)) {
    message.channel.send("You will need to setup a channel for logging first!");
    return;
  }

  switch (command) {
    case "ping":
      controller.ping(message);
      break;

    case "channel":
      controller.set(message, args);
      break;

    case "list":
      controller.list(message);
      break;

    case "new":
      controller.create(message, args);
      break;

    case "remove":
      controller.delete(message, args);
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

    case "restart":
      controller.restart(message, args);
      break;

    case "refresh":
      controller.refresh(message);
      break;

    case "suspend":
      controller.suspend(message);
      break;

    case "help":
      controller.help(message);
      break;

    default:
      controller.help(message);
      break;
  }
});

client.login(process.env.TOKEN);
