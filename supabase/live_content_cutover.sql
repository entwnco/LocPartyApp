-- Copy development vendors, schedule, announcements, venue areas, and the
-- bingo card onto the live database. Guest profiles, auth users, points,
-- raffle entries, and challenge rows are left in place.
-- Existing guests receive a bingo rotation index. New signups get the next one.

begin;

create temp table _guard (kind text primary key, digest text, n integer);

insert into _guard
select 'guests',
  md5(coalesce(string_agg(row_to_json(g)::text, '|' order by g.id::text), '')),
  count(*)::integer
from (
  select id, auth_user_id, display_name, photo_url, look_photo_url, here_for,
         relationship_status_id, relationship_theme, created_at
  from public.guests
) g;

insert into _guard
select 'points',
  md5(coalesce(string_agg(row_to_json(p)::text, '|' order by p.id::text), '')),
  count(*)::integer
from public.points_ledger p;

insert into _guard
select 'auth',
  md5(coalesce(string_agg(u.id::text, '|' order by u.id::text), '')),
  count(*)::integer
from auth.users u;

insert into _guard
select 'raffle',
  md5(coalesce(string_agg(row_to_json(r)::text, '|' order by r.id::text), '')),
  count(*)::integer
from public.raffle_ledger r;

insert into _guard
select 'challenges',
  md5(coalesce(string_agg(row_to_json(c)::text, '|' order by c.id::text), '')),
  count(*)::integer
from (
  select id, title, description, category, location, point_value, entry_value,
         proof_type, unlock, completion_message, active, sort_order, created_at, choices
  from public.challenges
) c;

insert into _guard
select 'completions',
  md5(coalesce(string_agg(id::text, '|' order by id::text), '')),
  count(*)::integer
from public.completions;

drop table public.bingo_squares;

-- Name: bingo_completions; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.bingo_completions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    guest_id uuid NOT NULL,
    square_id text NOT NULL,
    vendor_id text,
    game_id text,
    code_word text,
    photo_data text,
    points integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


-- Name: bingo_games; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.bingo_games (
    id text NOT NULL,
    name text NOT NULL,
    code_word text,
    sort_order integer NOT NULL
);


-- Name: bingo_pool_members; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.bingo_pool_members (
    pool_id text NOT NULL,
    "position" integer NOT NULL,
    vendor_id text,
    game_id text,
    CONSTRAINT bingo_pool_members_check CHECK (((vendor_id IS NOT NULL) <> (game_id IS NOT NULL))),
    CONSTRAINT bingo_pool_members_position_check CHECK (("position" >= 0))
);


-- Name: bingo_rotation; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.bingo_rotation (
    pool_id text NOT NULL,
    current_index integer DEFAULT 0 NOT NULL,
    CONSTRAINT bingo_rotation_current_index_check CHECK ((current_index >= 0))
);


-- Name: bingo_square_answers; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.bingo_square_answers (
    square_id text NOT NULL,
    answer text NOT NULL,
    note text DEFAULT ''::text NOT NULL
);


-- Name: bingo_squares; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.bingo_squares (
    id text NOT NULL,
    title text NOT NULL,
    prompt text NOT NULL,
    area text NOT NULL,
    points integer DEFAULT 0 NOT NULL,
    row_index smallint NOT NULL,
    col_index smallint NOT NULL,
    completion_mode text NOT NULL,
    pool_id text,
    pool_offset smallint DEFAULT 0 NOT NULL,
    CONSTRAINT bingo_squares_col_index_check CHECK (((col_index >= 0) AND (col_index <= 4))),
    CONSTRAINT bingo_squares_completion_mode_check CHECK ((completion_mode = ANY (ARRAY['vendor_code'::text, 'game_code'::text, 'self'::text, 'photo'::text, 'free'::text, 'answer'::text, 'true_false'::text]))),
    CONSTRAINT bingo_squares_row_index_check CHECK (((row_index >= 0) AND (row_index <= 4)))
);


-- Name: bingo_vendor_riddles; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.bingo_vendor_riddles (
    id text NOT NULL,
    vendor_id text NOT NULL,
    clue text NOT NULL,
    answer text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);


-- Name: bingo_vendors; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.bingo_vendors (
    id text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    category_id text NOT NULL,
    category_label text NOT NULL,
    station_id text,
    station_label text,
    code_word text,
    rotation_eligible boolean DEFAULT false NOT NULL,
    attending boolean DEFAULT true NOT NULL,
    sort_order integer NOT NULL,
    clue text DEFAULT ''::text NOT NULL
);


-- Name: venue_areas; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.venue_areas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);


-- Name: bingo_completions bingo_completions_guest_id_square_id_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.bingo_completions
    ADD CONSTRAINT bingo_completions_guest_id_square_id_key UNIQUE (guest_id, square_id);


-- Name: bingo_completions bingo_completions_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.bingo_completions
    ADD CONSTRAINT bingo_completions_pkey PRIMARY KEY (id);


-- Name: bingo_games bingo_games_code_word_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.bingo_games
    ADD CONSTRAINT bingo_games_code_word_key UNIQUE (code_word);


-- Name: bingo_games bingo_games_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.bingo_games
    ADD CONSTRAINT bingo_games_pkey PRIMARY KEY (id);


-- Name: bingo_pool_members bingo_pool_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.bingo_pool_members
    ADD CONSTRAINT bingo_pool_members_pkey PRIMARY KEY (pool_id, "position");


-- Name: bingo_rotation bingo_rotation_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.bingo_rotation
    ADD CONSTRAINT bingo_rotation_pkey PRIMARY KEY (pool_id);


-- Name: bingo_square_answers bingo_square_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.bingo_square_answers
    ADD CONSTRAINT bingo_square_answers_pkey PRIMARY KEY (square_id);


-- Name: bingo_squares bingo_squares_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.bingo_squares
    ADD CONSTRAINT bingo_squares_pkey PRIMARY KEY (id);


-- Name: bingo_squares bingo_squares_row_index_col_index_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.bingo_squares
    ADD CONSTRAINT bingo_squares_row_index_col_index_key UNIQUE (row_index, col_index);


-- Name: bingo_vendor_riddles bingo_vendor_riddles_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.bingo_vendor_riddles
    ADD CONSTRAINT bingo_vendor_riddles_pkey PRIMARY KEY (id);


-- Name: bingo_vendors bingo_vendors_code_word_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.bingo_vendors
    ADD CONSTRAINT bingo_vendors_code_word_key UNIQUE (code_word);


-- Name: bingo_vendors bingo_vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.bingo_vendors
    ADD CONSTRAINT bingo_vendors_pkey PRIMARY KEY (id);


-- Name: venue_areas venue_areas_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.venue_areas
    ADD CONSTRAINT venue_areas_pkey PRIMARY KEY (id);


-- Name: bingo_completions bingo_completions_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.bingo_completions
    ADD CONSTRAINT bingo_completions_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.bingo_games(id);


-- Name: bingo_completions bingo_completions_guest_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.bingo_completions
    ADD CONSTRAINT bingo_completions_guest_id_fkey FOREIGN KEY (guest_id) REFERENCES public.guests(id) ON DELETE CASCADE;


-- Name: bingo_completions bingo_completions_square_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.bingo_completions
    ADD CONSTRAINT bingo_completions_square_id_fkey FOREIGN KEY (square_id) REFERENCES public.bingo_squares(id);


-- Name: bingo_completions bingo_completions_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.bingo_completions
    ADD CONSTRAINT bingo_completions_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.bingo_vendors(id);


-- Name: bingo_pool_members bingo_pool_members_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.bingo_pool_members
    ADD CONSTRAINT bingo_pool_members_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.bingo_games(id);


-- Name: bingo_pool_members bingo_pool_members_pool_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.bingo_pool_members
    ADD CONSTRAINT bingo_pool_members_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.bingo_rotation(pool_id) ON DELETE CASCADE;


-- Name: bingo_pool_members bingo_pool_members_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.bingo_pool_members
    ADD CONSTRAINT bingo_pool_members_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.bingo_vendors(id);


-- Name: bingo_square_answers bingo_square_answers_square_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.bingo_square_answers
    ADD CONSTRAINT bingo_square_answers_square_id_fkey FOREIGN KEY (square_id) REFERENCES public.bingo_squares(id) ON DELETE CASCADE;


-- Name: bingo_vendor_riddles bingo_vendor_riddles_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.bingo_vendor_riddles
    ADD CONSTRAINT bingo_vendor_riddles_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.bingo_vendors(id) ON DELETE CASCADE;


-- Name: bingo_games admin reads bingo games; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "admin reads bingo games" ON public.bingo_games FOR SELECT TO authenticated USING (public.is_admin());


-- Name: bingo_pool_members admin reads bingo pool members; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "admin reads bingo pool members" ON public.bingo_pool_members FOR SELECT TO authenticated USING (public.is_admin());


-- Name: bingo_rotation admin reads bingo rotation; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "admin reads bingo rotation" ON public.bingo_rotation FOR SELECT TO authenticated USING (public.is_admin());


-- Name: bingo_vendors admin reads bingo vendors; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "admin reads bingo vendors" ON public.bingo_vendors FOR SELECT TO authenticated USING (public.is_admin());


-- Name: bingo_square_answers admin reads square answers; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "admin reads square answers" ON public.bingo_square_answers FOR SELECT TO authenticated USING (public.is_admin());


-- Name: venue_areas admin write venue areas; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "admin write venue areas" ON public.venue_areas TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


-- Name: bingo_completions; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.bingo_completions ENABLE ROW LEVEL SECURITY;

-- Name: bingo_games; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.bingo_games ENABLE ROW LEVEL SECURITY;

-- Name: bingo_pool_members; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.bingo_pool_members ENABLE ROW LEVEL SECURITY;

-- Name: bingo_rotation; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.bingo_rotation ENABLE ROW LEVEL SECURITY;

-- Name: bingo_square_answers; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.bingo_square_answers ENABLE ROW LEVEL SECURITY;

-- Name: bingo_squares; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.bingo_squares ENABLE ROW LEVEL SECURITY;

-- Name: bingo_vendor_riddles; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.bingo_vendor_riddles ENABLE ROW LEVEL SECURITY;

-- Name: bingo_vendors; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.bingo_vendors ENABLE ROW LEVEL SECURITY;

-- Name: venue_areas content select venue areas; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "content select venue areas" ON public.venue_areas FOR SELECT TO authenticated, anon USING (true);


-- Name: bingo_squares read bingo squares; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "read bingo squares" ON public.bingo_squares FOR SELECT TO authenticated USING (true);


-- Name: bingo_completions read own bingo completions; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "read own bingo completions" ON public.bingo_completions FOR SELECT TO authenticated USING ((public.is_admin() OR (guest_id IN ( SELECT g.id
   FROM public.guests g
  WHERE (g.auth_user_id = auth.uid())))));


-- Name: venue_areas; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.venue_areas ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.advance_bingo_pool(p_pool_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  member_count integer;
  next_index integer;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  select count(*)::integer into member_count
  from public.bingo_pool_members
  where pool_id = p_pool_id;
  if member_count = 0 then
    raise exception 'unknown rotation';
  end if;

  update public.bingo_rotation
  set current_index = (current_index + 1) % member_count
  where pool_id = p_pool_id
  returning current_index into next_index;

  if next_index is null then
    raise exception 'unknown rotation';
  end if;

  return jsonb_build_object('poolId', p_pool_id, 'currentIndex', next_index);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.assign_bingo_rotation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  assigned jsonb := '{}'::jsonb;
  rec record;
  member_count integer;
begin
  for rec in
    select pool_id, current_index
    from public.bingo_rotation
    order by pool_id
    for update
  loop
    assigned := assigned || jsonb_build_object(rec.pool_id, rec.current_index);
    select count(*)::integer into member_count
    from public.bingo_pool_members
    where pool_id = rec.pool_id;
    if member_count > 0 then
      update public.bingo_rotation
      set current_index = (rec.current_index + 1) % member_count
      where pool_id = rec.pool_id;
    end if;
  end loop;

  new.bingo_rotation := assigned;
  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.bingo_slot_position(p_pool_id text, p_offset integer, p_index integer)
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $function$
  select case
    when cnt = 0 then null
    else (coalesce(p_index, 0) + coalesce(p_offset, 0)) % cnt
  end
  from (
    select count(*)::integer as cnt
    from public.bingo_pool_members m
    where m.pool_id = p_pool_id
  ) counts;
$function$
;
CREATE OR REPLACE FUNCTION public.complete_bingo_square(p_square_id text, p_photo text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  gid uuid;
  sq public.bingo_squares%rowtype;
begin
  select g.id into gid from public.guests g where g.auth_user_id = auth.uid();
  if gid is null then
    raise exception 'no guest profile';
  end if;

  select * into sq from public.bingo_squares s where s.id = p_square_id;
  if sq.id is null then
    raise exception 'unknown square';
  end if;
  if sq.completion_mode not in ('self', 'photo', 'free') then
    raise exception 'this square needs the code from the booth on duty';
  end if;
  if sq.completion_mode = 'photo' and length(coalesce(p_photo, '')) < 32 then
    raise exception 'a photo is required for this square';
  end if;
  if exists (select 1 from public.bingo_completions c where c.guest_id = gid and c.square_id = sq.id) then
    return jsonb_build_object('squareId', sq.id, 'points', 0, 'title', sq.title, 'already', true);
  end if;

  insert into public.bingo_completions (guest_id, square_id, photo_data, points)
  values (gid, sq.id, case when sq.completion_mode = 'photo' then p_photo else null end, sq.points);

  if sq.points > 0 then
    insert into public.points_ledger (guest_id, source_key, amount, label)
    values (gid, 'bingo:' || sq.id, sq.points, sq.title);
  end if;

  return jsonb_build_object('squareId', sq.id, 'points', sq.points, 'title', sq.title, 'already', false);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.get_bingo_board()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  gid uuid;
  rotation jsonb;
begin
  select g.id, coalesce(g.bingo_rotation, '{}'::jsonb)
    into gid, rotation
  from public.guests g
  where g.auth_user_id = auth.uid();

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'title', s.title,
        'prompt', s.prompt,
        'area', s.area,
        'points', s.points,
        'rowIndex', s.row_index,
        'colIndex', s.col_index,
        'completionMode', s.completion_mode,
        'assignmentName', a.assignment_name,
        'assignmentDetail', a.assignment_detail,
        'assignmentClue', a.assignment_clue,
        'completed', exists (
          select 1 from public.bingo_completions c
          where c.square_id = s.id and c.guest_id = gid
        ),
        'followUp', case
          when exists (
            select 1 from public.bingo_completions c
            where c.square_id = s.id and c.guest_id = gid
          ) then nullif((
            select n.note from public.bingo_square_answers n where n.square_id = s.id
          ), '')
          else null
        end
      )
      order by s.row_index, s.col_index
    )
    from public.bingo_squares s
    left join lateral (
      select
        coalesce(v.name, gm.name) as assignment_name,
        case
          when v.id is not null then v.description
          when gm.id is not null then 'Game Stop'
          else null
        end as assignment_detail,
        case
          when v.id is not null and coalesce(v.clue, '') <> '' then v.clue
          else null
        end as assignment_clue
      from public.bingo_pool_members m
      left join public.bingo_vendors v on v.id = m.vendor_id
      left join public.bingo_games gm on gm.id = m.game_id
      where m.pool_id = s.pool_id
        and m.position = public.bingo_slot_position(
          s.pool_id,
          s.pool_offset,
          coalesce((rotation ->> s.pool_id)::integer, 0)
        )
    ) a on true
  ), '[]'::jsonb);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.get_bingo_square_answers()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  return coalesce(
    (select jsonb_object_agg(a.square_id, a.answer) from public.bingo_square_answers a),
    '{}'::jsonb
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.get_bingo_staff_board()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  return jsonb_build_object(
    'squares', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'title', s.title,
          'prompt', s.prompt,
          'area', s.area,
          'points', s.points,
          'rowIndex', s.row_index,
          'colIndex', s.col_index,
          'completionMode', s.completion_mode,
          'poolId', s.pool_id,
          'poolOffset', s.pool_offset,
          'assignmentName', a.assignment_name,
          'codeWord', a.code_word,
          'completionCount', (
            select count(*) from public.bingo_completions c where c.square_id = s.id
          )
        )
        order by s.row_index, s.col_index
      )
      from public.bingo_squares s
      left join lateral (
        select
          coalesce(v.name, gm.name) as assignment_name,
          coalesce(v.code_word, gm.code_word) as code_word
        from public.bingo_pool_members m
        left join public.bingo_vendors v on v.id = m.vendor_id
        left join public.bingo_games gm on gm.id = m.game_id
        where m.pool_id = s.pool_id
          and m.position = public.bingo_slot_position(
            s.pool_id,
            s.pool_offset,
            (select r.current_index from public.bingo_rotation r where r.pool_id = s.pool_id)
          )
      ) a on true
    ), '[]'::jsonb),
    'pools', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', r.pool_id,
          'label', case r.pool_id
            when 'loc-hair' then 'Loc & Hair Care'
            when 'body-care' then 'Body Care & Fragrance'
            when 'fashion' then 'Fashion, Accessories & Gifts'
            when 'games' then 'Game Stop'
            else r.pool_id
          end,
          'currentIndex', r.current_index,
          'members', (
            select coalesce(jsonb_agg(
              jsonb_build_object(
                'position', m.position,
                'vendorId', m.vendor_id,
                'name', coalesce(v.name, gm.name),
                'clue', coalesce(v.clue, ''),
                'codeWord', coalesce(v.code_word, gm.code_word),
                'onDuty', m.position = any (array(
                  select public.bingo_slot_position(r.pool_id, s.pool_offset, r.current_index)
                  from public.bingo_squares s
                  where s.pool_id = r.pool_id
                ))
              )
              order by m.position
            ), '[]'::jsonb)
            from public.bingo_pool_members m
            left join public.bingo_vendors v on v.id = m.vendor_id
            left join public.bingo_games gm on gm.id = m.game_id
            where m.pool_id = r.pool_id
          )
        )
        order by r.pool_id
      )
      from public.bingo_rotation r
    ), '[]'::jsonb),
    'riddles', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'vendorId', r.vendor_id,
          'clue', r.clue,
          'answer', r.answer
        )
        order by r.sort_order
      )
      from public.bingo_vendor_riddles r
    ), '[]'::jsonb)
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.normalize_bingo_code(raw text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select upper(regexp_replace(coalesce(raw, ''), '[^A-Za-z0-9]', '', 'g'));
$function$
;
CREATE OR REPLACE FUNCTION public.redeem_bingo_code(p_square_id text, p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  gid uuid;
  rotation jsonb;
  sq public.bingo_squares%rowtype;
  member record;
  expected text;
  normalized text;
  expected_norm text;
  follow_up text;
begin
  select g.id, coalesce(g.bingo_rotation, '{}'::jsonb)
    into gid, rotation
  from public.guests g
  where g.auth_user_id = auth.uid();
  if gid is null then
    raise exception 'no guest profile';
  end if;

  select * into sq from public.bingo_squares s where s.id = p_square_id;
  if sq.id is null then
    raise exception 'unknown square';
  end if;
  if exists (select 1 from public.bingo_completions c where c.guest_id = gid and c.square_id = sq.id) then
    raise exception 'already completed';
  end if;

  if sq.completion_mode in ('answer', 'true_false') then
    select a.answer, nullif(a.note, '') into expected, follow_up
    from public.bingo_square_answers a
    where a.square_id = sq.id;
    normalized := public.normalize_bingo_code(p_code);
    expected_norm := public.normalize_bingo_code(expected);
    if expected is null or normalized = '' or not (
      normalized = expected_norm
      or (
        expected_norm = 'ENTWINED'
        and normalized in ('THEENTWINEDCOMPANY', 'ENTWINEDCOMPANY', 'ENTWINEDLOCSTUDIO')
      )
    ) then
      raise exception 'that answer does not complete this square';
    end if;

    insert into public.bingo_completions (guest_id, square_id, points)
    values (gid, sq.id, sq.points);

    if sq.points > 0 then
      insert into public.points_ledger (guest_id, source_key, amount, label)
      values (gid, 'bingo:' || sq.id, sq.points, sq.title);
    end if;

    return jsonb_build_object(
      'squareId', sq.id,
      'points', sq.points,
      'title', sq.title,
      'followUp', follow_up
    );
  end if;

  if sq.completion_mode <> 'vendor_code' then
    raise exception 'this square does not take a code';
  end if;

  select
    m.vendor_id,
    m.game_id,
    coalesce(v.code_word, gm.code_word) as code_word
  into member
  from public.bingo_pool_members m
  left join public.bingo_vendors v on v.id = m.vendor_id
  left join public.bingo_games gm on gm.id = m.game_id
  where m.pool_id = sq.pool_id
    and m.position = public.bingo_slot_position(
      sq.pool_id,
      sq.pool_offset,
      coalesce((rotation ->> sq.pool_id)::integer, 0)
    );

  expected := member.code_word;
  normalized := public.normalize_bingo_code(p_code);
  if expected is null or normalized = '' or normalized <> public.normalize_bingo_code(expected) then
    raise exception 'that code does not complete this square';
  end if;

  insert into public.bingo_completions (guest_id, square_id, vendor_id, game_id, code_word, points)
  values (gid, sq.id, member.vendor_id, member.game_id, normalized, sq.points);

  if sq.points > 0 then
    insert into public.points_ledger (guest_id, source_key, amount, label)
    values (gid, 'bingo:' || sq.id, sq.points, sq.title);
  end if;

  return jsonb_build_object('squareId', sq.id, 'points', sq.points, 'title', sq.title);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.set_bingo_square_answer(p_square_id text, p_answer text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  mode text;
  stored text;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  select s.completion_mode into mode from public.bingo_squares s where s.id = p_square_id;
  if mode is null then
    raise exception 'unknown square';
  end if;
  if mode not in ('answer', 'true_false') then
    raise exception 'This square does not take a hidden answer';
  end if;
  if length(coalesce(p_answer, '')) > 80 then
    raise exception 'That answer is too long';
  end if;
  if mode = 'true_false' then
    stored := public.normalize_bingo_code(p_answer);
    if stored not in ('TRUE', 'FALSE') then
      raise exception 'Choose true or false';
    end if;
  else
    stored := trim(coalesce(p_answer, ''));
  end if;
  insert into public.bingo_square_answers (square_id, answer)
  values (p_square_id, stored)
  on conflict (square_id) do update set answer = excluded.answer;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.update_bingo_square(p_id text, p_title text, p_prompt text, p_area text, p_points integer, p_completion_mode text, p_pool_id text, p_pool_offset integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  mode text;
  pool text;
  stop_n integer;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  if p_id is null or not exists (select 1 from public.bingo_squares s where s.id = p_id) then
    raise exception 'unknown square';
  end if;
  if length(trim(coalesce(p_title, ''))) = 0 or length(trim(p_title)) > 80 then
    raise exception 'Give the square a title';
  end if;
  if length(coalesce(p_prompt, '')) > 500 or length(coalesce(p_area, '')) > 40 then
    raise exception 'That text is too long';
  end if;
  if p_points is null or p_points < 0 or p_points > 500 then
    raise exception 'Points must be between 0 and 500';
  end if;

  if p_id = 'free' then
    update public.bingo_squares
    set
      title = trim(p_title),
      prompt = coalesce(p_prompt, ''),
      area = coalesce(nullif(trim(p_area), ''), 'Party'),
      points = p_points
    where id = 'free';
    return;
  end if;

  mode := p_completion_mode;
  if mode not in ('self', 'photo', 'vendor_code', 'answer', 'true_false') then
    raise exception 'Choose how this square is completed';
  end if;

  pool := nullif(trim(coalesce(p_pool_id, '')), '');
  stop_n := coalesce(p_pool_offset, 0);
  if mode in ('answer', 'true_false') then
    pool := null;
    stop_n := 0;
  elsif mode = 'vendor_code' and pool is null then
    raise exception 'An answer square needs a category';
  end if;
  if pool is not null then
    if not exists (select 1 from public.bingo_rotation r where r.pool_id = pool) then
      raise exception 'unknown category';
    end if;
    if stop_n < 0 or stop_n > 11 then
      raise exception 'Pick a stop in the rotation';
    end if;
    if mode = 'vendor_code' and exists (
      select 1 from public.bingo_pool_members m
      where m.pool_id = pool and m.game_id is not null
    ) then
      raise exception 'Games are marked done by the guest';
    end if;
  else
    stop_n := 0;
  end if;

  update public.bingo_squares
  set
    title = trim(p_title),
    prompt = coalesce(p_prompt, ''),
    area = coalesce(nullif(trim(p_area), ''), area),
    points = p_points,
    completion_mode = mode,
    pool_id = pool,
    pool_offset = stop_n
  where id = p_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.update_bingo_vendor_clue(p_vendor_id text, p_clue text, p_code_word text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  word text;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  if not exists (select 1 from public.bingo_vendors v where v.id = p_vendor_id) then
    raise exception 'unknown booth';
  end if;
  if length(coalesce(p_clue, '')) > 800 then
    raise exception 'That clue is too long';
  end if;
  word := nullif(trim(coalesce(p_code_word, '')), '');
  if word is not null and length(word) > 40 then
    raise exception 'That answer is too long';
  end if;

  update public.bingo_vendors
  set clue = coalesce(p_clue, ''), code_word = word
  where id = p_vendor_id;
end;
$function$
;

grant all on table
  public.bingo_vendors,
  public.bingo_games,
  public.bingo_squares,
  public.bingo_rotation,
  public.bingo_pool_members,
  public.bingo_completions,
  public.bingo_square_answers,
  public.venue_areas
to anon, authenticated, service_role;

grant all on table public.bingo_vendor_riddles to service_role;

grant execute on function
  public.advance_bingo_pool(text),
  public.assign_bingo_rotation(),
  public.bingo_slot_position(text, integer, integer),
  public.complete_bingo_square(text, text),
  public.get_bingo_board(),
  public.get_bingo_square_answers(),
  public.get_bingo_staff_board(),
  public.normalize_bingo_code(text),
  public.redeem_bingo_code(text, text),
  public.set_bingo_square_answer(text, text),
  public.update_bingo_square(text, text, text, text, integer, text, text, integer),
  public.update_bingo_vendor_clue(text, text, text)
to anon, authenticated, service_role;

delete from public.vendors;
delete from public.schedule_items;
delete from public.announcements;

-- Data for Name: announcements; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.announcements (id, title, body, active, priority, created_at) VALUES ('40000000-0000-4000-8000-000000000001', 'Welcome to The Loc Party!', 'This is a placeholder announcement. Post real updates here during the event.', true, false, '2026-10-15 01:51:28.88438+00');


-- Data for Name: bingo_games; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.bingo_games (id, name, code_word, sort_order) VALUES ('hopscotch', 'Hopscotch', NULL, 1);
INSERT INTO public.bingo_games (id, name, code_word, sort_order) VALUES ('double-dutch', 'Double Dutch', NULL, 2);
INSERT INTO public.bingo_games (id, name, code_word, sort_order) VALUES ('jenga', 'Jenga', NULL, 4);
INSERT INTO public.bingo_games (id, name, code_word, sort_order) VALUES ('cornhole', 'Cornhole', NULL, 5);
INSERT INTO public.bingo_games (id, name, code_word, sort_order) VALUES ('connect-four', 'Connect 4', NULL, 3);


-- Data for Name: bingo_rotation; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.bingo_rotation (pool_id, current_index) VALUES ('body-care', 5);
INSERT INTO public.bingo_rotation (pool_id, current_index) VALUES ('fashion', 3);
INSERT INTO public.bingo_rotation (pool_id, current_index) VALUES ('games', 1);
INSERT INTO public.bingo_rotation (pool_id, current_index) VALUES ('loc-hair', 3);


-- Data for Name: bingo_vendors; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.bingo_vendors (id, name, description, category_id, category_label, station_id, station_label, code_word, rotation_eligible, attending, sort_order, clue) VALUES ('vendor-02', 'Entwined Loc Studio', 'Loc studio', 'loc-hair-care', 'Loc & Hair Care', 'marketplace', 'The Marketplace', NULL, false, true, 2, '');
INSERT INTO public.bingo_vendors (id, name, description, category_id, category_label, station_id, station_label, code_word, rotation_eligible, attending, sort_order, clue) VALUES ('vendor-07', 'The Loc Opulence', 'Loc stylist', 'loc-hair-care', 'Loc & Hair Care', 'marketplace', 'The Marketplace', NULL, false, true, 7, '');
INSERT INTO public.bingo_vendors (id, name, description, category_id, category_label, station_id, station_label, code_word, rotation_eligible, attending, sort_order, clue) VALUES ('vendor-08', 'A3 Confections', 'Croffles with toppings', 'food-treats', 'Food & Treats', 'marketplace', 'The Marketplace', NULL, false, true, 8, '');
INSERT INTO public.bingo_vendors (id, name, description, category_id, category_label, station_id, station_label, code_word, rotation_eligible, attending, sort_order, clue) VALUES ('vendor-09', 'Brothers Millennial', 'Real fruit popsicles', 'food-treats', 'Food & Treats', 'marketplace', 'The Marketplace', NULL, false, true, 9, '');
INSERT INTO public.bingo_vendors (id, name, description, category_id, category_label, station_id, station_label, code_word, rotation_eligible, attending, sort_order, clue) VALUES ('vendor-10', 'Candyland Designs', 'Couture cakes and cocktails', 'food-treats', 'Food & Treats', 'marketplace', 'The Marketplace', NULL, false, true, 10, '');
INSERT INTO public.bingo_vendors (id, name, description, category_id, category_label, station_id, station_label, code_word, rotation_eligible, attending, sort_order, clue) VALUES ('vendor-11', 'Chelsea''s Snatchin'' Kitchen', 'Wings, burgers, hot dogs, fries, sodas, cookies', 'food-treats', 'Food & Treats', 'marketplace', 'The Marketplace', NULL, false, true, 11, '');
INSERT INTO public.bingo_vendors (id, name, description, category_id, category_label, station_id, station_label, code_word, rotation_eligible, attending, sort_order, clue) VALUES ('vendor-12', 'D³ Cuisines', 'Caribbean-Southern bowls, seafood rice, juices', 'food-treats', 'Food & Treats', 'marketplace', 'The Marketplace', NULL, false, true, 12, '');
INSERT INTO public.bingo_vendors (id, name, description, category_id, category_label, station_id, station_label, code_word, rotation_eligible, attending, sort_order, clue) VALUES ('vendor-13', 'Kitchen Arrabon', 'Cakes, cookies, baked goods', 'food-treats', 'Food & Treats', 'marketplace', 'The Marketplace', NULL, false, true, 13, '');
INSERT INTO public.bingo_vendors (id, name, description, category_id, category_label, station_id, station_label, code_word, rotation_eligible, attending, sort_order, clue) VALUES ('vendor-14', 'The Flavor District', '$5 cakes', 'food-treats', 'Food & Treats', 'marketplace', 'The Marketplace', NULL, false, true, 14, '');
INSERT INTO public.bingo_vendors (id, name, description, category_id, category_label, station_id, station_label, code_word, rotation_eligible, attending, sort_order, clue) VALUES ('vendor-22', 'Adina Kajoy', 'Beauty, fashion, and lifestyle', 'fashion-accessories-gifts', 'Fashion, Accessories & Gifts', 'marketplace', 'The Marketplace', NULL, false, true, 22, '');
INSERT INTO public.bingo_vendors (id, name, description, category_id, category_label, station_id, station_label, code_word, rotation_eligible, attending, sort_order, clue) VALUES ('vendor-33', 'Tat Like Tattoo', 'Selling lemonade', 'food-treats', 'Food & Treats', 'marketplace', 'The Marketplace', NULL, false, true, 32, '');
INSERT INTO public.bingo_vendors (id, name, description, category_id, category_label, station_id, station_label, code_word, rotation_eligible, attending, sort_order, clue) VALUES ('vendor-01', 'Beauty Fro', 'Consultations, repair demos, loc care tips', 'loc-hair-care', 'Loc & Hair Care', 'marketplace', 'The Marketplace', 'Beauty Fro', false, true, 1, 'Got loc questions? Come and see,
How healthy your crown can be.
Tips and repair demos steal the show,
Find the booth that helps your locs glow.');
INSERT INTO public.bingo_vendors (id, name, description, category_id, category_label, station_id, station_label, code_word, rotation_eligible, attending, sort_order, clue) VALUES ('vendor-04', 'Kim Jade', 'Natural organic hair care', 'loc-hair-care', 'Loc & Hair Care', 'loc-shop', 'The Loc Shop', 'ORCHARD', true, true, 4, 'A green gemstone is part of my name,
Natural hair care is part of my game.
A three-letter first name completes your clue,
Find my booth, I''m waiting for you!');
INSERT INTO public.bingo_vendors (id, name, description, category_id, category_label, station_id, station_label, code_word, rotation_eligible, attending, sort_order, clue) VALUES ('vendor-06', 'Natural Hair Really Rocks by Moemo', 'Natural hair products', 'loc-hair-care', 'Loc & Hair Care', 'loc-shop', 'The Loc Shop', 'ROOTBEAT', true, true, 6, '');
INSERT INTO public.bingo_vendors (id, name, description, category_id, category_label, station_id, station_label, code_word, rotation_eligible, attending, sort_order, clue) VALUES ('vendor-03', 'House of Isis', 'Buildup-free loc care and natural hair products', 'loc-hair-care', 'Loc & Hair Care', 'loc-shop', 'The Loc Shop', 'RINSECLEAR', true, true, 3, 'A house with no bedrooms, but plenty of care,
Named for a goddess, come find us there.
Buildup-free locs are our special delight,
Find the house that keeps your crown light.');
INSERT INTO public.bingo_vendors (id, name, description, category_id, category_label, station_id, station_label, code_word, rotation_eligible, attending, sort_order, clue) VALUES ('vendor-05', 'LOC HEADZ', 'Micro locs, interlocking, and oils', 'loc-hair-care', 'Loc & Hair Care', 'loc-shop', 'The Loc Shop', 'PALMROLL', true, true, 5, 'Some turn heads, but we spell ours with a Z,
Add LOC to the front—now who could we be?
Micro locs, interlocking, oils made to shine,
Find the booth with that name on the sign.');
INSERT INTO public.bingo_vendors (id, name, description, category_id, category_label, station_id, station_label, code_word, rotation_eligible, attending, sort_order, clue) VALUES ('vendor-15', 'A Key Scent', 'Body care, teas, skincare, car fragrance', 'body-care-fragrance', 'Body Care & Fragrance', 'loc-shop', 'The Loc Shop', 'CEDAR', true, true, 15, 'A key unlocks a door, it''s true,
But mine brings lovely scents to you.
From body to car, there''s fragrance to share,
Follow your nose and find me there.');
INSERT INTO public.bingo_vendors (id, name, description, category_id, category_label, station_id, station_label, code_word, rotation_eligible, attending, sort_order, clue) VALUES ('vendor-16', 'Aly Divinely Yu', 'Hair oils, body oils, lotions, soaps', 'body-care-fragrance', 'Body Care & Fragrance', 'loc-shop', 'The Loc Shop', 'LATHER', true, true, 16, 'Silky-smooth skin, a beautiful glow,
A touch of heaven from head to toe.
A little self-care, something divine,
Find the booth where beauty shines.');
INSERT INTO public.bingo_vendors (id, name, description, category_id, category_label, station_id, station_label, code_word, rotation_eligible, attending, sort_order, clue) VALUES ('vendor-17', 'Jess Vibez Creations', 'Oils, body butters, incense, hair charms', 'body-care-fragrance', 'Body Care & Fragrance', 'loc-shop', 'The Loc Shop', 'EMBERS', true, true, 17, 'Good vibes and sweet scents fill the air,
With oils and little charms for your hair.
A name that rhymes with "yes" is your clue,
Find the creative booth waiting for you.');
INSERT INTO public.bingo_vendors (id, name, description, category_id, category_label, station_id, station_label, code_word, rotation_eligible, attending, sort_order, clue) VALUES ('vendor-18', 'Na'' Scent Organics', 'Handmade skincare', 'body-care-fragrance', 'Body Care & Fragrance', 'loc-shop', 'The Loc Shop', 'CLAY', true, true, 18, 'My name has a scent, but soap steals the show,
Handmade with nature to help your skin glow.
Bars and body butters, all made with care,
Follow the freshness and find me there.');
INSERT INTO public.bingo_vendors (id, name, description, category_id, category_label, station_id, station_label, code_word, rotation_eligible, attending, sort_order, clue) VALUES ('vendor-20', 'Velvet Bloom', 'Perfume and body oils', 'body-care-fragrance', 'Body Care & Fragrance', 'marketplace', 'The Marketplace', 'Velvet Bloom', false, true, 20, 'Soft as velvet, sweet as a rose,
A lovely new fragrance delights your nose.
Body oils and perfumes fill the room,
Follow the scent of a flower in bloom.');
INSERT INTO public.bingo_vendors (id, name, description, category_id, category_label, station_id, station_label, code_word, rotation_eligible, attending, sort_order, clue) VALUES ('vendor-23', 'Indlovu Threads', 'Clothing', 'fashion-accessories-gifts', 'Fashion, Accessories & Gifts', 'marketplace', 'The Marketplace', 'Indlovu Threads', false, true, 23, 'A mighty elephant is part of my name,
But clothing and style are my claim to fame.
Follow the threads to see what''s new,
A fresh fashion find is waiting for you.');
INSERT INTO public.bingo_vendors (id, name, description, category_id, category_label, station_id, station_label, code_word, rotation_eligible, attending, sort_order, clue) VALUES ('vendor-24', 'M Rochelle Jewels', 'Jewelry', 'fashion-accessories-gifts', 'Fashion, Accessories & Gifts', 'marketplace', 'The Marketplace', 'M Rochelle Jewels', false, true, 24, '💎 I sparkle on fingers, I shine on a chain,
Find me where treasures and jewels reign.
I''m pretty and precious, a glittery sight…
Find the spot where the gems shine bright! ✨');
INSERT INTO public.bingo_vendors (id, name, description, category_id, category_label, station_id, station_label, code_word, rotation_eligible, attending, sort_order, clue) VALUES ('vendor-25', 'TPCOnlineShop.com', 'Bonnets, scrunchies, bags, keychains', 'fashion-accessories-gifts', 'Fashion, Accessories & Gifts', 'marketplace', 'The Marketplace', 'TPCOnlineShop.com', false, true, 25, 'Three little letters begin my name,
Bonnets and scrunchies are part of my game.
Bags and keychains, treasures to show,
Find the shop with goodies to go!');
INSERT INTO public.bingo_vendors (id, name, description, category_id, category_label, station_id, station_label, code_word, rotation_eligible, attending, sort_order, clue) VALUES ('vendor-26', 'TYA', 'Waist beads, bracelets, and loc products', 'fashion-accessories-gifts', 'Fashion, Accessories & Gifts', 'marketplace', 'The Marketplace', 'TYA', false, true, 26, 'Beads at your waist, some shine on your wrist,
Locs get some love—don''t miss this twist.
Three little letters will show you the way,
Find all these treasures on display.');
INSERT INTO public.bingo_vendors (id, name, description, category_id, category_label, station_id, station_label, code_word, rotation_eligible, attending, sort_order, clue) VALUES ('vendor-27', 'Ju-Nel', 'Luxury street energy', 'fashion-accessories-gifts', 'Fashion, Accessories & Gifts', 'marketplace', 'The Marketplace', 'Ju-Nel', false, true, 27, 'Images and streetwear come together just right,
With prints and keychains made bold and bright.
A name with two parts is part of the trail,
Find the creative booth called Ju-Nel.');
INSERT INTO public.bingo_vendors (id, name, description, category_id, category_label, station_id, station_label, code_word, rotation_eligible, attending, sort_order, clue) VALUES ('vendor-28', 'Urban Rastaman', 'Rasta culture', 'fashion-accessories-gifts', 'Fashion, Accessories & Gifts', 'marketplace', 'The Marketplace', 'Urban Rastaman', false, true, 28, 'Red, gold, and green with roots running deep,
Culture and pride are treasures we keep.
Think of the city, then think of a man,
Put them together and find me if you can.');
INSERT INTO public.bingo_vendors (id, name, description, category_id, category_label, station_id, station_label, code_word, rotation_eligible, attending, sort_order, clue) VALUES ('vendor-29', 'Gemi Green', 'Plants', 'fashion-accessories-gifts', 'Fashion, Accessories & Gifts', 'marketplace', 'The Marketplace', 'Gemi Green', false, true, 29, 'Some treasures sparkle, some treasures grow,
With leaves and roots they steal the show.
A gem of a find, fresh and green,
Discover the prettiest plants you''ve seen.');
INSERT INTO public.bingo_vendors (id, name, description, category_id, category_label, station_id, station_label, code_word, rotation_eligible, attending, sort_order, clue) VALUES ('vendor-19', 'Nature''s Essentials', 'Skin care', 'body-care-fragrance', 'Body Care & Fragrance', 'loc-shop', 'The Loc Shop', 'CANOPY', true, true, 19, 'From plants and petals, good things grow,
Little skincare must-haves help you glow.
Think of the outdoors and what you need,
Find the booth where nature takes the lead.');
INSERT INTO public.bingo_vendors (id, name, description, category_id, category_label, station_id, station_label, code_word, rotation_eligible, attending, sort_order, clue) VALUES ('vendor-21', 'The Healing Honeypot', 'Skin and body care', 'body-care-fragrance', 'Body Care & Fragrance', 'loc-shop', 'The Loc Shop', 'NECTAR', true, true, 21, 'You might think of bees when you hear my name,
But skin and body care is my game.
Add a little healing to the plot,
Then find the booth with the honey pot.');
INSERT INTO public.bingo_vendors (id, name, description, category_id, category_label, station_id, station_label, code_word, rotation_eligible, attending, sort_order, clue) VALUES ('vendor-30', 'Gifted Ones', 'Visionary non-profit', 'community-services', 'Community & Services', 'game-stop', 'Game Stop', 'Gifted Ones', false, true, 30, 'Not every gift comes wrapped in a bow,
Some shine in the people you come to know.
Big dreams and visions are part of the clue,
Find the nonprofit that believes in you.');
INSERT INTO public.bingo_vendors (id, name, description, category_id, category_label, station_id, station_label, code_word, rotation_eligible, attending, sort_order, clue) VALUES ('vendor-32', 'Spill the T.E.A.', 'Soulful, strategic living', 'community-services', 'Community & Services', 'game-stop', 'Game Stop', 'Spill the T.E.A.', false, true, 31, 'Some tea gets spilled, but there''s no cup,
Just real-life wisdom to lift you up.
Big dreams and purpose are leading the way,
Find the booth with something to say.');


-- Data for Name: bingo_pool_members; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.bingo_pool_members (pool_id, "position", vendor_id, game_id) VALUES ('loc-hair', 0, 'vendor-03', NULL);
INSERT INTO public.bingo_pool_members (pool_id, "position", vendor_id, game_id) VALUES ('loc-hair', 1, 'vendor-04', NULL);
INSERT INTO public.bingo_pool_members (pool_id, "position", vendor_id, game_id) VALUES ('loc-hair', 2, 'vendor-05', NULL);
INSERT INTO public.bingo_pool_members (pool_id, "position", vendor_id, game_id) VALUES ('loc-hair', 3, 'vendor-06', NULL);
INSERT INTO public.bingo_pool_members (pool_id, "position", vendor_id, game_id) VALUES ('body-care', 0, 'vendor-15', NULL);
INSERT INTO public.bingo_pool_members (pool_id, "position", vendor_id, game_id) VALUES ('body-care', 1, 'vendor-16', NULL);
INSERT INTO public.bingo_pool_members (pool_id, "position", vendor_id, game_id) VALUES ('body-care', 2, 'vendor-17', NULL);
INSERT INTO public.bingo_pool_members (pool_id, "position", vendor_id, game_id) VALUES ('body-care', 3, 'vendor-18', NULL);
INSERT INTO public.bingo_pool_members (pool_id, "position", vendor_id, game_id) VALUES ('body-care', 4, 'vendor-19', NULL);
INSERT INTO public.bingo_pool_members (pool_id, "position", vendor_id, game_id) VALUES ('body-care', 5, 'vendor-21', NULL);
INSERT INTO public.bingo_pool_members (pool_id, "position", vendor_id, game_id) VALUES ('games', 0, NULL, 'hopscotch');
INSERT INTO public.bingo_pool_members (pool_id, "position", vendor_id, game_id) VALUES ('games', 1, NULL, 'double-dutch');
INSERT INTO public.bingo_pool_members (pool_id, "position", vendor_id, game_id) VALUES ('games', 2, NULL, 'connect-four');
INSERT INTO public.bingo_pool_members (pool_id, "position", vendor_id, game_id) VALUES ('games', 3, NULL, 'jenga');
INSERT INTO public.bingo_pool_members (pool_id, "position", vendor_id, game_id) VALUES ('games', 4, NULL, 'cornhole');
INSERT INTO public.bingo_pool_members (pool_id, "position", vendor_id, game_id) VALUES ('fashion', 0, 'vendor-22', NULL);
INSERT INTO public.bingo_pool_members (pool_id, "position", vendor_id, game_id) VALUES ('fashion', 1, 'vendor-23', NULL);
INSERT INTO public.bingo_pool_members (pool_id, "position", vendor_id, game_id) VALUES ('fashion', 2, 'vendor-24', NULL);
INSERT INTO public.bingo_pool_members (pool_id, "position", vendor_id, game_id) VALUES ('fashion', 3, 'vendor-25', NULL);
INSERT INTO public.bingo_pool_members (pool_id, "position", vendor_id, game_id) VALUES ('fashion', 4, 'vendor-26', NULL);
INSERT INTO public.bingo_pool_members (pool_id, "position", vendor_id, game_id) VALUES ('fashion', 5, 'vendor-27', NULL);
INSERT INTO public.bingo_pool_members (pool_id, "position", vendor_id, game_id) VALUES ('fashion', 6, 'vendor-28', NULL);
INSERT INTO public.bingo_pool_members (pool_id, "position", vendor_id, game_id) VALUES ('fashion', 7, 'vendor-29', NULL);


-- Data for Name: bingo_squares; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.bingo_squares (id, title, prompt, area, points, row_index, col_index, completion_mode, pool_id, pool_offset) VALUES ('task-21', 'Loc Stories', 'Exchange a loc journey, care tip, or style question with another guest.', 'Social', 30, 0, 1, 'self', NULL, 0);
INSERT INTO public.bingo_squares (id, title, prompt, area, points, row_index, col_index, completion_mode, pool_id, pool_offset) VALUES ('task-05', 'Community Connection', 'Visit a community organization and learn what they offer or how to get involved.', 'Marketplace', 20, 2, 4, 'self', NULL, 0);
INSERT INTO public.bingo_squares (id, title, prompt, area, points, row_index, col_index, completion_mode, pool_id, pool_offset) VALUES ('task-20', 'Cool Down', 'Stop at Libations, check out what is available, and take a breather.', 'Libations', 10, 2, 0, 'self', NULL, 0);
INSERT INTO public.bingo_squares (id, title, prompt, area, points, row_index, col_index, completion_mode, pool_id, pool_offset) VALUES ('task-16', 'Game Stop', 'Head to the game area and play a round of the game named on this square.', 'Game Stop', 20, 1, 0, 'self', 'games', 0);
INSERT INTO public.bingo_squares (id, title, prompt, area, points, row_index, col_index, completion_mode, pool_id, pool_offset) VALUES ('task-17', 'Next Game Stop', 'Head to the game area and play a round of the game named on this square.', 'Game Stop', 20, 3, 2, 'self', 'games', 1);
INSERT INTO public.bingo_squares (id, title, prompt, area, points, row_index, col_index, completion_mode, pool_id, pool_offset) VALUES ('task-13', 'Art Wall', 'Take a photo with a visual artist who inspires you.', 'Art', 10, 0, 3, 'photo', NULL, 0);
INSERT INTO public.bingo_squares (id, title, prompt, area, points, row_index, col_index, completion_mode, pool_id, pool_offset) VALUES ('task-14', 'Next Art Wall', 'Take a photo with a visual artist who inspires you.', 'Art', 30, 0, 2, 'photo', NULL, 0);
INSERT INTO public.bingo_squares (id, title, prompt, area, points, row_index, col_index, completion_mode, pool_id, pool_offset) VALUES ('task-18', 'Loc Party Look', 'Take a photo of your Loc Party look.', 'Look', 10, 1, 4, 'photo', NULL, 0);
INSERT INTO public.bingo_squares (id, title, prompt, area, points, row_index, col_index, completion_mode, pool_id, pool_offset) VALUES ('task-01', 'Vendor Clue', 'Solve the riddle to find your booth. Enter the code word from that booth.', 'The Loc Shop', 20, 0, 0, 'vendor_code', 'loc-hair', 0);
INSERT INTO public.bingo_squares (id, title, prompt, area, points, row_index, col_index, completion_mode, pool_id, pool_offset) VALUES ('task-11', 'Who Sings the Anthem', 'Go to https://play.thelocpartyorlando.com/ and name who sings the Loc Party Anthem.', 'Internet', 20, 4, 2, 'answer', NULL, 0);
INSERT INTO public.bingo_squares (id, title, prompt, area, points, row_index, col_index, completion_mode, pool_id, pool_offset) VALUES ('task-03', 'Vendor Clue', 'Solve the riddle to find your booth. Enter the code word from that booth.', 'The Loc Shop', 20, 0, 4, 'vendor_code', 'body-care', 0);
INSERT INTO public.bingo_squares (id, title, prompt, area, points, row_index, col_index, completion_mode, pool_id, pool_offset) VALUES ('task-12', 'Comment Bingo', 'On Instagram, open @thelocpartyorlando, find the Loc Party post, and comment BINGO. Enter the code you receive. Follow the page for live event updates.', 'Internet', 20, 3, 1, 'answer', NULL, 0);
INSERT INTO public.bingo_squares (id, title, prompt, area, points, row_index, col_index, completion_mode, pool_id, pool_offset) VALUES ('task-23', 'Loc Pioneer', 'Who is one of the most recognized pioneers of dreadlocks in the U.S.?', 'Trivia', 20, 3, 4, 'answer', NULL, 0);
INSERT INTO public.bingo_squares (id, title, prompt, area, points, row_index, col_index, completion_mode, pool_id, pool_offset) VALUES ('task-15', 'Loc Trivia', 'True or false: not washing your locs will make them grow faster.', 'Trivia', 20, 4, 1, 'true_false', NULL, 0);
INSERT INTO public.bingo_squares (id, title, prompt, area, points, row_index, col_index, completion_mode, pool_id, pool_offset) VALUES ('task-24', 'Loc Trivia', 'True or false: conditioner is bad for your locs.', 'Trivia', 20, 4, 3, 'true_false', NULL, 0);
INSERT INTO public.bingo_squares (id, title, prompt, area, points, row_index, col_index, completion_mode, pool_id, pool_offset) VALUES ('task-22', 'Loc Trivia', 'True or false: locs can be formed without twisting or palm rolling.', 'Trivia', 20, 1, 2, 'true_false', NULL, 0);
INSERT INTO public.bingo_squares (id, title, prompt, area, points, row_index, col_index, completion_mode, pool_id, pool_offset) VALUES ('task-19', 'Loc Party Organizer', 'What is the name of the company that produces The Loc Party? Hint: the answer is the first part of their company name.', 'Trivia', 20, 3, 0, 'answer', NULL, 0);
INSERT INTO public.bingo_squares (id, title, prompt, area, points, row_index, col_index, completion_mode, pool_id, pool_offset) VALUES ('task-08', 'Marketplace Stop', 'Visit a marketplace booth and learn one thing they offer.', 'The Marketplace', 20, 1, 3, 'self', NULL, 0);
INSERT INTO public.bingo_squares (id, title, prompt, area, points, row_index, col_index, completion_mode, pool_id, pool_offset) VALUES ('free', 'Entwined Loc Studio', 'Head over to Entwined Loc Studio for your free gift.', 'Party', 0, 2, 2, 'free', NULL, 0);
INSERT INTO public.bingo_squares (id, title, prompt, area, points, row_index, col_index, completion_mode, pool_id, pool_offset) VALUES ('task-06', 'Hidden Gem', 'Stop at a booth you had not planned to visit and discover what they offer.', 'Marketplace', 20, 1, 1, 'self', NULL, 0);
INSERT INTO public.bingo_squares (id, title, prompt, area, points, row_index, col_index, completion_mode, pool_id, pool_offset) VALUES ('task-02', 'Vendor Clue', 'Solve the riddle to find your booth. Enter the code word from that booth.', 'The Loc Shop', 20, 4, 4, 'vendor_code', 'loc-hair', 1);
INSERT INTO public.bingo_squares (id, title, prompt, area, points, row_index, col_index, completion_mode, pool_id, pool_offset) VALUES ('task-07', 'Vendor Clue', 'Solve the riddle to find your booth. Enter the code word from that booth.', 'The Loc Shop', 20, 2, 1, 'vendor_code', 'body-care', 1);
INSERT INTO public.bingo_squares (id, title, prompt, area, points, row_index, col_index, completion_mode, pool_id, pool_offset) VALUES ('task-10', 'Wallpapers', 'Text this number and see how many wallpapers they offer.', 'Internet', 20, 3, 3, 'answer', NULL, 0);
INSERT INTO public.bingo_squares (id, title, prompt, area, points, row_index, col_index, completion_mode, pool_id, pool_offset) VALUES ('task-04', 'Vendor Clue', 'Solve the riddle to find your booth. Enter the code word from that booth.', 'Marketplace', 20, 4, 0, 'vendor_code', 'fashion', 0);
INSERT INTO public.bingo_squares (id, title, prompt, area, points, row_index, col_index, completion_mode, pool_id, pool_offset) VALUES ('task-09', 'Vendor Clue', 'Solve the riddle to find your booth. Enter the code word from that booth.', 'Marketplace', 20, 2, 3, 'vendor_code', 'fashion', 1);


-- Data for Name: bingo_square_answers; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.bingo_square_answers (square_id, answer, note) VALUES ('task-10', '6', '');
INSERT INTO public.bingo_square_answers (square_id, answer, note) VALUES ('task-12', '', '');
INSERT INTO public.bingo_square_answers (square_id, answer, note) VALUES ('task-19', 'Entwined', '');
INSERT INTO public.bingo_square_answers (square_id, answer, note) VALUES ('task-23', 'Bob Marley', '');
INSERT INTO public.bingo_square_answers (square_id, answer, note) VALUES ('task-15', 'FALSE', '');
INSERT INTO public.bingo_square_answers (square_id, answer, note) VALUES ('task-24', 'FALSE', 'False. Conditioner balances the pH of your hair, which prevents it from drying out and breaking. Rinse thoroughly.');
INSERT INTO public.bingo_square_answers (square_id, answer, note) VALUES ('task-22', 'TRUE', 'True. The hair really doesn''t need anything to loc but water and time. Water is really optional.');
INSERT INTO public.bingo_square_answers (square_id, answer, note) VALUES ('task-11', 'Katwon Turner', '');


-- Data for Name: bingo_vendor_riddles; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.bingo_vendor_riddles (id, vendor_id, clue, answer, sort_order) VALUES ('riddle-01', 'vendor-01', 'Got loc questions? Come and see,
How healthy your crown can be.
Tips and repair demos steal the show,
Find the booth that helps your locs glow.', 'Beauty Fro', 1);
INSERT INTO public.bingo_vendor_riddles (id, vendor_id, clue, answer, sort_order) VALUES ('riddle-20', 'vendor-20', 'Soft as velvet, sweet as a rose,
A lovely new fragrance delights your nose.
Body oils and perfumes fill the room,
Follow the scent of a flower in bloom.', 'Velvet Bloom', 20);
INSERT INTO public.bingo_vendor_riddles (id, vendor_id, clue, answer, sort_order) VALUES ('riddle-23', 'vendor-23', 'A mighty elephant is part of my name,
But clothing and style are my claim to fame.
Follow the threads to see what''s new,
A fresh fashion find is waiting for you.', 'Indlovu Threads', 23);
INSERT INTO public.bingo_vendor_riddles (id, vendor_id, clue, answer, sort_order) VALUES ('riddle-24', 'vendor-24', '💎 I sparkle on fingers, I shine on a chain,
Find me where treasures and jewels reign.
I''m pretty and precious, a glittery sight…
Find the spot where the gems shine bright! ✨', 'M Rochelle Jewels', 24);
INSERT INTO public.bingo_vendor_riddles (id, vendor_id, clue, answer, sort_order) VALUES ('riddle-03', 'vendor-03', 'A house with no bedrooms, but plenty of care,
Named for a goddess, come find us there.
Buildup-free locs are our special delight,
Find the house that keeps your crown light.', 'RINSECLEAR', 3);
INSERT INTO public.bingo_vendor_riddles (id, vendor_id, clue, answer, sort_order) VALUES ('riddle-04', 'vendor-04', 'A green gemstone is part of my name,
Natural hair care is part of my game.
A three-letter first name completes your clue,
Find my booth, I''m waiting for you!', 'ORCHARD', 4);
INSERT INTO public.bingo_vendor_riddles (id, vendor_id, clue, answer, sort_order) VALUES ('riddle-05', 'vendor-05', 'Some turn heads, but we spell ours with a Z,
Add LOC to the front—now who could we be?
Micro locs, interlocking, oils made to shine,
Find the booth with that name on the sign.', 'PALMROLL', 5);
INSERT INTO public.bingo_vendor_riddles (id, vendor_id, clue, answer, sort_order) VALUES ('riddle-15', 'vendor-15', 'A key unlocks a door, it''s true,
But mine brings lovely scents to you.
From body to car, there''s fragrance to share,
Follow your nose and find me there.', 'CEDAR', 15);
INSERT INTO public.bingo_vendor_riddles (id, vendor_id, clue, answer, sort_order) VALUES ('riddle-16', 'vendor-16', 'Silky-smooth skin, a beautiful glow,
A touch of heaven from head to toe.
A little self-care, something divine,
Find the booth where beauty shines.', 'LATHER', 16);
INSERT INTO public.bingo_vendor_riddles (id, vendor_id, clue, answer, sort_order) VALUES ('riddle-17', 'vendor-17', 'Good vibes and sweet scents fill the air,
With oils and little charms for your hair.
A name that rhymes with "yes" is your clue,
Find the creative booth waiting for you.', 'EMBERS', 17);
INSERT INTO public.bingo_vendor_riddles (id, vendor_id, clue, answer, sort_order) VALUES ('riddle-18', 'vendor-18', 'My name has a scent, but soap steals the show,
Handmade with nature to help your skin glow.
Bars and body butters, all made with care,
Follow the freshness and find me there.', 'CLAY', 18);
INSERT INTO public.bingo_vendor_riddles (id, vendor_id, clue, answer, sort_order) VALUES ('riddle-19', 'vendor-19', 'From plants and petals, good things grow,
Little skincare must-haves help you glow.
Think of the outdoors and what you need,
Find the booth where nature takes the lead.', 'CANOPY', 19);
INSERT INTO public.bingo_vendor_riddles (id, vendor_id, clue, answer, sort_order) VALUES ('riddle-21', 'vendor-21', 'You might think of bees when you hear my name,
But skin and body care is my game.
Add a little healing to the plot,
Then find the booth with the honey pot.', 'NECTAR', 21);
INSERT INTO public.bingo_vendor_riddles (id, vendor_id, clue, answer, sort_order) VALUES ('riddle-25', 'vendor-25', 'Three little letters begin my name,
Bonnets and scrunchies are part of my game.
Bags and keychains, treasures to show,
Find the shop with goodies to go!', 'TPCOnlineShop.com', 25);
INSERT INTO public.bingo_vendor_riddles (id, vendor_id, clue, answer, sort_order) VALUES ('riddle-26', 'vendor-26', 'Beads at your waist, some shine on your wrist,
Locs get some love—don''t miss this twist.
Three little letters will show you the way,
Find all these treasures on display.', 'TYA', 26);
INSERT INTO public.bingo_vendor_riddles (id, vendor_id, clue, answer, sort_order) VALUES ('riddle-27', 'vendor-27', 'Images and streetwear come together just right,
With prints and keychains made bold and bright.
A name with two parts is part of the trail,
Find the creative booth called Ju-Nel.', 'Ju-Nel', 27);
INSERT INTO public.bingo_vendor_riddles (id, vendor_id, clue, answer, sort_order) VALUES ('riddle-28', 'vendor-28', 'Red, gold, and green with roots running deep,
Culture and pride are treasures we keep.
Think of the city, then think of a man,
Put them together and find me if you can.', 'Urban Rastaman', 28);
INSERT INTO public.bingo_vendor_riddles (id, vendor_id, clue, answer, sort_order) VALUES ('riddle-29', 'vendor-29', 'Some treasures sparkle, some treasures grow,
With leaves and roots they steal the show.
A gem of a find, fresh and green,
Discover the prettiest plants you''ve seen.', 'Gemi Green', 29);
INSERT INTO public.bingo_vendor_riddles (id, vendor_id, clue, answer, sort_order) VALUES ('riddle-30', 'vendor-30', 'Not every gift comes wrapped in a bow,
Some shine in the people you come to know.
Big dreams and visions are part of the clue,
Find the nonprofit that believes in you.', 'Gifted Ones', 30);
INSERT INTO public.bingo_vendor_riddles (id, vendor_id, clue, answer, sort_order) VALUES ('riddle-32', 'vendor-32', 'Some tea gets spilled, but there''s no cup,
Just real-life wisdom to lift you up.
Big dreams and purpose are leading the way,
Find the booth with something to say.', 'Spill the T.E.A.', 32);


-- Data for Name: schedule_items; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.schedule_items (id, time_label, title, description, active, sort_order) VALUES ('30000000-0000-4000-8000-000000000001', 'TBD', 'Doors open / registration', 'Placeholder schedule item — edit in Admin.', true, 1);
INSERT INTO public.schedule_items (id, time_label, title, description, active, sort_order) VALUES ('30000000-0000-4000-8000-000000000002', 'TBD', 'Placeholder activity block', 'Placeholder schedule item — edit in Admin.', true, 2);


-- Data for Name: vendors; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.vendors (id, name, category, description, location, logo_url, is_featured, active, sort_order) VALUES ('f574d762-d2ae-46ec-b7f4-623467406d42', 'Beauty Fro', 'Loc & Hair Care', 'Consultations, repair demos, loc care tips', 'The Marketplace', 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/beauty-fro.png', false, true, 1);
INSERT INTO public.vendors (id, name, category, description, location, logo_url, is_featured, active, sort_order) VALUES ('439695b4-c406-48d3-9025-be658ec06ea3', 'House of Isis', 'Loc & Hair Care', 'Buildup-free loc care and natural hair products', 'The Loc Shop', 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/house-of-isis.png', true, true, 3);
INSERT INTO public.vendors (id, name, category, description, location, logo_url, is_featured, active, sort_order) VALUES ('03046867-950d-48e6-acf8-a2841993acb0', 'Kim Jade', 'Loc & Hair Care', 'Natural organic hair care', 'The Loc Shop', 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/kim-jade.png', true, true, 4);
INSERT INTO public.vendors (id, name, category, description, location, logo_url, is_featured, active, sort_order) VALUES ('a105da3a-2fa0-44bf-be9f-f0271afef130', 'LOC HEADZ', 'Loc & Hair Care', 'Micro locs, interlocking, and oils', 'The Loc Shop', 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/loc-headz.png', true, true, 5);
INSERT INTO public.vendors (id, name, category, description, location, logo_url, is_featured, active, sort_order) VALUES ('278175cf-d80b-4584-b997-fb47cf9c327e', 'A3 Confections', 'Food & Treats', 'Croffles with toppings', 'The Marketplace', 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/a3-confections.png', false, true, 8);
INSERT INTO public.vendors (id, name, category, description, location, logo_url, is_featured, active, sort_order) VALUES ('a5807a66-59df-41a4-8486-128c32815a83', 'Brothers Millennial', 'Food & Treats', 'Real fruit popsicles', 'The Marketplace', 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/brothers-millennial.png', false, true, 9);
INSERT INTO public.vendors (id, name, category, description, location, logo_url, is_featured, active, sort_order) VALUES ('72404946-2d04-4e09-9a0d-d359002e930b', 'Candyland Designs', 'Food & Treats', 'Couture cakes and cocktails', 'The Marketplace', 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/candyland-designs.png', false, true, 10);
INSERT INTO public.vendors (id, name, category, description, location, logo_url, is_featured, active, sort_order) VALUES ('7d3353c5-4225-4a4d-9d97-aef55e9e6017', 'Chelsea''s Snatchin'' Kitchen', 'Food & Treats', 'Wings, burgers, hot dogs, fries, sodas, cookies', 'The Marketplace', 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/chelseas-kitchen.png', false, true, 11);
INSERT INTO public.vendors (id, name, category, description, location, logo_url, is_featured, active, sort_order) VALUES ('1bd799c1-0ea0-4299-995e-85ce66651bd0', 'Kitchen Arrabon', 'Food & Treats', 'Cakes, cookies, baked goods', 'The Marketplace', 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/kitchen-arrabon.png', false, true, 13);
INSERT INTO public.vendors (id, name, category, description, location, logo_url, is_featured, active, sort_order) VALUES ('897e6abc-8389-420f-b968-a30988e54486', 'The Flavor District', 'Food & Treats', '$5 cakes', 'The Marketplace', 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/flavor-district.png', false, true, 14);
INSERT INTO public.vendors (id, name, category, description, location, logo_url, is_featured, active, sort_order) VALUES ('94aed87d-aebe-43f4-8bff-31d26a921469', 'A Key Scent', 'Body Care & Fragrance', 'Body care, teas, skincare, car fragrance', 'The Loc Shop', 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/a-key-scent.png', true, true, 15);
INSERT INTO public.vendors (id, name, category, description, location, logo_url, is_featured, active, sort_order) VALUES ('560a091f-f6eb-4997-841a-b256e01576bd', 'Aly Divinely Yu', 'Body Care & Fragrance', 'Hair oils, body oils, lotions, soaps', 'The Loc Shop', 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/divinely-yu.png', true, true, 16);
INSERT INTO public.vendors (id, name, category, description, location, logo_url, is_featured, active, sort_order) VALUES ('0a4d2fa2-19e9-4f8f-9bdb-102744e333b1', 'D³ Cuisines', 'Food & Treats', 'Caribbean-Southern bowls, seafood rice, juices', 'The Marketplace', 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/d3-cuisines.png', false, true, 12);
INSERT INTO public.vendors (id, name, category, description, location, logo_url, is_featured, active, sort_order) VALUES ('3f460a5d-5260-42fc-8e47-54a76d37f02a', 'Entwined Loc Studio', 'Loc & Hair Care', 'Loc studio', 'The Marketplace', 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/a73ea981-a42a-44ca-9727-d82429659d71/vendor-8525e0cb-3e89-4638-aa5a-b06540cf6b41.jpg?v=1790516583323', false, true, 0);
INSERT INTO public.vendors (id, name, category, description, location, logo_url, is_featured, active, sort_order) VALUES ('137211d5-4198-42ff-b132-8ef3f727254f', 'Na'' Scent Organics', 'Body Care & Fragrance', 'Handmade skincare', 'The Loc Shop', 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/na-scent-organics.png', true, true, 18);
INSERT INTO public.vendors (id, name, category, description, location, logo_url, is_featured, active, sort_order) VALUES ('b645a0a8-2504-4dd7-a386-e575c42834d3', 'Nature''s Essentials', 'Body Care & Fragrance', 'Skin care', 'The Loc Shop', 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/natures-essentials.png', true, true, 19);
INSERT INTO public.vendors (id, name, category, description, location, logo_url, is_featured, active, sort_order) VALUES ('ad7f935c-7372-43cf-acb5-e63049520298', 'Velvet Bloom', 'Body Care & Fragrance', 'Perfume and body oils', 'The Marketplace', 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/velvet-bloom.png', false, true, 20);
INSERT INTO public.vendors (id, name, category, description, location, logo_url, is_featured, active, sort_order) VALUES ('f1b4904e-66d1-4f17-bb06-b71a994e86ee', 'The Healing Honeypot', 'Body Care & Fragrance', 'Skin and body care', 'The Loc Shop', 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/healing-honeypot.png', true, true, 21);
INSERT INTO public.vendors (id, name, category, description, location, logo_url, is_featured, active, sort_order) VALUES ('608df21c-deeb-472a-b6a9-7f009f2c6747', 'Adina Kajoy', 'Fashion, Accessories & Gifts', 'Beauty, fashion, and lifestyle', 'The Marketplace', 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/adina-kajoy.png', false, true, 22);
INSERT INTO public.vendors (id, name, category, description, location, logo_url, is_featured, active, sort_order) VALUES ('ae5e8728-ce94-4abd-84f8-6e93d12952c3', 'Indlovu Threads', 'Fashion, Accessories & Gifts', 'Clothing', 'The Marketplace', 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/indlovu-threads.png', false, true, 23);
INSERT INTO public.vendors (id, name, category, description, location, logo_url, is_featured, active, sort_order) VALUES ('7a63f975-d882-408d-bda9-a1f276357f57', 'M Rochelle Jewels', 'Fashion, Accessories & Gifts', 'Jewelry', 'The Marketplace', 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/m-rochelle-jewels.png', false, true, 24);
INSERT INTO public.vendors (id, name, category, description, location, logo_url, is_featured, active, sort_order) VALUES ('743a9e96-6307-421b-94ce-ee9bd6863233', 'TPCOnlineShop.com', 'Fashion, Accessories & Gifts', 'Bonnets, scrunchies, bags, keychains', 'The Marketplace', 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/tpconlineshop.png', false, true, 25);
INSERT INTO public.vendors (id, name, category, description, location, logo_url, is_featured, active, sort_order) VALUES ('8f1eae3d-0b77-48c9-af17-b19c8e3420da', 'TYA', 'Fashion, Accessories & Gifts', 'Waist beads, bracelets, and loc products', 'The Marketplace', 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/tya.png', false, true, 26);
INSERT INTO public.vendors (id, name, category, description, location, logo_url, is_featured, active, sort_order) VALUES ('38d71fa4-2a0e-491d-bbaf-dda666a0f581', 'Ju-Nel', 'Fashion, Accessories & Gifts', 'Luxury street energy', 'The Marketplace', 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/ju-nel.png', false, true, 27);
INSERT INTO public.vendors (id, name, category, description, location, logo_url, is_featured, active, sort_order) VALUES ('d1bf27c1-bebc-4620-a8cc-92948f3dbf4a', 'Urban Rastaman', 'Fashion, Accessories & Gifts', 'Rasta culture', 'The Marketplace', 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/urban-rastaman.png', false, true, 28);
INSERT INTO public.vendors (id, name, category, description, location, logo_url, is_featured, active, sort_order) VALUES ('5bfdb35e-cba8-4468-8405-d34bdd698a62', 'Gemi Green', 'Fashion, Accessories & Gifts', 'Plants', 'The Marketplace', 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/gemi-green.png', false, true, 29);
INSERT INTO public.vendors (id, name, category, description, location, logo_url, is_featured, active, sort_order) VALUES ('e17d7f9c-3acf-44ce-b905-05c7afd4eee1', 'Gifted Ones', 'Community & Services', 'Visionary non-profit', 'Game Stop', 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/gifted-ones.png', false, true, 30);
INSERT INTO public.vendors (id, name, category, description, location, logo_url, is_featured, active, sort_order) VALUES ('0733e6cb-b9be-4262-8b63-04fbb59a42c2', 'Spill the T.E.A.', 'Community & Services', 'Soulful, strategic living', 'Game Stop', 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/spill-the-tea.png', false, true, 31);
INSERT INTO public.vendors (id, name, category, description, location, logo_url, is_featured, active, sort_order) VALUES ('02b73152-0ea4-42aa-980b-751b9637837e', 'Tat Like Tattoo', 'Food & Treats', 'Selling lemonade', 'The Marketplace', 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/tat-like-tattoo.png', false, true, 32);
INSERT INTO public.vendors (id, name, category, description, location, logo_url, is_featured, active, sort_order) VALUES ('a0d996fc-4ad2-4283-ad7e-f3a815404842', 'Jess Vibez Creations', 'Loc & Hair Care', 'Oils, body butters, incense, hair charms', 'The Loc Shop', 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/jess-vibez.png', true, true, 17);
INSERT INTO public.vendors (id, name, category, description, location, logo_url, is_featured, active, sort_order) VALUES ('8f458c71-6259-49c1-90b6-2d094f2428f8', 'Midway Specialty Care Center', 'Community & Services', 'Sexual health care.', '', 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/midway-specialty-care.png', false, true, 32);
INSERT INTO public.vendors (id, name, category, description, location, logo_url, is_featured, active, sort_order) VALUES ('75edf511-00b2-4dfd-8769-95228f55363b', 'Booksy', 'Community & Services', 'Book appointments', '', NULL, false, true, 33);


-- Data for Name: venue_areas; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.venue_areas (id, title, description, active, sort_order) VALUES ('71000000-0000-4000-8000-000000000001', 'Visual Arts Gallerie', 'Art & creative discovery', true, 1);
INSERT INTO public.venue_areas (id, title, description, active, sort_order) VALUES ('71000000-0000-4000-8000-000000000002', 'The Loc Shop', 'Loc care & beauty', true, 2);
INSERT INTO public.venue_areas (id, title, description, active, sort_order) VALUES ('71000000-0000-4000-8000-000000000003', 'The Marketplace', 'Vendor exploration', true, 3);
INSERT INTO public.venue_areas (id, title, description, active, sort_order) VALUES ('71000000-0000-4000-8000-000000000004', 'Game Stop', 'Physical play & challenges', true, 4);
INSERT INTO public.venue_areas (id, title, description, active, sort_order) VALUES ('71000000-0000-4000-8000-000000000007', 'Main Stage', 'Live performances', true, 5);

alter table public.guests
  add column if not exists bingo_rotation jsonb;

with ordered as (
  select id, (row_number() over (order by created_at nulls last, id) - 1) as slot
  from public.guests
)
update public.guests g
set bingo_rotation = sub.rotation
from (
  select o.id,
    (
      select coalesce(jsonb_object_agg(r.pool_id, o.slot % c.cnt), '{}'::jsonb)
      from public.bingo_rotation r
      join lateral (
        select count(*)::integer as cnt
        from public.bingo_pool_members m
        where m.pool_id = r.pool_id
      ) c on c.cnt > 0
    ) as rotation
  from ordered o
) sub
where g.id = sub.id;

update public.bingo_rotation r
set current_index = (select count(*)::integer from public.guests) % (
  select count(*)::integer from public.bingo_pool_members m where m.pool_id = r.pool_id
);

alter table public.guests
  alter column bingo_rotation set default '{}'::jsonb;

alter table public.guests
  alter column bingo_rotation set not null;

drop trigger if exists guests_assign_bingo_rotation on public.guests;
create trigger guests_assign_bingo_rotation
  before insert on public.guests
  for each row
  execute function public.assign_bingo_rotation();

alter publication supabase_realtime add table public.bingo_squares;
alter publication supabase_realtime add table public.bingo_rotation;
alter publication supabase_realtime add table public.bingo_completions;
alter publication supabase_realtime add table public.venue_areas;

do $$
declare
  rec record;
  now_digest text;
  now_n integer;
begin
  for rec in select * from _guard loop
    if rec.kind = 'guests' then
      select md5(coalesce(string_agg(row_to_json(g)::text, '|' order by g.id::text), '')), count(*)::integer
        into now_digest, now_n
      from (
        select id, auth_user_id, display_name, photo_url, look_photo_url, here_for,
               relationship_status_id, relationship_theme, created_at
        from public.guests
      ) g;
    elsif rec.kind = 'points' then
      select md5(coalesce(string_agg(row_to_json(p)::text, '|' order by p.id::text), '')), count(*)::integer
        into now_digest, now_n
      from public.points_ledger p;
    elsif rec.kind = 'auth' then
      select md5(coalesce(string_agg(u.id::text, '|' order by u.id::text), '')), count(*)::integer
        into now_digest, now_n
      from auth.users u;
    elsif rec.kind = 'raffle' then
      select md5(coalesce(string_agg(row_to_json(r)::text, '|' order by r.id::text), '')), count(*)::integer
        into now_digest, now_n
      from public.raffle_ledger r;
    elsif rec.kind = 'challenges' then
      select md5(coalesce(string_agg(row_to_json(c)::text, '|' order by c.id::text), '')), count(*)::integer
        into now_digest, now_n
      from (
        select id, title, description, category, location, point_value, entry_value,
               proof_type, unlock, completion_message, active, sort_order, created_at, choices
        from public.challenges
      ) c;
    elsif rec.kind = 'completions' then
      select md5(coalesce(string_agg(id::text, '|' order by id::text), '')), count(*)::integer
        into now_digest, now_n
      from public.completions;
    end if;

    if now_digest is distinct from rec.digest or now_n is distinct from rec.n then
      raise exception 'cutover changed %', rec.kind;
    end if;
  end loop;

  if exists (select 1 from public.guests where bingo_rotation is null or bingo_rotation = '{}'::jsonb) then
    raise exception 'a guest is missing a bingo rotation';
  end if;

  if (select count(*) from public.bingo_squares) <> 25 then
    raise exception 'bingo card does not have 25 squares';
  end if;

  if (select count(*) from public.vendors) <> 32 then
    raise exception 'vendor count is not the development list';
  end if;
end $$;

commit;
