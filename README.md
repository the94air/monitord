<p align="center">
  <img src="assets/logo.svg?raw=true" alt="Scryll" title="Scryll" height="100" />
</p>

<p align="center">
  <a href="https://github.com/the94air/monitord/blob/master/LICENSE"><img src="https://img.shields.io/github/license/the94air/monitord.svg?sanitize=true" alt="License"></a>
  <a href="https://discord.gg/pX7RdJf2mZ"><img src="https://img.shields.io/badge/chat-on%20discord-7289da.svg?sanitize=true" alt="Chat"></a>
</p>

## Introduction
Discord bot for managing and monitoring website uptime. It has full support of the new slash commands feature with simple commands to montitor a list of websites.

## Requirements
Node.js `v16.9.0` or newer is required

Make sure you have Nodejs installed by visiting the following download page https://nodejs.org/en/download/

## How to install

### Clone this repository

```bash
git clone https://github.com/the94air/monitord.git
```
### Install the project dependancies

```bash
npm install # or yarn install
```
### Setup the project credentials

You need to setup the `.env` file with the proper info from the example file `.env.example`. The credentials consists of:

`TOKEN`

The bot token. This is a full guide on how to generate that token using your discord account https://discordjs.guide/preparations/setting-up-a-bot-application.html

`GUILDID`

The guild ID (the server ID) which can be found when you left click the server icon and choose the `Copy ID` option while having developer mode turned on https://beebom.com/how-enable-disable-developer-mode-discord/

### Setup proper bot permissions

Some options are required to make the bot run properly with slash commands support. If you navigate to your bot settings on the discord portal https://discord.com/developers/applications, make sure to have these settings set to `ON`:
- `PRESENCE INTENT`
- `SERVER MEMBERS INTENT`
- `MESSAGE CONTENT INTENT`

### Run the server
To run the bot on development mode, you can run these commands in two seporate terminals (optional: in case you want to modify the bot logic)
```bash
npm run build:watch
npm start
```

To run the bot on production mode
```bash
npm run build
npm start
```

### Publish the bot commands
To be able to use the bot commands on your server, you most first publish them
```bash
npm run commands
```

### How to set the logs channel
To Configure the logging channel you need to run the bot and then you can use the `/channel` command on your discord server

To get a list of the available commands type `/help`

## Commands
**`/ping`**
Will show you the connection latency.

**`/channel`**
For setting the channel that will receive both uptime and downtime log messages.

**`/list`**
For listing all the sites that has been added for monitoring and the status of each of them. It should contain both, the monitored and nonmonitored websites.

**`/new`**
For creating a site.

**`/remove`**
For removing a site.

**`/modify`**
Used for modifying site information.

**`/start`**
Used for starting a monitor session of a website.

**`/status`**
Used for showing monitor status of a website.

**`/stop`**
Used for stopping a monitor session of a website.

**`/restart`**
Used for restarting a monitor session of a website.

**`/refresh`**
Used for refreshing all active monitor sessions.

**`/suspend`**
Used for suspending all active monitor sessions.

**`/help`**
This will show you all the above commands.

## License
[MIT](https://github.com/the94air/monitord/blob/main/LICENSE) Copyright © 2021 - present, [Abdalla Arbab](https://abdalla.js.org) and [contributors](https://github.com/the94air/monitord/graphs/contributors)
