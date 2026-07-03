import { REST, Routes } from "discord.js";
import { setupTicketCommand } from "./commands/setup-ticket.js";
import { propozycjeCommand } from "./commands/propozycje.js";
import { weryfikacjaCommand } from "./commands/weryfikacja.js";
import { ustawkanalZaproCommand } from "./commands/ustawkanal-zapro.js";
import { sprawdzzaproCommand } from "./commands/sprawdzzapro.js";
import { wiadomoscCommand } from "./commands/wiadomosc.js";

const TOKEN = process.env.DISCORD_BOT_TOKEN!;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const GUILD_ID = process.env.DISCORD_GUILD_ID!;

const commands = [
  setupTicketCommand.data.toJSON(),
  propozycjeCommand.data.toJSON(),
  weryfikacjaCommand.data.toJSON(),
  ustawkanalZaproCommand.data.toJSON(),
  sprawdzzaproCommand.data.toJSON(),
  wiadomoscCommand.data.toJSON(),
];

const rest = new REST().setToken(TOKEN);

async function deploy() {
  console.log(`Rejestruję ${commands.length} komend...`);
  const data = await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
    body: commands,
  });
  console.log(`✅ Zarejestrowano ${(data as unknown[]).length} komend!`);
}

deploy().catch(console.error);
