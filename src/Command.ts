import {
  Client,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

export type CommandRunArgs = {
  interaction: ChatInputCommandInteraction;
  client: Client;
};

export type Command = {
  data:
    | SlashCommandBuilder
    | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
  run: (args: CommandRunArgs) => Promise<any>;
};
