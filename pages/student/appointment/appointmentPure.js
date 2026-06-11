function findFirstAvailableSlot(slots) {
  return (slots || []).findIndex((slot) => !slot.isFull);
}

function getSlotsByDateStr(consultant, dateStr) {
  const scheduleItem = (consultant.schedule || []).find(
    (s) => s.dateStr === dateStr,
  );
  return scheduleItem ? scheduleItem.slots || [] : [];
}

function repairSelectionState({ prevDateStr, prevTime, availableDates, consultant }) {
  const messages = [];
  let dateIndex = 0;
  let timeIndex = -1;

  const firstAvailDateIndex = availableDates.findIndex(
    (d) => !d.isFull || d.waitlistStatus,
  );
  if (firstAvailDateIndex === -1) {
    return { dateIndex: 0, timeIndex: -1, messages };
  }

  if (!prevDateStr) {
    dateIndex = firstAvailDateIndex;
    const newDate = availableDates[dateIndex];
    const slots = getSlotsByDateStr(consultant, newDate.dateStr);
    const firstSlotIdx = findFirstAvailableSlot(slots);

    if (prevTime) {
      const prevTimeInNewDate = slots.findIndex(
        (s) => s.time === prevTime && !s.isFull,
      );
      if (prevTimeInNewDate !== -1) {
        timeIndex = prevTimeInNewDate;
      } else if (firstSlotIdx !== -1) {
        timeIndex = firstSlotIdx;
      }
    } else {
      timeIndex = firstSlotIdx;
    }

    return { dateIndex, timeIndex, messages };
  }

  const prevDateIdx = availableDates.findIndex((d) => d.dateStr === prevDateStr);
  const dateIsValid =
    prevDateIdx !== -1 &&
    (!availableDates[prevDateIdx].isFull || availableDates[prevDateIdx].waitlistStatus);

  if (dateIsValid) {
    dateIndex = prevDateIdx;
    const slots = getSlotsByDateStr(consultant, prevDateStr);
    const firstSlotIdx = findFirstAvailableSlot(slots);

    if (prevTime) {
      const prevTimeIdx = slots.findIndex(
        (s) => s.time === prevTime && !s.isFull,
      );
      if (prevTimeIdx !== -1) {
        timeIndex = prevTimeIdx;
      } else if (firstSlotIdx !== -1) {
        timeIndex = firstSlotIdx;
        messages.push(`所选时段已不可用，已自动切换到 ${slots[timeIndex].time}`);
      }
    } else {
      timeIndex = firstSlotIdx;
    }
  } else {
    dateIndex = firstAvailDateIndex;
    const newDate = availableDates[dateIndex];
    messages.push(
      `所选日期已不可用，已自动切换到 ${newDate.week} ${newDate.month}${newDate.day}`,
    );

    const slots = getSlotsByDateStr(consultant, newDate.dateStr);
    const firstSlotIdx = findFirstAvailableSlot(slots);

    if (prevTime) {
      const prevTimeInNewDate = slots.findIndex(
        (s) => s.time === prevTime && !s.isFull,
      );
      if (prevTimeInNewDate !== -1) {
        timeIndex = prevTimeInNewDate;
      } else if (firstSlotIdx !== -1) {
        timeIndex = firstSlotIdx;
        messages.push(`所选时段已不可用，已自动切换到 ${slots[timeIndex].time}`);
      }
    } else {
      timeIndex = firstSlotIdx;
    }
  }

  return { dateIndex, timeIndex, messages };
}

function getNextNDays(n, baseDate = new Date()) {
  const dates = [];
  const weekDays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const now = new Date(baseDate.getTime());
  let offset = 1;

  while (dates.length < n) {
    const date = new Date(now);
    date.setDate(now.getDate() + offset);

    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const week = weekDays[dayOfWeek];

      dates.push({
        month: `${month}月`,
        day: day < 10 ? `0${day}` : `${day}`,
        dateStr: `${year}-${month < 10 ? "0" + month : month}-${day < 10 ? "0" + day : day}`,
        week: week,
      });
    }
    offset++;
  }
  return dates;
}

function handleDateSelection({ dateIndex, availableDates, consultant, prevTime }) {
  const selectedDate = availableDates[dateIndex];
  if (!selectedDate) {
    return { timeIndex: -1, slots: [], message: null };
  }

  if (selectedDate.isFull && !selectedDate.waitlistStatus) {
    return null;
  }

  const slots = getSlotsByDateStr(consultant, selectedDate.dateStr);
  const firstSlotIdx = findFirstAvailableSlot(slots);

  let timeIndex = -1;
  let message = null;

  if (prevTime) {
    const prevTimeIdx = slots.findIndex(
      (s) => s.time === prevTime && !s.isFull,
    );
    if (prevTimeIdx !== -1) {
      timeIndex = prevTimeIdx;
    } else if (firstSlotIdx !== -1) {
      timeIndex = firstSlotIdx;
      message = `所选时段已不可用，已自动切换到 ${slots[timeIndex].time}`;
    }
  } else {
    timeIndex = firstSlotIdx;
  }

  return { timeIndex, slots, message };
}

function enrichAvailableDatesWithSchedule(availableDates, consultant) {
  return availableDates.map((date) => {
    const dailySchedule = (consultant.schedule || []).find(
      (s) => s.dateStr === date.dateStr,
    );
    const isFull = dailySchedule
      ? dailySchedule.slots.every((slot) => slot.isFull)
      : true;
    const waitlistStatus = dailySchedule ? dailySchedule.waitlistStatus : "";
    const waitlistId = dailySchedule ? dailySchedule.waitlistId : "";
    const queueNumber = dailySchedule ? dailySchedule.queueNumber : 0;
    return { ...date, isFull, waitlistStatus, waitlistId, queueNumber };
  });
}

function buildConsultantAvailabilitySummary(consultant) {
  const schedule = consultant.schedule || [];
  const fullDateCount = schedule.filter((s) => s.isFull).length;
  const allFull = schedule.length > 0 && fullDateCount === schedule.length;

  const availableSummary = schedule.map((s) => {
    const availableSlots = (s.slots || []).filter((slot) => !slot.isFull).length;
    return {
      dateStr: s.dateStr || "",
      isFull: s.isFull,
      availableSlots,
      totalSlots: (s.slots || []).length,
    };
  });

  return {
    availableSummary,
    allFull,
    fullDateCount,
    totalDateCount: schedule.length,
  };
}

module.exports = {
  findFirstAvailableSlot,
  getSlotsByDateStr,
  repairSelectionState,
  getNextNDays,
  handleDateSelection,
  enrichAvailableDatesWithSchedule,
  buildConsultantAvailabilitySummary,
};
