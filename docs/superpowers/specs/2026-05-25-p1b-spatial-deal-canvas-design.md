# P1B Spatial Deal Canvas Design

Data: 2026-05-25

## Decizie aprobata

Directia aprobata pentru noua interfata Thor CRM este **P1B - Full Freeform Canvas**.

Aplicatia nu mai trebuie sa arate ca un dashboard clasic cu sidebar, carduri si tabel central. Suprafata principala devine un **spatial deal canvas**: un workspace vizual in care listingurile, sursele, workflow-ul tenantului, cautarile salvate, istoricul si alertele sunt reprezentate ca noduri conectate.

## Obiectiv

Noua interfata trebuie sa transmita clar ca Thor nu este inca un portal imobiliar si nici un CRM generic. Thor este un sistem de lucru peste un index imobiliar agregat:

- aduce listinguri din mai multe surse;
- pastreaza modelul index + link;
- unifica semnale intr-o vedere canonica;
- arata sursa, increderea, istoricul si workflow-ul intr-un spatiu vizual;
- permite actiuni rapide per agentie: status, asignare, note, saved search si open source link.

## Non-obiective pentru prima implementare

Prima implementare P1B nu trebuie sa livreze un graph editor complet.

Nu intra in prima faza:

- drag and drop persistent al nodurilor;
- edge routing complex;
- zoom fizic cu transform matrix complex;
- layout engine automat;
- colaborare real-time;
- canvas WebGL;
- editare libera de noduri;
- split/merge dedup admin.

MVP-ul P1B trebuie sa para spatial si sa fie util, dar poate folosi layout determinist in React/CSS.

## Concept vizual

Suprafata principala este full-screen si are:

- fundal deschis, rece, cu grid discret;
- noduri albe, mari, cu shadow fin si border subtil;
- conexiuni mov/albastre intre noduri;
- command bar in partea de sus;
- toolbox vertical in stanga;
- minimap in coltul de jos;
- inspector contextual in dreapta;
- actiuni rapide in inspector.

Stilul trebuie sa fie premium, spatial, modern si memorabil, fara sa devina cyber/kitsch. Directia de culoare:

- background: `#eef2ff`, `#ffffff`, `#f8fafc`;
- text principal: `#07111f`;
- text secundar: `#64748b`;
- accent principal: violet `#8b5cf6`;
- accent secundar: cyan `#06b6d4`;
- success: emerald `#047857`;
- borders: `#dbe5f1`, `#e2e8f0`;
- nod selectat: border violet + glow subtil.

## Structura ecranului

### 1. Top command bar

Continut:

- brand: `Thor Spatial`;
- command input vizual: `Cmd+K cauta, conecteaza, asigneaza`;
- hint: `ex: Bucuresti 2 camere sub 120k`;
- actiuni rapide: `Sources`, `Saved`, `New scan`.

In prima faza command bar poate fi un input controlat sau un camp vizual functional partial:

- cautarea filtreaza/selecteaza nodurile existente;
- Enter poate aplica un filtru simplu;
- `New scan` poate declansa reload/fetch sau poate ramane CTA daca backend action nu este gata.

### 2. Spatial canvas

Canvas-ul contine noduri pozitionate determinist. Nodul central este listingul selectat.

Noduri MVP:

- `CanonicalListing` sau listing candidat:
  - titlu;
  - pret;
  - mp;
  - scor/match confidence;
  - source link;
  - status public `index + link`.
- `Source cluster`:
  - lista surselor active;
  - numar surse on;
  - source health sumar.
- `Tenant workflow`:
  - status;
  - assignee;
  - note count;
  - actiuni rapide.
- `Saved search`:
  - criteriu curent;
  - frecventa alerta;
  - match-uri.
- `Source health`:
  - parse success;
  - match rate;
  - latency.
- `Price history`:
  - ultimul pret;
  - disponibilitate;
  - data observatiei.
- `Alert delivery`:
  - canal;
  - status;
  - ultimul delivery.

Conexiunile dintre noduri sunt vizuale in prima faza. Nu trebuie sa fie editabile.

### 3. Inspector contextual

Inspectorul din dreapta afiseaza detaliile nodului selectat.

Pentru un listing:

- titlu;
- pret;
- suprafata;
- camere;
- sursa principala;
- scor match;
- linkuri catre surse;
- status tenant;
- actiuni:
  - `Preia`;
  - `Contactat`;
  - `Adauga nota`;
  - `Open source`.

Pentru source health:

- mode: `on`, `degraded`, `off`;
- listing count;
- parse success;
- time-to-index;
- ultimul seen timestamp.

Pentru saved search:

- nume;
- criterii;
- frecventa;
- status alerta;
- actiuni CRUD daca backend-ul este disponibil.

### 4. Toolbox

Toolbox-ul este o zona vizuala mica in stanga:

- select;
- search;
- add/saved search;
- connect/view links;
- settings.

In MVP, butoanele pot schimba modul selectat si pot evidentia sectiuni. Nu trebuie sa implementeze toate modurile avansate.

### 5. Minimap si zoom

MVP:

- minimap static/determinist care arata pozitia relativa a nodurilor;
- zoom controls vizuale: `-`, procent, `+`;
- zoom-ul poate controla o clasa CSS sau poate fi non-persistent in prima faza.

Nu este necesar un pan/zoom engine complet pentru prima iteratie.

## Data flow

Interfata P1B trebuie sa foloseasca datele existente, nu date fake noi.

Surse de date:

- `fetchWorkerListings()` pentru listingurile indexate;
- `fetchWorkerSourceHealth()` pentru source health;
- tenant workflow API pentru status/note/asignare cand exista token Supabase;
- saved searches API cand exista token Supabase;
- fallback demo doar cand Worker/API este indisponibil.

Transformare UI:

1. Listingurile devin noduri `listing`.
2. Source health devine nod `source cluster` si nod `source health`.
3. Workflow-ul tenant devine nod `tenant workflow`.
4. Saved searches devin noduri `saved search`.
5. Alert deliveries devin noduri `alert delivery`.

Selectia unui nod actualizeaza inspectorul.

## Comportament MVP

MVP-ul P1B trebuie sa includa:

- randare full-screen spatial canvas;
- noduri pozitionate determinist;
- selectare nod;
- inspector contextual;
- filtrare/search simplu prin command bar;
- actiuni workflow existente pentru listing:
  - update status;
  - fallback local daca backend-ul nu este disponibil;
- open source link;
- responsive fallback pe mobile: nodurile devin stack vertical, nu canvas liber;
- empty state cand nu exista listinguri;
- error state cand Worker API este indisponibil.

## Responsivitate

Desktop:

- canvas full-screen;
- inspector vizibil;
- toolbox si minimap vizibile.

Tablet:

- canvas ramane vizual;
- inspector poate trece sub canvas sau in panel collapsible.

Mobile:

- nu fortam pan/zoom spatial;
- nodurile devin carduri verticale;
- command bar ramane sus;
- inspector devine sectiune sub nodul selectat.

## Accesibilitate

Chiar daca UI-ul este spatial, trebuie sa ramana navigabil:

- nodurile sunt `button` sau `article` cu control selectabil clar;
- focus state vizibil;
- inspector are heading semantic;
- actiunile rapide au label-uri explicite;
- linkurile catre surse se deschid cu `target="_blank"` si `rel="noreferrer"`;
- culorile nu sunt singurul indicator de stare.

## Componentizare propusa

In `apps/web`, refactorul trebuie sa evite un `App.tsx` si mai mare.

Componente recomandate:

- `SpatialAppShell`;
- `CommandBar`;
- `SpatialCanvas`;
- `CanvasNode`;
- `CanvasEdge`;
- `NodeInspector`;
- `CanvasToolbox`;
- `CanvasMinimap`;
- `NodeStackMobile`;
- `useSpatialNodes`;
- `buildSpatialGraphModel`.

Tipuri recomandate:

- `SpatialNode`;
- `SpatialEdge`;
- `SpatialNodeKind`;
- `SelectedNodeState`;
- `CanvasAction`.

## Plan de implementare recomandat

### Faza 1 - UI shell spatial

- Introduce layout full-screen P1B.
- Inlocuieste dashboardul clasic ca prim view.
- Pastreaza datele si API clientii existenti.
- Adauga noduri deterministe si inspector.

### Faza 2 - Interactiuni

- Select node;
- command search;
- update workflow status din inspector;
- open source link;
- saved search quick action.

### Faza 3 - Polish

- minimap functional partial;
- zoom CSS;
- responsive mobile stack;
- empty/error/loading states;
- keyboard focus.

### Faza 4 - Extensii ulterioare

- drag/drop;
- pan/zoom real;
- persistenta pozitiilor per user;
- graph layout engine;
- split/merge dedup admin view.

## Testare

Teste recomandate:

- `App` randare P1B shell;
- noduri generate din Worker listings;
- selectarea unui nod actualizeaza inspectorul;
- command search filtreaza/evidentiaza listinguri;
- `Open source` foloseste linkul original;
- workflow action pastreaza fallback local;
- source health apare ca nod;
- mobile stack nu ascunde actiunile.

Verificari obligatorii inainte de merge:

- `npm test`;
- `npm run typecheck`;
- `npm run build`;
- smoke test in browser pe pagina publica sau local.

## Risc si mitigare

Risc: canvas prea complex pentru MVP.

Mitigare: layout determinist si fara drag/drop in prima faza.

Risc: utilizatorii nu inteleg imediat unde sunt rezultatele.

Mitigare: nod central mare, command bar clar si inspector contextual.

Risc: mobile slab.

Mitigare: mobile foloseste stack vertical, nu spatial canvas fortat.

Risc: UI-ul ascunde principiul index + link.

Mitigare: fiecare listing node si inspectorul includ source link si nota explicita ca nu re-hostam continut integral.

## Criterii de acceptare

Designul P1B este implementat corect cand:

- primul ecran nu mai arata ca dashboardul vechi;
- canvas-ul ocupa suprafata principala;
- exista cel putin 5 tipuri de noduri vizibile;
- selectarea nodului schimba inspectorul;
- listingurile live din Worker apar in canvas;
- source health live apare in canvas;
- actiunile tenant workflow existente raman functionale sau degradeaza local;
- public payload ramane index + link;
- build/test/typecheck trec;
- UI-ul este utilizabil pe desktop si mobil.
