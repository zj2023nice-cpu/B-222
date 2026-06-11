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
    recordDate: "",
    recordDateStr: "",
    isRecordDateToday: true,
    showRecordCalendar: false,
    recordMinDate: 0,
    recordMaxDate: 0,
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
    dateFilter: {
      mode: "all", // all | range
      start: null, // YYYY-MM-DD
      end: null,   // YYYY-MM-DD
    },
    formattedDateFilter: "全部情绪记录",
    showCalendar: false,
    calendarValue: [],
    rangeStats: {
      totalRecords: 0,
      topMood: null,
      topMoodCount: 0,
    },
    minDate: new Date("2025/01/01 00:00:00").getTime(), // 默认一个较早的时间
    maxDate: new Date().setHours(23, 59, 59, 999), // 默认今天结束
    rowSkeleton: [
      { width: "40%", height: "32rpx" },
      { width: "100%", height: "48rpx" },
      { width: "80%", height: "32rpx" },
    ],
    weeklyReport: {
      days: [],
      trendDesc: "",
      totalRecords: 0,
      weekRange: "",
    },
  },

  onLoad(options) {
    const app = getApp();
    this.setData({
      navbarHeight: app.globalData.navbarHeight,
    });

    this.initRecordDate();
    console.log("Mood page onLoad options:", options);

    const targetTab = options.activeTab || "record";

    this.setData(
      {
        activeTab: targetTab,
      },
      () => {
        this.fetchHistory();
      },
    );
  },

  initRecordDate() {
    const now = new Date();
    const todayStr = this.formatDateStr(now);

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const dateDisplay = this.getDateDisplayObj(todayStr);

    this.setData({
      todayDay: dateDisplay.day,
      todayMonthYear: dateDisplay.monthYear,
      recordDate: todayStr,
      recordDateStr: "今天",
      isRecordDateToday: true,
      recordMinDate: sevenDaysAgo.getTime(),
      recordMaxDate: todayEnd.getTime(),
    });
  },

  getDateDisplayObj(dateStr) {
    const date = new Date(dateStr);
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
    return {
      day: date.getDate().toString().padStart(2, "0"),
      monthYear: `${months[date.getMonth()]} . ${date.getFullYear()}`,
    };
  },

  formatDateStr(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  },

  formatRecordDateDisplay(dateStr) {
    const today = this.formatDateStr(new Date());
    if (dateStr === today) {
      return "今天";
    }
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateStr === this.formatDateStr(yesterday)) {
      return "昨天";
    }
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    return `${month}月${day}日 ${dayNames[date.getDay()]}`;
  },

  onRecordCalendarToggle() {
    this.setData({ showRecordCalendar: !this.data.showRecordCalendar });
  },

  onRecordDateConfirm(e) {
    const { value } = e.detail;
    const date = new Date(value);
    const dateStr = this.formatDateStr(date);

    if (!this.isValidRecordDate(dateStr)) {
      Toast({
        context: this,
        selector: "#t-toast",
        message: "只能补录最近 7 天内的情绪哦",
        theme: "warning",
        direction: "column",
      });
      return;
    }

    const today = this.formatDateStr(new Date());
    const isToday = dateStr === today;
    const dateDisplay = this.getDateDisplayObj(dateStr);

    this.setData(
      {
        todayDay: dateDisplay.day,
        todayMonthYear: dateDisplay.monthYear,
        recordDate: dateStr,
        recordDateStr: this.formatRecordDateDisplay(dateStr),
        isRecordDateToday: isToday,
        showRecordCalendar: false,
      },
      () => {
        this.checkExistingRecord(dateStr);
      },
    );
  },

  isValidRecordDate(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);

    return target.getTime() >= sevenDaysAgo.getTime() && target.getTime() <= today.getTime();
  },

  checkExistingRecord(dateStr) {
    const { allHistoryRecords } = this.data;
    const hasRecord = allHistoryRecords.some((item) => item.dateKey === dateStr);
    if (hasRecord) {
      Toast({
        context: this,
        selector: "#t-toast",
        message: "这一天已经记录过啦，继续记录会追加一条哦",
        theme: "warning",
        direction: "column",
      });
    }
  },

  onTabChange(e) {
    this.setData({ activeTab: e.detail.value });
    if (e.detail.value === "history") {
      this.fetchHistory();
    } else if (e.detail.value === "weekly") {
      this.computeWeeklyReport();
    }
  },

  async fetchHistory(silent = false) {
    if (!silent) this.setData({ isLoading: true });
    try {
      const { data } = await moodService.fetchHistory();

      const records = data.map((item) => {
        const moodInfo =
          this.data.moodOptions.find((m) => m.type === item.mood) || {};

        let dateKey = "";
        let dateLabel = "";
        let timeStr = "";

        if (item.dateStr) {
          dateKey = item.dateStr;
          const [year, month, day] = item.dateStr.split("-");
          dateLabel = `${parseInt(month, 10)}月${parseInt(day, 10)}日`;
        } else if (item.createTime) {
          const date = new Date(item.createTime);
          const year = date.getFullYear();
          const month = (date.getMonth() + 1).toString().padStart(2, "0");
          const day = date.getDate().toString().padStart(2, "0");
          dateKey = `${year}-${month}-${day}`;
          dateLabel = `${month}月${day}日`;
        }

        if (item.createTime) {
          const date = new Date(item.createTime);
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
          dateStr: dateLabel,
          dateKey,
        };
      });

      this.setData({ allHistoryRecords: records }, () => {
        if (records.length > 0) {
          const validKeys = records
            .filter((r) => r.dateKey)
            .map((r) => r.dateKey);

          if (validKeys.length > 0) {
            validKeys.sort();
            const earliestKey = validKeys[0];
            const [ey, em, ed] = earliestKey.split("-").map((x) => parseInt(x, 10));
            const minDateTime = new Date(ey, em - 1, ed, 0, 0, 0, 0).getTime();

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
        this.computeWeeklyReport();
        if (this.data.recordDate) {
          this.checkExistingRecord(this.data.recordDate);
        }
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
    const { allHistoryRecords, dateFilter, moodOptions } = this.data;

    let filtered = allHistoryRecords;
    let formattedLabel = "全部情绪记录";

    if (dateFilter.mode === "range" && dateFilter.start && dateFilter.end) {
      const startKey = dateFilter.start;
      const endKey = dateFilter.end;

      filtered = allHistoryRecords.filter((item) => {
        if (!item.dateKey) return false;
        return item.dateKey >= startKey && item.dateKey <= endKey;
      });

      const [sy, sm, sd] = startKey.split("-").map((x) => parseInt(x, 10));
      const [ey, em, ed] = endKey.split("-").map((x) => parseInt(x, 10));
      if (startKey === endKey) {
        formattedLabel = `${sm}月${sd}日的心情`;
      } else {
        formattedLabel = `${sm}月${sd}日 - ${em}月${ed}日的心情`;
      }
    }

    const totalRecords = filtered.length;
    let topMood = null;
    let topMoodCount = 0;

    if (totalRecords > 0) {
      const moodCounts = {};
      filtered.forEach((r) => {
        if (r.mood) {
          moodCounts[r.mood] = (moodCounts[r.mood] || 0) + 1;
        }
      });

      const sorted = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]);
      if (sorted.length > 0) {
        const [moodType, count] = sorted[0];
        topMoodCount = count;
        const moodInfo = moodOptions.find((m) => m.type === moodType) || {};
        topMood = {
          type: moodType,
          emoji: moodInfo.emoji || "❓",
          label: moodInfo.label || "未知",
          color: moodInfo.color || "#999",
        };
      }
    }

    this.setData({
      historyRecords: filtered,
      formattedDateFilter: formattedLabel,
      rangeStats: {
        totalRecords,
        topMood,
        topMoodCount,
      },
    });
  },

  computeWeeklyReport() {
    const { allHistoryRecords, moodOptions } = this.data;
    const dayNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    const positiveMoods = ["happy", "excited", "calm"];

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const weekStart = new Date(sevenDaysAgo);
    const weekEnd = new Date(today);
    const rangeLabel = `${(weekStart.getMonth() + 1).toString().padStart(2, "0")}月${weekStart.getDate().toString().padStart(2, "0")}日 - ${(weekEnd.getMonth() + 1).toString().padStart(2, "0")}月${weekEnd.getDate().toString().padStart(2, "0")}日`;

    const weekRecords = allHistoryRecords.filter((r) => {
      if (!r.dateKey) return false;
      const d = new Date(r.dateKey);
      d.setHours(0, 0, 0, 0);
      return d.getTime() >= sevenDaysAgo.getTime() && d.getTime() <= today.getTime();
    });

    const dayMap = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
      dayMap[key] = {
        dateKey: key,
        dateLabel: `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}`,
        dayLabel: dayNames[d.getDay()],
        moodCounts: {},
        count: 0,
        dominantMood: "",
        emoji: "",
        label: "",
        color: "",
      };
    }

    weekRecords.forEach((r) => {
      const entry = dayMap[r.dateKey];
      if (!entry) return;
      entry.count++;
      entry.moodCounts[r.mood] = (entry.moodCounts[r.mood] || 0) + 1;
    });

    const days = Object.values(dayMap);
    days.forEach((entry) => {
      if (entry.count > 0) {
        const sorted = Object.entries(entry.moodCounts).sort(
          (a, b) => b[1] - a[1],
        );
        const topMood = sorted[0][0];
        const moodInfo = moodOptions.find((m) => m.type === topMood) || {};
        entry.dominantMood = topMood;
        entry.emoji = moodInfo.emoji || "❓";
        entry.label = moodInfo.label || "未知";
        entry.color = moodInfo.color || "#999";
      }
    });

    const totalRecords = weekRecords.length;

    let positiveCount = 0;
    let negativeCount = 0;
    days.forEach((d) => {
      if (d.count === 0) return;
      if (positiveMoods.includes(d.dominantMood)) {
        positiveCount++;
      } else {
        negativeCount++;
      }
    });

    let trendDesc = "";
    const daysWithData = days.filter((d) => d.count > 0);

    if (daysWithData.length === 0) {
      trendDesc = "近 7 天还没有情绪记录，去记一记吧～";
    } else if (positiveCount === 0 && negativeCount > 0) {
      trendDesc = "本周情绪偏低落，记得给自己一些放松的时间。";
    } else if (negativeCount === 0 && positiveCount > 0) {
      trendDesc = "本周情绪都很积极，继续保持好状态！";
    } else if (positiveCount > negativeCount) {
      trendDesc = "本周积极情绪占多，整体状态不错！";
    } else if (negativeCount > positiveCount) {
      trendDesc = "本周负面情绪偏多，试试和朋友聊聊天？";
    } else {
      trendDesc = "本周情绪起伏较均衡，接纳每一份感受。";
    }

    if (daysWithData.length >= 3) {
      const halfLen = Math.ceil(daysWithData.length / 2);
      const firstHalf = daysWithData.slice(0, halfLen);
      const secondHalf = daysWithData.slice(halfLen);
      const firstPosRatio =
        firstHalf.filter((d) => positiveMoods.includes(d.dominantMood))
          .length / firstHalf.length;
      const secondPosRatio =
        secondHalf.filter((d) => positiveMoods.includes(d.dominantMood))
          .length / secondHalf.length;

      if (secondPosRatio > firstPosRatio + 0.2) {
        trendDesc = "情绪趋势向好，后半周比前半周更积极！";
      } else if (firstPosRatio > secondPosRatio + 0.2) {
        trendDesc = "后半周情绪有所回落，注意调整节奏。";
      }
    }

    this.setData({
      weeklyReport: {
        days,
        trendDesc,
        totalRecords,
        weekRange: rangeLabel,
      },
    });
  },

  onCalendarConfirm(e) {
    const { value } = e.detail;

    let start = null;
    let end = null;
    let mode = "all";

    if (Array.isArray(value) && value.length >= 2 && value[0] && value[1]) {
      const s = new Date(value[0]);
      const e = new Date(value[1]);
      start = this.formatDateStr(s);
      end = this.formatDateStr(e);
      if (start > end) {
        [start, end] = [end, start];
      }
      mode = "range";
    } else if (value && !Array.isArray(value)) {
      const d = new Date(value);
      start = this.formatDateStr(d);
      end = start;
      mode = "range";
    }

    this.setData(
      {
        dateFilter: { mode, start, end },
        showCalendar: false,
      },
      () => {
        this.filterHistoryByDate();
      },
    );
  },

  onCalendarToggle() {
    const willShow = !this.data.showCalendar;
    const { dateFilter } = this.data;

    let calendarValue = [];
    if (willShow && dateFilter.mode === "range" && dateFilter.start && dateFilter.end) {
      const startTs = new Date(dateFilter.start + " 00:00:00").getTime();
      const endTs = new Date(dateFilter.end + " 23:59:59").getTime();
      calendarValue = [startTs, endTs];
    }

    this.setData({
      showCalendar: willShow,
      calendarValue,
    });
  },

  clearDateFilter() {
    this.setData(
      {
        dateFilter: { mode: "all", start: null, end: null },
        calendarValue: [],
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

    if (!this.isValidRecordDate(this.data.recordDate)) {
      Toast({
        context: this,
        selector: "#t-toast",
        message: "只能补录最近 7 天内的情绪哦",
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
        this.data.recordDate,
      );

      const successMsg = this.data.isRecordDateToday
        ? "已封存这份感受"
        : `已补录 ${this.data.recordDateStr} 的情绪`;

      Toast({
        context: this,
        selector: "#t-toast",
        message: successMsg,
        theme: "success",
        direction: "column",
      });

      this.setData({
        selectedMood: "",
        content: "",
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

});
