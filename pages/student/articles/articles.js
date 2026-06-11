import Toast from "tdesign-miniprogram/toast/index";
const articleService = require("../../../services/article").default;
import router from "../../../utils/router";

Page({
  data: {
    articles: [],
    isLoading: true,
    isRefreshing: false,
    searchKeyword: "",
    isSearchEmpty: false,
    emptyText: "暂无相关文章",
    scrollIntoView: "",
    imageSkeleton: [
      { width: "220rpx", height: "160rpx", borderRadius: "16rpx" },
    ],
    infoSkeleton: [
      { width: "80%", height: "32rpx" },
      { width: "100%", height: "28rpx" },
      { width: "40%", height: "32rpx" },
    ],
  },

  onLoad() {
    this._requestId = 0;
    this._searchTimer = null;
    this._fromDetail = false;
    this._scrollTop = 0;
    this._navArticleId = "";
    this.fetchArticles();
  },

  onShow() {
    if (this._fromDetail) {
      this._fromDetail = false;
      if (this._scrollTop > 0) {
        wx.pageScrollTo({ scrollTop: this._scrollTop, duration: 0 });
      }
      if (this._navArticleId) {
        this.setData({ scrollIntoView: `article-${this._navArticleId}` });
      }
      return;
    }
    if (!this.data.isLoading && !this.data.isRefreshing) {
      this.fetchArticles(this.data.searchKeyword, true);
    }
  },

  onPageScroll(e) {
    this._scrollTop = e.scrollTop;
  },

  onUnload() {
    if (this._searchTimer) {
      clearTimeout(this._searchTimer);
      this._searchTimer = null;
    }
  },

  async fetchArticles(keyword = "", silent = false) {
    const currentRequestId = ++this._requestId;

    if (!this.data.isRefreshing && !silent) {
      this.setData({ isLoading: true });
    }

    try {
      const { data } = await articleService.getList(keyword);

      if (currentRequestId !== this._requestId) {
        return;
      }

      const articles = data.map((item) => ({
        ...item,
        date: this.formatDate(new Date(item.date)),
      }));

      const isSearchEmpty = keyword.trim().length > 0 && articles.length === 0;
      this.setData({
        articles,
        isSearchEmpty,
        emptyText: isSearchEmpty
          ? `没有找到与"${keyword}"相关的文章`
          : "知识库暂无内容",
      });
    } catch (err) {
      console.error("获取文章列表失败:", err);

      if (currentRequestId !== this._requestId) {
        return;
      }

      const msg = keyword.trim().length > 0
        ? "搜索失败，请稍后重试"
        : "数据加载失败，请下拉刷新重试";
      Toast({
        context: this,
        selector: "#t-toast",
        message: msg,
        theme: "error",
        direction: "column",
      });
    } finally {
      if (currentRequestId === this._requestId) {
        this.setData({
          isLoading: false,
          isRefreshing: false,
        });
      }
    }
  },

  formatDate(date) {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, "0");
    const d = date.getDate().toString().padStart(2, "0");
    return `${y}-${m}-${d}`;
  },

  onSearchChange(e) {
    const keyword = e.detail.value || "";

    if (this._searchTimer) {
      clearTimeout(this._searchTimer);
      this._searchTimer = null;
    }

    this.setData({ searchKeyword: keyword });

    if (keyword.trim().length === 0) {
      this.fetchArticles("");
      return;
    }

    this._searchTimer = setTimeout(() => {
      this.fetchArticles(keyword);
    }, 300);
  },

  navToDetail(e) {
    const article = e.detail.article || e.currentTarget.dataset;
    const id = article._id || article.id;

    if (id) {
      this._fromDetail = true;
      this._navArticleId = id;
      this.setData({ scrollIntoView: "" });
      router.navigateTo({
        url: `/pages/student/articles/article-detail/article-detail?id=${id}`,
      });
    }
  },

  onPullDownRefresh() {
    this.setData({ isRefreshing: true, scrollIntoView: "" });
    this.fetchArticles(this.data.searchKeyword, true).then(() => {
      wx.stopPullDownRefresh();
    });
  },
});
