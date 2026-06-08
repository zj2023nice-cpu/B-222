import assessmentService from "../../../../services/assessment";

import Toast from "tdesign-miniprogram/toast/index";
import { SafePage } from "../../../../utils/middleware";

SafePage({
  data: {
    id: "",
    assessmentTitle: "",
    currentStep: 0,
    progress: 0,
    questions: [
      {
        title: "在过去的两周里，你是否感到心情低落、沮丧或绝望？",
        options: [
          { label: "完全没有", value: 0 },
          { label: "有几天", value: 1 },
          { label: "一半以上的时间", value: 2 },
          { label: "几乎每天", value: 3 },
        ],
      },
      {
        title: "你在做事情时是否感到兴趣索然或缺乏动力？",
        options: [
          { label: "完全没有", value: 0 },
          { label: "有几天", value: 1 },
          { label: "一半以上的时间", value: 2 },
          { label: "几乎每天", value: 3 },
        ],
      },
      {
        title: "你是否感到入睡困难、易醒，或者睡眠过多？",
        options: [
          { label: "完全没有", value: 0 },
          { label: "有几天", value: 1 },
          { label: "一半以上的时间", value: 2 },
          { label: "几乎每天", value: 3 },
        ],
      },
    ],
    answers: [],
    submitting: false,
  },

  onLoad(options) {
    const { id, title } = options;
    this.setData({
      id,
      assessmentTitle: decodeURIComponent(title || "心理测评"),
      progress: Math.floor((1 / this.data.questions.length) * 100),
    });
  },

  onAnswerChange(e) {
    const { value } = e.detail;
    const { currentStep, answers } = this.data;
    const newAnswers = [...answers];
    newAnswers[currentStep] = value;
    this.setData({ answers: newAnswers });
  },

  nextStep() {
    const { currentStep, questions } = this.data;
    if (currentStep < questions.length - 1) {
      const next = currentStep + 1;
      this.setData({
        currentStep: next,
        progress: Math.floor(((next + 1) / questions.length) * 100),
      });
    }
  },

  prevStep() {
    const { currentStep, questions } = this.data;
    if (currentStep > 0) {
      const prev = currentStep - 1;
      this.setData({
        currentStep: prev,
        progress: Math.floor(((prev + 1) / questions.length) * 100),
      });
    }
  },

  async submitQuiz() {
    const { answers, questions, id, assessmentTitle } = this.data;
    if (answers.length < questions.length) {
      Toast({
        context: this,
        selector: "#t-toast",
        message: "请回答所有题目",
        theme: "warning",
        direction: "column",
        duration: 2000,
      });
      return;
    }

    this.setData({ submitting: true });

    try {
      const totalScore = answers.reduce((sum, val) => sum + val, 0);
      // Map score to a 0-100 scale for consistency with existing UI
      // Max score is 3 * 3 = 9.
      const normalizedScore = Math.floor(
        (totalScore / (questions.length * 3)) * 100,
      );

      let result = "表现良好";
      if (normalizedScore > 70) result = "建议咨询";
      else if (normalizedScore > 40) result = "注意调节";

      const userInfo = wx.getStorageSync("userInfo") || {};

      await assessmentService.submitTest({
        assessmentId: id,
        assessmentTitle: assessmentTitle,
        score: normalizedScore,
        result: result,
        userName: userInfo.name || "匿名学生",
        userAvatar: userInfo.avatar || "",
      });

      Toast({
        context: this,
        selector: "#t-toast",
        message: "提交成功",
        theme: "success",
        direction: "column",
      });

      setTimeout(() => {
        // 提交后强制回到列表页，确保路径正确
        wx.navigateBack({
          delta: 1,
          fail: () => {
            wx.redirectTo({ url: "/pages/student/assessment/assessment" });
          },
        });
      }, 800);
    } catch (err) {
      console.error("提交失败", err);
      Toast({
        context: this,
        selector: "#t-toast",
        message: "提交失败，请稍后重试",
        theme: "error",
        direction: "column",
      });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
