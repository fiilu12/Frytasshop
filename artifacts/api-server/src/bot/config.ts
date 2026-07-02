import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, "../../bot-config.json");

export interface PendingDeletion {
  channelId: string;
  ownerId: string;
  deleteAt: number; // Unix timestamp ms
}

interface BotConfig {
  proposalChannels: string[];
  ticketCategory: string | null;
  verifyMessageId: string | null;
  pendingDeletions: PendingDeletion[]; // closed tickets awaiting 24h deletion
}

let config: BotConfig = {
  proposalChannels: [],
  ticketCategory: null,
  verifyMessageId: null,
  pendingDeletions: [],
};

export function loadConfig(): void {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
      config = { ...config, ...JSON.parse(raw) };
    }
  } catch {
    // use defaults
  }
}

export function saveConfig(): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

export function getConfig(): BotConfig {
  return config;
}

export function addProposalChannel(channelId: string): void {
  if (!config.proposalChannels.includes(channelId)) {
    config.proposalChannels.push(channelId);
    saveConfig();
  }
}

export function removeProposalChannel(channelId: string): void {
  config.proposalChannels = config.proposalChannels.filter((id) => id !== channelId);
  saveConfig();
}

export function setVerifyMessageId(id: string): void {
  config.verifyMessageId = id;
  saveConfig();
}

export function setTicketCategory(id: string | null): void {
  config.ticketCategory = id;
  saveConfig();
}

/** Dodaje ticket do kolejki usunięcia za 24h. */
export function scheduleDeletion(channelId: string, ownerId: string): void {
  // Usuń ewentualny poprzedni wpis dla tego kanału
  config.pendingDeletions = config.pendingDeletions.filter((d) => d.channelId !== channelId);
  config.pendingDeletions.push({
    channelId,
    ownerId,
    deleteAt: Date.now() + 24 * 60 * 60 * 1000,
  });
  saveConfig();
}

/** Usuwa ticket z kolejki usunięcia (np. po faktycznym usunięciu kanału). */
export function removeDeletion(channelId: string): void {
  config.pendingDeletions = config.pendingDeletions.filter((d) => d.channelId !== channelId);
  saveConfig();
}

/** Sprawdza czy użytkownik ma aktywny (otwarty) ticket — nie liczy zamkniętych oczekujących na usunięcie. */
export function hasOpenTicket(ownerId: string): boolean {
  // Zamknięte tickety (pending deletion) NIE blokują nowego ticketu
  return false; // logika oparta na nazwie kanału — sprawdzana w handlerze
}

/** Zwraca listę zamkniętych ticketów danego użytkownika oczekujących na usunięcie. */
export function getPendingDeletionsForUser(ownerId: string): PendingDeletion[] {
  return config.pendingDeletions.filter((d) => d.ownerId === ownerId);
}
