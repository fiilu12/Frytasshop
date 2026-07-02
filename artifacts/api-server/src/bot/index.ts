import {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
} from "discord.js";
import { logger } from "../lib/logger.js";
import { setupTicketCommand } from "./commands/setup-ticket.js";
import { propozycjeCommand } from "./commands/propozycje.js";
import { weryfikacjaCommand } from "./commands/weryfikacja.js";
import { handleTicketInteraction } from "./handlers/tickets.js";
import { handleProposalMessage } from "./handlers/proposals.js";
import { handleReactionAdd, handleReactionRemove } from "./handlers/verification.js";

export const slashCommands = new Collection<string, {
  data: { name: string };
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}>();

slashCommands.set("setup-ticket", setupTicketCommand);
slashCommands.set("propozycje", propozycjeCommand);
slashCommands.set("weryfikacja", weryfikacjaCommand);

export function createBot(): Client {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
  });

  client.once("ready", () => {
    logger.info(`🤖 Bot gotowy: ${client.user?.tag}`);
  });

  client.on("interactionCreate", async (interaction) => {
    if (interaction.isChatInputCommand()) {
      const command = slashCommands.get(interaction.commandName);
      if (command) {
        try {
          await command.execute(interaction as ChatInputCommandInteraction);
        } catch (err) {
          logger.error({ err }, "Błąd komendy");
          const reply = { content: "❌ Wystąpił błąd.", ephemeral: true };
          if (interaction.replied || interaction.deferred) {
            await (interaction as ChatInputCommandInteraction).followUp(reply);
          } else {
            await (interaction as ChatInputCommandInteraction).reply(reply);
          }
        }
      }
    } else if (interaction.isButton()) {
      try {
        await handleTicketInteraction(interaction as ButtonInteraction);
      } catch (err) {
        logger.error({ err }, "Błąd buttona");
      }
    }
  });

  client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    try {
      await handleProposalMessage(message);
    } catch (err) {
      logger.error({ err }, "Błąd propozycji");
    }
  });

  client.on("messageReactionAdd", async (reaction, user) => {
    if (user.bot) return;
    try {
      await handleReactionAdd(reaction, user);
    } catch (err) {
      logger.error({ err }, "Błąd reakcji add");
    }
  });

  client.on("messageReactionRemove", async (reaction, user) => {
    if (user.bot) return;
    try {
      await handleReactionRemove(reaction, user);
    } catch (err) {
      logger.error({ err }, "Błąd reakcji remove");
    }
  });

  return client;
}
