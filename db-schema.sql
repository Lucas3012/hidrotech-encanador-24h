-- ============================================================
-- HidroTech — base de chamados (pedidos)
-- Executado no SQL Editor do Supabase
-- ============================================================

create table if not exists public.chamados (
  protocolo     text primary key,
  nome          text not null default '',
  telefone      text not null default '',
  servico       text not null default '',
  urgencia      text not null default 'Normal',
  endereco      text not null default '',
  descricao     text not null default '',
  origem        text not null default 'chat',
  status        text not null default 'recebido',
  nota          text not null default '',
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint chamados_status_ok
    check (status in ('recebido','em_atendimento','a_caminho','concluido','cancelado'))
);

create index if not exists chamados_criado_idx on public.chamados (criado_em desc);
create index if not exists chamados_status_idx on public.chamados (status);

-- Ninguém lê/escreve a tabela direto: tudo passa pelas funções (RPC)
revoke all on table public.chamados from anon, authenticated;
alter table public.chamados enable row level security;

-- ------------------------------------------------------------
-- Gera um protocolo único (ex.: HIDRO-K7M2P)
-- ------------------------------------------------------------
create or replace function public.gerar_protocolo()
returns text
language plpgsql security definer set search_path = public, pg_catalog
as $$
declare
  alfabeto text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  proto text;
  i int;
begin
  loop
    proto := 'HIDRO-';
    for i in 1..5 loop
      proto := proto || substr(alfabeto, floor(random() * 32)::int + 1, 1);
    end loop;
    exit when not exists (select 1 from public.chamados c where c.protocolo = proto);
  end loop;
  return proto;
end;
$$;

-- ------------------------------------------------------------
-- Cria um chamado (usado pelo chat, pelo formulário e pelo WhatsApp)
-- ------------------------------------------------------------
create or replace function public.criar_chamado(
  p_nome text default '',
  p_telefone text default '',
  p_servico text default '',
  p_urgencia text default 'Normal',
  p_endereco text default '',
  p_descricao text default '',
  p_origem text default 'chat'
)
returns text
language plpgsql security definer set search_path = public, pg_catalog
as $$
declare proto text;
begin
  proto := public.gerar_protocolo();
  insert into public.chamados
    (protocolo, nome, telefone, servico, urgencia, endereco, descricao, origem)
  values
    (proto,
     left(coalesce(p_nome, ''), 120),
     left(coalesce(p_telefone, ''), 40),
     left(coalesce(p_servico, ''), 120),
     left(coalesce(p_urgencia, ''), 60),
     left(coalesce(p_endereco, ''), 255),
     left(coalesce(p_descricao, ''), 1000),
     left(coalesce(p_origem, ''), 30));
  return proto;
end;
$$;

-- ------------------------------------------------------------
-- Consulta pública por protocolo (cliente vê status; sem dados sensíveis)
-- ------------------------------------------------------------
create or replace function public.consultar_chamado(p_protocolo text)
returns table (
  protocolo text,
  nome text,
  servico text,
  urgencia text,
  status text,
  nota text,
  criado_em timestamptz,
  atualizado_em timestamptz
)
language sql stable security definer set search_path = public, pg_catalog
as $$
  select c.protocolo, c.nome, c.servico, c.urgencia,
         c.status, c.nota, c.criado_em, c.atualizado_em
  from public.chamados c
  where c.protocolo = upper(trim(coalesce(p_protocolo, '')))
  limit 1;
$$;

-- ------------------------------------------------------------
-- Painel administrativo (exige login)
-- ------------------------------------------------------------
create or replace function public.listar_chamados()
returns setof public.chamados
language plpgsql stable security definer set search_path = public, pg_catalog
as $$
begin
  if auth.uid() is null then
    raise exception 'nao_autenticado';
  end if;
  return query
    select * from public.chamados c order by c.criado_em desc limit 500;
end;
$$;

create or replace function public.atualizar_chamado(
  p_protocolo text,
  p_status text,
  p_nota text default null
)
returns void
language plpgsql security definer set search_path = public, pg_catalog
as $$
begin
  if auth.uid() is null then
    raise exception 'nao_autenticado';
  end if;
  if coalesce(p_status, '') not in ('recebido','em_atendimento','a_caminho','concluido','cancelado') then
    raise exception 'status_invalido';
  end if;
  update public.chamados
     set status = p_status,
         nota = coalesce(p_nota, nota),
         atualizado_em = now()
   where protocolo = upper(trim(coalesce(p_protocolo, '')));
end;
$$;

create or replace function public.excluir_chamado(p_protocolo text)
returns void
language plpgsql security definer set search_path = public, pg_catalog
as $$
begin
  if auth.uid() is null then
    raise exception 'nao_autenticado';
  end if;
  delete from public.chamados
   where protocolo = upper(trim(coalesce(p_protocolo, '')));
end;
$$;

-- ------------------------------------------------------------
-- Permissões: anônimo só cria e consulta; admin só com login
-- ------------------------------------------------------------
revoke all on function public.gerar_protocolo() from public, anon, authenticated;
grant execute on function public.gerar_protocolo() to postgres;

revoke all on function public.criar_chamado(text, text, text, text, text, text, text) from public;
grant execute on function public.criar_chamado(text, text, text, text, text, text, text) to anon, authenticated;

revoke all on function public.consultar_chamado(text) from public;
grant execute on function public.consultar_chamado(text) to anon, authenticated;

revoke all on function public.listar_chamados() from public, anon;
grant execute on function public.listar_chamados() to authenticated;

revoke all on function public.atualizar_chamado(text, text, text) from public, anon;
grant execute on function public.atualizar_chamado(text, text, text) to authenticated;

revoke all on function public.excluir_chamado(text) from public, anon;
grant execute on function public.excluir_chamado(text) to authenticated;

-- ============================================================
-- Anexos do chat (foto/vídeo do local)
-- ============================================================

-- Colunas do anexo enviado pelo chat do site
alter table public.chamados
  add column if not exists anexo_url  text not null default '',
  add column if not exists anexo_tipo text not null default '';

-- ------------------------------------------------------------
-- Vincula o arquivo enviado (Supabase Storage) ao chamado.
-- Só aceita protocolo criado há menos de 24h — evita que alguém
-- sobrescreva o anexo de um chamado antigo.
-- ------------------------------------------------------------
create or replace function public.anexar_chamado(
  p_protocolo text,
  p_url text,
  p_tipo text default ''
)
returns void
language plpgsql security definer set search_path = public, pg_catalog
as $$
begin
  update public.chamados
     set anexo_url     = left(coalesce(p_url, ''), 500),
         anexo_tipo    = left(coalesce(p_tipo, ''), 20),
         atualizado_em = now()
   where protocolo = upper(trim(coalesce(p_protocolo, '')))
     and criado_em > now() - interval '24 hours';
end;
$$;

revoke all on function public.anexar_chamado(text, text, text) from public;
grant execute on function public.anexar_chamado(text, text, text) to anon, authenticated;

-- ------------------------------------------------------------
-- Bucket de anexos (URL pública: só quem tem o link enxerga)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('anexos', 'anexos', true)
on conflict (id) do update set public = true;

drop policy if exists "anexos leitura publica" on storage.objects;
create policy "anexos leitura publica"
  on storage.objects for select
  using (bucket_id = 'anexos');

drop policy if exists "anexos upload visitante" on storage.objects;
create policy "anexos upload visitante"
  on storage.objects for insert to anon
  with check (bucket_id = 'anexos');

drop policy if exists "anexos upload admin" on storage.objects;
create policy "anexos upload admin"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'anexos');
