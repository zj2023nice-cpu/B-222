const ROUTE_PERMISSIONS = {
  "pages/login/login": "guest",

  "pages/main/home/home": "auth",
  "pages/main/records/records": "auth",
  "pages/main/mine/mine": "auth",
  "pages/main/assessment/assessment": ["consultant", "admin"],
  "pages/main/exam/exam": ["consultant", "admin"],

  "pages/consultant/assessment-edit/edit": "consultant",
  "pages/consultant/profile/profile": "consultant",
  "pages/consultant/tab-page/appointments/appointments": "consultant",
  "pages/consultant/tab-page/assessment/assessment": "consultant",
  "pages/consultant/tab-page/exam/exam": "consultant",
  "pages/consultant/tab-page/mine/mine": "consultant",
  "pages/consultant/tab-page/user-records/user-records": "consultant",

  "pages/student/appointment/appointment": "user",
  "pages/student/appointment-list/appointment-list": "user",
  "pages/student/articles/articles": "user",
  "pages/student/articles/article-detail/article-detail": "user",
  "pages/student/collections/collections": "user",
  "pages/student/mood/mood": "user",
  "pages/student/assessment/assessment": "user",
  "pages/student/assessment/assessment-detail/assessment-detail": "user",
  "pages/student/exam-records/exam-records": "user",
  "pages/student/tab-page/home/home": "user",
  "pages/student/tab-page/ai-chat/ai-chat": "user",
  "pages/student/tab-page/mine/mine": "user",

  "pages/admin/article-edit/article-edit": "admin",
  "pages/admin/banner-manage/banner-manage": "admin",
  "pages/admin/banner-edit/banner-edit": "admin",
  "pages/admin/user-edit/user-edit": "admin",
  "pages/admin/tab-page/consultation-manage/consultation-manage": "admin",
  "pages/admin/tab-page/knowledge-manage/knowledge-manage": "admin",
  "pages/admin/tab-page/mine/mine": "admin",
  "pages/admin/tab-page/resource-manage/resource-manage": "admin",
  "pages/admin/tab-page/user-manage/user-manage": "admin",
};

const ROLE_HOME = {
  user: "/pages/main/home/home",
  consultant: "/pages/main/home/home",
  admin: "/pages/main/home/home",
};

const LOGIN_PAGE = "/pages/login/login";

const TAB_PAGES = new Set([
  "/pages/main/home/home",
  "/pages/main/records/records",
  "/pages/main/assessment/assessment",
  "/pages/main/exam/exam",
  "/pages/main/mine/mine",
]);

function cleanPath(url) {
  if (!url) return "";
  return url.split("?")[0].replace(/^\//, "");
}

function normalizePath(url) {
  if (!url) return "";
  const path = url.split("?")[0];
  return path.startsWith("/") ? path : `/${path}`;
}

function getQueryString(url) {
  const idx = url.indexOf("?");
  return idx > -1 ? url.slice(idx) : "";
}

function isTabPage(url) {
  return TAB_PAGES.has(normalizePath(url));
}

function checkAccess(url, userInfo, routePermissions = ROUTE_PERMISSIONS, roleHome = ROLE_HOME, loginPage = LOGIN_PAGE) {
  const path = cleanPath(url);

  if (!path) {
    return { canAccess: true };
  }

  const requiredRole = routePermissions[path];

  if (!requiredRole || requiredRole === "guest") {
    return { canAccess: true };
  }

  const resolvedUser = userInfo;

  if (!resolvedUser) {
    return {
      canAccess: false,
      reason: "unauthorized",
      redirect: loginPage,
    };
  }

  if (requiredRole === "auth") {
    return { canAccess: true };
  }

  let hasRole = false;
  if (Array.isArray(requiredRole)) {
    hasRole = requiredRole.includes(resolvedUser.role);
  } else {
    hasRole = resolvedUser.role === requiredRole;
  }

  if (hasRole) {
    return { canAccess: true };
  }

  return {
    canAccess: false,
    reason: "forbidden",
    redirect: roleHome[resolvedUser.role] || roleHome.user,
  };
}

function _normalizeArgs(arg0, arg1) {
  if (typeof arg0 === "string") {
    return { url: arg0, options: arg1 || {} };
  }
  if (arg0 && typeof arg0 === "object" && typeof arg0.url === "string") {
    const { url, ...rest } = arg0;
    return { url, options: { ...rest, ...(arg1 || {}) } };
  }
  return { url: "", options: arg1 || {} };
}

function buildGuardError(method, reason, redirect, targetUrl) {
  return {
    errMsg: `${method}:fail guard_${reason}`,
    __routerGuard: true,
    reason,
    redirect,
    targetUrl,
  };
}

function invokeCallbacks(options, successRes, failErr) {
  const { success, fail, complete } = options || {};
  let completeFired = false;
  const fireComplete = (res) => {
    if (completeFired) return;
    completeFired = true;
    if (typeof complete === "function") {
      try { complete(res); } catch (e) {}
    }
  };
  if (failErr) {
    if (typeof fail === "function") {
      try { fail(failErr); } catch (e) {}
    }
    fireComplete(failErr);
  } else {
    if (typeof success === "function") {
      try { success(successRes); } catch (e) {}
    }
    fireComplete(successRes);
  }
}

module.exports = {
  ROUTE_PERMISSIONS,
  ROLE_HOME,
  LOGIN_PAGE,
  TAB_PAGES,
  cleanPath,
  normalizePath,
  getQueryString,
  isTabPage,
  checkAccess,
  _normalizeArgs,
  buildGuardError,
  invokeCallbacks,
};
