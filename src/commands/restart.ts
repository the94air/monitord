import { ChannelType, SlashCommandBuilder } from "discord.js";
import { Command } from "../Command";
import db, { Website } from "../db.js";
import controller, { findSiteByName, findMonitorForSite } from "../controller";
import _ from "lodash";

const Restart: Command = {
  data: new SlashCommandBuilder()
    .setName("restart")
    .setDescription("Restart monitoring for a website")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("Name of the site")
        .setRequired(true)
    ),
  run: async ({ interaction, client }) => {
    const name = interaction.options.getString("name", true);

    if (!db.data) return interaction.reply("JSON data failed to initialize");

    const site = findSiteByName(name);
    if (!site) return interaction.reply(`Site ${name} does not exist!`);

    if (!findMonitorForSite(site)) {
      return interaction.reply(
        `The site with the name *${name}* was not being monitored`
      );
    }

    site.firstRun = true;
    site.hasErrored = false;
    db.write();

    controller.restartMonitoring(site);

    return interaction.reply(
      `The monitoring for site *${name}* has been restarted`
    );
  },
};
