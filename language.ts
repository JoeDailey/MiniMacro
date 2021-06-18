import { TextChannel } from "discord.js";

export enum ErrorType {
  NO_MACRO_CHANNEL = "You must have a macro channel to summon one. Make a channel called 'macros' or add '@MiniMacros' to the channel topic.",
  NO_MACRO_OF_THAT_NAME = "There's no macro with that name. Create a message with '#' + your macro's name and attach a photo, video, link, or file.",
}

export function throwToUser(error: ErrorType): never {
  throw new UserError(error);
}

export class UserError extends Error {
  error: ErrorType;
  constructor(error: ErrorType) {
    super(`${error}\n`);
    this.error = error;
  }

  async sendToChannel(channel: TextChannel) {
    channel.send(this.message);
  }
}