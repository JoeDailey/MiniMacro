import { MessageAttachment, ChannelLogsQueryOptions, TextChannel, Message, Collection } from "discord.js";
import MacroCommand from './macro_command';

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

type Macro = string | MessageAttachment

export type MacroResult = {
  macros: Macro[],
  last_scanned: null | string,
  timeout?: NodeJS.Timeout,
};

// Keys are macro names.
type MacroCache = Map<string, MacroResult>;

// Keys are channel IDs.
const CACHE: Map<string, MacroCache> = new Map();

export default {

  /**
   * Fetch a channel's macro by name. Results may come
   * from either the in memory cache or from iterative
   * queries to Discord.
   * 
   * The same macro name can be used with more than one
   * links/attachments and, so, more than can be returned.
   */
  fetch: async function (
    channel: TextChannel,
    macro_name: string
  ): Promise<Macro[]> {
    const cached_result = _getFromCache(channel, macro_name);

    let config: ChannelLogsQueryOptions = { limit: 100 };
    let result: MacroResult = {macros: [], last_scanned: null};
    if (cached_result != null) {
      // We have some cached results. We only need to query Discord
      // for messages written between now and cached_result.last_scanned
      config.after = cached_result.last_scanned;
      result = cached_result;
    }

    while (config != null) {
      // config will be null when we've reached the beginning of the thread
      [config, result] = await _fetchNextPageFromDiscord(
        channel,
        macro_name,
        result,
        config,
      );
    }

    _setInCache(channel, macro_name, result);
    return result.macros;
  },

  destroy: async function (channel: TextChannel) {
    _destroy(channel.id);
  }
}

function _getFromCache(
  channel: TextChannel,
  macro_name: string,
): MacroResult | undefined {
  if (!CACHE.has(channel.id)) {
    return null;
  }

  return CACHE.get(channel.id).get(macro_name);
}

async function _fetchNextPageFromDiscord(
  channel: TextChannel,
  macro_name: string,
  result: MacroResult,
  config: ChannelLogsQueryOptions,
): Promise<[ChannelLogsQueryOptions | null, MacroResult]> {
  const messages = await channel.messages.fetch(config);
  if (messages.size === 0) {
    // We've reached the beginning of the thread
    return [null, result];
  }

  if (config.before == null) {
    // This is the first iteration of hitting Discord

    // Cache the first message, of the first iteration,
    // as the most recent message that we ever checked
    result.last_scanned = messages.first().id;
  }

  config = {
    ...config,
    before: messages.last().id,
  };

  result.macros = [
    ...result.macros,
    ..._extractMacroFromMessage(messages, macro_name),
  ];

  return [config, result];
}

function _extractMacroFromMessage(
  messages: Collection<string, Message>,
  macro_name: string,
): Macro[] {
  const macro_messages = messages.filter(msg => {
    if (msg.attachments.size < 1 && !MacroCommand.isLinkMacro(msg.content)) {
      return false;
    }

    const match = MacroCommand.getMacroNameMaybe(msg.content);
    return (match === macro_name);
  });

  let macros: Macro[] = [];
  for (const [_, msg] of macro_messages) {
    if (MacroCommand.isLinkMacro(msg.content)) {
      macros = [...macros, MacroCommand.getLinkMacroLink(msg.content)];
    } else {
      macros = [
        ...macros,
        ...msg.attachments.values(),
      ]
    }
  }

  return macros;
}

function _setInCache(
  channel: TextChannel,
  macro_name: string,
  result: MacroResult,
) {
  let channel_cache = CACHE.get(channel.id);
  if (channel_cache == null) {
    channel_cache = new Map();
  } else {
    clearTimeout(result.timeout);
    result.timeout = setTimeout(
      () => _destroy(channel.id),
      10*60*1000, // 10 minutes
    );
  }

  channel_cache.set(macro_name, result);
  CACHE.set(channel.id, channel_cache);
}

function _destroy(id: string) {
  // We remove everything associated with this
  // channel as a simple solution for dealing
  // with edits and removals. Refilling the
  // cache on the next query is fast enough
  // that it's worth the tradeoff.
  CACHE.delete(id);
}