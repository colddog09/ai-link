/* ==========================================================================
   취R업 – 공통 테마 스크립트
   - localStorage에 저장된 선택을 즉시 반영해 첫 페인트에서 깜빡임을 막는다.
   - 저장된 값이 없으면 OS 설정(prefers-color-scheme)을 따른다.
   - 모든 페이지 우하단에 떠 있는 토글 버튼을 자동으로 주입한다.
   head에서 defer 없이 먼저 불러야 하며, 버튼 주입은 DOM 준비 후 실행된다.
   ========================================================================== */
(function () {
  var KEY = 'chwireup-theme';

  function stored() {
    try {
      return localStorage.getItem(KEY);
    } catch (e) {
      return null;
    }
  }

  function prefersDark() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function resolve() {
    var s = stored();
    if (s === 'dark' || s === 'light') return s;
    return prefersDark() ? 'dark' : 'light';
  }

  function apply(mode) {
    var root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.setAttribute('data-theme', mode);
    // Tailwind CDN 설정이 늦게 로드돼도 class 전략을 쓰도록 보정
    if (window.tailwind && window.tailwind.config) {
      window.tailwind.config.darkMode = 'class';
    }
    render(mode);
  }

  var SUN =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>';
  var MOON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>';

  function render(mode) {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.innerHTML = mode === 'dark' ? SUN : MOON;
    btn.setAttribute('aria-label', mode === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환');
    btn.setAttribute('title', mode === 'dark' ? '라이트 모드' : '다크 모드');
  }

  function toggle() {
    var next = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
    try {
      localStorage.setItem(KEY, next);
    } catch (e) {}
    apply(next);
  }

  function mount() {
    if (document.getElementById('theme-toggle')) return;
    var btn = document.createElement('button');
    btn.id = 'theme-toggle';
    btn.type = 'button';
    btn.addEventListener('click', toggle);
    document.body.appendChild(btn);
    render(resolve());
  }

  // 첫 페인트 전에 클래스만 먼저 적용
  apply(resolve());

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

  // OS 설정 변경 추종 (사용자가 직접 고르지 않은 경우에만)
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onChange = function () {
      if (!stored()) apply(prefersDark() ? 'dark' : 'light');
    };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  window.ChwireupTheme = { toggle: toggle, apply: apply, resolve: resolve };
})();
