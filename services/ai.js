import { CLOUD_FUNCTIONS } from "../config/index";

const CLOUD_FUNCTION_NAME = CLOUD_FUNCTIONS.AI_CHAT;
const STORAGE_KEY = "ai_chat_sessions";

const aiService = {
  async chat(messages, sessionId, continueFrom) {
    try {
      const data = { messages, stream: false };
      if (sessionId) {
        data.sessionId = sessionId;
      }
      if (continueFrom) {
        data.continueFrom = continueFrom;
      }
      const { result } = await wx.cloud.callFunction({
        name: CLOUD_FUNCTION_NAME,
        data,
      });
      return {
        ...result,
        risk: !!result.risk,
        crisisGuide: result.crisisGuide || null,
      };
    } catch (err) {
      console.error("[AI Service Error][chat]:", err);
      throw err;
    }
  },

  chatStream(messages, sessionId, continueFrom, callbacks) {
    const { onDelta, onDone, onError } = callbacks || {};
    let buffer = "";
    let fullText = "";
    let isCancelled = false;

    const cancel = () => {
      isCancelled = true;
    };

    const processLine = (line) => {
      if (!line || !line.trim()) return;
      try {
        const data = JSON.parse(line.trim());
        if (data.type === "delta" && data.content) {
          fullText += data.content;
          onDelta && onDelta(data.content, fullText);
        } else if (data.type === "done") {
          onDone && onDone({
            success: true,
            reply: data.fullText,
            risk: !!data.risk,
            crisisGuide: data.crisisGuide || null,
            openid: data.openid,
            sessionId: data.sessionId,
          });
        } else if (data.type === "error") {
          onError && onError(new Error(data.error || "Unknown error"));
        }
      } catch (e) {
        console.warn("[AI Service] Parse line error:", e, line);
      }
    };

    (async () => {
      try {
        const data = { messages, stream: true };
        if (sessionId) {
          data.sessionId = sessionId;
        }
        if (continueFrom) {
          data.continueFrom = continueFrom;
        }

        const result = await wx.cloud.callFunction({
          name: CLOUD_FUNCTION_NAME,
          data,
          config: {
            enableStreaming: true,
          },
        });

        if (result.on) {
          result.on("event", (event) => {
            if (isCancelled) return;
            const chunk =
              typeof event.data === "string"
                ? event.data
                : new TextDecoder().decode(event.data);
            buffer += chunk;

            let newlineIndex;
            while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
              const line = buffer.slice(0, newlineIndex);
              buffer = buffer.slice(newlineIndex + 1);
              processLine(line);
            }
          });

          result.on("done", () => {
            if (isCancelled) return;
            if (buffer.trim()) {
              processLine(buffer);
            }
          });

          result.on("error", (err) => {
            if (isCancelled) return;
            console.error("[AI Service] Stream error:", err);
            onError && onError(err);
          });
        } else {
          onError && onError(new Error("Streaming not supported"));
        }
      } catch (err) {
        if (isCancelled) return;
        console.error("[AI Service Error][chatStream]:", err);
        onError && onError(err);
      }
    })();

    return { cancel, getFullText: () => fullText };
  },

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

  _loadAllSessions() {
    try {
      const raw = wx.getStorageSync(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) {
      console.error("[AI Service Error][_loadAllSessions]:", e);
      return [];
    }
  },

  _saveAllSessions(sessions) {
    try {
      wx.setStorageSync(STORAGE_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.error("[AI Service Error][_saveAllSessions]:", e);
    }
  },

  getSessions() {
    const sessions = this._loadAllSessions();
    return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  },

  getSession(sessionId) {
    const sessions = this._loadAllSessions();
    return sessions.find((s) => s.sessionId === sessionId) || null;
  },

  saveSession(session) {
    const sessions = this._loadAllSessions();
    const idx = sessions.findIndex((s) => s.sessionId === session.sessionId);
    session.updatedAt = Date.now();
    if (idx > -1) {
      sessions[idx] = session;
    } else {
      session.createdAt = session.createdAt || Date.now();
      sessions.push(session);
    }
    this._saveAllSessions(sessions);
  },

  deleteSession(sessionId) {
    let sessions = this._loadAllSessions();
    sessions = sessions.filter((s) => s.sessionId !== sessionId);
    this._saveAllSessions(sessions);
  },

  createSession() {
    const session = {
      sessionId: "s_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
      title: "",
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    return session;
  },
};

export default aiService;
