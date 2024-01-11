import { AutocompleteInteraction, CommandInteraction, Interaction, SlashCommandBuilder, SlashCommandStringOption } from "discord.js";
import MacroCache from "../cache";
import { MacroNotFound, UserError } from "../language";

function build() {
  return new SlashCommandBuilder()
    .setName("macro")
    .setDescription("Send Macro")
    .addStringOption(buildOption());
}

function buildOption() {
  return new SlashCommandStringOption()
    .setName("name")
    .setDescription("The name of the macro to summon")
    .setMinLength(1).setAutocomplete(true).setRequired(true);
}

function alias() {
  return build().setName("m");
}

function test(interaction: CommandInteraction | AutocompleteInteraction) {
  return (
    interaction.commandName === "m" ||
    interaction.commandName === "macro"
  )
}

async function handle(interaction: CommandInteraction | AutocompleteInteraction) {
  try {
    if (interaction.isCommand()) {
      interaction.channel.sendTyping();
      const macro_name = String(interaction.options.get('name', true).value);

      const macros = await MacroCache.fetch(interaction.channel.guild, macro_name);
      if (macros.length < 1) {
        throw MacroNotFound(interaction.channel.guild, macro_name);
      }

      const first = macros.shift();
      await interaction.reply(first);
      await Promise.all(macros.map(m => interaction.channel.send(m)));
      return;
    }

    if (interaction.isAutocomplete()) {
      if (!MacroCache.isWarm(interaction.guild)) {
        // Do not await this because it can take many seconds
        // and Discord expects us to respond in under 3. This
        // avoids showing an error.
        MacroCache.warm(interaction.guild);
        return;
      }

      const partial_name = String(interaction.options.get('name', true).value);
      const options = (await MacroCache.searchNames(interaction.channel.guild, partial_name))
        .filter(choiceMustBeValid)
        .slice(0, 25).map(o => ({name: o, value: o}));
      await interaction.respond(options);
      return;
    }
  } catch (error) {
    if (error instanceof UserError)
      return await error.replyToInteraction(interaction as Interaction);

    console.error("Causes the interaction to fail", error);
  }
}

function choiceMustBeValid(choice: string) {
  if (choice.length <= 0) {
    console.log("Autocomplete choice removed because length was zero");
    return false;
  }
  if (choice.length >= 100) {
    console.log("Autocomplete choice removed because length was over 100 characters", choice);
    return false;
  }

  return true;
}

export default {
  build,
  alias,
  test,
  handle,
}