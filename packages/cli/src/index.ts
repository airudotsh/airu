#!/usr/bin/env node
/**
 * airu-cli - AI 채팅 CLI
 * Sprint 2: 툴 에이전트 루프 + 대화 컨텍스트 압축
 */
import { Command } from 'commander';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { GLMProvider } from '@airu/plugins';
import { OllamaProvider } from '@airu/plugins';
import { registry } from '@airu/core';
import { toolRegistry } from '@airu/core';
import { methodRegistry } from '@airu/core';
import { patternRegistry } from '@airu/core';
import { registerAllPatterns } from '@airu/plugins';
import { Orchestrator } from '@airu/core';
import { SessionStore } from '@airu/core';
import { KnowledgeStore } from '@airu/core';
import { SkillRegistry } from '@airu/core';
import { runAgentLoop } from '@airu/core';
import type {
  IModelProvider,
  Message,
  StreamChunk,
} from '@airu/core';
import { loadConfig, saveConfig, ensureDefaultConfig, getConfigPath, maskSecret } from '@airu/core';
import { loadPlugins } from '@airu/plugins';

// 툴 등록
import { TerminalTool } from '@airu/plugins';
import { FileReadTool, FileWriteTool, FileSearchTool } from '@airu/plugins';
import { WebSearchTool, WebFetchTool } from '@airu/plugins';


loadPlugins();

// 전역 에러 핸들링
process.on('uncaughtException', (err) => {
  console.error(`\x1b[31m[치명적 오류] ${maskSecret((err as Error).message)}\x1b[0m`);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(`\x1b[31m[미처리 거부] ${maskSecret(String(reason))}\x1b[0m`);
  process.exit(1);
});

// 패턴 등록 (Sprint 5)
const allPatterns = registerAllPatterns();
for (const p of allPatterns) {
  patternRegistry.register(p);
}

const HELP_TEXT = `
\x1b[1m사용 가능한 명령어:\x1b[0m
  /model <name>    - 모델 전환
  /provider <name> - 프로바이더 전환 (glm, ollama)
  /clear           - 대화 히스토리 초기화
  /models          - 사용 가능한 모델 목록
  /tools           - 등록된 툴 목록
  /methods         - 활성화된 메서드 목록
  /patterns        - 패턴 분류 결과 표시
  /reflect         - 최근 회고 리포트 표시
  /growth          - 성장 추적 현황 표시
  /save            - 현재 세션을 지식베이스에 저장
  /remember <내용>  - 지식 저장
  /knowledge       - 저장된 지식 목록
  /skills          - 커스텀 스킬 목록
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
  tui?: boolean;
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
  // TUI 모드
  if (options.tui) {
    const { default: React } = await import('react');
    const { render } = await import('ink');
    const { TuiApp } = await import('./tui-app.js');

    const config = ensureDefaultConfig();
    const providerName = options.provider || config.provider || 'glm';
    const activeProvider = await createAndInitProvider(providerName, config);
    const model = options.model || config.model || 'glm-5.1';

    // 프로젝트 감지 (TUI 모드)
    let projectName = 'default';
    try {
      const gitRemote = execSync('git remote get-url origin 2>/dev/null', { cwd: process.cwd(), stdio: 'pipe' }).toString().trim();
      const match = gitRemote.match(/([^/]+?)(?:\.git)?$/);
      if (match) projectName = match[1];
    } catch { /* 기본값 사용 */ }
    const knowledgeStore = new KnowledgeStore(projectName);
    const skillRegistry = new SkillRegistry(projectName);

    const orchestrator = new Orchestrator({
      patternRegistry,
      methodRegistry,
      options: { enableReflection: true, enableGrowth: true },
      knowledgeStore,
      skillRegistry,
    });

    const sendMessage = async (content: string) => {
      return orchestrator.execute(activeProvider, model, [], content);
    };

    render(React.createElement(TuiApp, {
      provider: activeProvider,
      model,
      providerName,
      sendMessage,
    }));
    return;
  }

  // 기본 readline 모드
  const config = ensureDefaultConfig();
  const providerName = options.provider || config.provider || 'glm';

  // 프로젝트 감지
  let projectName = 'default';
  try {
    const gitRemote = execSync('git remote get-url origin 2>/dev/null', { cwd: process.cwd(), stdio: 'pipe' }).toString().trim();
    const match = gitRemote.match(/([^/]+?)(?:\.git)?$/);
    if (match) projectName = match[1];
  } catch {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'));
      if (pkg.name) projectName = pkg.name.replace(/[@/]/g, '-');
    } catch { /* 기본값 사용 */ }
  }
  const knowledgeStore = new KnowledgeStore(projectName);
  const skillRegistry = new SkillRegistry(projectName);

  let activeProvider: IModelProvider;
  try {
    activeProvider = await createAndInitProvider(providerName, config);
  } catch (e) {
    console.error(`\x1b[31m[오류] ${maskSecret((e as Error).message)}\x1b[0m`);
    return;
  }

  const model = options.model || config.model || 'glm-5.1';
  const systemPrompt = options.system || config.systemPrompt;

  // 툴 사용 안내 system prompt
  const toolNames = toolRegistry.all().map((t) => t.name);
  const toolSystemBase = [
    '당신은 airu CLI 어시스턴트입니다.',
    '사용 가능한 툴: ' + toolNames.join(', '),
    '파일, 터미널, 웹 검색 등의 작업이 필요하면 반드시 툴을 사용하세요.',
    '직접 방법을 알려주지 말고 툴로 직접 실행하세요.',
  ].join('\n');

  const effectiveSystemPrompt = systemPrompt
    ? `${toolSystemBase}\n\n${systemPrompt}`
    : toolSystemBase;

  const messages: Message[] = [];
  messages.push({ role: 'system', content: effectiveSystemPrompt });

  let currentModel = model;
  let currentProvider = providerName;

  // Orchestrator + 세션 (Sprint 6)
  const orchestrator = new Orchestrator({
    patternRegistry,
    methodRegistry,
    options: { enableReflection: true, enableGrowth: true, directionWarnThreshold: 5 },
    knowledgeStore,
    skillRegistry,
  });
  const sessionStore = new SessionStore();
  const session = sessionStore.create();

  console.log(WELCOME_TEXT);
  console.log(`\x1b[2m  ${currentProvider}/${currentModel}  |  세션: ${session.id.slice(-8)}  |  /help\x1b[0m`);
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
      messages.push({ role: 'system', content: effectiveSystemPrompt });
      console.log('\x1b[36m[대화가 초기화되었습니다]\x1b[0m');
      return true;
    }

    if (trimmed === '/save') {
      const sessionData = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => m.content)
        .filter(Boolean);
      const summary = sessionData.slice(-6).map(c => c.slice(0, 100)).join(' | ');
      const usedPatterns = orchestrator.getGrowthReport().map(g => g.patternId);
      knowledgeStore.saveSessionSummary(session.id, {
        summary: summary.slice(0, 500),
        learned: [],
        patterns: usedPatterns,
        tags: [currentModel, currentProvider],
      });
      console.log('\x1b[36m[세션이 지식베이스에 저장되었습니다]\x1b[0m');
      return true;
    }

    if (trimmed.startsWith('/remember ')) {
      const content = trimmed.slice(10).trim();
      if (!content) {
        console.log('\x1b[33m[저장할 내용을 입력하세요]\x1b[0m');
        return true;
      }
      knowledgeStore.saveLearned({
        topic: content.slice(0, 50),
        content,
        patterns: [],
        tags: [],
      });
      console.log('\x1b[36m[지식이 저장되었습니다]\x1b[0m');
      return true;
    }

    if (trimmed === '/knowledge') {
      const entries = knowledgeStore.listAll(10);
      if (entries.length === 0) {
        console.log('\x1b[2m저장된 지식이 없습니다\x1b[0m');
      } else {
        console.log(`\n\x1b[1m저장된 지식 (${entries.length}개):\x1b[0m`);
        for (const e of entries) {
          console.log(`  \x1b[33m${e.title}\x1b[0m \x1b[2m${e.type}\x1b[0m`);
        }
        console.log();
      }
      return true;
    }

    if (trimmed === '/skills') {
      const skills = skillRegistry.list();
      if (skills.length === 0) {
        console.log('\x1b[2m등록된 커스텀 스킬이 없습니다\x1b[0m');
      } else {
        console.log(`\n\x1b[1m커스텀 스킬 (${skills.length}개):\x1b[0m`);
        for (const s of skills) {
          console.log(`  \x1b[33m${s.name}\x1b[0m → ${s.targetPattern} 패턴`);
        }
        console.log();
      }
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

    if (trimmed === '/methods') {
      const methods = methodRegistry.listEnabled();
      if (methods.length === 0) {
        console.log('\x1b[2m활성화된 메서드가 없습니다\x1b[0m');
      } else {
        console.log(`\n\x1b[1m활성화된 메서드 (${methods.length}개):\x1b[0m`);
        for (const m of methods) {
          const status = m.category === 'common' ? '\x1b[32m[C]\x1b[0m' : '\x1b[36m[P]\x1b[0m';
          const label = m.userLabel || m.name;
          console.log(`  ${status} \x1b[33m${m.id}\x1b[0m ${label}`);
        }
        console.log();
        console.log('  \x1b[32m[C]\x1b[0m=common  \x1b[36m[P]\x1b[0m=project');
        console.log();
      }
      return true;
    }

    if (trimmed === '/patterns') {
      const patterns = patternRegistry.list();
      console.log(`\n\x1b[1m등록된 패턴 (${patterns.length}개):\x1b[0m`);
      for (const p of patterns) {
        const steps = p.steps().map(s => s.label).join(' → ');
        console.log(`  \x1b[33m${p.id}\x1b[0m ${p.name}  \x1b[2m${steps}\x1b[0m`);
      }
      console.log();
      return true;
    }

    if (trimmed === '/reflect') {
      const recent = orchestrator.getRecentReflection(5);
      console.log(`\n\x1b[1m최근 회고:\x1b[0m`);
      if (!recent || recent.includes('없음')) {
        console.log(`  \x1b[2m아직 회고 기록이 없습니다. 몇 번 대화하면 자동으로 쌓입니다.\x1b[0m`);
      } else {
        console.log(recent);
      }
      console.log();
      return true;
    }

    if (trimmed === '/growth') {
      const growth = orchestrator.getGrowthReport();
      const suggestions = orchestrator.getGrowthSuggestions();
      if (growth.length === 0 && suggestions.length === 0) {
        console.log(`\n\x1b[1m성장 추적:\x1b[0m`);
        console.log(`  \x1b[2m아직 수집된 패턴이 없습니다. 대화를 계속하면 자동으로 추적됩니다.\x1b[0m`);
        console.log();
        return true;
      }
      console.log(`\n\x1b[1m성장 추적 (${growth.length}개 패턴):\x1b[0m`);
      for (const g of growth) {
        const bar = '\x1b[33m' + '|'.repeat(Math.min(g.count, 20)) + '\x1b[0m';
        console.log(`  ${g.patternId} ×${g.count}  avg:${(g.avgScore * 100).toFixed(0)}%  ${bar}`);
      }
      if (suggestions.length > 0) {
        console.log('\n\x1b[1m성장 제안:\x1b[0m');
        for (const s of suggestions) {
          console.log(`  \x1b[36m*\x1b[0m ${s}`);
        }
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

  /** 사용자 메시지 전송 — Orchestrator 경유 (Sprint 6) */
  async function sendMessage(content: string): Promise<void> {
    isGenerating = true;
    messages.push({ role: 'user', content });

    abortController = new AbortController();
    process.stdout.write('\x1b[35m...\x1b[0m ');

    const result = await orchestrator.execute(
      activeProvider,
      currentModel,
      messages,
      content,
      {
        signal: abortController.signal,
        confirmTool: async (toolName: string, args: Record<string, unknown>) => {
          // 대화형 모드: 위험한 명령어는 사용자 승인 필요
          if (toolName === 'terminal') {
            const cmd = String(args.command || '');
            const dangerous = /^(rm\s|sudo\s|chmod\s|mkfs|dd\s|>\s|curl\s.*\|\s*sh|wget.*\|\s*sh)/i.test(cmd);
            if (dangerous) {
              process.stdout.write(`\x1b[31m\n[보안] 위험한 명령 감지: ${cmd.slice(0, 80)}\x1b[0m\n`);
              process.stdout.write('\x1b[33m실행하시겠습니까? (y/N): \x1b[0m');
              const answer = await new Promise<string>((resolve) => {
                const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
                rl.question('', (a) => { rl.close(); resolve(a.trim().toLowerCase()); });
              });
              return answer === 'y' || answer === 'yes';
            }
          }
          return true; // 일반 명령은 자동 승인
        },
      },
    );

    // 패턴 분류 결과는 Orchestrator에서 이미 출력됨

    // 응답 출력
    if (result.content) {
      process.stdout.write(result.content);
      process.stdout.write('\n');
    } else {
      process.stderr.write('\x1b[2m(빈 응답)\x1b[0m\n');
    }

    // 세션 저장
    sessionStore.appendMessage(session, { role: 'user', content });
    if (result.content) {
      sessionStore.appendMessage(session, { role: 'assistant', content: result.content });
    }
    if (result.reflection) {
      sessionStore.appendReflection(session, result.reflection);
    }

    // 성장 데이터 영속화
    const growthReport = orchestrator.getGrowthReport();
    if (growthReport.length > 0) {
      sessionStore.appendGrowth(session, growthReport);
    }

    // 회고/성장 정보 출력
    if (result.reflection && result.reflection.improvements.length > 0) {
      process.stderr.write('\n');
      for (const imp of result.reflection.improvements) {
        process.stderr.write(`\x1b[2m  > ${imp}\x1b[0m\n`);
      }
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

  const methods = methodRegistry.list();
  if (methods.length > 0) {
    const enabled = methodRegistry.listEnabled().length;
    console.log(`  등록된 메서드: ${methods.length}개, 활성화: ${enabled}개 (스켈레톤, Sprint 4+에서 구현)`);
    const common = methods.filter(m => m.category === 'common').length;
    const project = methods.filter(m => m.category === 'project').length;
    console.log(`    common: ${common}개, project: ${project}개`);
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
  .version('0.2.0');

program
  .command('chat')
  .description('채팅 시작')
  .option('-m, --model <name>', '사용할 모델')
  .option('-p, --provider <name>', '사용할 프로바이더 (glm, ollama)')
  .option('-s, --system <prompt>', '시스템 프롬프트')
  .option('--tui', 'Ink TUI 모드로 실행')
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

  // 파이프 모드 세션/오케스트레이터 재사용 (Sprint 6)
  const pipeSessionStore = new SessionStore();
  const pipeSession = pipeSessionStore.create('pipe');

  // 파이프 모드에서도 지식/스킬 활성화
  let pipeProjectName = 'default';
  try {
    const gitRemote = execSync('git remote get-url origin 2>/dev/null', { cwd: process.cwd(), stdio: 'pipe' }).toString().trim();
    const m = gitRemote.match(/([^/]+?)(?:\.git)?$/);
    if (m) pipeProjectName = m[1];
  } catch { /* 기본값 사용 */ }
  const pipeKnowledgeStore = new KnowledgeStore(pipeProjectName);
  const pipeSkillRegistry = new SkillRegistry(pipeProjectName);

  const pipeOrchestrator = new Orchestrator({
    methodRegistry,
    patternRegistry,
    knowledgeStore: pipeKnowledgeStore,
    skillRegistry: pipeSkillRegistry,
  });
  const pipeMessages: Message[] = [];

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
      if (trimmed === '/methods') {
        const methods = methodRegistry.listEnabled();
        for (const m of methods) {
          const status = m.category === 'common' ? '[C]' : '[P]';
          const label = m.userLabel || m.name;
          console.log(`  ${status} ${m.id} ${label}`);
        }
        continue;
      }
      if (trimmed === '/patterns') {
        const patterns = patternRegistry.list();
        for (const p of patterns) {
          const steps = p.steps().map((s: { label: string }) => s.label).join(' → ');
          console.log(`  ${p.id} ${p.name}  ${steps}`);
        }
        continue;
      }
      if (trimmed === '/reflect') {
        console.log(pipeOrchestrator.getRecentReflection(5));
        continue;
      }
      if (trimmed === '/growth') {
        const growth = pipeOrchestrator.getGrowthReport();
        const suggestions = pipeOrchestrator.getGrowthSuggestions();
        for (const g of growth) {
          const bar = '\x1b[33m' + '|'.repeat(Math.min(g.count, 20)) + '\x1b[0m';
          console.log(`  ${g.patternId} x${g.count}  avg:${(g.avgScore * 100).toFixed(0)}%  ${bar}`);
        }
        for (const s of suggestions) {
          console.log(`  \x1b[36m*\x1b[0m ${s}`);
        }
        continue;
      }
      if (trimmed === '/save') {
        const sessionData = pipeMessages
          .filter(m => m.role === 'user' || m.role === 'assistant')
          .map(m => m.content)
          .filter(Boolean);
        const summary = sessionData.slice(-6).map((c: string) => c.slice(0, 100)).join(' | ');
        const usedPatterns = pipeOrchestrator.getGrowthReport().map(g => g.patternId);
        pipeKnowledgeStore.saveSessionSummary('pipe', {
          summary: summary.slice(0, 500),
          learned: [],
          patterns: usedPatterns,
          tags: [config.model || 'glm-5.1', config.provider || 'glm'],
        });
        console.log('[세션이 지식베이스에 저장되었습니다]');
        continue;
      }
      if (trimmed.startsWith('/remember ')) {
        const content = trimmed.slice(10).trim();
        if (content) {
          pipeKnowledgeStore.saveLearned({
            topic: content.slice(0, 50),
            content,
            patterns: [],
            tags: [],
          });
          console.log('[지식이 저장되었습니다]');
        }
        continue;
      }
      if (trimmed === '/knowledge') {
        const entries = pipeKnowledgeStore.listAll(10);
        if (entries.length === 0) {
          console.log('저장된 지식이 없습니다');
        } else {
          for (const e of entries) {
            console.log(`  ${e.title} ${e.type}`);
          }
        }
        continue;
      }
      if (trimmed === '/skills') {
        const skills = pipeSkillRegistry.list();
        if (skills.length === 0) {
          console.log('등록된 스킬이 없습니다');
        } else {
          for (const s of skills) {
            console.log(`  ${s.name}`);
          }
        }
        continue;
      }
      continue;
    }

    // 파이프 모드 — 재사용된 Orchestrator 경유 (Sprint 6)
    const pipeResult = await pipeOrchestrator.execute(
      provider,
      config.model || 'glm-5.1',
      pipeMessages,
      trimmed,
      {
        silent: true,
        confirmTool: async (toolName: string, args: Record<string, unknown>) => {
          // 파이프 모드: 위험한 명령어는 자동 거부
          if (toolName === 'terminal') {
            const cmd = String(args.command || '');
            const dangerous = /^(rm\s|sudo\s|chmod\s|mkfs|dd\s|>\s|curl\s.*\|\s*sh|wget.*\|\s*sh)/i.test(cmd);
            if (dangerous) {
              process.stderr.write(`\x1b[31m[보안] 파이프 모드에서 위험한 명령 차단: ${cmd.slice(0, 80)}\x1b[0m\n`);
              return false;
            }
          }
          return true;
        },
      },
    );

    // 패턴 분류 결과는 Orchestrator에서 이미 출력됨

    // 응답 출력 (stdout only — 파이프 모드)
    if (pipeResult.content) {
      process.stdout.write(pipeResult.content);
      process.stdout.write('\n');
    }

    // 세션 저장
    pipeSessionStore.appendMessage(pipeSession, { role: 'user', content: trimmed });
    if (pipeResult.content) {
      pipeSessionStore.appendMessage(pipeSession, { role: 'assistant', content: pipeResult.content });
    }

    console.log();
  }
}
