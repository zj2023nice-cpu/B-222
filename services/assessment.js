import createCall from "./cloud-call";
import { getResultConfigByScore } from "../utils/constants";
import articleService from "./article";

const call = createCall("Assessment", "assessment_service");

const assessmentService = {
  getList: () => call("get_list"),
  getDetail: (id) => call("get_detail", { id }),
  save: (id, assessment) => call("save", { id, assessment }),
  delete: (id) => call("delete", { id }),
  getUserRecords: (searchQuery) => call("get_user_records", { searchQuery }),
  getConsultationRecords: (searchQuery) =>
    call("get_consultation_records", { searchQuery }),
  submitEvaluation: (evaluationData) =>
    call("submit_evaluation", evaluationData),
  submitTest: (testData) => call("submit_test", testData),
  getStudentRecords: (searchQuery) =>
    call("get_student_records", { searchQuery }),
  getHistoryComparison: (assessmentId) =>
    call("get_history_comparison", { assessmentId }),

  getRecommendedArticles: async (score, limit = 3) => {
    const config = getResultConfigByScore(score);
    return articleService.getRecommendedByAssessment({
      score,
      resultLabel: config.label,
      primaryCategories: config.primaryCategories,
      secondaryCategories: config.secondaryCategories,
      fallbackCategories: config.fallbackCategories,
      keywords: config.keywords,
      limit,
    });
  },
};

export default assessmentService;
