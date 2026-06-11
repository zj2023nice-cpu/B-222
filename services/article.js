import createCall from "./cloud-call";
import { CLOUD_FUNCTIONS } from "../config/index";

const call = createCall("Article", CLOUD_FUNCTIONS.ARTICLE);

const articleService = {
  getList: (keyword) => call("get_list", { keyword }),
  getDetail: (id) => call("get_detail", { id }),
  toggleCollect: (articleId, article, isCollected) =>
    call("toggle_collect", { articleId, article, isCollected }),
  getCollections: () => call("get_collections"),
  getHomeData: () => call("get_home_data"),
  getRecommended: (categories, limit = 3) =>
    call("get_recommended", { categories, limit }),

  getRecommendedByAssessment: (params) =>
    call("get_recommended_by_assessment", params),

  adminGetArticles: (params) => call("admin_get_list", params),
  adminCreateArticle: (data) => call("admin_create", data),
  adminUpdateArticle: (data) => call("admin_update", data),
  adminDeleteArticle: (id) => call("admin_delete", { _id: id }),
  adminGetBanners: (params) => call("admin_get_banners", params || {}),
  adminAddBanner: (data) => call("admin_add_banner", data),
  adminUpdateBanner: (data) => call("admin_update_banner", data),
  adminDeleteBanner: (id) => call("admin_delete_banner", { _id: id }),
};

export default articleService;
