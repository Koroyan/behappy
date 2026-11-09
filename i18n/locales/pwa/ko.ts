/** `pwa` namespace: 한국어 (see ./en.ts). */
export const pwaKo: typeof import('./en').pwaEn = {
  update: {
    title: 'BeHappy 새 버전이 준비됐어요',
    refresh: '새로고침',
    later: '나중에',
  },
  install: {
    cardTitle: 'BeHappy 설치하기',
    cardBody: '홈 화면에서 앱처럼 전체 화면으로 열고, 리마인더와 알림도 받아요.',
    install: '설치',
    how: '방법 보기',
    notNow: '나중에',
    intro: 'BeHappy는 브라우저에서 바로 앱처럼 쓸 수 있어요. 홈 화면에 두고, 전체 화면으로, 알림과 함께요. 앱 스토어도 다운로드도 필요 없어요.',
    installed: '이 기기에 BeHappy가 설치되어 있어요. 홈 화면에서 여세요.',
    iosTitle: 'iPhone 및 iPad',
    iosSteps: ['Safari에서 BeHappy를 여세요.', '공유 버튼(화살표가 있는 네모)을 탭하세요.', '\'홈 화면에 추가\'를 선택하세요.', '\'웹 앱으로 열기\'를 켠 채로 \'추가\'를 탭하세요.'],
    iosNote: 'iPhone과 iPad에는 웹 앱 설치 버튼이 없어서 이 단계로 추가해요. 알림은 홈 화면에서 연 BeHappy에서 받을 수 있어요(iOS 16.4 이상).',
    androidTitle: 'Android',
    androidSteps: ['Chrome에서 BeHappy를 여세요.', '오른쪽 위 메뉴(⋮)를 탭하세요.', '\'앱 설치\' 또는 \'홈 화면에 추가\'를 선택하세요.'],
    desktopTitle: '컴퓨터',
    desktopSteps: ['Chrome이나 Edge에서 주소창 오른쪽 끝의 설치 아이콘을 클릭하세요.', '또는 브라우저 메뉴에서 \'BeHappy 설치\'를 선택하세요.'],
    settingsHint: '홈 화면, 전체 화면, 알림',
  },
  push: {
    needsInstall: 'iPhone과 iPad에서는 BeHappy를 홈 화면에 추가하면 알림과 리마인더를 받을 수 있어요.',
    howToInstall: '추가하는 방법',
    denied: '이 브라우저에서 BeHappy 알림이 차단되어 있어요. 사이트 설정(주소 옆)에서 허용한 뒤 다시 시도해 주세요.',
    unsupported: '이 브라우저는 웹사이트 알림을 받을 수 없어요. 모든 내용은 BeHappy 안에서 볼 수 있어요.',
    webDevice: '이 기기의 알림',
  },
};
