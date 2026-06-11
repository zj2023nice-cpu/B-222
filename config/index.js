import envConfig, { ENV_TYPE, getEnv, setEnv, getEnvConfig } from "./env";
import { CLOUD_FUNCTIONS } from "./cloud.functions";
import {
  ROLES,
  ROLE_LABELS,
  COLLECTION_MAP,
  getRoleLabel,
  getCollectionByRole,
  isValidRole,
} from "./roles";

export {
  ENV_TYPE,
  getEnv,
  setEnv,
  getEnvConfig,
  CLOUD_FUNCTIONS,
  ROLES,
  ROLE_LABELS,
  COLLECTION_MAP,
  getRoleLabel,
  getCollectionByRole,
  isValidRole,
};

export default {
  env: envConfig,
  cloudFunctions: CLOUD_FUNCTIONS,
  roles: {
    ROLES,
    ROLE_LABELS,
    COLLECTION_MAP,
    getRoleLabel,
    getCollectionByRole,
    isValidRole,
  },
};
