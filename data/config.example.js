/*
 * config.example.js — 동기화 설정 예시
 *
 * 쓰려면 이 파일을 data/config.js 로 복사하고 값을 채운 뒤,
 * index.html 에서 다른 data/*.js 보다 먼저 불러오세요.
 * (이미 <script src="data/config.js"> 줄이 들어 있고, 파일이 없으면 그냥 무시됩니다)
 *
 * Supabase 준비 (5분):
 *   1. supabase.com 에서 프로젝트 생성
 *   2. SQL Editor 에 아래를 붙여넣고 실행
 *
 *        create table sync (
 *          code text primary key,
 *          data jsonb not null,
 *          updated_at timestamptz default now()
 *        );
 *        alter table sync enable row level security;
 *        create policy "code 를 아는 사람만" on sync
 *          for all using (true) with check (true);
 *
 *   3. Project Settings > API 에서 URL 과 anon public key 를 복사해 아래에 넣기
 *   4. 앱 > 설정 > 동기화 에서 코드를 만들고, 다른 기기에 같은 코드를 입력
 *
 * 이 키는 공개돼도 되는 anon 키입니다. 실제 접근은 동기화 코드(24자)가 막습니다.
 * 설정하지 않으면 동기화만 꺼진 채 로컬 전용으로 그대로 돌아갑니다.
 */
window.SYNC_CONFIG = {
  url: 'https://xxxxxxxxxxxx.supabase.co',
  key: 'eyJhbGciOi...여기에-anon-public-key'
};
