import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type TextChannel,
} from "discord.js";
import { setVerifyMessageId } from "../config.js";

const VERIFY_CHANNEL_ID = process.env.VERIFY_CHANNEL_ID!;
const VERIFY_EMOJI = process.env.VERIFY_EMOJI ?? "✅";

export const weryfikacjaCommand = {
  data: new SlashCommandBuilder()
    .setName("weryfikacja")
    .setDescription("Wysyła wiadomość weryfikacyjną na kanał weryfikacji")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const channel = interaction.guild?.channels.cache.get(VERIFY_CHANNEL_ID) as TextChannel | undefined;

    if (!channel) {
      await interaction.editReply({
        content: `❌ Nie znaleziono kanału weryfikacji (ID: ${VERIFY_CHANNEL_ID}). Sprawdź zmienną VERIFY_CHANNEL_ID.`,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("✅ Weryfikacja")
      .setDescription(
        `Witaj na serwerze!\n\n` +
          `Aby uzyskać dostęp do pozostałych kanałów, musisz przejść weryfikację.\n\n` +
          `**Kliknij reakcję ${VERIFY_EMOJI} pod tą wiadomością**, aby zweryfikować się i uzyskać dostęp.`
      )
      .setImage("https://raw.githubusercontent.com/fiilu12/Frytasshop/main/artifacts/api-server/src/bot/assets/banner.jpg")
      .setColor(0x57f287)
      .setFooter({ text: "Weryfikacja członka serwera" })
      .setTimestamp();

    const msg = await channel.send({ embeds: [embed] });
    await msg.react(VERIFY_EMOJI);
    setVerifyMessageId(msg.id);

    await interaction.editReply({ content: `✅ Wiadomość weryfikacyjna została wysłana na ${channel}!` });
  },
};
