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

export const ASSESSMENT_SCORE_RANGES = [
  { min: 0, max: 40, label: "表现良好", theme: "good" },
  { min: 41, max: 70, label: "注意调节", theme: "caution" },
  { min: 71, max: 100, label: "建议咨询", theme: "warning" },
];

export const ASSESSMENT_RESULT_CATEGORY_MAP = {
  "表现良好": {
    categories: ["心理科普", "自我成长"],
    tags: ["积极心态", "自我提升", "心理健康"],
    description: "你的心理状态良好，继续保持积极的生活方式。",
  },
  "注意调节": {
    categories: ["情绪调节", "压力管理"],
    tags: ["减压技巧", "情绪管理", "放松训练"],
    description: "你目前可能存在一些压力或情绪波动，建议关注自我调节。",
  },
  "建议咨询": {
    categories: ["心理咨询", "情绪调节"],
    tags: ["专业帮助", "心理干预", "危机应对"],
    description: "建议你寻求专业心理咨询师的帮助，及时调整状态。",
  },
};

export function getResultLabelByScore(score) {
  const normalizedScore = Math.max(0, Math.min(100, score));
  const range = ASSESSMENT_SCORE_RANGES.find(
    (r) => normalizedScore >= r.min && normalizedScore <= r.max
  );
  return range ? range.label : "表现良好";
}

export function getResultConfigByScore(score) {
  const label = getResultLabelByScore(score);
  return {
    label,
    ...ASSESSMENT_RESULT_CATEGORY_MAP[label],
  };
}

export default {
  DIALOG_CONFIGS,
  APPOINTMENT_STATUS_LIST,
  APPOINTMENT_STATUS_MAP,
  ASSESSMENT_SCORE_RANGES,
  ASSESSMENT_RESULT_CATEGORY_MAP,
  getResultLabelByScore,
  getResultConfigByScore,
};
