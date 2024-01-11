import settings from './settings';
import { ApplicationCommandType, AutocompleteInteraction, Client, CommandInteraction, ContextMenuCommandBuilder, Events, GatewayIntentBits, Interaction, Message, REST, Routes, SlashCommandBuilder, TextChannel } from 'discord.js';
import { MacroNotFound, UnknownInteraction, UserError } from './language';
import MacroCache from './cache';
import MacroCommand from './command';
import MacroSlash from './slash/macro';
import { isMacroChannel } from './channels';

const __ARGS__ = process.argv.slice(2);
const __DEV__ = __ARGS__.indexOf('--dev') >= 0;
const __SETTINGS__ = __DEV__ ? settings['dev_settings'] : settings['settings'];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent]
});



client.on(Events.ClientReady, handleReady);
client.on(Events.MessageCreate, handleMessage);
client.on(Events.MessageUpdate, handleDirtyCache);
client.on(Events.MessageDelete, handleDirtyCache);
client.on(Events.InteractionCreate, handleInteraction);
process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

client.login(__SETTINGS__['Token']);

// ---- Handlers ---------------------------------------------------------------

async function handleReady(client: Client<true>) {
  console.log(`MiniMacro "${client.user?.username}" Bot online!`)

  installCommands();
}

async function handleMessage(msg: Message) {
  if (!(msg.channel instanceof TextChannel))
    return;

  if (!MacroCommand.isSetOrSummon(msg.content))
    return;

  if (msg.attachments.size > 0 || MacroCommand.isLinkMacro(msg.content)) {
    if (isMacroChannel(msg.channel)) {
      MacroCache.topOff(msg.channel);
    }

    return; // New link macro has been added
  }

  try {
    msg.channel.sendTyping();
    const macro_name = MacroCommand.getMacroName(msg.content);
    const macros = await MacroCache.fetch(msg.channel.guild, macro_name);
    if (macros.length < 1) {
      throw MacroNotFound(msg.channel.guild, macro_name);
    }

    await Promise.all(macros.map(m => msg.channel.send(m)));
  } catch (error) {
    if (error instanceof UserError)
      return await error.sendToChannel(msg.channel);

    console.error("Causes the macro to not be sent", error);
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

async function handleInteraction(interaction: Interaction) {
  if (!(interaction.channel instanceof TextChannel))
    return;

  try {
    if (interaction.isCommand()) {
      handleCommand(interaction);
      return;
    }

    if (interaction.isAutocomplete()) {
      handleAutocomplete(interaction);
      return;
    }

    throw UnknownInteraction(interaction)
  } catch (error) {
    if (error instanceof UserError)
      return await error.sendToChannel(interaction.channel);

    console.error("Error causes the interaction to fail", error);
  }
}

async function handleCommand(interaction: CommandInteraction) {
  if (MacroSlash.test(interaction)) {
    await MacroSlash.handle(interaction);
    return;
  }

  throw UnknownInteraction(interaction as Interaction)
}

async function handleAutocomplete(interaction: AutocompleteInteraction) {
  if (MacroSlash.test(interaction)) {
    await MacroSlash.handle(interaction);
    return;
  }

  throw UnknownInteraction(interaction)
}

// ---- Slash Commands ---------------------------------------------------------

async function installCommands() {
  const commands = [
    MacroSlash.build(),
    MacroSlash.alias(),
  ];

  try {

    const rest = new REST().setToken(__SETTINGS__['Token']);
    await rest.put(
      Routes.applicationCommands(client.application.id),
      { body: commands },
      );
  } catch (e) {
    console.error("Causes the commands to not be installed", e);
  }
}