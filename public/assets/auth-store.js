/* ==========================================================================
   취R업 – 계정 저장소
   Firebase Authentication으로 가입/로그인을 처리하고, 프로필과 기업 정보는
   Firestore에 남긴다. 설정이 없거나 네트워크가 막히면 데모 모드로 떨어져
   localStorage만 쓰므로 화면은 항상 동작한다.

   컬렉션 구조
     users/{uid}      { uid, email, role: 'personal', name, specialty, createdAt }
     companies/{uid}  { uid, email, role: 'company', name, bizNumber, createdAt }
     jobs/{jobId}     { ..., owner, ownerUid }   ← assets/jobs-store.js가 기록
   ========================================================================== */
(function () {
  // 설정은 assets/firebase-config.js 한 곳에서 가져온다
  var CONFIG = window.ChwireupFirebaseConfig || null;
  if (CONFIG && !CONFIG.apiKey) CONFIG = null;

  var ready = false;
  var auth = null;
  var db = null;

  function init() {
    if (ready) return ready;
    try {
      if (typeof firebase === 'undefined' || !CONFIG) return false;
      if (!firebase.apps.length) firebase.initializeApp(CONFIG);
      auth = firebase.auth ? firebase.auth() : null;
      // 공고 목록과 같은 데이터베이스를 쓴다
      db = (window.ChwireupDB && window.ChwireupDB.db()) || null;
      ready = !!auth;
      return ready;
    } catch (e) {
      console.warn('Firebase 초기화 실패, 데모 모드로 동작합니다:', e);
      return false;
    }
  }

  // 로그인은 이름과 비밀번호로 받는다. Firebase Authentication은 이메일을
  // 요구하므로 이름을 내부 주소로 바꿔 넘긴다. 사용자에게는 보이지 않는다.
  function toEmail(identifier) {
    var id = String(identifier || '').trim();
    if (!id) return '';
    if (id.indexOf('@') !== -1) return id;

    var slug = id
      .replace(/\s+/g, '')
      .toLowerCase()
      // 한글은 그대로 쓸 수 없어 코드포인트로 바꾼다
      .split('')
      .map(function (ch) {
        return /[a-z0-9._-]/.test(ch) ? ch : 'u' + ch.charCodeAt(0).toString(36);
      })
      .join('');

    return slug + '@chwireup.local';
  }

  function collectionFor(role) {
    return role === 'company' ? 'companies' : 'users';
  }

  /* 데모 모드에서 쓰는 로컬 계정부.
     Firebase가 꺼져 있어도 아이디로 로그인하면 가입 때 적은 이름이 나온다. */
  var LOCAL_KEY = 'chwireup-local-accounts';

  function localAccounts() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}') || {};
    } catch (e) {
      return {};
    }
  }
  function saveLocalAccount(userId, role, name) {
    if (!userId) return;
    try {
      var all = localAccounts();
      all[userId.toLowerCase()] = { role: role, name: name || '' };
      localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
    } catch (e) {}
  }
  function findLocalAccount(userId) {
    if (!userId) return null;
    return localAccounts()[String(userId).toLowerCase()] || null;
  }

  // 로그인 성공 후 공통 처리: 헤더가 읽는 로컬 상태를 맞춰 둔다
  function markSession(role, name, uid) {
    window.ChwireupAuth.login(role, name);
    try {
      if (uid) localStorage.setItem('chwireup-uid', uid);
    } catch (e) {}
  }

  // 프로젝트 설정이 아직 안 끝난 경우(이메일 로그인 미사용 등)에는
  // 화면이 막히지 않도록 데모 모드로 내려간다.
  var SOFT_FAIL = [
    'auth/operation-not-allowed',
    'auth/configuration-not-found',
    'auth/api-key-not-valid',
    'auth/network-request-failed',
    'auth/unauthorized-domain'
  ];
  function isSoftFail(err) {
    return err && (err.code === 'auth/timeout-local' || SOFT_FAIL.indexOf(err.code) !== -1);
  }

  // 프로젝트 설정이 잘못돼 있으면 Firebase 응답이 10초 가까이 걸릴 때가 있다.
  // 사용자를 그만큼 세워 둘 이유가 없으므로 4초에서 끊는다.
  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise(function (_, reject) {
        setTimeout(function () {
          var e = new Error('timeout');
          e.code = 'auth/timeout-local';
          reject(e);
        }, ms || 4000);
      })
    ]);
  }

  async function signUp(role, identifier, password, profile) {
    var email = toEmail(identifier);
    if (!init()) {
      saveLocalAccount(identifier, role, profile.name);
      markSession(role, profile.name, null);
      return { ok: true, mode: 'demo' };
    }

    var cred;
    try {
      cred = await withTimeout(auth.createUserWithEmailAndPassword(email, password));
    } catch (err) {
      if (!isSoftFail(err)) throw err;
      console.warn('Firebase 가입 사용 불가, 데모 모드로 진행합니다:', err.code);
      saveLocalAccount(identifier, role, profile.name);
      markSession(role, profile.name, null);
      return { ok: true, mode: 'demo', reason: err.code };
    }

    var uid = cred.user.uid;

    var doc = Object.assign(
      {
        uid: uid,
        email: email,
        role: role,
        createdAt: new Date().toISOString()
      },
      profile
    );

    // 프로필 저장은 기다리지 않는다. Firestore 응답이 늦으면 가입 자체가
    // 멈춰 버리기 때문에, 실패해도 로그인은 그대로 진행시킨다.
    if (db) {
      var note = function (e) {
        console.warn('프로필 저장 실패(규칙 확인 필요):', e);
      };
      try {
        db.collection(collectionFor(role)).doc(uid).set(doc, { merge: true }).catch(note);
        // 역할을 한 곳에서 조회할 수 있게 색인을 따로 둔다
        db.collection('accounts')
          .doc(uid)
          .set(
            {
              uid: uid,
              userId: identifier,
              email: email,
              role: role,
              name: profile.name || ''
            },
            { merge: true }
          )
          .catch(note);
      } catch (e) {
        note(e);
      }
    }

    markSession(role, profile.name, uid);
    return { ok: true, mode: 'firebase', uid: uid };
  }

  async function signIn(role, identifier, password, fallbackName) {
    var email = toEmail(identifier);
    if (!init()) {
      var local = findLocalAccount(identifier);
      markSession(local ? local.role : role, local ? local.name : fallbackName, null);
      return { ok: true, mode: 'demo', role: local ? local.role : role };
    }

    var cred;
    try {
      cred = await withTimeout(auth.signInWithEmailAndPassword(email, password));
    } catch (err) {
      if (!isSoftFail(err)) throw err;
      console.warn('Firebase 로그인 사용 불가, 데모 모드로 진행합니다:', err.code);
      var hit = findLocalAccount(identifier);
      markSession(hit ? hit.role : role, hit ? hit.name : fallbackName, null);
      return { ok: true, mode: 'demo', reason: err.code, role: hit ? hit.role : role };
    }
    var uid = cred.user.uid;
    var name = fallbackName;
    var storedRole = role;

    if (db) {
      try {
        var acc = await withTimeout(db.collection('accounts').doc(uid).get(), 2500);
        if (acc && acc.exists) {
          var data = acc.data();
          if (data.role) storedRole = data.role;
          if (data.name) name = data.name;
        }
      } catch (e) {
        console.warn('계정 정보를 읽지 못해 입력값으로 진행합니다:', e && e.code);
      }
    }

    markSession(storedRole, name, uid);
    return { ok: true, mode: 'firebase', uid: uid, role: storedRole };
  }

  async function signOut() {
    try {
      if (init() && auth.currentUser) await auth.signOut();
    } catch (e) {}
    window.ChwireupAuth.logout();
    try {
      localStorage.removeItem('chwireup-uid');
    } catch (e) {}
  }

  function uid() {
    try {
      return localStorage.getItem('chwireup-uid') || null;
    } catch (e) {
      return null;
    }
  }

  // 오류 코드를 사람이 읽는 문장으로
  function message(err) {
    var code = (err && err.code) || '';
    if (code === 'auth/email-already-in-use') return '이미 쓰이고 있는 이름입니다. 로그인으로 진행해 주세요.';
    if (code === 'auth/invalid-email') return '이름에 쓸 수 없는 문자가 있습니다.';
    if (code === 'auth/weak-password') return '비밀번호는 6자 이상으로 정해 주세요.';
    if (code === 'auth/wrong-password') return '비밀번호가 맞지 않습니다.';
    if (code === 'auth/user-not-found') return '가입되지 않은 아이디입니다.';
    // 최근 Firebase는 없는 계정과 틀린 비밀번호를 같은 코드로 돌려준다
    if (code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials')
      return '가입되지 않은 아이디이거나 비밀번호가 다릅니다. 처음이라면 회원가입부터 해주세요.';
    if (code === 'auth/too-many-requests') return '시도가 많았습니다. 잠시 후 다시 해주세요.';
    if (code === 'auth/network-request-failed') return '네트워크에 연결하지 못했습니다.';
    if (code === 'auth/operation-not-allowed')
      return 'Firebase 콘솔에서 이메일/비밀번호 로그인을 켜야 합니다.';
    return (err && err.message) || '처리 중 문제가 생겼습니다.';
  }

  function isNoAccount(err) {
    var code = (err && err.code) || '';
    return (
      code === 'auth/invalid-credential' ||
      code === 'auth/invalid-login-credentials' ||
      code === 'auth/user-not-found'
    );
  }

  window.ChwireupAccounts = {
    init: init,
    isNoAccount: isNoAccount,
    signUp: signUp,
    signIn: signIn,
    signOut: signOut,
    uid: uid,
    message: message,
    isFirebase: function () {
      return init();
    }
  };
})();
