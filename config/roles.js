const ROLES = {
  USER: "user",
  CONSULTANT: "consultant",
  ADMIN: "admin",
};

const ROLE_LABELS = {
  [ROLES.USER]: "用户",
  [ROLES.CONSULTANT]: "咨询师",
  [ROLES.ADMIN]: "管理员",
};

const COLLECTION_MAP = {
  [ROLES.USER]: "users",
  [ROLES.CONSULTANT]: "consultants",
  [ROLES.ADMIN]: "admins",
};

function getRoleLabel(role) {
  return ROLE_LABELS[role] || role;
}

function getCollectionByRole(role) {
  return COLLECTION_MAP[role] || "users";
}

function isValidRole(role) {
  return Object.values(ROLES).includes(role);
}

export { ROLES, ROLE_LABELS, COLLECTION_MAP, getRoleLabel, getCollectionByRole, isValidRole };
export default { ROLES, ROLE_LABELS, COLLECTION_MAP, getRoleLabel, getCollectionByRole, isValidRole };
