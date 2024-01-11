import { TextChannel, Message, Collection, Guild, Attachment, BaseMessageOptions } from "discord.js";
import MacroCommand from './command';
import { findMacroChannels } from './channels';

/**
 * To reduce how often we hit Discord for macros, we cache
 * the ones that people are using. The cache is in memory
 * and segmented by channel ID. 
 * 
 * Every cache entry remembers the ID of the last scanned
 * message. When asked for a message, we will also check
 * for any newer messages that match the macro name.
 * 
 * The language used here can be kind of confusing because
 * 'config.after' means after this ID, but working backwards
 * in time because, well, messages are seen newest to oldest.
 */

type ChannelID = string;
type MessageID = string;

type MacroName = string;
type Macro = string | Attachment[]
type MacroCache = {
  macros: Map<MacroName, Macro[]>,
  most_recent_message: MessageID | null,
};

const CACHE: Map<ChannelID, MacroCache> = new Map();

export default {

  /**
   * Fetch a servers's macro by name. Results may come
   * from either the in memory cache or from iterative
   * queries to Discord.
   * 
   * The same macro name can be used with more than one
   * links/attachments and, so, more than can be returned.
   */
  fetch: async function (guild: Guild, name: string): Promise<BaseMessageOptions[]> {
    const macro_channels = findMacroChannels(guild);
    const macros_from_channels = await Promise.all(
      macro_channels.flatMap(c => _getMacrosFromChannel(c, name)
    ));
    return macros_from_channels.flat();
  },

  /**
   * Searches for a servers's macros by name. Results may come
   * from either the in memory cache or from iterative queries
   * to Discord.
   */
  searchNames: async function (guild: Guild, partial: string): Promise<MacroName[]> {
    const macro_channels = findMacroChannels(guild);
    const macros_names_from_channels = await Promise.all(
      macro_channels.flatMap(c => _searchMacroNameFromChannel(c, partial)
    ));
    return macros_names_from_channels.flat();
  },

  topOff: async function (channel: TextChannel): Promise<void> {
    const data = CACHE.get(channel.id);
    if (data == null) {
      // We don't need to top off an empty cache because
      // the next macro request will just do a full scan
      return;
    }
  
    const new_data = await _fetchMacrosFromDiscord(channel, data.most_recent_message);
    if (new_data.most_recent_message !== data.most_recent_message) {
      CACHE.set(
        channel.id,
        {
          macros: new Map([...data.macros, ...new_data.macros]),
          most_recent_message: new_data.most_recent_message,
        }
      );
    }
  },

  isWarm: function(guild: Guild) {
    const macro_channels = findMacroChannels(guild);
    return macro_channels.reduce((warm, c) => warm && CACHE.get(c.id) != null, true);
  },

  warm: async function(guild: Guild) {
    const macro_channels = findMacroChannels(guild);
    await Promise.all(macro_channels.flatMap(c => _populateCacheIfNeeded(c)));
  },

  destroy: async function (channel: TextChannel) {
    _destroy(channel.id);
  },
}

async function _getMacrosFromChannel(
  channel: TextChannel,
  macro_name: MacroName,
): Promise<BaseMessageOptions[]> {
  await _populateCacheIfNeeded(channel);
  const macros = CACHE.get(channel.id).macros.get(macro_name) ?? [];
  return macros.map(m => (typeof m === "string") ? {content: m} : {files: m})
}

async function _searchMacroNameFromChannel(
  channel: TextChannel,
  partial_macro_name: MacroName,
): Promise<MacroName[]> {
  await _populateCacheIfNeeded(channel);
  const names = [...CACHE.get(channel.id).macros.keys()];
  return names.filter(n => n.includes(partial_macro_name)) ?? [];
}

async function _populateCacheIfNeeded(channel: TextChannel): Promise<void> {
  const data = CACHE.get(channel.id);
  if (data == null) {
    CACHE.set(channel.id, await _fetchMacrosFromDiscord(channel));
    return;
  }
}

async function _fetchMacrosFromDiscord(
  channel: TextChannel,
  last_scanned: MessageID | null = null,
): Promise<MacroCache> {
  let newest_message = null;
  const all = new Map();

  do {
    var messages: Collection<string, Message> = await channel.messages.fetch({
      limit: 100, // Max allowed by API
      before: messages?.last()?.id,
      after: last_scanned,
    });
    _collectMacros(all, messages);
    if (newest_message == null)
      newest_message = messages.first()?.id;
  } while (messages.size === 100)

  return {
    macros: all,
    most_recent_message: newest_message,
  };
}

function _collectMacros(
  all: Map<MacroName, Macro[]>,
  messages: Collection<string, Message>,
): void {
  for (const msg of messages.values()) {
    const attachments = msg.attachments;
    const link = MacroCommand.getLinkMacroMaybe(msg.content);
    if (attachments.size < 1 && link == null) {
      continue;
    }

    const name = MacroCommand.getMacroNameMaybe(msg.content);
    if (name == null) {
      continue;
    }

    const existing = all.get(name) ?? [];
    if (attachments.size >= 1) {
      existing.push([...attachments.values()]);
    } else if (link != null) {
      existing.push(link);
    }
    all.set(name, existing);
  }
}

function _destroy(id: ChannelID) {
  // We remove everything associated with this
  // channel as a simple solution for dealing
  // with edits and removals. Refilling the
  // cache on the next query is fast enough
  // that it's worth the tradeoff.
  CACHE.delete(id);
}
