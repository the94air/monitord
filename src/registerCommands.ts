import { APIUser, REST, Routes } from "discord.js";
import path from "path";
import { Command } from "./Command";
import fs from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const run = async () => {
  console.log(process.env.TOKEN);
  if (!process.env.GUILDID) {
    console.error("No GUILDID provided as ENV variable");
    process.exit(1);
  }
  if (!process.env.TOKEN) {
    console.error("No TOKEN provided as ENV variable");
    process.exit(1);
  }

  const commands: Command[] = [];
  const commandPaths = fs
    .readdirSync(path.join(__dirname, "commands"))
    .filter((x) => x.endsWith(".js"));
  for (const commandPath of commandPaths) {
    const command = await import(`./commands/${commandPath}`);
    commands.push(command.default);
  }

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
  const user = (await rest.get(Routes.user())) as APIUser;
  const data = await rest.put(
    Routes.applicationGuildCommands(user.id, process.env.GUILDID),
    {
      body: commands.map((command) => command.data.toJSON()),
    }
  );
  console.log(data);
  console.log("Migrated commands");
};
run();
