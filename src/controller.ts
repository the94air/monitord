import db, { Website } from './db.js';
import monitors from './monitor.js';
import _ from 'lodash';

import { Monitor, WebProtocolOptions } from 'availability-monitor';
import { Message, TextChannel } from 'discord.js';
import { client } from './index.js';
import { MonitorResponse } from 'availability-monitor/dist/src/protocols';
import { Response } from 'got';

const PREFIX = process.env.PREFIX || '!';

function findSiteByName(name: string) {
  return db.data?.sites.find(site => site.name === name);
}

function findSiteByID(id: number) {
  return db.data?.sites.find(site => site.id === id);
}

function findMonitorForSite(site: Website) {
  return monitors.find(monitor => 'url' in monitor.protocolOptions ? monitor.protocolOptions.url === site.url : false);
}

const controller = {
  middleware: (message: Message, command: string) => {
    if (command !== 'help' && command !== 'ping' && command !== 'channel') {
      return db.data?.config.channel === null;
    }
    return false;
  },
  ping: (message: Message) => {
    message.channel.send(`🏓 pong! • latency is *${Date.now() - message.createdTimestamp}ms* • API latency is *${Math.round(client.ws.ping)}ms*`);
  },
  set: (message: Message, args: Array<string>) => {
    const id = args[0];
    const channel = client.channels.fetch(id);

    if (!db.data) {
      message.channel.send(`JSON data failed to initialize`);
      return;
    }

    channel
      .then(channel => {

        if (!db.data) {
          message.channel.send(`JSON data failed to initialize`);
          return;
        }

        if (!(channel instanceof TextChannel)) {
          message.channel.send(`Channel isn't a text channel`);
          return;
        }

        db.data.config.channel = id;
        db.write();

        (channel as TextChannel).send("This channel has been configured for logging!");
      })
      .catch(() => {
        message.channel.send('This channel ID is not valid!');
      });

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
  create(message: Message, args: Array<string>) {
    const name = args[0];
    const url = args[1];
    const interval = Number(args[2]);
    const statusCode = Number(args[3]) || 200;

    const site = findSiteByName(name);

    if (site) {
      message.channel.send(`The name *${name}* is already in use. Choose a different name.`);
      return;
    }

    if (!db.data) {
      message.channel.send(`JSON data failed to initialize`);
      return;
    }

    db.data.sites.push({
      id: db.data.increment.sites,
      name,
      url,
      interval: interval.toString(),
      statusCode: statusCode.toString(),
      monitorStatus: false,
      firstRun: true,
      hasErrored: false,
    })

    db.data.increment.sites++

    db.write();

    message.channel.send(`A new site *${name}* has been added!`);
  },
  delete(message: Message, args: Array<string>) {

    const name = args[0];
    const site = findSiteByName(name);

    if (!site) {
      message.channel.send(`The site with the name *${name}* couldn't be found.`);
      return;
    }

    if (!db.data) {
      message.channel.send(`JSON data failed to initialize`);
      return;
    }

    if (findMonitorForSite(site)) {
      this.stopMonitoring(name);
      message.channel.send(`I have stopped monitoring the site *${name}*.`);
    }

    _.remove(db.data.sites, site => site.name === name)
    db.write();

    message.channel.send(`The site with the name *${name}* has been removed.`);
  },
  start(message: Message, args: Array<string>) {

    if (!args[0]) {
      message.channel.send(`Please provide a site name.`);
      return;
    }

    const name = args[0];
    const site = findSiteByName(name);

    if (!site) {
      message.channel.send(`The site with the name *${name}* couldn't be found.`);
      return;
    }

    if (findMonitorForSite(site)) {
      message.channel.send(`The site with the name *${name}* is already been monitored.`);
      return;
    }

    site.firstRun = true;
    site.hasErrored = false;

    db.write();

    this.startMonitoring(site);

    message.channel.send(`I have started monitoring the site *${name}*. I will keep you updated if anything happens.`);
  },
  stop(message: Message, args: Array<string>) {

    const name = args[0];
    const site = findSiteByName(name);

    if (!site) {
      message.channel.send(`The site with the name *${name}* couldn't be found.`);
      return;
    }

    if (!findMonitorForSite(site)) {
      message.channel.send(`The site with the name *${name}* was not being monitored. Check if the entered name is correct.`);
      return;
    }

    this.stopMonitoring(name);

    message.channel.send(`I have stopped monitoring the site *${name}*.`);
  },
  restart(message: Message, args: Array<string>) {

    const name = args[0];
    const site = findSiteByName(name);

    if (!site) {
      message.channel.send(`The site with the name *${name}* couldn't be found.`);
      return;
    }

    if (!findMonitorForSite(site)) {
      message.channel.send(`The site with the name *${name}* was not being monitored.`);
      return;
    }

    site.firstRun = true;
    site.hasErrored = false;

    db.write()

    this.restartMonitoring(site);

    message.channel.send(`I have restarted the site *${name}* monitor.`);
  },
  status(message: Message, args: Array<string>) {

    if (args[0] === undefined) {
      message.channel.send("Please specify a site name.");
      return;
    }

    const name = args[0];
    const site = findSiteByName(name);

    if (!site) {
      message.channel.send(`The site with the name *${name}* couldn't be found.`);
      return;
    }

    if (findMonitorForSite(site)) {
      message.channel.send(`The site with the name *${name}* is under active monitor right now!`);
    } else {
      message.channel.send(`The site with the name *${name}* is **not** monitored.`);
    }
  },
  modify(message: Message, args: Array<string>) {
    const types: Array<string> = ['name', 'interval', 'statuscode'];
    const name = args[0];
    const type = args[1];
    const value = args[2];

    const site = findSiteByName(name);

    if (!site) {
      message.channel.send(`The site with the name *${name}* couldn't be found.`);
      return;
    }
    if (!types.includes(type)) {
      message.channel.send(`While editing the site *${name}*, one of the fields wasn't valid.`);
      return;
    }

    if (type === 'name') {

      site.name = value;
      db.write();

      message.channel.send(`The site *${name}*'s ${type} has been changed to *${value}*`);
      return;
    }

    if (type === 'interval') {

      if (isNaN(Number(value))) {
        message.channel.send(`The value *${value}* is not a valid number`);
        return;
      }

      site.interval = value;
      db.write();
    }

    if (type === 'statuscode') {

      if (isNaN(Number(value))) {
        message.channel.send(`The value *${value}* is not a valid number`);
        return;
      }

      site.statusCode = value;
      db.write();
    }


    if (findMonitorForSite(site)) {

      this.stopMonitoring(name);

      site.firstRun = true;
      site.hasErrored = false;
      db.write();

      this.startMonitoring(site);

      message.channel.send(`The site *${name}*'s ${type} has been changed to ${value}. The site monitor has been restarted!`);
      return;
    }

    message.channel.send(`The site *${name}*'s ${type} has been changed to *${value}*`);
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

    message.channel.send('All site monitors has been restarted!');
  },
  suspend(message: Message) {

    db.data?.sites.forEach((site: Website) => {
      if (site.monitorStatus) {
        this.stopMonitoring(site.name);
      }
    });

    message.channel.send('All site monitors has been stoppped!');
  },
  list(message: Message) {
    const sites = db.data?.sites

    if (sites === undefined || sites?.length === 0) {
      message.channel.send('There are no registered sites at the moment. You can add a new one!');
      return;
    }

    let text = '\nID  •  Name Url  •  Interval/minutes  •  Status code  •  Status\n';

    sites.forEach((site: Website) => {
      text += `${site.id}  ${site.name}  <${site.url}>  ${site.interval}  ${site.statusCode}  ${site.monitorStatus ? ':green_circle: monitored' : ':red_circle: not monitored'}\n`;
    });

    message.channel.send(text);
  },
  monitorHandlers(monitor: Monitor, site: Website) {
    monitor.on('up', (monitor: Monitor, res: MonitorResponse) => {
      if (site.firstRun || site.hasErrored) {

        const id = db.data?.config.channel;
        if (id === undefined) {
          console.error("No id is configured for channel");
          return;
        }

        client.channels.fetch(id!)
          .then(channel => {

            const dbSite = findSiteByID(site.id);
            const gotResponse = (res.data as Response)

            if (!dbSite) {
              (channel as TextChannel).send(`Failed to fetch db site for *${gotResponse.url}*`);
              return
            }

            dbSite.firstRun = false;
            dbSite.hasErrored = false;

            db.write();

            (channel as TextChannel).send(`The site *${gotResponse.url}* is up! (response code: ${gotResponse.statusCode}) :rocket:`);
          })

      }
    });

    monitor.on('down', function (monitor: Monitor, res: MonitorResponse) {
      if (site.firstRun || !site.hasErrored) {

        const gotResponse = (res.data as Response)
        const id = db.data?.config.channel;

        client.channels.fetch(id!).then(channel => {

          const textChannel = channel as TextChannel;
          const dbSite = findSiteByID(site.id);

          if (!dbSite) {
            textChannel.send(`Failed to fetch db site for *${gotResponse.url}*`);
            return
          }

          dbSite.firstRun = false;
          dbSite.hasErrored = true;

          db.write();

          textChannel.send(`The site *${gotResponse.url}* is down! (response code: ${gotResponse.statusCode}) :fire:`);
        })
      }
    });

    monitor.on('error', function (monitor: Monitor, res: MonitorResponse) {
      const gotResponse = (res.data as Response)

      if (site.firstRun || !site.hasErrored) {

        const id = db.data?.config.channel;

        client.channels.fetch(id!).then(channel => {

          const textChannel = channel as TextChannel;
          const dbSite = findSiteByID(site.id);

          if (!dbSite) {
            textChannel.send(`Failed to fetch db site for *${gotResponse.url}*`);
            return
          }

          dbSite.firstRun = false;
          dbSite.hasErrored = true;

          db.write();

          textChannel.send(`The site *${gotResponse.url}* is down! :fire:`);
        })
      }
    });

    monitor.on('stop', function (monitor: Monitor, res: MonitorResponse) {

      const gotResponse = (res.data as Response)
      const id = db.data?.config.channel;

      client.channels.fetch(id!).then(channel => {
        const textChannel = channel as TextChannel;
        textChannel.send(`The site *${gotResponse.url}* monitor has stopped!`);
      });
    });

    return monitor;
  },
  startMonitoring(site: Website) {
    const monitor = new Monitor({
      protocol: 'web',
      protocolOptions: {
        url: site.url,
        engine: 'got',
        httpOptions: {
          timeout: 10000, // 10 Seconds
        },
      },
      interval: Number(site.interval)
    });

    this.monitorHandlers(monitor, site);
    monitors.push(monitor);

    site.monitorStatus = true;
    db.write()
  },
  stopMonitoring(name: string) {

    if (!db.data) {
      console.error("Failed to load json data");
      return
    }

    const site = findSiteByName(name);
    if (!site) {
      console.error(`Failed to find site '${name}'`);
      return
    }

    const monitor = findMonitorForSite(site);

    if (monitor) {
      monitor.stop();
    }

    monitors.splice(monitors.findIndex(monitor =>
      (monitor.protocolOptions as WebProtocolOptions).url === site.url
    ), 1);

    site.monitorStatus = false;
    db.write()

  },
  restartMonitoring(site: Website) {

    const monitor = monitors.find(monitor =>
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
