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
     연차가 길수록, 분야가 뚜렷할수록, 자격이 많을수록 올라간다.
     한 축이라도 근거가 없으면 기본치에 머문다. */
  function scores(profile) {
    var p = profile || read() || {};
    var years = Math.max(0, Number(p.years) || 0);
    var certs = (p.certifications || []).length;
    var careers = p.careers || [];

    // 연차 점수: 15년에서 대체로 포화한다
    var yearScore = Math.min(1, years / 15);

    // 분야 가중치는 경력 항목의 평균으로 본다
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
        acc[k] = base[k];
      });
      n = 1;
    }

    var certBoost = Math.min(0.12, certs * 0.03);

    function mix(weight, floor) {
      var v = floor + (weight / n) * 34 * (0.55 + 0.45 * yearScore) + certBoost * 100 * 0.35;
      return Math.max(40, Math.min(99, Math.round(v)));
    }

    var out = {
      clinical: mix(acc.clinical, 52),
      governance: mix(acc.governance, 50),
      leadership: mix(acc.leadership, 48),
      communication: mix(acc.communication, 50)
    };

    out.overall = Math.round(
      (out.clinical * 0.35 + out.governance * 0.25 + out.leadership * 0.2 + out.communication * 0.2) * 10
    ) / 10;

    // 상위 몇 퍼센트인지 대략적인 위치. 종합 점수를 눌러 담는다.
    out.percentile = Math.max(0.5, Math.round((100 - out.overall) * 0.9 * 10) / 10);

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
