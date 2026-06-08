import Toast from "tdesign-miniprogram/toast/index";
import moodService from "../../../services/mood";

Page({
  data: {
    activeTab: "record",
    todayDay: "",
    todayMonthYear: "",
    selectedMood: "",
    content: "",
    isSubmitting: false,
    historyRecords: [],
    isRefreshing: false,
    moodOptions: [
      {
        type: "happy",
        label: "开心",
        emoji: "😊",
        color: "#FFC107",
        tip: "保持这份喜悦，去感染身边的人吧！",
      },
      {
        type: "excited",
        label: "充满活力",
        emoji: "⚡",
        color: "#4CAF50",
        tip: "精力充沛的时候，最适合去完成那些挑战项。",
      },
      {
        type: "calm",
        label: "平静",
        emoji: "😌",
        color: "#2196F3",
        tip: "平和的心态是深度思考的最佳伴侣。",
      },
      {
        type: "anxious",
        label: "焦虑",
        emoji: "😰",
        color: "#9C27B0",
        tip: "试试 4-7-8 呼吸法，给自己一个深呼吸的时间。",
      },
      {
        type: "sad",
        label: "难过",
        emoji: "😢",
        color: "#607D8B",
        tip: "没关系，允许自己停下来哭一场，这也是一种治愈。",
      },
      {
        type: "angry",
        label: "烦躁",
        emoji: "😤",
        color: "#F44336",
        tip: "试着离开当前环境，喝杯水，或者听一首轻音乐。",
      },
    ],
    currentMoodTip: "",
    isLoading: false,
    navbarHeight: 0,
    allHistoryRecords: [], // 存储全量历史记录
    selectedDate: null, // 默认不选日期，显示全部
    formattedSelectedDate: "全部情绪记录",
    showCalendar: false,
    minDate: new Date("2025/01/01 00:00:00").getTime(), // 默认一个较早的时间
    maxDate: new Date().setHours(23, 59, 59, 999), // 默认今天结束
    rowSkeleton: [
      { width: "40%", height: "32rpx" },
      { width: "100%", height: "48rpx" },
      { width: "80%", height: "32rpx" },
    ],
  },

  onLoad(options) {
    const app = getApp();
    this.setData({
      navbarHeight: app.globalData.navbarHeight,
    });

    this.updateDate();
    console.log("Mood page onLoad options:", options);

    // 支持通过 activeTab 值进入 ("record" 或 "history")
    const targetTab = options.activeTab || "record";

    this.setData(
      {
        activeTab: targetTab,
      },
      () => {
        // 无论进入哪个 Tab 都初始化一下历史记录
        this.fetchHistory();
      },
    );
  },

  updateDate() {
    const now = new Date();
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    this.setData({
      todayDay: now.getDate().toString().padStart(2, "0"),
      todayMonthYear: `${months[now.getMonth()]} . ${now.getFullYear()}`,
    });
  },

  onTabChange(e) {
    this.setData({ activeTab: e.detail.value });
    if (e.detail.value === "history") {
      this.fetchHistory();
    }
  },

  async fetchHistory(silent = false) {
    if (!silent) this.setData({ isLoading: true });
    try {
      const { data } = await moodService.fetchHistory();

      const records = data.map((item) => {
        const moodInfo =
          this.data.moodOptions.find((m) => m.type === item.mood) || {};

        // 格式化日期 YYYY-MM-DD 用于筛选
        let dateKey = "";
        let dateStr = "";
        let timeStr = "";
        if (item.createTime) {
          const date = new Date(item.createTime);
          const year = date.getFullYear();
          const month = (date.getMonth() + 1).toString().padStart(2, "0");
          const day = date.getDate().toString().padStart(2, "0");
          dateKey = `${year}-${month}-${day}`;
          dateStr = `${month}月${day}日`;

          const hours = date.getHours().toString().padStart(2, "0");
          const minutes = date.getMinutes().toString().padStart(2, "0");
          timeStr = `${hours}:${minutes}`;
        }

        return {
          ...item,
          emoji: moodInfo.emoji || "❓",
          label: moodInfo.label || "未知",
          color: moodInfo.color || "#999",
          timeStr,
          dateStr,
          dateKey,
        };
      });

      this.setData({ allHistoryRecords: records }, () => {
        // 动态计算可选日期范围
        if (records.length > 0) {
          // 找到最早的记录日期（records 默认是 desc，所以最后一条通常是最早的，但用计算最稳妥）
          const times = records
            .filter((r) => r.createTime)
            .map((r) => new Date(r.createTime).getTime());

          if (times.length > 0) {
            const minT = Math.min(...times);
            const earliestDate = new Date(minT);
            const minDateTime = new Date(
              earliestDate.getFullYear(),
              earliestDate.getMonth(),
              earliestDate.getDate(),
              0,
              0,
              0,
            ).getTime();

            // 设置 maxDate 为今天结束 23:59:59
            const now = new Date();
            const maxDateTime = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
              23,
              59,
              59,
            ).getTime();

            this.setData({
              minDate: minDateTime,
              maxDate: maxDateTime,
            });
          }
        }
        this.filterHistoryByDate();
      });
    } catch (err) {
      console.error("获取心情记录失败", err);
    } finally {
      this.setData({
        isLoading: false,
        isRefreshing: false,
      });
    }
  },

  filterHistoryByDate() {
    const { allHistoryRecords, selectedDate } = this.data;
    if (!selectedDate) {
      this.setData({
        historyRecords: allHistoryRecords,
        formattedSelectedDate: "全部情绪记录",
      });
      return;
    }

    const date = new Date(selectedDate);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const targetKey = `${year}-${month}-${day}`;

    const filtered = allHistoryRecords.filter(
      (item) => item.dateKey === targetKey,
    );
    this.setData({
      historyRecords: filtered,
      formattedSelectedDate: `${month}月${day}日的心情`,
    });
  },

  onCalendarConfirm(e) {
    const { value } = e.detail;
    this.setData(
      {
        selectedDate: value,
        showCalendar: false,
      },
      () => {
        this.filterHistoryByDate();
      },
    );
  },

  onCalendarToggle() {
    this.setData({ showCalendar: !this.data.showCalendar });
  },

  clearDateFilter() {
    this.setData(
      {
        selectedDate: null,
      },
      () => {
        this.filterHistoryByDate();
      },
    );
  },

  async onRefresh() {
    this.setData({ isRefreshing: true });
    await this.fetchHistory(true);
  },

  selectMood(e) {
    const { type } = e.currentTarget.dataset;
    const mood = this.data.moodOptions.find((m) => m.type === type);
    this.setData({
      selectedMood: type,
      currentMoodTip: mood ? mood.tip : "",
    });
  },

  onContentChange(e) {
    this.setData({
      content: e.detail.value,
    });
  },

  async saveDiary() {
    if (!this.data.selectedMood) {
      Toast({
        context: this,
        selector: "#t-toast",
        message: "请先选择一种情绪状态哦",
        theme: "warning",
        direction: "column",
      });
      return;
    }

    this.setData({ isSubmitting: true });

    try {
      await moodService.add(
        this.data.selectedMood,
        this.data.content,
        this.getLocalDateStr(),
      );

      Toast({
        context: this,
        selector: "#t-toast",
        message: "已封存这份感受",
        theme: "success",
        direction: "column",
      });

      // 清空状态并跳转到历史页
      this.setData({
        selectedMood: "",
        content: "",
        activeTab: "record",
      });
      this.fetchHistory();
    } catch (err) {
      console.error("保存情绪日记失败", err);
      Toast({
        context: this,
        selector: "#t-toast",
        message: "保存失败，请重试",
        theme: "error",
        direction: "column",
      });
    } finally {
      this.setData({ isSubmitting: false });
    }
  },

  getLocalDateStr() {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}`;
  },
});
