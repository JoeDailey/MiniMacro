import { TextChannel, EmbedBuilder, Guild, Interaction } from "discord.js";
import { findMacroChannels } from "./channels";
import { ephemeral } from "./ephemeral";

const FOOTER = {
  text: "github.com/JoeDailey/MiniMacro",
  icon_url: 
  "https://github.com/JoeDailey.png?size=100",

}


export class UserError extends Error {
  embed: EmbedBuilder;
  constructor(embed: EmbedBuilder) {
    super(`User error: ${embed.data.title}\n`);
    this.embed = embed
      .setColor('#C73E1D')
      .setFooter(FOOTER);
  }

  async sendToChannel(channel: TextChannel) {
    ephemeral(5, await channel.send({ embeds: [this.embed] }));
  }

  async replyToInteraction(interaction: Interaction) {
    if (interaction.isRepliable()) {
      await interaction.reply({ embeds: [this.embed], ephemeral: true});
      return;
    }

    await this.sendToChannel(interaction.channel as TextChannel);
  }
}

export function MacroNotFound(guild: Guild, macro: string): UserError {
  const channels = findMacroChannels(guild);
  const channel_list = _list(channels.map(c => `<#${c.id}>`), 'or', 'the server');

  return new UserError(new EmbedBuilder()
    .setTitle("Macro not Found")
    .setDescription(
      `There's no macro called **#${macro}** in ${channel_list}`,
    )
  );
}

export function MacroChannelNotFound(): UserError {
  return new UserError(new EmbedBuilder()
    .setTitle("Add a Macros Channel")
    .setDescription(
      "Create a channel called \`macros\` or add \`@MiniMacro\`"+
      " to a channel's topic"
    )
  );
}

export function UnknownInteraction(interaction: Interaction): UserError {
  return new UserError(new EmbedBuilder()
    .setTitle("Unknown Interaction")
    .setDescription(`There's no response for \`${interaction.id}\``)
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
