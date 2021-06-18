import { TextChannel } from "discord.js";

export enum ErrorType {
  NO_MACRO_CHANNEL = "You must have a macro channel to summon one. Make a channel called 'macros' or add '@MiniMacros' to the channel topic.",
}

export function throwToUser(error: ErrorType) {
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