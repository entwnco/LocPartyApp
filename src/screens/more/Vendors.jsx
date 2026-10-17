import { useAppState } from '../../state/AppState.jsx';
import BackHeader from './BackHeader.jsx';

const CATEGORY_ORDER = [
  'Loc & Hair Care',
  'Food & Treats',
  'Body Care & Fragrance',
  'Fashion, Accessories & Gifts',
  'Community & Services',
];

function isEntwined(vendor) {
  return /entwined/i.test(vendor.name || '');
}

export default function Vendors() {
  const { content } = useAppState();
  const vendors = content.vendors.filter((v) => v.active);
  const byCategory = new Map();
  for (const vendor of vendors) {
    const category = vendor.category || 'Other';
    if (!byCategory.has(category)) byCategory.set(category, []);
    byCategory.get(category).push(vendor);
  }
  const entwinedCategory = vendors.find(isEntwined)?.category;
  const categories = [
    ...(entwinedCategory && byCategory.has(entwinedCategory) ? [entwinedCategory] : []),
    ...CATEGORY_ORDER.filter((name) => name !== entwinedCategory && byCategory.has(name)),
    ...[...byCategory.keys()].filter((name) => name !== entwinedCategory && !CATEGORY_ORDER.includes(name)),
  ];

  return (
    <div className="screen">
      <BackHeader eyebrow="Vendors" title="Explore" />
      {categories.map((category) => (
        <section key={category} className="stack">
          <h2>{category}</h2>
          {[...byCategory.get(category)]
            .sort((a, b) => {
              if (category === entwinedCategory) {
                const aFirst = isEntwined(a);
                const bFirst = isEntwined(b);
                if (aFirst !== bFirst) return aFirst ? -1 : 1;
              }
              return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
            })
            .map((vendor) => (
              <VendorCard key={vendor.id} vendor={vendor} />
            ))}
        </section>
      ))}
      {vendors.length === 0 && <div className="empty-state">Vendors are still being confirmed.</div>}
    </div>
  );
}

export function VendorCard({ vendor }) {
  return (
    <div className="card flat">
      {vendor.logoUrl && <img src={vendor.logoUrl} alt={`${vendor.name} photo`} className="vendor-card-logo" />}
      <h3>{vendor.name}</h3>
      <p>{vendor.description}</p>
      {vendor.location ? <p className="field-hint">{vendor.location}</p> : null}
    </div>
  );
}
