import { Guild, GuildChannel, TextChannel } from "discord.js";
import { ErrorType, throwToUser } from "./language";

export function findMacroChannels(guild: Guild): TextChannel[] {
  const channels = guild.channels.cache.filter((channel: GuildChannel) => (
    channel instanceof TextChannel &&
    channel.name.toLowerCase() === 'macros'
  ));

  if (channels.size < 1) {
    throwToUser(ErrorType.NO_MACRO_CHANNEL);
  }

  // @ts-ignore Refinement is broken here
  return Array.from(channels.values());
}
