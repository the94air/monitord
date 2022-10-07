import { ChannelType, SlashCommandBuilder } from "discord.js";
import { Command } from "../Command.js";
import db, { Website } from "../db.js";
import controller, {
  findSiteByName,
  findMonitorForSite,
} from "../controller.js";
import _ from "lodash";

const Modify: Command = {
  data: new SlashCommandBuilder()
    .setName("modify")
    .setDescription("Modify the monitoring of a website")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("Name of the site")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("newname")
        .setDescription("New name of the site")
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName("interval")
        .setDescription("Status check interval")
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName("code")
        .setDescription("Status check success code")
        .setRequired(false)
    ),
  run: async ({ interaction, client }) => {
    const name = interaction.options.getString("name", true);

    if (!db.data) return interaction.reply("JSON data failed to initialize");

    const site = findSiteByName(name);
    if (!site) return interaction.reply(`Site ${name} does not exist!`);

    const newname = interaction.options.getString("newname", false);
    const interval = interaction.options.getInteger("interval", false);
    const code = interaction.options.getInteger("code", false);

    if (newname) site.name = newname;
    if (interval) site.interval = interval.toString();
    if (code) site.statusCode = code.toString();

    db.write();

    interaction.reply(`Site ${name} has been modified to provided details!`);

    if (findMonitorForSite(site)) {
      controller.stopMonitoring(site.name);

      site.firstRun = true;
      site.hasErrored = false;
      db.write();

      controller.startMonitoring(client, site);

      interaction.followUp(`Monitoring for site ${name} has been restarted!`);
    }
  },
};

export default Modify;
