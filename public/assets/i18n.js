/* ==========================================================================
   취R업 – 언어 전환
   내페이지(프로필)에서 고른 언어를 모든 페이지에 적용한다.
   한국어 원문을 기준으로 텍스트 노드를 치환하며, React가 다시 그리는
   화면도 MutationObserver로 따라간다.

   지원 언어 10개
     ko 한국어 · en English · ja 日本語 · zh 中文(简体) · fr Français
     es Español · de Deutsch · vi Tiếng Việt · ru Русский · ar العربية
   ========================================================================== */
(function () {
  var KEY = 'chwireup-lang';

  var LANGS = [
    { code: 'ko', label: '한국어', note: '원문' },
    { code: 'en', label: 'English', note: 'English' },
    { code: 'ja', label: '日本語', note: 'Japanese' },
    { code: 'zh', label: '中文 (简体)', note: 'Chinese, Simplified' },
    { code: 'fr', label: 'Français', note: 'French' },
    { code: 'es', label: 'Español', note: 'Spanish' },
    { code: 'de', label: 'Deutsch', note: 'German' },
    { code: 'vi', label: 'Tiếng Việt', note: 'Vietnamese' },
    { code: 'ru', label: 'Русский', note: 'Russian' },
    { code: 'ar', label: 'العربية', note: 'Arabic · 오른쪽에서 왼쪽' }
  ];

  var RTL = { ar: true };

  /* 번역 표.
     행 = 한국어 원문, 열 순서 = en, ja, zh, fr, es, de, vi, ru, ar */
  var ORDER = ['en', 'ja', 'zh', 'fr', 'es', 'de', 'vi', 'ru', 'ar'];

  var TABLE = {
    // ── 공통 · 내비게이션 ────────────────────────────────────
    '홈': ['Home', 'ホーム', '首页', 'Accueil', 'Inicio', 'Start', 'Trang chủ', 'Главная', 'الرئيسية'],
    '채용공고': ['Jobs', '求人', '招聘信息', 'Offres', 'Empleos', 'Stellen', 'Việc làm', 'Вакансии', 'الوظائف'],
    '내페이지': ['My page', 'マイページ', '我的页面', 'Mon espace', 'Mi cuenta', 'Mein Bereich', 'Trang của tôi', 'Мой профиль', 'صفحتي'],
    '로그인': ['Sign in', 'ログイン', '登录', 'Connexion', 'Iniciar sesión', 'Anmelden', 'Đăng nhập', 'Войти', 'تسجيل الدخول'],
    '로그아웃': ['Sign out', 'ログアウト', '退出', 'Déconnexion', 'Cerrar sesión', 'Abmelden', 'Đăng xuất', 'Выйти', 'تسجيل الخروج'],
    '회원가입': ['Create account', '新規登録', '注册', 'Créer un compte', 'Crear cuenta', 'Konto erstellen', 'Đăng ký', 'Регистрация', 'إنشاء حساب'],
    '로그인 / 회원가입': ['Sign in / Join', 'ログイン / 登録', '登录 / 注册', 'Connexion / Inscription', 'Entrar / Registrarse', 'Anmelden / Registrieren', 'Đăng nhập / Đăng ký', 'Вход / Регистрация', 'دخول / تسجيل'],
    '개인 회원': ['Individual', '個人会員', '个人会员', 'Particulier', 'Persona', 'Privatperson', 'Cá nhân', 'Соискатель', 'فرد'],
    '기업 회원': ['Employer', '企業会員', '企业会员', 'Entreprise', 'Empresa', 'Unternehmen', 'Doanh nghiệp', 'Работодатель', 'شركة'],
    '이용약관': ['Terms of use', '利用規約', '使用条款', "Conditions d'utilisation", 'Términos de uso', 'Nutzungsbedingungen', 'Điều khoản sử dụng', 'Условия использования', 'شروط الاستخدام'],
    '개인정보처리방침': ['Privacy policy', 'プライバシーポリシー', '隐私政策', 'Confidentialité', 'Privacidad', 'Datenschutz', 'Chính sách riêng tư', 'Политика конфиденциальности', 'سياسة الخصوصية'],
    '제작 팀 : 10조 야호팀': ['Built by Team 10 · Yaho', '制作 : 第10チーム Yaho', '制作团队 : 第10组 Yaho', 'Réalisé par Équipe 10 · Yaho', 'Hecho por Equipo 10 · Yaho', 'Erstellt von Team 10 · Yaho', 'Thực hiện bởi Nhóm 10 · Yaho', 'Команда 10 · Yaho', 'من إعداد الفريق 10 · ياهو'],
    '확인': ['OK', '確認', '确定', 'OK', 'Aceptar', 'OK', 'Xác nhận', 'ОК', 'حسناً'],
    '닫기': ['Close', '閉じる', '关闭', 'Fermer', 'Cerrar', 'Schließen', 'Đóng', 'Закрыть', 'إغلاق'],
    '초기화': ['Reset', 'リセット', '重置', 'Réinitialiser', 'Restablecer', 'Zurücksetzen', 'Đặt lại', 'Сбросить', 'إعادة ضبط'],
    '삭제': ['Delete', '削除', '删除', 'Supprimer', 'Eliminar', 'Löschen', 'Xóa', 'Удалить', 'حذف'],
    '언어': ['Language', '言語', '语言', 'Langue', 'Idioma', 'Sprache', 'Ngôn ngữ', 'Язык', 'اللغة'],
    '내 프로필': ['My profile', 'マイプロフィール', '我的资料', 'Mon profil', 'Mi perfil', 'Mein Profil', 'Hồ sơ của tôi', 'Мой профиль', 'ملفي'],
    '전문직 안심 채용': ['Verified hiring for professionals', '専門職の安心採用', '专业人才安心招聘', 'Recrutement vérifié', 'Contratación verificada', 'Geprüfte Vermittlung', 'Tuyển dụng đã thẩm định', 'Проверенные вакансии', 'توظيف موثوق'],

    // ── 홈 ─────────────────────────────────────────────────
    '의료 · 금융 · IT 전문직': ['Healthcare · Finance · IT', '医療・金融・IT専門職', '医疗 · 金融 · IT 专业人才', 'Santé · Finance · IT', 'Salud · Finanzas · TI', 'Medizin · Finanzen · IT', 'Y tế · Tài chính · CNTT', 'Медицина · Финансы · ИТ', 'الطب · المال · التقنية'],
    '공고 보기': ['Browse jobs', '求人を見る', '查看职位', 'Voir les offres', 'Ver empleos', 'Stellen ansehen', 'Xem việc làm', 'Смотреть вакансии', 'تصفح الوظائف'],
    '내 조건 입력하기': ['Enter my criteria', '希望条件を入力', '填写我的条件', 'Saisir mes critères', 'Indicar mis criterios', 'Kriterien angeben', 'Nhập điều kiện', 'Указать условия', 'أدخل شروطي'],
    '이용 후기': ['Member story', '利用者の声', '用户评价', 'Témoignage', 'Testimonio', 'Erfahrungsbericht', 'Cảm nhận', 'Отзыв', 'تجربة عضو'],
    '오늘의 매칭': ["Today's matches", '本日のマッチング', '今日匹配', 'Correspondances du jour', 'Coincidencias de hoy', 'Treffer heute', 'Kết quả hôm nay', 'Совпадения дня', 'مطابقات اليوم'],
    '입력한 조건과 맞는 자리': ['Roles that fit your criteria', '条件に合うポジション', '符合条件的职位', 'Postes correspondant à vos critères', 'Puestos que encajan', 'Passende Positionen', 'Vị trí phù hợp', 'Подходящие позиции', 'وظائف تناسب شروطك'],
    '전체 공고': ['All jobs', 'すべての求人', '全部职位', 'Toutes les offres', 'Todos los empleos', 'Alle Stellen', 'Tất cả việc làm', 'Все вакансии', 'كل الوظائف'],
    '예상 연봉': ['Expected pay', '想定年収', '预计年薪', 'Rémunération estimée', 'Salario estimado', 'Erwartetes Gehalt', 'Lương dự kiến', 'Ожидаемая зарплата', 'الراتب المتوقع'],
    '지원까지': ['How it works', '応募までの流れ', '申请流程', 'Comment ça marche', 'Cómo funciona', 'So läuft es', 'Cách hoạt động', 'Как это работает', 'كيف تتقدم'],
    'AI 역량 분석': ['AI skills analysis', 'AI能力分析', 'AI 能力分析', 'Analyse IA des compétences', 'Análisis de competencias con IA', 'KI-Kompetenzanalyse', 'Phân tích năng lực bằng AI', 'ИИ-анализ компетенций', 'تحليل المهارات بالذكاء الاصطناعي'],
    '스마트 매칭': ['Smart matching', 'スマートマッチング', '智能匹配', 'Mise en relation intelligente', 'Emparejamiento inteligente', 'Intelligentes Matching', 'Ghép nối thông minh', 'Умный подбор', 'مطابقة ذكية'],
    '데이터 시각화': ['Data visualization', 'データの可視化', '数据可视化', 'Visualisation des données', 'Visualización de datos', 'Datenvisualisierung', 'Trực quan hóa dữ liệu', 'Визуализация данных', 'عرض البيانات'],
    '직접 소통 채널': ['Direct messaging', '直接連絡チャネル', '直接沟通渠道', 'Contact direct', 'Contacto directo', 'Direkter Kontakt', 'Kênh liên hệ trực tiếp', 'Прямая связь', 'قناة تواصل مباشرة'],

    // ── 채용공고 ────────────────────────────────────────────
    '직접 설정': ['Filters', '条件を設定', '自定义筛选', 'Filtres', 'Filtros', 'Filter', 'Bộ lọc', 'Фильтры', 'عوامل التصفية'],
    '필터 직접 설정': ['Set filters', '条件を設定する', '设置筛选条件', 'Définir les filtres', 'Configurar filtros', 'Filter einstellen', 'Thiết lập bộ lọc', 'Настроить фильтры', 'ضبط عوامل التصفية'],
    '필터 해제': ['Clear filters', '条件を解除', '清除筛选', 'Effacer les filtres', 'Quitar filtros', 'Filter löschen', 'Xóa bộ lọc', 'Сбросить фильтры', 'مسح التصفية'],
    '지역': ['Location', '地域', '地区', 'Lieu', 'Ubicación', 'Ort', 'Khu vực', 'Регион', 'الموقع'],
    '희망 연봉': ['Target salary', '希望年収', '期望年薪', 'Salaire souhaité', 'Salario deseado', 'Wunschgehalt', 'Mức lương mong muốn', 'Желаемая зарплата', 'الراتب المطلوب'],
    '검색어': ['Keyword', 'キーワード', '关键词', 'Mot-clé', 'Palabra clave', 'Stichwort', 'Từ khóa', 'Ключевое слово', 'كلمة البحث'],
    '추천순': ['Recommended', 'おすすめ順', '推荐排序', 'Recommandés', 'Recomendados', 'Empfohlen', 'Đề xuất', 'По рекомендации', 'الأنسب'],
    '매칭률순': ['Match rate', 'マッチ率順', '匹配度排序', 'Taux de correspondance', 'Nivel de coincidencia', 'Trefferquote', 'Độ phù hợp', 'По совпадению', 'نسبة التطابق'],
    '연봉순': ['Salary', '年収順', '薪资排序', 'Salaire', 'Salario', 'Gehalt', 'Mức lương', 'По зарплате', 'الراتب'],
    '최신 등록순': ['Newest', '新着順', '最新发布', 'Plus récentes', 'Más recientes', 'Neueste', 'Mới nhất', 'Сначала новые', 'الأحدث'],
    'AI 추천': ['AI pick', 'AIおすすめ', 'AI 推荐', 'Choix IA', 'Elección IA', 'KI-Tipp', 'AI đề xuất', 'Выбор ИИ', 'اختيار الذكاء'],
    '채용중': ['Open', '募集中', '招聘中', 'Ouvert', 'Abierto', 'Offen', 'Đang tuyển', 'Открыта', 'متاحة'],
    '매칭률': ['Match', 'マッチ率', '匹配度', 'Correspondance', 'Coincidencia', 'Übereinstimmung', 'Độ phù hợp', 'Совпадение', 'التطابق'],
    '상시 채용': ['Always hiring', '通年採用', '长期招聘', 'Recrutement continu', 'Contratación continua', 'Laufend', 'Tuyển liên tục', 'Постоянный набор', 'توظيف مستمر'],
    '경력 무관': ['Any experience', '経験不問', '经验不限', 'Sans condition', 'Sin experiencia mínima', 'Ohne Vorgabe', 'Không yêu cầu', 'Опыт не важен', 'دون شرط خبرة'],
    '채용공고로 돌아가기': ['Back to jobs', '求人一覧に戻る', '返回招聘列表', 'Retour aux offres', 'Volver a empleos', 'Zurück zu den Stellen', 'Quay lại việc làm', 'Назад к вакансиям', 'العودة للوظائف'],
    '로그인하고 맞춤 추천 받기': ['Sign in for tailored picks', 'ログインしておすすめを受け取る', '登录获取专属推荐', 'Connectez-vous pour des offres ciblées', 'Inicia sesión para ver recomendaciones', 'Anmelden für passende Angebote', 'Đăng nhập để nhận gợi ý', 'Войдите за подборкой', 'سجّل الدخول لترشيحات مخصصة'],
    '로그인 없이 둘러보기': ['Browse without signing in', 'ログインせずに見る', '不登录先看看', 'Continuer sans compte', 'Seguir sin cuenta', 'Ohne Anmeldung ansehen', 'Xem không cần đăng nhập', 'Смотреть без входа', 'التصفح دون تسجيل'],
    '분석 결과 다시 보기': ['View analysis again', '分析結果を見る', '再看分析结果', "Revoir l'analyse", 'Ver el análisis', 'Analyse ansehen', 'Xem lại phân tích', 'Посмотреть анализ', 'عرض التحليل'],

    // ── 진단 ────────────────────────────────────────────────
    'AI가 분석중입니다': ['AI is analyzing', 'AIが分析しています', 'AI 正在分析', 'Analyse en cours', 'La IA está analizando', 'KI analysiert', 'AI đang phân tích', 'ИИ анализирует', 'الذكاء الاصطناعي يحلل'],
    '분석이 끝났습니다': ['Analysis complete', '分析が完了しました', '分析完成', 'Analyse terminée', 'Análisis completado', 'Analyse abgeschlossen', 'Đã phân tích xong', 'Анализ завершён', 'اكتمل التحليل'],
    '이전': ['Back', '戻る', '上一步', 'Retour', 'Atrás', 'Zurück', 'Quay lại', 'Назад', 'رجوع'],

    // ── 기업 ────────────────────────────────────────────────
    '공고 등록': ['Post a job', '求人を登録', '发布职位', 'Publier une offre', 'Publicar empleo', 'Stelle einstellen', 'Đăng tin tuyển', 'Разместить вакансию', 'نشر وظيفة'],
    '내 공고': ['My postings', '登録した求人', '我的职位', 'Mes offres', 'Mis anuncios', 'Meine Stellen', 'Tin của tôi', 'Мои вакансии', 'إعلاناتي'],
    '공고 제목': ['Job title', '求人タイトル', '职位名称', "Intitulé du poste", 'Título del puesto', 'Stellenbezeichnung', 'Tiêu đề tin', 'Название вакансии', 'عنوان الوظيفة'],
    '근무 지역': ['Location', '勤務地', '工作地点', 'Lieu de travail', 'Lugar de trabajo', 'Arbeitsort', 'Nơi làm việc', 'Место работы', 'مكان العمل'],
    '요구 경력': ['Experience required', '必要な経験', '经验要求', 'Expérience requise', 'Experiencia requerida', 'Erforderliche Erfahrung', 'Kinh nghiệm yêu cầu', 'Требуемый опыт', 'الخبرة المطلوبة'],
    '연봉 범위': ['Salary range', '年収レンジ', '薪资范围', 'Fourchette salariale', 'Rango salarial', 'Gehaltsspanne', 'Khoảng lương', 'Диапазон зарплаты', 'نطاق الراتب'],
    '전문 분야': ['Specialty', '専門分野', '专业领域', 'Spécialité', 'Especialidad', 'Fachgebiet', 'Chuyên môn', 'Специализация', 'التخصص'],
    '등록하기': ['Publish', '登録する', '发布', 'Publier', 'Publicar', 'Veröffentlichen', 'Đăng tin', 'Опубликовать', 'نشر'],
    '등록된 공고가 없습니다': ['No postings yet', '登録された求人はありません', '暂无发布的职位', 'Aucune offre publiée', 'Aún no hay anuncios', 'Noch keine Stellen', 'Chưa có tin nào', 'Пока нет вакансий', 'لا توجد إعلانات بعد'],

    // ── 로그인 화면 ─────────────────────────────────────────
    '다시 오셨네요': ['Welcome back', 'おかえりなさい', '欢迎回来', 'Content de vous revoir', 'Bienvenido de nuevo', 'Willkommen zurück', 'Chào mừng trở lại', 'С возвращением', 'أهلاً بعودتك'],
    '이메일 주소': ['Email address', 'メールアドレス', '电子邮箱', 'Adresse e-mail', 'Correo electrónico', 'E-Mail-Adresse', 'Địa chỉ email', 'Электронная почта', 'البريد الإلكتروني'],
    '비밀번호': ['Password', 'パスワード', '密码', 'Mot de passe', 'Contraseña', 'Passwort', 'Mật khẩu', 'Пароль', 'كلمة المرور'],
    '비밀번호 확인': ['Confirm password', 'パスワード確認', '确认密码', 'Confirmer le mot de passe', 'Confirmar contraseña', 'Passwort bestätigen', 'Xác nhận mật khẩu', 'Подтвердите пароль', 'تأكيد كلمة المرور'],
    '가입하고 시작하기': ['Create account and start', '登録して始める', '注册并开始', 'Créer un compte et commencer', 'Crear cuenta y empezar', 'Registrieren und starten', 'Đăng ký và bắt đầu', 'Создать аккаунт', 'أنشئ حسابك وابدأ'],
    '계정이 없으신가요?': ['No account yet?', 'アカウントをお持ちでないですか?', '还没有账号?', 'Pas encore de compte ?', '¿Aún no tienes cuenta?', 'Noch kein Konto?', 'Chưa có tài khoản?', 'Нет аккаунта?', 'ليس لديك حساب؟'],
    '이미 계정이 있으신가요?': ['Already have an account?', 'すでにアカウントをお持ちですか?', '已有账号?', 'Vous avez déjà un compte ?', '¿Ya tienes cuenta?', 'Schon ein Konto?', 'Đã có tài khoản?', 'Уже есть аккаунт?', 'لديك حساب بالفعل؟'],
    '체험 계정 채우기': ['Fill demo account', 'デモ用アカウントを入力', '填入体验账号', 'Remplir le compte démo', 'Rellenar cuenta demo', 'Demokonto einfügen', 'Điền tài khoản dùng thử', 'Заполнить демо-аккаунт', 'تعبئة حساب تجريبي'],
    '기업 회원 로그인': ['Employer sign in', '企業会員ログイン', '企业会员登录', 'Connexion entreprise', 'Acceso para empresas', 'Anmeldung für Unternehmen', 'Đăng nhập doanh nghiệp', 'Вход для работодателя', 'دخول الشركات']
  };

  function dictFor(code) {
    if (code === 'ko' || ORDER.indexOf(code) === -1) return null;
    var col = ORDER.indexOf(code);
    var out = {};
    for (var ko in TABLE) {
      var row = TABLE[ko];
      if (row && row[col]) out[ko] = row[col];
    }
    return out;
  }

  function current() {
    try {
      var v = localStorage.getItem(KEY) || 'ko';
      // 예전에 저장된 en-US 같은 값은 en으로 맞춘다
      if (v.indexOf('en-') === 0) return 'en';
      return v;
    } catch (e) {
      return 'ko';
    }
  }

  var observer = null;

  function translateNode(root, dict) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var p = node.parentNode;
        if (!p) return NodeFilter.FILTER_REJECT;
        var tag = p.nodeName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA') return NodeFilter.FILTER_REJECT;
        if (p.classList && p.classList.contains('material-symbols-outlined')) return NodeFilter.FILTER_REJECT;
        if (p.closest && p.closest('[data-no-translate]')) return NodeFilter.FILTER_REJECT;
        return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });

    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(function (node) {
      if (node.__ko === undefined) node.__ko = node.nodeValue;
      var ko = node.__ko;

      if (!dict) {
        if (node.nodeValue !== ko) node.nodeValue = ko;
        return;
      }

      var key = ko.trim();
      var hit = dict[key];
      if (hit) {
        node.nodeValue = ko.replace(key, hit);
        return;
      }

      // 부분 일치는 아주 짧은 라벨에만 적용한다. 문장 중간을 갈아끼우면
      // 두 언어가 뒤엉켜 오히려 읽기 나쁘다.
      if (key.length > 12) return;

      var out = ko;
      var changed = false;
      Object.keys(dict)
        .sort(function (a, b) {
          return b.length - a.length;
        })
        .forEach(function (k) {
          if (k.length >= 2 && out.indexOf(k) !== -1) {
            out = out.split(k).join(dict[k]);
            changed = true;
          }
        });
      if (changed) node.nodeValue = out;
    });

    var attrEls = root.querySelectorAll ? root.querySelectorAll('[placeholder],[title],[aria-label]') : [];
    Array.prototype.forEach.call(attrEls, function (el) {
      ['placeholder', 'title', 'aria-label'].forEach(function (attr) {
        var v = el.getAttribute(attr);
        if (!v) return;
        var store = '__ko_' + attr;
        if (el[store] === undefined) el[store] = v;
        var ko = el[store];
        if (!dict) {
          el.setAttribute(attr, ko);
          return;
        }
        if (dict[ko.trim()]) el.setAttribute(attr, dict[ko.trim()]);
      });
    });
  }

  function apply(code) {
    var dict = dictFor(code);
    document.documentElement.setAttribute('lang', code);
    document.documentElement.setAttribute('dir', RTL[code] ? 'rtl' : 'ltr');

    if (observer) observer.disconnect();
    translateNode(document.body, dict);

    // React가 다시 그리는 화면도 따라간다
    observer = new MutationObserver(function (muts) {
      if (observer) observer.disconnect();
      muts.forEach(function (m) {
        Array.prototype.forEach.call(m.addedNodes, function (n) {
          if (n.nodeType === 1) translateNode(n, dict);
          else if (n.nodeType === 3 && n.parentNode) translateNode(n.parentNode, dict);
        });
      });
      if (observer) observer.observe(document.body, { childList: true, subtree: true });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function set(code) {
    try {
      localStorage.setItem(KEY, code);
    } catch (e) {}
    apply(code);
    document.dispatchEvent(new CustomEvent('chwireup:lang', { detail: code }));
  }

  function start() {
    apply(current());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  window.ChwireupI18n = {
    langs: LANGS,
    current: current,
    set: set,
    label: function (code) {
      for (var i = 0; i < LANGS.length; i++) if (LANGS[i].code === code) return LANGS[i].label;
      return code;
    }
  };
})();
