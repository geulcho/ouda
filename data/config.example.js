/*
 * config.example.js — 서버 설정 예시
 *
 * 쓰려면 이 파일을 data/config.js 로 복사하고 값을 채우세요.
 * (index.html 에 이미 <script src="data/config.js"> 줄이 있고, 파일이 없으면 그냥 무시됩니다)
 *
 * 이걸 넣으면 켜지는 것
 *   - 계정 (이메일 + 비밀번호)
 *   - 기기 간 진도 동기화
 *   - 공용 뜻 사전 (운영자가 채운 뜻을 모두가 받음)
 *
 * 넣지 않으면 로그인 화면도 뜨지 않고 지금까지처럼 로컬 전용으로 동작합니다.
 * index.html 을 file:// 로 더블클릭해 여는 경우가 그렇습니다.
 *
 * ---------------------------------------------------------------- 준비 (10분)
 *
 *   1. supabase.com 에서 프로젝트 생성 (무료 티어면 충분합니다)
 *
 *   2. SQL Editor 에 tools/schema.sql 을 통째로 붙여넣고 Run
 *      테이블 세 개와 RLS 정책이 만들어집니다.
 *        dictionary  공용 뜻 사전 — 운영자만 쓰고 전원이 읽는다
 *        progress    개인 학습기록 — 본인 것만
 *        profiles    역할 (user / admin)
 *
 *   3. Project Settings > API 에서 URL 과 anon public key 를 복사해 아래에 넣기
 *
 *   4. 앱을 열고 설정 > 계정 에서 가입
 *
 *   5. 자기 계정을 운영자로 올립니다. SQL Editor 에서 한 번:
 *
 *        update public.profiles set role = 'admin'
 *        where id = (select id from auth.users where email = '내-이메일@example.com');
 *
 *      다시 로그인하면 '운영자' 배지와 '사전에 발행' 버튼이 보입니다.
 *
 * ---------------------------------------------------------------- 키에 대해
 *
 * anon 키는 공개돼도 되는 값입니다 — 어차피 브라우저로 나갑니다.
 * 실제 접근 차단은 서버의 RLS 가 합니다. 이 키만으로는
 *   - 남의 학습기록을 못 읽고 (progress 는 auth.uid() 로 잠겨 있음)
 *   - 사전에 못 씁니다 (is_admin() 이 아니면 거부)
 *
 * service_role 키는 절대 여기 넣지 마세요. 그건 RLS 를 통째로 우회합니다.
 *
 * 저장소에 커밋하지 않으려면 .gitignore 에 data/config.js 를 두고
 * 배포 때 Actions Secrets 에서 만들게 하세요 (.github/workflows/deploy.yml 참고).
 */
window.SYNC_CONFIG = {
  url: 'https://xxxxxxxxxxxx.supabase.co',
  key: 'eyJhbGciOi...여기에-anon-public-key'
};
