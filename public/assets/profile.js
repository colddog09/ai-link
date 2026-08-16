/* ==========================================================================
   취R업 – 구직자 프로필과 매칭 계산
   진단 화면에서 입력한 값을 하나의 프로필로 모으고, 그 프로필로 역량 점수와
   공고별 매칭률을 계산한다. 계산 규칙을 한 곳에 두어 진단 결과와 공고 목록이
   같은 근거를 쓰게 한다.
   ========================================================================== */
(function () {
  var KEY = 'chwireup-profile';

  /* 경력 분야별 가중치.
     같은 연차라도 어떤 일을 해왔는지에 따라 강점이 다르다고 본다. */
  var FIELD_WEIGHTS = {
    medical: { clinical: 1.0, governance: 0.7, leadership: 0.8, communication: 0.7 },
    healthcare: { clinical: 0.7, governance: 0.9, leadership: 0.8, communication: 0.9 },
    qi: { clinical: 0.8, governance: 1.0, leadership: 0.7, communication: 0.8 },
    biotech: { clinical: 0.9, governance: 0.8, leadership: 0.7, communication: 0.7 },
    other: { clinical: 0.6, governance: 0.7, leadership: 0.7, communication: 0.8 }
  };

  var FIELD_KEYWORDS = {
    medical: ['전문의', '임상', '내과', '외과', '진료', '병원', '검진', '응급'],
    healthcare: ['디지털', '헬스케어', 'AI', '솔루션', '데이터', '플랫폼'],
    qi: ['질 관리', 'QI', '감염', '표준', '규제', '인허가', '감사'],
    biotech: ['임상시험', '바이오', '신약', '연구', '개발'],
    other: []
  };

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function save(profile) {
    try {
      localStorage.setItem(KEY, JSON.stringify(profile));
    } catch (e) {}

    // 로그인돼 있으면 서버에도 남긴다. 실패해도 화면은 그대로 진행한다.
    var write = function () {
      var db = window.ChwireupDB && window.ChwireupDB.db();
      var uid = window.ChwireupAccounts && window.ChwireupAccounts.uid();
      if (db && uid) {
        db.collection('users')
          .doc(uid)
          .set({ profile: profile, updatedAt: new Date().toISOString() }, { merge: true })
          .catch(function (e) {
            console.warn('프로필 저장 실패:', e && e.code);
          });
      }
    };

    if (window.ChwireupAccounts && window.ChwireupAccounts.whenReady) {
      window.ChwireupAccounts.whenReady().then(write);
    } else {
      try {
        write();
      } catch (e) {}
    }

    return profile;
  }

  /* ── 역량 점수 ────────────────────────────────────────────
     입력을 바꾸면 눈에 띄게 움직이되, 하한을 80점으로 둔다.
     축마다 0~1 신호를 만들어 80~99 구간에 펼친다.
       분야 40% · 연차 25% · 경력 폭 15% · 자격 20%
     여기에 근무 형태와 통근 범위를 가산점으로 얹는다. */
  var FLOOR = 80;
  var SPAN = 19;

  function scores(profile) {
    var p = profile || read() || {};
    var careers = p.isNewcomer ? [] : p.careers || [];
    var years = p.isNewcomer ? 0 : Math.max(0, Number(p.years) || 0);
    var certs = (p.certifications || []).length;

    var yearScore = Math.min(1, years / 15);
    var breadth = Math.min(1, careers.length / 3);
    var certScore = Math.min(1, certs / 8);

    // 경력 항목들의 분야 가중치를 축별로 평균낸다
    var acc = { clinical: 0, governance: 0, leadership: 0, communication: 0 };
    var n = 0;
    careers.forEach(function (c) {
      var w = FIELD_WEIGHTS[c.field] || FIELD_WEIGHTS.other;
      Object.keys(acc).forEach(function (k) {
        acc[k] += w[k];
      });
      n++;
    });
    if (!n) {
      var base = FIELD_WEIGHTS.other;
      Object.keys(acc).forEach(function (k) {
        acc[k] = base[k] * 0.75;
      });
      n = 1;
    }

    // 근무 형태에 따라 강조되는 축이 다르다
    var bonus = { clinical: 0, governance: 0, leadership: 0, communication: 0 };
    if (p.workstyle === 'fulltime') {
      bonus.leadership = 3;
      bonus.governance = 2;
    } else if (p.workstyle === 'flexible') {
      bonus.communication = 3;
      bonus.leadership = 1;
    } else if (p.workstyle === 'consulting') {
      bonus.clinical = 3;
      bonus.communication = 2;
    }

    // 통근을 넓게 잡을수록 협업 범위가 넓다고 본다
    var commute = Math.min(3, Number(p.commute) || 0);
    bonus.leadership += commute;
    bonus.communication += commute;

    function axis(fieldWeight, extra) {
      var signal =
        0.4 * (fieldWeight / n) + 0.25 * yearScore + 0.15 * breadth + 0.2 * certScore;
      return Math.max(FLOOR, Math.min(99, Math.round(FLOOR + signal * SPAN + extra)));
    }

    var out = {
      clinical: axis(acc.clinical, bonus.clinical),
      governance: axis(acc.governance, bonus.governance),
      leadership: axis(acc.leadership, bonus.leadership),
      communication: axis(acc.communication, bonus.communication)
    };

    out.overall =
      Math.round(
        (out.clinical * 0.35 + out.governance * 0.25 + out.leadership * 0.2 + out.communication * 0.2) * 10
      ) / 10;

    // 종합 점수가 높을수록 상위 비율이 작아진다
    out.percentile = Math.max(0.8, Math.round((100 - out.overall) * 2.4 * 10) / 10);

    return out;
  }

  /* ── 공고별 매칭률 ────────────────────────────────────────
     지역, 연봉, 경력, 분야 네 축을 각각 채점해 합친다. */
  function parseSalaryFloor(range) {
    if (!range) return 0;
    var eok = String(range).match(/([\d.]+)\s*억/);
    if (eok) return Math.round(parseFloat(eok[1]) * 10000);
    var man = String(range).replace(/,/g, '').match(/(\d+)\s*만/);
    if (man) return parseInt(man[1], 10);
    return 0;
  }

  function requiredYears(text) {
    var m = String(text || '').match(/(\d+)\s*년/);
    return m ? parseInt(m[1], 10) : 0;
  }

  function matchRate(job, profile) {
    var p = profile || read();
    if (!p) return null; // 진단 전에는 계산하지 않는다

    var score = 0;

    // 1) 지역 (30점)
    var wanted = String(p.region || '').split(' ')[0];
    if (!wanted || wanted === '전국') {
      score += 24;
    } else if (String(job.location || '').indexOf(wanted) !== -1) {
      score += 30;
    } else {
      score += 8;
    }

    // 2) 연봉 (25점)
    var floor = parseSalaryFloor(job.salaryRange);
    var want = Number(p.salaryMin) || 0;
    if (!want || !floor) {
      score += 18;
    } else if (floor >= want) {
      score += 25;
    } else if (floor >= want * 0.85) {
      score += 18;
    } else {
      score += 9;
    }

    // 3) 경력 (25점)
    var need = requiredYears(job.experience);
    var have = Number(p.years) || 0;
    if (!need) {
      score += 22;
    } else if (have >= need) {
      score += 25;
    } else if (have >= need - 3) {
      score += 16;
    } else {
      score += 8;
    }

    // 4) 분야 (20점) – 경력 분야 키워드가 공고에 얼마나 걸리는지
    var haystack = [job.title, job.specialty, job.companyName].join(' ');
    var hit = 0;
    (p.careers || []).forEach(function (c) {
      (FIELD_KEYWORDS[c.field] || []).forEach(function (k) {
        if (haystack.indexOf(k) !== -1) hit++;
      });
    });
    score += Math.min(20, 8 + hit * 4);

    return Math.max(40, Math.min(99, Math.round(score)));
  }

  window.ChwireupProfile = {
    read: read,
    save: save,
    scores: scores,
    matchRate: matchRate,
    parseSalaryFloor: parseSalaryFloor
  };
})();
