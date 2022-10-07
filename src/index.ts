import dotenv from "dotenv";
import controller from "./controller.js";
import { Message, PermissionFlagsBits, PermissionsBitField } from "discord.js";
import fs from "fs";

import { Client, GatewayIntentBits } from "discord.js";
import path from "path";
import { Command } from "./Command.js";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

dotenv.config();

const PREFIX = process.env.PREFIX || "!";

client.on("ready", () => {
  console.log(`Logged in as ${client.user?.tag}!`);
  controller.init(client);
});

const commands: Command[] = [];

client.on("interactionCreate", (interaction) => {
  if (!interaction.isChatInputCommand() || !interaction.inCachedGuild()) return;
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    interaction.reply({
      content: "You do not have permission to use this command",
      ephemeral: true,
    });
    return;
  }

  const command = commands.find(
    (command) => command.data.name === interaction.commandName
  );
  if (!command) {
    interaction.reply(`Command not found`);
    return;
  }

  command.run({ interaction, client });
});

client.login(process.env.TOKEN);

const run = async () => {
  const commandPaths = fs
    .readdirSync(path.join(__dirname, "commands"))
    .filter((x) => x.endsWith(".js"));
  for (const commandPath of commandPaths) {
    const command = await import(`./commands/${commandPath}`);
    commands.push(command.default);
  }
};

run();
