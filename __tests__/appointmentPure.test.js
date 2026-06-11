const {
  findFirstAvailableSlot,
  getSlotsByDateStr,
  repairSelectionState,
  getNextNDays,
  handleDateSelection,
  enrichAvailableDatesWithSchedule,
  buildConsultantAvailabilitySummary,
} = require("../pages/student/appointment/appointmentPure");

function createMockSlots(count, availableStart = 0) {
  return Array.from({ length: count }, (_, i) => ({
    time: `${9 + i}:00`,
    isFull: i < availableStart,
  }));
}

function createMockDate(dateStr, week = "周一", isFull = false, waitlistStatus = "") {
  const [year, month, day] = dateStr.split("-");
  return {
    dateStr,
    month: `${parseInt(month)}月`,
    day,
    week,
    isFull,
    waitlistStatus,
    waitlistId: waitlistStatus ? `waitlist-${dateStr}` : "",
    queueNumber: waitlistStatus ? 3 : 0,
  };
}

function createMockConsultant(schedule = []) {
  return {
    _id: "consultant-1",
    name: "张医生",
    title: "心理咨询师",
    expertise: "青少年心理",
    schedule,
  };
}

function createMockSchedule(dateStr, slots, isFull = false, waitlistStatus = "") {
  return {
    dateStr,
    slots,
    isFull,
    waitlistStatus,
    waitlistId: waitlistStatus ? `waitlist-${dateStr}` : "",
    queueNumber: waitlistStatus ? 2 : 0,
  };
}

describe("appointmentPure - 基础工具函数", () => {
  describe("findFirstAvailableSlot", () => {
    it("应该找到第一个可用时段的索引", () => {
      const slots = [
        { time: "9:00", isFull: true },
        { time: "10:00", isFull: false },
        { time: "11:00", isFull: false },
      ];
      expect(findFirstAvailableSlot(slots)).toBe(1);
    });

    it("所有时段都可用时返回 0", () => {
      const slots = [
        { time: "9:00", isFull: false },
        { time: "10:00", isFull: false },
      ];
      expect(findFirstAvailableSlot(slots)).toBe(0);
    });

    it("所有时段都满时返回 -1", () => {
      const slots = [
        { time: "9:00", isFull: true },
        { time: "10:00", isFull: true },
      ];
      expect(findFirstAvailableSlot(slots)).toBe(-1);
    });

    it("空数组或 null 时返回 -1", () => {
      expect(findFirstAvailableSlot([])).toBe(-1);
      expect(findFirstAvailableSlot(null)).toBe(-1);
      expect(findFirstAvailableSlot(undefined)).toBe(-1);
    });
  });

  describe("getSlotsByDateStr", () => {
    it("应该正确获取指定日期的时段", () => {
      const schedule = [
        createMockSchedule("2026-06-12", createMockSlots(3, 0)),
        createMockSchedule("2026-06-13", createMockSlots(3, 2)),
      ];
      const consultant = createMockConsultant(schedule);

      const slots = getSlotsByDateStr(consultant, "2026-06-13");
      expect(slots.length).toBe(3);
      expect(slots[0].isFull).toBe(true);
      expect(slots[2].isFull).toBe(false);
    });

    it("日期不存在时返回空数组", () => {
      const consultant = createMockConsultant([]);
      const slots = getSlotsByDateStr(consultant, "2026-06-15");
      expect(slots).toEqual([]);
    });

    it("consultant 没有 schedule 时返回空数组", () => {
      const consultant = { _id: "1", name: "test" };
      const slots = getSlotsByDateStr(consultant, "2026-06-12");
      expect(slots).toEqual([]);
    });
  });

  describe("getNextNDays", () => {
    it("应该生成正确数量的工作日（跳过周末）", () => {
      const baseDate = new Date("2026-06-11");
      const dates = getNextNDays(3, baseDate);

      expect(dates.length).toBe(3);
      expect(dates[0].dateStr).toBe("2026-06-12");
      expect(dates[1].dateStr).toBe("2026-06-15");
      expect(dates[2].dateStr).toBe("2026-06-16");
    });

    it("应该正确跳过周六和周日", () => {
      const baseDate = new Date("2026-06-12");
      const dates = getNextNDays(2, baseDate);

      expect(dates[0].dateStr).toBe("2026-06-15");
      expect(dates[1].dateStr).toBe("2026-06-16");
    });

    it("日期格式应该正确", () => {
      const baseDate = new Date("2026-06-11");
      const dates = getNextNDays(1, baseDate);

      expect(dates[0]).toEqual({
        month: "6月",
        day: "12",
        dateStr: "2026-06-12",
        week: "周五",
      });
    });

    it("跨月时日期应该正确", () => {
      const baseDate = new Date("2026-06-30");
      const dates = getNextNDays(2, baseDate);

      expect(dates[0].dateStr).toBe("2026-07-01");
      expect(dates[1].dateStr).toBe("2026-07-02");
    });
  });
});

describe("appointmentPure - 状态修复 repairSelectionState", () => {
  const baseDate = new Date("2026-06-11");
  const baseDates = getNextNDays(3, baseDate);

  describe("正常路径 - 原选择仍然有效", () => {
    it("原日期和时段都有效时，应该保持原选择", () => {
      const schedule = [
        createMockSchedule(baseDates[0].dateStr, createMockSlots(3, 0)),
        createMockSchedule(baseDates[1].dateStr, createMockSlots(3, 0)),
      ];
      const consultant = createMockConsultant(schedule);
      const availableDates = enrichAvailableDatesWithSchedule(baseDates, consultant);

      const result = repairSelectionState({
        prevDateStr: baseDates[0].dateStr,
        prevTime: "10:00",
        availableDates,
        consultant,
      });

      expect(result.dateIndex).toBe(0);
      expect(result.timeIndex).toBe(1);
      expect(result.messages).toEqual([]);
    });

    it("没有原时段选择时，应该自动选择第一个可用时段", () => {
      const schedule = [
        createMockSchedule(baseDates[0].dateStr, createMockSlots(3, 1)),
      ];
      const consultant = createMockConsultant(schedule);
      const availableDates = enrichAvailableDatesWithSchedule(baseDates, consultant);

      const result = repairSelectionState({
        prevDateStr: baseDates[0].dateStr,
        prevTime: null,
        availableDates,
        consultant,
      });

      expect(result.dateIndex).toBe(0);
      expect(result.timeIndex).toBe(1);
      expect(result.messages).toEqual([]);
    });
  });

  describe("原选择失效 - 时段不可用", () => {
    it("原时段已被约满，应该自动切换到下一个可用时段", () => {
      const schedule = [
        createMockSchedule(baseDates[0].dateStr, [
          { time: "9:00", isFull: true },
          { time: "10:00", isFull: true },
          { time: "11:00", isFull: false },
        ]),
      ];
      const consultant = createMockConsultant(schedule);
      const availableDates = enrichAvailableDatesWithSchedule(baseDates, consultant);

      const result = repairSelectionState({
        prevDateStr: baseDates[0].dateStr,
        prevTime: "9:00",
        availableDates,
        consultant,
      });

      expect(result.dateIndex).toBe(0);
      expect(result.timeIndex).toBe(2);
      expect(result.messages).toContain("所选时段已不可用，已自动切换到 11:00");
    });

    it("原时段不存在，应该自动选择第一个可用时段", () => {
      const schedule = [
        createMockSchedule(baseDates[0].dateStr, createMockSlots(3, 0)),
      ];
      const consultant = createMockConsultant(schedule);
      const availableDates = enrichAvailableDatesWithSchedule(baseDates, consultant);

      const result = repairSelectionState({
        prevDateStr: baseDates[0].dateStr,
        prevTime: "15:00",
        availableDates,
        consultant,
      });

      expect(result.timeIndex).toBe(0);
      expect(result.messages).toContain("所选时段已不可用，已自动切换到 9:00");
    });
  });

  describe("原选择失效 - 日期不可用", () => {
    it("原日期已全满，应该自动切换到第一个可用日期", () => {
      const schedule = [
        createMockSchedule(baseDates[0].dateStr, createMockSlots(3, 3), true),
        createMockSchedule(baseDates[1].dateStr, createMockSlots(3, 0)),
      ];
      const consultant = createMockConsultant(schedule);
      const availableDates = enrichAvailableDatesWithSchedule(baseDates, consultant);

      const result = repairSelectionState({
        prevDateStr: baseDates[0].dateStr,
        prevTime: "10:00",
        availableDates,
        consultant,
      });

      expect(result.dateIndex).toBe(1);
      expect(result.messages).toContain(
        `所选日期已不可用，已自动切换到 ${baseDates[1].week} ${baseDates[1].month}${baseDates[1].day}`
      );
    });

    it("原日期不存在，应该自动切换到第一个可用日期", () => {
      const schedule = [
        createMockSchedule(baseDates[0].dateStr, createMockSlots(3, 0)),
      ];
      const consultant = createMockConsultant(schedule);
      const availableDates = enrichAvailableDatesWithSchedule(baseDates, consultant);

      const result = repairSelectionState({
        prevDateStr: "2026-06-20",
        prevTime: "10:00",
        availableDates,
        consultant,
      });

      expect(result.dateIndex).toBe(0);
      expect(result.messages.length).toBeGreaterThan(0);
    });
  });

  describe("原选择失效 - 日期和时段都需要切换", () => {
    it("原日期和时段都不可用时，应该切换日期并尝试保留时段", () => {
      const schedule = [
        createMockSchedule(baseDates[0].dateStr, createMockSlots(3, 3), true),
        createMockSchedule(baseDates[1].dateStr, [
          { time: "9:00", isFull: true },
          { time: "10:00", isFull: false },
          { time: "11:00", isFull: false },
        ]),
      ];
      const consultant = createMockConsultant(schedule);
      const availableDates = enrichAvailableDatesWithSchedule(baseDates, consultant);

      const result = repairSelectionState({
        prevDateStr: baseDates[0].dateStr,
        prevTime: "10:00",
        availableDates,
        consultant,
      });

      expect(result.dateIndex).toBe(1);
      expect(result.timeIndex).toBe(1);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toContain("所选日期已不可用");
    });

    it("原日期和时段都不可用且新日期同时段也满时，应该切换到新日期的第一个可用时段", () => {
      const schedule = [
        createMockSchedule(baseDates[0].dateStr, createMockSlots(3, 3), true),
        createMockSchedule(baseDates[1].dateStr, [
          { time: "9:00", isFull: false },
          { time: "10:00", isFull: true },
          { time: "11:00", isFull: false },
        ]),
      ];
      const consultant = createMockConsultant(schedule);
      const availableDates = enrichAvailableDatesWithSchedule(baseDates, consultant);

      const result = repairSelectionState({
        prevDateStr: baseDates[0].dateStr,
        prevTime: "10:00",
        availableDates,
        consultant,
      });

      expect(result.dateIndex).toBe(1);
      expect(result.timeIndex).toBe(0);
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0]).toContain("所选日期已不可用");
      expect(result.messages[1]).toContain("所选时段已不可用");
    });
  });

  describe("边界情况 - 无可用时段", () => {
    it("所有日期都全满且无可候补时，应该返回空选择", () => {
      const schedule = [
        createMockSchedule(baseDates[0].dateStr, createMockSlots(3, 3), true),
        createMockSchedule(baseDates[1].dateStr, createMockSlots(3, 3), true),
        createMockSchedule(baseDates[2].dateStr, createMockSlots(3, 3), true),
      ];
      const consultant = createMockConsultant(schedule);
      const availableDates = enrichAvailableDatesWithSchedule(baseDates, consultant);

      const result = repairSelectionState({
        prevDateStr: baseDates[0].dateStr,
        prevTime: "10:00",
        availableDates,
        consultant,
      });

      expect(result.dateIndex).toBe(0);
      expect(result.timeIndex).toBe(-1);
      expect(result.messages).toEqual([]);
    });

    it("日期全满但有候补时，应该可以选择该日期", () => {
      const schedule = [
        createMockSchedule(baseDates[0].dateStr, createMockSlots(3, 3), true, "waiting"),
        createMockSchedule(baseDates[1].dateStr, createMockSlots(3, 0)),
      ];
      const consultant = createMockConsultant(schedule);
      const availableDates = enrichAvailableDatesWithSchedule(baseDates, consultant);

      const result = repairSelectionState({
        prevDateStr: baseDates[0].dateStr,
        prevTime: "10:00",
        availableDates,
        consultant,
      });

      expect(result.dateIndex).toBe(0);
      expect(result.timeIndex).toBe(-1);
      expect(result.messages).toEqual([]);
    });

    it("没有原选择时，应该自动选择第一个可用日期和时段", () => {
      const schedule = [
        createMockSchedule(baseDates[0].dateStr, createMockSlots(3, 1)),
      ];
      const consultant = createMockConsultant(schedule);
      const availableDates = enrichAvailableDatesWithSchedule(baseDates, consultant);

      const result = repairSelectionState({
        prevDateStr: null,
        prevTime: null,
        availableDates,
        consultant,
      });

      expect(result.dateIndex).toBe(0);
      expect(result.timeIndex).toBe(1);
      expect(result.messages).toEqual([]);
    });
  });
});

describe("appointmentPure - 日期选择 handleDateSelection", () => {
  const baseDate = new Date("2026-06-11");
  const baseDates = getNextNDays(3, baseDate);

  it("正常选择日期，应该返回对应的时段", () => {
    const schedule = [
      createMockSchedule(baseDates[0].dateStr, createMockSlots(3, 0)),
      createMockSchedule(baseDates[1].dateStr, createMockSlots(3, 1)),
    ];
    const consultant = createMockConsultant(schedule);
    const availableDates = enrichAvailableDatesWithSchedule(baseDates, consultant);

    const result = handleDateSelection({
      dateIndex: 1,
      availableDates,
      consultant,
      prevTime: null,
    });

    expect(result.timeIndex).toBe(1);
    expect(result.slots.length).toBe(3);
    expect(result.message).toBeNull();
  });

  it("选择全满且无可候补的日期，应该返回 null", () => {
    const schedule = [
      createMockSchedule(baseDates[0].dateStr, createMockSlots(3, 3), true),
    ];
    const consultant = createMockConsultant(schedule);
    const availableDates = enrichAvailableDatesWithSchedule(baseDates, consultant);

    const result = handleDateSelection({
      dateIndex: 0,
      availableDates,
      consultant,
      prevTime: "10:00",
    });

    expect(result).toBeNull();
  });

  it("选择全满但有候补的日期，应该返回结果且时段为空", () => {
    const schedule = [
      createMockSchedule(baseDates[0].dateStr, createMockSlots(3, 3), true, "waiting"),
    ];
    const consultant = createMockConsultant(schedule);
    const availableDates = enrichAvailableDatesWithSchedule(baseDates, consultant);

    const result = handleDateSelection({
      dateIndex: 0,
      availableDates,
      consultant,
      prevTime: "10:00",
    });

    expect(result).not.toBeNull();
    expect(result.timeIndex).toBe(-1);
    expect(result.slots.length).toBe(3);
  });

  it("切换日期时原时段在新日期可用，应该保持时段不变", () => {
    const schedule = [
      createMockSchedule(baseDates[0].dateStr, createMockSlots(3, 0)),
      createMockSchedule(baseDates[1].dateStr, createMockSlots(3, 0)),
    ];
    const consultant = createMockConsultant(schedule);
    const availableDates = enrichAvailableDatesWithSchedule(baseDates, consultant);

    const result = handleDateSelection({
      dateIndex: 1,
      availableDates,
      consultant,
      prevTime: "10:00",
    });

    expect(result.timeIndex).toBe(1);
    expect(result.message).toBeNull();
  });

  it("切换日期时原时段在新日期不可用，应该自动切换并提示", () => {
    const schedule = [
      createMockSchedule(baseDates[0].dateStr, createMockSlots(3, 0)),
      createMockSchedule(baseDates[1].dateStr, [
        { time: "9:00", isFull: true },
        { time: "10:00", isFull: true },
        { time: "11:00", isFull: false },
      ]),
    ];
    const consultant = createMockConsultant(schedule);
    const availableDates = enrichAvailableDatesWithSchedule(baseDates, consultant);

    const result = handleDateSelection({
      dateIndex: 1,
      availableDates,
      consultant,
      prevTime: "9:00",
    });

    expect(result.timeIndex).toBe(2);
    expect(result.message).toBe("所选时段已不可用，已自动切换到 11:00");
  });

  it("日期索引无效时应该返回空结果", () => {
    const consultant = createMockConsultant([]);
    const availableDates = enrichAvailableDatesWithSchedule(baseDates, consultant);

    const result = handleDateSelection({
      dateIndex: 999,
      availableDates,
      consultant,
      prevTime: null,
    });

    expect(result.timeIndex).toBe(-1);
    expect(result.slots).toEqual([]);
    expect(result.message).toBeNull();
  });
});

describe("appointmentPure - 数据处理函数", () => {
  describe("enrichAvailableDatesWithSchedule", () => {
    const baseDate = new Date("2026-06-11");
    const baseDates = getNextNDays(3, baseDate);

    it("应该正确标记日期是否全满", () => {
      const schedule = [
        createMockSchedule(baseDates[0].dateStr, createMockSlots(3, 3), true),
        createMockSchedule(baseDates[1].dateStr, createMockSlots(3, 1)),
      ];
      const consultant = createMockConsultant(schedule);

      const result = enrichAvailableDatesWithSchedule(baseDates, consultant);

      expect(result[0].isFull).toBe(true);
      expect(result[1].isFull).toBe(false);
      expect(result[2].isFull).toBe(true);
    });

    it("应该正确填充候补信息", () => {
      const schedule = [
        createMockSchedule(baseDates[0].dateStr, createMockSlots(3, 3), true, "waiting"),
      ];
      const consultant = createMockConsultant(schedule);

      const result = enrichAvailableDatesWithSchedule(baseDates, consultant);

      expect(result[0].waitlistStatus).toBe("waiting");
      expect(result[0].waitlistId).toBe(`waitlist-${baseDates[0].dateStr}`);
      expect(result[0].queueNumber).toBe(2);
    });

    it("consultant 没有 schedule 时，所有日期标记为全满", () => {
      const consultant = createMockConsultant();
      const result = enrichAvailableDatesWithSchedule(baseDates, consultant);

      expect(result.every(d => d.isFull)).toBe(true);
    });
  });

  describe("buildConsultantAvailabilitySummary", () => {
    it("应该正确构建咨询师可用性摘要", () => {
      const schedule = [
        createMockSchedule("2026-06-12", createMockSlots(3, 1), false),
        createMockSchedule("2026-06-13", createMockSlots(3, 3), true),
        createMockSchedule("2026-06-15", createMockSlots(3, 0), false),
      ];
      const consultant = createMockConsultant(schedule);

      const result = buildConsultantAvailabilitySummary(consultant);

      expect(result.availableSummary).toHaveLength(3);
      expect(result.availableSummary[0].availableSlots).toBe(2);
      expect(result.availableSummary[0].totalSlots).toBe(3);
      expect(result.availableSummary[1].availableSlots).toBe(0);
      expect(result.fullDateCount).toBe(1);
      expect(result.allFull).toBe(false);
      expect(result.totalDateCount).toBe(3);
    });

    it("所有日期都满时，allFull 应该为 true", () => {
      const schedule = [
        createMockSchedule("2026-06-12", createMockSlots(3, 3), true),
        createMockSchedule("2026-06-13", createMockSlots(3, 3), true),
      ];
      const consultant = createMockConsultant(schedule);

      const result = buildConsultantAvailabilitySummary(consultant);

      expect(result.allFull).toBe(true);
      expect(result.fullDateCount).toBe(2);
    });

    it("空 schedule 时，应该返回默认值", () => {
      const consultant = createMockConsultant();
      const result = buildConsultantAvailabilitySummary(consultant);

      expect(result.availableSummary).toEqual([]);
      expect(result.allFull).toBe(false);
      expect(result.fullDateCount).toBe(0);
      expect(result.totalDateCount).toBe(0);
    });
  });
});

describe("appointmentPure - 状态回退综合场景", () => {
  const baseDate = new Date("2026-06-11");

  it("完整场景：用户之前选择了日期和时段，刷新后原选择全部失效", () => {
    const oldDates = getNextNDays(3, baseDate);
    const oldSchedule = [
      createMockSchedule(oldDates[0].dateStr, createMockSlots(3, 0)),
      createMockSchedule(oldDates[1].dateStr, createMockSlots(3, 0)),
    ];
    const consultant = createMockConsultant(oldSchedule);

    const newBaseDate = new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const newDates = getNextNDays(3, newBaseDate);
    const newSchedule = [
      createMockSchedule(newDates[0].dateStr, createMockSlots(3, 2)),
      createMockSchedule(newDates[1].dateStr, createMockSlots(3, 0)),
    ];
    const newConsultant = createMockConsultant(newSchedule);
    const newAvailableDates = enrichAvailableDatesWithSchedule(newDates, newConsultant);

    const result = repairSelectionState({
      prevDateStr: oldDates[0].dateStr,
      prevTime: "9:00",
      availableDates: newAvailableDates,
      consultant: newConsultant,
    });

    expect(result.dateIndex).toBe(0);
    expect(result.timeIndex).toBe(2);
    expect(result.messages).toHaveLength(2);
    expect(result.messages[0]).toContain("所选日期已不可用");
    expect(result.messages[1]).toContain("所选时段已不可用");
  });

  it("完整场景：原日期有效但原时段失效，只回退时段", () => {
    const dates = getNextNDays(3, baseDate);
    const schedule = [
      createMockSchedule(dates[0].dateStr, [
        { time: "9:00", isFull: true },
        { time: "10:00", isFull: true },
        { time: "11:00", isFull: false },
      ]),
    ];
    const consultant = createMockConsultant(schedule);
    const availableDates = enrichAvailableDatesWithSchedule(dates, consultant);

    const result = repairSelectionState({
      prevDateStr: dates[0].dateStr,
      prevTime: "9:00",
      availableDates,
      consultant,
    });

    expect(result.dateIndex).toBe(0);
    expect(result.timeIndex).toBe(2);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toContain("所选时段已不可用");
  });

  it("边界场景：只有一个时段可用，原选择正好是它", () => {
    const dates = getNextNDays(1, baseDate);
    const schedule = [
      createMockSchedule(dates[0].dateStr, [
        { time: "9:00", isFull: true },
        { time: "10:00", isFull: false },
        { time: "11:00", isFull: true },
      ]),
    ];
    const consultant = createMockConsultant(schedule);
    const availableDates = enrichAvailableDatesWithSchedule(dates, consultant);

    const result = repairSelectionState({
      prevDateStr: dates[0].dateStr,
      prevTime: "10:00",
      availableDates,
      consultant,
    });

    expect(result.dateIndex).toBe(0);
    expect(result.timeIndex).toBe(1);
    expect(result.messages).toEqual([]);
  });

  it("边界场景：切换日期时，新日期的同时段正好是唯一可用时段", () => {
    const dates = getNextNDays(2, baseDate);
    const schedule = [
      createMockSchedule(dates[0].dateStr, createMockSlots(3, 0)),
      createMockSchedule(dates[1].dateStr, [
        { time: "9:00", isFull: true },
        { time: "10:00", isFull: false },
        { time: "11:00", isFull: true },
      ]),
    ];
    const consultant = createMockConsultant(schedule);
    const availableDates = enrichAvailableDatesWithSchedule(dates, consultant);

    const result = handleDateSelection({
      dateIndex: 1,
      availableDates,
      consultant,
      prevTime: "10:00",
    });

    expect(result.timeIndex).toBe(1);
    expect(result.message).toBeNull();
  });
});
