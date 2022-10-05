import { ChannelType, SlashCommandBuilder } from "discord.js";
import { Command } from "../Command";
import db, { Website } from "../db.js";

const Setchannel: Command = {
  data: new SlashCommandBuilder()
    .setName("setchannel")
    .setDescription("Set the channel that will receive updates about uptime")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The channel to send updates to")
        .addChannelTypes(ChannelType.GuildAnnouncement, ChannelType.GuildText)
        .setRequired(true)
    ),
  run: async ({ interaction, client }) => {
    const apiChannel = interaction.options.getChannel("channel", true);

    if (!db.data) return interaction.reply("JSON data failed to initialize");

    db.data.config.channel = apiChannel.id;
    db.write();

    const channel = await client.channels.fetch(apiChannel.id);
    if (!channel) return interaction.reply("Channel not found");

    if (
      channel.type === ChannelType.GuildText ||
      channel.type === ChannelType.GuildAnnouncement
    ) {
      channel.send(
        "This channel has been set as the channel for uptime updates!"
      );
    }

    return interaction.reply(
      `Success setting <#${apiChannel.id}> as the channel for uptime updates!`
    );
  },
};
