import { useEffect, useMemo, useState } from 'react';
import { TRACKS, createBingoDeck, completeLines } from '../data/bingoPreviewData.js';
import './BingoPreview.css';

const KEY = 'loc-party-bingo-visual-draft-v1';
const PENDING = /^(Product Shop |Vendor |Visual Artist )/;

function readDraft() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || '{}');
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

export default function BingoPreview() {
  const [trackId, setTrackId] = useState('single');
  const [records, setRecords] = useState(readDraft);
  const [activeId, setActiveId] = useState(null);
  const track = TRACKS.find((entry) => entry.id === trackId) || TRACKS[0];
  const deck = useMemo(() => createBingoDeck(track), [track]);
  const record = records[trackId] || { stamped: [], shops: [] };
  const stamped = record.stamped || [];
  const shops = record.shops || [];
  const active = deck.find((item) => item.id === activeId) || null;

  const completed = deck.reduce((sum, item) => sum + Number(stamped.includes(item.id)), 0);
  const markedIndices = deck.reduce((items, item, index) => {
    if (stamped.includes(item.id)) items.push(index);
    return items;
  }, []);
  const lines = completeLines(markedIndices);
  const entwinedChecked = stamped.includes('entwined');
  const bingoReady = lines.length > 0 && entwinedChecked;

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(records));
    } catch {
      // The preview remains interactive if private browsing blocks local storage.
    }
  }, [records]);

  function updateCurrent(patch) {
    setRecords((previous) => {
      const previousRecord = previous[trackId] || { stamped: [], shops: [] };
      return {
        ...previous,
        [trackId]: {
          ...previousRecord,
          ...patch,
        },
      };
    });
  }

  function stamp(id) {
    if (id === 'crown-quest' && shops.length !== 3) return;
    updateCurrent({ stamped: Array.from(new Set([...stamped, id])) });
    setActiveId(null);
  }

  function toggleShop(i) {
    const next = shops.includes(i) ? shops.filter((n) => n !== i) : [...shops, i];
    updateCurrent({ shops: next, stamped: stamped.filter((id) => id !== 'crown-quest') });
  }

  function clearTrack() {
    if (!window.confirm('Reset only this preview track?')) return;
    updateCurrent({ stamped: [], shops: [] });
    setActiveId(null);
  }

  function open(id) {
    setActiveId(id);
  }

  return (
    <main className="bingo-preview">
      <header className="bingo-hero">
        <a href="/" className="bingo-back">← THE LOC PARTY APP</a>
        <span className="bingo-kicker">THE LOC PARTY PRESENTS</span>
        <h1>BINGO<span>HUNT</span></h1>
        <p>Find it. Feel it. Follow the vibe.</p>
        <span className="bingo-draft-label">CREATIVE PREVIEW · NOT THE LIVE GAME</span>
      </header>

      <section className="bingo-panel bingo-track-panel">
        <div className="bingo-section-heading">
          <span>01 / PICK A TRACK TO PREVIEW</span>
          <span className="bingo-tiny">Preview controls only</span>
        </div>
        <div className="bingo-track-buttons">
          {TRACKS.map((item, index) => (
            <button key={item.id} type="button" className={item.id === trackId ? 'bingo-track-button selected' : 'bingo-track-button'}
              onClick={() => { setTrackId(item.id); setActiveId(null); }}
              aria-pressed={item.id === trackId}>0{index + 1}</button>
          ))}
        </div>
        <div className="bingo-track-description">
          <strong>{track.name}</strong>
          <p>{track.subtitle}</p>
        </div>
      </section>

      <section className="bingo-panel bingo-start">
        <div className="bingo-section-heading"><span>02 / EASE INTO THE PARTY</span></div>
        <p>First time here? Pick the warm-up that fits your mood. You can explore in any order.</p>
        <div className="bingo-starters">
          <button type="button" onClick={() => open('play-first')}>
            <span>🪁</span><strong>FEELING PLAYFUL?</strong><small>Head to Game Stop</small>
          </button>
          <button type="button" onClick={() => open('art-first')}>
            <span>🎨</span><strong>FEELING CURIOUS?</strong><small>Explore the Art Gallerie</small>
          </button>
        </div>
      </section>

      <section className="bingo-board-section">
        <div className="bingo-board-heading">
          <div><span className="bingo-kicker">YOUR ADVENTURE</span><h2>B I N G O</h2></div>
          <div className="bingo-progress"><strong>{completed}<span>/25</span></strong><small>SQUARES</small></div>
        </div>
        <div className="bingo-progress-bar" aria-label={completed + ' of 25 squares stamped'}>
          <span style={{ width: (completed / 25 * 100) + '%' }} />
        </div>
        <div className="bingo-grid" aria-label="Interactive 5 by 5 BINGO preview">
          {deck.map((item) => {
            const done = stamped.includes(item.id);
            const isCenter = item.id === 'entwined';
            return (
              <button type="button" key={item.id} onClick={() => open(item.id)}
                className={'bingo-tile' + (done ? ' stamped' : '') + (isCenter ? ' center' : '')}
                aria-label={item.name + (done ? ', completed' : ', not completed')} aria-pressed={done}>
                {done && <span className="bingo-tick">✓</span>}
                <span className="bingo-tile-icon">{item.icon}</span>
                <span className="bingo-tile-title">{item.name}</span>
                {item.id === 'crown-quest' && <small>3 SHOPS</small>}
              </button>
            );
          })}
        </div>
        <div className={'bingo-win-banner' + (bingoReady ? ' achieved' : '')}>
          <span>{bingoReady ? '🎉' : '✦'}</span>
          <div>
            <strong>{bingoReady ? 'BINGO! YOU FOUND YOUR LINE!' : lines.length ? 'LINE FOUND — VISIT ENTWINED!' : 'FIVE IN A ROW = BINGO'}</strong>
            <p>{bingoReady ? 'Preview complete. Real prize claims are not active.' :
              lines.length ? 'Stamp the Entwined center square to finish your preview BINGO.' :
              'Any row, column, or diagonal. Entwined is your required center check-in.'}</p>
          </div>
        </div>
        <div className="bingo-board-bottom"><small>{lines.length} line{lines.length === 1 ? '' : 's'} found · progress stored on this device for preview</small>
          <button type="button" onClick={clearTrack}>Reset preview ↺</button>
        </div>
      </section>

      <section className="bingo-panel bingo-crown-teaser">
        <span className="bingo-kicker">THE LOC SHOP</span>
        <h2>THE CROWN QUEST 👑</h2>
        <p>Three different product shops per track. Three discoveries. One BINGO square.</p>
        <div className="bingo-shop-list">
          {track.shops.map((name, index) => (
            <div key={name}><span>0{index + 1}</span><strong>{name}</strong><small>{PENDING.test(name) ? 'Vendor assignment pending' : 'Featured business · draft'}</small></div>
          ))}
        </div>
        <button type="button" className="bingo-action" onClick={() => open('crown-quest')}>Explore Crown Quest →</button>
        <small className="bingo-disclaimer">No purchase necessary to play. Shopping is HIGHLY encouraged! Product questions pending vendor replies.</small>
      </section>

      <p className="bingo-footer-note">A visual working draft: no QR validation, live points, purchases, raffle entries, or physical rewards are awarded here.</p>

      {active && <div className="bingo-modal-backdrop" onClick={() => setActiveId(null)}>
        <section className="bingo-modal" role="dialog" aria-modal="true" aria-labelledby="bingo-mission-title" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="bingo-close" onClick={() => setActiveId(null)} aria-label="Close mission">×</button>
          <div className="bingo-modal-icon">{active.icon}</div>
          <span className="bingo-kicker">{active.kind.toUpperCase()} · {active.location}</span>
          <h2 id="bingo-mission-title">{active.name}</h2>
          <blockquote>“{active.clue}”</blockquote>
          <h3>YOUR MISSION</h3>
          <p>{active.mission}</p>
          {active.id === 'crown-quest' && <>
            <div className="bingo-shop-checklist">
              {track.shops.map((name, index) => (
                <label key={name}>
                  <input type="checkbox" checked={shops.includes(index)} onChange={() => toggleShop(index)} />
                  <span><strong>{name}</strong><small>{PENDING.test(name) ? 'Name and product to be confirmed' : 'Featured product and trivia pending'}</small></span>
                </label>
              ))}
            </div>
            <p className="bingo-small">{shops.length}/3 shop discoveries. These checks simulate trivia completion while vendor questions are unfinished.</p>
          </>}
          {active.id === 'entwined' && <div className="bingo-favors">
            <strong>POSSIBLE PARTY FAVORS</strong>
            <p>Loc sprinkles · Stickers · Tinsel installation · Free consultation · 50% off wash + retwist</p>
            <small>Examples only. No prize is allocated or claimed in this preview; availability and redemption rules are still to be decided.</small>
          </div>}
          {active.next && <div className="bingo-next"><strong>WHERE TO NEXT?</strong><p>{active.next}</p></div>}
          {stamped.includes(active.id) ?
            <div className="bingo-complete">✓ Stamped in this preview <button type="button" onClick={() => setActiveId(null)}>Close</button></div> :
            <button type="button" className="bingo-action" disabled={active.id === 'crown-quest' && shops.length !== 3} onClick={() => stamp(active.id)}>
              {active.id === 'crown-quest' ? 'Stamp after three discoveries ✓' : active.id === 'entwined' ? 'Simulate Entwined check-in ✓' : 'Stamp this preview square ✓'}
            </button>}
          <small className="bingo-disclaimer">Preview interaction only. Real completion proof will be added before launch.</small>
        </section>
      </div>}
    </main>
  );
}
