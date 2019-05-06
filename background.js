const tabsData = {}; // 记录各个页面的数据，包括times(当前还需reload的次数)，total（需reload的总次数）

// 通知tab开始reload
const start = id => {
  if (id === null) return; // 没有传页面id，忽略
  chrome.tabs.sendMessage(id, {
    action: 'start'
  });
};

// 监听contentScript.js的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 忽略非contentScript.js传过来的消息
  if (!sender.tab) return;

  const tabId = sender.tab.id;
  let tab = tabsData[tabId] || null;
  switch (request.action) {
    case 'ask': // 询问是否需要reload
      sendResponse({
        ret: 0,
        needReload: tab !== null && tab.times > 0
      });
      break;
    case 'reload': // 开始reload
      // 更新次数，并记录页面加载时间
      tab.times--;
      tab.data.push(request.data);

      // 获取popup
      const popups = chrome.extension.getViews({
        type: 'popup'
      });
      if (popups.length) {
        const popup = popups[0];
        if (popup.tabId === tabId) {
          popup.switchPage(tab.times > 0, tab.times > 0 ? tab : null);
          popup.tab = null;
        }
      }

      const res = {
        ret: 0,
        isFinish: false
      };

      // 判断是否结束
      if (tab.times === 0) {
        // 求平均值
        let txt = '';
        let result = 0;
        tab.data.forEach((item, idx) => {
          txt += `第${idx + 1}次：${item.toFixed(2)}ms\n`;
          result += item;
        });
        result /= tab.data.length;

        // 删除数据
        delete tabsData[tabId];
        tab = null;

        res.isFinish = true;
        res.text = `${txt}平均值是：${result.toFixed(2)}ms`;
      }

      sendResponse(res);
      break;
    default:
      sendResponse({
        ret: -1
      });
  }
});