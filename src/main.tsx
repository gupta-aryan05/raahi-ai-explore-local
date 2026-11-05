import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BrowserRouter,
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Compass,
  ExternalLink,
  Heart,
  Landmark,
  MapPin,
  Menu,
  MessageCircle,
  Search,
  Sparkles,
  Trophy,
  UtensilsCrossed,
  Wallet,
  X,
  Clock3,
  Route as RouteIcon,
  BadgeCheck,
  RefreshCw,
  Ticket,
  Star,
} from 'lucide-react';
import { places, cities } from '../shared/places.js';
import { foods } from '../shared/food.js';
import { calculateBudget } from '../shared/budget.js';
import {
  calculateXP,
  completeStop,
  directionsUrl,
  getPlace,
  initialProgress,
  makeOfflineTrail,
  mapsUrl,
  markArrived,
} from '../shared/trails.js';
import './style.css';

type Place = (typeof places)[number];
type Food = (typeof foods)[number];
type Stop = { placeId: string; clue: string; question: string; options: string[]; answer: number };
type Trail = {
  id: string;
  city: string;
  interest: string;
  hours: number;
  budget: number;
  mode: 'ai' | 'offline';
  title: string;
  description: string;
  stops: Stop[];
  createdAt: number;
  notice?: string;
};
type Progress = { trailId: string; completed: number[]; arrived: number[]; finished: boolean };
type RecordItem = { trail: Trail; progress: Progress };

type Message = { who: 'user' | 'ai'; text: string };

const STORAGE = 'raahi-v1-records';
const FAV_STORAGE = 'raahi-favorites';
const FOOD_SAVE_STORAGE = 'raahi-food-saved';

const CATEGORY_COLORS: Record<string, string> = {
  Spiritual: 'chip chip-orange',
  Nature: 'chip chip-green',
  History: 'chip chip-gold',
  Architecture: 'chip chip-gold',
  Culture: 'chip chip-peach',
};

const PLACE_IMAGES: Record<string, { src: string; credit: string }> = {
  'taj-mahal': { src: 'https://commons.wikimedia.org/wiki/Special:FilePath/Taj_Mahal_in_March_2004.jpg?width=1200', credit: 'Wikimedia Commons' },
  'agra-fort': { src: 'https://commons.wikimedia.org/wiki/Special:FilePath/Agra_Fort%2C_India.jpg?width=1200', credit: 'Wikimedia Commons' },
  'hawa-mahal': { src: 'https://commons.wikimedia.org/wiki/Special:FilePath/Hawa_Mahal_2011.jpg?width=1200', credit: 'Wikimedia Commons' },
  'amber-fort': { src: 'https://commons.wikimedia.org/wiki/Special:FilePath/Amer_Fort_-_Jaipur.jpg?width=1200', credit: 'Wikimedia Commons' },
  pinjore: { src: 'https://commons.wikimedia.org/wiki/Special:FilePath/Yadavindra_Gardens%2C_Pinjore.jpg?width=1200', credit: 'Wikimedia Commons' },
  brahma: { src: 'https://commons.wikimedia.org/wiki/Special:FilePath/Brahma_Sarovar%2C_Kurukshetra.jpg?width=1200', credit: 'Wikimedia Commons' },
  jyotisar: { src: 'https://commons.wikimedia.org/wiki/Special:FilePath/Jyotisar%2C_Kurukshetra.jpg?width=1200', credit: 'Wikimedia Commons' },
  sheikh: { src: 'https://commons.wikimedia.org/wiki/Special:FilePath/Sheikh_Chilli%27s_Tomb%2C_Thanesar.jpg?width=1200', credit: 'Wikimedia Commons' },
  nada: { src: 'https://commons.wikimedia.org/wiki/Special:FilePath/Gurudwara_Nada_Sahib%2C_Panchkula.jpg?width=1200', credit: 'Wikimedia Commons' },
};

const FOOD_IMAGES: Record<string, string> = {
  'haryana-bajra': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80',
  'haryana-lassi': 'https://images.unsplash.com/photo-1626200419199-391ae4be7a4b?auto=format&fit=crop&w=900&q=80',
  'panchkula-paratha': 'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=900&q=80',
  'agra-petha': 'https://images.unsplash.com/photo-1605197161470-5f4d098d4e58?auto=format&fit=crop&w=900&q=80',
  'jaipur-dal-bati': 'https://images.unsplash.com/photo-1666190092159-3171cf0f1c0d?auto=format&fit=crop&w=900&q=80',
};

function loadRecords(): RecordItem[] {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE) || '[]');
    return Array.isArray(data) ? data.filter((r: any) => r?.trail?.stops && r?.progress?.completed) : [];
  } catch {
    return [];
  }
}

function useRecords() {
  const [records, setRecords] = useState<RecordItem[]>(loadRecords);
  const update = (record: RecordItem) =>
    setRecords((old) => {
      const updated = [record, ...old.filter((r) => r.trail.id !== record.trail.id)].slice(0, 40);
      localStorage.setItem(STORAGE, JSON.stringify(updated));
      return updated;
    });
  return { records, update };
}

function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(FAV_STORAGE) || '[]');
    } catch {
      return [];
    }
  });
  const toggle = (id: string) => {
    setFavorites((old) => {
      const next = old.includes(id) ? old.filter((item) => item !== id) : [...old, id];
      localStorage.setItem(FAV_STORAGE, JSON.stringify(next));
      return next;
    });
  };
  return { favorites, toggle };
}

function placeImage(place: Place) {
  return PLACE_IMAGES[place.id];
}

function formatCategory(place: Place) {
  return place.hidden ? 'Hidden Gem' : place.category;
}

function Logo() {
  return (
    <Link to="/" className="logo" aria-label="RAAHI home">
      <span className="logo-icon"><Landmark size={18} /></span>
      <span>
        <strong>RAAHI</strong>
        <small>Beyond Maps. Into Stories.</small>
      </span>
    </Link>
  );
}

function Layout({ children, records }: { children: React.ReactNode; records: RecordItem[] }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { xp } = calculateXP(records);
  return (
    <>
      <header className="site-header">
        <div className="container nav-row">
          <Logo />
          <nav className={open ? 'main-nav open' : 'main-nav'}>
            <NavLink to="/" onClick={() => setOpen(false)}>Home</NavLink>
            <NavLink to="/discover" onClick={() => setOpen(false)}>Explore</NavLink>
            <NavLink to="/plan" onClick={() => setOpen(false)}>Trip Planner</NavLink>
            <NavLink to="/food" onClick={() => setOpen(false)}>TasteTrail</NavLink>
            <NavLink to="/wallet" onClick={() => setOpen(false)}>Wallet</NavLink>
            <NavLink to="/passport" onClick={() => setOpen(false)}>Passport</NavLink>
          </nav>
          <div className="nav-actions">
            <Link to="/discover" className="icon-btn" aria-label="Search"><Search size={18} /></Link>
            <Link to="/discover" className="country-pill"><MapPin size={14} /> India <ChevronDown size={14} /></Link>
            <Link to="/passport" className="xp-pill">{xp} XP</Link>
            <button className="menu-btn" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
              {open ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>
      </header>
      {children}
      <footer className="site-footer">
        <div className="container footer-row">
          <Logo />
          <p>RAAHI helps you discover local places, food, stories and simple travel plans across India.</p>
          <span>{location.pathname === '/' ? 'Start with Explore or Trip Planner.' : 'Built for easy local exploration.'}</span>
        </div>
      </footer>
    </>
  );
}

function ImageBlock({ place, className = '' }: { place: Place; className?: string }) {
  const img = placeImage(place);
  return img ? (
    <div className={`image-block ${className}`}>
      <img src={img.src} alt={place.name} loading="lazy" />
    </div>
  ) : (
    <div className={`image-block placeholder ${className}`}>
      <Landmark size={32} />
      <span>{place.name}</span>
      <small>Verified image coming soon</small>
    </div>
  );
}

function PlaceCard({ place, favorites, toggleFavorite }: { place: Place; favorites: string[]; toggleFavorite: (id: string) => void }) {
  return (
    <article className="place-card">
      <div className="card-image-wrap">
        <ImageBlock place={place} />
        <button className={favorites.includes(place.id) ? 'fav-btn active' : 'fav-btn'} onClick={() => toggleFavorite(place.id)} aria-label="Save place">
          <Heart size={18} fill={favorites.includes(place.id) ? 'currentColor' : 'none'} />
        </button>
        <span className={CATEGORY_COLORS[place.category] || 'chip chip-gold'}>{formatCategory(place)}</span>
      </div>
      <div className="place-card-body">
        <div className="card-location"><MapPin size={14} /> {place.city}, {place.region}</div>
        <h3>{place.name}</h3>
        <p>{place.story}</p>
        <div className="card-actions-row">
          <a href={mapsUrl(place)} target="_blank" rel="noreferrer" className="ghost-link">Map</a>
          <Link to={`/places/${place.slug}`} className="solid-link">Details</Link>
        </div>
      </div>
    </article>
  );
}

function Home({ records }: { records: RecordItem[] }) {
  const { favorites, toggle } = useFavorites();
  const { xp, complete, stops } = calculateXP(records);
  const featuredIds = ['taj-mahal', 'hawa-mahal', 'amber-fort', 'brahma', 'pinjore', 'agra-fort'];
  const featuredPlaces = featuredIds.map((id) => places.find((item) => item.id === id)).filter(Boolean) as Place[];
  const recent = records[0];
  return (
    <main>
      <section className="hero-v2">
        <div className="hero-bg" />
        <div className="hero-overlay" />
        <div className="container hero-content">
          <div className="hero-copy">
            <span className="eyebrow-pill"><Sparkles size={14} /> All-India local exploration</span>
            <h1>
              Beyond Maps.
              <span> Into Stories.</span>
            </h1>
            <p>
              Discover heritage, food, spiritual places and hidden local experiences with simple planning and clear information.
            </p>
            <div className="hero-cta-row">
              <Link className="btn-primary" to="/plan">Plan My Journey <ArrowRight size={17} /></Link>
              <Link className="btn-secondary" to="/discover">Explore Places</Link>
            </div>
            <div className="hero-stats">
              <div><strong>{places.length}</strong><span>Curated places</span></div>
              <div><strong>{cities.length}</strong><span>Supported cities</span></div>
              <div><strong>{foods.length}</strong><span>Food ideas</span></div>
            </div>
          </div>
        </div>
        <div className="container feature-strip">
          <Link to="/plan"><Compass size={20} /><span><b>Trip Planner</b><small>Simple AI or offline itinerary</small></span></Link>
          <Link to="/wallet"><Wallet size={20} /><span><b>RAAHI Wallet</b><small>Budget breakdown</small></span></Link>
          <Link to="/food"><UtensilsCrossed size={20} /><span><b>TasteTrail</b><small>Regional food guide</small></span></Link>
          <Link to="/discover"><BookOpen size={20} /><span><b>Stories</b><small>Place details and history</small></span></Link>
          <Link to="/passport"><Trophy size={20} /><span><b>Passport</b><small>XP and progress</small></span></Link>
        </div>
      </section>

      <section className="section-light">
        <div className="container section-head-row">
          <div>
            <span className="eyebrow-text">EXPLORE INDIA</span>
            <h2>Places that feel clear and easy to explore.</h2>
          </div>
          <Link to="/discover" className="text-link">See all destinations <ArrowRight size={15} /></Link>
        </div>
        <div className="container card-grid six-grid">
          {featuredPlaces.map((place) => (
            <PlaceCard key={place.id} place={place} favorites={favorites} toggleFavorite={toggle} />
          ))}
        </div>
      </section>

      <section className="section-orange">
        <div className="container two-col-cards">
          <div className="info-panel warm">
            <span className="eyebrow-text">WHAT MAKES RAAHI USEFUL</span>
            <h3>Not too complex. Just practical.</h3>
            <ul>
              <li>Pick a city and generate a trail.</li>
              <li>Open locations in Google Maps.</li>
              <li>Explore local food and culture suggestions.</li>
              <li>Track XP in a simple explorer passport.</li>
            </ul>
          </div>
          <div className="info-panel white">
            <span className="eyebrow-text">CONTINUE YOUR JOURNEY</span>
            <h3>Everything important in one place.</h3>
            <div className="quick-links">
              <Link to="/plan">Start a trail</Link>
              <Link to="/wallet">Check your budget</Link>
              <Link to="/food">Browse food ideas</Link>
              <Link to="/passport">View your progress</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section-passport-simple">
        <div className="container passport-simple-grid">
          <div className="passport-copy">
            <span className="eyebrow-text">EXPLORER PASSPORT</span>
            <h2>Simple travel progress, not a complicated dashboard.</h2>
            <p>See your XP, completed trails, and saved memories in one clean page.</p>
            <Link to="/passport" className="btn-primary">Open Passport <ArrowRight size={16} /></Link>
          </div>
          <div className="passport-summary-card">
            <div className="passport-number"><Trophy size={22} /> <strong>{xp}</strong><span>Total XP</span></div>
            <div className="passport-number"><BadgeCheck size={22} /> <strong>{complete}</strong><span>Trails completed</span></div>
            <div className="passport-number"><RouteIcon size={22} /> <strong>{stops}</strong><span>Stops unlocked</span></div>
            {recent ? <div className="passport-recent">Latest trail: <b>{recent.trail.title}</b></div> : <div className="passport-recent">Start your first trail to fill your passport.</div>}
          </div>
        </div>
      </section>
    </main>
  );
}

function Discover() {
  const { favorites, toggle } = useFavorites();
  const params = new URLSearchParams(window.location.search);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('All');
  const [category, setCategory] = useState('All');
  const [hidden, setHidden] = useState(params.get('hidden') === '1');

  const filtered = places.filter((p) => {
    const hit = `${p.name} ${p.city} ${p.region} ${p.story}`.toLowerCase().includes(search.toLowerCase());
    return hit && (city === 'All' || p.city === city) && (category === 'All' || p.category === category) && (!hidden || p.hidden);
  });

  return (
    <main className="page-wrap light-page">
      <div className="container page-head">
        <span className="eyebrow-pill small">The local atlas</span>
        <h1>Explore places across India.</h1>
        <p>Search by city and category. If a verified photo is unavailable, we keep the place and show a clean placeholder.</p>
        <div className="filter-row">
          <label className="search-box"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search places or stories" /></label>
          <select value={city} onChange={(e) => setCity(e.target.value)}><option>All</option>{cities.map((c) => <option key={c}>{c}</option>)}</select>
          <select value={category} onChange={(e) => setCategory(e.target.value)}><option>All</option>{[...new Set(places.map((p) => p.category))].map((c) => <option key={c}>{c}</option>)}</select>
          <label className="checkbox-line"><input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} /> Hidden gems only</label>
        </div>
      </div>
      <div className="container card-grid three-grid">
        {filtered.map((place) => <PlaceCard key={place.id} place={place} favorites={favorites} toggleFavorite={toggle} />)}
      </div>
      {!filtered.length && <div className="container empty-box">No destinations match your filters right now.</div>}
    </main>
  );
}

function Chat({ place }: { place: Place }) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function ask(text?: string) {
    const q = (text ?? question).trim();
    if (!q || busy) return;
    setBusy(true);
    setError('');
    setMessages((m) => [...m, { who: 'user', text: q }]);
    setQuestion('');
    try {
      const res = await fetch('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ placeId: place.id, question: q }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to answer right now.');
      setMessages((m) => [...m, { who: 'ai', text: data.answer }]);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="detail-panel">
      <div className="panel-head"><MessageCircle size={18} /> Ask the Place</div>
      <div className="suggestions">
        {['What is special about this place?', 'Tell me the history in simple words.', 'What should I know before visiting?'].map((q) => (
          <button key={q} onClick={() => ask(q)}>{q}</button>
        ))}
      </div>
      <div className="chat-box">
        {messages.length === 0 ? <p className="chat-empty">Ask about history, significance, or travel tips. Answers use the verified place context available on the server.</p> : messages.map((m, i) => <div key={i} className={`bubble ${m.who}`}>{m.text}</div>)}
        {error && <div className="error-box">{error}</div>}
      </div>
      <div className="chat-input-row">
        <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask a question" />
        <button onClick={() => ask()} disabled={busy}>{busy ? 'Thinking…' : 'Ask'}</button>
      </div>
    </section>
  );
}

function PlaceDetail() {
  const { slug } = useParams();
  const place = places.find((p) => p.slug === slug);
  if (!place) return <NotFound />;
  return (
    <main className="page-wrap light-page">
      <div className="container detail-hero-grid">
        <div>
          <Link to="/discover" className="back-link"><ArrowLeft size={15} /> Back to explore</Link>
          <span className={CATEGORY_COLORS[place.category] || 'chip chip-gold'}>{formatCategory(place)}</span>
          <h1>{place.name}</h1>
          <p className="lead-copy">{place.story}</p>
          <div className="detail-meta-list">
            <div><MapPin size={16} /> {place.address}</div>
            <div><Clock3 size={16} /> Suggested stop: around {place.visit} minutes</div>
            <div><Ticket size={16} /> Entry fee / timings: verify on official source</div>
          </div>
          <div className="detail-action-row">
            <a className="btn-primary" href={mapsUrl(place)} target="_blank" rel="noreferrer">Open in Maps</a>
            <a className="btn-secondary" href={place.source} target="_blank" rel="noreferrer">Official source <ExternalLink size={15} /></a>
          </div>
        </div>
        <ImageBlock place={place} className="detail-image" />
      </div>
      <div className="container detail-body-grid">
        <section className="detail-panel">
          <div className="panel-head"><BookOpen size={18} /> About this place</div>
          <p>{place.fact}</p>
          <div className="simple-facts">
            <div><strong>City</strong><span>{place.city}</span></div>
            <div><strong>State / Region</strong><span>{place.region}</span></div>
            <div><strong>Category</strong><span>{place.category}</span></div>
            <div><strong>Source</strong><a href={place.source} target="_blank" rel="noreferrer">View source</a></div>
          </div>
        </section>
        <section className="detail-panel">
          <div className="panel-head"><UtensilsCrossed size={18} /> Nearby / local food ideas</div>
          <p>Food information in RAAHI is shown as regional suggestions unless a specific restaurant is verified.</p>
          <div className="mini-list">
            {foods.filter((f) => f.city === place.city || f.region === place.region).slice(0, 3).map((f) => <span key={f.id}>{f.name}</span>)}
            {!foods.some((f) => f.city === place.city || f.region === place.region) && <span>Browse TasteTrail for food suggestions.</span>}
          </div>
        </section>
        <Chat place={place} />
      </div>
    </main>
  );
}

function Plan({ records, update }: { records: RecordItem[]; update: (record: RecordItem) => void }) {
  const navigate = useNavigate();
  const [city, setCity] = useState(cities[0] || 'Ambala');
  const [interest, setInterest] = useState('All');
  const [hours, setHours] = useState(5);
  const [budget, setBudget] = useState(1200);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function generateTrail() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/trails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, interest, hours, budget }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create trail.');
      const record = { trail: data as Trail, progress: initialProgress(data as Trail) };
      update(record);
      navigate(`/trail/${record.trail.id}`);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  const latest = records.find((r) => !r.progress.finished);

  return (
    <main className="page-wrap warm-page">
      <div className="container planner-layout">
        <div className="planner-card">
          <span className="eyebrow-text">TRIP PLANNER</span>
          <h1>Build a local route in minutes.</h1>
          <p>Choose a supported city, your available time, and an approximate budget. RAAHI will create a trail using verified destination data.</p>
          <div className="field-grid">
            <label><span>City</span><select value={city} onChange={(e) => setCity(e.target.value)}>{cities.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label><span>Interest</span><select value={interest} onChange={(e) => setInterest(e.target.value)}><option>All</option>{[...new Set(places.map((p) => p.category))].map((c) => <option key={c}>{c}</option>)}</select></label>
            <label><span>Hours available</span><input type="number" min={2} max={12} value={hours} onChange={(e) => setHours(Number(e.target.value))} /></label>
            <label><span>Budget (₹)</span><input type="number" min={0} value={budget} onChange={(e) => setBudget(Number(e.target.value))} /></label>
          </div>
          <button className="btn-primary planner-btn" onClick={generateTrail} disabled={busy}>{busy ? 'Generating…' : 'Generate Trail'}</button>
          {error && <div className="error-box">{error}</div>}
        </div>
        <aside className="planner-card soft-card">
          <span className="eyebrow-text">HOW IT WORKS</span>
          <ol className="simple-steps">
            <li>Generate a route from real curated places.</li>
            <li>Open the stop in Google Maps.</li>
            <li>Confirm arrival manually and answer the quiz.</li>
            <li>Earn XP and complete the trail.</li>
          </ol>
          {latest && <Link to={`/trail/${latest.trail.id}`} className="resume-box">Resume: {latest.trail.title} <ArrowRight size={16} /></Link>}
        </aside>
      </div>
    </main>
  );
}

function TrailView({ records, update }: { records: RecordItem[]; update: (record: RecordItem) => void }) {
  const { id } = useParams();
  const record = records.find((r) => r.trail.id === id);
  const navigate = useNavigate();
  const [choice, setChoice] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  if (!record) return <NotFound />;
  const { trail, progress } = record;
  const index = progress.completed.length;
  const stop = trail.stops[index];
  const currentPlace = stop ? getPlace(stop.placeId) : null;
  const allPlaces = trail.stops.map((s) => getPlace(s.placeId)).filter(Boolean) as Place[];

  function saveProgress(next: Progress) {
    update({ trail, progress: next });
  }
  function arrive() {
    saveProgress(markArrived(progress, index));
    setFeedback('Arrival confirmed. You can answer the quiz now.');
  }
  function submit() {
    if (choice === null) return setFeedback('Choose an option first.');
    const result = completeStop(progress, trail, index, choice);
    saveProgress(result.progress);
    setFeedback(result.correct ? 'Correct! Next stop unlocked.' : result.reason || 'Try again.');
  }
  function restart() {
    update({ trail, progress: initialProgress(trail) });
    setChoice(null);
    setFeedback('Trail restarted.');
  }
  if (progress.finished) {
    return (
      <main className="page-wrap light-page">
        <div className="container finish-box">
          <Trophy size={36} />
          <h1>Trail completed!</h1>
          <p>You completed <b>{trail.title}</b>. Your XP has been added only once.</p>
          <div className="finish-actions">
            <Link className="btn-primary" to="/passport">View Passport</Link>
            <Link className="btn-secondary" to="/discover">Explore More Places</Link>
          </div>
        </div>
      </main>
    );
  }
  return (
    <main className="page-wrap light-page">
      <div className="container trail-layout">
        <div className="trail-main-card">
          <span className="eyebrow-pill small">ACTIVE TRAIL</span>
          <h1>{trail.title}</h1>
          <p>{trail.description}</p>
          {trail.notice && <div className="notice-box">{trail.notice}</div>}
          <div className="progress-line">Stop {index + 1} of {trail.stops.length}</div>
          {currentPlace && (
            <>
              <ImageBlock place={currentPlace} className="trail-image" />
              <h2>{currentPlace.name}</h2>
              <p className="lead-copy">{stop.clue}</p>
              <div className="detail-action-row">
                <a className="btn-secondary" href={mapsUrl(currentPlace)} target="_blank" rel="noreferrer">Open in Maps</a>
                <button className="btn-primary" onClick={arrive}>I have arrived</button>
              </div>
              <div className="quiz-card">
                <h3>{stop.question}</h3>
                <div className="options-list">
                  {stop.options.map((opt, i) => (
                    <label key={opt} className={choice === i ? 'option active' : 'option'}>
                      <input type="radio" name="quiz" checked={choice === i} onChange={() => setChoice(i)} />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
                <button className="btn-primary" onClick={submit}>Submit Answer</button>
                {feedback && <div className="info-box">{feedback}</div>}
              </div>
            </>
          )}
        </div>
        <aside className="trail-side-card">
          <h3>Trail overview</h3>
          <ol className="stop-list">
            {allPlaces.map((p, i) => <li key={p.id} className={progress.completed.includes(i) ? 'done' : ''}>{p.name}</li>)}
          </ol>
          <a href={directionsUrl(allPlaces)} target="_blank" rel="noreferrer" className="btn-secondary full-width">Open directions</a>
          <button className="btn-secondary full-width" onClick={restart}>Restart Trail</button>
          <button className="btn-secondary full-width" onClick={() => navigate('/passport')}>Go to Passport</button>
        </aside>
      </div>
    </main>
  );
}

function Passport({ records }: { records: RecordItem[] }) {
  const { xp, complete, stops } = calculateXP(records);
  const badges = [
    { label: 'First Steps', unlocked: xp >= 50, note: 'Complete your first stop' },
    { label: 'Mystery Explorer', unlocked: complete >= 1, note: 'Finish one full trail' },
    { label: 'Heritage Hunter', unlocked: stops >= 4, note: 'Unlock four stops' },
    { label: 'Local Legend', unlocked: xp >= 500, note: 'Reach 500 XP' },
  ];
  return (
    <main className="page-wrap light-page">
      <div className="container passport-page">
        <div className="page-head compact-head">
          <span className="eyebrow-pill small">Explorer Passport</span>
          <h1>Your progress is simple and clear.</h1>
          <p>No complicated panels — just your completed trails, XP and badges.</p>
        </div>
        <div className="passport-grid-simple">
          <div className="stat-card"><Trophy size={22} /><strong>{xp}</strong><span>Total XP</span></div>
          <div className="stat-card"><RouteIcon size={22} /><strong>{stops}</strong><span>Stops completed</span></div>
          <div className="stat-card"><BadgeCheck size={22} /><strong>{complete}</strong><span>Trails finished</span></div>
        </div>
        <div className="passport-content-grid">
          <section className="detail-panel">
            <div className="panel-head"><BadgeCheck size={18} /> Badges</div>
            <div className="badge-grid-simple">
              {badges.map((badge) => <div key={badge.label} className={badge.unlocked ? 'badge-card on' : 'badge-card'}><strong>{badge.label}</strong><span>{badge.note}</span></div>)}
            </div>
          </section>
          <section className="detail-panel">
            <div className="panel-head"><Compass size={18} /> Recent trails</div>
            {records.length ? (
              <ul className="record-list">
                {records.slice(0, 6).map((item) => <li key={item.trail.id}><b>{item.trail.title}</b><span>{item.progress.completed.length}/{item.trail.stops.length} stops completed</span></li>)}
              </ul>
            ) : <p className="chat-empty">You have not started a trail yet.</p>}
          </section>
        </div>
      </div>
    </main>
  );
}

function FoodCard({ item, saved, toggle }: { item: Food; saved: string[]; toggle: (id: string) => void }) {
  return (
    <article className="food-card-v2">
      <div className="food-card-image">
        {FOOD_IMAGES[item.id] ? <img src={FOOD_IMAGES[item.id]} alt={item.name} loading="lazy" /> : <div className="food-placeholder"><UtensilsCrossed size={28} /></div>}
      </div>
      <div className="food-card-body">
        <span className="eyebrow-text">{item.region} · {item.diet}</span>
        <h3>{item.name}</h3>
        <p>{item.story}</p>
        <small>Price and restaurant details are not verified unless linked.</small>
        <div className="food-card-actions">
          <a href={item.source} target="_blank" rel="noreferrer">Source</a>
          <button onClick={() => toggle(item.id)}>{saved.includes(item.id) ? 'Saved ✓' : 'Save'}</button>
        </div>
      </div>
    </article>
  );
}

function FoodPage() {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('All');
  const [saved, setSaved] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(FOOD_SAVE_STORAGE) || '[]'); } catch { return []; }
  });
  const list = foods.filter((item) => (city === 'All' || item.city === city) && `${item.name} ${item.story} ${item.region}`.toLowerCase().includes(query.toLowerCase()));
  const toggle = (id: string) => setSaved((old) => {
    const next = old.includes(id) ? old.filter((x) => x !== id) : [...old, id];
    localStorage.setItem(FOOD_SAVE_STORAGE, JSON.stringify(next));
    return next;
  });
  return (
    <main className="page-wrap light-page">
      <div className="container page-head">
        <span className="eyebrow-pill small">TasteTrail</span>
        <h1>Local food ideas that are easy to understand.</h1>
        <p>These are regional dish suggestions, not guaranteed restaurant listings.</p>
        <div className="filter-row">
          <label className="search-box"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a dish" /></label>
          <select value={city} onChange={(e) => setCity(e.target.value)}><option>All</option>{[...new Set(foods.map((f) => f.city))].map((c) => <option key={c}>{c}</option>)}</select>
        </div>
      </div>
      <div className="container food-grid-v2">
        {list.map((item) => <FoodCard key={item.id} item={item} saved={saved} toggle={toggle} />)}
      </div>
    </main>
  );
}

function WalletPage() {
  const [travelers, setTravelers] = useState(2);
  const [transport, setTransport] = useState(500);
  const [food, setFood] = useState(250);
  const [parking, setParking] = useState(50);
  const [extras, setExtras] = useState(150);
  const [contingency, setContingency] = useState(10);
  const [budgetLimit, setBudgetLimit] = useState(2500);
  const estimate = calculateBudget({ travelers, transport, food, parking, extras, contingency });
  const over = estimate.total > budgetLimit;

  return (
    <main className="page-wrap warm-page">
      <div className="container wallet-layout-v2">
        <section className="wallet-card-editor">
          <span className="eyebrow-pill small">RAAHI Wallet</span>
          <h1>Simple trip budgeting.</h1>
          <p>Change any number and get an instant estimate. Unknown ticket prices are not silently assumed.</p>
          <div className="wallet-fields-v2">
            {[
              ['Travelers', travelers, setTravelers],
              ['Transport total ₹', transport, setTransport],
              ['Food per person ₹', food, setFood],
              ['Parking ₹', parking, setParking],
              ['Extra activities per person ₹', extras, setExtras],
              ['Contingency %', contingency, setContingency],
              ['Budget limit ₹', budgetLimit, setBudgetLimit],
            ].map(([label, value, setter]: any) => (
              <label key={label}><span>{label}</span><input type="number" value={value} min={0} onChange={(e) => setter(Number(e.target.value))} /></label>
            ))}
          </div>
        </section>
        <aside className="wallet-card-report">
          <Wallet size={28} />
          <h2>Estimated total</h2>
          <strong>₹{estimate.total.toLocaleString('en-IN')}</strong>
          <div className="wallet-line"><span>Base</span><b>₹{estimate.base.toLocaleString('en-IN')}</b></div>
          <div className="wallet-line"><span>Reserve</span><b>₹{estimate.reserve.toLocaleString('en-IN')}</b></div>
          <div className="wallet-line"><span>Per person</span><b>₹{estimate.perPerson.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</b></div>
          <div className={over ? 'budget-status bad' : 'budget-status'}>{over ? 'Over your planned budget' : 'Within your planned budget'}</div>
          <p className="wallet-note">Ticket fees may still need to be checked separately at official sources.</p>
        </aside>
      </div>
    </main>
  );
}

function NotFound() {
  return (
    <main className="page-wrap light-page">
      <div className="container empty-box">
        <h1>Page not found</h1>
        <p>The page you’re looking for does not exist.</p>
        <Link to="/" className="btn-primary">Go home</Link>
      </div>
    </main>
  );
}

function App() {
  const { records, update } = useRecords();
  return (
    <BrowserRouter>
      <Layout records={records}>
        <Routes>
          <Route path="/" element={<Home records={records} />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/places/:slug" element={<PlaceDetail />} />
          <Route path="/plan" element={<Plan records={records} update={update} />} />
          <Route path="/trail/:id" element={<TrailView records={records} update={update} />} />
          <Route path="/passport" element={<Passport records={records} />} />
          <Route path="/food" element={<FoodPage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
