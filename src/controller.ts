import db, { Website } from "./db.js";
import monitors from "./monitor.js";
import _ from "lodash";

import { Monitor, WebProtocolOptions } from "availability-monitor";
import { Message, TextChannel } from "discord.js";
import { client } from "./index.js";
import {
  MonitorHandler,
  MonitorResponse,
} from "availability-monitor/dist/src/protocols";
import { Response } from "got";

const PREFIX = process.env.PREFIX || "!";

export function findSiteByName(name: string) {
  return db.data?.sites.find((site) => site.name === name);
}

export function findSiteByID(id: number) {
  return db.data?.sites.find((site) => site.id === id);
}

export function findMonitorForSite(site: Website) {
  return monitors.find((monitor) =>
    "url" in monitor.protocolOptions
      ? monitor.protocolOptions.url === site.url
      : false
  );
}

const controller = {
  middleware: (message: Message, command: string) => {
    if (command !== "help" && command !== "ping" && command !== "channel") {
      return db.data?.config.channel === null;
    }
    return false;
  },
  init() {
    db.data?.sites?.forEach((site: Website) => {
      if (site.monitorStatus) {
        site.firstRun = true;
        site.hasErrored = false;

        this.startMonitoring(site);
      }
    });

    db.write();
  },
  refresh(message: Message) {
    db.data?.sites.forEach((site: Website) => {
      if (site.monitorStatus) {
        site.firstRun = true;
        site.hasErrored = false;

        this.restartMonitoring(site);
      }
    });

    db.write();

    message.channel.send("All site monitors has been restarted!");
  },
  suspend(message: Message) {
    db.data?.sites.forEach((site: Website) => {
      if (site.monitorStatus) {
        this.stopMonitoring(site.name);
      }
    });

    message.channel.send("All site monitors has been stopped!");
  },
  list(message: Message) {
    const sites = db.data?.sites;

    if (sites === undefined || sites?.length === 0) {
      message.channel.send(
        "There are no registered sites at the moment. You can add a new one!"
      );
      return;
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

    message.channel.send(text);
  },
  monitorHandlers(monitor: Monitor, site: Website) {
    monitor.on("up", (monitor: Monitor, res: MonitorResponse) => {
      if (site.firstRun || site.hasErrored) {
        const id = db.data?.config.channel;
        if (id === undefined) {
          console.error("No id is configured for channel");
          return;
        }

        client.channels.fetch(id!).then((channel) => {
          const dbSite = findSiteByID(site.id);
          const gotResponse = res.data as Response;

          if (!dbSite) {
            (channel as TextChannel).send(
              `Failed to fetch db site for *${gotResponse.url}*`
            );
            return;
          }

          dbSite.firstRun = false;
          dbSite.hasErrored = false;

          db.write();

          (channel as TextChannel).send(
            `The site *${gotResponse.url}* is up! (response code: ${gotResponse.statusCode}) :rocket:`
          );
        });
      }
    });

    monitor.on("down", function (monitor: Monitor, res: MonitorResponse) {
      if (site.firstRun || !site.hasErrored) {
        const gotResponse = res.data as Response;
        const id = db.data?.config.channel;

        client.channels.fetch(id!).then((channel) => {
          const textChannel = channel as TextChannel;
          const dbSite = findSiteByID(site.id);

          if (!dbSite) {
            textChannel.send(
              `Failed to fetch db site for *${gotResponse.url}*`
            );
            return;
          }

          dbSite.firstRun = false;
          dbSite.hasErrored = true;

          db.write();

          textChannel.send(
            `The site *${gotResponse.url}* is down! (response code: ${gotResponse.statusCode}) :fire:`
          );
        });
      }
    });

    monitor.on("error", function (monitor: Monitor, res: MonitorResponse) {
      const gotResponse = res.data as Response;

      if (site.firstRun || !site.hasErrored) {
        const id = db.data?.config.channel;

        client.channels.fetch(id!).then((channel) => {
          const textChannel = channel as TextChannel;
          const dbSite = findSiteByID(site.id);

          if (!dbSite) {
            textChannel.send(
              `Failed to fetch db site for *${gotResponse.url}*`
            );
            return;
          }

          dbSite.firstRun = false;
          dbSite.hasErrored = true;

          db.write();

          textChannel.send(`The site *${gotResponse.url}* is down! :fire:`);
        });
      }
    });

    monitor.on("stop", function (monitor: Monitor, res: MonitorResponse) {
      const options = monitor.protocolOptions as WebProtocolOptions;
      const id = db.data?.config.channel;

      client.channels.fetch(id!).then((channel) => {
        const textChannel = channel as TextChannel;
        textChannel.send(`The site *${options.url}* monitor has stopped!`);
      });
    });

    return monitor;
  },
  startMonitoring(site: Website) {
    const monitor = new Monitor({
      protocol: "web",
      protocolOptions: {
        url: site.url,
        engine: "got",
        httpOptions: {
          timeout: 10000, // 10 Seconds
        },
      },
      interval: Number(site.interval) * 60000,
    });

    this.monitorHandlers(monitor, site);
    monitors.push(monitor);

    site.monitorStatus = true;
    db.write();
  },
  stopMonitoring(name: string) {
    if (!db.data) {
      console.error("Failed to load json data");
      return;
    }

    const site = findSiteByName(name);
    if (!site) {
      console.error(`Failed to find site '${name}'`);
      return;
    }

    const monitor = findMonitorForSite(site);

    if (monitor) {
      monitor.stop();
    }

    monitors.splice(
      monitors.findIndex(
        (monitor) =>
          (monitor.protocolOptions as WebProtocolOptions).url === site.url
      ),
      1
    );

    site.monitorStatus = false;
    db.write();
  },
  restartMonitoring(site: Website) {
    const monitor = monitors.find(
      (monitor) =>
        (monitor.protocolOptions as WebProtocolOptions).url === site.url
    );

    if (monitor) {
      monitor.restart();
    }
  },
  help(message: Message) {
    const help = `\n\`${PREFIX}ping\` • connection latency of the bot.
\`${PREFIX}help\` • Show all commands.
\`${PREFIX}channel CHANNEL_ID\` • for setting the channel log messages.
\`${PREFIX}list\` • listing all the sites.
\`${PREFIX}new NAME SITE_URL INTERVAL_IN_MINUTES STATUS_CODE[optional: default is 200]\` • For creating a site.
\`${PREFIX}remove NAME\` • For removing a site.
\`${PREFIX}mutate NAME SETTING[one of "name", "interval", "statuscode"] NEW_VALUE\` • For modifying the information of a site.
\`${PREFIX}start NAME\` • For staring a monitor session for a site.
\`${PREFIX}status NAME\` • For showing if the site is setup of monitor.
\`${PREFIX}stop NAME\` • For stopping a monitor session.
\`${PREFIX}restart NAME\` • For restarting a monitor session.
\`${PREFIX}refresh\` • For refreshing all active monitor sessions.
\`${PREFIX}suspend\` • For suspending all active monitor sessions.`;
    message.channel.send(help);
  },
};

export default controller;
