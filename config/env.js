const ENV_TYPE = {
  DEV: "dev",
  PROD: "prod",
};

const ENV_CONFIG = {
  [ENV_TYPE.DEV]: {
    envId: "cloud1-5gy43j1wb5112695",
    traceUser: true,
  },
  [ENV_TYPE.PROD]: {
    envId: "cloud1-5gy43j1wb5112695",
    traceUser: true,
  },
};

const STORAGE_KEY = "__app_env__";

function detectEnv() {
  try {
    const stored = wx.getStorageSync(STORAGE_KEY);
    if (stored && ENV_CONFIG[stored]) {
      return stored;
    }
  } catch (e) {}

  const accountInfo = wx.getAccountInfoSync();
  const envVersion = accountInfo?.miniProgram?.envVersion;

  if (envVersion === "release") {
    return ENV_TYPE.PROD;
  }
  return ENV_TYPE.DEV;
}

let currentEnv = null;

function getEnv() {
  if (!currentEnv) {
    currentEnv = detectEnv();
  }
  return currentEnv;
}

function setEnv(env) {
  if (!ENV_CONFIG[env]) {
    console.warn(`[Config] 未知环境类型: ${env}`);
    return;
  }
  currentEnv = env;
  try {
    wx.setStorageSync(STORAGE_KEY, env);
  } catch (e) {}
}

function getEnvConfig() {
  const env = getEnv();
  return {
    env,
    ...ENV_CONFIG[env],
  };
}

export { ENV_TYPE, getEnv, setEnv, getEnvConfig };
export default { ENV_TYPE, getEnv, setEnv, getEnvConfig };
