import { client } from './client';
import db from "./db";
import monitors from './monitor';

const Monitor = require('ping-monitor');
const PREFIX = process.env.PREFIX || '!';

const controller = {
  middleware: (message: any, command: any) => {
    if(command !== "help" && command !== "ping" && command !== "channel") {
      let channel = db.get('config.channel').value();
      return channel === null ? true : false;
    }
    return false;
  },
  ping: (message: any, args: any) => {
    message.channel.send(`🏓 pong! • latency is *${Date.now() - message.createdTimestamp}ms* • API latency is *${Math.round(client.ws.ping)}ms*`);
  },
  set: (message: any, args: any) => {
    let id = args[0];
    let channel = client.channels.cache.get(id);

    if(channel !== undefined) {
      db.update('config.channel', () => id).write();
      channel.send('This channel has been configured for logging!');
      return;
    }
    message.reply('This channel ID is not valid!');
  },
  init: function () {
    let sites: any = db.get('sites').cloneDeep().value();

    sites.map((site: any) => {
      if (site.monitorStatus === true) {
        let allSites: any = db.get('sites');
        allSites.find({ id: site.id })
        .assign({ firstRun: true, hasErrored: false })
        .write();

        this.startMonitoring(site.name);
      }
    })
  },
  create: function (message: any, args: any) {
    let name = args[0];
    let url = args[1];
    let interval = Number(args[2]);
    let statusCode = Number(args[3]) || 200;

    if (this.siteExists(name)) {
      message.reply(`The name *${name}* is already in use. Choose a different name.`);
      return;
    }

    let sites: any = db.get('sites');
    sites.push({
      id: db.get('increment.sites').value(),
      name,
      url,
      interval,
      statusCode,
      monitorStatus: false,
      firstRun: true,
      hasErrored: false
    }).write();
    db.update('increment.sites', n => n + 1).write();

    message.reply(`A new site *${name}* has been added!`);
  },
  delete: function (message: any, args: any) {
    let name = args[0];

    if (!this.siteExists(name)) {
      message.reply(`The site with the name *${name}* couldn't be found.`);
      return;
    }

    if (this.siteMonitored(name)) {
      this.stopMonitoring(name);
      message.reply(`I have stopped monitoring the site *${name}*.`);
    }

    let sites: any = db.get('sites');
    sites.remove({ title: 'low!' })
    .write();

    message.reply(`The site with the name *${name}* has been removed.`);
  },
  start: function (message: any, args: any) {
    let name = args[0];

    if (!this.siteExists(name)) {
      message.reply(`The site with the name *${name}* couldn't be found.`);
      return;
    }

    if (this.siteMonitored(name)) {
      message.reply(`The site with the name *${name}* is already been monitored.`);
      return;
    }

    let sites: any = db.get('sites');
    sites.find({ name: name })
      .assign({ firstRun: true, hasErrored: false })
      .write();

    this.startMonitoring(name);

    message.reply(`I have started monitoring the site *${name}*. I will keep you updated if anything happens.`);
  },
  stop: function (message: any, args: any) {
    let name = args[0];

    if (!this.siteExists(name)) {
      message.reply(`The site with the name *${name}* couldn't be found.`);
      return;
    }

    if (!this.siteMonitored(name)) {
      message.reply(`The site with the name *${name}* was not been monitored. Check if the entered name is correct.`);
      return;
    }

    this.stopMonitoring(name);

    message.reply(`I have stopped monitoring the site *${name}*.`);
  },
  status: function (message: any, args: any) {
    let name = args[0];

    if (!this.siteExists(name)) {
      message.reply(`The site with the name *${name}* couldn't be found.`);
      return;
    }

    if (this.siteMonitored(name)) {
      message.reply(`The site with the name *${name}* is under active monitor right now!`);
    } else {
      message.reply(`The site with the name *${name}* is **not** monitored.`);
    }
  },
  modify: function (message: any, args: any) {
    let types = ['name', 'interval', 'statuscode'];
    let name = args[0];
    let type = args[1];
    let value = args[2];

    if (!this.siteExists(name)) {
      message.reply(`The site with the name *${name}* couldn't be found.`);
      return;
    }

    if(types.includes(type) === false) {
      message.reply(`While editing the site *${name}*, one of the fields wasn't valid.`);
      return;
    }

    let sites: any = db.get('sites');

    if(type === 'name') {
      sites.find({ name: name })
      .assign({ name: value })
      .write();

      message.reply(`The site *${name}*'s ${type} has been changed to *${value}*`);
      return;
    }

    if(type === 'interval') {
      sites.find({ name: name })
      .assign({ interval: Number(value) })
      .write();
    }

    if(type === 'statuscode') {
      sites.find({ name: name })
      .assign({ statusCode: Number(value) })
      .write();
    }

    this.stopMonitoring(name);

    let allSites: any = db.get('sites');
    allSites.find({ name: name })
      .assign({ firstRun: true, hasErrored: false })
      .write();

    this.startMonitoring(name);

    message.reply(`The site *${name}*'s ${type} has been changed to ${value}. The site monitor has been restarted!`);
  },
  refresh: async function (message: any, args: any) {
    let sites: any = db.get('sites').cloneDeep().value();

    sites.map((site: any) => {
      if (site.monitorStatus === true) {
        this.stopMonitoring(site.name);
      }
    })

    sites.map((site: any) => {
      if (site.monitorStatus === true) {
        let allSites: any = db.get('sites');
        allSites.find({ id: site.id })
        .assign({ firstRun: true, hasErrored: false })
        .write();

        this.startMonitoring(site.name);
      }
    })

    message.reply(`All site monitors has been restarted!`);
  },
  suspend: function (message: any, args: any) {
    let sites: any = db.get('sites').cloneDeep().value();

    sites.map((site: any) => {
      if (site.monitorStatus === true) {
        this.stopMonitoring(site.name);
      }
    })

    message.reply(`All site monitors has been stoppped!`);
  },
  list: function (message: any, args: any) {
    let sites: any = db.get('sites').cloneDeep().value();

    if(sites.length === 0) {
      message.reply("There are no registered sites at the moment. You can add a new one!");
      return;
    }

    let text = "\nID  •  Name Url  •  Interval/minutes  •  Status code  •  Status\n";

    sites.map((site: any) => {
      text += `${site.id}  ${site.name}  <${site.url}>  ${site.interval}  ${site.statusCode}  ${site.monitorStatus ? ':green_circle: online' : ':red_circle: offline'}\n`;
    })
    message.reply(text);
  },
  monitor: function (monitor: any, site: any) {
    monitor.on('up', function (res: any, state: any) {
      if(site.firstRun === true || site.hasErrored === true) {
        let id = db.get('config.channel').value();
        let channel = client.channels.cache.get(id);

        let sites: any = db.get('sites');
        sites.find({ id: site.id })
        .assign({ firstRun: false, hasErrored: false })
        .write();

        channel.send(`The site *${res.website}* is up! (response code: ${res.statusMessage}) :rocket:`);
      }
    });

    monitor.on('down', function (res: any) {
      if(site.firstRun === true || site.hasErrored === false) {
        let id = db.get('config.channel').value();
        let channel = client.channels.cache.get(id);

        let sites: any = db.get('sites');
        sites.find({ id: site.id })
        .assign({ firstRun: false, hasErrored: true })
        .write();

        channel.send(`The site *${res.website}* is down! (response code: ${res.statusMessage}) :fire:`);
      }
    });

    monitor.on('error', function (error: any, res: any) {
      if(site.firstRun === true || site.hasErrored === false) {
        let id = db.get('config.channel').value();
        let channel = client.channels.cache.get(id);

        let sites: any = db.get('sites');
        sites.find({ id: site.id })
        .assign({ firstRun: false, hasErrored: true })
        .write();

        channel.send(`The site *${res.website}* is down! :fire:`);
      }
    });

    monitor.on('stop', function (website: any) {
      let id = db.get('config.channel').value();
      let channel = client.channels.cache.get(id);

      channel.send(`The site *${website}* monitor has stopped!`);
    });

    return monitor;
  },
  siteExists: (name: string) => {
    let sites: any = db.get('sites');
    let site = sites.find({ name }).value();

    return site !== undefined;
  },
  siteMonitored: (name: string) => {
    let sites: any = db.get('sites');
    let site = sites.find({ name }).value();

    let monitor = monitors.find((monitor: any) => (monitor.id === site.id));

    return monitor !== undefined;
  },
  startMonitoring: function (name: string) {
    let sites: any = db.get('sites');
    let site = sites.find({ name: name }).value();

    const monitor = new Monitor({
      website: site.url,
      title: site.name,
      interval: site.interval,
      expect: {
        statusCode: site.statusCode
      }
    });

    monitors.push({
      id: site.id,
      instance: this.monitor(monitor, site)
    });

    sites.find({ name: name })
      .assign({ monitorStatus: true })
      .write();
  },
  stopMonitoring: function (name: string) {
    let sites: any = db.get('sites');
    let site = sites.find({ name: name }).value();

    let monitor = monitors.find((monitor: any) => (monitor.id === site.id));
    delete monitor.instance;

    monitors.splice(monitors.findIndex((monitor: any) => monitor.id === site.id), 1);

    sites.find({ name: name })
      .assign({ monitorStatus: false })
      .write();
  },
  help: function (message: any, args: any) {
    let help = `\n\`${PREFIX}ping\` • connection latency of the bot.
\`${PREFIX}help\` • Show all commands.
\`${PREFIX}channel CHANNEL_ID\` • for setting the channel log messages.
\`${PREFIX}list\` • listing all the sites.
\`${PREFIX}new NAME SITE_URL INTERVAL_IN_MINUTES STATUS_CODE[optional: default is 200]\` • For creating a site.
\`${PREFIX}remove NAME\` • For removing a site.
\`${PREFIX}mutate NAME SETTING[one of "name", "interval", "statuscode"] NEW_VALUE\` • For modifying the information of a site.
\`${PREFIX}start NAME\` • For staring a monitor session for a site.
\`${PREFIX}status NAME\` • For showing if the site is setup of monitor.
\`${PREFIX}stop NAME\` • For stopping a monitor session for a site.
\`${PREFIX}refresh\` • For refreshing all active monitor sessions.
\`${PREFIX}suspend\` • For suspending all active monitor sessions.`;
    message.reply(help);
  }
};

export default controller;
