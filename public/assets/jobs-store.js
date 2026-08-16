/* ==========================================================================
   취R업 – 기업이 직접 등록한 공고 저장소
   Firestore 연결이 없거나 실패해도 화면이 비지 않도록 localStorage를
   1차 저장소로 쓰고, Firestore가 살아 있으면 같은 문서를 함께 기록한다.
   ========================================================================== */
(function () {
  var KEY = 'chwireup-jobs';

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function write(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch (e) {}
  }

  // 로그인 세션이 복원된 다음에 실행한다
  function afterAuth(fn) {
    if (window.ChwireupAccounts && window.ChwireupAccounts.whenReady) {
      window.ChwireupAccounts.whenReady().then(fn);
    } else {
      fn();
    }
  }

  function slug(name) {
    return (
      'emp-' +
      String(name || 'job')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 24) +
      '-' +
      Math.random().toString(36).slice(2, 7)
    );
  }

  function add(job) {
    var list = read();
    var entry = Object.assign(
      {
        id: slug(job.companyName),
        matchRate: 80,
        isAiRecommended: false,
        tag: '채용중',
        imageUrl:
          'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=600',
        createdAt: new Date().toISOString(),
        source: 'employer',
        ownerUid: (window.ChwireupAccounts && window.ChwireupAccounts.uid()) || null
      },
      job
    );
    list.unshift(entry);
    write(list);

    // 목록 화면과 같은 데이터베이스에 남긴다
    afterAuth(function () {
      try {
        var db = window.ChwireupDB && window.ChwireupDB.db();
        if (!db) return;
        db.collection('jobs')
          .doc(entry.id)
          .set(entry)
          .catch(function (e) {
            console.warn('공고 저장 실패, 로컬에만 기록합니다:', e && e.code);
          });
      } catch (e) {
        console.warn('공고 저장 실패, 로컬에만 기록합니다:', e);
      }
    });

    return entry;
  }

  function remove(id) {
    var list = read().filter(function (j) {
      return j.id !== id;
    });
    write(list);
    afterAuth(function () {
      try {
        var db = window.ChwireupDB && window.ChwireupDB.db();
        if (db) db.collection('jobs').doc(id).delete();
      } catch (e) {}
    });
  }

  function norm(v) {
    return String(v || '').replace(/\s+/g, '').toLowerCase();
  }

  /* 내 공고 판정.
     uid가 같으면 무조건 내 것이고, uid가 없던 시절(데모 모드)에 올린 공고는
     기업명으로 맞춘다. 공백과 대소문자는 무시한다. */
  function byOwner(owner) {
    var uid = (window.ChwireupAccounts && window.ChwireupAccounts.uid()) || null;
    var key = norm(owner);

    return read().filter(function (j) {
      // 등록자 uid가 있으면 그것만 믿는다. 기업명이 같은 다른 계정의 공고가
      // 딸려오면 안 된다.
      if (j.ownerUid) return !!uid && j.ownerUid === uid;
      // uid 없이 올린 옛 공고는 기업명으로 맞춘다
      return !!key && (norm(j.owner) === key || norm(j.companyName) === key);
    });
  }

  function find(id) {
    var hit = null;
    read().forEach(function (j) {
      if (j.id === id) hit = j;
    });
    return hit;
  }

  window.ChwireupJobs = { list: read, add: add, remove: remove, byOwner: byOwner, find: find };
})();
