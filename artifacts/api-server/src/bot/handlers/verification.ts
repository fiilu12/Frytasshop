import { type MessageReaction, type User, type PartialMessageReaction, type PartialUser } from "discord.js";
import { getConfig } from "../config.js";

const VERIFY_CHANNEL_ID = process.env.VERIFY_CHANNEL_ID!;
const VERIFY_EMOJI = process.env.VERIFY_EMOJI ?? "✅";
const VERIFY_ROLE_NAME = "𝙁𝙧𝙩𝙮𝙠𝙖";

export async function handleReactionAdd(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
): Promise<void> {
  // Fetch jeśli partial
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch {
      return;
    }
  }
  if (user.partial) {
    try {
      await user.fetch();
    } catch {
      return;
    }
  }

  const { verifyMessageId } = getConfig();

  // Sprawdź czy to właściwy kanał, wiadomość i emotka
  if (reaction.message.channelId !== VERIFY_CHANNEL_ID) return;
  if (verifyMessageId && reaction.message.id !== verifyMessageId) return;

  const emojiName = reaction.emoji.name ?? reaction.emoji.toString();
  if (emojiName !== VERIFY_EMOJI && reaction.emoji.toString() !== VERIFY_EMOJI) return;

  const guild = reaction.message.guild;
  if (!guild) return;

  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member) return;

  // Znajdź lub utwórz rolę weryfikacyjną
  let role = guild.roles.cache.find((r) => r.name === VERIFY_ROLE_NAME);
  if (!role) {
    role = await guild.roles.create({
      name: VERIFY_ROLE_NAME,
      color: 0x5865f2,
      reason: "Automatyczna rola weryfikacyjna",
    });
  }

  if (!member.roles.cache.has(role.id)) {
    await member.roles.add(role);
  }
}

export async function handleReactionRemove(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
): Promise<void> {
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch {
      return;
    }
  }
  if (user.partial) {
    try {
      await user.fetch();
    } catch {
      return;
    }
  }

  const { verifyMessageId } = getConfig();

  if (reaction.message.channelId !== VERIFY_CHANNEL_ID) return;
  if (verifyMessageId && reaction.message.id !== verifyMessageId) return;

  const emojiName = reaction.emoji.name ?? reaction.emoji.toString();
  if (emojiName !== VERIFY_EMOJI && reaction.emoji.toString() !== VERIFY_EMOJI) return;

  const guild = reaction.message.guild;
  if (!guild) return;

  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member) return;

  const role = guild.roles.cache.find((r) => r.name === VERIFY_ROLE_NAME);
  if (!role) return;

  if (member.roles.cache.has(role.id)) {
    await member.roles.remove(role);
  }
}
