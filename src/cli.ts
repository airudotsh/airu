#!/usr/bin/env bun
/**
 * airu-cli - AI 채팅 CLI
 */
import { Command } from 'commander';
import * as readline from 'readline';
import { GLMProvider } from './providers/glm';
import { OllamaProvider } from './providers/ollama';
import type { ChatMessage, StreamChunk } from './core/provider';
import { ensureDefaultConfig } from './core/config';
import { ChatContext } from './context';

const program = new Command();

interface ChatOptions {
  model?: string;
  provider?: string;
  system?: string;
}

async function runChat(options: ChatOptions): Promise<void> {
  const config = ensureDefaultConfig();
  
  // Provider 선택
  const providerName = options.provider || config.provider || 'glm';
  let provider: InstanceType<typeof GLMProvider> | InstanceType<typeof OllamaProvider>;
  
  if (providerName === 'glm') {
    provider = new GLMProvider();
    await provider.initialize({
      apiKey: config.glmApiKey,
      baseUrl: config.glmBaseUrl,
    });
  } else if (providerName === 'ollama') {
    provider = new OllamaProvider();
    await provider.initialize({
      baseUrl: config.ollamaUrl,
    });
  } else {
    console.error(`Unknown provider: ${providerName}`);
    process.exit(1);
  }

  // 모델 선택
  const model = options.model || config.model || 'glm-5.1';
  const systemPrompt = options.system || config.systemPrompt;

  // 컨텍스트 생성
  const context = new ChatContext('main', systemPrompt);

  console.log(`\x1b[36m[airu]\x1b[0m ${providerName}/${model} (도움말: /help)`);
  console.log();

  // 채팅 루프
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '\x1b[32m>\x1b[0m ',
  });

  let currentModel = model;
  let abortController: AbortController | null = null;
  let isGenerating = false;

  // Ctrl+C 핸들러
  rl.on('SIGINT', () => {
    if (isGenerating && abortController) {
      abortController.abort();
      console.log('\n\x1b[33m[중단됨]\x1b[0m');
      rl.prompt();
    } else {
      console.log('\n\x1b[33m[종료]\x1b[0m');
      process.exit(0);
    }
  });

  // 명령어 처리
  function handleCommand(input: string): boolean {
    const trimmed = input.trim();
    
    if (trimmed === '/exit' || trimmed === '/quit') {
      console.log('\x1b[33m[종료]\x1b[0m');
      process.exit(0);
    }
    
    if (trimmed === '/help') {
      console.log(`
\x1b[1m사용 가능한 명령어:\x1b[0m
  /model <name>  - 모델 전환
  /provider <name> - 프로바이더 전환 (glm, ollama)
  /clear         - 대화 히스토리 초기화
  /models        - 사용 가능한 모델 목록
  /help          - 이 도움말 표시
  /exit          - 종료
`);
      return true;
    }
    
    if (trimmed === '/clear') {
      context.clear();
      console.log('\x1b[36m[대화가 초기화되었습니다]\x1b[0m');
      return true;
    }
    
    if (trimmed === '/models') {
      console.log(`\n\x1b[1m사용 가능한 모델:\x1b[0m`);
      for (const m of provider.supportedModels) {
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
      console.log(`\x1b[36m[프로바이더 전환: ${trimmed.slice(10).trim()}]\x1b[0m`);
      return true;
    }
    
    return false;
  }

  // 메시지 전송
  async function sendMessage(content: string): Promise<void> {
    isGenerating = true;
    
    context.addMessage('user', content);
    
    const messages: ChatMessage[] = context.allMessages.map(m => ({
      role: m.role,
      content: m.content,
      tool_calls: m.tool_calls,
      tool_call_id: m.tool_call_id,
    }));
    
    abortController = new AbortController();
    let fullResponse = '';
    
    process.stdout.write('\x1b[35m...\x1b[0m ');
    
    await provider.chat(messages, {
      model: currentModel,
      signal: abortController.signal,
      onChunk: (chunk: StreamChunk) => {
        switch (chunk.type) {
          case 'content':
            if (chunk.content) process.stdout.write(chunk.content);
            fullResponse += chunk.content ?? '';
            break;
          case 'thinking':
            // stderr로 처리 (표시 안함)
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
      context.addMessage('assistant', fullResponse);
    }
    
    isGenerating = false;
    abortController = null;
  }

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    
    if (!input) {
      rl.prompt();
      return;
    }
    
    if (input.startsWith('/')) {
      if (!handleCommand(input)) {
        console.log('\x1b[31m[알 수 없는 명령어]\x1b[0m /help를 참조하세요.');
      }
      rl.prompt();
      return;
    }
    
    await sendMessage(input);
    rl.prompt();
  });
}

// 메인
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

// 파이프 모드
async function runPipeMode(): Promise<void> {
  const chunks: string[] = [];
  
  // stdin에서 데이터 수집
  for await (const chunk of process.stdin) {
    chunks.push(chunk.toString());
  }
  
  const input = chunks.join('');
  const lines = input.split('\n').filter(l => l.trim());
  
  if (lines.length === 0) return;
  
  console.log(`\x1b[36m[airu pipe mode]\x1b[0m\n`);
  
  const config = ensureDefaultConfig();
  const provider = new GLMProvider();
  await provider.initialize({});
  
  // 라인별 처리
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    if (trimmed.startsWith('/')) {
      // 명령어 처리
      if (trimmed === '/help') {
        console.log(`
\x1b[1m사용 가능한 명령어:\x1b[0m
  /model <name>  - 모델 전환
  /provider <name> - 프로바이더 전환 (glm, ollama)
  /clear         - 대화 히스토리 초기화
  /models        - 사용 가능한 모델 목록
  /help          - 이 도움말 표시
  /exit          - 종료 (파이프 모드에서는 첫 /exit에서 종료)
`);
        continue;
      }
      if (trimmed === '/exit' || trimmed === '/quit') {
        console.log('\x1b[33m[파이프 모드 종료]\x1b[0m');
        break;
      }
      if (trimmed === '/models') {
        console.log(`\x1b[1m사용 가능한 모델:\x1b[0m ${provider.supportedModels.join(', ')}`);
        continue;
      }
      // 알 수 없는 명령어는 무시
      console.log(`\x1b[33m[명령어 무시: ${trimmed}]\x1b[0m`);
      continue;
    }
    
    // 채팅 메시지
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

// pipe 모드 감지
if (!process.stdin.isTTY) {
  await runPipeMode();
} else {
  program.parse();
}
