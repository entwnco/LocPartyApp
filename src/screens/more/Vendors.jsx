import { useAppState } from '../../state/AppState.jsx';
import BackHeader from './BackHeader.jsx';

export default function Vendors() {
  const { content } = useAppState();
  const vendors = content.vendors.filter((v) => v.active);
  const featured = vendors.filter((v) => v.isFeatured);
  const rest = vendors.filter((v) => !v.isFeatured);

  return (
    <div className="screen">
      <BackHeader eyebrow="Vendors" title="Explore" />
      {featured.length > 0 && (
        <>
          <span className="eyebrow">Featured</span>
          <div className="stack">
            {featured.map((v) => (
              <VendorCard key={v.id} vendor={v} />
            ))}
          </div>
        </>
      )}
      {rest.length > 0 && (
        <>
          <span className="eyebrow">All vendors</span>
          <div className="stack">
            {rest.map((v) => (
              <VendorCard key={v.id} vendor={v} />
            ))}
          </div>
        </>
      )}
      {vendors.length === 0 && <div className="empty-state">Vendors are still being confirmed.</div>}
    </div>
  );
}

function VendorCard({ vendor }) {
  return (
    <div className="card flat">
      <span className="tag">{vendor.category}</span>
      <h3 style={{ marginTop: 8 }}>{vendor.name}</h3>
      <p>{vendor.description}</p>
      <p className="field-hint">{vendor.location}</p>
    </div>
  );
}
