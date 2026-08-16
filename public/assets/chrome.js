/* ==========================================================================
   취R업 – 공통 헤더 / 푸터
   모든 페이지가 동일한 상단 탭(홈 · 채용공고 · 내페이지)과 하단(이용약관 ·
   개인정보처리방침 · 제작 팀)을 갖도록 한 곳에서 렌더링한다.
   사용법: 본문에 <div id="app-header"></div> / <div id="app-footer"></div>
   ========================================================================== */
(function () {
  var AUTH_KEY = 'chwireup-auth';   // 'personal' | 'company' | null
  var NAME_KEY = 'chwireup-auth-name';

  function authRole() {
    try {
      return localStorage.getItem(AUTH_KEY);
    } catch (e) {
      return null;
    }
  }
  function authName() {
    try {
      return localStorage.getItem(NAME_KEY) || '';
    } catch (e) {
      return '';
    }
  }
  function isLoggedIn() {
    var r = authRole();
    return r === 'personal' || r === 'company';
  }

  function currentPage() {
    return ((location.pathname || '').split('/').pop() || 'index.html').toLowerCase();
  }

  // detail.html은 채용공고에서 진입하는 하위 화면이라 채용공고 탭을 활성으로 본다
  var ALIAS = { 'detail.html': 'company.html', '': 'index.html' };
  function activeKey() {
    var page = currentPage();
    return ALIAS[page] || page;
  }

  function tabs() {
    var role = authRole();
    var list = [
      { key: 'index.html', label: '홈', icon: 'home', href: 'index.html' },
      { key: 'company.html', label: '채용공고', icon: 'work', href: 'company.html' }
    ];
    // 내페이지는 로그인한 뒤에만 생긴다
    if (role === 'company') {
      list.push({ key: 'employer.html', label: '내페이지', icon: 'domain', href: 'employer.html' });
    } else if (role === 'personal') {
      list.push({ key: 'assessment.html', label: '내페이지', icon: 'account_circle', href: 'assessment.html' });
    }
    return list;
  }

  function icon(name, size) {
    return '<span class="material-symbols-outlined" style="font-size:' + (size || 18) + 'px">' + name + '</span>';
  }

  function logo(heightClass) {
    return (
      '<img src="assets/logo.png" alt="취R업" class="brand-logo brand-logo-light ' + heightClass + ' w-auto" />' +
      '<img src="assets/logo-dark.png" alt="취R업" class="brand-logo brand-logo-dark ' + heightClass + ' w-auto" />'
    );
  }

  function headerHTML() {
    var active = activeKey();
    var list = tabs();
    var loggedIn = isLoggedIn();
    var role = authRole();

    // 데스크톱 상단은 홈·채용공고만 두고, 내페이지는 우측 프로필로 들어간다
    var nav = list
      .filter(function (t) {
        return t.label !== '내페이지';
      })
      .map(function (t) {
        var on = t.key === active;
        var cls = on
          ? 'px-3.5 py-2 rounded-xl bg-[#d6e3ff] text-[#002045] font-bold transition-all flex items-center gap-1.5'
          : 'px-3.5 py-2 rounded-xl text-gray-600 hover:text-[#002045] hover:bg-gray-100 transition-all flex items-center gap-1.5';
        return '<a href="' + t.href + '" class="' + cls + '">' + icon(t.icon) + '<span>' + t.label + '</span></a>';
      })
      .join('');

    var right = loggedIn
      ? '<span class="hidden sm:inline text-xs font-bold text-gray-600">' +
        (authName() || (role === 'company' ? '기업회원' : '개인회원')) +
        '</span>' +
        '<button type="button" id="app-logout" class="text-xs font-bold text-gray-600 hover:text-[#002045] px-3 py-2 rounded-xl hover:bg-gray-100 transition">로그아웃</button>'
      : '<a href="ls.html" class="bg-[#002045] text-white font-bold px-3.5 py-2 rounded-xl text-xs hover:opacity-90 transition flex items-center gap-1.5">' +
        icon('lock', 16) +
        '<span>로그인</span></a>';

    var myHref = role === 'company' ? 'employer.html' : 'assessment.html';

    // 로그아웃 상태에서는 프로필을 감추고 로그인 버튼만 남긴다
    var avatar = '';
    if (role === 'company') {
      avatar =
        '<a href="employer.html" title="내페이지" class="w-9 h-9 rounded-full bg-[#002045] text-white flex items-center justify-center border-2 border-[#002045]">' +
        icon('domain', 18) +
        '</a>';
    } else if (role === 'personal') {
      avatar =
        '<a href="' + myHref + '" title="내페이지" class="relative flex items-center gap-2 group">' +
        '<img src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200" alt="내 프로필" class="w-9 h-9 rounded-full object-cover border-2 border-[#002045] group-hover:scale-105 transition-transform" />' +
        '<span class="hidden sm:inline text-xs font-bold ' +
        (active === 'assessment.html' ? 'text-[#002045]' : 'text-gray-600 group-hover:text-[#002045]') +
        '">내페이지</span>' +
        '</a>';
    }

    return (
      '<header class="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">' +
        '<a href="index.html" class="flex items-center gap-3 group shrink-0">' +
          logo('h-8 sm:h-9') +
        '</a>' +
        '<nav class="hidden md:flex items-center gap-1.5 text-sm font-medium">' + nav + '</nav>' +
        '<div class="flex items-center gap-2 sm:gap-3">' + right + avatar + '</div>' +
      '</header>' +

      // 모바일 하단 탭
      '<nav class="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200 px-2 py-1.5 flex items-center justify-around text-[11px] font-bold">' +
        list
          .map(function (t) {
            var on = t.key === active;
            return (
              '<a href="' + t.href + '" class="flex flex-col items-center gap-0.5 px-3 py-1 ' +
              (on ? 'text-[#002045]' : 'text-gray-500') +
              '">' + icon(t.icon, 20) + '<span>' + t.label + '</span></a>'
            );
          })
          .join('') +
        (loggedIn
          ? ''
          : '<a href="ls.html" class="flex flex-col items-center gap-0.5 px-3 py-1 text-gray-500">' +
            icon('lock', 20) +
            '<span>로그인</span></a>') +
      '</nav>'
    );
  }

  function footerHTML() {
    return (
      '<footer class="w-full mt-auto bg-white border-t border-gray-200 py-7 px-4 sm:px-6 lg:px-8 text-xs text-gray-600 pb-24 md:pb-7">' +
        '<div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">' +
          '<div class="flex items-center gap-3 flex-wrap justify-center md:justify-start">' +
            '<a href="index.html" class="flex items-center">' + logo('h-6') + '</a>' +
            '<span class="hidden sm:inline text-gray-300">|</span>' +
            '<span class="font-bold text-gray-800">제작 팀 : 10조 야호팀</span>' +
          '</div>' +
          '<div class="flex flex-wrap items-center justify-center gap-5 font-medium">' +
            '<button type="button" data-legal="terms" class="hover:text-[#002045] transition-colors">이용약관</button>' +
            '<button type="button" data-legal="privacy" class="hover:text-[#002045] transition-colors font-bold text-[#002045]">개인정보처리방침</button>' +
          '</div>' +
        '</div>' +
      '</footer>'
    );
  }

  var LEGAL = {
    terms: {
      title: '이용약관',
      body:
        '취R업은 공정 채용 평가 규정과 안심 소통 원칙을 준수합니다. 회원은 1인 1계정을 사용하며, ' +
        '허위 경력 기재 시 매칭 결과가 제한될 수 있습니다. 공고 정보의 최종 책임은 등록 기업에 있으며, ' +
        '취R업은 기업 안정성 지표를 참고 자료로 제공합니다.'
    },
    privacy: {
      title: '개인정보처리방침',
      body:
        '수집 항목은 이름, 연락처, 경력 및 자격 정보, 역량 진단 응답이며 매칭 목적에 한해 사용합니다. ' +
        '연락처는 0507 안심번호로 대체되어 기업에 직접 노출되지 않습니다. 회원 탈퇴 시 진단 데이터는 즉시 파기합니다.'
    }
  };

  function openLegal(kind) {
    var data = LEGAL[kind];
    if (!data) return;
    var prev = document.getElementById('legal-modal');
    if (prev) prev.remove();

    var wrap = document.createElement('div');
    wrap.id = 'legal-modal';
    wrap.className = 'fixed inset-0 z-[9998] bg-black/50 flex items-center justify-center p-4';
    wrap.innerHTML =
      '<div class="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">' +
        '<div class="flex items-center justify-between">' +
          '<h3 class="text-base font-black text-gray-900">' + data.title + '</h3>' +
          '<button type="button" data-close class="text-gray-400 hover:text-gray-700 text-xl leading-none">&times;</button>' +
        '</div>' +
        '<p class="text-xs leading-relaxed text-gray-600">' + data.body + '</p>' +
        '<button type="button" data-close class="w-full py-3 bg-[#002045] text-white rounded-2xl font-bold text-xs">확인</button>' +
      '</div>';

    wrap.addEventListener('click', function (e) {
      if (e.target === wrap || e.target.hasAttribute('data-close')) wrap.remove();
    });
    document.body.appendChild(wrap);
  }

  function mount() {
    var head = document.getElementById('app-header');
    if (head) head.outerHTML = headerHTML();

    var foot = document.getElementById('app-footer');
    if (foot) foot.outerHTML = footerHTML();

    document.addEventListener('click', function (e) {
      var legal = e.target.closest && e.target.closest('[data-legal]');
      if (legal) {
        e.preventDefault();
        openLegal(legal.getAttribute('data-legal'));
        return;
      }
      if (e.target.id === 'app-logout') {
        if (window.ChwireupAccounts) {
          window.ChwireupAccounts.signOut().then(function () {
            location.href = 'index.html';
          });
          return;
        }
        try {
          localStorage.removeItem(AUTH_KEY);
          localStorage.removeItem(NAME_KEY);
          localStorage.removeItem('chwireup-uid');
        } catch (err) {}
        location.href = 'index.html';
      }
    });
  }

  /* ── 화면 전환 ───────────────────────────────────────────────
     같은 사이트 안에서 이동할 때 흰 화면이 번쩍이지 않도록,
     나갈 때 살짝 사라졌다가 새 페이지에서 올라오게 한다.
     새 탭, 수정키 클릭, 앵커, 다운로드는 건드리지 않는다. */
  function wireTransitions() {
    document.documentElement.classList.add('page-fx');

    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      var a = e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      if (a.target && a.target !== '_self') return;
      if (a.hasAttribute('download')) return;

      var href = a.getAttribute('href');
      if (!href || href[0] === '#' || href.indexOf('javascript:') === 0) return;

      var url;
      try {
        url = new URL(href, location.href);
      } catch (err) {
        return;
      }
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;

      e.preventDefault();
      document.documentElement.classList.add('page-leaving');
      setTimeout(function () {
        location.href = url.href;
      }, 200);
    });

    // 뒤로 가기로 되돌아왔을 때 사라진 상태로 남지 않게 한다
    window.addEventListener('pageshow', function () {
      document.documentElement.classList.remove('page-leaving');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      mount();
      wireTransitions();
    });
  } else {
    mount();
    wireTransitions();
  }

  window.ChwireupAuth = {
    role: authRole,
    name: authName,
    isLoggedIn: isLoggedIn,
    login: function (role, name) {
      try {
        localStorage.setItem(AUTH_KEY, role);
        localStorage.setItem(NAME_KEY, name || '');
      } catch (e) {}
    },
    logout: function () {
      try {
        localStorage.removeItem(AUTH_KEY);
        localStorage.removeItem(NAME_KEY);
      } catch (e) {}
    }
  };
  window.ChwireupChrome = { mount: mount };
})();
