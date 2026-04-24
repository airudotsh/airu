#!/usr/bin/env bun
/**
 * airu-cli - AI 채팅 CLI
 */
import { Command } from 'commander';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { GLMProvider } from './providers/glm';
import { OllamaProvider } from './providers/ollama';
import { registry } from './core/registry';
import type { IModelProvider, ChatMessage, StreamChunk } from './core/provider';
import { loadConfig, saveConfig, ensureDefaultConfig, getConfigPath } from './core/config';

const HELP_TEXT = `
\x1b[1m사용 가능한 명령어:\x1b[0m
  /model <name>    - 모델 전환
  /provider <name> - 프로바이더 전환 (glm, ollama)
  /clear           - 대화 히스토리 초기화
  /models          - 사용 가능한 모델 목록
  /tools           - 등록된 툴 목록
  /help            - 이 도움말 표시
  /exit            - 종료`;

let shouldExit = false;

interface ChatOptions {
  model?: string;
  provider?: string;
  system?: string;
}

/** Provider 인스턴스 생성 */
function createProvider(name: string, config: ReturnType<typeof ensureDefaultConfig>): IModelProvider {
  if (name === 'glm') {
    const p = new GLMProvider();
    p.initialize({ apiKey: config.glmApiKey, baseUrl: config.glmBaseUrl });
    return p;
  }
  if (name === 'ollama') {
    const p = new OllamaProvider();
    p.initialize({ baseUrl: config.ollamaUrl });
    return p;
  }
  throw new Error(`Unknown provider: ${name}`);
}

async function runChat(options: ChatOptions): Promise<void> {
  const config = ensureDefaultConfig();
  const providerName = options.provider || config.provider || 'glm';
  const provider = createProvider(providerName, config);
  // initialize is async but we called it in createProvider
  await (provider as GLMProvider | OllamaProvider).initialize?.(
    providerName === 'glm'
      ? { apiKey: config.glmApiKey, baseUrl: config.glmBaseUrl }
      : { baseUrl: config.ollamaUrl }
  );

  const model = options.model || config.model || 'glm-5.1';
  const systemPrompt = options.system || config.systemPrompt;

  // 컨텍스트
  const messages: ChatMessage[] = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  let currentModel = model;
  let currentProvider = providerName;
  let activeProvider = provider;

  console.log(`\x1b[36m[airu]\x1b[0m ${currentProvider}/${currentModel} (도움말: /help)`);
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

    if (trimmed.startsWith('/model ')) {
      currentModel = trimmed.slice(7).trim();
      console.log(`\x1b[36m[모델 전환: ${currentModel}]\x1b[0m`);
      return true;
    }

    if (trimmed.startsWith('/provider ')) {
      const newName = trimmed.slice(10).trim();
      try {
        activeProvider = createProvider(newName, config);
        currentProvider = newName;
        console.log(`\x1b[36m[프로바이더 전환: ${currentProvider}]\x1b[0m`);
      } catch (e) {
        console.log(`\x1b[31m[알 수 없는 프로바이더: ${newName}]\x1b[0m`);
      }
      return true;
    }

    return false;
  }

  async function sendMessage(content: string): Promise<void> {
    isGenerating = true;
    messages.push({ role: 'user', content });

    abortController = new AbortController();
    let fullResponse = '';

    process.stdout.write('\x1b[35m...\x1b[0m ');

    await activeProvider.chat(messages, {
      model: currentModel,
      signal: abortController.signal,
      onChunk: (chunk: StreamChunk) => {
        switch (chunk.type) {
          case 'content':
            if (chunk.content) process.stdout.write(chunk.content);
            fullResponse += chunk.content ?? '';
            break;
          case 'thinking':
            break;
          case 'error':
            console.log(`\n\x1b[31m[오류] ${chunk.error}\x1b[0m`);
            break;
          case 'done':
            console.log();
            break;
        }
      },
    });

    if (fullResponse) {
      messages.push({ role: 'assistant', content: fullResponse });
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

// 명령어: init
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
  console.log(`\x1b[2mAPI 키를 설정하려면 ${configDir}/.env 파일을 생성하세요.\x1b[0m`);
}

// 명령어: model list
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

// 명령어: status
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
  console.log();
}

// 메인
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

// 파이프 모드 감지: chat 명령이고 stdin이 파이프일 때만
if (!process.stdin.isTTY && process.argv.includes('chat')) {
  await runPipeMode();
} else {
  program.parse();
}

async function runPipeMode(): Promise<void> {
  const chunks: string[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk.toString());
  }

  const input = chunks.join('');
  const lines = input.split('\n').filter(l => l.trim());
  if (lines.length === 0) return;

  console.log(`\x1b[36m[airu pipe mode]\x1b[0m\n`);

  const config = ensureDefaultConfig();
  const provider = createProvider(config.provider || 'glm', config);
  await (provider as GLMProvider | OllamaProvider).initialize?.(
    (config.provider || 'glm') === 'glm'
      ? { apiKey: config.glmApiKey, baseUrl: config.glmBaseUrl }
      : { baseUrl: config.ollamaUrl }
  );

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('/')) {
      if (trimmed === '/help') { console.log(HELP_TEXT); continue; }
      if (trimmed === '/exit' || trimmed === '/quit') { break; }
      if (trimmed === '/models') {
        console.log(`\x1b[1m사용 가능한 모델:\x1b[0m ${provider.supportedModels.join(', ')}`);
        continue;
      }
      continue;
    }

    let fullResponse = '';
    await provider.chat([{ role: 'user', content: trimmed }], {
      model: config.model,
      onChunk: (chunk: StreamChunk) => {
        if (chunk.type === 'content') {
          if (chunk.content) process.stdout.write(chunk.content);
          fullResponse += chunk.content ?? '';
        }
        if (chunk.type === 'error') {
          console.log(`\n\x1b[31m[오류] ${chunk.error}\x1b[0m`);
        }
      },
    });
    console.log();
  }
}
