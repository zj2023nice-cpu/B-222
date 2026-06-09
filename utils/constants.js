export const DIALOG_CONFIGS = {
  LOGOUT: {
    title: "退出提示",
    content: "确定要退出当前账号吗？",
    confirmBtn: {
      content: "确定退出",
      variant: "base",
      theme: "primary",
    },
    cancelBtn: "取消",
  },
  DELETE_ACCOUNT: {
    title: "危险操作",
    content: "注销将删除所有数据，确定继续吗？",
    confirmBtn: {
      content: "确定注销",
      variant: "base",
      theme: "danger",
    },
    cancelBtn: {
      content: "取消",
      variant: "outline",
      theme: "danger",
    },
  },
};

export const APPOINTMENT_STATUS_LIST = [
  { label: "全部", value: "" },
  { label: "候补中", value: "waitlist" },
  { label: "待处理", value: "booked" },
  { label: "待咨询", value: "confirmed" },
  { label: "已完成", value: "completed" },
  { label: "已拒绝", value: "rejected" },
  { label: "已取消", value: "cancelled" },
];

export const APPOINTMENT_STATUS_MAP = {
  waitlist: { label: "候补中", theme: "warning" },
  booked: { label: "待处理", theme: "warning" },
  confirmed: { label: "待咨询", theme: "primary" },
  completed: { label: "已完成", theme: "success" },
  cancelled: { label: "已取消", theme: "default" },
  rejected: { label: "已拒绝", theme: "danger" },
};

export default {
  DIALOG_CONFIGS,
  APPOINTMENT_STATUS_LIST,
  APPOINTMENT_STATUS_MAP,
};
