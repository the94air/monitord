import {
  TMessage, TMonitor, TMonitorInstance, TMonitorResponse, TSite,
} from '../types';
import client from './client';
import db from './db';
import monitors from './monitor';

const Monitor = require('ping-monitor');

const PREFIX = process.env.PREFIX || '!';

const controller = {
  middleware: (message: TMessage, command: string) => {
    if (command !== 'help' && command !== 'ping' && command !== 'channel') {
      const channel = db.get('config.channel').value();
      return channel === null;
    }
    return false;
  },
  ping: (message: TMessage) => {
    message.channel.send(`🏓 pong! • latency is *${Date.now() - message.createdTimestamp}ms* • API latency is *${Math.round(client.ws.ping)}ms*`);
  },
  set: (message: TMessage, args: Array<string>) => {
    const id = args[0];
    const channel = client.channels.cache.get(id);

    if (channel !== undefined) {
      db.update('config.channel', () => id).write();
      channel.send('This channel has been configured for logging!');
      return;
    }
    message.channel.send('This channel ID is not valid!');
  },
  init() {
    const sites = db.get('sites').cloneDeep().value();

    sites.forEach((site: TSite) => {
      if (site.monitorStatus === true) {
        const allSites: any = db.get('sites');
        allSites.find({ id: site.id })
          .assign({ firstRun: true, hasErrored: false })
          .write();

        this.startMonitoring(site.name);
      }
    });
  },
  create(message: TMessage, args: Array<string>) {
    const name = args[0];
    const url = args[1];
    const interval = Number(args[2]);
    const statusCode = Number(args[3]) || 200;

    if (this.siteExists(name)) {
      message.channel.send(`The name *${name}* is already in use. Choose a different name.`);
      return;
    }

    const sites = db.get('sites');
    sites.push({
      id: db.get('increment.sites').value(),
      name,
      url,
      interval,
      statusCode,
      monitorStatus: false,
      firstRun: true,
      hasErrored: false,
    }).write();
    db.update('increment.sites', (n: number) => n + 1).write();

    message.channel.send(`A new site *${name}* has been added!`);
  },
  delete(message: TMessage, args: Array<string>) {
    const name = args[0];

    if (!this.siteExists(name)) {
      message.channel.send(`The site with the name *${name}* couldn't be found.`);
      return;
    }

    if (this.siteMonitored(name)) {
      this.stopMonitoring(name);
      message.channel.send(`I have stopped monitoring the site *${name}*.`);
    }

    const sites = db.get('sites');
    sites.remove({ name })
      .write();

    message.channel.send(`The site with the name *${name}* has been removed.`);
  },
  start(message: TMessage, args: Array<string>) {
    const name = args[0];

    if (!this.siteExists(name)) {
      message.channel.send(`The site with the name *${name}* couldn't be found.`);
      return;
    }

    if (this.siteMonitored(name)) {
      message.channel.send(`The site with the name *${name}* is already been monitored.`);
      return;
    }

    const sites = db.get('sites');
    sites.find({ name })
      .assign({ firstRun: true, hasErrored: false })
      .write();

    this.startMonitoring(name);

    message.channel.send(`I have started monitoring the site *${name}*. I will keep you updated if anything happens.`);
  },
  stop(message: TMessage, args: Array<string>) {
    const name = args[0];

    if (!this.siteExists(name)) {
      message.channel.send(`The site with the name *${name}* couldn't be found.`);
      return;
    }

    if (!this.siteMonitored(name)) {
      message.channel.send(`The site with the name *${name}* was not being monitored. Check if the entered name is correct.`);
      return;
    }

    this.stopMonitoring(name);

    message.channel.send(`I have stopped monitoring the site *${name}*.`);
  },
  restart(message: TMessage, args: Array<string>) {
    const name = args[0];

    if (!this.siteExists(name)) {
      message.channel.send(`The site with the name *${name}* couldn't be found.`);
      return;
    }

    if (!this.siteMonitored(name)) {
      message.channel.send(`The site with the name *${name}* was not being monitored.`);
      return;
    }

    const sites = db.get('sites');
    sites.find({ name })
      .assign({ firstRun: true, hasErrored: false })
      .write();

    this.restartMonitoring(name);

    message.channel.send(`I have restarted the site *${name}* monitor.`);
  },
  status(message: TMessage, args: Array<string>) {
    const name = args[0];

    if (!this.siteExists(name)) {
      message.channel.send(`The site with the name *${name}* couldn't be found.`);
      return;
    }

    if (this.siteMonitored(name)) {
      message.channel.send(`The site with the name *${name}* is under active monitor right now!`);
    } else {
      message.channel.send(`The site with the name *${name}* is **not** monitored.`);
    }
  },
  modify(message: TMessage, args: Array<string>) {
    const types: Array<string> = ['name', 'interval', 'statuscode'];
    const name = args[0];
    const type = args[1];
    const value = args[2];

    if (!this.siteExists(name)) {
      message.channel.send(`The site with the name *${name}* couldn't be found.`);
      return;
    }

    if (types.includes(type) === false) {
      message.channel.send(`While editing the site *${name}*, one of the fields wasn't valid.`);
      return;
    }

    const sites = db.get('sites');

    if (type === 'name') {
      sites.find({ name })
        .assign({ name: value })
        .write();

      message.channel.send(`The site *${name}*'s ${type} has been changed to *${value}*`);
      return;
    }

    if (type === 'interval') {
      sites.find({ name })
        .assign({ interval: Number(value) })
        .write();
    }

    if (type === 'statuscode') {
      sites.find({ name })
        .assign({ statusCode: Number(value) })
        .write();
    }

    if (this.siteMonitored(name)) {
      this.stopMonitoring(name);

      sites.find({ name })
        .assign({ firstRun: true, hasErrored: false })
        .write();

      this.startMonitoring(name);

      message.channel.send(`The site *${name}*'s ${type} has been changed to ${value}. The site monitor has been restarted!`);
      return;
    }

    message.channel.send(`The site *${name}*'s ${type} has been changed to *${value}*`);
  },
  refresh(message: TMessage) {
    const sites = db.get('sites').cloneDeep().value();

    sites.forEach((site: TSite) => {
      if (site.monitorStatus === true) {
        const allSites = db.get('sites');
        allSites.find({ id: site.id })
          .assign({ firstRun: true, hasErrored: false })
          .write();

        this.restartMonitoring(site.name);
      }
    });

    message.channel.send('All site monitors has been restarted!');
  },
  suspend(message: TMessage) {
    const sites = db.get('sites').cloneDeep().value();

    sites.forEach((site: TSite) => {
      if (site.monitorStatus === true) {
        this.stopMonitoring(site.name);
      }
    });

    message.channel.send('All site monitors has been stoppped!');
  },
  list(message: TMessage) {
    const sites = db.get('sites').cloneDeep().value();

    if (sites.length === 0) {
      message.channel.send('There are no registered sites at the moment. You can add a new one!');
      return;
    }

    let text = '\nID  •  Name Url  •  Interval/minutes  •  Status code  •  Status\n';

    sites.forEach((site: TSite) => {
      text += `${site.id}  ${site.name}  <${site.url}>  ${site.interval}  ${site.statusCode}  ${site.monitorStatus ? ':green_circle: online' : ':red_circle: offline'}\n`;
    });
    message.channel.send(text);
  },
  monitor(monitor: TMonitorInstance, site: TSite) {
    monitor.on('up', (res: TMonitorResponse) => {
      if (site.firstRun === true || site.hasErrored === true) {
        const id = db.get('config.channel').value();
        const channel = client.channels.cache.get(id);

        const sites: any = db.get('sites');
        sites.find({ id: site.id })
          .assign({ firstRun: false, hasErrored: false })
          .write();

        channel.send(`The site *${site.name}* monitor has started! The site *${res.website}* is up! (response code: ${res.statusMessage}) :rocket:`);
      }
    });

    monitor.on('down', (res: TMonitorResponse) => {
      if (site.firstRun === true || site.hasErrored === false) {
        const id = db.get('config.channel').value();
        const channel = client.channels.cache.get(id);

        const sites: any = db.get('sites');
        sites.find({ id: site.id })
          .assign({ firstRun: false, hasErrored: true })
          .write();

        channel.send(`The site *${res.website}* is down! (response code: ${res.statusMessage}) :fire:`);
      }
    });

    monitor.on('error', (error: any, res: TMonitorResponse) => {
      if (site.firstRun === true || site.hasErrored === false) {
        const id = db.get('config.channel').value();
        const channel = client.channels.cache.get(id);

        const sites: any = db.get('sites');
        sites.find({ id: site.id })
          .assign({ firstRun: false, hasErrored: true })
          .write();

        channel.send(`The site *${res.website}* is down! :fire:`);
      }
    });

    monitor.on('stop', (res: TMonitorResponse) => {
      const id = db.get('config.channel').value();
      const channel = client.channels.cache.get(id);

      channel.send(`The site *${res.website}* monitor has stopped!`);
    });

    return monitor;
  },
  siteExists: (name: string) => {
    const sites: any = db.get('sites');
    const site = sites.find({ name }).value();

    return site !== undefined;
  },
  siteMonitored: (name: string) => {
    const sites: any = db.get('sites');
    const site = sites.find({ name }).value();

    const monitor = monitors.find((monitorr: TMonitor) => (monitorr.id === site.id));

    return monitor !== undefined;
  },
  startMonitoring(name: string) {
    const sites: any = db.get('sites');
    const site = sites.find({ name }).value();

    const data: TMonitor = {
      id: site.id,
      instance: new Monitor({
        website: site.url,
        title: site.name,
        interval: site.interval,
        expect: {
          statusCode: site.statusCode,
        },
      }),
    };

    if (data.instance) {
      this.monitor(data.instance, site);
    }

    monitors.push(data);

    sites.find({ name })
      .assign({ monitorStatus: true })
      .write();
  },
  stopMonitoring(name: string) {
    const sites: any = db.get('sites');
    const site = sites.find({ name }).value();

    const monitor = monitors.find((monitorr: TMonitor) => (monitorr.id === site.id));

    if (monitor && monitor.instance) {
      monitor.instance.stop();
      delete monitor.instance;
    }

    monitors.splice(monitors.findIndex((monitorr: TMonitor) => monitorr.id === site.id), 1);

    sites.find({ name })
      .assign({ monitorStatus: false })
      .write();
  },
  restartMonitoring(name: string) {
    const sites: any = db.get('sites');
    const site = sites.find({ name }).value();

    const monitor = monitors.find((monitorr: TMonitor) => (monitorr.id === site.id));

    if (monitor && monitor.instance) {
      monitor.instance.restart();
    }
  },
  help(message: TMessage) {
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
