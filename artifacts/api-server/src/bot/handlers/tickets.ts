import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ChannelType,
  OverwriteType,
  PermissionFlagsBits,
  AttachmentBuilder,
  type ButtonInteraction,
  type GuildMember,
  type TextChannel,
  type Collection,
  type Snowflake,
  type Message,
} from "discord.js";

const SUPPORT_ROLE_NAME = "Moderator";

/** Pobiera wszystkie wiadomości z kanału (do 1000). */
async function fetchAllMessages(channel: TextChannel): Promise<Message[]> {
  const all: Message[] = [];
  let before: Snowflake | undefined;

  while (true) {
    const batch: Collection<Snowflake, Message> = await channel.messages.fetch({
      limit: 100,
      ...(before ? { before } : {}),
    });
    if (batch.size === 0) break;
    all.push(...batch.values());
    before = batch.last()!.id;
    if (batch.size < 100) break;
  }

  // Sortuj od najstarszej do najnowszej
  return all.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
}

/** Buduje treść pliku .txt z transkryptem. */
function buildTranscript(messages: Message[], channelName: string, openedAt: string): string {
  const lines: string[] = [
    `=== TRANSKRYPT TICKETU ===`,
    `Kanał: #${channelName}`,
    `Otwarto: ${openedAt}`,
    `Zamknięto: ${new Date().toLocaleString("pl-PL")}`,
    `Liczba wiadomości: ${messages.length}`,
    `${"=".repeat(40)}`,
    "",
  ];

  for (const msg of messages) {
    const time = msg.createdAt.toLocaleString("pl-PL");
    const author = msg.author.tag;
    const content = msg.content || (msg.embeds.length > 0 ? "[Embed]" : "[Brak treści]");
    const attachments = msg.attachments.size > 0
      ? `\n  📎 Załączniki: ${[...msg.attachments.values()].map((a) => a.url).join(", ")}`
      : "";

    lines.push(`[${time}] ${author}: ${content}${attachments}`);
  }

  lines.push("", `${"=".repeat(40)}`, "Koniec transkryptu.");
  return lines.join("\n");
}

export async function handleTicketInteraction(interaction: ButtonInteraction): Promise<void> {
  const { customId, guild, member } = interaction;

  if (!guild || !member) return;

  // ── OTWIERANIE TICKETU ────────────────────────────────────────────────────
  if (customId === "ticket_create") {
    await interaction.deferReply({ ephemeral: true });

    const guildMember = member as GuildMember;
    const channelName = `ticket-${guildMember.user.username
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 20)}`;

    const existingChannel = guild.channels.cache.find(
      (ch) => ch.name === channelName && ch.type === ChannelType.GuildText,
    );

    if (existingChannel) {
      await interaction.editReply({
        content: `❌ Masz już otwarty ticket: ${existingChannel}`,
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
    await interaction.deferReply({ ephemeral: false });

    const guildMember = member as GuildMember;
    const isAdmin = guildMember.permissions.has(PermissionFlagsBits.Administrator);
    const supportRole = guild.roles.cache.find((r) => r.name === SUPPORT_ROLE_NAME);
    const hasSupportRole = supportRole ? guildMember.roles.cache.has(supportRole.id) : false;
    const ownerId = customId.replace("ticket_close_", "");
    const isOwner = guildMember.id === ownerId;

    if (!isAdmin && !hasSupportRole && !isOwner) {
      await interaction.editReply({
        content: "❌ Nie masz uprawnień do zamknięcia tego ticketu.",
      });
      return;
    }

    const channel = interaction.channel as TextChannel | null;
    if (!channel) return;

    // Wyciągnij ownerId z topic kanału jako fallback
    const topicMatch = channel.topic?.match(/ownerId:(\d+)/);
    const ticketOwnerId = ownerId || topicMatch?.[1];

    const closingEmbed = new EmbedBuilder()
      .setTitle("🔒 Zamykanie Ticketu")
      .setDescription(
        `Ticket zamykany przez ${guildMember}.\nTrwa zapisywanie transkryptu…`,
      )
      .setColor(0xed4245)
      .setTimestamp();

    await interaction.editReply({ embeds: [closingEmbed] });

    // Pobierz transkrypt
    let transcriptText = "";
    try {
      const messages = await fetchAllMessages(channel);
      const openedAt = channel.topic?.match(/Otwarto: ([^|]+)/)?.[1]?.trim() ?? "nieznana";
      transcriptText = buildTranscript(messages, channel.name, openedAt);
    } catch {
      transcriptText = "Nie udało się pobrać historii wiadomości.";
    }

    // Wyślij transkrypt właścicielowi na PV
    if (ticketOwnerId) {
      try {
        const owner = await guild.members.fetch(ticketOwnerId).catch(() => null);
        if (owner) {
          const fileBuffer = Buffer.from(transcriptText, "utf-8");
          const attachment = new AttachmentBuilder(fileBuffer, {
            name: `transkrypt-${channel.name}-${Date.now()}.txt`,
            description: "Transkrypt ticketu",
          });

          const dmEmbed = new EmbedBuilder()
            .setTitle("📄 Transkrypt Twojego Ticketu")
            .setDescription(
              `Twój ticket na serwerze **${guild.name}** został zamknięty przez ${guildMember}.\n\n` +
                "W załączniku znajdziesz pełną historię rozmowy.",
            )
            .setColor(0x5865f2)
            .setFooter({ text: `Serwer: ${guild.name}` })
            .setTimestamp();

          await owner.send({ embeds: [dmEmbed], files: [attachment] }).catch(() => {
            // użytkownik może mieć zablokowane PV — ignorujemy
          });
        }
      } catch {
        // błąd DM — kontynuujemy usuwanie
      }
    }

    // Usuń kanał po chwili
    setTimeout(async () => {
      try {
        await channel.delete(`Ticket zamknięty przez ${guildMember.user.tag}`);
      } catch {
        // kanał mógł już zostać usunięty
      }
    }, 3000);
  }
}
