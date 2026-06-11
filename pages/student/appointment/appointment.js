import Toast from "tdesign-miniprogram/toast/index";
const appointmentService = require("../../../services/appointment").default;
const {
  findFirstAvailableSlot,
  getSlotsByDateStr,
  repairSelectionState,
  getNextNDays: pureGetNextNDays,
  handleDateSelection,
  enrichAvailableDatesWithSchedule,
  buildConsultantAvailabilitySummary,
} = require("./appointmentPure");

Page({
  data: {
    consultants: [],
    isLoading: true,
    avatarSkeleton: [{ size: "120rpx", type: "circle" }],
    infoSkeleton: [
      { width: "40%", height: "28rpx", margin: "0 0 2rpx 0" },
      { width: "20%", height: "22rpx", margin: "0 0 2rpx 0" },
      { width: "90%", height: "22rpx", margin: "0 0 2rpx 0" },
      { width: "100%", height: "22rpx", margin: "0 0 2rpx 0" },
    ],

    showSchedulePopup: false,
    selectedConsultant: null,
    selectedConsultantIndex: -1,

    availableDates: [],
    selectedDateIndex: 0,
    timeSlots: [],
    selectedTimeIndex: -1,

    showBookDialog: false,
    showCancelDialog: false,
    isPageLoading: false,
    hasActiveAppt: false,
    isRefreshing: false,
    allConsultants: [],
    keyword: "",
    navbarHeight: 0,

    showWaitlistDialog: false,
    waitlistDateStr: "",
    showCancelWaitlistDialog: false,

    showDetailPanel: false,
    detailConsultant: null,

    isBookingSubmitting: false,
    isCancelSubmitting: false,
    isJoinWaitlistSubmitting: false,
    isCancelWaitlistSubmitting: false,
    isSilentRefreshing: false,
  },

  showMessages(messages) {
    if (!messages || messages.length === 0) return;
    messages.forEach((msg, i) => {
      setTimeout(() => {
        Toast({
          context: this,
          selector: "#t-toast",
          message: msg,
          theme: "warning",
          direction: "column",
          placement: "middle",
        });
      }, i * 800);
    });
  },

  getNextNDays(n) {
    return pureGetNextNDays(n);
  },

  async onLoad() {
    this.setData({
      navbarHeight: getApp().globalData.navbarHeight,
    });
    this.fetchConsultants();
  },

  async onPullDownRefresh() {
    this.setData({ isRefreshing: true });
    await this.fetchConsultants();
    this.setData({ isRefreshing: false });
  },

  async fetchConsultants(silent = false) {
    if (silent && this.data.isSilentRefreshing) return;
    if (!silent) this.setData({ isLoading: true });
    if (silent) this.setData({ isSilentRefreshing: true });
    try {
      const userInfo = wx.getStorageSync("userInfo");
      if (!userInfo) return;

      if (this.data.isRefreshing) {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      const dates = this.getNextNDays(3);
      this.setData({ availableDates: dates });

      const { data: allConsultants, hasActiveAppt } =
        await appointmentService.getConsultants(dates);

      const enrichedConsultants = allConsultants.map((c) => ({
        ...c,
        hasWaitlist:
          c.schedule &&
          c.schedule.some(
            (s) => s.waitlistStatus === "waiting" || s.waitlistStatus === "notified",
          ),
      }));

      this.setData(
        {
          allConsultants: enrichedConsultants,
          hasActiveAppt,
        },
        () => {
          this.filterList();
        },
      );
    } catch (err) {
      console.error("获取咨询数据失败", err);
      if (!silent) {
        Toast({
          context: this,
          selector: "#t-toast",
          message: "数据加载失败",
          theme: "error",
          direction: "column",
        });
      }
    } finally {
      if (!silent) this.setData({ isLoading: false });
      if (silent) this.setData({ isSilentRefreshing: false });
    }
  },

  filterList() {
    const { allConsultants, keyword } = this.data;
    let consultants = allConsultants;

    if (keyword) {
      const lowerKeyword = keyword.toLowerCase();
      consultants = consultants.filter(
        (c) =>
          c.name?.toLowerCase().includes(lowerKeyword) ||
          c.expertise?.toLowerCase().includes(lowerKeyword),
      );
    }

    this.setData({ consultants });
  },

  onSearch(e) {
    const { value } = e.detail;
    this.setData({ keyword: value }, () => {
      this.filterList();
    });
  },

  onSearchClear() {
    this.setData({ keyword: "" }, () => {
      this.filterList();
    });
  },

  onAvatarError(e) {
    const { index } = e.currentTarget.dataset;
    this.setData({
      [`consultants[${index}].avatar`]: "",
    });
  },

  onCardTap(e) {
    const { index } = e.currentTarget.dataset;
    const consultant = this.data.consultants[index];
    if (!consultant) return;

    const {
      availableSummary,
      allFull,
      fullDateCount,
      totalDateCount,
    } = buildConsultantAvailabilitySummary(consultant);

    this.setData({
      showDetailPanel: true,
      detailConsultant: {
        ...consultant,
        _availableSummary: availableSummary,
        _allFull: allFull,
        _fullDateCount: fullDateCount,
        _totalDateCount: totalDateCount,
      },
    });
  },

  onCloseDetailPanel() {
    this.setData({ showDetailPanel: false });
  },

  book(e) {
    if (
      this.data.isBookingSubmitting ||
      this.data.isCancelSubmitting ||
      this.data.isJoinWaitlistSubmitting ||
      this.data.isCancelWaitlistSubmitting
    ) {
      return;
    }
    if (this.data.showSchedulePopup || this.data.showCancelDialog) {
      return;
    }
    const { index } = e.currentTarget.dataset;
    const consultant = this.data.consultants[index];

    if (consultant.isBooked) {
      this.setData({
        selectedConsultant: consultant,
        selectedConsultantIndex: index,
        showCancelDialog: true,
      });
      return;
    }
    if (this.data.hasActiveAppt) {
      Toast({
        context: this,
        selector: "#t-toast",
        message: "您已有待咨询的预约\n暂不能预约更多",
        theme: "warning",
        direction: "column",
        placement: "middle",
      });
      return;
    }

    const prevDateStr =
      this.data.selectedDateIndex >= 0 &&
      this.data.availableDates[this.data.selectedDateIndex]
        ? this.data.availableDates[this.data.selectedDateIndex].dateStr
        : null;
    const prevTime =
      this.data.selectedTimeIndex >= 0 &&
      this.data.timeSlots[this.data.selectedTimeIndex]
        ? this.data.timeSlots[this.data.selectedTimeIndex].time
        : null;

    const availableDates = enrichAvailableDatesWithSchedule(
      this.data.availableDates,
      consultant,
    );

    const { dateIndex, timeIndex, messages } = repairSelectionState({
      prevDateStr,
      prevTime,
      availableDates,
      consultant,
    });

    const timeSlots = getSlotsByDateStr(
      consultant,
      availableDates[dateIndex].dateStr,
    );

    this.setData(
      {
        selectedConsultant: consultant,
        selectedConsultantIndex: index,
        showSchedulePopup: true,
        availableDates: availableDates,
        selectedDateIndex: dateIndex,
        selectedTimeIndex: timeIndex,
        timeSlots: timeSlots,
      },
      () => {
        this.showMessages(messages);
      },
    );
  },

  onClosePopup() {
    if (
      this.data.isBookingSubmitting ||
      this.data.isCancelSubmitting ||
      this.data.isJoinWaitlistSubmitting ||
      this.data.isCancelWaitlistSubmitting
    ) {
      return;
    }
    this.setData({ showSchedulePopup: false });
  },

  onSelectDate(e) {
    const { index } = e.currentTarget.dataset;

    const prevTime =
      this.data.selectedTimeIndex >= 0 &&
      this.data.timeSlots[this.data.selectedTimeIndex]
        ? this.data.timeSlots[this.data.selectedTimeIndex].time
        : null;

    const result = handleDateSelection({
      dateIndex: index,
      availableDates: this.data.availableDates,
      consultant: this.data.selectedConsultant,
      prevTime,
    });

    if (!result) return;

    const { timeIndex, slots, message } = result;

    this.setData(
      {
        selectedDateIndex: index,
        selectedTimeIndex: timeIndex,
        timeSlots: slots,
      },
      () => {
        if (message) {
          Toast({
            context: this,
            selector: "#t-toast",
            message: message,
            theme: "warning",
            direction: "column",
            placement: "middle",
          });
        }
      },
    );
  },

  onSelectTime(e) {
    const { index } = e.currentTarget.dataset;
    const slot = this.data.timeSlots[index];
    if (slot.isFull) return;

    this.setData({ selectedTimeIndex: index });
  },

  handleConfirmSelection() {
    if (
      this.data.isBookingSubmitting ||
      this.data.isCancelSubmitting ||
      this.data.isJoinWaitlistSubmitting ||
      this.data.isCancelWaitlistSubmitting
    ) {
      return;
    }
    if (this.data.selectedTimeIndex === -1) {
      Toast({
        context: this,
        selector: "#t-toast",
        message: "请选择时间",
        theme: "warning",
        direction: "column",
        placement: "middle",
      });
      return;
    }
    this.setData({
      showSchedulePopup: false,
      showBookDialog: true,
    });
  },

  closeBookDialog() {
    if (this.data.isBookingSubmitting) return;
    this.setData({ showBookDialog: false });
  },

  async confirmBooking() {
    if (this.data.isBookingSubmitting) return;
    const index = this.data.selectedConsultantIndex;
    const consultant = this.data.selectedConsultant;
    const dateStr =
      this.data.availableDates[this.data.selectedDateIndex].dateStr;
    const time = this.data.timeSlots[this.data.selectedTimeIndex].time;

    this.setData({ isBookingSubmitting: true });

    try {
      const { _id } = await appointmentService.book({
        consultantId: consultant._id,
        consultantName: consultant.name,
        consultantAvatar: consultant.avatar,
        consultantTitle: consultant.title,
        dateStr: dateStr,
        time: time,
      });

      this.setData({ showBookDialog: false });

      const updateData = {};
      const prefix = `consultants[${index}]`;
      updateData[`${prefix}.isBooked`] = true;
      updateData[`${prefix}.bookedId`] = _id;
      updateData[`${prefix}.bookedDate`] = dateStr;
      updateData[`${prefix}.bookedTime`] = time;

      this.setData(updateData);
      this.fetchConsultants(true);

      Toast({
        context: this,
        selector: "#t-toast",
        message: "预约成功",
        theme: "success",
        direction: "column",
      });
    } catch (err) {
      Toast({
        context: this,
        selector: "#t-toast",
        message: err.message || "预约失败",
        theme: "error",
        direction: "column",
      });
    } finally {
      this.setData({ isBookingSubmitting: false });
    }
  },

  closeCancelDialog() {
    if (this.data.isCancelSubmitting) return;
    this.setData({ showCancelDialog: false });
  },

  async confirmCancelBooking() {
    if (this.data.isCancelSubmitting) return;
    const index = this.data.selectedConsultantIndex;
    const consultant = this.data.consultants[index];

    this.setData({ isCancelSubmitting: true });

    try {
      await appointmentService.cancel(consultant.bookedId);

      this.setData({ showCancelDialog: false });

      const updateData = {};
      const prefix = `consultants[${index}]`;
      updateData[`${prefix}.isBooked`] = false;
      updateData[`${prefix}.bookedId`] = "";
      updateData[`${prefix}.bookedDate`] = "";
      updateData[`${prefix}.bookedTime`] = "";

      this.setData(updateData);
      this.fetchConsultants(true);

      Toast({
        context: this,
        selector: "#t-toast",
        message: "已取消预约",
        theme: "success",
        direction: "column",
      });
    } catch (err) {
      console.error("取消预约失败", err);
      Toast({
        context: this,
        selector: "#t-toast",
        message: err.message || "操作失败",
        theme: "error",
        direction: "column",
      });
    } finally {
      this.setData({ isCancelSubmitting: false });
    }
  },

  onJoinWaitlist() {
    if (
      this.data.isBookingSubmitting ||
      this.data.isCancelSubmitting ||
      this.data.isJoinWaitlistSubmitting ||
      this.data.isCancelWaitlistSubmitting
    ) {
      return;
    }
    const selectedDate = this.data.availableDates[this.data.selectedDateIndex];
    if (!selectedDate || !selectedDate.isFull) return;
    if (selectedDate.waitlistStatus) return;
    if (this.data.showWaitlistDialog) return;

    this.setData({
      showSchedulePopup: false,
      showWaitlistDialog: true,
      waitlistDateStr: selectedDate.dateStr,
    });
  },

  closeWaitlistDialog() {
    if (this.data.isJoinWaitlistSubmitting) return;
    this.setData({ showWaitlistDialog: false });
  },

  async confirmJoinWaitlist() {
    if (this.data.isJoinWaitlistSubmitting) return;
    const consultant = this.data.selectedConsultant;
    const dateStr = this.data.waitlistDateStr;

    this.setData({ isJoinWaitlistSubmitting: true });

    try {
      const { data } = await appointmentService.joinWaitlist({
        consultantId: consultant._id,
        consultantName: consultant.name,
        consultantAvatar: consultant.avatar,
        consultantTitle: consultant.title,
        dateStr,
      });

      this.setData({ showWaitlistDialog: false });
      this.fetchConsultants(true);

      Toast({
        context: this,
        selector: "#t-toast",
        message: `候补登记成功，当前排队第${data.queueNumber}位`,
        theme: "success",
        direction: "column",
      });
    } catch (err) {
      Toast({
        context: this,
        selector: "#t-toast",
        message: err.message || "候补登记失败",
        theme: "error",
        direction: "column",
      });
    } finally {
      this.setData({ isJoinWaitlistSubmitting: false });
    }
  },

  onCancelWaitlist() {
    if (
      this.data.isBookingSubmitting ||
      this.data.isCancelSubmitting ||
      this.data.isJoinWaitlistSubmitting ||
      this.data.isCancelWaitlistSubmitting
    ) {
      return;
    }
    const selectedDate = this.data.availableDates[this.data.selectedDateIndex];
    if (!selectedDate || !selectedDate.waitlistId) return;
    if (this.data.showCancelWaitlistDialog) return;

    this.setData({
      showSchedulePopup: false,
      showCancelWaitlistDialog: true,
    });
  },

  closeCancelWaitlistDialog() {
    if (this.data.isCancelWaitlistSubmitting) return;
    this.setData({ showCancelWaitlistDialog: false });
  },

  async confirmCancelWaitlist() {
    if (this.data.isCancelWaitlistSubmitting) return;
    const selectedDate = this.data.availableDates[this.data.selectedDateIndex];

    this.setData({ isCancelWaitlistSubmitting: true });

    try {
      await appointmentService.cancelWaitlist(selectedDate.waitlistId);

      this.setData({ showCancelWaitlistDialog: false });
      this.fetchConsultants(true);

      Toast({
        context: this,
        selector: "#t-toast",
        message: "已退出候补",
        theme: "success",
        direction: "column",
      });
    } catch (err) {
      Toast({
        context: this,
        selector: "#t-toast",
        message: err.message || "操作失败",
        theme: "error",
        direction: "column",
      });
    } finally {
      this.setData({ isCancelWaitlistSubmitting: false });
    }
  },
});
