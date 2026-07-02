import { EmbedBuilder, type Message } from "discord.js";
import { getConfig } from "../config.js";

const UPVOTE = "👍";
const DOWNVOTE = "👎";

export async function handleProposalMessage(message: Message): Promise<void> {
  if (message.author.bot) return;
  if (!message.guild) return;

  const { proposalChannels } = getConfig();
  if (!proposalChannels.includes(message.channelId)) return;

  // Pobierz treść przed usunięciem
  const content = message.content;
  const author = message.author;

  // Usuń oryginalną wiadomość
  try {
    await message.delete();
  } catch {
    // brak uprawnień — pomiń
  }

  const embed = new EmbedBuilder()
    .setTitle("💡 Nowa Propozycja")
    .setDescription(content)
    .setColor(0xfee75c)
    .setAuthor({
      name: message.member?.displayName ?? author.username,
      iconURL: author.displayAvatarURL(),
    })
    .addFields(
      { name: `${UPVOTE} Za`, value: "0", inline: true },
      { name: `${DOWNVOTE} Przeciw`, value: "0", inline: true }
    )
    .setFooter({ text: "Zagłosuj używając reakcji poniżej" })
    .setTimestamp();

  const proposalMsg = await message.channel.send({ embeds: [embed] });

  await proposalMsg.react(UPVOTE);
  await proposalMsg.react(DOWNVOTE);

  // Aktualizuj embed po każdej reakcji
  const collector = proposalMsg.createReactionCollector({
    filter: (r) => [UPVOTE, DOWNVOTE].includes(r.emoji.name ?? ""),
    time: 7 * 24 * 60 * 60 * 1000, // 7 dni
  });

  collector.on("collect", async () => {
    await updateProposalEmbed(proposalMsg);
  });

  collector.on("remove", async () => {
    await updateProposalEmbed(proposalMsg);
  });
}

async function updateProposalEmbed(message: Message): Promise<void> {
  try {
    const upvotes = (message.reactions.cache.get("👍")?.count ?? 1) - 1;
    const downvotes = (message.reactions.cache.get("👎")?.count ?? 1) - 1;

    const oldEmbed = message.embeds[0];
    if (!oldEmbed) return;

    const embed = EmbedBuilder.from(oldEmbed).setFields(
      { name: `👍 Za`, value: String(upvotes), inline: true },
      { name: `👎 Przeciw`, value: String(downvotes), inline: true }
    );

    await message.edit({ embeds: [embed] });
  } catch {
    // wiadomość mogła zostać usunięta
  }
}
