/* ==========================================================================
   취R업 – 시연 영상 녹화
   배포된 사이트를 실제로 조작하며 2분 이내 분량으로 녹화한다.

   실행: node scripts/demo-video.mjs
   결과: recordings/ 아래에 webm, 이어서 demo.mp4로 변환
   ========================================================================== */
import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'node:fs';

const SITE = process.env.DEMO_SITE || 'https://ai-link-orcin.vercel.app';
const OUT = 'recordings';

// 사람이 읽을 시간을 준다. 너무 짧으면 화면이 튀어 보인다.
const beat = (ms) => new Promise((r) => setTimeout(r, ms));

/* 화면 위에 잠깐 뜨는 자막. 각 장면이 무엇인지 알려준다. */
async function caption(page, text, ms = 2600) {
  await page.evaluate((t) => {
    const prev = document.getElementById('demo-caption');
    if (prev) prev.remove();

    const box = document.createElement('div');
    box.id = 'demo-caption';
    box.textContent = t;
    Object.assign(box.style, {
      position: 'fixed',
      left: '50%',
      bottom: '40px',
      transform: 'translateX(-50%)',
      zIndex: '99999',
      background: 'rgba(10, 31, 61, 0.94)',
      color: '#fff',
      padding: '14px 26px',
      borderRadius: '999px',
      fontSize: '17px',
      fontWeight: '700',
      letterSpacing: '-0.01em',
      fontFamily: 'Pretendard, -apple-system, sans-serif',
      boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
      opacity: '0',
      transition: 'opacity .35s ease'
    });
    document.body.appendChild(box);
    requestAnimationFrame(() => (box.style.opacity = '1'));
  }, text);

  await beat(ms);
  await page.evaluate(() => {
    const box = document.getElementById('demo-caption');
    if (box) {
      box.style.opacity = '0';
      setTimeout(() => box.remove(), 400);
    }
  });
  await beat(400);
}

// 천천히 스크롤해 화면이 어떻게 이어지는지 보여준다
async function glide(page, distance, steps = 26) {
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, distance / steps);
    await beat(45);
  }
}

async function main() {
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: OUT, size: { width: 1280, height: 800 } },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();

  const stamp = Date.now().toString().slice(-5);
  const seeker = 'demo' + stamp;
  const employer = 'corp' + stamp;

  /* ── 1. 홈 ─────────────────────────────────────────────── */
  await page.goto(SITE + '/', { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await beat(1200);

  await caption(page, 'AI가 일자리를 대체하는 시대, 사람에게 남은 자리를 찾는 서비스', 3000);
  await glide(page, 1500);
  await beat(600);
  await glide(page, 1800);
  await beat(500);

  /* ── 2. 비로그인 채용공고 ───────────────────────────────── */
  await page.goto(SITE + '/company', { waitUntil: 'load' });
  await beat(2600); // 진입 로딩 화면
  await caption(page, '로그인 전에는 매칭률이 가려집니다', 2600);
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) =>
      b.innerText.includes('로그인 없이 둘러보기')
    );
    if (btn) btn.click();
  });
  await beat(900);
  await glide(page, 900);
  await beat(600);

  /* ── 3. 회원가입 ────────────────────────────────────────── */
  await page.goto(SITE + '/ls', { waitUntil: 'load' });
  await beat(900);
  await caption(page, '개인 회원 가입 · 아이디와 희망 지역을 받습니다', 2600);

  await page.click('#tab-signup');
  await beat(500);
  await page.fill('#userid', seeker);
  await beat(300);
  await page.fill('#name', '김구직');
  await beat(300);
  await page.fill('#password', seeker + '1234');
  await page.fill('#confirm', seeker + '1234');
  await page.fill('#extra', '내과 전문의');
  await beat(400);
  await page.selectOption('#region-sido', '서울');
  await beat(600);
  await page.click('#cta');
  await page.waitForURL('**/assessment', { timeout: 20000 });
  await beat(1200);

  /* ── 4. AI 역량 진단 ────────────────────────────────────── */
  await caption(page, '경력과 근무 조건을 입력하면 AI가 역량을 분석합니다', 2800);
  await page.evaluate(() => navigateTo('screen-work-condition'));
  await beat(1400);
  await page.evaluate(() => {
    const el = document.getElementById('min-salary');
    if (el) el.value = '14000';
  });
  await beat(800);
  await page.evaluate(() => navigateTo('screen-experience'));
  await beat(1600);

  await page.evaluate(() => startAnalysis());
  await beat(3400); // 분석 중 화면
  await beat(1800); // 결과 표시
  await caption(page, '입력값으로 실제 계산된 역량 점수', 2600);
  await glide(page, 700);
  await beat(800);

  /* ── 5. 맞춤 추천 목록 ──────────────────────────────────── */
  await page.goto(SITE + '/company', { waitUntil: 'load' });
  await beat(2600);
  await caption(page, '경력과 지역에 맞춰 매칭률이 다시 계산됩니다', 2800);
  await glide(page, 800);
  await beat(700);

  /* ── 6. 기업 상세와 지원 ────────────────────────────────── */
  await page.goto(SITE + '/detail?jobId=snuh-senior-medical-consultant', { waitUntil: 'load' });
  await beat(1400);
  await caption(page, '기업 안정성 지표를 확인하고 바로 지원합니다', 2600);
  await glide(page, 900);
  await beat(600);

  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === '지원하기');
    if (btn) btn.click();
  });
  await beat(1200);
  await page.evaluate(() => {
    const note = document.querySelector('textarea');
    if (note) {
      note.value = '흉부외과 15년 경력으로 지원합니다.';
      note.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await beat(900);
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === '지원서 제출');
    if (btn) btn.click();
  });
  await beat(1600);

  /* ── 7. 기업 회원 ───────────────────────────────────────── */
  await page.goto(SITE + '/ls', { waitUntil: 'load' });
  await page.evaluate(() => {
    localStorage.removeItem('chwireup-auth');
    localStorage.removeItem('chwireup-auth-name');
    localStorage.removeItem('chwireup-uid');
  });
  await page.reload({ waitUntil: 'load' });
  await beat(700);

  await caption(page, '기업은 같은 자리에서 공고를 올리고 지원자를 봅니다', 2800);
  await page.click('#tab-signup');
  await page.click('[data-role="company"]');
  await beat(500);
  await page.fill('#userid', employer);
  await page.fill('#name', '서울대학교병원');
  await page.fill('#password', employer + '1234');
  await page.fill('#confirm', employer + '1234');
  await beat(500);
  await page.click('#cta');
  await page.waitForURL('**/employer', { timeout: 20000 });
  await beat(1200);

  await page.fill('#f-title', '시니어 의료 컨설턴트');
  await beat(250);
  await page.fill('#f-location', '서울 종로구');
  await beat(250);
  await page.fill('#f-exp', '경력 10년↑');
  await page.fill('#f-salary', '1.5억 ~ 1.8억');
  await page.fill('#f-deadline', '마감 D-30');
  await beat(600);
  await page.evaluate(() => {
    document.getElementById('job-form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  });
  await beat(1800);
  await caption(page, '등록한 공고와 지원자 현황을 한 화면에서 관리합니다', 2800);
  await beat(800);

  /* ── 8. 마무리 ──────────────────────────────────────────── */
  await page.goto(SITE + '/', { waitUntil: 'load' });
  await beat(900);
  await caption(page, '취R업 · 제작 10조 야호팀', 3000);
  await beat(600);

  await context.close();
  await browser.close();
  console.log('녹화 완료:', OUT);
}

main().catch((e) => {
  console.error('녹화 실패:', e);
  process.exit(1);
});
