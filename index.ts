import settings from './settings';
import { Client, Message, TextChannel, GuildChannel, DMChannel, NewsChannel } from 'discord.js';
import { ErrorType } from './language';
import MacroCache from './macro_cache';
import MacroCommand from './macro_command';

const client = new Client();

client.on('ready', () => console.log('MiniMacro online!'));
client.on('message', handleMessage);
client.on('messageUpdate', handleDirtyCache);
client.on('messageDelete', handleDirtyCache);

client.login(settings['Bot Token']);

// -----------------------------------------------------------------------------

async function handleMessage(msg: Message) {
  if (!MacroCommand.isSetOrSummon(msg.content))
    return;

  if (msg.attachments.size > 0)
    return; // New macro has been added

  if (msg.attachments.size > 0 || MacroCommand.isLinkMacro(msg.content))
    return; // New macro has been added

  msg.channel.startTyping();
  try {
    const macro_channels = findMacroChannels(msg);
    if (macro_channels.length === 0)
      throwToUser(msg.channel, ErrorType.NO_MACRO_CHANNEL);

    const macro_name = MacroCommand.getMacroName(msg.content);
    const macros = await Promise.all(macro_channels.flatMap(c => MacroCache.fetch(c, macro_name)));
    for (const macro of macros.flat())
      msg.channel.send(macro);
  } catch (e: any) {
    console.error(e);
  } finally  {
    msg.channel.stopTyping();
  }
}

async function handleDirtyCache(msg: Message) {
  if (!(msg.channel instanceof TextChannel))
    return;

  // If a message/channel is not in the DiscordJS
  // cache we won't recieve this event. This is ok
  // because that likely means it's not in our cache
  // either. We also periodically destroy caches
  // to avoid this (and to free memory).
  MacroCache.destroy(msg.channel);
}

// -----------------------------------------------------------------------------

function findMacroChannels(msg: Message): TextChannel[] {
  const current_channel = msg.channel;
  if (!(current_channel instanceof TextChannel))
    return new Array();

  const channels = current_channel.guild.channels;
  const macro_channels = channels.cache.filter((channel: GuildChannel) => (
    channel instanceof TextChannel &&
    channel.name.toLowerCase() === 'macros'
  ));

  // @ts-ignore Refinement is broken here
  return Array.from(macro_channels.values());
}

function throwToUser(
  channel: TextChannel | DMChannel | NewsChannel,
  error: ErrorType
): never {
  channel.send(error);
  throw error + "\n";
}