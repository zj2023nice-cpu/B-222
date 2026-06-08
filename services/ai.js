const CLOUD_FUNCTION_NAME = "deepseekChat";

/**
 * AI 聊天服务
 */
const aiService = {
  /**
   * 发送消息并获取回复
   * @param {Array} messages 历史消息数组
   */
  async chat(messages) {
    try {
      const { result } = await wx.cloud.callFunction({
        name: CLOUD_FUNCTION_NAME,
        data: {
          messages,
        },
      });
      return result;
    } catch (err) {
      console.error("[AI Service Error][chat]:", err);
      throw err;
    }
  },

  /**
   * 获取 AI 助手用的头像 (从咨询师集合中获取)
   */
  async getAiAvatar() {
    try {
      const db = wx.cloud.database();
      const { data } = await db.collection("consultants").limit(1).get();
      if (data && data.length > 0) {
        return data[0].avatar;
      }
      return null;
    } catch (err) {
      console.error("[AI Service Error][getAiAvatar]:", err);
      return null;
    }
  },
};

export default aiService;
