# monitord
A discord bot for managing and monitoring website uptime.

## How to install
- Clone the repo
- `npm install`
- Setup the `.env` file with the proper info from the example `.env.example`
- `npm run dev` *or* if you want to run it on production, `npm run build` and then `npm start`
- Configure the logging channel from discord `!channel CHANNEL_ID` (considering the "!" as the prefix)
- Do `!help` to learn what commands you can use :rocket:

## commands
**`!ping`**
Will show you the connection latency of the bot.

**`!channel`**
Used for setting the channel that will receive both uptime and downtime log messages.

**`!list`**
Used for listing all the sites that has been added for monitoring. It should contain both, the monitored and unmonitored sites.

**`!new`**
Used for creating a site record. Example `!new example https://example.com 1 200`

**`!remove`**
Used for removing a site record. Example `!remove example`

**`!mutate`**
Used for modifying the information of a site. Examples `!mutate name new_example` `!mutate interval 0.5` `!mutate statuscode 404`

**`!start`**
Used for starting a monitor session for a site.

**`!status`**
Used for showing if the site is setup of monitor.

**`!stop`**
Used for stopping a monitor session for a site.

**`!restart`**
Used for restarting a monitor session for a site.

**`!refresh`**
Used for refreshing all active monitor sessions.

**`!suspend`**
Used for suspending all active monitor sessions.

**`!help`**
This will show you all the above commands but more in detail.


## License
[MIT](https://github.com/the94air/monitord/blob/main/LICENSE) Copyright (c) Abdalla Arbab
