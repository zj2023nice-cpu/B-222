/**
 * 路由与权限配置中心
 *
 * 设计原则：
 * 1. 单一真相源：所有跳转都走 router.navigate / switchTab / reLaunch
 * 2. 权限守卫在跳转前执行，避免页面闪烁
 * 3. 登录回跳：被拦截到登录页时保存 redirect，登录成功后优先回跳
 * 4. 权限回退：目标页权限不匹配时，回退到当前角色的首页
 */

const {
  ROUTE_PERMISSIONS,
  ROLE_HOME,
  LOGIN_PAGE,
  TAB_PAGES,
  cleanPath,
  normalizePath,
  getQueryString,
  isTabPage,
  checkAccess: pureCheckAccess,
  _normalizeArgs,
  buildGuardError,
  invokeCallbacks,
} = require("./routerPure");

const REDIRECT_STORAGE_KEY = "__router_redirect_url__";

const ROLE_TABS = {
  user: [
    {
      pagePath: "/pages/main/home/home",
      text: "首页",
      icon: "home-filled",
    },
    {
      pagePath: "/pages/main/records/records",
      text: "AI咨询",
      icon: "chat-bubble-filled",
    },
    {
      pagePath: "/pages/main/mine/mine",
      text: "我的",
      icon: "user-filled",
    },
  ],
  consultant: [
    {
      pagePath: "/pages/main/home/home",
      text: "预约管理",
      icon: "calendar-edit-filled",
    },
    {
      pagePath: "/pages/main/records/records",
      text: "咨询评估",
      icon: "user-list-filled",
    },
    {
      pagePath: "/pages/main/assessment/assessment",
      text: "测评管理",
      icon: "assignment-filled",
    },
    {
      pagePath: "/pages/main/exam/exam",
      text: "测评记录",
      icon: "root-list-filled",
    },
    {
      pagePath: "/pages/main/mine/mine",
      text: "我的",
      icon: "user-filled",
    },
  ],
  admin: [
    {
      pagePath: "/pages/main/home/home",
      text: "用户管理",
      icon: "usergroup-filled",
    },
    {
      pagePath: "/pages/main/records/records",
      text: "知识管理",
      icon: "book-open-filled",
    },
    {
      pagePath: "/pages/main/assessment/assessment",
      text: "咨询管理",
      icon: "chat-filled",
    },
    {
      pagePath: "/pages/main/exam/exam",
      text: "资源管理",
      icon: "image-filled",
    },
    {
      pagePath: "/pages/main/mine/mine",
      text: "我的",
      icon: "user-filled",
    },
  ],
};

export default {
  LOGIN_PAGE,
  REDIRECT_STORAGE_KEY,

  getTabsByRole(role) {
    return ROLE_TABS[role] || ROLE_TABS.user;
  },

  getHomeByRole(role) {
    return ROLE_HOME[role] || ROLE_HOME.user;
  },

  isTabPage,

  getTabIndex(role, path) {
    const tabs = this.getTabsByRole(role);
    const normalized = normalizePath(path);
    return tabs.findIndex((tab) => tab.pagePath === normalized);
  },

  getUserInfo() {
    try {
      return wx.getStorageSync("userInfo") || null;
    } catch (e) {
      return null;
    }
  },

  checkAccess(url, userInfo) {
    const resolvedUser = userInfo || this.getUserInfo();
    return pureCheckAccess(url, resolvedUser, ROUTE_PERMISSIONS, ROLE_HOME, LOGIN_PAGE);
  },

  setRedirect(url) {
    try {
      if (url) {
        wx.setStorageSync(REDIRECT_STORAGE_KEY, url);
      } else {
        wx.removeStorageSync(REDIRECT_STORAGE_KEY);
      }
    } catch (e) {}
  },

  consumeRedirect() {
    try {
      const url = wx.getStorageSync(REDIRECT_STORAGE_KEY) || "";
      wx.removeStorageSync(REDIRECT_STORAGE_KEY);
      return url;
    } catch (e) {
      return "";
    }
  },

  _doNavigate(method, url, options = {}) {
    const {
      success,
      fail,
      complete,
      events,
      ...restOpts
    } = options;

    return new Promise((resolve, reject) => {
      const params = {};
      let completeFired = false;
      const fireComplete = (res) => {
        if (completeFired) return;
        completeFired = true;
        if (typeof complete === "function") {
          try { complete(res); } catch (e) { console.warn("[Router] complete callback error:", e); }
        }
      };

      if (method === "navigateBack") {
        params.delta = restOpts.delta || 1;
      } else {
        params.url = url;
      }

      if (events && method === "navigateTo") {
        params.events = events;
      }

      params.success = (res) => {
        if (typeof success === "function") {
          try { success(res); } catch (e) { console.warn("[Router] success callback error:", e); }
        }
        fireComplete(res);
        resolve(res);
      };

      params.fail = (err) => {
        if (typeof fail === "function") {
          try { fail(err); } catch (e) { console.warn("[Router] fail callback error:", e); }
        }
        fireComplete(err);
        reject(err);
      };

      params.complete = fireComplete;

      wx[method](params);
    });
  },

  _buildGuardError(method, reason, redirect, targetUrl) {
    return buildGuardError(method, reason, redirect, targetUrl);
  },

  async navigateTo(arg0, arg1) {
    const { url, options } = _normalizeArgs(arg0, arg1);
    const userInfo = this.getUserInfo();
    const access = this.checkAccess(url, userInfo);

    if (!access.canAccess) {
      if (access.reason === "unauthorized") {
        this.setRedirect(url);
      }
      const guardErr = this._buildGuardError("navigateTo", access.reason, access.redirect, url);
      this._invokeCallbacks(options, null, guardErr);
      this._doNavigate("reLaunch", access.redirect).catch(() => {});
      return Promise.reject(guardErr);
    }

    if (isTabPage(url)) {
      return this._doNavigate("switchTab", normalizePath(url), options);
    }

    return this._doNavigate("navigateTo", url, options);
  },

  async switchTab(arg0, arg1) {
    const { url, options } = _normalizeArgs(arg0, arg1);
    const userInfo = this.getUserInfo();
    const target = normalizePath(url);
    const access = this.checkAccess(target, userInfo);

    if (!access.canAccess) {
      if (access.reason === "unauthorized") {
        this.setRedirect(target);
      }
      const guardErr = this._buildGuardError("switchTab", access.reason, access.redirect, target);
      this._invokeCallbacks(options, null, guardErr);
      this._doNavigate("reLaunch", access.redirect).catch(() => {});
      return Promise.reject(guardErr);
    }

    if (!isTabPage(target)) {
      return this._doNavigate("navigateTo", url, options);
    }

    return this._doNavigate("switchTab", target, options);
  },

  async reLaunch(arg0, arg1) {
    const { url, options } = _normalizeArgs(arg0, arg1);
    const userInfo = this.getUserInfo();
    const access = this.checkAccess(url, userInfo);

    if (!access.canAccess) {
      if (access.reason === "unauthorized") {
        this.setRedirect(url);
      }
      const guardErr = this._buildGuardError("reLaunch", access.reason, access.redirect, url);
      this._invokeCallbacks(options, null, guardErr);
      this._doNavigate("reLaunch", access.redirect).catch(() => {});
      return Promise.reject(guardErr);
    }

    if (isTabPage(url)) {
      return this._doNavigate("switchTab", normalizePath(url), options);
    }

    return this._doNavigate("reLaunch", url, options);
  },

  _invokeCallbacks(options, successRes, failErr) {
    invokeCallbacks(options, successRes, failErr);
  },

  navigateBack(arg0 = 1, arg1 = {}) {
    let delta = 1;
    let options = {};
    if (typeof arg0 === "number") {
      delta = arg0;
      options = arg1 || {};
    } else if (arg0 && typeof arg0 === "object") {
      delta = arg0.delta || 1;
      options = arg1 || arg0;
    }
    return this._doNavigate("navigateBack", "", { ...options, delta });
  },

  async redirectTo(arg0, arg1) {
    const { url, options } = _normalizeArgs(arg0, arg1);
    const userInfo = this.getUserInfo();
    const access = this.checkAccess(url, userInfo);

    if (!access.canAccess) {
      if (access.reason === "unauthorized") {
        this.setRedirect(url);
      }
      const guardErr = this._buildGuardError("redirectTo", access.reason, access.redirect, url);
      this._invokeCallbacks(options, null, guardErr);
      this._doNavigate("reLaunch", access.redirect).catch(() => {});
      return Promise.reject(guardErr);
    }

    if (isTabPage(url)) {
      return this._doNavigate("switchTab", normalizePath(url), options);
    }

    return this._doNavigate("redirectTo", url, options);
  },

  goAfterLogin(role) {
    const redirect = this.consumeRedirect();
    if (redirect) {
      const access = this.checkAccess(redirect, this.getUserInfo());
      if (access.canAccess) {
        if (isTabPage(redirect)) {
          return this._doNavigate("switchTab", normalizePath(redirect));
        }
        return this._doNavigate("reLaunch", redirect);
      }
    }
    const home = this.getHomeByRole(role);
    return this._doNavigate("switchTab", home);
  },

  syncTabBar(pageCtx) {
    if (!pageCtx || typeof pageCtx.getTabBar !== "function") return;
    const userInfo = this.getUserInfo();
    if (!userInfo) return;

    wx.nextTick(() => {
      try {
        const tabBar = pageCtx.getTabBar();
        if (!tabBar) return;

        const pages = getCurrentPages();
        if (!pages.length) return;

        const currentPath = pages[pages.length - 1].route;
        const index = this.getTabIndex(userInfo.role, currentPath);

        if (index > -1) {
          tabBar.setData({ selected: index });
        }
        if (typeof tabBar.updateRole === "function") {
          tabBar.updateRole();
        }
      } catch (e) {
        console.warn("[Router] syncTabBar error:", e);
      }
    });
  },
};
