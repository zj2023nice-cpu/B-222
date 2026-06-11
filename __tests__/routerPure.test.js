const {
  cleanPath,
  normalizePath,
  getQueryString,
  isTabPage,
  checkAccess,
  _normalizeArgs,
  buildGuardError,
  invokeCallbacks,
  ROUTE_PERMISSIONS,
  ROLE_HOME,
  LOGIN_PAGE,
} = require("../utils/routerPure");

describe("routerPure - 路径处理函数", () => {
  describe("cleanPath", () => {
    it("应该移除路径开头的斜杠和查询参数", () => {
      expect(cleanPath("/pages/login/login?id=123")).toBe("pages/login/login");
      expect(cleanPath("pages/login/login?id=123")).toBe("pages/login/login");
    });

    it("空值或未定义时返回空字符串", () => {
      expect(cleanPath("")).toBe("");
      expect(cleanPath(null)).toBe("");
      expect(cleanPath(undefined)).toBe("");
    });

    it("只移除查询参数保留路径", () => {
      expect(cleanPath("/pages/main/home/home")).toBe("pages/main/home/home");
    });
  });

  describe("normalizePath", () => {
    it("应该确保路径以斜杠开头", () => {
      expect(normalizePath("pages/login/login")).toBe("/pages/login/login");
      expect(normalizePath("/pages/login/login")).toBe("/pages/login/login");
    });

    it("应该移除查询参数", () => {
      expect(normalizePath("pages/login/login?id=123")).toBe("/pages/login/login");
    });

    it("空值时返回空字符串", () => {
      expect(normalizePath("")).toBe("");
      expect(normalizePath(null)).toBe("");
    });
  });

  describe("getQueryString", () => {
    it("应该正确提取查询字符串", () => {
      expect(getQueryString("/pages/login?id=123&name=test")).toBe("?id=123&name=test");
    });

    it("没有查询参数时返回空字符串", () => {
      expect(getQueryString("/pages/login")).toBe("");
    });
  });

  describe("isTabPage", () => {
    it("应该正确识别 Tab 页面", () => {
      expect(isTabPage("/pages/main/home/home")).toBe(true);
      expect(isTabPage("pages/main/home/home")).toBe(true);
      expect(isTabPage("/pages/main/records/records")).toBe(true);
    });

    it("应该正确识别非 Tab 页面", () => {
      expect(isTabPage("/pages/login/login")).toBe(false);
      expect(isTabPage("/pages/student/appointment/appointment")).toBe(false);
    });

    it("空路径返回 false", () => {
      expect(isTabPage("")).toBe(false);
    });
  });
});

describe("routerPure - checkAccess 权限判断", () => {
  const userUser = { role: "user", openid: "test-user-1" };
  const consultantUser = { role: "consultant", openid: "test-consultant-1" };
  const adminUser = { role: "admin", openid: "test-admin-1" };
  const unknownRoleUser = { role: "unknown", openid: "test-unknown-1" };

  describe("边界情况 - 空路径和游客权限", () => {
    it("空路径应该允许访问", () => {
      const result = checkAccess("", userUser);
      expect(result.canAccess).toBe(true);
    });

    it("未配置权限的路径应该允许访问", () => {
      const result = checkAccess("/pages/unknown/page", userUser);
      expect(result.canAccess).toBe(true);
    });

    it("游客权限页面应该允许未登录用户访问", () => {
      const result = checkAccess("/pages/login/login", null);
      expect(result.canAccess).toBe(true);
    });
  });

  describe("未登录场景 - unauthorized", () => {
    it("需要 auth 权限的页面，未登录时返回 unauthorized", () => {
      const result = checkAccess("/pages/main/home/home", null);
      expect(result.canAccess).toBe(false);
      expect(result.reason).toBe("unauthorized");
      expect(result.redirect).toBe(LOGIN_PAGE);
    });

    it("需要特定角色的页面，未登录时返回 unauthorized", () => {
      const result = checkAccess("/pages/student/appointment/appointment", null);
      expect(result.canAccess).toBe(false);
      expect(result.reason).toBe("unauthorized");
      expect(result.redirect).toBe(LOGIN_PAGE);
    });

    it("用户信息为空对象时，视为未登录", () => {
      const result = checkAccess("/pages/main/home/home", {});
      expect(result.canAccess).toBe(true);
    });
  });

  describe("正常路径 - 权限匹配", () => {
    it("auth 权限 - 任何已登录用户都可以访问", () => {
      expect(checkAccess("/pages/main/home/home", userUser).canAccess).toBe(true);
      expect(checkAccess("/pages/main/home/home", consultantUser).canAccess).toBe(true);
      expect(checkAccess("/pages/main/home/home", adminUser).canAccess).toBe(true);
    });

    it("user 角色权限 - 只有 user 可以访问", () => {
      expect(checkAccess("/pages/student/appointment/appointment", userUser).canAccess).toBe(true);
      expect(checkAccess("/pages/student/appointment/appointment", consultantUser).canAccess).toBe(false);
      expect(checkAccess("/pages/student/appointment/appointment", adminUser).canAccess).toBe(false);
    });

    it("consultant 角色权限 - 只有 consultant 可以访问", () => {
      expect(checkAccess("/pages/consultant/profile/profile", consultantUser).canAccess).toBe(true);
      expect(checkAccess("/pages/consultant/profile/profile", userUser).canAccess).toBe(false);
      expect(checkAccess("/pages/consultant/profile/profile", adminUser).canAccess).toBe(false);
    });

    it("admin 角色权限 - 只有 admin 可以访问", () => {
      expect(checkAccess("/pages/admin/user-edit/user-edit", adminUser).canAccess).toBe(true);
      expect(checkAccess("/pages/admin/user-edit/user-edit", userUser).canAccess).toBe(false);
      expect(checkAccess("/pages/admin/user-edit/user-edit", consultantUser).canAccess).toBe(false);
    });

    it("数组形式的多角色权限 - consultant 和 admin 都可以访问", () => {
      expect(checkAccess("/pages/main/assessment/assessment", consultantUser).canAccess).toBe(true);
      expect(checkAccess("/pages/main/assessment/assessment", adminUser).canAccess).toBe(true);
      expect(checkAccess("/pages/main/assessment/assessment", userUser).canAccess).toBe(false);
    });
  });

  describe("权限不足场景 - forbidden", () => {
    it("user 访问 consultant 页面，应该返回 forbidden 并重定向到 user 首页", () => {
      const result = checkAccess("/pages/consultant/profile/profile", userUser);
      expect(result.canAccess).toBe(false);
      expect(result.reason).toBe("forbidden");
      expect(result.redirect).toBe(ROLE_HOME.user);
    });

    it("consultant 访问 admin 页面，应该返回 forbidden 并重定向到 consultant 首页", () => {
      const result = checkAccess("/pages/admin/user-edit/user-edit", consultantUser);
      expect(result.canAccess).toBe(false);
      expect(result.reason).toBe("forbidden");
      expect(result.redirect).toBe(ROLE_HOME.consultant);
    });

    it("未知角色访问受限页面，应该重定向到默认 user 首页", () => {
      const result = checkAccess("/pages/admin/user-edit/user-edit", unknownRoleUser);
      expect(result.canAccess).toBe(false);
      expect(result.reason).toBe("forbidden");
      expect(result.redirect).toBe(ROLE_HOME.user);
    });
  });

  describe("带查询参数的路径", () => {
    it("带参数的路径应该正确匹配权限", () => {
      const result = checkAccess("/pages/student/appointment/appointment?id=123", userUser);
      expect(result.canAccess).toBe(true);
    });

    it("带参数的路径权限不足时应该正确拦截", () => {
      const result = checkAccess("/pages/student/appointment/appointment?id=123", consultantUser);
      expect(result.canAccess).toBe(false);
      expect(result.reason).toBe("forbidden");
    });
  });

  describe("自定义权限配置", () => {
    it("应该支持自定义 routePermissions", () => {
      const customPermissions = {
        "pages/test/page": "test-role",
      };
      const customRoleHome = {
        "test-role": "/pages/test/home",
        user: "/pages/user/home",
      };
      const testUser = { role: "test-role" };

      expect(
        checkAccess("/pages/test/page", testUser, customPermissions, customRoleHome).canAccess
      ).toBe(true);

      const result = checkAccess("/pages/test/page", userUser, customPermissions, customRoleHome);
      expect(result.canAccess).toBe(false);
      expect(result.redirect).toBe("/pages/user/home");
    });
  });
});

describe("routerPure - 工具函数", () => {
  describe("_normalizeArgs", () => {
    it("字符串参数应该正确解析", () => {
      const result = _normalizeArgs("/pages/login", { success: jest.fn() });
      expect(result.url).toBe("/pages/login");
      expect(result.options).toEqual({ success: expect.any(Function) });
    });

    it("对象参数应该正确解析", () => {
      const result = _normalizeArgs({ url: "/pages/login", success: jest.fn() });
      expect(result.url).toBe("/pages/login");
      expect(result.options.success).toBeDefined();
    });

    it("无效参数应该返回空 url", () => {
      const result = _normalizeArgs(null, { test: 1 });
      expect(result.url).toBe("");
      expect(result.options).toEqual({ test: 1 });
    });
  });

  describe("buildGuardError", () => {
    it("应该构建正确格式的守卫错误", () => {
      const error = buildGuardError("navigateTo", "forbidden", "/pages/home", "/pages/admin");
      expect(error.errMsg).toBe("navigateTo:fail guard_forbidden");
      expect(error.__routerGuard).toBe(true);
      expect(error.reason).toBe("forbidden");
      expect(error.redirect).toBe("/pages/home");
      expect(error.targetUrl).toBe("/pages/admin");
    });
  });

  describe("invokeCallbacks", () => {
    it("成功时应该调用 success 和 complete", () => {
      const success = jest.fn();
      const complete = jest.fn();
      const fail = jest.fn();

      invokeCallbacks({ success, fail, complete }, { ok: true }, null);

      expect(success).toHaveBeenCalledWith({ ok: true });
      expect(complete).toHaveBeenCalledWith({ ok: true });
      expect(fail).not.toHaveBeenCalled();
    });

    it("失败时应该调用 fail 和 complete", () => {
      const success = jest.fn();
      const complete = jest.fn();
      const fail = jest.fn();
      const error = new Error("test error");

      invokeCallbacks({ success, fail, complete }, null, error);

      expect(fail).toHaveBeenCalledWith(error);
      expect(complete).toHaveBeenCalledWith(error);
      expect(success).not.toHaveBeenCalled();
    });

    it("回调函数抛出异常时不应该中断执行", () => {
      const success = jest.fn(() => {
        throw new Error("callback error");
      });
      const complete = jest.fn();

      expect(() => {
        invokeCallbacks({ success, complete }, { ok: true }, null);
      }).not.toThrow();

      expect(success).toHaveBeenCalled();
      expect(complete).toHaveBeenCalled();
    });

    it("complete 只应该被调用一次", () => {
      const complete = jest.fn();
      invokeCallbacks({ complete }, { ok: true }, null);
      expect(complete).toHaveBeenCalledTimes(1);
    });
  });
});
