const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_TYPE_CACHEREAD });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  
  // 核心修复：兼容多种调用结构
  let { action, data } = event;
  if (!action && event.data && typeof event.data === "object") {
    action = event.data.action;
    data = event.data.data;
  }
  if (!data) data = event;

  switch (action) {
    case "add":
      return await addMood(OPENID, data);
    case "fetch_history":
      return await fetchHistory(OPENID);
    default:
      return { code: -1, msg: "Unknown action" };
  }
};

async function addMood(openid, data) {
  try {
    const { mood, content, dateStr, createTimestamp } = data;

    if (!mood) {
      return { code: -1, msg: "情绪类型不能为空" };
    }

    const recordDate = dateStr || formatDateStr(new Date());

    if (!isValidDateStr(recordDate)) {
      return { code: -1, msg: "日期格式不正确" };
    }

    if (!isWithinLast7Days(recordDate)) {
      return { code: -1, msg: "只能补录最近 7 天内的情绪" };
    }

    let createTime;
    if (createTimestamp && typeof createTimestamp === "number") {
      createTime = new Date(createTimestamp);
    } else {
      createTime = db.serverDate();
    }

    const res = await db.collection("mood_diaries").add({
      data: {
        _openid: openid,
        mood,
        content,
        dateStr: recordDate,
        createTime: createTime,
      },
    });
    return { code: 0, data: res };
  } catch (err) {
    return { code: 500, msg: err.message };
  }
}

function isValidDateStr(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date);
}

function formatDateStr(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isWithinLast7Days(dateStr) {
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const targetTime = target.getTime();
  return targetTime >= sevenDaysAgo.getTime() && targetTime <= today.getTime();
}

async function fetchHistory(openid) {
  try {
    const res = await db
      .collection("mood_diaries")
      .where({ _openid: openid })
      .orderBy("createTime", "desc")
      .get();
    return { code: 0, data: res.data };
  } catch (err) {
    return { code: 500, msg: err.message };
  }
}
