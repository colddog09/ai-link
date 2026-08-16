/* ==========================================================================
   취R업 – Firebase 설정 (여기 한 곳만 고치면 된다)

   새 프로젝트로 옮기는 방법
     1. Firebase 콘솔에서 프로젝트를 만든다
     2. 프로젝트 설정 > 내 앱 > 웹 앱 추가 (</> 아이콘)
     3. 화면에 나오는 firebaseConfig 값을 아래에 그대로 붙여넣는다
     4. Authentication > Sign-in method > 이메일/비밀번호 사용 설정
     5. Authentication > Settings > 승인된 도메인에 배포 주소를 추가한다
     6. Firestore Database > 데이터베이스 만들기 (위치: asia-northeast3)

   DATABASE_ID
     보통은 비워 둔다. 기본 데이터베이스를 쓴다는 뜻이다.
     AI Studio가 만든 프로젝트처럼 이름 있는 데이터베이스를 쓸 때만 적는다.
   ========================================================================== */
window.ChwireupFirebaseConfig = {
  // TODO: 콘솔 > 프로젝트 설정 > 내 앱 > 웹 앱에서 받은 값으로 채운다
  apiKey: '',
  authDomain: 'cheerrup-e0b4f.firebaseapp.com',
  projectId: 'cheerrup-e0b4f',
  storageBucket: 'cheerrup-e0b4f.firebasestorage.app',
  messagingSenderId: '',
  appId: ''
};

// 이름 있는 Firestore 데이터베이스를 쓸 때만 채운다. 새 프로젝트는 비워 둔다.
window.ChwireupDatabaseId = '';
