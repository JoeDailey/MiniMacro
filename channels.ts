import { Guild, GuildChannel, TextChannel } from "discord.js";
import { MacroChannelNotFound } from "./language";

export function findMacroChannels(guild: Guild): TextChannel[] {
  const channels = guild.channels.cache.filter((channel: GuildChannel) => (
    channel instanceof TextChannel && (
      channel.name.toLowerCase() === 'macros' ||
      channel.topic?.toLowerCase()?.includes('@minimacro')
    )
  ));

  if (channels.size < 1) {
    throw MacroChannelNotFound();
  }

  // @ts-ignore Refinement is broken here
  return Array.from(channels.values());
}
