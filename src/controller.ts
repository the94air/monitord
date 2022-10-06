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
};

export default controller;
