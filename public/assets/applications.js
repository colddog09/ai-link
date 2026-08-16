/* ==========================================================================
   취R업 – 지원 내역
   구직자가 지원하면 기록을 남기고, 기업은 자기 공고에 들어온 지원을 본다.
   Firestore가 연결돼 있으면 서버에, 아니면 이 브라우저에 저장한다.

   applications/{id}
     { id, jobId, jobTitle, companyName, ownerUid, owner,
       applicantUid, applicantName, applicantYears, coverNote,
       status, createdAt }
   ========================================================================== */
(function () {
  var KEY = 'chwireup-applications';

  function readLocal() {
    try {
      var raw = localStorage.getItem(KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function writeLocal(list) {
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

  function db() {
    return (window.ChwireupDB && window.ChwireupDB.db()) || null;
  }

  function uid() {
    return (window.ChwireupAccounts && window.ChwireupAccounts.uid()) || null;
  }

  function myName() {
    return (window.ChwireupAuth && window.ChwireupAuth.name()) || '구직자';
  }

  /* 지원하기. 같은 공고에 두 번 지원하지 않도록 먼저 확인한다. */
  function apply(job, coverNote) {
    var profile = (window.ChwireupProfile && window.ChwireupProfile.read()) || {};
    var already = readLocal().filter(function (a) {
      return a.jobId === job.id;
    })[0];
    if (already) return already;

    var entry = {
      id: 'app-' + job.id + '-' + Math.random().toString(36).slice(2, 8),
      jobId: job.id,
      jobTitle: job.title || '',
      companyName: job.companyName || '',
      ownerUid: job.ownerUid || null,
      owner: job.owner || job.companyName || '',
      applicantUid: uid(),
      applicantName: myName(),
      applicantYears: Number(profile.years) || 0,
      applicantSpecialty: (profile.careers && profile.careers.length && profile.careers[0].field) || '',
      coverNote: coverNote || '',
      status: '접수됨',
      createdAt: new Date().toISOString()
    };

    var list = readLocal();
    list.unshift(entry);
    writeLocal(list);

    afterAuth(function () {
      var d = db();
      if (!d) return;
      d.collection('applications')
        .doc(entry.id)
        .set(entry)
        .catch(function (e) {
          console.warn('지원 내역 저장 실패:', e && e.code);
        });
    });

    return entry;
  }

  function myApplications() {
    return readLocal();
  }

  function hasApplied(jobId) {
    return readLocal().some(function (a) {
      return a.jobId === jobId;
    });
  }

  /* 기업이 받은 지원 목록.
     로컬에 있는 것부터 먼저 보여주고, 세션이 복원되면 서버 구독을 붙인다. */
  function watchForEmployer(ownerName, onChange) {
    var myUid = uid();

    var local = readLocal().filter(function (a) {
      if (myUid && a.ownerUid) return a.ownerUid === myUid;
      return a.owner === ownerName || a.companyName === ownerName;
    });
    onChange(local);

    var unsub = function () {};

    afterAuth(function () {
      var d = db();
      if (!d) return;

      var currentUid = uid();
      var query = currentUid
        ? d.collection('applications').where('ownerUid', '==', currentUid)
        : d.collection('applications').where('owner', '==', ownerName);

      unsub = query.onSnapshot(
        function (snap) {
          var remote = snap.docs.map(function (doc) {
            return doc.data();
          });
          var seen = {};
          var merged = [];
          remote.concat(local).forEach(function (a) {
            if (!a || !a.id || seen[a.id]) return;
            seen[a.id] = true;
            merged.push(a);
          });
          onChange(merged);
        },
        function (err) {
          console.warn('지원자 목록을 불러오지 못했습니다:', err && err.code);
        }
      );
    });

    return function () {
      unsub();
    };
  }

  function setStatus(applicationId, status) {
    var list = readLocal().map(function (a) {
      if (a.id === applicationId) a.status = status;
      return a;
    });
    writeLocal(list);

    afterAuth(function () {
      var d = db();
      if (!d) return;
      d.collection('applications')
        .doc(applicationId)
        .set({ status: status }, { merge: true })
        .catch(function (e) {
          console.warn('상태 변경 실패:', e && e.code);
        });
    });
  }

  window.ChwireupApplications = {
    apply: apply,
    hasApplied: hasApplied,
    mine: myApplications,
    watchForEmployer: watchForEmployer,
    setStatus: setStatus
  };
})();
