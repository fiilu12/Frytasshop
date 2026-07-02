import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, "../../bot-config.json");

interface BotConfig {
  proposalChannels: string[]; // channel IDs configured for proposals
  ticketCategory: string | null; // category ID for ticket channels
  verifyMessageId: string | null; // message ID of verification message
}

let config: BotConfig = {
  proposalChannels: [],
  ticketCategory: null,
  verifyMessageId: null,
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
