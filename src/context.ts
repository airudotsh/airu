/**
 * ChatContext - 멀티턴 대화 컨텍스트
 */
export interface ContextMessage {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: number;
  tool_calls?: {
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }[];
  tool_call_id?: string;
}

let messageIdCounter = 0;

function generateId(): string {
  return `msg_${Date.now()}_${++messageIdCounter}`;
}

export class ChatContext {
  readonly id: string;
  private messages: ContextMessage[] = [];
  private _systemPrompt: string;

  constructor(id: string, systemPrompt?: string) {
    this.id = id;
    this._systemPrompt = systemPrompt || '당신은 가리, 충직한 AI 어시스턴트입니다.';
  }

  get allMessages(): ContextMessage[] {
    const systemMsg: ContextMessage = {
      id: 'system',
      role: 'system',
      content: this._systemPrompt,
      timestamp: 0,
    };
    return [systemMsg, ...this.messages];
  }

  get lastAssistantMessage(): ContextMessage | undefined {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].role === 'assistant') {
        return this.messages[i];
      }
    }
    return undefined;
  }

  addMessage(
    role: ContextMessage['role'],
    content: string,
    tool_calls?: ContextMessage['tool_calls'],
    tool_call_id?: string
  ): ContextMessage {
    const msg: ContextMessage = {
      id: generateId(),
      role,
      content,
      timestamp: Date.now(),
      tool_calls,
      tool_call_id,
    };
    this.messages.push(msg);
    return msg;
  }

  getHistory(limit?: number): ContextMessage[] {
    return limit ? this.messages.slice(-limit) : [...this.messages];
  }

  clear(): void {
    this.messages = [];
  }

  setSystemPrompt(prompt: string): void {
    this._systemPrompt = prompt;
  }
}
