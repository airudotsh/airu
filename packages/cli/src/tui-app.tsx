/**
 * airu TUI — Ink(React for CLI) 기반 터미널 UI
 * 상단: 메시지 스크롤 / 하단: 고정 입력창
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import type { IModelProvider, Message } from '@airu/core';

// ── Alternate Screen Buffer ──
const ENTER_ALT = '\x1B[1049h';
const EXIT_ALT = '\x1B[1049l';

function useAlternateScreen(): void {
  useEffect(() => {
    process.stdout.write(ENTER_ALT);
    return () => { process.stdout.write(EXIT_ALT); };
  }, []);
}

// ── 색상 팔레트 ──
const C = {
  ai: '#fab283',
  prompt: '#9d7cd8',
  user: '#eeeeee',
  success: '#7fd88f',
  error: '#e06c75',
  dim: '#585858',
  accent: '#FFBF00',
};

// ── 메시지 타입 ──
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  pattern?: string;
}

// ── 단일 메시지 컴포넌트 ──
function Msg({ msg }: { msg: ChatMessage }): React.ReactElement {
  if (msg.role === 'user') {
    return (
      <Box marginBottom={0}>
        <Text color={C.prompt}>{'>'} </Text>
        <Text color={C.user}>{msg.content}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginBottom={0}>
      {msg.pattern && (
        <Text dimColor color={C.dim}>[{msg.pattern}]</Text>
      )}
      <Text color={C.ai}>{msg.content}</Text>
    </Box>
  );
}

// ── 메인 App ──
interface TuiAppProps {
  provider: IModelProvider;
  model: string;
  providerName: string;
  sendMessage: (content: string) => Promise<{ content: string; pattern?: { id: string; name: string; score: number } | null }>;
}

export function TuiApp({ provider, model, providerName, sendMessage }: TuiAppProps): React.ReactElement {
  useAlternateScreen();
  const { exit } = useApp();
  const { stdout } = useStdout();
  const rows = stdout?.rows ?? 24;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const scrollRef = useRef(0);

  // 메시지 추가 시 스크롤 업데이트
  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages(prev => [...prev, msg]);
    scrollRef.current = Math.max(0, messages.length - rows + 6);
  }, [messages.length, rows]);

  // 입력 처리
  useInput((char, key) => {
    if (isGenerating) {
      // ESC로 중단
      if (key.escape) {
        setIsGenerating(false);
        setStatus('중단됨');
      }
      return;
    }

    if (key.return) {
      const trimmed = input.trim();
      setInput('');

      if (!trimmed) return;

      // 명령어 처리
      if (trimmed.startsWith('/')) {
        handleCommand(trimmed);
        return;
      }

      // 메시지 전송
      addMessage({ id: `u-${Date.now()}`, role: 'user', content: trimmed });
      handleSend(trimmed);
      return;
    }

    if (key.backspace || key.delete) {
      setInput(prev => prev.slice(0, -1));
      return;
    }

    setInput(prev => prev + char);
  });

  async function handleSend(content: string): Promise<void> {
    setIsGenerating(true);
    setStatus('생각 중...');

    try {
      const result = await sendMessage(content);
      addMessage({
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: result.content || '(빈 응답)',
        pattern: result.pattern ? `${result.pattern.id} ${result.pattern.name} ${(result.pattern.score * 100).toFixed(0)}%` : undefined,
      });
      setStatus('');
    } catch (e) {
      addMessage({
        id: `e-${Date.now()}`,
        role: 'assistant',
        content: `오류: ${(e as Error).message}`,
      });
      setStatus('');
    }

    setIsGenerating(false);
  }

  function handleCommand(cmd: string): void {
    if (cmd === '/exit' || cmd === '/quit') {
      exit();
      return;
    }

    if (cmd === '/help') {
      addMessage({
        id: `s-${Date.now()}`,
        role: 'system',
        content: [
          '/help - 도움말',
          '/exit - 종료',
          '/clear - 대화 초기화',
          '/model <name> - 모델 전환',
        ].join('\n'),
      });
      return;
    }

    if (cmd === '/clear') {
      setMessages([]);
      return;
    }

    setStatus(`알 수 없는 명령어: ${cmd}`);
  }

  // 표시할 메시지 계산 (화면 높이에 맞게 자르기)
  const visibleStart = Math.max(0, messages.length - rows + 6);
  const visibleMessages = messages.slice(visibleStart);

  return (
    <Box flexDirection="column" height={rows}>
      {/* 상단: AI 응답 영역 */}
      <Box flexDirection="column" flexGrow={1} overflowY="hidden" paddingX={1}>
        {visibleMessages.map(msg => (
          <Msg key={msg.id} msg={msg} />
        ))}
        {isGenerating && (
          <Text dimColor color={C.dim}>...</Text>
        )}
      </Box>

      {/* 하단: 상태줄 + 입력창 */}
      <Box flexDirection="column" flexShrink={0}>
        <Box paddingX={1}>
          <Text dimColor>
            {isGenerating ? status : `${providerName}/${model}`}
          </Text>
        </Box>
        <Box paddingX={1}>
          <Text color={C.accent}>{'>'} </Text>
          <Text>{input}</Text>
          <Text color={C.accent}>{'▎'}</Text>
        </Box>
      </Box>
    </Box>
  );
}

export default TuiApp;
