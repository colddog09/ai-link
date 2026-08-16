/* ==========================================================================
   취R업 – Firestore 연결 한 곳으로 모으기
   페이지마다 따로 초기화하면 어떤 곳은 이름 있는 데이터베이스를, 어떤 곳은
   기본 데이터베이스를 잡아 서로 다른 저장소를 보게 된다. 실제로 기업이 올린
   공고가 목록에 안 뜨는 원인이었다. 여기서 하나만 만들어 모두가 공유한다.
   ========================================================================== */
(function () {
  var CONFIG = {
    apiKey: 'AIzaSyCrW6HXGjVbyk_0k9SKRHSRs629ol0dnYo',
    authDomain: 'gen-lang-client-0529162863.firebaseapp.com',
    projectId: 'gen-lang-client-0529162863',
    storageBucket: 'gen-lang-client-0529162863.firebasestorage.app',
    messagingSenderId: '819805526031',
    appId: '1:819805526031:web:4adae67390cd8f3b162b7a'
  };

  // AI Studio가 만들어 둔 데이터베이스 이름. 없으면 기본 데이터베이스를 쓴다.
  var NAMED_DB = 'ai-studio-ailink-99cc2c84-f5b6-4b68-ab80-c06409b6e80f';

  var cached = null;

  function app() {
    if (typeof firebase === 'undefined') return null;
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
      cached = a.firestore(NAMED_DB);
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
