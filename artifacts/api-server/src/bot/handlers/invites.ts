import { Collection, type Client, type GuildMember, type Invite } from "discord.js";
import { getConfig, recordJoin, recordLeave } from "../config.js";
import { logger } from "../../lib/logger.js";

// Cache: guildId -> Map<inviteCode, uses>
const inviteCache = new Collection<string, Map<string, number>>();

export async function cacheInvites(client: Client): Promise<void> {
  for (const guild of client.guilds.cache.values()) {
    try {
      const invites = await guild.invites.fetch();
      inviteCache.set(guild.id, new Map(invites.map((i) => [i.code, i.uses ?? 0])));
    } catch {
      // brak uprawnień
    }
  }
}

export async function handleMemberJoin(member: GuildMember): Promise<void> {
  const { inviteChannelId } = getConfig();

  try {
    const newInvites = await member.guild.invites.fetch();
    const cached = inviteCache.get(member.guild.id) ?? new Map<string, number>();

    // Znajdź zaproszenie którego uses wzrosło
    let usedInvite: Invite | undefined;
    for (const invite of newInvites.values()) {
      const prev = cached.get(invite.code) ?? 0;
      if ((invite.uses ?? 0) > prev) {
        usedInvite = invite;
        break;
      }
    }

    // Zaktualizuj cache
    inviteCache.set(member.guild.id, new Map(newInvites.map((i) => [i.code, i.uses ?? 0])));

    if (!usedInvite?.inviter) return;

    const inviter = usedInvite.inviter;
    recordJoin(inviter.id, member.id);

    const stats = getConfig().inviteStats[inviter.id];
    const totalJoined = stats?.joined ?? 1;

    if (!inviteChannelId) return;

    const channel = member.guild.channels.cache.get(inviteChannelId);
    if (!channel?.isSendable()) return;

    await channel.send(
      `📨 <@${member.id}> dołączył z zaproszenia <@${inviter.id}>! ` +
      `Posiada teraz **${totalJoined}** zaproszeń.`
    );
  } catch (err) {
    logger.error({ err }, "Błąd obsługi dołączenia");
  }
}

export async function handleMemberLeave(member: GuildMember): Promise<void> {
  recordLeave(member.id);

  // Odśwież cache po opuszczeniu (zaproszenie mogło wygasnąć)
  try {
    const invites = await member.guild.invites.fetch();
    inviteCache.set(member.guild.id, new Map(invites.map((i) => [i.code, i.uses ?? 0])));
  } catch {
    // brak uprawnień
  }
}
