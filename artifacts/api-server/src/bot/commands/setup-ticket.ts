import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
} from "discord.js";

export const setupTicketCommand = {
  data: new SlashCommandBuilder()
    .setName("setup-ticket")
    .setDescription("Ustawia panel ticketów na tym kanale")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle("🎫 System Ticketów")
      .setDescription(
        "Masz problem lub pytanie? Otwórz ticket, a nasz zespół pomoże Ci jak najszybciej!\n\n" +
          "📌 **Jak to działa?**\n" +
          "• Kliknij przycisk poniżej\n" +
          "• Zostanie utworzony prywatny kanał\n" +
          "• Opisz swój problem\n" +
          "• Poczekaj na odpowiedź moderatora"
      )
      .setColor(0x5865f2)
      .setFooter({ text: "System Ticketów" })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_create")
        .setLabel("Otwórz Ticket")
        .setEmoji("🎫")
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.channel!.send({ embeds: [embed], components: [row] });
    await interaction.editReply({ content: "✅ Panel ticketów został ustawiony!" });
  },
};
