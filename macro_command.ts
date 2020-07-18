const SET_OR_SUMMON = /(?:^|[ ])#(\w+)/;
const LINK_MACRO = /(?:^|[ ])#(\w+)\s+(http[^\s]+)/;

export default {
  isSetOrSummon(content: string): boolean {
    return SET_OR_SUMMON.test(content);
  },

  getMacroName(content: string): string {
    return content.match(SET_OR_SUMMON)[1].toLowerCase();
  },

  isLinkMacro(content: string): boolean {
    return LINK_MACRO.test(content);
  },

  getLinkMacroLink(content: string): string {
    return content.match(LINK_MACRO)[2];
  }
}