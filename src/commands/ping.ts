import { SlashCommandBuilder } from "discord.js";
import { Command } from "../Command";

const Ping: Command = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check the ping of the bot"),
  run: async ({ interaction, client }) => {
    return await interaction.reply(
      `🏓 pong! • latency is *${
        Date.now() - interaction.createdTimestamp
      }ms* • API latency is *${Math.round(client.ws.ping)}ms*`
    );
  },
};
