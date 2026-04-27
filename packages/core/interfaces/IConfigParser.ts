export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export interface ConfigData {
  [key: string]: unknown;
}

export interface IConfigParser {
  parse(content: string): ConfigData;
  validate(config: ConfigData): ValidationResult;
}
