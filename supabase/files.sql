-- Drive: folder tree with per-folder sharing.
-- Run after schema.sql and avatars.sql, in SQL Editor -> New query -> Run.
--
-- DESIGN NOTE 1 — the hierarchy lives here, not in Storage.
-- Files are stored flat as <uploader_id>/<uuid>.webp. Storage has no rename, so
-- mirroring folder paths into object keys would make renaming a folder a
-- copy-and-delete of every object beneath it: slow, non-atomic, and it breaks
-- signed URLs already issued. Keeping the tree in Postgres makes a rename or a
-- move one UPDATE of one row, for three files or thirty thousand.
--
-- DESIGN NOTE 2 — access is inherited, and resolved by one function.
-- Sharing a folder shares everything inside it. Rather than copying grants onto
-- descendants (which then drift), node_role() walks from a node up to the root
-- and reports the strongest role found. Every policy below calls it, so there
-- is exactly one definition of "can see this".

create table if not exists public.nodes (
  id uuid primary key default gen_random_uuid(),
  -- Who created it. Not the only person who can reach it: see node_grants.
  user_id uuid not null references auth.users (id) on delete cascade,
  parent_id uuid references public.nodes (id) on delete cascade,

  kind text not null check (kind in ('folder', 'file')),

  -- Slashes are banned so a name can never be mistaken for a path.
  name text not null check (
    char_length(name) between 1 and 255
    and name !~ '/'
    and name not in ('.', '..')
  ),

  storage_path text unique,
  mime_type text,
  byte_size bigint check (byte_size is null or byte_size >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint nodes_file_shape check (
    (kind = 'file' and storage_path is not null)
    or (kind = 'folder' and storage_path is null and byte_size is null)
  )
);

-- "Children of X, folders first, alphabetical" is the hottest query here.
create index if not exists nodes_parent_idx
  on public.nodes (parent_id, kind, name);

create index if not exists nodes_owner_idx
  on public.nodes (user_id);

-- Siblings cannot share a name, compared case-insensitively. Two indexes are
-- required because Postgres treats NULLs as distinct, so one index including
-- parent_id would not constrain top-level names at all.
create unique index if not exists nodes_sibling_name_key
  on public.nodes (parent_id, lower(name))
  where parent_id is not null;

create unique index if not exists nodes_root_name_key
  on public.nodes (user_id, lower(name))
  where parent_id is null;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

create table if not exists public.node_grants (
  id uuid primary key default gen_random_uuid(),
  node_id uuid not null references public.nodes (id) on delete cascade,
  grantee uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('viewer', 'editor')),
  created_at timestamptz not null default now(),
  -- One role per person per node. Changing a role is an update, not a pile-up.
  unique (node_id, grantee)
);

create index if not exists node_grants_grantee_idx
  on public.node_grants (grantee);

-- ---------------------------------------------------------------------------
-- Access resolution
-- ---------------------------------------------------------------------------

-- Strongest role `who` holds on `target`: 'owner', 'editor', 'viewer' or NULL.
--
-- SECURITY DEFINER is load-bearing. The policies on public.nodes call this
-- function, so if it read nodes as the caller it would re-enter those policies
-- and recurse forever. As definer it runs as the table owner, which bypasses
-- RLS, reads the ancestor chain directly, and returns a plain verdict.
create or replace function public.node_role(target uuid, who uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  with recursive chain as (
    select n.id, n.parent_id, n.user_id
      from public.nodes n
     where n.id = target
    union all
    select n.id, n.parent_id, n.user_id
      from public.nodes n
      join chain c on n.id = c.parent_id
  )
  select case
    -- Ownership of the node itself, or of any folder above it.
    when exists (select 1 from chain where user_id = who)
      then 'owner'
    when exists (
      select 1 from public.node_grants g
        join chain c on g.node_id = c.id
       where g.grantee = who and g.role = 'editor'
    ) then 'editor'
    when exists (
      select 1 from public.node_grants g
        join chain c on g.node_id = c.id
       where g.grantee = who and g.role = 'viewer'
    ) then 'viewer'
    else null
  end;
$$;

grant execute on function public.node_role(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Integrity that CHECK constraints cannot express
-- ---------------------------------------------------------------------------

-- A CHECK cannot run subqueries, so parentage needs a trigger: the parent must
-- exist, be a folder, and the author must hold owner or editor on it. Editors
-- contributing to a folder they do not own is exactly the case that makes the
-- naive "parent owner must equal node owner" rule wrong.
create or replace function public.nodes_validate()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  parent_kind text;
  caller_role text;
  walker uuid;
begin
  if new.parent_id is not null then
    if new.parent_id = new.id then
      raise exception 'a folder cannot contain itself';
    end if;

    select kind into parent_kind
      from public.nodes where id = new.parent_id;

    if parent_kind is null then
      raise exception 'parent folder does not exist';
    end if;
    if parent_kind <> 'folder' then
      raise exception 'only folders can contain other nodes';
    end if;

    caller_role := public.node_role(new.parent_id, new.user_id);
    if caller_role is null or caller_role = 'viewer' then
      raise exception 'you need edit access to that folder';
    end if;

    -- Walk upward; meeting ourselves means the move would create a cycle and
    -- orphan the branch into something unreachable.
    walker := new.parent_id;
    while walker is not null loop
      if walker = new.id then
        raise exception 'cannot move a folder into its own subtree';
      end if;
      select parent_id into walker from public.nodes where id = walker;
    end loop;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists nodes_validate_trg on public.nodes;
create trigger nodes_validate_trg
  before insert or update on public.nodes
  for each row execute function public.nodes_validate();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.nodes enable row level security;

drop policy if exists "Read nodes you can access" on public.nodes;
create policy "Read nodes you can access"
  on public.nodes for select to authenticated
  using (public.node_role(id, auth.uid()) is not null);

-- You may only create rows in your own name, and only inside a folder you can
-- edit. The trigger above enforces the second half as well, so a direct API
-- call cannot slip past it.
drop policy if exists "Create nodes where permitted" on public.nodes;
create policy "Create nodes where permitted"
  on public.nodes for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      parent_id is null
      or public.node_role(parent_id, auth.uid()) in ('owner', 'editor')
    )
  );

-- Covers rename and move. Checked on both sides, so a row cannot be pushed
-- somewhere the caller has no access to.
drop policy if exists "Update nodes you can edit" on public.nodes;
create policy "Update nodes you can edit"
  on public.nodes for update to authenticated
  using (public.node_role(id, auth.uid()) in ('owner', 'editor'))
  with check (public.node_role(id, auth.uid()) in ('owner', 'editor'));

drop policy if exists "Delete nodes you can edit" on public.nodes;
create policy "Delete nodes you can edit"
  on public.nodes for delete to authenticated
  using (public.node_role(id, auth.uid()) in ('owner', 'editor'));

alter table public.node_grants enable row level security;

-- Owners manage sharing; a grantee may see the grant that concerns them, so
-- the app can show "shared with you" without exposing the whole access list.
drop policy if exists "Read relevant grants" on public.node_grants;
create policy "Read relevant grants"
  on public.node_grants for select to authenticated
  using (
    grantee = auth.uid()
    or public.node_role(node_id, auth.uid()) = 'owner'
  );

drop policy if exists "Owners create grants" on public.node_grants;
create policy "Owners create grants"
  on public.node_grants for insert to authenticated
  with check (public.node_role(node_id, auth.uid()) = 'owner');

drop policy if exists "Owners change grants" on public.node_grants;
create policy "Owners change grants"
  on public.node_grants for update to authenticated
  using (public.node_role(node_id, auth.uid()) = 'owner')
  with check (public.node_role(node_id, auth.uid()) = 'owner');

drop policy if exists "Owners revoke grants" on public.node_grants;
create policy "Owners revoke grants"
  on public.node_grants for delete to authenticated
  using (public.node_role(node_id, auth.uid()) = 'owner');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Breadcrumb trail, root first. Output names are prefixed to avoid colliding
-- with the table's own column names inside the function body.
create or replace function public.node_chain(target uuid)
returns table (node_id uuid, node_name text, node_depth int)
language sql
stable
security invoker
set search_path = ''
as $$
  with recursive up as (
    select n.id, n.name, n.parent_id, 0 as depth
      from public.nodes n
     where n.id = target
    union all
    select n.id, n.name, n.parent_id, up.depth + 1
      from public.nodes n
      join up on n.id = up.parent_id
  )
  select id, name, depth from up order by depth desc;
$$;

grant execute on function public.node_chain(uuid) to authenticated;

-- Every file at or beneath a node. Call this BEFORE deleting a folder: the
-- ON DELETE CASCADE removes rows, but Postgres has no idea Storage exists.
-- Skipping it leaves files nothing references and nothing will ever delete.
create or replace function public.descendant_files(root uuid)
returns table (file_id uuid, file_path text)
language sql
stable
security invoker
set search_path = ''
as $$
  with recursive down as (
    select n.id, n.parent_id, n.kind, n.storage_path
      from public.nodes n
     where n.id = root
    union all
    select n.id, n.parent_id, n.kind, n.storage_path
      from public.nodes n
      join down on n.parent_id = down.id
  )
  select id, storage_path
    from down
   where kind = 'file' and storage_path is not null;
$$;

grant execute on function public.descendant_files(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage policies for the private Drive bucket
-- ---------------------------------------------------------------------------
-- Objects are keyed <uploader_id>/<uuid>.webp. Uploads land in your own folder,
-- but READS are governed by the node that references the file — otherwise an
-- owner could not open a file an editor contributed to their folder.
-- There is deliberately no policy for anon: files are served only through
-- short-lived signed URLs minted for someone who has access.

drop policy if exists "Users read own drive files" on storage.objects;
drop policy if exists "Read drive files you can access" on storage.objects;
create policy "Read drive files you can access"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'Drive'
    and exists (
      select 1 from public.nodes n
       where n.storage_path = storage.objects.name
         and public.node_role(n.id, auth.uid()) is not null
    )
  );

drop policy if exists "Users upload own drive files" on storage.objects;
create policy "Users upload own drive files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'Drive'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Deleting the object is allowed to the uploader, or to anyone with edit rights
-- on the node that points at it.
drop policy if exists "Users delete own drive files" on storage.objects;
drop policy if exists "Delete drive files you can edit" on storage.objects;
create policy "Delete drive files you can edit"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'Drive'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.nodes n
         where n.storage_path = storage.objects.name
           and public.node_role(n.id, auth.uid()) in ('owner', 'editor')
      )
    )
  );
