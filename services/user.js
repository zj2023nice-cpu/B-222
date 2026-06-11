import createCall from "./cloud-call";
import { CLOUD_FUNCTIONS } from "../config/index";

const call = createCall("User", CLOUD_FUNCTIONS.USER);

const userService = {
  getStats: (role) => call("get_stats", { role }),
  deleteAccount: (role) => call("delete_account", { role }),
  register: (role, name, avatar) => call("register", { role, name, avatar }),
  checkUser: (role) => call("check_user", { role }),
  updateConsultant: (profile) => call("update_consultant", profile),
  getUserList: (params) => call("get_user_list", params),
  adminDeleteUser: (targetId, targetRole) =>
    call("admin_delete_user", { targetId, targetRole }),
  adminGetUserInfo: (userId, role) =>
    call("admin_get_user_info", { userId, role }),
  adminUpdateConsultant: (profile) => call("admin_update_consultant", profile),
  adminUpdateUser: (data) => call("admin_update_user", data),
};

export default userService;
