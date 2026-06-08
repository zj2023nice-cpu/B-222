import aiService from "../../../../services/ai";

Component({
  options: {
    multipleSlots: true,
    addGlobalClass: true,
    styleIsolation: "shared",
  },
  data: {
    messages: [],
    inputValue: "",
    isTyping: false,
    aiAvatar: "/images/ai-avatar.jpg",
    userAvatar: "",
    isLoading: false,
    userName: "我",
  },

  lifetimes: {
    attached() {
      const userInfo = wx.getStorageSync("userInfo");
      if (userInfo) {
        this.setData({
          userAvatar: userInfo.avatarUrl || userInfo.avatar || "",
          userName: userInfo.nickName || userInfo.nickname || "我",
        });
      }
    },
  },

  methods: {
    onInputChange(e) {
      this.setData({ inputValue: e.detail.value });
    },

    async sendMessage(e) {
      const text = (e.detail.value || this.data.inputValue).trim();
      if (!text || this.data.isTyping) return;

      const timestamp = Date.now();
      const date = new Date(timestamp);
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      const timeStr = `${hours}:${minutes}`;

      const userMsg = {
        id: "u" + timestamp,
        role: "user",
        content: text,
        status: "success",
        name: this.data.userName,
        datetime: timeStr,
      };

      const aiTempId = "a" + timestamp;
      const aiPlaceholderMsg = {
        id: aiTempId,
        role: "ai",
        content: "",
        status: "pending",
        name: "AI 心理助手",
        datetime: timeStr,
      };

      const currentRequestId = timestamp;
      this.activeRequestId = currentRequestId;

      this.setData({
        messages: [aiPlaceholderMsg, userMsg, ...this.data.messages],
        inputValue: "",
        isTyping: true,
        isLoading: true,
      });

      const history = [userMsg, ...this.data.messages]
        .slice(0, 10)
        .reverse()
        .map((m) => ({
          role: m.role === "ai" ? "assistant" : m.role,
          content: m.content,
        }));

      try {
        const result = await aiService.chat(history);

        // 如果请求已被取消，则不处理结果
        if (this.activeRequestId !== currentRequestId) return;

        if (!result || !result.success) {
          this.updateAiMsg(
            aiTempId,
            result?.reply || "抱歉，连接断开了。",
            "error",
          );
          return;
        }
        this.updateAiMsg(aiTempId, result.reply, "success");
      } catch (err) {
        if (this.activeRequestId !== currentRequestId) return;
        console.error("AI chat failed", err);
        this.updateAiMsg(aiTempId, "网络连接失败，请重试。", "error");
      } finally {
        if (this.activeRequestId === currentRequestId) {
          this.setData({ isTyping: false, isLoading: false });
          this.activeRequestId = null;
        }
      }
    },

    onCancel() {
      if (!this.data.isLoading) return;

      this.activeRequestId = null;
      this.setData({
        isTyping: false,
        isLoading: false,
      });

      // 找到最近的一个 pending 消息并标记为已取消
      const pendingMsg = this.data.messages.find((m) => m.status === "pending");
      if (pendingMsg) {
        this.updateAiMsg(pendingMsg.id, "已终止思考。", "error");
      }
    },

    updateAiMsg(tempId, content, status) {
      const newMessages = this.data.messages.map((m) => {
        if (m.id === tempId) {
          return { ...m, content: content || "...", status };
        }
        return m;
      });
      this.setData({ messages: newMessages });
    },

    onAvatarError(e) {
      const { type } = e.currentTarget.dataset;
      this.setData({ [type === "ai" ? "aiAvatar" : "userAvatar"]: "" });
    },
    onScrollTop() {},
  },
});
