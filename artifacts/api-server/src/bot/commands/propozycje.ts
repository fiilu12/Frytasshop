import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
  type ChatInputCommandInteraction,
  type TextChannel,
} from "discord.js";
import { addProposalChannel, removeProposalChannel, getConfig } from "../config.js";

export const propozycjeCommand = {
  data: new SlashCommandBuilder()
    .setName("propozycje")
    .setDescription("Zarządza kanałem propozycji")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName("ustaw")
        .setDescription("Ustawia kanał jako kanał propozycji")
        .addChannelOption((opt) =>
          opt
            .setName("kanal")
            .setDescription("Kanał do propozycji")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("usun")
        .setDescription("Usuwa kanał z listy kanałów propozycji")
        .addChannelOption((opt) =>
          opt
            .setName("kanal")
            .setDescription("Kanał do usunięcia")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("lista").setDescription("Pokazuje listę kanałów propozycji")
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const sub = interaction.options.getSubcommand();

    if (sub === "ustaw") {
      const channel = interaction.options.getChannel("kanal") as TextChannel;
      addProposalChannel(channel.id);

      const embed = new EmbedBuilder()
        .setTitle("💡 Kanał Propozycji Ustawiony")
        .setDescription(
          `Kanał ${channel} jest teraz kanałem propozycji.\n\n` +
            "Każda wiadomość wysłana na tym kanale zostanie automatycznie zamieniona w propozycję z opcją głosowania."
        )
        .setColor(0x57f287)
        .setTimestamp();

      await channel.send({ embeds: [embed] });
      await interaction.editReply({ content: `✅ Kanał ${channel} ustawiony jako kanał propozycji!` });
    } else if (sub === "usun") {
      const channel = interaction.options.getChannel("kanal") as TextChannel;
      removeProposalChannel(channel.id);
      await interaction.editReply({ content: `✅ Kanał ${channel} usunięty z listy propozycji!` });
    } else if (sub === "lista") {
      const { proposalChannels } = getConfig();
      if (proposalChannels.length === 0) {
        await interaction.editReply({ content: "❌ Brak skonfigurowanych kanałów propozycji." });
        return;
      }
      const list = proposalChannels.map((id) => `<#${id}>`).join("\n");
      await interaction.editReply({ content: `📋 **Kanały propozycji:**\n${list}` });
    }
  },
};
