import { ChannelType, SlashCommandBuilder } from "discord.js";
import { Command } from "../Command";
import db, { Website } from "../db.js";
import controller, { findSiteByName, findMonitorForSite } from "../controller";
import _ from "lodash";

const Suspend: Command = {
  data: new SlashCommandBuilder()
    .setName("suspend")
    .setDescription("Suspend all active monitor sessions"),
  run: async ({ interaction, client }) => {
    db.data?.sites.forEach((site: Website) => {
      if (site.monitorStatus) {
        controller.stopMonitoring(site.name);
      }
    });

    interaction.reply("All site monitors has been stopped!");
  },
};
