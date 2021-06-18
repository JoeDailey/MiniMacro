import { Message } from "discord.js";

type minutes = number;

export function ephemeral(minutes: minutes, message: Message) {
  setTimeout(() => message.delete(), minutes * 60 * 1000)
}