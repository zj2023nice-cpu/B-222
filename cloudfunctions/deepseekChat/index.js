const tcb = require("@cloudbase/node-sdk");

const CRISIS_KEYWORDS = [
  "自杀", "想死", "不想活", "活不下去", "结束生命", "了结自己",
  "跳楼", "割腕", "服毒", "吞药", "自残", "自伤", "伤害自己",
  "跳河", "上吊", "割脉", "寻死", "一了百了", "生无可恋",
  "没有活下去的意义", "死了算了", "活着没意思",
];

const CRISIS_HELP_GUIDE =
  "\n\n🆘 如果你正在经历痛苦或有伤害自己的想法，请立即寻求帮助：\n" +
  "• 全国24小时心理援助热线：400-161-9995\n" +
  "• 北京心理危机研究与干预中心：010-82951332\n" +
  "• 生命热线：400-821-1215\n" +
  "• 你也可以联系学校心理咨询中心或辅导员，他们随时愿意帮助你。\n" +
  "请记住，你并不孤单，有人愿意倾听和帮助。";

function detectCrisis(messages) {
  const userText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join(" ");
  return CRISIS_KEYWORDS.some((kw) => userText.includes(kw));
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
        "你是一个温暖、富有同理心的校园心理咨询助手。请用温柔、支持性的语气回答学生的问题。如果遇到危机情况（如自伤、自杀倾向），请引导他们寻求专业帮助。",
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
