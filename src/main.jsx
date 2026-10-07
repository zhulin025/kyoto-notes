import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  ArrowRight,
  MapPin,
  Search,
  Bookmark,
  Check,
  Plus,
  X,
  Menu,
  TrainFront,
  Footprints,
  Clock,
  ChevronDown,
  Leaf,
  Compass,
  Coffee,
  Map,
  Download,
  Heart,
  Wallet,
  Sun,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import {
  places,
  sources,
  dayPlans,
  seasons,
  etiquette,
  checklist,
} from "./data";
import SketchMap from "./SketchMap";
import "./style.css";
const TempleAtlas = lazy(() => import("./TempleAtlas"));
const Pavilion = lazy(() => import("./Pavilion"));
function useSaved(key, initial) {
  const [v, set] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(key));
      return Array.isArray(initial)
        ? Array.isArray(stored)
          ? stored
          : initial
        : (stored ?? initial);
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {}
  }, [v, key]);
  return [v, set];
}
function Source({ id = "city" }) {
  return (
    <a
      className="source"
      href={sources[id][1]}
      target="_blank"
      rel="noreferrer"
    >
      {sources[id][0]} <ExternalLink size={12} />
    </a>
  );
}
function App() {
  const [favorites, setFavorites] = useSaved("kyoto-favorites", []),
    [checks, setChecks] = useSaved("kyoto-checklist", []);
  const [modal, setModal] = useState(null),
    [savedOpen, setSavedOpen] = useState(false),
    [searchOpen, setSearchOpen] = useState(false),
    [query, setQuery] = useState(""),
    [menu, setMenu] = useState(false),
    [filter, setFilter] = useState("全部"),
    [mapFilter, setMapFilter] = useState("全部"),
    [mapPlace, setMapPlace] = useState(places[0]),
    [season, setSeason] = useState(2),
    [days, setDays] = useState(3),
    [activeDay, setActiveDay] = useState(0),
    [transport, setTransport] = useState("机场到京都"),
    [budget, setBudget] = useState("舒适"),
    [people, setPeople] = useState(2),
    [toast, setToast] = useState(""),
    [showModel, setShowModel] = useState(false),
    [credits, setCredits] = useState(null);
  const dialogRef = useRef(),
    lastFocus = useRef();
  const overlay = modal || savedOpen || searchOpen || credits;
  useEffect(() => {
    if (!overlay) return;
    lastFocus.current = document.activeElement;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() =>
      dialogRef.current?.querySelector("button,input,a")?.focus(),
    );
    function key(e) {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const nodes = [
          ...dialogRef.current.querySelectorAll(
            'button,a,input,[tabindex="0"]',
          ),
        ].filter((n) => !n.disabled);
        const f = nodes[0],
          l = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === f) {
          e.preventDefault();
          l.focus();
        } else if (!e.shiftKey && document.activeElement === l) {
          e.preventDefault();
          f.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", key);
      lastFocus.current?.focus();
    };
  }, [!!overlay]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);
  const close = () => {
    setModal(null);
    setSavedOpen(false);
    setSearchOpen(false);
    setCredits(null);
  };
  const save = (p) => {
    setFavorites((v) =>
      v.includes(p.id) ? v.filter((id) => id !== p.id) : [...v, p.id],
    );
    setToast(
      favorites.includes(p.id) ? "已从旅行清单移除" : "已加入你的旅行清单",
    );
  };
  const chosen = places.filter((p) => favorites.includes(p.id));
  const filtered = places.filter(
    (p) =>
      filter === "全部" ||
      (filter === "景点"
        ? ["景点", "人文"].includes(p.type)
        : filter === "散步"
          ? ["自然", "散步"].includes(p.type)
          : p.type === filter),
  );
  const exportText = (favoritesOnly = false) => {
    const content = favoritesOnly
      ? `我的京都旅行清单\n\n${chosen.map((p) => `${p.name} · ${p.region}\n${p.desc}\n交通：${p.access}\n导航：https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.query)}\n`).join("\n")}`
      : `京都慢游记 · ${days} 天行程\n以下为旅行规划建议，请按实际开放与体力调整。\n\n${dayPlans
          .slice(0, days)
          .map(
            (d, i) =>
              `DAY ${i + 1}｜${d.area}\n${d.title}\n${d.stops.map((s) => s.join(" · ")).join("\n")}\n雨天：${d.rain}\n`,
          )
          .join("\n")}\n更多指南：https://kyoto.liuwa.xyz`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" }),
      u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u;
    a.download = favoritesOnly ? "我的京都收藏.txt" : `京都${days}天行程.txt`;
    a.click();
    URL.revokeObjectURL(u);
    setToast("旅行手帐已下载");
  };
  const nav = [
    ["explore", "探索京都"],
    ["map", "手绘地图"],
    ["culture", "历史人文"],
    ["essentials", "旅行须知"],
    ["itinerary", "行程灵感"],
  ];
  return (
    <>
      <a href="#explore" className="skip-link">
        跳到旅行内容
      </a>
      <header>
        <a className="brand" href="#">
          <span className="brand-stamp">京</span>
          <span>
            京都慢游记<small>KYOTO, AT YOUR OWN PACE</small>
          </span>
        </a>
        <nav className={menu ? "open" : ""}>
          {nav.map(([id, text]) => (
            <a key={id} href={`#${id}`} onClick={() => setMenu(false)}>
              {text}
            </a>
          ))}
        </nav>
        <div className="header-actions">
          <button
            className="icon-btn"
            aria-label="搜索京都"
            onClick={() => setSearchOpen(true)}
          >
            <Search size={19} />
          </button>
          <button
            className="saved-btn"
            aria-label={`我的旅行清单，${favorites.length} 个收藏`}
            onClick={() => setSavedOpen(true)}
          >
            <Bookmark size={16} />
            <span>我的旅行清单</span>
            {favorites.length > 0 && <i>{favorites.length}</i>}
          </button>
          <button
            className="icon-btn mobile-menu"
            aria-label="打开导航菜单"
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <main>
        <section className="hero">
          <img
            className="hero-image"
            src="/images/kyoto.webp"
            alt="京都东山暮色中的八坂之塔与传统街道"
            fetchPriority="high"
          />
          <div className="hero-shade" />
          <div className="hero-content">
            <p className="eyebrow">
              <span /> 一座古都，一千种慢下来的理由
            </p>
            <h1>
              把日子，
              <br />
              交给
              <span className="brush-word">
                京都
                <svg viewBox="0 0 240 15">
                  <path d="M4 9Q99-1 233 8M14 14Q114 4 218 12" />
                </svg>
              </span>
              。
            </h1>
            <p className="hero-description">
              走过千年的街巷，听见竹林的风。
              <br />
              给第一次来京都的你，一份有温度的旅行指南。
            </p>
            <a className="button light" href="#explore">
              开启京都之旅 <ArrowUpRight size={18} />
            </a>
          </div>
          <div className="hero-vertical">
            京都に、恋をする。<small>FALL IN LOVE WITH KYOTO</small>
          </div>
          <div className="hero-bottom">
            <span>
              <MapPin size={14} /> 八坂通 · 东山，京都
            </span>
            <span>
              SCROLL TO EXPLORE <span className="scroll-line" />
            </span>
          </div>
          <div className="hero-seal">
            慢<br />旅
          </div>
        </section>
        <div className="intro-strip">
          <p>
            <span>你好，京都。</span> 初次见面，不必急着看完。
          </p>
          <div>
            <span>
              <Map size={17} /> 一张地图认识京都
            </span>
            <span>
              <Coffee size={17} /> 跟着味道去散步
            </span>
            <span>
              <Footprints size={17} /> 找到自己的节奏
            </span>
          </div>
        </div>
        <section id="explore" className="section explore">
          <div className="section-head">
            <div>
              <p className="eyebrow green">01 / MEET KYOTO</p>
              <h2>你的京都，从哪里开始？</h2>
              <p className="subtext">
                古寺、山林、茶香与日常。挑一个心动的地方，出发就好。
              </p>
            </div>
            <a href="#map" className="text-link">
              在地图上探索 <ArrowUpRight size={17} />
            </a>
          </div>
          <div className="filter-row">
            <div className="pills">
              {["全部", "景点", "美食", "散步"].map((f, i) => (
                <button
                  key={f}
                  aria-pressed={filter === f}
                  className={filter === f ? "active" : ""}
                  onClick={() => setFilter(f)}
                >
                  {
                    [
                      <Compass size={15} />,
                      <MapPin size={15} />,
                      <Coffee size={15} />,
                      <Leaf size={15} />,
                    ][i]
                  }
                  {f === "全部"
                    ? "全部灵感"
                    : f === "景点"
                      ? "古寺与人文"
                      : f === "美食"
                        ? "吃一口京都"
                        : "自然与散步"}
                </button>
              ))}
            </div>
            <span className="muted small">
              {filtered.length} 个值得停留的地方
            </span>
          </div>
          <div className="place-grid">
            {filtered.slice(0, filter === "全部" ? 6 : 20).map((p, i) => (
              <article className="place-card" key={p.id}>
                <div className="place-photo">
                  <button
                    className="photo-button"
                    onClick={() => setModal(p)}
                    aria-label={`了解${p.name}`}
                  >
                    <img
                      src={`/images/${p.img}.webp`}
                      loading="lazy"
                      alt={
                        ["tea"].includes(p.img) ? "抹茶饮品氛围配图" : p.name
                      }
                    />
                  </button>
                  <span className="photo-tag">
                    {p.region} · {p.type}
                  </span>
                  <button
                    className={`save-icon ${favorites.includes(p.id) ? "is-saved" : ""}`}
                    onClick={() => save(p)}
                    aria-label={`${favorites.includes(p.id) ? "取消收藏" : "收藏"}${p.name}`}
                    aria-pressed={favorites.includes(p.id)}
                  >
                    <Bookmark
                      size={17}
                      fill={favorites.includes(p.id) ? "currentColor" : "none"}
                    />
                  </button>
                </div>
                <div className="place-info">
                  <span className="place-en">{p.en.toUpperCase()}</span>
                  <button className="place-title" onClick={() => setModal(p)}>
                    <h3>{p.name}</h3>
                    <ArrowUpRight size={20} />
                  </button>
                  <p>{p.tag}</p>
                  <div className="place-meta">
                    <span>
                      <Clock size={13} />
                      {p.time}
                    </span>
                    <span>{p.type === "美食" ? "寻味京都" : "慢慢游览"} ↗</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {filter === "全部" && (
            <button
              className="button outline explore-more"
              onClick={() => {
                setSearchOpen(true);
                setQuery("");
              }}
            >
              探索全部 16 个地点 <ArrowRight size={16} />
            </button>
          )}
        </section>
        <section id="map" className="map-section">
          <div className="atlas-section">
            <div className="section-head">
              <div>
                <p className="eyebrow green">02 / THE SACRED ATLAS</p>
                <h2>展开一座城，遇见千座寺社。</h2>
                <p className="subtext">
                  沿着京都巨幅手绘地图，按行政区、宗派、寺格与文化遗产分类探索。放大一片街区，发现名刹之外的日常。
                </p>
              </div>
              <span className="handwritten">一寺一社，皆有来处 ↙</span>
            </div>
            <Suspense
              fallback={<div className="atlas-load">正在展开京都寺社图鉴…</div>}
            >
              <TempleAtlas />
            </Suspense>
            <details className="atlas-travel-overview">
              <summary>
                也想找美食与散步？展开旅行地点手绘图 <ArrowUpRight size={16} />
              </summary>
              <div className="map-shell">
                <div className="map-area">
                  <div className="map-tabs">
                    {["全部", "景点", "美食", "散步"].map((f) => (
                      <button
                        key={f}
                        className={mapFilter === f ? "active" : ""}
                        onClick={() => {
                          setMapFilter(f);
                          const first = places.find(
                            (p) =>
                              f === "全部" ||
                              (f === "景点"
                                ? ["景点", "人文"].includes(p.type)
                                : f === "散步"
                                  ? ["散步", "自然"].includes(p.type)
                                  : p.type === f),
                          );
                          if (first) setMapPlace(first);
                        }}
                        aria-pressed={mapFilter === f}
                      >
                        {f === "全部" ? "全部地点" : f}
                      </button>
                    ))}
                  </div>
                  <SketchMap
                    type={mapFilter}
                    selected={mapPlace.id}
                    onSelect={setMapPlace}
                  />
                </div>
                <aside className="map-detail">
                  <span className="eyebrow green">A PLACE TO PAUSE</span>
                  <img
                    src={`/images/${mapPlace.img}.webp`}
                    alt={
                      mapPlace.img === "tea"
                        ? "抹茶饮品氛围配图"
                        : mapPlace.name
                    }
                    loading="lazy"
                  />
                  <span className="region-label">
                    {mapPlace.region} / {mapPlace.type}
                  </span>
                  <h3>{mapPlace.name}</h3>
                  <p>{mapPlace.desc}</p>
                  <span className="small muted">
                    <Clock size={13} /> 建议停留 {mapPlace.time}
                  </span>
                  <button
                    className="button green-button"
                    onClick={() => setModal(mapPlace)}
                  >
                    查看旅行笔记 <ArrowUpRight size={16} />
                  </button>
                  <button className="text-link" onClick={() => save(mapPlace)}>
                    <Bookmark size={15} />
                    {favorites.includes(mapPlace.id)
                      ? "已在旅行清单中"
                      : "收藏这个地方"}
                  </button>
                </aside>
              </div>
              <p className="map-disclaimer">
                地图为原创手绘风示意，位置与路线经过简化，不用于实际导航。打开地点详情可跳转真实地图。
              </p>
            </details>
          </div>
        </section>
        <section className="section seasons">
          <div className="season-heading">
            <p className="eyebrow green">
              FOUR SEASONS, FOUR WAYS TO FALL IN LOVE
            </p>
            <h2>
              京都的美，
              <br />
              不止一个季节。
            </h2>
            <div className="season-tabs">
              {seasons.map((s, i) => (
                <button
                  key={s.name}
                  onClick={() => setSeason(i)}
                  aria-pressed={season === i}
                  className={season === i ? "active" : ""}
                >
                  {s.name}
                  <small>{s.en}</small>
                </button>
              ))}
            </div>
          </div>
          <div
            className="season-art"
            style={{ "--season": seasons[season].color }}
          >
            <div className="season-sun" />
            <span className="season-kanji">{seasons[season].name}</span>
            <svg viewBox="0 0 420 240" aria-hidden="true">
              <path d="M0 224Q99 195 209 222T420 206V240H0Z" fill="#a9b29a" />
              <path
                d="M53 233V93M352 233V72"
                stroke="#76674d"
                strokeWidth="8"
              />
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <g key={i}>
                  <ellipse
                    cx={45 + (i % 3) * 17}
                    cy={82 + Math.floor(i / 3) * 32}
                    rx="38"
                    ry="25"
                    fill="var(--season)"
                    opacity={0.5 + i * 0.07}
                  />
                  <ellipse
                    cx={345 + (i % 3) * 13}
                    cy={62 + Math.floor(i / 3) * 28}
                    rx="31"
                    ry="24"
                    fill="var(--season)"
                    opacity={0.5 + i * 0.07}
                  />
                </g>
              ))}
              <path d="M141 223V145H286V223" fill="#b89974" />
              <path d="M124 147L214 91 303 147Z" fill="#5b6557" />
              <path
                d="M176 222V171H202V222M226 222V171H254V222"
                fill="#f1eadb"
              />
              <path d="M127 151H300" stroke="#f2e7cf" strokeWidth="5" />
            </svg>
          </div>
          <div className="season-copy">
            <span className="season-month">
              {seasons[season].months} / {seasons[season].en}
            </span>
            <h3>{seasons[season].title}</h3>
            <p>{seasons[season].text}</p>
            <span className="season-tags">{seasons[season].tag}</span>
            <Source />
          </div>
        </section>
        <section id="culture" className="culture-section">
          <div className="section">
            <div className="section-head">
              <div>
                <p className="eyebrow green">
                  03 / BEYOND THE BEAUTIFUL SCENERY
                </p>
                <h2>看见风景，也读懂京都。</h2>
                <p className="subtext">
                  一座城市的深度，藏在建筑、手艺和日常的细节里。
                </p>
              </div>
            </div>
            <div className="culture-grid">
              <div className="culture-story">
                <span className="story-kicker">
                  千年古都 / A LIVING HISTORY
                </span>
                <h3>从平安京，到今天的京都。</h3>
                <p>
                  794
                  年，平安京成为新的都城。棋盘式街道承接了东亚都城规划的影响，随后在本土文化中不断生长。读京都，可以从宫廷文学走到禅宗庭园，再走进今天仍有人生活的町家。
                </p>
                <div className="timeline">
                  <div>
                    <b>794</b>
                    <span>
                      平安京建立<small>宫廷文化与古都的起点</small>
                    </span>
                  </div>
                  <div>
                    <b>室町时代</b>
                    <span>
                      金阁、银阁与禅意<small>不同审美，在同一座城市相遇</small>
                    </span>
                  </div>
                  <div>
                    <b>1869 前后</b>
                    <span>
                      城市走向新的时代
                      <small>天皇迁往东京，京都继续发展工艺与文化</small>
                    </span>
                  </div>
                </div>
                <Source id="history" />
              </div>
              <div className="culture-notes">
                {[
                  [
                    "01",
                    "寺院与神社",
                    "寺院与佛教相关，神社与神道相关。朱红鸟居常提示你走近了神社，参拜方式要看现场说明。",
                  ],
                  [
                    "02",
                    "町家与日常",
                    "狭长地块、木格窗、内庭，构成京都町家的生活空间。很多仍是住宅，参观时请守住边界。",
                  ],
                  [
                    "03",
                    "茶、工艺与花街",
                    "茶道体验、清水烧、西阵织与传统表演，都值得专门留时间。选择公开营业的体验机构，提前预约。",
                  ],
                ].map(([n, h, p]) => (
                  <div key={n}>
                    <span>{n}</span>
                    <article>
                      <h4>{h}</h4>
                      <p>{p}</p>
                    </article>
                  </div>
                ))}
              </div>
            </div>
            <div className="architecture">
              <div className="architecture-view">
                {showModel ? (
                  <Suspense
                    fallback={
                      <div className="model-placeholder">正在打开建筑模型…</div>
                    }
                  >
                    <Pavilion />
                  </Suspense>
                ) : (
                  <button
                    className="model-start"
                    onClick={() => setShowModel(true)}
                  >
                    <svg viewBox="0 0 420 300" aria-hidden="true">
                      <ellipse
                        cx="210"
                        cy="254"
                        rx="154"
                        ry="27"
                        fill="#c5cebb"
                      />
                      {[0, 1, 2].map((i) => (
                        <g key={i} transform={`translate(210 ${230 - i * 57})`}>
                          <path
                            d={`M${-76 + i * 12} 0V-40H${76 - i * 12}V0Z`}
                            fill={i ? "#cfad5c" : "#876b42"}
                          />
                          <path
                            d={`M${-93 + i * 12}-39Q-45-41 0-67Q45-41 ${93 - i * 12}-39Z`}
                            fill="#59644f"
                          />
                          <path
                            d={`M${-60 + i * 12}-3V-32M0-3V-32M${60 - i * 12}-3V-32`}
                            stroke="#f1d17c"
                            strokeWidth="5"
                          />
                        </g>
                      ))}
                      <path d="M210 49V34" stroke="#b39240" strokeWidth="4" />
                    </svg>
                    <span>
                      打开 3D 建筑小景 <ArrowUpRight size={18} />
                    </span>
                    <small>可拖动旋转 · 金阁寺风格示意</small>
                  </button>
                )}
              </div>
              <div className="architecture-text">
                <span className="eyebrow green">
                  A CLOSER LOOK / 建筑小课堂
                </span>
                <h3>
                  换一个角度，
                  <br />
                  读一座金色楼阁。
                </h3>
                <p>
                  金阁寺的三层楼阁融合了不同建筑风格。临水的一层朴素，上层金色外观与屋顶层叠，形成了熟悉的京都印象。
                </p>
                <p>
                  试着转动左侧的小模型，看看屋檐、栏杆与楼层如何组合。它是一件建筑风格示意作品，并非真实建筑的精确复原。
                </p>
                <Source id="kinkaku" />
              </div>
            </div>
          </div>
        </section>
        <section id="essentials" className="section essentials">
          <div className="section-head">
            <div>
              <p className="eyebrow green">
                04 / A LITTLE PREPARATION GOES A LONG WAY
              </p>
              <h2>第一次去日本，安心出发。</h2>
              <p className="subtext">
                把陌生的事先了解一点，到了京都就能更自在一点。
              </p>
            </div>
            <span className="info-chip">旅行资料整理 · 2026.10</span>
          </div>
          <div className="essentials-grid">
            <div className="transport">
              <h3>
                <TrainFront size={21} /> 先搞懂怎么走
              </h3>
              <div className="pills compact">
                {["机场到京都", "京都市内", "住在哪里"].map((t) => (
                  <button
                    key={t}
                    className={t === transport ? "active" : ""}
                    onClick={() => setTransport(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {transport === "机场到京都" ? (
                <>
                  <div className="rail-route">
                    <span>
                      KIX<small>关西国际机场</small>
                    </span>
                    <div>
                      <span>JR HARUKA</span>
                      <i />
                      <small>直达京都站</small>
                    </div>
                    <span>
                      KYOTO<small>京都站</small>
                    </span>
                  </div>
                  <p>
                    从关西机场搭乘 HARUKA
                    是直接到达京都站的常见选择。普通乘车票与特急相关票券需按购买产品确认，不能把交通
                    IC 卡当作所有特急席位的通用车票。
                  </p>
                  <p>
                    抵达时间较晚时，先查末班车。把入境、取行李、走到车站和换乘的时间也算进去。
                  </p>
                  <Source id="rail" />
                </>
              ) : transport === "京都市内" ? (
                <>
                  <div className="transport-lines">
                    <span>JR → 岚山 / 伏见 / 宇治</span>
                    <span>地铁 → 京都站 / 四条 / 二条城</span>
                    <span>京阪 → 祇园 / 东山 / 伏见</span>
                  </div>
                  <p>
                    先用轨道交通接近目的地，再步行或换巴士。IC
                    卡方便支付，但不是无限次通票，也不覆盖所有交通产品。巴士上车门、计费与刷卡方式按车型和现场提示确认。
                  </p>
                  <p>大件行李先寄存，跨区域出行尽量避开通勤时段。</p>
                  <Source id="rail" />
                </>
              ) : (
                <>
                  <div className="stay-options">
                    <b>京都站</b>
                    <span>机场与近郊出行方便，适合第一次来。</span>
                    <b>四条 · 河原町</b>
                    <span>餐饮和购物集中，晚上也容易安排。</span>
                    <b>东山 · 祇园</b>
                    <span>街区氛围浓，但坡道和行李转运要考虑。</span>
                  </div>
                  <p>
                    先比较与车站的实际步行距离、房间面积和退改政策。樱花与红叶季住宿应提前规划，预算另留住宿相关税费。
                  </p>
                  <Source />
                </>
              )}
            </div>
            <div className="etiquette">
              <h3>
                <Leaf size={21} /> 和国内不太一样的小习惯
              </h3>
              {etiquette.map(([h, intro, p], i) => (
                <details key={h}>
                  <summary>
                    <span>
                      <small>0{i + 1}</small>
                      {h}
                    </span>
                    <Plus size={17} />
                  </summary>
                  <div>
                    <strong>{intro}</strong>
                    <p>{p}</p>
                  </div>
                </details>
              ))}
              <div className="source-row">
                <Source id="manners" />
                <Source id="japan" />
              </div>
            </div>
          </div>
          <div className="practical-row">
            <article>
              <span>01 / CONNECT</span>
              <h4>网络与时差</h4>
              <p>
                日本比中国快 1 小时。eSIM
                需确认手机支持，保存酒店日文地址，地图提前缓存。
              </p>
            </article>
            <article>
              <span>02 / EAT WELL</span>
              <h4>忌口与过敏</h4>
              <p>
                鱼高汤常见于看似素食的料理。用日文过敏卡向店员确认，翻译软件只能辅助。
              </p>
            </article>
            <article>
              <span>03 / TAKE CARE</span>
              <h4>遇到紧急情况</h4>
              <p>
                日本报警 110，火警／急救
                119。记录住宿联系方式；天气、地震信息查看官方提醒。
              </p>
              <a
                className="source"
                target="_blank"
                rel="noreferrer"
                href="https://www.japan.travel/en/plan/emergencies/"
              >
                JNTO 紧急情况指南 ↗
              </a>
            </article>
            <article>
              <span>04 / TRAVEL LIGHT</span>
              <h4>行李与入境</h4>
              <p>
                护照、签证要求按本人国籍与行程查询官方信息。行李先寄存，药品及食品携带规则出发前核对。
              </p>
              <Source id="japan" />
            </article>
          </div>
        </section>
        <section id="itinerary" className="itinerary-section">
          <div className="section">
            <div className="section-head">
              <div>
                <p className="eyebrow green">05 / YOUR DAYS, YOUR KYOTO</p>
                <h2>留几天，给你的京都？</h2>
                <p className="subtext">
                  每天一个主要区域，少一点折返，多一点刚刚好的留白。
                </p>
              </div>
              <button className="text-link" onClick={() => exportText()}>
                <Download size={16} /> 下载这份行程
              </button>
            </div>
            <div className="duration-tabs">
              {[
                [3, "初见京都", "经典景点，一次相遇"],
                [5, "慢慢喜欢", "多一点庭园与街巷"],
                [7, "住进京都", "把一周过成京都日常"],
              ].map(([n, h, p]) => (
                <button
                  key={n}
                  className={days === n ? "active" : ""}
                  onClick={() => {
                    setDays(n);
                    setActiveDay(0);
                  }}
                  aria-pressed={days === n}
                >
                  <span>
                    {n}
                    <small>天</small>
                  </span>
                  <div>
                    <b>{h}</b>
                    <small>{p}</small>
                  </div>
                  {days === n && <Check size={18} />}
                </button>
              ))}
            </div>
            <div className="itinerary-layout">
              <div className="day-list">
                {dayPlans.slice(0, days).map((d, i) => (
                  <button
                    key={i}
                    className={activeDay === i ? "active" : ""}
                    onClick={() => setActiveDay(i)}
                  >
                    <span>DAY {String(i + 1).padStart(2, "0")}</span>
                    <b>{d.area}</b>
                    <ArrowUpRight size={16} />
                  </button>
                ))}
                <p>
                  <Footprints size={16} />{" "}
                  行程为建议安排，步行距离为估算。雨天、带娃或带长辈时，可每天少选
                  1–2 站。
                </p>
              </div>
              <div className="day-content">
                <div className="day-title">
                  <div>
                    <span className="eyebrow green">
                      DAY {String(activeDay + 1).padStart(2, "0")}
                    </span>
                    <h3>{dayPlans[activeDay].title}</h3>
                  </div>
                  <span className="walk-tag">
                    <Footprints size={14} />
                    {dayPlans[activeDay].walk}
                  </span>
                </div>
                <div className="stops">
                  {dayPlans[activeDay].stops.map(([time, h, p], i) => (
                    <div key={time}>
                      <time>{time}</time>
                      <span className="stop-dot">{i + 1}</span>
                      <article>
                        <h4>{h}</h4>
                        <p>{p}</p>
                      </article>
                    </div>
                  ))}
                </div>
                <div className="rain-note">
                  ☂ 雨天替换 · {dayPlans[activeDay].rain}
                </div>
                <button
                  className="text-link"
                  onClick={() => {
                    setFavorites([
                      ...new Set([...favorites, ...dayPlans[activeDay].ids]),
                    ]);
                    setToast("这一天的地点已加入旅行清单");
                  }}
                >
                  <Plus size={15} /> 把这一天的地点加入清单
                </button>
              </div>
              <div className="route-map">
                <SketchMap
                  selected=""
                  onSelect={setModal}
                  route={dayPlans[activeDay].ids}
                />
                <span>今日地点示意 · 点击查看详情</span>
              </div>
            </div>
            <div className="planning-grid">
              <div className="budget">
                <h3>
                  <Wallet size={20} /> 给旅行算个小预算
                </h3>
                <p>估算每人每日住宿、餐饮、市内交通与参观费用。</p>
                <div className="budget-options">
                  {["轻省", "舒适", "从容"].map((b) => (
                    <button
                      key={b}
                      onClick={() => setBudget(b)}
                      className={budget === b ? "active" : ""}
                    >
                      {b}
                    </button>
                  ))}
                  <label>
                    人数{" "}
                    <select
                      aria-label="旅行人数"
                      value={people}
                      onChange={(e) => setPeople(Number(e.target.value))}
                    >
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <option key={n}>{n}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="budget-result">
                  <span>
                    ¥
                    {(
                      days *
                      people *
                      { 轻省: 9500, 舒适: 17000, 从容: 28000 }[budget]
                    ).toLocaleString()}
                    <small>
                      日元起 / {days} 天 · {people} 人
                    </small>
                  </span>
                  <Wallet size={34} />
                </div>
                <small className="muted">
                  规划假设：每人每天约 ¥
                  {{ 轻省: 9500, 舒适: 17000, 从容: 28000 }[
                    budget
                  ].toLocaleString()}
                  ，双人分摊住宿思路；单人住宿可能更高。不含机票、跨城交通、购物及住宿税，旺季请按实际报价上调。
                </small>
              </div>
              <div className="checklist">
                <div>
                  <h3>
                    <CheckCircle2 size={20} /> 出发前，一项项准备好
                  </h3>
                  <span>
                    {checks.length} / {checklist.length}
                  </span>
                </div>
                <progress max={checklist.length} value={checks.length} />
                <div>
                  {checklist.map((c, i) => (
                    <label
                      key={c}
                      className={checks.includes(i) ? "checked" : ""}
                    >
                      <input
                        type="checkbox"
                        checked={checks.includes(i)}
                        onChange={() =>
                          setChecks(
                            checks.includes(i)
                              ? checks.filter((x) => x !== i)
                              : [...checks, i],
                          )
                        }
                      />
                      <span>{c}</span>
                    </label>
                  ))}
                </div>
                <small className="muted">勾选和收藏保存在当前浏览器中。</small>
              </div>
            </div>
          </div>
        </section>
        <section className="closing">
          <div className="closing-seal">京</div>
          <p>
            京都不需要被赶完，
            <br />
            <span>值得被慢慢记住。</span>
          </p>
          <a href="#map">
            下一次相遇，从地图上的一个点开始 <ArrowUpRight size={17} />
          </a>
        </section>
      </main>
      <footer>
        <div className="footer-top">
          <a className="brand" href="#">
            <span className="brand-stamp">京</span>
            <span>
              京都慢游记<small>KYOTO, AT YOUR OWN PACE</small>
            </span>
          </a>
          <p>写给第一次去京都，也写给想再去一次的你。</p>
          <a href="#">回到顶部 ↑</a>
        </div>
        <div className="footer-links">
          {Object.entries(sources)
            .slice(0, 6)
            .map(([id]) => (
              <Source key={id} id={id} />
            ))}
        </div>
        <div className="footer-bottom">
          <span>© 2026 Kyoto Notes · 独立旅行指南，非官方旅游机构</span>
          <span>
            <button
              onClick={async () => {
                try {
                  const r = await fetch("/photo-credits.json");
                  setCredits(await r.json());
                } catch {
                  setToast("图片来源暂时无法载入，请稍后重试");
                }
              }}
            >
              图片与创作说明
            </button>
            <span>资料核对：2026.10.05</span>
          </span>
        </div>
        <p className="footer-disclaimer">
          营业、票价、展览、交通和入境规则会变化，出行前请以文中官方链接及现场信息为准。本站不提供预订服务。
        </p>
      </footer>
      {overlay && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            ref={dialogRef}
            className={`modal ${modal ? "place-modal" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={
              modal
                ? `${modal.name}旅行笔记`
                : searchOpen
                  ? "搜索京都"
                  : savedOpen
                    ? "我的旅行清单"
                    : "图片与创作说明"
            }
          >
            <button
              className="modal-close icon-btn"
              onClick={close}
              aria-label="关闭窗口"
            >
              <X size={22} />
            </button>
            {modal ? (
              <>
                <img
                  className="modal-cover"
                  src={`/images/${modal.img}.webp`}
                  alt={modal.img === "tea" ? "茶饮氛围配图" : modal.name}
                />
                <div className="modal-body">
                  <span className="eyebrow green">
                    {modal.region} / {modal.en}
                  </span>
                  <h2>{modal.name}</h2>
                  <p>{modal.desc}</p>
                  <div className="modal-facts">
                    <span>
                      <Clock size={16} />
                      {modal.time}
                    </span>
                    <span>
                      <Wallet size={16} />
                      {modal.cost}
                    </span>
                  </div>
                  <h4>怎样到达</h4>
                  <p>{modal.access}</p>
                  <h4>写在手帐上的小提醒</h4>
                  <p>{modal.tip}</p>
                  <h4>一起逛逛</h4>
                  <p>{modal.near}</p>
                  <div className="modal-actions">
                    <button
                      className="button green-button"
                      onClick={() => save(modal)}
                    >
                      <Bookmark size={16} />
                      {favorites.includes(modal.id)
                        ? "已收藏 · 点击移除"
                        : "加入旅行清单"}
                    </button>
                    <a
                      className="button outline"
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(modal.query)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      打开地图导航 <ArrowUpRight size={16} />
                    </a>
                  </div>
                  <Source id={modal.source} />
                  <small className="modal-disclaimer">
                    餐饮金额为规划预算，非商家报价；营业、票价与预约安排请查看官方最新信息。部分图片为地区或品类氛围配图。
                  </small>
                </div>
              </>
            ) : searchOpen ? (
              <div className="modal-body">
                <p className="eyebrow green">FIND YOUR KYOTO</p>
                <h2>你想去哪里？</h2>
                <label className="search-box">
                  <Search size={20} />
                  <input
                    autoFocus
                    placeholder="搜索景点、区域、美食…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <div className="search-results">
                  {places
                    .filter((p) =>
                      `${p.name}${p.en}${p.region}${p.type}${p.desc}`
                        .toLowerCase()
                        .includes(query.trim().toLowerCase()),
                    )
                    .map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSearchOpen(false);
                          setModal(p);
                        }}
                      >
                        <img src={`/images/${p.img}.webp`} alt="" />
                        <span>
                          <b>{p.name}</b>
                          <small>
                            {p.region} · {p.type}
                          </small>
                        </span>
                        <ArrowUpRight size={18} />
                      </button>
                    ))}
                  {!places.some((p) =>
                    `${p.name}${p.en}${p.region}${p.type}${p.desc}`
                      .toLowerCase()
                      .includes(query.trim().toLowerCase()),
                  ) && (
                    <p className="empty">
                      还没有找到这个地方。试试“东山”“抹茶”或“散步”。
                    </p>
                  )}
                </div>
              </div>
            ) : savedOpen ? (
              <div className="modal-body">
                <p className="eyebrow green">YOUR LITTLE TRAVEL NOTEBOOK</p>
                <h2>
                  我的旅行清单 <small>{chosen.length}</small>
                </h2>
                <p className="muted">把心动留下来，出发时再慢慢相遇。</p>
                {chosen.length ? (
                  <>
                    <div className="saved-list">
                      {chosen.map((p) => (
                        <div key={p.id}>
                          <img src={`/images/${p.img}.webp`} alt="" />
                          <button
                            onClick={() => {
                              setSavedOpen(false);
                              setModal(p);
                            }}
                          >
                            <b>{p.name}</b>
                            <small>
                              {p.region} · {p.time}
                            </small>
                          </button>
                          <button
                            className="icon-btn"
                            onClick={() => save(p)}
                            aria-label={`移除${p.name}`}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      className="button green-button"
                      onClick={() => exportText(true)}
                    >
                      <Download size={16} /> 下载我的清单
                    </button>
                  </>
                ) : (
                  <div className="empty">
                    <Bookmark size={34} />
                    <h3>这本手帐，等你写下第一站。</h3>
                    <p>点击地点卡片上的收藏图标，就能把它留在这里。</p>
                    <button className="button green-button" onClick={close}>
                      去发现京都 <ArrowRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="modal-body">
                <h2>图片与创作说明</h2>
                <p>
                  手绘示意地图、季节插画与建筑模型为本站原创。3D
                  模型为建筑风格演绎，不作为建筑史或测绘资料。
                </p>
                <p>
                  东山街景、伏见鸟居、抹茶氛围图片来自 Unsplash；其余图片使用
                  Wikimedia Commons
                  授权摄影，以下保留作者与许可。照片经过尺寸压缩；相关授权适用于各自图片。
                </p>
                <a
                  className="source"
                  href="https://unsplash.com/license"
                  target="_blank"
                  rel="noreferrer"
                >
                  Unsplash License ↗
                </a>
                <ul className="credits-list">
                  {credits
                    .filter((c) => !c.error)
                    .map((c) => (
                      <li key={c.asset}>
                        <a href={c.source} target="_blank" rel="noreferrer">
                          {c.file}
                        </a>
                        <small>
                          {c.author} ·{" "}
                          <a
                            href={c.licenseUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {c.license}
                          </a>
                        </small>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
        </div>
      )}
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
