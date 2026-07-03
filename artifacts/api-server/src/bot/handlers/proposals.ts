import { EmbedBuilder, type Message, type MessageReaction, type User } from "discord.js";
import { getConfig } from "../config.js";

const YES = "✅";
const NO = "❌";

export async function handleProposalMessage(message: Message): Promise<void> {
  if (message.author.bot) return;
  if (!message.guild) return;

  const { proposalChannels } = getConfig();
  if (!proposalChannels.includes(message.channelId)) return;

  const content = message.content;
  const author = message.author;

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
      { name: `${YES} Tak`, value: "0", inline: true },
      { name: `${NO} Nie`, value: "0", inline: true }
    )
    .setImage("https://raw.githubusercontent.com/fiilu12/Frytasshop/main/artifacts/api-server/src/bot/assets/banner.jpg")
    .setFooter({ text: "Możesz zagłosować tylko na jedną opcję" })
    .setTimestamp();

  if (!message.channel.isSendable()) return;
  const proposalMsg = await message.channel.send({ embeds: [embed] });

  await proposalMsg.react(YES);
  await proposalMsg.react(NO);

  const collector = proposalMsg.createReactionCollector({
    filter: (r: MessageReaction) => [YES, NO].includes(r.emoji.name ?? ""),
    time: 7 * 24 * 60 * 60 * 1000, // 7 dni
    dispose: true,
  });

  collector.on("collect", async (reaction: MessageReaction, user: User) => {
    if (user.bot) return;

    // Usuń przeciwną reakcję jeśli użytkownik już głosował
    const opposite = reaction.emoji.name === YES ? NO : YES;
    const oppositeReaction = proposalMsg.reactions.cache.find(
      (r) => r.emoji.name === opposite
    );
    if (oppositeReaction) {
      try {
        await oppositeReaction.users.remove(user.id);
      } catch {
        // brak uprawnień do usuwania reakcji
      }
    }

    await updateProposalEmbed(proposalMsg);
  });

  collector.on("remove", async () => {
    await updateProposalEmbed(proposalMsg);
  });
}

async function updateProposalEmbed(message: Message): Promise<void> {
  try {
    // Odejmij 1 za reakcję samego bota
    const yes = Math.max(0, (message.reactions.cache.get(YES)?.count ?? 1) - 1);
    const no = Math.max(0, (message.reactions.cache.get(NO)?.count ?? 1) - 1);

    const oldEmbed = message.embeds[0];
    if (!oldEmbed) return;

    const embed = EmbedBuilder.from(oldEmbed).setFields(
      { name: `${YES} Tak`, value: String(yes), inline: true },
      { name: `${NO} Nie`, value: String(no), inline: true }
    );

    await message.edit({ embeds: [embed] });
  } catch {
    // wiadomość mogła zostać usunięta
  }
}
