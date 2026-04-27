/**
 * CLI Channel — IChannel 구현체
 * 현재는 @airu/cli에서 직접 처리, 나중에 추상화
 */
import type { IChannel, UserInput } from '@airu/core';

export class CliChannel implements IChannel {
  readonly name = 'cli';

  send(text: string): void {
    process.stdout.write(text);
  }

  async *receive(): AsyncIterable<UserInput> {
    // TODO: readline 기반 입력 루프
    yield { content: '', channelName: 'cli' };
  }

  async start(): Promise<void> {
    // CLI는 별도 시작 불필요
  }
}
