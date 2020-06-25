import settings from './settings';
import { Client, Message, TextChannel, GuildChannel, DMChannel, NewsChannel, MessageAttachment } from 'discord.js';
import { ErrorType } from './language';

const client = new Client();

client.on('ready', () => console.log('MiniMacro online!'));
client.on('message', handleMessage);

client.login(settings['Bot Token']);

// -----------------------------------------------------------------------------

const command = /(?:^|[ ])#(\w+)/;
async function handleMessage(msg: Message) {
  if (!command.test(msg.content))
    return;

  if (msg.attachments.size > 0)
    return; // New macro has been added

  msg.channel.startTyping();
  {
    const macro_channels = findMacroChannels(msg);
    if (macro_channels.length === 0)
      throwToUser(msg.channel, ErrorType.NO_MACRO_CHANNEL);

    const macro_name = msg.content.match(command)[1];
    const macros = await Promise.all(macro_channels.flatMap(c => fetchMacros(macro_name, c)));
    for (const macro of macros.flat())
      msg.channel.send(macro);
  }
  msg.channel.stopTyping();
}

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

async function fetchMacros(
  macro_name: string,
  channel: TextChannel,
): Promise<MessageAttachment[]> {
  try {
    const messages = await channel.messages.fetch({ limit: 100 });
    const macros = messages.filter(msg => {
      const match = msg.content.match(command);
      return (
        match != null &&
        match[1] === macro_name &&
        msg.attachments.size > 0
      );
    });
    const attachments = macros.flatMap(msg => msg.attachments);
    return Array.from(attachments.values());
  } catch (e) {
    console.error(e);
    return new Array();
  }
}

function throwToUser(
  channel: TextChannel | DMChannel | NewsChannel,
  error: ErrorType
): never {
  channel.send(error);
  throw error + "\n";
}