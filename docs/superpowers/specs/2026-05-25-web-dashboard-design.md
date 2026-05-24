# Web Dashboard Design

Data: 2026-05-25

## Scope aprobat

Versiunea web este un dashboard public demo pentru Thor CRM Index + Link. Nu implementeaza autentificare completa in acest pas, deoarece Supabase RLS permite acces doar utilizatorilor autentificati si nu expunem service role in browser.

## Arhitectura

- `apps/web`: React + Vite + TypeScript.
- Date demo locale pentru listing-uri, alerte, saved searches si health.
- Health live catre Worker-ul Cloudflare deja publicat: `https://thor-crm-index-link-worker.floreaalexandru2002.workers.dev/health`.
- Supabase este prezentat ca backend conectat (`mrnltzamrhgrgslmjzvu`), dar citirea anonima din tabele ramane blocata corect de RLS pana cand exista login.
- Deploy pe Cloudflare Pages, separat de Worker.

## Ecrane

- Search: filtre, rezultate, scor dedup, surse si status tenant.
- Listing Detail: campuri canonice, linkuri sursa, istoric pret, note/tag-uri demo.
- Saved Searches: criterii si alerte.
- Alerts: livrari si stari.
- Source Health: metrici per sursa si starea Worker-ului.

## Design vizual

Dashboard SaaS modern pentru agentii imobiliare: fundal navy inchis, suprafete albe, accente cyan/emerald, liste dense, carduri clare, focus pe productivitate si auditabilitate. UI-ul este code-native si responsive.

## Limite explicite

- Fara scraping real in UI.
- Fara date personale reale.
- Fara login complet in acest pas.
- Fara expunere `SUPABASE_SERVICE_ROLE_KEY` in client.
