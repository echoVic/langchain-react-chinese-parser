/**
 * 中文 ReAct 解析器基类
 *
 * 为所有中文大模型提供通用的解析逻辑框架
 */

import { AgentAction, AgentFinish } from '@langchain/core/agents';
import { BaseOutputParser, OutputParserException } from '@langchain/core/output_parsers';
import {
  ActionMatch,
  ChineseModelType,
  IChineseReActParser,
  LanguageKeywords,
  ParseResult,
  ParserOptions,
} from '../types.js';

/**
 * 中文 ReAct 解析器基类
 */
export abstract class BaseChineseReActParser
  extends BaseOutputParser<AgentAction | AgentFinish>
  implements IChineseReActParser
{
  protected abstract modelType: ChineseModelType;
  protected abstract keywords: LanguageKeywords;
  protected options: ParserOptions;

  // LangChain 需要的命名空间
  abstract lc_namespace: string[];

  constructor(options: ParserOptions = {}) {
    super();
    this.options = {
      debug: false,
      relaxedMode: true,
      maxRetries: 3,
      ...options,
    };
  }

  /**
   * 解析模型输出
   */
  async parse(text: string): Promise<ParseResult> {
    const cleanText = this.preprocessText(text);

    if (this.options.debug) {
      console.log(`[${this.modelType}] 解析输入:`, cleanText);
    }

    // 1. 优先检查最终答案
    const finalAnswerMatch = this.extractFinalAnswer(cleanText);
    if (finalAnswerMatch) {
      if (this.options.debug) {
        console.log(`[${this.modelType}] 找到最终答案:`, finalAnswerMatch);
      }
      return {
        returnValues: { output: finalAnswerMatch.trim() },
        log: cleanText,
      };
    }

    // 2. 尝试解析动作
    const actionMatch = this.extractAction(cleanText);
    if (actionMatch) {
      if (this.options.debug) {
        console.log(`[${this.modelType}] 找到动作:`, actionMatch);
      }
      return {
        tool: actionMatch.action.trim(),
        toolInput: actionMatch.actionInput.trim(),
        log: cleanText,
      };
    }

    // 3. 如果解析失败，抛出异常
    const errorMessage = this.buildErrorMessage(cleanText);
    throw new OutputParserException(errorMessage, cleanText);
  }

  /**
   * 获取格式化指令
   */
  getFormatInstructions(): string {
    return this.buildFormatInstructions();
  }

  /**
   * 获取解析器类型
   */
  getType(): string {
    return `${this.modelType}_react_output_parser`;
  }

  /**
   * 预处理文本
   */
  protected preprocessText(text: string): string {
    return text
      .trim()
      .replace(/\r\n/g, '\n') // 统一换行符
      .replace(/[ \t]+/g, ' ') // 合并多余空格（但保留换行）
      .replace(/\n\s+/g, '\n') // 清理行首空格
      .replace(/\s*[:：]\s*/g, ': '); // 统一冒号格式，冒号后加空格
  }

  /**
   * 提取最终答案
   */
  protected extractFinalAnswer(text: string): string | null {
    const allKeywords = [
      ...this.keywords.chinese.finalAnswer,
      ...this.keywords.english.finalAnswer,
      ...(this.options.customKeywords?.chinese?.finalAnswer || []),
      ...(this.options.customKeywords?.english?.finalAnswer || []),
    ];

    for (const keyword of allKeywords) {
      // 严格匹配模式
      const strictRegex = new RegExp(`^\\s*${this.escapeRegex(keyword)}\\s*[:：]\\s*(.*)$`, 'im');
      const strictMatch = text.match(strictRegex);
      if (strictMatch && strictMatch[1]) {
        return strictMatch[1];
      }

      // 多行匹配模式
      const multiLineRegex = new RegExp(
        `(?:^|\\n)\\s*${this.escapeRegex(keyword)}\\s*[:：]\\s*(.*)(?:\\n|$)`,
        'im',
      );
      const multiLineMatch = text.match(multiLineRegex);
      if (multiLineMatch && multiLineMatch[1]) {
        return multiLineMatch[1];
      }

      // 宽松匹配模式
      if (this.options.relaxedMode) {
        const relaxedPattern = 
          `${this.escapeRegex(keyword)}[\\s]*[:：][\\s]*([\\s\\S]*?)` +
          '(?=\\n\\s*(?:思考|动作|最终答案|Thought|Action|Final Answer)|$)';
        const relaxedRegex = new RegExp(relaxedPattern, 'i');
        const relaxedMatch = text.match(relaxedRegex);
        if (relaxedMatch && relaxedMatch[1]) {
          return relaxedMatch[1].trim();
        }
      }
    }

    return null;
  }

  /**
   * 提取动作和动作输入
   */
  protected extractAction(text: string): ActionMatch | null {
    // 尝试中文格式
    const chineseAction = this.extractActionByLanguage(text, 'chinese');
    if (chineseAction) {
      return chineseAction;
    }

    // 尝试英文格式
    const englishAction = this.extractActionByLanguage(text, 'english');
    if (englishAction) {
      return englishAction;
    }

    // 自定义格式处理在子类中实现
    return null;
  }

  /**
   * 按语言提取动作
   */
  protected extractActionByLanguage(
    text: string,
    language: 'chinese' | 'english',
  ): ActionMatch | null {
    const keywords = this.keywords[language];
    let action = '';
    let actionInput = '';
    let thought = '';

    // 提取思考（可选）
    for (const thoughtKeyword of keywords.thought) {
      const thoughtRegex = new RegExp(
        `(?:^|\\n)\\s*${this.escapeRegex(thoughtKeyword)}\\s*[:：]\\s*([^\\n]+)`,
        'im',
      );
      const thoughtMatch = text.match(thoughtRegex);
      if (thoughtMatch) {
        thought = thoughtMatch[1].trim();
        break;
      }
    }

    // 提取动作
    for (const actionKeyword of keywords.action) {
      const actionRegex = new RegExp(
        `(?:^|\\n)\\s*${this.escapeRegex(actionKeyword)}\\s*[:：]\\s*([^\\n]+)`,
        'im',
      );
      const actionMatch = text.match(actionRegex);
      if (actionMatch) {
        action = actionMatch[1].trim();
        break;
      }
    }

    // 提取动作输入
    for (const inputKeyword of keywords.actionInput) {
      const inputRegex = new RegExp(
        `(?:^|\\n)\\s*${this.escapeRegex(inputKeyword)}\\s*[:：]\\s*([^\\n]+)`,
        'im',
      );
      const inputMatch = text.match(inputRegex);
      if (inputMatch) {
        actionInput = inputMatch[1].trim();
        break;
      }
    }

    // 宽松匹配：如果找到动作但没找到动作输入
    if (action && !actionInput && this.options.relaxedMode) {
      actionInput = this.extractActionInputFallback(text, action, language);
    }

    return action && actionInput ? { action, actionInput, thought } : null;
  }

  /**
   * 兜底策略：提取动作输入
   */
  protected extractActionInputFallback(
    text: string,
    action: string,
    language: 'chinese' | 'english',
  ): string {
    // 查找动作行之后的下一行内容作为输入
    const actionKeywords = this.keywords[language].action;

    for (const actionKeyword of actionKeywords) {
      const regexPattern = 
        `(?:^|\\n)\\s*${this.escapeRegex(actionKeyword)}\\s*[:：]\\s*` +
        `${this.escapeRegex(action)}\\s*\\n([^\\n]+)`;
      const regex = new RegExp(regexPattern, 'im');
      const match = text.match(regex);
      if (match) {
        return match[1].trim();
      }
    }

    return '';
  }

  /**
   * 构建格式化指令
   */
  protected buildFormatInstructions(): string {
    const chineseKeywords = this.keywords.chinese;
    const englishKeywords = this.keywords.english;

    return `请按照以下格式回答：

**使用工具时：**
${chineseKeywords.thought[0]}: 描述你的思考过程
${chineseKeywords.action[0]}: 工具名称
${chineseKeywords.actionInput[0]}: 工具的输入参数

**有最终答案时：**
${chineseKeywords.thought[0]}: 描述你的思考过程
${chineseKeywords.finalAnswer[0]}: 你的最终答案

**注意事项：**
- 每行都要以对应的关键字开头，后面跟冒号
- 支持中英文关键字混用
- 英文格式：${englishKeywords.thought[0]}:, ${englishKeywords.action[0]}:, ` +
      `${englishKeywords.actionInput[0]}:, ${englishKeywords.finalAnswer[0]}:
- 中文格式：${chineseKeywords.thought[0]}:, ${chineseKeywords.action[0]}:, ` +
      `${chineseKeywords.actionInput[0]}:, ${chineseKeywords.finalAnswer[0]}:`;
  }

  /**
   * 构建错误消息
   */
  protected buildErrorMessage(text: string): string {
    const chineseKeywords = this.keywords.chinese;

    return `无法解析 ${this.modelType} 模型输出。请确保输出包含正确的关键字格式。

期望格式：
${chineseKeywords.thought[0]}: [思考过程]
${chineseKeywords.action[0]}: [工具名称]
${chineseKeywords.actionInput[0]}: [工具参数]

或者：
${chineseKeywords.thought[0]}: [思考过程]
${chineseKeywords.finalAnswer[0]}: [最终答案]

实际输出: ${text}`;
  }

  /**
   * 转义正则表达式特殊字符
   */
  protected escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * LangChain 兼容性
   */
  _type(): string {
    return this.getType();
  }
}
