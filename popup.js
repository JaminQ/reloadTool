const qs = (query, dom = document) => dom.querySelector(query);
const bind = (dom, type, handler) => dom.addEventListener(type, handler, false);

const bg = chrome.extension.getBackgroundPage(); // 获取background
const reloadInput = qs('#reload-input');
const startBtn = qs('#start-btn');
const stopBtn = qs('#stop-btn');
const errorText = qs('#error-text');
const reloadTimes = qs('#reload-times');
let tab = null;
let tabId = null;

// 初始化数据
const initData = callback => {
  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, tabs => {
    tabId = tabs[0].id || null;
    tab = bg.tabsData[tabId] || null;
    typeof callback === 'function' && callback();
  });
};

// 渲染页面
const renderPage = () => {
  if (tab) {
    reloadInput.value = tab.total; // 设置input值
    switchPage(true, tab); // 切换为reloading页面
  }
};

// 绑定事件
const bindEvent = () => {
  // 点击“开始”
  bind(startBtn, 'click', () => {
    let val = reloadInput.value.replace(/(^\s*)|(\s*$)/g, '');

    if (valid(val)) {
      val = val * 1;

      // 设置reload次数
      if (tab === null) {
        tab = bg.tabsData[tabId] = {
          times: val,
          total: val,
          data: []
        };
      } else {
        tab.times = tab.total = val;
      }

      switchPage(true, tab); // 切换为reloading页面
      bg.start(tabId); // 开始reload
    } else {
      reloadTimes.style.display = 'none';
    }
  });

  // 点击“中止”
  bind(stopBtn, 'click', () => {
    // 移除tab信息
    delete bg.tabsData[tabId];
    tab = null;

    switchPage(false); // 切换为未reload页面
  });
};

// 校验，常规操作
const valid = val => {
  if (val === '') {
    errorText.innerHTML = '写个次数呗，金华';
    errorText.style.display = '';
    return false;
  } else if (isNaN(val * 1)) {
    errorText.innerHTML = '不是数字呀，金华';
    errorText.style.display = '';
    return false;
  } else if (val * 1 <= 0) {
    errorText.innerHTML = '不给正数吗，金华';
    errorText.style.display = '';
    return false;
  }

  errorText.style.display = 'none';
  return true;
}

// 切换页面
const switchPage = (isReload, tab) => {
  reloadTimes.style.display = '';
  if (isReload) {
    reloadTimes.innerHTML = `当前reload次数：${tab.total - tab.times}/${tab.total}`;
    reloadInput.disabled = true;
    startBtn.style.display = 'none';
    stopBtn.style.display = '';
  } else {
    reloadTimes.innerHTML = tab === null ? '已完成' : '未开始';
    reloadInput.disabled = false;
    startBtn.style.display = '';
    stopBtn.style.display = 'none';
  }
};

// Here is time to go!
initData(() => {
  renderPage();
  bindEvent();
});