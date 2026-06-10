const tcb = require("@cloudbase/node-sdk");

const CRISIS_INTENT_KEYWORDS = [
  "想死", "不想活了", "想自杀", "想结束生命", "一了百了",
  "让我死", "不如去死", "想去死", "好想死", "准备自杀",
  "打算自杀", "决定自杀", "生无可恋", "没有活下去的意义",
];

const CRISIS_ACTION_KEYWORDS = [
  "自杀", "跳楼", "割腕", "服毒", "吞药", "自残",
  "自伤", "跳河", "上吊", "割脉", "寻死", "了结自己",
  "伤害自己", "结束自己的生命",
];

const CRISIS_AMBIGUOUS_KEYWORDS = [
  "活不下去", "死了算了", "活着没意思",
];

const INTENT_AMPLIFIERS = [
  "真的", "实在", "已经", "再也", "好想", "就想", "真想",
];

const NEGATION_WORDS = [
  "不会", "不想", "别", "不要", "没想", "没有想", "不可能",
  "不至于", "没打算", "从未", "不曾",
];

const CRISIS_HELP_GUIDE =
  "\n\n🆘 如果你正在经历痛苦或有伤害自己的想法，请立即寻求帮助：\n" +
  "• 全国24小时心理援助热线：400-161-9995\n" +
  "• 北京心理危机研究与干预中心：010-82951332\n" +
  "• 生命热线：400-821-1215\n" +
  "• 你也可以联系学校心理咨询中心或辅导员，他们随时愿意帮助你。\n" +
  "请记住，你并不孤单，有人愿意倾听和帮助。";

function _hasNegationBefore(text, position, window) {
  var start = Math.max(0, position - window);
  var prefix = text.slice(start, position);
  return NEGATION_WORDS.some(function (neg) {
    return prefix.includes(neg);
  });
}

function detectCrisis(messages) {
  var userText = messages
    .filter(function (m) { return m.role === "user"; })
    .map(function (m) { return m.content; })
    .join(" ");

  for (var i = 0; i < CRISIS_INTENT_KEYWORDS.length; i++) {
    if (userText.includes(CRISIS_INTENT_KEYWORDS[i])) return true;
  }

  for (var i = 0; i < CRISIS_ACTION_KEYWORDS.length; i++) {
    var kw = CRISIS_ACTION_KEYWORDS[i];
    var idx = userText.indexOf(kw);
    if (idx === -1) continue;
    if (!_hasNegationBefore(userText, idx, 4)) return true;
  }

  for (var i = 0; i < CRISIS_AMBIGUOUS_KEYWORDS.length; i++) {
    var kw = CRISIS_AMBIGUOUS_KEYWORDS[i];
    var idx = userText.indexOf(kw);
    if (idx === -1) continue;
    if (_hasNegationBefore(userText, idx, 5)) continue;
    var hasAmplifier = INTENT_AMPLIFIERS.some(function (amp) {
      return userText.includes(amp);
    });
    if (hasAmplifier) return true;
  }

  return false;
}

exports.main = async (event, context) => {
  // 初始化云开发环境
  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV });
  const ai = app.ai();
  const auth = app.auth();

  const { messages, sessionId } = event;
  const { openId } = auth.getUserInfo();

  if (!messages || !Array.isArray(messages)) {
    return {
      success: false,
      error: "Missing or invalid messages parameter",
      reply: "参数错误，请重试。",
    };
  }

  try {
    // 准备对话消息
    const apiMessages = messages.map((msg) => ({
      role: msg.role === "ai" ? "assistant" : msg.role,
      content: msg.content,
    }));

    // 添加系统提示词
    apiMessages.unshift({
      role: "system",
      content:
        "你是一个温暖、富有同理心的校园心理咨询助手。\n\n" +
        "核心原则：\n" +
        "1. 倾听与共情优先——不要急于给建议或评判，先让学生感到被理解。\n" +
        "2. 对于普通负面情绪（压力大、焦虑、难过、迷茫），给予正常程度的支持和鼓励，不必过度反应。\n" +
        "3. 如果学生表露自伤或自杀倾向，务必：\n" +
        "   - 认真对待，绝不轻视或敷衍\n" +
        "   - 表达关心和支持，让他们感到被理解和陪伴\n" +
        "   - 鼓励他们寻求专业帮助（心理热线、学校咨询中心等）\n" +
        "   - 不要使用说教、命令或恐吓式语言\n" +
        "4. 不要替代专业心理咨询，遇到超出能力范围的问题要坦诚说明并建议寻求专业帮助。\n" +
        "5. 回复简洁温暖，避免冗长说教。",
    });

    // 创建模型实例 (根据参考代码)
    const aiModel = ai.createModel("deepseek");

    // 调用流式文本生成 (使用 V3 版本，不需要 R1 的思维链)
    const res = await aiModel.streamText({
      model: "deepseek-v3.2",
      messages: apiMessages,
    });

    let fullText = "";

    // 遍历正文内容
    for await (let data of res.dataStream) {
      if (data === "[DONE]") {
        break;
      }

      try {
        const delta = data?.choices?.[0]?.delta;

        // 打印生成文本内容
        const text = delta?.content;
        if (text) {
          fullText += text;
        }
      } catch (e) {
        // 忽略解析错误
      }
    }

    const isRisk = detectCrisis(messages);

    return {
      success: true,
      reply: isRisk ? fullText + CRISIS_HELP_GUIDE : fullText,
      reasoning: "",
      openid: openId,
      sessionId: sessionId || null,
      risk: isRisk,
      crisisGuide: isRisk ? CRISIS_HELP_GUIDE.trim() : null,
    };
  } catch (err) {
    console.error("DeepSeek Call Error:", err);
    return {
      success: false,
      error: err.message,
      reply:
        "抱歉，我现在有点累，请稍后再试或直接联系咨询师。官方接口返回：" +
        err.message,
    };
  }
};
