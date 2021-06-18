import settings from './settings';
import { Client, Message, TextChannel } from 'discord.js';
import { ErrorType, throwToUser, UserError } from './language';
import MacroCache from './cache';
import MacroCommand from './command';

const client = new Client();

client.on('ready', () => console.log('MiniMacro online!'));
client.on('message', handleMessage);
client.on('messageUpdate', handleDirtyCache);
client.on('messageDelete', handleDirtyCache);

client.login(settings['Bot Token']);

// -----------------------------------------------------------------------------

async function handleMessage(msg: Message) {
  if (!(msg.channel instanceof TextChannel))
    return;

  if (!MacroCommand.isSetOrSummon(msg.content))
    return;

  if (msg.attachments.size > 0)
    return; // New macro has been added

  if (MacroCommand.isLinkMacro(msg.content))
    return; // New link macro has been added

  msg.channel.startTyping();
  try {
    const macro_name = MacroCommand.getMacroName(msg.content);
    const macros = await MacroCache.fetch(msg.channel.guild, macro_name);
    if (macros.length < 1) {
      throwToUser(ErrorType.NO_MACRO_OF_THAT_NAME);
    }

    await Promise.all(macros.map(m => msg.channel.send(m)));
  } catch (error) {
    if (error instanceof UserError)
      return await error.sendToChannel(msg.channel);

    console.error(error.stack);
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