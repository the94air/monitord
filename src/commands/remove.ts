import { ChannelType, SlashCommandBuilder } from "discord.js";
import { Command } from "../Command.js";
import db, { Website } from "../db.js";
import controller, {
  findSiteByName,
  findMonitorForSite,
} from "../controller.js";
import _ from "lodash";

const Remove: Command = {
  data: new SlashCommandBuilder()
    .setName("remove")
    .setDescription("Remove a website from monitoring")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("name of the site")
        .setRequired(true)
    ),
  run: async ({ interaction, client }) => {
    const name = interaction.options.getString("name", true);

    if (!db.data) return interaction.reply("JSON data failed to initialize");

    const site = findSiteByName(name);
    if (!site) return interaction.reply(`Site ${name} does not exist!`);

    if (findMonitorForSite(site)) controller.stopMonitoring(name);

    _.remove(db.data.sites, (site) => site.name === name);
    db.write();
    return interaction.reply(
      `The site with the name *${name}* has been removed and any monitoring stopped`
    );
  },
};

export default Remove;
