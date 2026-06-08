import { SafePage } from "../../../utils/middleware";
import Toast from "tdesign-miniprogram/toast/index";
import appointmentService from "../../../services/appointment";

SafePage({
  data: {
    role: null,
  },

  onShow() {
    this.initRole();
    this.refreshTabBadges();
  },

  initRole() {
    const userInfo = wx.getStorageSync("userInfo");
    const role = userInfo ? userInfo.role : "user";
    this.setData({ role });
  },

  async refreshTabBadges() {
    const userInfo = wx.getStorageSync("userInfo");
    if (!userInfo) return;

    wx.nextTick(async () => {
      const tabBar = this.getTabBar();
      if (!tabBar || typeof tabBar.setBadge !== "function") return;

      try {
        if (userInfo.role === "admin") {
          const { data } = await appointmentService.adminGetStats();
          tabBar.setBadge("咨询管理", data.pending || 0);
        } else if (userInfo.role === "consultant") {
          const { data } = await appointmentService.getConsultantAppts();
          const pendingCount = (data || []).filter((i) => i.status === "booked")
            .length;
          tabBar.setBadge("预约管理", pendingCount);
        }
      } catch (err) {
        console.error("Refresh tab badges error:", err);
      }
    });
  },
});
