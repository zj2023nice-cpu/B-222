const tcb = require("@cloudbase/node-sdk");

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

    return {
      success: true,
      reply: fullText,
      reasoning: "",
      openid: openId,
      sessionId: sessionId || null,
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
