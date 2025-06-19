import { AgentAction, AgentFinish } from '@langchain/core/agents';
import { BaseOutputParser } from '@langchain/core/output_parsers';

/**
 * 中文 ReAct 解析器通用类型定义
 */

/**
 * 支持的中文大模型类型
 */
type ChineseModelType = 'qwen' | 'chatglm' | 'baichuan' | 'glm' | 'ernie' | 'minimax' | 'auto';
/**
 * 关键字映射配置
 */
interface KeywordMapping {
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
interface LanguageKeywords {
    /** 中文关键字 */
    chinese: KeywordMapping;
    /** 英文关键字 */
    english: KeywordMapping;
}
/**
 * 解析器配置选项
 */
interface ParserOptions {
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
type ParseResult = AgentAction | AgentFinish;
/**
 * 动作提取结果
 */
interface ActionMatch {
    action: string;
    actionInput: string;
    thought?: string;
}
/**
 * 解析器接口
 */
interface IChineseReActParser {
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
interface ModelParserConfig {
    /** 模型类型 */
    modelType: ChineseModelType;
    /** 语言关键字配置 */
    keywords: LanguageKeywords;
    /** 特殊格式处理函数 */
    customFormatHandler?: (text: string) => ParseResult | null;
    /** 格式化指令模板 */
    formatInstructionTemplate?: string;
}

/**
 * 中文 ReAct 解析器基类
 *
 * 为所有中文大模型提供通用的解析逻辑框架
 */

/**
 * 中文 ReAct 解析器基类
 */
declare abstract class BaseChineseReActParser extends BaseOutputParser<AgentAction | AgentFinish> implements IChineseReActParser {
    protected abstract modelType: ChineseModelType;
    protected abstract keywords: LanguageKeywords;
    protected options: ParserOptions;
    abstract lc_namespace: string[];
    constructor(options?: ParserOptions);
    /**
     * 解析模型输出
     */
    parse(text: string): Promise<ParseResult>;
    /**
     * 获取格式化指令
     */
    getFormatInstructions(): string;
    /**
     * 获取解析器类型
     */
    getType(): string;
    /**
     * 预处理文本
     */
    protected preprocessText(text: string): string;
    /**
     * 提取最终答案
     */
    protected extractFinalAnswer(text: string): string | null;
    /**
     * 提取动作和动作输入
     */
    protected extractAction(text: string): ActionMatch | null;
    /**
     * 按语言提取动作
     */
    protected extractActionByLanguage(text: string, language: 'chinese' | 'english'): ActionMatch | null;
    /**
     * 兜底策略：提取动作输入
     */
    protected extractActionInputFallback(text: string, action: string, language: 'chinese' | 'english'): string;
    /**
     * 构建格式化指令
     */
    protected buildFormatInstructions(): string;
    /**
     * 构建错误消息
     */
    protected buildErrorMessage(text: string): string;
    /**
     * 转义正则表达式特殊字符
     */
    protected escapeRegex(str: string): string;
    /**
     * LangChain 兼容性
     */
    _type(): string;
}

/**
 * 百川 ReAct 输出解析器
 *
 * 专门适配百川（Baichuan）模型的中文 ReAct 格式输出解析
 */

/**
 * 百川 ReAct 输出格式解析器
 *
 * 百川模型常见格式：
 * ```
 * 思考: 需要搜索相关信息
 * 工具: search
 * 工具输入: 查询内容
 *
 * 思考: 根据搜索结果分析
 * 最终答案: 分析结果
 * ```
 */
declare class BaichuanReActOutputParser extends BaseChineseReActParser {
    lc_namespace: string[];
    protected modelType: ChineseModelType;
    protected keywords: LanguageKeywords;
    constructor(options?: ParserOptions);
    /**
     * 百川特殊格式处理
     * 百川模型倾向于使用"工具"而非"动作"
     */
    protected extractCustomAction(text: string): {
        action: string;
        actionInput: string;
        thought: string;
    } | null;
    /**
     * 判断是否为工具名称
     */
    private isToolName;
    /**
     * 重写格式化指令
     */
    protected buildFormatInstructions(): string;
}

/**
 * ChatGLM ReAct 输出解析器
 *
 * 专门适配 ChatGLM 模型的中文 ReAct 格式输出解析
 */

/**
 * ChatGLM ReAct 输出格式解析器
 *
 * ChatGLM 常见格式：
 * ```
 * 思考：我需要查找相关信息
 * 动作：search
 * 动作输入：天气查询
 *
 * 思考：基于搜索结果，我可以给出答案
 * 最终答案：今天天气晴朗
 * ```
 */
declare class ChatGLMReActOutputParser extends BaseChineseReActParser {
    lc_namespace: string[];
    protected modelType: ChineseModelType;
    protected keywords: LanguageKeywords;
    constructor(options?: ParserOptions);
    /**
     * ChatGLM 特殊格式处理
     * ChatGLM 经常合并思考和动作，或使用冒号变体
     */
    protected extractCustomAction(text: string): {
        action: string;
        actionInput: string;
        thought: string;
    } | null;
    /**
     * ChatGLM 倾向于使用中文冒号，重写预处理逻辑
     */
    protected preprocessText(text: string): string;
    /**
     * 重写格式化指令
     */
    protected buildFormatInstructions(): string;
}

/**
 * 文心一言 ReAct 输出解析器
 *
 * 专门适配文心一言（ERNIE）模型的中文 ReAct 格式输出解析
 */

/**
 * 文心一言 ReAct 输出格式解析器
 *
 * ERNIE 模型常见格式：
 * ```
 * 思考：需要查询相关信息
 * 调用工具：search
 * 输入：查询内容
 *
 * 思考：基于查询结果进行分析
 * 最终答案：分析结果
 * ```
 */
declare class ERNIEReActOutputParser extends BaseChineseReActParser {
    lc_namespace: string[];
    protected modelType: ChineseModelType;
    protected keywords: LanguageKeywords;
    constructor(options?: ParserOptions);
    /**
     * ERNIE 特殊格式处理
     * ERNIE 倾向于使用"调用工具"和较长的关键字
     */
    protected extractCustomAction(text: string): {
        action: string;
        actionInput: string;
        thought: string;
    } | null;
    /**
     * ERNIE 特殊的预处理
     * 处理 ERNIE 经常出现的多余描述文字
     */
    protected preprocessText(text: string): string;
    /**
     * 重写格式化指令
     */
    protected buildFormatInstructions(): string;
}

/**
 * 通义千问 ReAct 输出解析器
 *
 * 专门适配通义千问（Qwen）模型的中文 ReAct 格式输出解析
 */

/**
 * 通义千问 ReAct 输出格式解析器
 *
 * 支持格式：
 * ```
 * 思考: 我需要搜索相关信息
 * 动作: search
 * 动作输入: 搜索内容
 *
 * 思考: 我已经找到了答案
 * 最终答案: 这是最终的答案
 * ```
 */
declare class QwenReActOutputParser extends BaseChineseReActParser {
    lc_namespace: string[];
    protected modelType: ChineseModelType;
    protected keywords: LanguageKeywords;
    constructor(options?: ParserOptions);
    /**
     * 通义千问特殊格式处理
     * 处理一些通义千问模型特有的输出变体
     */
    protected extractCustomAction(text: string): {
        action: string;
        actionInput: string;
        thought: string;
    } | null;
    /**
     * 重写格式化指令，添加通义千问特殊说明
     */
    protected buildFormatInstructions(): string;
}

/**
 * 中文 ReAct 解析器工厂
 *
 * 提供便捷的方法创建各种中文模型的 ReAct 解析器
 */

/**
 * 解析器工厂类
 */
declare class ChineseReActParserFactory {
    /**
     * 创建指定类型的解析器
     */
    static createParser(modelType: ChineseModelType, options?: ParserOptions): IChineseReActParser;
    /**
     * 获取所有支持的模型类型
     */
    static getSupportedModels(): ChineseModelType[];
    /**
     * 检查是否支持指定模型
     */
    static isSupported(modelType: string): boolean;
}
/**
 * 便捷函数：创建解析器
 */
declare function createChineseReActParser(modelType: ChineseModelType, options?: ParserOptions): IChineseReActParser;
/**
 * 便捷函数：创建通义千问解析器
 */
declare function createQwenParser(options?: ParserOptions): QwenReActOutputParser;
/**
 * 便捷函数：创建 ChatGLM 解析器
 */
declare function createChatGLMParser(options?: ParserOptions): ChatGLMReActOutputParser;
/**
 * 便捷函数：创建百川解析器
 */
declare function createBaichuanParser(options?: ParserOptions): BaichuanReActOutputParser;
/**
 * 便捷函数：创建文心一言解析器
 */
declare function createERNIEParser(options?: ParserOptions): ERNIEReActOutputParser;
/**
 * 便捷函数：创建自动解析器
 */
declare function createAutoParser(options?: ParserOptions): IChineseReActParser;

/**
 * LangChain 中文 ReAct 解析器
 *
 * 为中文大模型提供 LangChain ReAct 格式的输出解析支持
 * 支持：通义千问、ChatGLM、百川、智谱GLM、文心一言、Minimax 等主流中文模型
 *
 * @author langchain-react-chinese-parser
 * @version 1.0.0
 */

/**
 * 包版本信息
 */
declare const VERSION = "1.0.0";
/**
 * 支持的模型列表
 */
declare const SUPPORTED_MODELS: readonly ["qwen", "chatglm", "baichuan", "glm", "ernie", "minimax", "auto"];

export { type ActionMatch, BaichuanReActOutputParser, BaseChineseReActParser, ChatGLMReActOutputParser, type ChineseModelType, ChineseReActParserFactory, ERNIEReActOutputParser, type IChineseReActParser, type KeywordMapping, type LanguageKeywords, type ModelParserConfig, type ParseResult, type ParserOptions, QwenReActOutputParser, SUPPORTED_MODELS, VERSION, createAutoParser, createBaichuanParser, createChatGLMParser, createChineseReActParser, createERNIEParser, createQwenParser, createChineseReActParser as default };
