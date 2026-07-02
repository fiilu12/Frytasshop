import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ChannelType,
  OverwriteType,
  PermissionFlagsBits,
  type ButtonInteraction,
  type GuildMember,
  type TextChannel,
} from "discord.js";

const SUPPORT_ROLE_NAME = "Moderator";

export async function handleTicketInteraction(interaction: ButtonInteraction): Promise<void> {
  const { customId, guild, member } = interaction;

  if (!guild || !member) return;

  if (customId === "ticket_create") {
    await interaction.deferReply({ ephemeral: true });

    const guildMember = member as GuildMember;
    const channelName = `ticket-${guildMember.user.username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20)}`;

    const existingChannel = guild.channels.cache.find(
      (ch) => ch.name === channelName && ch.type === ChannelType.GuildText
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

    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      permissionOverwrites,
      topic: `Ticket użytkownika ${guildMember.user.tag} | Otwarto: ${new Date().toLocaleString("pl-PL")}`,
    });

    const embed = new EmbedBuilder()
      .setTitle("🎫 Ticket Otwarty")
      .setDescription(
        `Witaj ${guildMember}!\n\n` +
          "Opisz swój problem lub pytanie, a nasz zespół pomoże Ci jak najszybciej.\n\n" +
          "Aby zamknąć ticket, kliknij przycisk poniżej."
      )
      .setColor(0x5865f2)
      .setFooter({ text: `Ticket | ${guildMember.user.tag}` })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket_close_${guildMember.id}`)
        .setLabel("Zamknij Ticket")
        .setEmoji("🔒")
        .setStyle(ButtonStyle.Danger)
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

  if (customId.startsWith("ticket_close_")) {
    await interaction.deferReply({ ephemeral: false });

    const guildMember = member as GuildMember;
    const isAdmin = guildMember.permissions.has(PermissionFlagsBits.Administrator);
    const supportRole = guild.roles.cache.find((r) => r.name === SUPPORT_ROLE_NAME);
    const hasSupportRole = supportRole ? guildMember.roles.cache.has(supportRole.id) : false;
    const ownerId = customId.replace("ticket_close_", "");
    const isOwner = guildMember.id === ownerId;

    if (!isAdmin && !hasSupportRole && !isOwner) {
      await interaction.editReply({ content: "❌ Nie masz uprawnień do zamknięcia tego ticketu." });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("🔒 Ticket Zamknięty")
      .setDescription(`Ticket zamknięty przez ${guildMember}.\nKanał zostanie usunięty za 5 sekund.`)
      .setColor(0xed4245)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    setTimeout(async () => {
      try {
        await interaction.channel?.delete();
      } catch {
        // kanał mógł już zostać usunięty
      }
    }, 5000);
  }
}
