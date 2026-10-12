begin;
-- Requests are explicit operational decisions, not a blanket identity-document rule.
create table public.document_requests (
 id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles(id), package_id uuid references public.packages(id),
 document_type text not null check(document_type in ('invoice','payment_proof','other')),
 instructions text not null check(length(trim(instructions)) between 10 and 2000),
 status text not null default 'requested' check(status in ('requested','uploaded','under_review','approved','rejected','waived')),
 version integer not null default 0, created_by uuid not null references public.profiles(id), created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index document_requests_customer on public.document_requests(profile_id,created_at desc);
create index document_requests_package on public.document_requests(package_id);
create index document_requests_actor on public.document_requests(created_by);
create table public.document_uploads (
 id uuid primary key default gen_random_uuid(), request_id uuid not null references public.document_requests(id), profile_id uuid not null references public.profiles(id),
 version integer not null, object_path text not null unique, filename text not null check(length(filename) between 1 and 120 and filename !~ '[/\\]'),
 declared_mime text not null check(declared_mime in ('application/pdf','image/jpeg','image/png')), declared_size integer not null check(declared_size between 1 and 10485760),
 actual_mime text, actual_size integer, sha256 text check(sha256 ~ '^[a-f0-9]{64}$'),
 scan_state text not null default 'awaiting_upload' check(scan_state in ('awaiting_upload','pending','clean','infected','error','invalid')),
 scan_evidence text, scanned_at timestamptz, amount numeric(12,2) check(amount>0 and amount<=1000000), currency text check(currency in ('USD','JMD')), merchant text not null default '' check(length(merchant)<=160), order_reference text not null default '' check(length(order_reference)<=120),
 created_at timestamptz not null default now(),completed_at timestamptz,unique(request_id,version),check((amount is null)=(currency is null))
);
create index document_uploads_customer on public.document_uploads(profile_id,created_at desc);
create table public.document_history (
 id uuid primary key default gen_random_uuid(),request_id uuid not null references public.document_requests(id),upload_id uuid references public.document_uploads(id),actor_id uuid references public.profiles(id),
 action text not null,reason text not null check(length(reason) between 5 and 2000),created_at timestamptz not null default now()
);
create index document_history_request on public.document_history(request_id,created_at);
create index document_history_upload on public.document_history(upload_id);
create index document_history_actor on public.document_history(actor_id);
create table public.document_outbox (
 id uuid primary key default gen_random_uuid(),history_id uuid not null unique references public.document_history(id),state text not null default 'deferred' check(state='deferred'),created_at timestamptz not null default now()
);
alter table public.document_requests enable row level security;
alter table public.document_uploads enable row level security;
alter table public.document_history enable row level security;
alter table public.document_outbox enable row level security;
revoke all on public.document_requests,public.document_uploads,public.document_history,public.document_outbox from public,anon,authenticated;
grant select on public.document_requests,public.document_uploads,public.document_history to authenticated;
grant all on public.document_requests,public.document_uploads,public.document_history,public.document_outbox to service_role;
create policy document_requests_read on public.document_requests for select to authenticated using((profile_id=(select auth.uid()) and (select private.active_customer())) or (select private.has_role(array['owner','documents','operations'])));
create policy document_uploads_read on public.document_uploads for select to authenticated using(exists(select 1 from public.document_requests r where r.id=request_id));
create policy document_history_read on public.document_history for select to authenticated using(exists(select 1 from public.document_requests r where r.id=request_id));
-- Internal helpers are not callable through PostgREST or by application users.
create function private.document_log(p_request uuid,p_upload uuid,p_action text,p_reason text) returns void language plpgsql set search_path='' as $$
declare h uuid;r public.document_requests;
begin
 select * into r from public.document_requests where id=p_request;
 insert into public.document_history(request_id,upload_id,actor_id,action,reason) values(p_request,p_upload,auth.uid(),p_action,p_reason) returning id into h;
 insert into public.audit_logs(actor_id,entity_type,entity_id,action,after_data,reason) values(auth.uid(),'document',p_request,p_action,jsonb_build_object('upload_id',p_upload,'status',r.status),p_reason);
 insert into public.document_outbox(history_id) values(h);
 if r.package_id is not null then
  -- Serialize summaries across multiple requests on the same package.
  perform 1 from public.packages where id=r.package_id for update;
  update public.packages p set document_state=(select case when bool_or(status='rejected') then 'rejected' when bool_or(status='requested') then 'requested' when bool_or(status in ('uploaded','under_review')) then 'under_review' else 'approved' end from public.document_requests where package_id=r.package_id),updated_at=now() where p.id=r.package_id;
 end if;
end $$;
revoke all on function private.document_log(uuid,uuid,text,text) from public,anon,authenticated;
create function private.request_document(p_profile uuid,p_package uuid,p_type text,p_instructions text) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not private.has_role(array['owner','documents','operations']) then raise exception 'Access denied';end if;
 perform 1 from public.profiles where id=p_profile and account_status<>'suspended' for update;if not found then raise exception 'Customer unavailable';end if;
 if p_package is not null and not exists(select 1 from public.packages where id=p_package and profile_id=p_profile)then raise exception 'Package ownership mismatch';end if;
 if (select count(*) from public.document_requests where profile_id=p_profile and created_at>now()-interval '1 day')>=20 then raise exception 'Daily request limit reached';end if;
 insert into public.document_requests(profile_id,package_id,document_type,instructions,created_by) values(p_profile,p_package,p_type,p_instructions,auth.uid()) returning id into result;
 perform private.document_log(result,null,'requested',p_instructions);return result;
end $$;
create function public.request_document(p_profile uuid,p_package uuid,p_type text,p_instructions text)returns uuid language sql security invoker set search_path='' as $$select private.request_document(p_profile,p_package,p_type,p_instructions)$$;
create function private.reserve_document_upload(p_request uuid,p_filename text,p_mime text,p_size integer,p_amount numeric,p_currency text,p_merchant text,p_order text)returns uuid language plpgsql security definer set search_path='' as $$
declare r public.document_requests;result uuid:=gen_random_uuid();ext text;
begin
 if not private.active_customer()then raise exception 'Active account required';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,1));
 select * into r from public.document_requests where id=p_request and profile_id=auth.uid() for update;
 if not found or r.status not in ('requested','rejected') then raise exception 'Request unavailable for upload';end if;
 if r.version>=5 or (select count(*) from public.document_uploads where profile_id=auth.uid() and created_at>now()-interval '1 day')>=20 then raise exception 'Upload limit reached';end if;
 if exists(select 1 from public.document_uploads where request_id=r.id and version=r.version and scan_state='awaiting_upload' and created_at>now()-interval '20 minutes')then raise exception 'Upload already reserved; retry completion or wait 20 minutes';end if;
 ext:=case p_mime when 'application/pdf' then 'pdf' when 'image/jpeg' then 'jpg' when 'image/png' then 'png' else null end;
 if ext is null then raise exception 'Unsupported file type';end if;
 insert into public.document_uploads(id,request_id,profile_id,version,object_path,filename,declared_mime,declared_size,amount,currency,merchant,order_reference)values(result,r.id,r.profile_id,r.version+1,r.profile_id::text||'/'||r.id::text||'/'||result::text||'.'||ext,p_filename,p_mime,p_size,p_amount,p_currency,p_merchant,p_order);
 update public.document_requests set version=version+1,updated_at=now()where id=r.id;return result;
end $$;
create function public.reserve_document_upload(p_request uuid,p_filename text,p_mime text,p_size integer,p_amount numeric,p_currency text,p_merchant text,p_order text)returns uuid language sql security invoker set search_path='' as $$select private.reserve_document_upload(p_request,p_filename,p_mime,p_size,p_amount,p_currency,p_merchant,p_order)$$;
-- Only the trusted validation server may attest to the bytes actually stored.
create function public.complete_document_upload(p_upload uuid,p_mime text,p_size integer,p_sha256 text,p_valid boolean)returns void language plpgsql security invoker set search_path='' as $$
declare u public.document_uploads;r public.document_requests;
begin
 select * into u from public.document_uploads where id=p_upload;if not found then raise exception 'Upload unavailable';end if;
 select * into r from public.document_requests where id=u.request_id for update;
 select * into u from public.document_uploads where id=p_upload for update;
 if u.completed_at is not null then return;end if;
 if r.version<>u.version or r.status not in ('requested','rejected') or u.created_at<now()-interval '20 minutes' then raise exception 'Upload expired or superseded';end if;
 if not exists(select 1 from storage.objects where bucket_id='customer-documents' and name=u.object_path)then raise exception 'Object missing';end if;
 p_valid:=coalesce(p_valid,false) and p_mime=u.declared_mime and p_size=u.declared_size and p_sha256 is not null;
 update public.document_uploads set actual_mime=p_mime,actual_size=p_size,sha256=p_sha256,scan_state=case when p_valid then 'pending' else 'invalid' end,completed_at=now()where id=u.id;
 update public.document_requests set status=case when p_valid then 'uploaded' else 'rejected' end,updated_at=now()where id=r.id;
 perform private.document_log(r.id,u.id,case when p_valid then 'uploaded' else 'rejected' end,case when p_valid then 'File received into quarantine. Malware scanning is pending.' else 'File contents did not match the permitted type or declared size. Upload a valid PDF, JPEG or PNG replacement.' end);
end $$;
revoke all on function public.complete_document_upload(uuid,text,integer,text,boolean) from public,anon,authenticated;
grant execute on function public.complete_document_upload(uuid,text,integer,text,boolean) to service_role;
-- Scanner is a trusted backend boundary, never an owner/customer UI override.
create function public.record_document_scan(p_upload uuid,p_sha256 text,p_result text,p_evidence text)returns void language plpgsql security invoker set search_path='' as $$
declare u public.document_uploads;r public.document_requests;
begin
 select * into u from public.document_uploads where id=p_upload;if not found then raise exception 'Upload unavailable';end if;
 select * into r from public.document_requests where id=u.request_id for update;
 select * into u from public.document_uploads where id=p_upload for update;
 if u.sha256 is distinct from p_sha256 or u.scan_state not in ('pending','error') or p_result is null or p_result not in ('clean','infected','error') or p_evidence is null or length(p_evidence)not between 5 and 1000 then raise exception 'Invalid scan attestation';end if;
 update public.document_uploads set scan_state=p_result,scan_evidence=p_evidence,scanned_at=now()where id=u.id;
 if r.version=u.version and r.status='uploaded' then update public.document_requests set status=case when p_result='clean' then 'under_review' when p_result='infected' then 'rejected' else 'uploaded' end,updated_at=now()where id=r.id;end if;
 perform private.document_log(r.id,u.id,'scan_'||p_result,case p_result when 'clean' then 'Malware scan completed. The file is ready for human review.' when 'infected' then 'The security scan blocked this file. Upload a safe replacement.' else 'Scanning could not be completed. The file remains quarantined; no action is needed from you yet.' end);
end $$;
revoke all on function public.record_document_scan(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.record_document_scan(uuid,text,text,text) to service_role;
create function private.review_document(p_request uuid,p_version integer,p_expected text,p_decision text,p_reason text)returns void language plpgsql security definer set search_path='' as $$
declare r public.document_requests;u public.document_uploads;
begin
 if not private.has_role(array['owner','documents'])then raise exception 'Access denied';end if;
 if p_reason is null or length(trim(p_reason))not between 10 and 2000 or p_decision is null or p_decision not in ('approved','rejected','waived')then raise exception 'Decision and customer instructions required';end if;
 select * into r from public.document_requests where id=p_request for update;
 if not found or r.version is distinct from p_version or r.status is distinct from p_expected or r.status in ('approved','waived')then raise exception 'Record changed or unavailable';end if;
 select * into u from public.document_uploads where request_id=r.id and version=r.version;
 if p_decision='approved' and (r.status<>'under_review' or u.scan_state is distinct from 'clean')then raise exception 'A clean scan is required before approval';end if;
 if p_decision='rejected' and r.status not in ('uploaded','under_review')then raise exception 'No submitted document to reject';end if;
 update public.document_requests set status=p_decision,updated_at=now()where id=r.id;
 perform private.document_log(r.id,u.id,p_decision,p_reason);
end $$;
create function public.review_document(p_request uuid,p_version integer,p_expected text,p_decision text,p_reason text)returns void language sql security invoker set search_path='' as $$select private.review_document(p_request,p_version,p_expected,p_decision,p_reason)$$;
-- Private bucket: no overwrite/delete permissions, no unscanned object reads.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)values('customer-documents','customer-documents',false,10485760,array['application/pdf','image/jpeg','image/png']);
create policy document_object_insert on storage.objects for insert to authenticated with check(bucket_id='customer-documents' and (select private.active_customer()) and exists(select 1 from public.document_uploads u join public.document_requests r on r.id=u.request_id where u.object_path=name and u.profile_id=(select auth.uid()) and u.scan_state='awaiting_upload' and u.version=r.version and r.status in ('requested','rejected') and u.created_at>now()-interval '20 minutes'));
-- Application issues short-lived signed links after a separate audited authorization RPC.
-- No authenticated SELECT policy: this prevents unaudited direct downloads / arbitrary URL TTLs.
create function private.authorize_document_download(p_upload uuid) returns text language plpgsql security definer set search_path='' as $$
declare u public.document_uploads;
begin
 select * into u from public.document_uploads where id=p_upload;
 if not found or u.scan_state<>'clean' or not ((u.profile_id=auth.uid() and private.active_customer()) or private.has_role(array['owner','documents']))then raise exception 'File unavailable';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,2));
 if (select count(*)from public.audit_logs where actor_id=auth.uid() and action='document_download' and created_at>now()-interval '10 minutes')>=30 then raise exception 'Download limit reached';end if;
 insert into public.audit_logs(actor_id,entity_type,entity_id,action,reason)values(auth.uid(),'document',u.request_id,'document_download','Authorized short-lived file download');return u.object_path;
end $$;
create function public.authorize_document_download(p_upload uuid)returns text language sql security invoker set search_path='' as $$select private.authorize_document_download(p_upload)$$;
revoke all on function private.request_document(uuid,uuid,text,text),public.request_document(uuid,uuid,text,text),private.reserve_document_upload(uuid,text,text,integer,numeric,text,text,text),public.reserve_document_upload(uuid,text,text,integer,numeric,text,text,text),private.review_document(uuid,integer,text,text,text),public.review_document(uuid,integer,text,text,text),private.authorize_document_download(uuid),public.authorize_document_download(uuid) from public,anon;
grant execute on function private.request_document(uuid,uuid,text,text),public.request_document(uuid,uuid,text,text),private.reserve_document_upload(uuid,text,text,integer,numeric,text,text,text),public.reserve_document_upload(uuid,text,text,integer,numeric,text,text,text),private.review_document(uuid,integer,text,text,text),public.review_document(uuid,integer,text,text,text),private.authorize_document_download(uuid),public.authorize_document_download(uuid) to authenticated;
-- The service role can run the internal logging helper only inside trusted ingestion/scan operations.
grant usage on schema private to service_role;
grant execute on function private.document_log(uuid,uuid,text,text) to service_role;
grant select,insert on public.audit_logs to service_role;
grant select,update on public.packages to service_role;
commit;
