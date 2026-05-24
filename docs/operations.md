# Operare și provisioning

## Supabase

Deploy-ul public curent folosește proiectul existent `habitat-crm-romania` (`mrnltzamrhgrgslmjzvu`). Încercarea de a crea proiectul nou `thor-crm-index-link` a fost blocată de limita Supabase free de 2 proiecte active.

```bash
npx supabase@latest link --project-ref <project-ref>
npx supabase@latest db push
```

După primul admin creat în Auth, bootstrap-ul organizației trebuie făcut cu service role sau SQL controlat:

```sql
insert into public.organizations (name, slug) values ('Demo Agency', 'demo-agency') returning id;
insert into public.organization_members (org_id, user_id, role) values ('<org-id>', '<auth-user-id>', 'admin');
```

## Cloudflare

```bash
npx wrangler queues create thor-crm-discover
npx wrangler queues create thor-crm-fetch
npx wrangler queues create thor-crm-match
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config apps/worker/wrangler.jsonc
npx wrangler secret put ADMIN_API_KEY --config apps/worker/wrangler.jsonc
npm run deploy --workspace @thor-crm/worker
```

## GitHub

Repository-ul are CI în `.github/workflows/ci.yml`. Pentru publicare, creează un repo nou pe contul GitHub conectat și setează remote-ul local:

```bash
git remote add origin git@github.com:<owner>/<repo>.git
git push -u origin master
```
