export interface UserInput {
  content: string;
  userId?: string;
  channelName?: string;
}

export interface IChannel {
  readonly name: string;
  send(text: string): void;
  receive(): AsyncIterable<UserInput>;
  start(): Promise<void>;
}
