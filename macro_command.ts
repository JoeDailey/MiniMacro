
/**
 * Macros are defined and used by messages that
 * start with `#name` where 'name' can be any word.
 */
const SET_OR_SUMMON = /(?:^|[ ])#(\w+)/;

/**
 * Link macros are just like normal macros except
 * that instead of an attachment, the user provides
 * a url (and only a url) to be reposted by the bot
 */
const LINK_MACRO = /(?:^|[ ])#(\w+)\s+(http[^\s]+)/;

export default {
  isSetOrSummon(content: string): boolean {
    return SET_OR_SUMMON.test(content);
  },

  getMacroName(content: string): string {
    return content.match(SET_OR_SUMMON)[1].toLowerCase();
  },

  getMacroNameMaybe(content: string): string|null {
    const match = content.match(SET_OR_SUMMON);
    if (match == null)
      return null;
      
    return match[1].toLowerCase();
  },

  isLinkMacro(content: string): boolean {
    return LINK_MACRO.test(content);
  },

  getLinkMacroLink(content: string): string {
    return content.match(LINK_MACRO)[2];
  }
}