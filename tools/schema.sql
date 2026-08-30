-- ============================================================================
-- Öuda — Supabase 스키마
--
-- Supabase 대시보드 > SQL Editor 에 이 파일을 통째로 붙여넣고 Run 하세요.
-- 여러 번 돌려도 안전합니다 (전부 if not exists / or replace).
--
-- 설계
--   dictionary  공용 뜻 사전. 운영자만 쓰고, 로그인 안 한 사람도 읽는다.
--   progress    개인 학습기록. 본인 것만 읽고 쓴다.
--   profiles    역할(user/admin). 가입하면 트리거가 자동으로 만든다.
--
-- 화면에서 버튼을 숨기는 것은 편의일 뿐이고, 실제 차단은 여기 RLS 가 합니다.
-- 브라우저 콘솔에서 뭘 하든 운영자가 아니면 dictionary 에 못 씁니다.
-- ============================================================================


-- ---------------------------------------------------------------- profiles
-- auth.users 는 Supabase 가 관리한다. 역할만 따로 붙인다.

create table if not exists public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  role       text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "본인 프로필 읽기" on public.profiles;
create policy "본인 프로필 읽기" on public.profiles
  for select using (auth.uid() = id);

-- role 은 사용자가 못 바꾼다. UPDATE 정책을 아예 만들지 않아서
-- 대시보드(service_role)로만 운영자 지정이 가능하다.


-- 가입하면 프로필 행을 자동으로 만든다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 운영자 판별.
-- RLS 정책 안에서 profiles 를 그냥 select 하면 그 select 에 또 RLS 가 걸려
-- 무한 재귀가 난다. security definer 로 RLS 를 우회해서 읽는다.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;


-- ---------------------------------------------------------------- dictionary
-- 단어 하나 = 한 행. 행 단위여야 'builtAt 이후 바뀐 것만' 델타로 받을 수 있다.
--
--   patch    단어에 덮어쓸 값  {"ko": "기차, 열차", "plural": "Züge"}
--   aliases  뜻 테스트에서 정답으로 인정할 표현
--   deleted  운영자가 지운 항목 (원본 데이터는 안 건드리고 여기서 표시만)
--   entry    정적 데이터에 없는, 운영자가 새로 추가한 단어

create table if not exists public.dictionary (
  id         text primary key,
  patch      jsonb  not null default '{}'::jsonb,
  aliases    text[] not null default '{}',
  deleted    boolean not null default false,
  entry      jsonb,
  updated_at timestamptz not null default now()
);

-- 델타 pull 이 updated_at > <기준> 으로 훑으므로 인덱스가 필요하다
create index if not exists dictionary_updated_at_idx
  on public.dictionary (updated_at);

alter table public.dictionary enable row level security;

-- 읽기는 전원. 로그인 안 한 사람도 뜻은 본다.
drop policy if exists "사전 읽기는 전원" on public.dictionary;
create policy "사전 읽기는 전원" on public.dictionary
  for select using (true);

-- 쓰기는 운영자만.
drop policy if exists "사전 쓰기는 운영자만" on public.dictionary;
create policy "사전 쓰기는 운영자만" on public.dictionary
  for insert with check (public.is_admin());

drop policy if exists "사전 수정은 운영자만" on public.dictionary;
create policy "사전 수정은 운영자만" on public.dictionary
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "사전 삭제는 운영자만" on public.dictionary;
create policy "사전 삭제는 운영자만" on public.dictionary
  for delete using (public.is_admin());


-- updated_at 은 클라이언트가 보내는 값을 믿지 않고 서버가 찍는다.
-- 이게 델타 pull 의 기준이라 시계가 틀린 기기 하나가 갱신을 통째로 숨길 수 있다.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists dictionary_touch on public.dictionary;
create trigger dictionary_touch
  before insert or update on public.dictionary
  for each row execute function public.touch_updated_at();


-- ---------------------------------------------------------------- progress
-- 개인 학습기록. 사용자당 한 행, 통째로 jsonb.
-- 카드가 수만 개여도 몇 백 KB 수준이라 이 정도면 충분하고,
-- 병합은 클라이언트(js/sync.js)가 항목 단위로 한다.

create table if not exists public.progress (
  user_id    uuid primary key references auth.users on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

drop policy if exists "내 기록만" on public.progress;
create policy "내 기록만" on public.progress
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists progress_touch on public.progress;
create trigger progress_touch
  before insert or update on public.progress
  for each row execute function public.touch_updated_at();


-- ---------------------------------------------------------------- 정리
-- 예전 코드 방식 동기화 테이블이 있으면 지운다.
-- (RLS 가 using(true) 라서 anon 키만 있으면 누구나 남의 진도를 읽을 수 있었다)
drop table if exists public.sync;


-- ============================================================================
-- 운영자 지정
--
-- 앱에서 먼저 가입한 다음, 아래를 SQL Editor 에서 한 번 돌리세요.
-- 이메일을 본인 것으로 바꾸는 것을 잊지 마세요.
-- ============================================================================
--
--   update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'geulcho@gmail.com');
--
-- 확인:
--   select u.email, p.role from public.profiles p join auth.users u on u.id = p.id;
--
-- ============================================================================
