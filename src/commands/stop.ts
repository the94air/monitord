import { ChannelType, SlashCommandBuilder } from "discord.js";
import { Command } from "../Command.js";
import db, { Website } from "../db.js";
import controller, {
  findSiteByName,
  findMonitorForSite,
} from "../controller.js";
import _ from "lodash";

const Stop: Command = {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stop monitoring a website")
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

    controller.stopMonitoring(site.name);

    return interaction.reply(
      `The monitoring for site *${name}* has been stopped`
    );
  },
};

export default Stop;
