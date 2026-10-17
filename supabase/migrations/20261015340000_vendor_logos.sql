-- The vendor photos live in hosted storage. The local vendor rows had
-- lost their links, so point them back at those public files and drop the
-- two vendors that should no longer appear on the list.

update public.vendors
set logo_url = case name
  when 'A Key Scent' then 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/a-key-scent.png'
  when 'A3 Confections' then 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/a3-confections.png'
  when 'Adina Kajoy' then 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/adina-kajoy.png'
  when 'Aly Divinely Yu' then 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/divinely-yu.png'
  when 'Beauty Fro' then 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/beauty-fro.png'
  when 'Brothers Millennial' then 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/brothers-millennial.png'
  when 'Candyland Designs' then 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/candyland-designs.png'
  when 'Chelsea''s Snatchin'' Kitchen' then 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/chelseas-kitchen.png'
  when U&'D\00B3 Cuisines' then 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/d3-cuisines.png'
  when 'Entwined Loc Studio' then 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/a73ea981-a42a-44ca-9727-d82429659d71/vendor-8525e0cb-3e89-4638-aa5a-b06540cf6b41.jpg?v=1790516583323'
  when 'Gemi Green' then 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/gemi-green.png'
  when 'Gifted Ones' then 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/gifted-ones.png'
  when 'House of Isis' then 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/house-of-isis.png'
  when 'Indlovu Threads' then 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/indlovu-threads.png'
  when 'Jess Vibez Creations' then 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/jess-vibez.png'
  when 'Ju-Nel' then 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/ju-nel.png'
  when 'Kim Jade' then 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/kim-jade.png'
  when 'Kitchen Arrabon' then 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/kitchen-arrabon.png'
  when 'LOC HEADZ' then 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/loc-headz.png'
  when 'M Rochelle Jewels' then 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/m-rochelle-jewels.png'
  when 'Na'' Scent Organics' then 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/na-scent-organics.png'
  when 'Nature''s Essentials' then 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/natures-essentials.png'
  when 'Spill the T.E.A.' then 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/spill-the-tea.png'
  when 'Tat Like Tattoo' then 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/tat-like-tattoo.png'
  when 'The Flavor District' then 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/flavor-district.png'
  when 'The Healing Honeypot' then 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/healing-honeypot.png'
  when 'TPCOnlineShop.com' then 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/tpconlineshop.png'
  when 'TYA' then 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/tya.png'
  when 'Urban Rastaman' then 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/urban-rastaman.png'
  when 'Velvet Bloom' then 'https://pkdkepyudhringehlogi.supabase.co/storage/v1/object/public/party-photos/vendor-logos/v2/velvet-bloom.png'
  else logo_url
end
where name in (
  'A Key Scent',
  'A3 Confections',
  'Adina Kajoy',
  'Aly Divinely Yu',
  'Beauty Fro',
  'Brothers Millennial',
  'Candyland Designs',
  'Chelsea''s Snatchin'' Kitchen',
  U&'D\00B3 Cuisines',
  'Entwined Loc Studio',
  'Gemi Green',
  'Gifted Ones',
  'House of Isis',
  'Indlovu Threads',
  'Jess Vibez Creations',
  'Ju-Nel',
  'Kim Jade',
  'Kitchen Arrabon',
  'LOC HEADZ',
  'M Rochelle Jewels',
  'Na'' Scent Organics',
  'Nature''s Essentials',
  'Spill the T.E.A.',
  'Tat Like Tattoo',
  'The Flavor District',
  'The Healing Honeypot',
  'TPCOnlineShop.com',
  'TYA',
  'Urban Rastaman',
  'Velvet Bloom'
);

delete from public.vendors
where name in ('The Loc Opulence', 'Natural Hair Really Rocks by Moemo');
