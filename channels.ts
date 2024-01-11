import { Guild, GuildBasedChannel, TextChannel } from "discord.js";
import { MacroChannelNotFound } from "./language";

export function findMacroChannels(guild: Guild): TextChannel[] {
  const channels = guild.channels.cache.filter((channel: GuildBasedChannel) => (
    channel instanceof TextChannel && isMacroChannel(channel)
  ));

  if (channels.size < 1) {
    throw MacroChannelNotFound();
  }

  // @ts-ignore Refinement is broken here
  return Array.from(channels.values());
}

export function isMacroChannel(channel: TextChannel): boolean {
  return (
    channel.name.toLowerCase() === 'macros' ||
    channel.topic?.toLowerCase()?.includes('@minimacro')
  );
}