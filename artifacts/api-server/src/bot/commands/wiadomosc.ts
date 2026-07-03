import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  ChannelType,
  type ChatInputCommandInteraction,
  type TextChannel,
} from "discord.js";

const BANNER =
  "https://raw.githubusercontent.com/fiilu12/Frytasshop/main/artifacts/api-server/src/bot/assets/banner.jpg";

export const wiadomoscCommand = {
  data: new SlashCommandBuilder()
    .setName("wiadomosc")
    .setDescription("Wysyła reklamę sklepu na wybrany kanał")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((opt) =>
      opt
        .setName("kanal")
        .setDescription("Kanał, na który wysłać wiadomość")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const channel = interaction.options.getChannel("kanal") as TextChannel;

    const embed = new EmbedBuilder()
      .setTitle("🛒 FrytaShop — Najlepszy Shop!")
      .setDescription(
        "## 💰 Najlepszy shop\n\n" +
          "**3.5k** za **1 zł**\n\n" +
          "Za **10 zaproszeń** — **30k**!\n\n" +
          "> Zapraszaj znajomych i zbieraj nagrody 🎁"
      )
      .setImage(BANNER)
      .setColor(0xffd700)
      .setFooter({ text: "FrytaShop • Kliknij i dołącz!" })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    await interaction.editReply({ content: `✅ Wiadomość wysłana na ${channel}!` });
  },
};
