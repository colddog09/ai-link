/* ==========================================================================
   취R업 – Firestore 연결 한 곳으로 모으기
   페이지마다 따로 초기화하면 어떤 곳은 이름 있는 데이터베이스를, 어떤 곳은
   기본 데이터베이스를 잡아 서로 다른 저장소를 보게 된다. 실제로 기업이 올린
   공고가 목록에 안 뜨는 원인이었다. 여기서 하나만 만들어 모두가 공유한다.
   ========================================================================== */
(function () {
  // 설정은 assets/firebase-config.js 한 곳에서 가져온다
  var CONFIG = window.ChwireupFirebaseConfig || null;
  // 키가 비어 있으면 설정 전이라고 보고 연결하지 않는다
  if (CONFIG && !CONFIG.apiKey) CONFIG = null;
  var NAMED_DB = window.ChwireupDatabaseId || '';

  var cached = null;

  function app() {
    if (typeof firebase === 'undefined' || !CONFIG) return null;
    try {
      if (!firebase.apps.length) firebase.initializeApp(CONFIG);
      return firebase.app();
    } catch (e) {
      console.warn('Firebase 초기화 실패:', e);
      return null;
    }
  }

  function db() {
    // 성공했을 때만 기억한다. SDK가 늦게 붙는 페이지에서 null을 붙잡고 있으면
    // 이후 호출이 전부 실패한다.
    if (cached) return cached;

    var a = app();
    if (!a || !firebase.firestore) return null;

    try {
      // 이름을 지정하지 않았으면 기본 데이터베이스를 쓴다
      cached = NAMED_DB ? a.firestore(NAMED_DB) : firebase.firestore();
    } catch (e) {
      try {
        cached = firebase.firestore();
      } catch (e2) {
        console.warn('Firestore 연결 실패:', e2);
        cached = null;
      }
    }
    return cached;
  }

  window.ChwireupDB = { app: app, db: db, config: CONFIG };
})();
