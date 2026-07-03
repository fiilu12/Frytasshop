import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ChannelType,
  MessageFlags,
  OverwriteType,
  PermissionFlagsBits,
  type ButtonInteraction,
  type GuildMember,
  type TextChannel,
  type Client,
} from "discord.js";
import {
  scheduleDeletion,
  removeDeletion,
  getConfig,
  getPendingDeletionsForUser,
  type PendingDeletion,
} from "../config.js";

const SUPPORT_ROLE_NAME = "Moderator";
const DELETE_AFTER_MS = 24 * 60 * 60 * 1000; // 24 godziny


/** Faktycznie usuwa kanał i czyści config. */
async function deleteTicketChannel(client: Client, channelId: string): Promise<void> {
  try {
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (channel && channel.isDMBased() === false) {
      await (channel as TextChannel).delete("Automatyczne usunięcie po 24h");
    }
  } catch {
    // kanał już usunięty
  } finally {
    removeDeletion(channelId);
  }
}

/**
 * Uruchamia timery dla wszystkich zaplanowanych usunięć (np. po restarcie bota).
 * Kanały, których czas minął, są usuwane natychmiast.
 */
export function schedulePendingDeletions(client: Client): void {
  const { pendingDeletions } = getConfig();
  for (const entry of pendingDeletions) {
    const delay = Math.max(0, entry.deleteAt - Date.now());
    setTimeout(() => deleteTicketChannel(client, entry.channelId), delay);
  }
}

/** Zamknięcie kanału: zablokowanie pisania, zapis do config, timer 24h. */
async function closeTicket(
  channel: TextChannel,
  closedBy: GuildMember,
  ownerId: string,
  client: Client,
): Promise<void> {
  // Zablokuj pisanie w kanale (zachowaj widoczność żeby gracze widzieli że jest zamknięty)
  try {
    await channel.permissionOverwrites.edit(ownerId, {
      SendMessages: false,
    });
  } catch {
    // brak uprawnień — ignoruj
  }

  // Wyślij info o zamknięciu i automatycznym usunięciu
  const closeEmbed = new EmbedBuilder()
    .setTitle("🔒 Ticket Zamknięty")
    .setDescription(
      `Ticket zamknięty przez ${closedBy}.\n\n` +
        "📄 Transkrypt został wysłany właścicielowi na wiadomości prywatne.\n\n" +
        "⏳ Kanał zostanie **automatycznie usunięty za 24 godziny**.",
    )
    .setColor(0xed4245)
    .setTimestamp();

  if (channel.isSendable()) {
    await channel.send({ embeds: [closeEmbed] }).catch(() => {});
  }

  // Zaplanuj usunięcie za 24h i zapisz do config (przeżyje restart)
  scheduleDeletion(channel.id, ownerId);
  setTimeout(() => deleteTicketChannel(client, channel.id), DELETE_AFTER_MS);
}

export async function handleTicketInteraction(interaction: ButtonInteraction): Promise<void> {
  const { customId, guild, member } = interaction;

  if (!guild || !member) return;

  // ── OTWIERANIE TICKETU ────────────────────────────────────────────────────
  if (customId === "ticket_create") {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guildMember = member as GuildMember;
    const channelName = `ticket-${guildMember.user.username
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 20)}`;

    // Sprawdź czy użytkownik ma OTWARTY ticket (nie zamknięty oczekujący na usunięcie)
    const closedChannelIds = getPendingDeletionsForUser(guildMember.id).map((d) => d.channelId);

    const existingOpenChannel = guild.channels.cache.find((ch) => {
      if (ch.type !== ChannelType.GuildText) return false;
      if (closedChannelIds.includes(ch.id)) return false; // zamknięty — nie blokuje
      return ch.name === channelName;
    });

    if (existingOpenChannel) {
      await interaction.editReply({
        content: `❌ Masz już otwarty ticket: ${existingOpenChannel}\nZamknij go przed otwarciem nowego.`,
      });
      return;
    }

    const supportRole = guild.roles.cache.find((r) => r.name === SUPPORT_ROLE_NAME);

    const permissionOverwrites = [
      {
        id: guild.id,
        deny: [PermissionFlagsBits.ViewChannel],
        type: OverwriteType.Role,
      },
      {
        id: guildMember.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
        type: OverwriteType.Member,
      },
    ];

    if (supportRole) {
      permissionOverwrites.push({
        id: supportRole.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
        type: OverwriteType.Role,
      });
    }

    const openedAt = new Date().toLocaleString("pl-PL");

    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      permissionOverwrites,
      topic: `Ticket użytkownika ${guildMember.user.tag} | Otwarto: ${openedAt} | ownerId:${guildMember.id}`,
    });

    const embed = new EmbedBuilder()
      .setTitle("🎫 Ticket Otwarty")
      .setDescription(
        `Witaj ${guildMember}!\n\n` +
          "Opisz swój problem lub pytanie, a nasz zespół pomoże Ci jak najszybciej.\n\n" +
          "Aby zamknąć ticket, kliknij przycisk poniżej.",
      )
      .setColor(0x5865f2)
      .setFooter({ text: `Ticket | ${guildMember.user.tag}` })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket_close_${guildMember.id}`)
        .setLabel("Zamknij Ticket")
        .setEmoji("🔒")
        .setStyle(ButtonStyle.Danger),
    );

    await (ticketChannel as TextChannel).send({
      content: `${guildMember}${supportRole ? ` | ${supportRole}` : ""}`,
      embeds: [embed],
      components: [row],
    });

    await interaction.editReply({
      content: `✅ Ticket został otwarty: ${ticketChannel}`,
    });
    return;
  }

  // ── ZAMYKANIE TICKETU ─────────────────────────────────────────────────────
  if (customId.startsWith("ticket_close_")) {
    const guildMember = member as GuildMember;
    const isAdmin = guildMember.permissions.has(PermissionFlagsBits.Administrator);
    const supportRole = guild.roles.cache.find((r) => r.name === SUPPORT_ROLE_NAME);
    const hasSupportRole = supportRole ? guildMember.roles.cache.has(supportRole.id) : false;
    const ownerId = customId.replace("ticket_close_", "");
    const isOwner = guildMember.id === ownerId;

    if (!isAdmin && !hasSupportRole && !isOwner) {
      await interaction.reply({
        content: "❌ Nie masz uprawnień do zamknięcia tego ticketu.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const channel = interaction.channel as TextChannel | null;
    if (!channel) return;

    // Pobierz ownerId z topic jeśli customId nie zawiera właściwego
    const topicMatch = channel.topic?.match(/ownerId:(\d+)/);
    const ticketOwnerId = topicMatch?.[1] ?? ownerId;

    // Sprawdź czy ticket nie jest już zamknięty
    const pending = getConfig().pendingDeletions.find((d) => d.channelId === channel.id);
    if (pending) {
      await interaction.reply({
        content: "❌ Ten ticket jest już zamknięty i oczekuje na usunięcie.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.reply({
      content: "🔒 Zamykanie ticketu i generowanie transkryptu…",
      flags: MessageFlags.Ephemeral,
    });

    const client = interaction.client;
    await closeTicket(channel, guildMember, ticketOwnerId, client);
  }
}
