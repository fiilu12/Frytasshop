import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags,
  type ChatInputCommandInteraction,
} from "discord.js";
import { getConfig } from "../config.js";

export const sprawdzzaproCommand = {
  data: new SlashCommandBuilder()
    .setName("sprawdzzapro")
    .setDescription("Sprawdź statystyki zaproszeń użytkownika (tylko admin)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((opt) =>
      opt
        .setName("uzytkownik")
        .setDescription("Użytkownik do sprawdzenia")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const user = interaction.options.getUser("uzytkownik", true);
    const { inviteStats } = getConfig();
    const stats = inviteStats[user.id];

    if (!stats || stats.joined === 0) {
      await interaction.reply({
        content: `❌ <@${user.id}> nie zaprosił jeszcze nikogo.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const active = stats.joined - stats.left;

    const embed = new EmbedBuilder()
      .setTitle(`📊 Zaproszenia — ${user.username}`)
      .setThumbnail(user.displayAvatarURL())
      .setColor(0x5865f2)
      .addFields(
        { name: "✅ Dołączyło", value: String(stats.joined), inline: true },
        { name: "❌ Opuściło", value: String(stats.left), inline: true },
        { name: "👥 Aktywnych", value: String(active), inline: true },
      )
      .setFooter({ text: `ID: ${user.id}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
