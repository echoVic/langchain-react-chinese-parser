// langchain-react-chinese-parser - Chinese LLM ReAct Output Parsers for LangChain
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  BaichuanReActOutputParser: () => BaichuanReActOutputParser,
  BaseChineseReActParser: () => BaseChineseReActParser,
  ChatGLMReActOutputParser: () => ChatGLMReActOutputParser,
  ChineseReActParserFactory: () => ChineseReActParserFactory,
  ERNIEReActOutputParser: () => ERNIEReActOutputParser,
  QwenReActOutputParser: () => QwenReActOutputParser,
  SUPPORTED_MODELS: () => SUPPORTED_MODELS,
  VERSION: () => VERSION,
  createAutoParser: () => createAutoParser,
  createBaichuanParser: () => createBaichuanParser,
  createChatGLMParser: () => createChatGLMParser,
  createChineseReActParser: () => createChineseReActParser,
  createERNIEParser: () => createERNIEParser,
  createQwenParser: () => createQwenParser,
  default: () => createChineseReActParser
});
module.exports = __toCommonJS(index_exports);

// src/base/BaseChineseReActParser.ts
var import_output_parsers = require("@langchain/core/output_parsers");
var BaseChineseReActParser = class extends import_output_parsers.BaseOutputParser {
  constructor(options = {}) {
    super();
    this.options = {
      debug: false,
      relaxedMode: true,
      maxRetries: 3,
      ...options
    };
  }
  /**
   * 解析模型输出
   */
  async parse(text) {
    const cleanText = this.preprocessText(text);
    if (this.options.debug) {
      console.log(`[${this.modelType}] \u89E3\u6790\u8F93\u5165:`, cleanText);
    }
    const finalAnswerMatch = this.extractFinalAnswer(cleanText);
    if (finalAnswerMatch) {
      if (this.options.debug) {
        console.log(`[${this.modelType}] \u627E\u5230\u6700\u7EC8\u7B54\u6848:`, finalAnswerMatch);
      }
      return {
        returnValues: { output: finalAnswerMatch.trim() },
        log: cleanText
      };
    }
    const actionMatch = this.extractAction(cleanText);
    if (actionMatch) {
      if (this.options.debug) {
        console.log(`[${this.modelType}] \u627E\u5230\u52A8\u4F5C:`, actionMatch);
      }
      return {
        tool: actionMatch.action.trim(),
        toolInput: actionMatch.actionInput.trim(),
        log: cleanText
      };
    }
    const errorMessage = this.buildErrorMessage(cleanText);
    throw new import_output_parsers.OutputParserException(errorMessage, cleanText);
  }
  /**
   * 获取格式化指令
   */
  getFormatInstructions() {
    return this.buildFormatInstructions();
  }
  /**
   * 获取解析器类型
   */
  getType() {
    return `${this.modelType}_react_output_parser`;
  }
  /**
   * 预处理文本
   */
  preprocessText(text) {
    return text.trim().replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n\s+/g, "\n").replace(/\s*[:：]\s*/g, ": ");
  }
  /**
   * 提取最终答案
   */
  extractFinalAnswer(text) {
    const allKeywords = [
      ...this.keywords.chinese.finalAnswer,
      ...this.keywords.english.finalAnswer,
      ...this.options.customKeywords?.chinese?.finalAnswer || [],
      ...this.options.customKeywords?.english?.finalAnswer || []
    ];
    for (const keyword of allKeywords) {
      const strictRegex = new RegExp(`^\\s*${this.escapeRegex(keyword)}\\s*[:\uFF1A]\\s*(.*)$`, "im");
      const strictMatch = text.match(strictRegex);
      if (strictMatch && strictMatch[1]) {
        return strictMatch[1];
      }
      const multiLineRegex = new RegExp(
        `(?:^|\\n)\\s*${this.escapeRegex(keyword)}\\s*[:\uFF1A]\\s*(.*)(?:\\n|$)`,
        "im"
      );
      const multiLineMatch = text.match(multiLineRegex);
      if (multiLineMatch && multiLineMatch[1]) {
        return multiLineMatch[1];
      }
      if (this.options.relaxedMode) {
        const relaxedRegex = new RegExp(
          `${this.escapeRegex(keyword)}[\\s]*[:\uFF1A][\\s]*([\\s\\S]*?)(?=\\n\\s*(?:\u601D\u8003|\u52A8\u4F5C|\u6700\u7EC8\u7B54\u6848|Thought|Action|Final Answer)|$)`,
          "i"
        );
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
  extractAction(text) {
    const chineseAction = this.extractActionByLanguage(text, "chinese");
    if (chineseAction) {
      return chineseAction;
    }
    const englishAction = this.extractActionByLanguage(text, "english");
    if (englishAction) {
      return englishAction;
    }
    return null;
  }
  /**
   * 按语言提取动作
   */
  extractActionByLanguage(text, language) {
    const keywords = this.keywords[language];
    let action = "";
    let actionInput = "";
    let thought = "";
    for (const thoughtKeyword of keywords.thought) {
      const thoughtRegex = new RegExp(
        `(?:^|\\n)\\s*${this.escapeRegex(thoughtKeyword)}\\s*[:\uFF1A]\\s*([^\\n]+)`,
        "im"
      );
      const thoughtMatch = text.match(thoughtRegex);
      if (thoughtMatch) {
        thought = thoughtMatch[1].trim();
        break;
      }
    }
    for (const actionKeyword of keywords.action) {
      const actionRegex = new RegExp(
        `(?:^|\\n)\\s*${this.escapeRegex(actionKeyword)}\\s*[:\uFF1A]\\s*([^\\n]+)`,
        "im"
      );
      const actionMatch = text.match(actionRegex);
      if (actionMatch) {
        action = actionMatch[1].trim();
        break;
      }
    }
    for (const inputKeyword of keywords.actionInput) {
      const inputRegex = new RegExp(
        `(?:^|\\n)\\s*${this.escapeRegex(inputKeyword)}\\s*[:\uFF1A]\\s*([^\\n]+)`,
        "im"
      );
      const inputMatch = text.match(inputRegex);
      if (inputMatch) {
        actionInput = inputMatch[1].trim();
        break;
      }
    }
    if (action && !actionInput && this.options.relaxedMode) {
      actionInput = this.extractActionInputFallback(text, action, language);
    }
    return action && actionInput ? { action, actionInput, thought } : null;
  }
  /**
   * 兜底策略：提取动作输入
   */
  extractActionInputFallback(text, action, language) {
    const actionKeywords = this.keywords[language].action;
    for (const actionKeyword of actionKeywords) {
      const regex = new RegExp(
        `(?:^|\\n)\\s*${this.escapeRegex(actionKeyword)}\\s*[:\uFF1A]\\s*${this.escapeRegex(action)}\\s*\\n([^\\n]+)`,
        "im"
      );
      const match = text.match(regex);
      if (match) {
        return match[1].trim();
      }
    }
    return "";
  }
  /**
   * 构建格式化指令
   */
  buildFormatInstructions() {
    const chineseKeywords = this.keywords.chinese;
    const englishKeywords = this.keywords.english;
    return `\u8BF7\u6309\u7167\u4EE5\u4E0B\u683C\u5F0F\u56DE\u7B54\uFF1A

**\u4F7F\u7528\u5DE5\u5177\u65F6\uFF1A**
${chineseKeywords.thought[0]}: \u63CF\u8FF0\u4F60\u7684\u601D\u8003\u8FC7\u7A0B
${chineseKeywords.action[0]}: \u5DE5\u5177\u540D\u79F0
${chineseKeywords.actionInput[0]}: \u5DE5\u5177\u7684\u8F93\u5165\u53C2\u6570

**\u6709\u6700\u7EC8\u7B54\u6848\u65F6\uFF1A**
${chineseKeywords.thought[0]}: \u63CF\u8FF0\u4F60\u7684\u601D\u8003\u8FC7\u7A0B
${chineseKeywords.finalAnswer[0]}: \u4F60\u7684\u6700\u7EC8\u7B54\u6848

**\u6CE8\u610F\u4E8B\u9879\uFF1A**
- \u6BCF\u884C\u90FD\u8981\u4EE5\u5BF9\u5E94\u7684\u5173\u952E\u5B57\u5F00\u5934\uFF0C\u540E\u9762\u8DDF\u5192\u53F7
- \u652F\u6301\u4E2D\u82F1\u6587\u5173\u952E\u5B57\u6DF7\u7528
- \u82F1\u6587\u683C\u5F0F\uFF1A${englishKeywords.thought[0]}:, ${englishKeywords.action[0]}:, ${englishKeywords.actionInput[0]}:, ${englishKeywords.finalAnswer[0]}:
- \u4E2D\u6587\u683C\u5F0F\uFF1A${chineseKeywords.thought[0]}:, ${chineseKeywords.action[0]}:, ${chineseKeywords.actionInput[0]}:, ${chineseKeywords.finalAnswer[0]}:`;
  }
  /**
   * 构建错误消息
   */
  buildErrorMessage(text) {
    const chineseKeywords = this.keywords.chinese;
    return `\u65E0\u6CD5\u89E3\u6790 ${this.modelType} \u6A21\u578B\u8F93\u51FA\u3002\u8BF7\u786E\u4FDD\u8F93\u51FA\u5305\u542B\u6B63\u786E\u7684\u5173\u952E\u5B57\u683C\u5F0F\u3002

\u671F\u671B\u683C\u5F0F\uFF1A
${chineseKeywords.thought[0]}: [\u601D\u8003\u8FC7\u7A0B]
${chineseKeywords.action[0]}: [\u5DE5\u5177\u540D\u79F0]
${chineseKeywords.actionInput[0]}: [\u5DE5\u5177\u53C2\u6570]

\u6216\u8005\uFF1A
${chineseKeywords.thought[0]}: [\u601D\u8003\u8FC7\u7A0B]
${chineseKeywords.finalAnswer[0]}: [\u6700\u7EC8\u7B54\u6848]

\u5B9E\u9645\u8F93\u51FA: ${text}`;
  }
  /**
   * 转义正则表达式特殊字符
   */
  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  /**
   * LangChain 兼容性
   */
  _type() {
    return this.getType();
  }
};

// src/parsers/BaichuanReActOutputParser.ts
var BaichuanReActOutputParser = class extends BaseChineseReActParser {
  constructor(options = {}) {
    super(options);
    this.lc_namespace = ["langchain-react-chinese-parser", "parsers", "baichuan"];
    this.modelType = "baichuan";
    this.keywords = {
      chinese: {
        thought: ["\u601D\u8003", "\u5206\u6790", "\u63A8\u7406"],
        action: ["\u5DE5\u5177", "\u52A8\u4F5C", "\u64CD\u4F5C", "\u4F7F\u7528"],
        actionInput: ["\u5DE5\u5177\u8F93\u5165", "\u53C2\u6570", "\u8F93\u5165", "\u5185\u5BB9"],
        finalAnswer: ["\u6700\u7EC8\u7B54\u6848", "\u7B54\u6848", "\u7ED3\u679C"],
        observation: ["\u89C2\u5BDF", "\u5DE5\u5177\u8FD4\u56DE", "\u8FD4\u56DE\u7ED3\u679C"]
      },
      english: {
        thought: ["thought", "think", "reasoning"],
        action: ["tool", "action", "use"],
        actionInput: ["tool input", "parameter", "input"],
        finalAnswer: ["final answer", "answer", "result"],
        observation: ["observation", "tool result"]
      }
    };
  }
  /**
   * 百川特殊格式处理
   * 百川模型倾向于使用"工具"而非"动作"
   */
  extractCustomAction(text) {
    const useToolPattern = /使用([^工具\n]+)工具[，]?\s*输入\s*([^。\n]*)/;
    const useToolMatch = text.match(useToolPattern);
    if (useToolMatch) {
      return {
        action: useToolMatch[1].trim(),
        actionInput: useToolMatch[2].trim(),
        thought: "\u4F7F\u7528\u5DE5\u5177"
      };
    }
    const callToolPattern = /调用工具([^进行\n]+)进行([^。\n]*)/;
    const callToolMatch = text.match(callToolPattern);
    if (callToolMatch) {
      return {
        action: callToolMatch[1].trim(),
        actionInput: callToolMatch[2].trim(),
        thought: "\u8C03\u7528\u5DE5\u5177"
      };
    }
    const directToolPattern = /(?:^|\n)\s*([a-zA-Z_]+)\s*[:：]\s*([^\n]+)/im;
    const directToolMatch = text.match(directToolPattern);
    if (directToolMatch && this.isToolName(directToolMatch[1])) {
      return {
        action: directToolMatch[1].trim(),
        actionInput: directToolMatch[2].trim(),
        thought: "\u76F4\u63A5\u8C03\u7528\u5DE5\u5177"
      };
    }
    return null;
  }
  /**
   * 判断是否为工具名称
   */
  isToolName(name) {
    const commonTools = [
      "search",
      "calculator",
      "weather",
      "translate",
      "file",
      "web",
      "database",
      "api",
      "code"
    ];
    return commonTools.some((tool) => name.toLowerCase().includes(tool)) || /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
  }
  /**
   * 重写格式化指令
   */
  buildFormatInstructions() {
    const base = super.buildFormatInstructions();
    return `${base}

**\u767E\u5DDD\u7279\u6B8A\u683C\u5F0F\u652F\u6301\uFF1A**
- \u4F7F\u7528[\u5DE5\u5177\u540D]\u5DE5\u5177\uFF0C\u8F93\u5165[\u53C2\u6570]
- \u8C03\u7528\u5DE5\u5177[\u5DE5\u5177\u540D]\u8FDB\u884C[\u64CD\u4F5C]
- \u63A8\u8350\u4F7F\u7528"\u5DE5\u5177"\u800C\u975E"\u52A8\u4F5C"\u5173\u952E\u5B57
- \u652F\u6301\u76F4\u63A5\u5DE5\u5177\u540D\u8C03\u7528\uFF1Atool_name: parameter`;
  }
};

// src/parsers/ChatGLMReActOutputParser.ts
var ChatGLMReActOutputParser = class extends BaseChineseReActParser {
  constructor(options = {}) {
    super(options);
    this.lc_namespace = ["langchain-react-chinese-parser", "parsers", "chatglm"];
    this.modelType = "chatglm";
    this.keywords = {
      chinese: {
        thought: ["\u601D\u8003", "\u5206\u6790", "\u7406\u89E3", "\u8003\u8651"],
        action: ["\u52A8\u4F5C", "\u884C\u52A8", "\u5DE5\u5177", "\u64CD\u4F5C"],
        actionInput: ["\u52A8\u4F5C\u8F93\u5165", "\u5DE5\u5177\u8F93\u5165", "\u8F93\u5165", "\u53C2\u6570"],
        finalAnswer: ["\u6700\u7EC8\u7B54\u6848", "\u7B54\u6848", "\u7ED3\u8BBA", "\u56DE\u7B54"],
        observation: ["\u89C2\u5BDF", "\u89C2\u5BDF\u7ED3\u679C", "\u7ED3\u679C"]
      },
      english: {
        thought: ["thought", "thinking", "analysis"],
        action: ["action", "tool", "operation"],
        actionInput: ["action input", "tool input", "input"],
        finalAnswer: ["final answer", "answer", "conclusion"],
        observation: ["observation", "result"]
      }
    };
  }
  /**
   * ChatGLM 特殊格式处理
   * ChatGLM 经常合并思考和动作，或使用冒号变体
   */
  extractCustomAction(text) {
    const toolQueryPattern = /使用工具[：:]([^，\n]+)[\s]*查询[：:]([^。\n]*)/;
    const toolQueryMatch = text.match(toolQueryPattern);
    if (toolQueryMatch) {
      return {
        action: toolQueryMatch[1].trim(),
        actionInput: toolQueryMatch[2].trim(),
        thought: "\u9700\u8981\u4F7F\u7528\u5DE5\u5177\u67E5\u8BE2"
      };
    }
    const callToolPattern = /调用([^，\n]+)[，]?\s*参数为\s*([^。\n]*)/;
    const callToolMatch = text.match(callToolPattern);
    if (callToolMatch) {
      return {
        action: callToolMatch[1].trim(),
        actionInput: callToolMatch[2].trim(),
        thought: "\u8C03\u7528\u5DE5\u5177"
      };
    }
    const colonOnlyPattern = /(?:^|\n)\s*(动作|工具|操作)\s*:\s*([^\n]+)\s*\n\s*(?:输入|参数)\s*:\s*([^\n]+)/im;
    const colonOnlyMatch = text.match(colonOnlyPattern);
    if (colonOnlyMatch) {
      return {
        action: colonOnlyMatch[2].trim(),
        actionInput: colonOnlyMatch[3].trim(),
        thought: "\u6267\u884C\u64CD\u4F5C"
      };
    }
    return null;
  }
  /**
   * ChatGLM 倾向于使用中文冒号，重写预处理逻辑
   */
  preprocessText(text) {
    return text.trim().replace(/\r\n/g, "\n").replace(/：/g, ":").replace(/\s+/g, " ").replace(/\n\s+/g, "\n");
  }
  /**
   * 重写格式化指令
   */
  buildFormatInstructions() {
    const base = super.buildFormatInstructions();
    return `${base}

**ChatGLM \u7279\u6B8A\u683C\u5F0F\u652F\u6301\uFF1A**
- \u4F7F\u7528\u5DE5\u5177\uFF1A[\u5DE5\u5177\u540D] \u67E5\u8BE2\uFF1A[\u53C2\u6570]
- \u8C03\u7528[\u5DE5\u5177\u540D]\uFF0C\u53C2\u6570\u4E3A[\u53C2\u6570]
- \u652F\u6301\u4E2D\u6587\u5192\u53F7\uFF1A\u548C\u82F1\u6587\u5192\u53F7:\u6DF7\u7528
- \u63A8\u8350\u4F7F\u7528\u4E2D\u6587\u5192\u53F7\uFF1A\u683C\u5F0F`;
  }
};

// src/parsers/ERNIEReActOutputParser.ts
var ERNIEReActOutputParser = class extends BaseChineseReActParser {
  constructor(options = {}) {
    super(options);
    this.lc_namespace = ["langchain-react-chinese-parser", "parsers", "ernie"];
    this.modelType = "ernie";
    this.keywords = {
      chinese: {
        thought: ["\u601D\u8003", "\u5206\u6790", "\u5224\u65AD", "\u8003\u8651"],
        action: ["\u8C03\u7528\u5DE5\u5177", "\u4F7F\u7528\u5DE5\u5177", "\u6267\u884C", "\u64CD\u4F5C"],
        actionInput: ["\u8F93\u5165", "\u53C2\u6570", "\u5185\u5BB9", "\u67E5\u8BE2"],
        finalAnswer: ["\u6700\u7EC8\u7B54\u6848", "\u7B54\u6848", "\u7ED3\u8BBA", "\u56DE\u590D"],
        observation: ["\u89C2\u5BDF", "\u5DE5\u5177\u7ED3\u679C", "\u8FD4\u56DE", "\u8F93\u51FA"]
      },
      english: {
        thought: ["thought", "analysis", "thinking"],
        action: ["call tool", "use tool", "action"],
        actionInput: ["input", "parameter", "query"],
        finalAnswer: ["final answer", "answer", "conclusion"],
        observation: ["observation", "tool result", "output"]
      }
    };
  }
  /**
   * ERNIE 特殊格式处理
   * ERNIE 倾向于使用"调用工具"和较长的关键字
   */
  extractCustomAction(text) {
    const needCallPattern = /我需要调用([^来\n]+)来([^。\n]*)/;
    const needCallMatch = text.match(needCallPattern);
    if (needCallMatch) {
      return {
        action: needCallMatch[1].trim(),
        actionInput: needCallMatch[2].trim(),
        thought: "\u9700\u8981\u8C03\u7528\u5DE5\u5177"
      };
    }
    const nowCallPattern = /现在调用([^，\n]+)[，]?\s*参数是\s*([^。\n]*)/;
    const nowCallMatch = text.match(nowCallPattern);
    if (nowCallMatch) {
      return {
        action: nowCallMatch[1].trim(),
        actionInput: nowCallMatch[2].trim(),
        thought: "\u8C03\u7528\u5DE5\u5177"
      };
    }
    const mixedPattern = /(?:调用|call)\s*([a-zA-Z_\u4e00-\u9fff]+)\s*[:：]\s*([^\n]+)/i;
    const mixedMatch = text.match(mixedPattern);
    if (mixedMatch) {
      return {
        action: mixedMatch[1].trim(),
        actionInput: mixedMatch[2].trim(),
        thought: "\u6267\u884C\u64CD\u4F5C"
      };
    }
    return null;
  }
  /**
   * ERNIE 特殊的预处理
   * 处理 ERNIE 经常出现的多余描述文字
   */
  preprocessText(text) {
    let cleaned = super.preprocessText(text);
    cleaned = cleaned.replace(/好的[，,]?/g, "").replace(/我来帮您[^。]*。?/g, "").replace(/让我[^。]*。?/g, "").replace(/根据您的要求[，,]?/g, "");
    return cleaned;
  }
  /**
   * 重写格式化指令
   */
  buildFormatInstructions() {
    const base = super.buildFormatInstructions();
    return `${base}

**\u6587\u5FC3\u4E00\u8A00\u7279\u6B8A\u683C\u5F0F\u652F\u6301\uFF1A**
- \u6211\u9700\u8981\u8C03\u7528[\u5DE5\u5177\u540D]\u6765[\u64CD\u4F5C\u63CF\u8FF0]
- \u73B0\u5728\u8C03\u7528[\u5DE5\u5177\u540D]\uFF0C\u53C2\u6570\u662F[\u53C2\u6570]
- \u63A8\u8350\u4F7F\u7528"\u8C03\u7528\u5DE5\u5177"\u5173\u952E\u5B57
- \u652F\u6301\u4E2D\u82F1\u6587\u6DF7\u5408\uFF1Acall [tool]: [parameter]
- \u4F1A\u81EA\u52A8\u8FC7\u6EE4\u5E38\u89C1\u7684\u5197\u4F59\u8868\u8FBE`;
  }
};

// src/parsers/QwenReActOutputParser.ts
var QwenReActOutputParser = class extends BaseChineseReActParser {
  constructor(options = {}) {
    super(options);
    this.lc_namespace = ["langchain-react-chinese-parser", "parsers", "qwen"];
    this.modelType = "qwen";
    this.keywords = {
      chinese: {
        thought: ["\u601D\u8003", "\u63A8\u7406", "\u5206\u6790", "\u60F3\u6CD5"],
        action: ["\u52A8\u4F5C", "\u884C\u52A8", "\u64CD\u4F5C"],
        actionInput: ["\u52A8\u4F5C\u8F93\u5165", "\u64CD\u4F5C\u8F93\u5165", "\u8F93\u5165", "\u53C2\u6570"],
        finalAnswer: ["\u6700\u7EC8\u7B54\u6848", "\u7B54\u6848", "\u7ED3\u679C", "\u56DE\u7B54"],
        observation: ["\u89C2\u5BDF", "\u7ED3\u679C", "\u8FD4\u56DE"]
      },
      english: {
        thought: ["thought", "thinking", "think"],
        action: ["action", "act"],
        actionInput: ["action input", "action_input", "input"],
        finalAnswer: ["final answer", "answer", "result"],
        observation: ["observation", "obs"]
      }
    };
  }
  /**
   * 通义千问特殊格式处理
   * 处理一些通义千问模型特有的输出变体
   */
  extractCustomAction(text) {
    const willDoPattern = /我将(?:使用|调用|执行)([^，。\n]+)(?:工具|功能)[，。]?(?:来|去)?([^。\n]*)/;
    const willDoMatch = text.match(willDoPattern);
    if (willDoMatch) {
      return {
        action: willDoMatch[1].trim(),
        actionInput: willDoMatch[2].trim() || "default",
        thought: "\u9700\u8981\u4F7F\u7528\u5DE5\u5177"
      };
    }
    const executePattern = /(?:^|\n)\s*执行\s*[:：]\s*([^\n]+)/im;
    const executeMatch = text.match(executePattern);
    if (executeMatch) {
      const parts = executeMatch[1].split(/[，,]/);
      if (parts.length >= 2) {
        return {
          action: parts[0].trim(),
          actionInput: parts.slice(1).join(",").trim(),
          thought: "\u6267\u884C\u5DE5\u5177"
        };
      }
    }
    return null;
  }
  /**
   * 重写格式化指令，添加通义千问特殊说明
   */
  buildFormatInstructions() {
    const base = super.buildFormatInstructions();
    return `${base}

**\u901A\u4E49\u5343\u95EE\u7279\u6B8A\u683C\u5F0F\u652F\u6301\uFF1A**
- \u4E5F\u652F\u6301\uFF1A\u6211\u5C06\u4F7F\u7528[\u5DE5\u5177\u540D]\u6765[\u53C2\u6570\u63CF\u8FF0]
- \u4E5F\u652F\u6301\uFF1A\u6267\u884C: [\u5DE5\u5177\u540D], [\u53C2\u6570]
- \u652F\u6301\u89C2\u5BDF\u5173\u952E\u5B57\uFF1A\u89C2\u5BDF:, \u7ED3\u679C:, \u8FD4\u56DE:`;
  }
};

// src/factory.ts
var import_output_parsers2 = require("@langchain/core/output_parsers");
var ChineseReActParserFactory = class {
  /**
   * 创建指定类型的解析器
   */
  static createParser(modelType, options = {}) {
    switch (modelType) {
      case "qwen":
        return new QwenReActOutputParser(options);
      case "chatglm":
        return new ChatGLMReActOutputParser(options);
      case "baichuan":
        return new BaichuanReActOutputParser(options);
      case "ernie":
        return new ERNIEReActOutputParser(options);
      case "glm":
        return new ChatGLMReActOutputParser(options);
      case "minimax":
        return new QwenReActOutputParser(options);
      case "auto":
        return new UniversalChineseReActParser(options);
      default:
        throw new Error(`\u4E0D\u652F\u6301\u7684\u6A21\u578B\u7C7B\u578B: ${modelType}`);
    }
  }
  /**
   * 获取所有支持的模型类型
   */
  static getSupportedModels() {
    return ["qwen", "chatglm", "baichuan", "glm", "ernie", "minimax", "auto"];
  }
  /**
   * 检查是否支持指定模型
   */
  static isSupported(modelType) {
    return this.getSupportedModels().includes(modelType);
  }
};
var UniversalChineseReActParser = class extends import_output_parsers2.BaseOutputParser {
  constructor(options = {}) {
    super();
    this.lc_namespace = ["langchain-react-chinese-parser", "parsers", "universal"];
    this.options = options;
    this.parsers = [
      new QwenReActOutputParser(options),
      new ChatGLMReActOutputParser(options),
      new BaichuanReActOutputParser(options),
      new ERNIEReActOutputParser(options)
    ];
  }
  async parse(text) {
    const errors = [];
    for (const parser of this.parsers) {
      try {
        const result = await parser.parse(text);
        if (this.options.debug) {
          console.log(`[Universal] \u6210\u529F\u4F7F\u7528 ${parser.getType()} \u89E3\u6790`);
        }
        return result;
      } catch (error) {
        errors.push(error);
        if (this.options.debug) {
          console.log(`[Universal] ${parser.getType()} \u89E3\u6790\u5931\u8D25:`, error);
        }
      }
    }
    throw new Error(
      `\u6240\u6709\u89E3\u6790\u5668\u90FD\u65E0\u6CD5\u89E3\u6790\u6B64\u8F93\u51FA\u3002\u9519\u8BEF\u8BE6\u60C5:
${errors.map((e) => e.message).join("\n\n")}`
    );
  }
  getFormatInstructions() {
    return `\u8BF7\u6309\u7167\u4EE5\u4E0B\u4EFB\u4E00\u683C\u5F0F\u56DE\u7B54\uFF1A

**\u901A\u4E49\u5343\u95EE\u683C\u5F0F\uFF1A**
\u601D\u8003: \u63CF\u8FF0\u601D\u8003\u8FC7\u7A0B
\u52A8\u4F5C: \u5DE5\u5177\u540D\u79F0  
\u52A8\u4F5C\u8F93\u5165: \u5DE5\u5177\u53C2\u6570

**ChatGLM\u683C\u5F0F\uFF1A**
\u601D\u8003\uFF1A\u63CF\u8FF0\u601D\u8003\u8FC7\u7A0B
\u5DE5\u5177\uFF1A\u5DE5\u5177\u540D\u79F0
\u5DE5\u5177\u8F93\u5165\uFF1A\u5DE5\u5177\u53C2\u6570

**\u767E\u5DDD\u683C\u5F0F\uFF1A**
\u601D\u8003: \u63CF\u8FF0\u601D\u8003\u8FC7\u7A0B
\u5DE5\u5177: \u5DE5\u5177\u540D\u79F0
\u5DE5\u5177\u8F93\u5165: \u5DE5\u5177\u53C2\u6570

**\u6587\u5FC3\u4E00\u8A00\u683C\u5F0F\uFF1A**
\u601D\u8003\uFF1A\u63CF\u8FF0\u601D\u8003\u8FC7\u7A0B
\u8C03\u7528\u5DE5\u5177\uFF1A\u5DE5\u5177\u540D\u79F0
\u8F93\u5165\uFF1A\u5DE5\u5177\u53C2\u6570

**\u6700\u7EC8\u7B54\u6848\u683C\u5F0F\uFF08\u4EFB\u4F55\u6A21\u578B\uFF09\uFF1A**
\u601D\u8003: \u63CF\u8FF0\u601D\u8003\u8FC7\u7A0B
\u6700\u7EC8\u7B54\u6848: \u4F60\u7684\u7B54\u6848

**\u6CE8\u610F\uFF1A**
- \u652F\u6301\u4E2D\u82F1\u6587\u5173\u952E\u5B57\u6DF7\u7528
- \u652F\u6301\u4E2D\u6587\u5192\u53F7\uFF1A\u548C\u82F1\u6587\u5192\u53F7:
- \u5DE5\u5177\u540D\u548C\u53C2\u6570\u8981\u6E05\u6670\u660E\u786E`;
  }
  getType() {
    return "universal_chinese_react_parser";
  }
};
function createChineseReActParser(modelType, options = {}) {
  return ChineseReActParserFactory.createParser(modelType, options);
}
function createQwenParser(options = {}) {
  return new QwenReActOutputParser(options);
}
function createChatGLMParser(options = {}) {
  return new ChatGLMReActOutputParser(options);
}
function createBaichuanParser(options = {}) {
  return new BaichuanReActOutputParser(options);
}
function createERNIEParser(options = {}) {
  return new ERNIEReActOutputParser(options);
}
function createAutoParser(options = {}) {
  return ChineseReActParserFactory.createParser("auto", options);
}

// src/index.ts
var VERSION = "1.0.0";
var SUPPORTED_MODELS = [
  "qwen",
  // 通义千问
  "chatglm",
  // ChatGLM
  "baichuan",
  // 百川
  "glm",
  // 智谱GLM
  "ernie",
  // 文心一言
  "minimax",
  // Minimax
  "auto"
  // 自动识别
];
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BaichuanReActOutputParser,
  BaseChineseReActParser,
  ChatGLMReActOutputParser,
  ChineseReActParserFactory,
  ERNIEReActOutputParser,
  QwenReActOutputParser,
  SUPPORTED_MODELS,
  VERSION,
  createAutoParser,
  createBaichuanParser,
  createChatGLMParser,
  createChineseReActParser,
  createERNIEParser,
  createQwenParser
});
//# sourceMappingURL=index.js.map