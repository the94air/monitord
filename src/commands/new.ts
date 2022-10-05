import { ChannelType, SlashCommandBuilder } from "discord.js";
import { Command } from "../Command";
import db, { Website } from "../db.js";
import { findSiteByName } from "../controller";

const New: Command = {
  data: new SlashCommandBuilder()
    .setName("new")
    .setDescription("Create a new website to monitor")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("name of the site")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("url")
        .setDescription("URL of the site to monitor")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("interval")
        .setDescription("Interval (in minutes) of checking the status")
        .setMinValue(0)
    )
    .addIntegerOption((option) =>
      option
        .setName("status")
        .setDescription("Status code to expect")
        .setRequired(false)
    ),
  run: async ({ interaction, client }) => {
    const name = interaction.options.getString("name", true);
    const url = interaction.options.getString("url", true);
    const interval = interaction.options.getInteger("interval", false) ?? 5;
    const statusCode = interaction.options.getInteger("status", false) ?? 200;

    if (!db.data) return interaction.reply("JSON data failed to initialize");

    const site = findSiteByName(name);
    if (site) return interaction.reply(`Site ${name} already exists!`);

    db.data.sites.push({
      id: db.data.increment.sites,
      name,
      url,
      interval: interval.toString(),
      statusCode: statusCode.toString(),
      monitorStatus: false,
      firstRun: true,
      hasErrored: false,
    });

    db.data.increment.sites++;

    db.write();

    return interaction.reply(`Site ${name} has been created!`);
  },
};
