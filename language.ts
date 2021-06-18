import { TextChannel, MessageEmbed, Guild } from "discord.js";
import { findMacroChannels } from "./channels";


export class UserError extends Error {
  embed: MessageEmbed;
  constructor(embed: MessageEmbed) {
    super(`User error: ${embed.title}\n`);
    this.embed = embed;
  }

  async sendToChannel(channel: TextChannel) {
    this.embed
      .setColor('#C73E1D')
      .setFooter(
        "github.com/JoeDailey/MiniMacro",
        "https://github.com/JoeDailey.png?size=100",
      );
    await channel.send(this.embed);
  }
}

export function MacroNotFound(guild: Guild, macro: string): UserError {
  const channels = findMacroChannels(guild);
  const channel_list = _list(channels.map(c => `<#${c.id}>`), 'or', 'the server');

  return new UserError(new MessageEmbed()
    .setTitle("Macro not Found")
    .setDescription(
      `There's no macro called **#${macro}** in ${channel_list}`,
    )
  );
}

export function MacroChannelNotFound(): UserError {
  return new UserError(new MessageEmbed()
    .setTitle("Add a Macros Channel")
    .setDescription(
      "Create a channel called \`macros\` or add \`@MiniMacro\`"+
      " to a channel's topic"
    )
  );
}

function _list(terms: string[], joiner: string, empty: string): string {
  if (terms.length >= 3) {
    const last = terms.pop()
    return `${terms.join(', ')}, ${joiner} ${last}`;
  } else if (terms.length === 2) {
    return `${terms[0]} ${joiner} ${terms[1]}`;
  } else if (terms.length === 1) {
    return terms[0];
  } else {
    return empty;
  }
}