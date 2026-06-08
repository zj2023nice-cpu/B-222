const CLOUD_FUNCTION_NAME = "appointment_service";

async function call(action, params = {}) {
  try {
    const { result } = await wx.cloud.callFunction({
      name: CLOUD_FUNCTION_NAME,
      data: {
        action,
        data: params,
      },
    });
    if (result.code !== 0) {
      throw new Error(result.msg || "服务异常");
    }
    return result;
  } catch (err) {
    console.error(`[Appointment Service Error][${action}]:`, err);
    throw err;
  }
}

const appointmentService = {
  getConsultants: (availableDates) =>
    call("get_consultants", { availableDates }),
  book: (consultantData) => call("book", consultantData),
  cancel: (appointmentId) => call("cancel", { appointmentId }),
  getMyList: () => call("get_my_list"),
  // 咨询师端：获取待审核/全部预约
  getConsultantAppts: (status) => call("get_consultant_appts", { status }),
  // 咨询师端：审核预约
  updateStatus: (appointmentId, status) =>
    call("update_status", { appointmentId, status }),
  delete: (appointmentId, role) => call("delete", { appointmentId, role }),
  getConsultantStats: () => call("get_consultant_stats"),
  adminGetStats: () => call("admin_get_stats"),
  adminGetTrend: () => call("admin_get_trend"),
  adminGetList: (params) => call("admin_get_list", params),
  markAsRead: (appointmentIds) => call("mark_read", { appointmentIds }),
};

export default appointmentService;
