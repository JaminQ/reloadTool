;
(() => {
  // 简单封装一下sendMessage
  const sendMessage = (data, suc) => {
    chrome.runtime.sendMessage(data, response => {
      if (response.ret === 0) {
        typeof suc === 'function' && suc(response);
      } else {
        console.error(`reload extension: ${data.action} fail`);
      }
    });
  };

  // 检测页面资源是否完全加载完成
  let isResReady = false;
  let resLen = null;
  let resEnd = null;
  let loop = null;
  let quene = []; // 回调队列
  const getResEnd = entries => { // 获取资源加载时间
    let responseEnd = 0;
    entries.forEach(entry => {
      if (entry !== null && entry.responseEnd !== undefined && entry.responseEnd > responseEnd) {
        responseEnd = entry.responseEnd;
      }
    });
    return responseEnd;
  };
  const judgeResReady = () => { // 判断算法
    if (isResReady) { // 已经加载完成了，直接执行回调
      return true;
    } else { // 判断是否加载完成
      const entries = performance.getEntries();
      if (resLen === null || entries.length > resLen) {
        // 首次判断资源长度或又有了新的资源请求，更新一下，直接结束（因为肯定没加载完呀）
        resLen = entries.length;
      } else if (resEnd === null) {
        // 首次判断资源时间，更新一下，直接结束（因为肯定没加载完呀）
        resEnd = getResEnd(entries);
      } else {
        const responseEnd = getResEnd(entries);
        if (responseEnd > resEnd) {
          resEnd = responseEnd;
        } else {
          isResReady = true;
          return true;
        }
      }
    }
    return false;
  };
  const execQuene = () => { // 按队列顺序依次运行队列中的回调
    quene.forEach(callback => {
      typeof callback === 'function' && callback();
    });
  };
  const resReady = callback => { // 使用循环计时器不断判断是否加载完成，如果加载完成则执行回调
    quene.push(callback); // 加入回调队列

    if (loop !== null) return; // 如果已经有计时器了，啥都不用做

    if (judgeResReady()) { // 已加载完成，运行回调队列
      execQuene();
    } else { // 未加载完成，设置计时器
      loop = setInterval(() => {
        if (judgeResReady()) {
          // 清除计时器
          clearInterval(loop);
          loop = null;

          // 运行回调队列
          execQuene();
        }
      }, 1000); // 每1s判断一次
    }
  };

  // reload页面
  const reload = () => {
    resReady(() => {
      // 通知background.js要开始reload了
      sendMessage({
        action: 'reload',
        data: resEnd
      }, response => {
        if (response.isFinish) { // 完成之后重置回调队列
          quene = [];
          console.log(response.text);
        } else { // 未完成，继续reload
          location.reload();
        }
      });
    });
  };

  resReady(); // 开启计时器判断页面资源加载状态

  // 监听是否开始reload
  chrome.runtime.onMessage.addListener(request => {
    switch (request.action) {
      case 'start':
        reload();
        break;
      default:
    }
  });

  // 询问是否需要reload
  sendMessage({
    action: 'ask'
  }, response => {
    response.needReload && reload();
  });
})();