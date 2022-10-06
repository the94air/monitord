import { ChannelType, SlashCommandBuilder } from "discord.js";
import { Command } from "../Command";
import db, { Website } from "../db.js";
import controller, { findSiteByName, findMonitorForSite } from "../controller";
import _ from "lodash";

const Refresh: Command = {
  data: new SlashCommandBuilder()
    .setName("refresh")
    .setDescription("Refresh all active monitor sessions"),
  run: async ({ interaction, client }) => {
    db.data?.sites.forEach((site: Website) => {
      if (site.monitorStatus) {
        site.firstRun = true;
        site.hasErrored = false;

        controller.restartMonitoring(site);
      }
    });

    db.write();

    interaction.reply("All site monitors has been restarted!");
  },
};
