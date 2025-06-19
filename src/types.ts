/**
 * 中文 ReAct 解析器通用类型定义
 */

import { AgentAction, AgentFinish } from '@langchain/core/agents';

/**
 * 支持的中文大模型类型
 */
export type ChineseModelType =
  | 'qwen' // 通义千问
  | 'chatglm' // ChatGLM
  | 'baichuan' // 百川
  | 'glm' // 智谱GLM
  | 'ernie' // 文心一言
  | 'minimax' // Minimax
  | 'auto'; // 自动识别

/**
 * 关键字映射配置
 */
export interface KeywordMapping {
  /** 思考相关关键字 */
  thought: string[];
  /** 动作相关关键字 */
  action: string[];
  /** 动作输入相关关键字 */
  actionInput: string[];
  /** 最终答案相关关键字 */
  finalAnswer: string[];
  /** 观察相关关键字（可选） */
  observation?: string[];
}

/**
 * 语言特定的关键字配置
 */
export interface LanguageKeywords {
  /** 中文关键字 */
  chinese: KeywordMapping;
  /** 英文关键字 */
  english: KeywordMapping;
}

/**
 * 解析器配置选项
 */
export interface ParserOptions {
  /** 是否启用调试模式 */
  debug?: boolean;
  /** 自定义关键字映射 */
  customKeywords?: Partial<LanguageKeywords>;
  /** 是否启用宽松匹配模式 */
  relaxedMode?: boolean;
  /** 最大解析尝试次数 */
  maxRetries?: number;
}

/**
 * 解析结果类型
 */
export type ParseResult = AgentAction | AgentFinish;

/**
 * 动作提取结果
 */
export interface ActionMatch {
  action: string;
  actionInput: string;
  thought?: string;
}

/**
 * 解析器接口
 */
export interface IChineseReActParser {
  /** 解析模型输出 */
  parse(text: string): Promise<ParseResult>;

  /** 获取格式化指令 */
  getFormatInstructions(): string;

  /** 获取解析器类型 */
  getType(): string;
}

/**
 * 模型特定的解析器配置
 */
export interface ModelParserConfig {
  /** 模型类型 */
  modelType: ChineseModelType;
  /** 语言关键字配置 */
  keywords: LanguageKeywords;
  /** 特殊格式处理函数 */
  customFormatHandler?: (text: string) => ParseResult | null;
  /** 格式化指令模板 */
  formatInstructionTemplate?: string;
}
