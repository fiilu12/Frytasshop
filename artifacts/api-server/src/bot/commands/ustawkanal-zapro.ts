import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  type ChatInputCommandInteraction,
  ChannelType,
} from "discord.js";
import { setInviteChannel } from "../config.js";

export const ustawkanalZaproCommand = {
  data: new SlashCommandBuilder()
    .setName("ustawkanal_zapro")
    .setDescription("Ustaw kanał powiadomień o zaproszeniach")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((opt) =>
      opt
        .setName("kanal")
        .setDescription("Kanał na powiadomienia")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const channel = interaction.options.getChannel("kanal", true);
    setInviteChannel(channel.id);
    await interaction.reply({
      content: `✅ Powiadomienia o zaproszeniach będą wysyłane na <#${channel.id}>.`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
