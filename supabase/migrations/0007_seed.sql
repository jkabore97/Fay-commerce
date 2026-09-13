-- ============================================================================
-- 0007_seed.sql — a business ready to demo on first boot.
--
-- Idempotent: every insert is guarded by ON CONFLICT DO NOTHING, so running the
-- whole migration bundle again changes nothing. Prices and quantities here are
-- placeholders for the demo — the admin sets the real ones.
--
-- The first administrator cannot be seeded (there is no auth user yet). After
-- the owner has signed up once, promote them from the Supabase SQL editor:
--
--   insert into staff (id, full_name, role)
--   select id, 'Faïçal — Fay & Partenaires', 'admin'
--   from auth.users where email = 'OWNER-EMAIL-HERE'
--   on conflict (id) do update set role = 'admin', is_active = true;
-- ============================================================================

-- The chart of accounts.
select seed_chart_of_accounts();

-- The six fastener families.
insert into categories (slug, name, description, sort_order) values
    ('boulonnerie',     'Boulonnerie',      'Boulons de tous types et diamètres, en acier et matériaux spéciaux.', 1),
    ('visserie',        'Visserie',         'Vis pour métal, bois et applications techniques.', 2),
    ('ecrous',          'Écrous',           'Écrous hexagonaux, freins, borgnes et à embase.', 3),
    ('rondelles',       'Rondelles',        'Rondelles plates, éventail, grower et de blocage.', 4),
    ('tiges-d-ancrage', 'Tiges d''ancrage', 'Tiges filetées et d''ancrage pour le génie civil.', 5),
    ('roulements',      'Roulements',       'Roulements à billes et à rouleaux pour la mécanique.', 6)
on conflict (slug) do nothing;

-- A handful of demo products across the families.
insert into products (slug, sku, name, category_id, description, material, specs, unit, pack_size, cost_price, sale_price, quantity, low_stock_at, is_featured)
select v.slug, v.sku, v.name,
       (select id from categories c where c.slug = v.cat),
       v.description, v.material, v.specs::jsonb, v.unit, v.pack_size,
       v.cost_price, v.sale_price, v.quantity, v.low_stock_at, v.is_featured
from (values
    ('boulon-hm-10x40', 'BLN-1040', 'Boulon HM 10 x 40', 'boulonnerie',
     'Boulon tête hexagonale, filetage métrique, classe 8.8.', 'Acier au carbone zingué',
     '{"Diamètre":"M10","Longueur":"40 mm","Classe":"8.8","Filetage":"Métrique"}',
     'boîte', 'Boîte de 100', 15000, 22000, 240, 40, true),
    ('boulon-hm-12x60', 'BLN-1260', 'Boulon HM 12 x 60', 'boulonnerie',
     'Boulon tête hexagonale haute résistance pour charpente.', 'Acier allié galvanisé à chaud',
     '{"Diamètre":"M12","Longueur":"60 mm","Classe":"10.9","Finition":"Galvanisé à chaud"}',
     'boîte', 'Boîte de 50', 22000, 32000, 120, 25, true),
    ('vis-tole-4-8x19', 'VIS-4819', 'Vis à tôle 4.8 x 19', 'visserie',
     'Vis autoperceuse tête bombée cruciforme.', 'Acier inoxydable A2',
     '{"Diamètre":"4.8 mm","Longueur":"19 mm","Empreinte":"Phillips","Tête":"Bombée"}',
     'sachet', 'Sachet de 200', 6000, 9500, 180, 30, true),
    ('vis-bois-5x50', 'VIS-0550', 'Vis à bois 5 x 50', 'visserie',
     'Vis à bois filetage partiel, tête fraisée Torx.', 'Acier zingué',
     '{"Diamètre":"5 mm","Longueur":"50 mm","Empreinte":"Torx","Tête":"Fraisée"}',
     'boîte', 'Boîte de 200', 7000, 11000, 90, 20, false),
    ('ecrou-hexagonal-m10', 'ECR-M10', 'Écrou hexagonal M10', 'ecrous',
     'Écrou hexagonal standard ISO 4032.', 'Acier au carbone zingué',
     '{"Diamètre":"M10","Type":"Hexagonal","Norme":"ISO 4032"}',
     'boîte', 'Boîte de 200', 4000, 6500, 300, 50, true),
    ('ecrou-frein-m12', 'ECR-F12', 'Écrou frein M12', 'ecrous',
     'Écrou autofreiné à bague nylon (Nylstop).', 'Acier + bague nylon',
     '{"Diamètre":"M12","Type":"Frein (Nylstop)","Matière bague":"Nylon"}',
     'boîte', 'Boîte de 100', 6000, 9000, 60, 15, false),
    ('rondelle-plate-m10', 'RND-P10', 'Rondelle plate M10', 'rondelles',
     'Rondelle plate large ISO 7093.', 'Acier inoxydable A2',
     '{"Diamètre intérieur":"10,5 mm","Type":"Plate large","Norme":"ISO 7093"}',
     'sachet', 'Sachet de 500', 3000, 5000, 400, 80, false),
    ('rondelle-grower-m10', 'RND-G10', 'Rondelle Grower M10', 'rondelles',
     'Rondelle élastique fendue (grower) anti-desserrage.', 'Acier ressort',
     '{"Diamètre":"M10","Type":"Grower (fendue)"}',
     'sachet', 'Sachet de 500', 3500, 5500, 260, 60, false),
    ('tige-filetee-m12-1m', 'TIG-M12', 'Tige filetée M12 — 1 m', 'tiges-d-ancrage',
     'Tige filetée métrique en barre de 1 mètre.', 'Acier zingué',
     '{"Diamètre":"M12","Longueur":"1000 mm","Filetage":"Métrique intégral"}',
     'lot', 'Lot de 10 barres', 18000, 27000, 45, 10, true),
    ('tige-ancrage-m16', 'TIG-A16', 'Tige d''ancrage M16', 'tiges-d-ancrage',
     'Tige d''ancrage à scellement pour béton.', 'Acier galvanisé à chaud',
     '{"Diamètre":"M16","Type":"Ancrage / scellement","Finition":"Galvanisé à chaud"}',
     'lot', 'Lot de 25', 30000, 44000, 20, 8, false),
    ('roulement-6204-2rs', 'RLT-6204', 'Roulement 6204 2RS', 'roulements',
     'Roulement à billes étanche, gorge profonde.', 'Acier chromé',
     '{"Référence":"6204-2RS","Alésage":"20 mm","Extérieur":"47 mm","Largeur":"14 mm"}',
     'pièce', 'À l''unité', 3500, 6000, 75, 15, true),
    ('roulement-6205-2rs', 'RLT-6205', 'Roulement 6205 2RS', 'roulements',
     'Roulement à billes étanche, gorge profonde.', 'Acier chromé',
     '{"Référence":"6205-2RS","Alésage":"25 mm","Extérieur":"52 mm","Largeur":"15 mm"}',
     'pièce', 'À l''unité', 4000, 7000, 55, 15, false)
) as v(slug, sku, name, cat, description, material, specs, unit, pack_size, cost_price, sale_price, quantity, low_stock_at, is_featured)
on conflict (slug) do nothing;

-- Record the demo opening stock as opening movements (idempotent-ish: only if a
-- product has no movements yet).
insert into stock_movements (product_id, kind, quantity, unit_cost, note)
select p.id, 'opening', p.quantity, p.cost_price, 'Stock initial (démo)'
from products p
where p.quantity > 0
  and not exists (select 1 from stock_movements m where m.product_id = p.id);

-- A demo promo banner.
insert into banners (kind, title, subtitle, cta_label, link_url, sort_order, is_active)
select 'promo', 'Devis gratuit sous 24h',
       'Envoyez votre liste de fixations, recevez une offre chiffrée rapidement.',
       'Demander un devis', '/devis', 1, true
where not exists (select 1 from banners);

-- Demo partner strip (logos left blank — the admin uploads them).
insert into partners (name, sort_order, is_active)
select v.name, v.ord, true
from (values ('BTP Sahel', 1), ('Mines du Faso', 2), ('Agro-Industrie SA', 3), ('Atelier Méca+', 4)) as v(name, ord)
where not exists (select 1 from partners);
