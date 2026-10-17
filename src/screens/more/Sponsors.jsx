import { useAppState } from '../../state/AppState.jsx';
import BackHeader from './BackHeader.jsx';
import { VendorCard } from './Vendors.jsx';

const SPONSORS = [
  { name: 'Gifted Ones', match: /gifted ones/i },
  { name: 'Midway Specialty Care', match: /midway/i },
  { name: 'Booksy', match: /booksy/i },
  { name: 'Urban Rastaman', match: /urban rasta/i },
];

export default function Sponsors() {
  const { content } = useAppState();
  const vendors = content.vendors.filter((vendor) => vendor.active);
  const sponsors = SPONSORS.map((sponsor) => vendors.find((vendor) => sponsor.match.test(vendor.name))).filter(Boolean);

  return (
    <div className="screen">
      <BackHeader title="Sponsors" />
      {sponsors.length === 0 ? (
        <div className="empty-state">Sponsors are still being confirmed.</div>
      ) : (
        <div className="stack">
          <p style={{ marginBottom: 0 }}>
            Loc Party is made possible by our sponsors. Thank you for the support, the presence, and the care you bring to the community and this gathering!
          </p>
          {sponsors.map((vendor) => (
            <VendorCard key={vendor.id} vendor={vendor} />
          ))}
        </div>
      )}
    </div>
  );
}
