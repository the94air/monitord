import { ChannelType, SlashCommandBuilder } from "discord.js";
import { Command } from "../Command";
import db, { Website } from "../db.js";
import controller, { findSiteByName, findMonitorForSite } from "../controller";
import _ from "lodash";

const List: Command = {
  data: new SlashCommandBuilder()
    .setName("list")
    .setDescription("List all active monitor sessions"),
  run: async ({ interaction, client }) => {
    const sites = db.data?.sites || [];

    if (sites.length === 0) {
      return interaction.reply(
        "There are no registered sites at the moment. You can add a new one!"
      );
    }

    let text =
      "\nID  •  Name Url  •  Interval/minutes  •  Status code  •  Status\n";

    sites.forEach((site: Website) => {
      text += `${site.id}  ${site.name}  <${site.url}>  ${site.interval}  ${
        site.statusCode
      }  ${
        site.monitorStatus
          ? ":green_circle: monitored"
          : ":red_circle: not monitored"
      }\n`;
    });

    return interaction.reply(text);
  },
};
