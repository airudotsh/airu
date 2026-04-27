/// <reference types="node" />
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

function loadEnvFile(envPath: string): void {
  if (!fs.existsSync(envPath)) return;
  try { fs.chmodSync(envPath, 0o600); } catch { /* Windows */ }
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && !process.env[key]) process.env[key] = value;
  }
}

const envDir = path.join(os.homedir(), '.airu');
if (!fs.existsSync(envDir)) fs.mkdirSync(envDir, { recursive: true, mode: 0o700 });
loadEnvFile(path.join(envDir, '.env'));

export function maskSecret(text: string): string {
  return text.replace(/([A-Za-z0-9]{8})[A-Za-z0-9]{16,}([A-Za-z0-9]{4})/g, '$1****$2');
}

export interface AiruConfig {
  [key: string]: string | undefined;
  model?: string;
  provider?: string;
  glmApiKey?: string;
  glmBaseUrl?: string;
  ollamaUrl?: string;
  systemPrompt?: string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

const CONFIG_FILE_NAME = 'airu.config.yaml';
const CONFIG_DIR = path.join(os.homedir(), '.airu');

export function getConfigPath(): string {
  return path.join(CONFIG_DIR, CONFIG_FILE_NAME);
}

export function loadConfig(): AiruConfig {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) return {} as AiruConfig;
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    return parseYaml(content) as AiruConfig;
  } catch {
    return {} as AiruConfig;
  }
}

export function saveConfig(config: AiruConfig): void {
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(getConfigPath(), stringifyYaml(config), 'utf-8');
}

function parseYaml(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    let value: string | undefined = trimmed.slice(colonIdx + 1).trim();
    if (value) {
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      value = value.replace(/\$\{([^}]+)\}/g, (_, envKey) => process.env[envKey] || '');
      result[key] = value;
    }
  }
  return result as AiruConfig;
}

function stringifyYaml(obj: Record<string, unknown>): string {
  const lines: string[] = ['# airu-cli configuration'];
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      if (typeof value === 'string' && (value.includes(':') || value.includes('#'))) {
        lines.push(`${key}: "${value}"`);
      } else {
        lines.push(`${key}: ${value}`);
      }
    }
  }
  return lines.join('\n') + '\n';
}

export function ensureDefaultConfig(): AiruConfig {
  const config = loadConfig();
  if (!config.model) config.model = 'glm-5.1';
  if (!config.provider) config.provider = 'glm';
  if (!config.glmBaseUrl) config.glmBaseUrl = 'https://api.z.ai/api/coding/paas/v4/chat/completions';
  if (!config.ollamaUrl) config.ollamaUrl = 'http://localhost:11434';
  if (!config.systemPrompt) config.systemPrompt = '당신은 가리, 충직한 AI 어시스턴트입니다.';
  return config;
}
