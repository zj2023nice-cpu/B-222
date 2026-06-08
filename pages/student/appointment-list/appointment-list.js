import Toast from "tdesign-miniprogram/toast/index";
import appointmentService from "../../../services/appointment";
import {
  APPOINTMENT_STATUS_MAP,
  APPOINTMENT_STATUS_LIST,
} from "../../../utils/constants";

Page({
  data: {
    appointments: [],
    isLoading: true,
    statusMap: APPOINTMENT_STATUS_MAP,
    tabs: APPOINTMENT_STATUS_LIST,
    currentStatus: "",
    rowSkeleton: [
      [
        { size: "100rpx", type: "circle" },
        { width: "40%", height: "64rpx" },
      ],
      { width: "70%", height: "28rpx" },
      { width: "60%", height: "28rpx" },
      { width: "50%", height: "28rpx" },
      { width: "70%", height: "28rpx" },
      { width: "60%", height: "28rpx" },
    ],
    isRefreshing: false,
    keyword: "",
    allAppointments: [],
    pendingCount: 0,
    confirmedCount: 0,
    rejectedCount: 0,
    stickyProps: {
      offsetTop: 0,
    },
  },

  onLoad() {
    const app = getApp();
    this.setData({
      "stickyProps.offsetTop": app.globalData.navbarHeight,
    });
    this.fetchAppointments();
  },

  onShow() {
    this.fetchAppointments();
  },

  async fetchAppointments(isSilent = false) {
    if (!isSilent) {
      this.setData({ isLoading: true });
    }
    try {
      const { data } = await appointmentService.getMyList();
      const allAppointments = data || [];
      const pendingCount = allAppointments.filter(
        (a) => a.status === "booked",
      ).length;
      const confirmedCount = allAppointments.filter(
        (a) => a.status === "confirmed",
      ).length;
      const rejectedCount = allAppointments.filter(
        (a) => a.status === "rejected" && !a.studentRead,
      ).length;

      this.setData(
        {
          allAppointments,
          pendingCount,
          confirmedCount,
          rejectedCount,
        },
        () => {
          this.filterList();
        },
      );
    } catch (err) {
      console.error("获取预约列表失败", err);
      this.setData({ isLoading: false, isRefreshing: false });
      Toast({
        context: this,
        selector: "#t-toast",
        message: "加载失败",
        theme: "error",
        direction: "column",
      });
    }
  },

  filterList() {
    const { allAppointments, keyword, currentStatus } = this.data;
    let appointments = allAppointments;

    // 1. 状态过滤
    if (currentStatus) {
      appointments = appointments.filter((a) => a.status === currentStatus);
    }

    // 2. 搜索过滤
    if (keyword) {
      const lowerKeyword = keyword.toLowerCase();
      appointments = appointments.filter(
        (a) =>
          a.consultantName?.toLowerCase().includes(lowerKeyword) ||
          a.consultantExpertise?.toLowerCase().includes(lowerKeyword),
      );
    }

    this.setData({
      appointments,
      isLoading: false,
      isRefreshing: false,
    });
  },

  onTabChange(e) {
    const { value } = e.detail;
    this.setData({ currentStatus: value }, () => {
      this.filterList();
      // 如果进入已拒绝页签且有未读，标记为已读
      if (value === "rejected" && this.data.rejectedCount > 0) {
        this.markRejectedAsRead();
      }
    });
  },

  async markRejectedAsRead() {
    const unreadIds = this.data.allAppointments
      .filter((a) => a.status === "rejected" && !a.studentRead)
      .map((a) => a._id);

    if (unreadIds.length === 0) return;

    try {
      await appointmentService.markAsRead(unreadIds);
      const allAppointments = this.data.allAppointments.map((a) => {
        if (unreadIds.includes(a._id)) {
          return { ...a, studentRead: true };
        }
        return a;
      });
      this.setData({
        allAppointments,
        rejectedCount: 0,
      });
    } catch (err) {
      console.error("标记已读失败", err);
    }
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

  async onRefresh() {
    this.setData({ isRefreshing: true });
    await this.fetchAppointments(true);
  },

  async onCardAction(e) {
    const { action, item } = e.detail;
    if (action === "cancel") {
      await this.handleCancel(item._id);
    } else if (action === "delete") {
      await this.handleDelete(item._id);
    }
  },

  async handleCancel(id) {
    try {
      await appointmentService.updateStatus(id, "cancelled");

      // 1. 更新全量数据中的状态
      const allAppointments = this.data.allAppointments.map((a) => {
        if (a._id === id) {
          return { ...a, status: "cancelled", processTimeDisplay: "刚刚" };
        }
        return a;
      });

      // 2. 重新计算徽标数量
      const pendingCount = allAppointments.filter(
        (a) => a.status === "booked",
      ).length;
      const confirmedCount = allAppointments.filter(
        (a) => a.status === "confirmed",
      ).length;
      const rejectedCount = allAppointments.filter(
        (a) => a.status === "rejected" && !a.studentRead,
      ).length;

      this.setData(
        {
          allAppointments,
          pendingCount,
          confirmedCount,
          rejectedCount,
        },
        () => {
          // 3. 重新过滤当前视图
          this.filterList();
        },
      );

      Toast({
        context: this,
        selector: "#t-toast",
        message: "预约已取消",
        theme: "success",
        direction: "column",
      });
    } catch (err) {
      console.error("取消预约失败", err);
      Toast({
        context: this,
        selector: "#t-toast",
        message: "操作失败",
        theme: "error",
        direction: "column",
      });
    }
  },

  async handleDelete(id) {
    try {
      await appointmentService.delete(id, "student");

      // 1. 更新全量数据
      const allAppointments = this.data.allAppointments.filter(
        (a) => a._id !== id,
      );

      // 2. 重新计算徽标数量
      const pendingCount = allAppointments.filter(
        (a) => a.status === "booked",
      ).length;
      const confirmedCount = allAppointments.filter(
        (a) => a.status === "confirmed",
      ).length;
      const rejectedCount = allAppointments.filter(
        (a) => a.status === "rejected" && !a.studentRead,
      ).length;

      this.setData(
        {
          allAppointments,
          pendingCount,
          confirmedCount,
          rejectedCount,
        },
        () => {
          // 3. 刷新视图
          this.filterList();
        },
      );

      Toast({
        context: this,
        selector: "#t-toast",
        message: "删除成功",
        theme: "success",
        direction: "column",
      });
    } catch (err) {
      console.error("删除记录失败", err);
      Toast({
        context: this,
        selector: "#t-toast",
        message: "删除失败",
        theme: "error",
        direction: "column",
      });
    }
  },

  navToBook() {
    wx.navigateTo({
      url: "/pages/student/appointment/appointment",
    });
  },

  onImageError(e) {
    const { index } = e.detail;
    this.setData({
      [`appointments[${index}].consultantAvatar`]: "",
    });
  },

  onPullDownRefresh() {
    this.fetchAppointments().then(() => {
      wx.stopPullDownRefresh();
    });
  },
});
