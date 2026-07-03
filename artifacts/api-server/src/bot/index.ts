import {
  Client,
  GatewayIntentBits,
  MessageFlags,
  Partials,
  Collection,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
  type GuildMember,
} from "discord.js";
import { logger } from "../lib/logger.js";
import { setupTicketCommand } from "./commands/setup-ticket.js";
import { propozycjeCommand } from "./commands/propozycje.js";
import { weryfikacjaCommand } from "./commands/weryfikacja.js";
import { ustawkanalZaproCommand } from "./commands/ustawkanal-zapro.js";
import { sprawdzzaproCommand } from "./commands/sprawdzzapro.js";
import { wiadomoscCommand } from "./commands/wiadomosc.js";
import { handleTicketInteraction, schedulePendingDeletions } from "./handlers/tickets.js";
import { handleProposalMessage } from "./handlers/proposals.js";
import { handleReactionAdd, handleReactionRemove } from "./handlers/verification.js";
import { cacheInvites, handleMemberJoin, handleMemberLeave } from "./handlers/invites.js";

export const slashCommands = new Collection<string, {
  data: { name: string };
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}>();

slashCommands.set("setup-ticket", setupTicketCommand);
slashCommands.set("propozycje", propozycjeCommand);
slashCommands.set("weryfikacja", weryfikacjaCommand);
slashCommands.set("ustawkanal_zapro", ustawkanalZaproCommand);
slashCommands.set("sprawdzzapro", sprawdzzaproCommand);
slashCommands.set("wiadomosc", wiadomoscCommand);

export function createBot(): Client {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildInvites,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
  });

  client.once("clientReady", async () => {
    logger.info(`🤖 Bot gotowy: ${client.user?.tag}`);
    schedulePendingDeletions(client);
    await cacheInvites(client);
  });

  client.on("interactionCreate", async (interaction) => {
    if (interaction.isChatInputCommand()) {
      const command = slashCommands.get(interaction.commandName);
      if (command) {
        try {
          await command.execute(interaction as ChatInputCommandInteraction);
        } catch (err) {
          logger.error({ err }, "Błąd komendy");
          const reply = { content: "❌ Wystąpił błąd.", flags: MessageFlags.Ephemeral };
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

  client.on("guildMemberAdd", async (member) => {
    try {
      await handleMemberJoin(member as GuildMember);
    } catch (err) {
      logger.error({ err }, "Błąd guildMemberAdd");
    }
  });

  client.on("guildMemberRemove", async (member) => {
    try {
      await handleMemberLeave(member as GuildMember);
    } catch (err) {
      logger.error({ err }, "Błąd guildMemberRemove");
    }
  });

  return client;
}
