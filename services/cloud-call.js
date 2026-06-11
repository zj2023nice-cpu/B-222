function createCall(serviceLabel, cloudFunctionName) {
  return async function call(action, data = {}) {
    try {
      const { result } = await wx.cloud.callFunction({
        name: cloudFunctionName,
        data: { action, data },
      });
      if (!result) {
        throw new Error(`${serviceLabel} 云函数返回值为空`);
      }
      if (result.code !== 0) {
        throw new Error(result.msg || `${serviceLabel} 服务异常`);
      }
      return result;
    } catch (err) {
      console.error(`[${serviceLabel} Error][${action}]:`, err);
      throw err;
    }
  };
}

export default createCall;
