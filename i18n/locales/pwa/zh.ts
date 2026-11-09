/** `pwa` namespace: 中文 (see ./en.ts). */
export const pwaZh: typeof import('./en').pwaEn = {
  update: {
    title: 'BeHappy 新版本已就绪',
    refresh: '刷新',
    later: '稍后',
  },
  install: {
    cardTitle: '安装 BeHappy',
    cardBody: '从主屏幕打开，像应用一样全屏使用，还有提醒和通知。',
    install: '安装',
    how: '告诉我怎么做',
    notNow: '暂不',
    intro: 'BeHappy 可以直接在浏览器中像应用一样使用：放在主屏幕上、全屏显示、接收通知。无需应用商店，也无需下载。',
    installed: 'BeHappy 已安装在此设备上。请从主屏幕打开。',
    iosTitle: 'iPhone 和 iPad',
    iosSteps: ['在 Safari 中打开 BeHappy。', '轻点“共享”按钮（带箭头的方框）。', '选择“添加到主屏幕”。', '保持“作为网页 App 打开”开启，然后轻点“添加”。'],
    iosNote: 'iPhone 和 iPad 没有网页应用的安装按钮，所以需要按这些步骤操作。从主屏幕打开 BeHappy 时可以收到通知（iOS 16.4 或更高版本）。',
    androidTitle: 'Android',
    androidSteps: ['在 Chrome 中打开 BeHappy。', '轻点右上角的菜单（⋮）。', '选择“安装应用”或“添加到主屏幕”。'],
    desktopTitle: '电脑',
    desktopSteps: ['在 Chrome 或 Edge 中，点击地址栏右端的安装图标。', '或打开浏览器菜单，选择“安装 BeHappy”。'],
    settingsHint: '主屏幕、全屏、通知',
  },
  push: {
    needsInstall: '在 iPhone 和 iPad 上，将 BeHappy 添加到主屏幕后即可收到通知和提醒。',
    howToInstall: '如何添加',
    denied: '此浏览器已阻止 BeHappy 的通知。请在网站设置（地址旁边）中允许后重试。',
    unsupported: '此浏览器无法接收网站通知。所有内容仍会显示在 BeHappy 中。',
    webDevice: '此设备上的通知',
  },
};
