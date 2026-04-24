#!/usr/bin/env bun
/**
 * airu-cli - AI 채팅 CLI
 * Sprint 2: 툴 에이전트 루프 + 대화 컨텍스트 압축
 */
import { Command } from 'commander';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { GLMProvider } from './providers/glm';
import { OllamaProvider } from './providers/ollama';
import { registry } from './core/registry';
import { toolRegistry } from './core/tools/registry';
import { runAgentLoop } from './core/agent';
import type {
  IModelProvider,
  ChatMessage,
  StreamChunk,
} from './core/provider';
import { loadConfig, saveConfig, ensureDefaultConfig, getConfigPath } from './core/config';

// 툴 등록
import { TerminalTool } from './tools/terminal';
import { FileReadTool, FileWriteTool, FileSearchTool } from './tools/file';
import { WebSearchTool, WebFetchTool } from './tools/web';

function registerTools(): void {
  toolRegistry.register(new TerminalTool());
  toolRegistry.register(new FileReadTool());
  toolRegistry.register(new FileWriteTool());
  toolRegistry.register(new FileSearchTool());
  toolRegistry.register(new WebSearchTool());
  toolRegistry.register(new WebFetchTool());
}

const HELP_TEXT = `
\x1b[1m사용 가능한 명령어:\x1b[0m
  /model <name>    - 모델 전환
  /provider <name> - 프로바이더 전환 (glm, ollama)
  /clear           - 대화 히스토리 초기화
  /models          - 사용 가능한 모델 목록
  /tools           - 등록된 툴 목록
  /help            - 이 도움말 표시
  /exit            - 종료`;

const WELCOME_TEXT = `
\x1b[1m\x1b[36m  _                        _
 / \\   _ __   _____      _| |
/ _ \\ | '_ \\ / _ \\ \\ /\\ / / |
/ ___ \\| | | | (_) \\ V  V /| |
/_/   \\_\\_| |_|\\___/ \\_/\\_/ |_|
\x1b[0m

\x1b[2mAI 채팅 CLI — 시작하려면 메시지를 입력하세요\x1b[0m`;

let shouldExit = false;

interface ChatOptions {
  model?: string;
  provider?: string;
  system?: string;
}

// --- Provider ---
async function createAndInitProvider(
  name: string,
  config: ReturnType<typeof ensureDefaultConfig>,
): Promise<IModelProvider> {
  let provider: IModelProvider;
  if (name === 'glm') {
    provider = new GLMProvider();
    await provider.initialize({ apiKey: config.glmApiKey, baseUrl: config.glmBaseUrl });
  } else if (name === 'ollama') {
    provider = new OllamaProvider();
    await provider.initialize({ baseUrl: config.ollamaUrl });
  } else {
    throw new Error(`알 수 없는 프로바이더: ${name} (사용 가능: glm, ollama)`);
  }
  return provider;
}

function isAuthError(error: string): boolean {
  return /401|403|token expired|incorrect|unauthorized/i.test(error);
}

function formatError(error: string): string {
  if (isAuthError(error)) {
    return `API 키가 유효하지 않습니다.\n  ~/.airu/.env 파일에 ZAI_API_KEY를 설정하세요.`;
  }
  return error;
}

// --- 채팅 실행 ---
async function runChat(options: ChatOptions): Promise<void> {
  const config = ensureDefaultConfig();
  const providerName = options.provider || config.provider || 'glm';

  let activeProvider: IModelProvider;
  try {
    activeProvider = await createAndInitProvider(providerName, config);
  } catch (e) {
    console.log(`\x1b[31m[오류] ${(e as Error).message}\x1b[0m`);
    return;
  }

  const model = options.model || config.model || 'glm-5.1';
  const systemPrompt = options.system || config.systemPrompt;

  const messages: ChatMessage[] = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  let currentModel = model;
  let currentProvider = providerName;

  console.log(WELCOME_TEXT);
  console.log(`\x1b[2m  ${currentProvider}/${currentModel}  |  /help\x1b[0m`);
  console.log();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '\x1b[32m>\x1b[0m ',
  });

  let abortController: AbortController | null = null;
  let isGenerating = false;

  rl.on('SIGINT', () => {
    if (isGenerating && abortController) {
      abortController.abort();
      console.log('\n\x1b[33m[중단됨]\x1b[0m');
      rl.prompt();
    } else {
      console.log('\n\x1b[33m[종료]\x1b[0m');
      rl.close();
      shouldExit = true;
    }
  });

  function handleCommand(input: string): boolean {
    const trimmed = input.trim();

    if (trimmed === '/exit' || trimmed === '/quit') {
      console.log('\x1b[33m[종료]\x1b[0m');
      rl.close();
      shouldExit = true;
      return true;
    }

    if (trimmed === '/help') {
      console.log(HELP_TEXT);
      return true;
    }

    if (trimmed === '/clear') {
      messages.length = 0;
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      console.log('\x1b[36m[대화가 초기화되었습니다]\x1b[0m');
      return true;
    }

    if (trimmed === '/models') {
      console.log(`\n\x1b[1m사용 가능한 모델:\x1b[0m`);
      for (const m of activeProvider.supportedModels) {
        console.log(`  \x1b[33m${m}\x1b[0m`);
      }
      console.log();
      return true;
    }

    if (trimmed === '/tools') {
      const tools = toolRegistry.all();
      if (tools.length === 0) {
        console.log('\x1b[2m등록된 툴이 없습니다\x1b[0m');
      } else {
        console.log(`\n\x1b[1m등록된 툴:\x1b[0m`);
        for (const tool of tools) {
          console.log(`  \x1b[33m${tool.name}\x1b[0m  ${tool.description}`);
        }
        console.log();
      }
      return true;
    }

    if (trimmed.startsWith('/model ')) {
      currentModel = trimmed.slice(7).trim();
      console.log(`\x1b[36m[모델 전환: ${currentModel}]\x1b[0m`);
      return true;
    }

    if (trimmed.startsWith('/provider ')) {
      const newName = trimmed.slice(10).trim();
      createAndInitProvider(newName, config)
        .then((p) => {
          activeProvider = p;
          currentProvider = newName;
          console.log(`\x1b[36m[프로바이더 전환: ${currentProvider}]\x1b[0m`);
          rl.prompt();
        })
        .catch((e) => {
          console.log(`\x1b[31m[${(e as Error).message}]\x1b[0m`);
          rl.prompt();
        });
      return true;
    }

    return false;
  }

  /** 사용자 메시지 전송 + 툴 에이전트 루프 */
  async function sendMessage(content: string): Promise<void> {
    isGenerating = true;
    messages.push({ role: 'user', content });

    abortController = new AbortController();
    process.stdout.write('\x1b[35m...\x1b[0m ');

    const { content: assistantContent, hadError } = await runAgentLoop(
      activeProvider,
      currentModel,
      messages,
      { signal: abortController.signal },
    );

    if (hadError || (!assistantContent && messages[messages.length - 1]?.role !== 'tool')) {
      // provider/network error — last message in messages is already error or empty
      // formatError applied inside runAgentLoop via agent.ts console output
    }

    if (!assistantContent && !hadError) {
      // empty response, already printed by runAgentLoop
    }

    isGenerating = false;
    abortController = null;
  }

  rl.prompt();

  for await (const line of rl) {
    if (shouldExit) break;
    const input = line.trim();

    if (!input) { rl.prompt(); continue; }

    if (input.startsWith('/')) {
      if (!handleCommand(input)) {
        console.log('\x1b[31m[알 수 없는 명령어]\x1b[0m /help를 참조하세요.');
      }
      if (shouldExit) break;
      rl.prompt();
      continue;
    }

    await sendMessage(input);
    if (shouldExit) break;
    rl.prompt();
  }
}

// --- 명령어들 ---
function runInit(): void {
  const configDir = path.join(os.homedir(), '.airu');
  const configPath = path.join(configDir, 'airu.config.yaml');

  if (fs.existsSync(configPath)) {
    console.log(`\x1b[33m[설정 파일이 이미 존재합니다: ${configPath}]\x1b[0m`);
    return;
  }

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  saveConfig({
    model: 'glm-5.1',
    provider: 'glm',
    glmBaseUrl: 'https://api.z.ai/api/coding/paas/v4/chat/completions',
    ollamaUrl: 'http://localhost:11434',
    systemPrompt: '당신은 가리, 충직한 AI 어시스턴트입니다.',
  });

  console.log(`\x1b[36m[설정 파일이 생성되었습니다: ${configPath}]\x1b[0m`);
  console.log(`\x1b[2mAPI 키를 설정하세요:\x1b[0m`);
  console.log(`\x1b[2m  echo "ZAI_API_KEY=*** > ${configDir}/.env\x1b[0m`);
  console.log(`\x1b[2m  airu chat\x1b[0m`);
}

function runModelList(): void {
  const glm = new GLMProvider();
  const ollama = new OllamaProvider();

  console.log(`\n\x1b[1m등록된 모델:\x1b[0m`);
  console.log(`\n  \x1b[1mGLM (ZAI API):\x1b[0m`);
  for (const m of glm.supportedModels) {
    console.log(`    \x1b[33m${m}\x1b[0m`);
  }
  console.log(`\n  \x1b[1mOllama (로컬):\x1b[0m`);
  if (ollama.supportedModels.length === 0) {
    console.log(`    \x1b[2m(Ollama 서버가 실행 중이 아님)\x1b[0m`);
  } else {
    for (const m of ollama.supportedModels) {
      console.log(`    \x1b[33m${m}\x1b[0m`);
    }
  }
  console.log();
}

function runStatus(): void {
  const config = loadConfig();
  const configPath = getConfigPath();

  console.log(`\n\x1b[1mairu-cli 상태:\x1b[0m`);
  console.log(`  설정 파일: ${configPath}`);
  console.log(`  기본 모델: ${config.model || '(미설정)'}`);
  console.log(`  기본 프로바이더: ${config.provider || '(미설정)'}`);
  console.log(`  GLM 엔드포인트: ${config.glmBaseUrl || '(미설정)'}`);
  console.log(`  Ollama URL: ${config.ollamaUrl || '(미설정)'}`);
  console.log(`  API 키: ${process.env.ZAI_API_KEY ? '\x1b[32m설정됨\x1b[0m' : '\x1b[31m미설정\x1b[0m'}`);

  if (!process.env.ZAI_API_KEY) {
    console.log(`\n  \x1b[33mAPI 키가 설정되지 않았습니다.\x1b[0m`);
    console.log(`  \x1b[2mecho "ZAI_API_KEY=*** > ~/.airu/.env\x1b[0m`);
  }

  const tools = toolRegistry.all();
  if (tools.length > 0) {
    console.log(`  등록된 툴: ${tools.map(t => t.name).join(', ')}`);
  }

  console.log();
}

function runOnboarding(): void {
  console.log(WELCOME_TEXT);
  console.log();

  const hasConfig = fs.existsSync(getConfigPath());
  const hasApiKey = !!process.env.ZAI_API_KEY;

  if (!hasConfig) {
    console.log('\x1b[1m시작하기:\x1b[0m');
    console.log('  \x1b[33mairu init\x1b[0m      — 설정 파일 생성');
    console.log('  \x1b[33mairu chat\x1b[0m     — 채팅 시작');
    console.log();
  } else if (!hasApiKey) {
    console.log('\x1b[33mAPI 키가 설정되지 않았습니다.\x1b[0m');
    console.log('  \x1b[2mecho "ZAI_API_KEY=*** > ~/.airu/.env\x1b[0m');
    console.log('  \x1b[33mairu chat\x1b[0m');
    console.log();
  } else {
    console.log('\x1b[1m명령어:\x1b[0m');
    console.log('  \x1b[33mairu chat\x1b[0m     — 채팅 시작');
    console.log('  \x1b[33mairu status\x1b[0m   — 현재 설정 확인');
    console.log('  \x1b[33mairu model list\x1b[0m — 사용 가능한 모델');
    console.log();
  }

  console.log('\x1b[2m자세한 도움말: airu --help\x1b[0m');
  console.log();
}

// --- 메인 ---
const program = new Command();
program
  .name('airu')
  .description('airu-cli - AI 채팅 CLI')
  .version('1.0.0');

program
  .command('chat')
  .description('채팅 시작')
  .option('-m, --model <name>', '사용할 모델')
  .option('-p, --provider <name>', '사용할 프로바이더 (glm, ollama)')
  .option('-s, --system <prompt>', '시스템 프롬프트')
  .action(runChat);

program
  .command('init')
  .description('설정 파일 생성 (~/.airu/airu.config.yaml)')
  .action(runInit);

program
  .command('model')
  .description('모델 관리')
  .command('list')
  .description('사용 가능한 모델 목록')
  .action(runModelList);

program
  .command('status')
  .description('현재 설정 상태 표시')
  .action(runStatus);

// 툴 등록
registerTools();

// 파이프 모드 감지
if (!process.stdin.isTTY && process.argv.includes('chat')) {
  await runPipeMode();
} else {
  const hasCommand = process.argv.length > 2;
  if (!hasCommand) {
    runOnboarding();
  } else {
    program.parse();
  }
}

// --- 파이프 모드 ---
async function runPipeMode(): Promise<void> {
  const chunks: string[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk.toString());
  }

  const input = chunks.join('');
  const lines = input.split('\n').filter(l => l.trim());
  if (lines.length === 0) return;

  const config = ensureDefaultConfig();
  const provider = await createAndInitProvider(config.provider || 'glm', config);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('/')) {
      if (trimmed === '/help') { console.log(HELP_TEXT); continue; }
      if (trimmed === '/exit' || trimmed === '/quit') { break; }
      if (trimmed === '/models') {
        console.log(`사용 가능한 모델: ${provider.supportedModels.join(', ')}`);
        continue;
      }
      if (trimmed === '/tools') {
        const tools = toolRegistry.all();
        if (tools.length === 0) {
          console.log('등록된 툴이 없습니다');
        } else {
          for (const tool of tools) {
            console.log(`  ${tool.name}  ${tool.description}`);
          }
        }
        continue;
      }
      continue;
    }

    // 파이프 모드에서는 툴 없이 단순 응답만
    let fullResponse = '';
    await provider.chat([{ role: 'user', content: trimmed }], {
      model: config.model,
      onChunk: (chunk: StreamChunk) => {
        if (chunk.type === 'content') {
          if (chunk.content) process.stdout.write(chunk.content);
          fullResponse += chunk.content ?? '';
        }
        if (chunk.type === 'error') {
          console.log(`\n[오류] ${formatError(chunk.error ?? 'unknown error')}`);
        }
      },
    });
    console.log();
  }
}
