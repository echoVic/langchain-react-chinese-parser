/**
 * LangChain 中文 ReAct 解析器
 *
 * 为中文大模型提供 LangChain ReAct 格式的输出解析支持
 * 支持：通义千问、ChatGLM、百川、智谱GLM、文心一言、Minimax 等主流中文模型
 *
 * @author langchain-react-chinese-parser
 * @version 1.0.0
 */

// 类型定义
export type {
  ActionMatch,
  ChineseModelType,
  IChineseReActParser,
  KeywordMapping,
  LanguageKeywords,
  ModelParserConfig,
  ParseResult,
  ParserOptions,
} from './types.js';

// 基础解析器
export { BaseChineseReActParser } from './base/BaseChineseReActParser.js';

// 具体模型解析器
export { BaichuanReActOutputParser } from './parsers/BaichuanReActOutputParser.js';
export { ChatGLMReActOutputParser } from './parsers/ChatGLMReActOutputParser.js';
export { ERNIEReActOutputParser } from './parsers/ERNIEReActOutputParser.js';
export { QwenReActOutputParser } from './parsers/QwenReActOutputParser.js';

// 工厂类和便捷函数
export {
  ChineseReActParserFactory,
  createAutoParser,
  createBaichuanParser,
  createChatGLMParser,
  createChineseReActParser,
  createERNIEParser,
  createQwenParser,
} from './factory.js';

// 默认导出：便捷的创建函数
export { createChineseReActParser as default } from './factory.js';

/**
 * 包版本信息
 */
export const VERSION = '1.0.0';

/**
 * 支持的模型列表
 */
export const SUPPORTED_MODELS = [
  'qwen', // 通义千问
  'chatglm', // ChatGLM
  'baichuan', // 百川
  'glm', // 智谱GLM
  'ernie', // 文心一言
  'minimax', // Minimax
  'auto', // 自动识别
] as const;

/**
 * 快速开始示例
 *
 * @example
 * ```typescript
 * import { createChineseReActParser } from 'langchain-react-chinese-parser';
 *
 * // 创建通义千问解析器
 * const parser = createChineseReActParser('qwen', { debug: true });
 *
 * // 解析模型输出
 * const result = await parser.parse(`
 *   思考: 我需要搜索相关信息
 *   动作: search
 *   动作输入: 北京天气
 * `);
 *
 * console.log(result.tool);      // 'search'
 * console.log(result.toolInput); // '北京天气'
 * ```
 */

/**
 * 模型对比表
 *
 * | 模型         | 推荐关键字             | 特殊格式支持                    | 兼容性 |
 * |--------------|----------------------|--------------------------------|--------|
 * | 通义千问     | 思考/动作/动作输入      | "我将使用..."                  | ⭐⭐⭐⭐⭐ |
 * | ChatGLM      | 思考/工具/工具输入      | "调用[工具]，参数为..."        | ⭐⭐⭐⭐⭐ |
 * | 百川         | 思考/工具/工具输入      | "使用[工具]工具，输入..."      | ⭐⭐⭐⭐  |
 * | 智谱GLM      | 思考/工具/工具输入      | 同 ChatGLM                    | ⭐⭐⭐⭐  |
 * | 文心一言     | 思考/调用工具/输入      | "我需要调用[工具]来..."        | ⭐⭐⭐⭐  |
 * | Minimax      | 思考/动作/动作输入      | 同通义千问                     | ⭐⭐⭐   |
 * | 自动识别     | 支持所有上述格式        | 智能识别，自动匹配             | ⭐⭐⭐⭐⭐ |
 */
