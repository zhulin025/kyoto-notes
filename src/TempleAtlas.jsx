import React, { useState, useEffect, useMemo, useRef } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { zoom, zoomIdentity } from "d3-zoom";
import { select } from "d3-selection";
import {
  Search,
  Plus,
  Minus,
  Maximize2,
  Minimize2,
  ArrowUpRight,
  Bookmark,
  Download,
  SlidersHorizontal,
  X,
  RotateCcw,
  MapPin,
  Info,
  ChevronLeft,
  ChevronRight,
  Check,
  Compass,
} from "lucide-react";
import {
  DEFAULT_FILTERS,
  filterPlaces,
  clusterPlaces,
  csvForPlaces,
} from "./atlas-utils";
import "./atlas.css";
const CITY_CENTER = [135.746, 35.028];
const WARD_LABELS = {
  北区: [135.733, 35.083],
  上京区: [135.75, 35.031],
  左京区: [135.804, 35.09],
  中京区: [135.744, 35.012],
  东山区: [135.793, 34.987],
  下京区: [135.747, 34.992],
  南区: [135.738, 34.969],
  右京区: [135.647, 35.071],
  伏见区: [135.755, 34.941],
  山科区: [135.823, 34.996],
  西京区: [135.665, 34.976],
};
const INITIAL_BOUNDS = [
  [135.646, 34.936],
  [135.839, 35.099],
];
function safeLink(url) {
  return /^https?:\/\//.test(url || "") ? url : undefined;
}
function downloadFile(text, name, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function HandLandmark({ x, y, kind, name }) {
  return (
    <g transform={`translate(${x} ${y})`} className="atlas-illustration">
      {kind === "神社" ? (
        <g stroke="#ad624c" strokeWidth="3" fill="none">
          <path d="M-14 12V-15M14 12V-15M-23-19Q0-13 23-19M-20-6H20" />
          <path d="M-18 11H-10M10 11H18" />
        </g>
      ) : (
        <g stroke="#69684d" strokeWidth="1.2">
          <path d="M-18 14V-9H18V14" fill="#d6bb7d" />
          <path d="M-26-8Q-12-12 0-23Q12-12 26-8Z" fill="#7e896b" />
          <path d="M-11-19V-33H11V-19" fill="#ddc990" />
          <path d="M-20-32Q-6-36 0-44Q6-36 20-32Z" fill="#728365" />
          <path d="M0-44V-51M-10 14V-4M0 14V-4M10 14V-4" fill="none" />
        </g>
      )}
      <text y="30" textAnchor="middle">
        {name}
      </text>
    </g>
  );
}
export default function TempleAtlas() {
  const [data, setData] = useState(null),
    [geography, setGeography] = useState(null),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0),
    [f, setF] = useState({ ...DEFAULT_FILTERS }),
    [active, setActive] = useState(null),
    [tab, setTab] = useState("map"),
    [page, setPage] = useState(0),
    [expanded, setExpanded] = useState(false),
    [filtersOpen, setFiltersOpen] = useState(false),
    [notes, setNotes] = useState(false),
    [notice, setNotice] = useState(""),
    [showLabels, setShowLabels] = useState(true),
    [selectionGroup, setSelectionGroup] = useState([]);
  const [saved, setSaved] = useState(() => {
    try {
      const value = JSON.parse(localStorage.getItem("kyoto-atlas-saved"));
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  });
  const svgRef = useRef(),
    mapHost = useRef(),
    zoomRef = useRef(),
    frameRef = useRef(),
    shellRef = useRef(),
    transformRef = useRef(zoomIdentity);
  const [size, setSize] = useState({ width: 1000, height: 760 }),
    [transform, setTransform] = useState(zoomIdentity);
  useEffect(() => {
    const abort = new AbortController();
    setError("");
    Promise.all(
      ["/data/kyoto-temples.json", "/data/kyoto-geography.json"].map((u) =>
        fetch(u, { signal: abort.signal }).then((r) => {
          if (!r.ok) throw Error("数据文件暂时无法读取");
          return r.json();
        }),
      ),
    )
      .then(([a, b]) => {
        setData(a);
        setGeography(b);
      })
      .catch((e) => {
        if (e.name !== "AbortError")
          setError("寺社地图暂时未能载入。请检查网络后重试。");
      });
    return () => abort.abort();
  }, [attempt]);
  useEffect(() => {
    try {
      localStorage.setItem("kyoto-atlas-saved", JSON.stringify(saved));
    } catch {}
  }, [saved]);
  useEffect(() => {
    setPage(0);
    setSelectionGroup([]);
  }, [f]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 2800);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    if (!expanded) return;
    const prior = document.body.style.overflow,
      previousFocus = document.activeElement,
      hidden = [];
    let node = shellRef.current;
    while (node && node !== document.body) {
      for (const sibling of node.parentElement.children) {
        if (sibling !== node) {
          hidden.push([sibling, sibling.inert]);
          sibling.inert = true;
        }
      }
      node = node.parentElement;
    }
    document.body.style.overflow = "hidden";
    shellRef.current.focus();
    const fn = (e) => {
      if (e.key === "Escape") setExpanded(false);
      if (e.key === "Tab") {
        const items = [
          ...shellRef.current.querySelectorAll(
            'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),[tabindex="0"]',
          ),
        ].filter((el) => el.getClientRects().length);
        const first = items[0],
          last = items.at(-1);
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === shellRef.current)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", fn);
    return () => {
      document.body.style.overflow = prior;
      hidden.forEach(([el, value]) => (el.inert = value));
      document.removeEventListener("keydown", fn);
      previousFocus?.focus();
    };
  }, [expanded]);
  const projection = useMemo(
    () =>
      geoMercator()
        .center(CITY_CENTER)
        .scale(190000)
        .translate([size.width / 2, size.height / 2]),
    [size],
  );
  const path = useMemo(() => geoPath(projection), [projection]);
  const results = useMemo(
    () => (data ? filterPlaces(data.places, f, saved) : []),
    [data, f, saved],
  );
  const groups = useMemo(
    () => clusterPlaces(results, projection, transform, size),
    [results, projection, transform, size],
  );
  const visibleCount = groups.reduce((n, g) => n + g.items.length, 0);
  const chosen = useMemo(
    () => data?.places.find((p) => p.id === active),
    [data, active],
  );
  const setFilter = (key, value) => setF((prev) => ({ ...prev, [key]: value }));
  const reset = () => {
    setF({ ...DEFAULT_FILTERS });
    setActive(null);
    setSelectionGroup([]);
  };
  function moveTo(bounds) {
    const [[west, south], [east, north]] = bounds;
    const a = projection([west, north]),
      b = projection([east, south]);
    const k = Math.max(
      0.23,
      Math.min(
        30,
        0.83 /
          Math.max(
            Math.abs(b[0] - a[0]) / size.width,
            Math.abs(b[1] - a[1]) / size.height,
          ),
      ),
    );
    const x = size.width / 2 - (k * (a[0] + b[0])) / 2,
      y = size.height / 2 - (k * (a[1] + b[1])) / 2;
    select(svgRef.current).call(
      zoomRef.current.transform,
      zoomIdentity.translate(x, y).scale(k),
    );
  }
  function focusPlace(p) {
    setActive(p.id);
    setSelectionGroup([]);
    if (tab !== "map") {
      setTab("map");
      return;
    }
    if (!zoomRef.current) return;
    const [x, y] = projection([p.lon, p.lat]);
    const k = Math.max(transform.k, 4.5);
    select(svgRef.current).call(
      zoomRef.current.transform,
      zoomIdentity
        .translate(size.width / 2 - x * k, size.height / 2 - y * k)
        .scale(k),
    );
  }
  function zoomStep(factor) {
    if (zoomRef.current)
      select(svgRef.current).call(zoomRef.current.scaleBy, factor);
  }
  function fitResults() {
    if (!results.length) return;
    moveTo([
      [
        Math.min(...results.map((p) => p.lon)) - 0.002,
        Math.min(...results.map((p) => p.lat)) - 0.002,
      ],
      [
        Math.max(...results.map((p) => p.lon)) + 0.002,
        Math.max(...results.map((p) => p.lat)) + 0.002,
      ],
    ]);
  }
  useEffect(() => {
    if (!mapHost.current) return;
    const obs = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ width, height });
    });
    obs.observe(mapHost.current);
    return () => obs.disconnect();
  }, [data, tab]);
  useEffect(() => {
    if (!svgRef.current || !data) return;
    const behavior = zoom()
      .scaleExtent([0.23, 40])
      .filter((e) => !e.button && (!e.ctrlKey || e.type === "wheel"))
      .on("zoom", (event) => {
        transformRef.current = event.transform;
        cancelAnimationFrame(frameRef.current);
        frameRef.current = requestAnimationFrame(() =>
          setTransform(event.transform),
        );
      });
    zoomRef.current = behavior;
    const el = select(svgRef.current);
    el.call(behavior).on("dblclick.zoom", null);
    if (chosen) {
      const [x, y] = projection([chosen.lon, chosen.lat]);
      el.call(
        behavior.transform,
        zoomIdentity
          .translate(size.width / 2 - x * 5, size.height / 2 - y * 5)
          .scale(5),
      );
    } else moveTo(INITIAL_BOUNDS);
    return () => {
      el.on(".zoom", null);
      cancelAnimationFrame(frameRef.current);
    };
  }, [data, size.width, size.height, tab]);
  const options = (key) =>
    [
      ...new Set(
        (data?.places || []).flatMap((p) =>
          Array.isArray(p[key]) ? p[key] : [p[key]],
        ),
      ),
    ]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "zh-CN"));
  const switchSave = (p) => {
    setSaved((prev) =>
      prev.includes(p.id) ? prev.filter((id) => id !== p.id) : [...prev, p.id],
    );
    setNotice(saved.includes(p.id) ? "已从寺社收藏移除" : "已加入寺社收藏");
  };
  const clustersClick = (g) => {
    if (g.items.length === 1) {
      setActive(g.items[0].id);
      setSelectionGroup([]);
      return;
    }
    if (
      transform.k >= 20 ||
      g.items.every(
        (p) =>
          Math.abs(p.lon - g.items[0].lon) + Math.abs(p.lat - g.items[0].lat) <
          0.00001,
      )
    ) {
      setSelectionGroup(g.items);
      setActive(null);
      return;
    }
    moveTo([
      [
        Math.min(...g.items.map((p) => p.lon)) - 0.0005,
        Math.min(...g.items.map((p) => p.lat)) - 0.0005,
      ],
      [
        Math.max(...g.items.map((p) => p.lon)) + 0.0005,
        Math.max(...g.items.map((p) => p.lat)) + 0.0005,
      ],
    ]);
  };
  const activeFilters = Object.entries(f).filter(
    ([k, v]) => v !== DEFAULT_FILTERS[k],
  ).length;
  const landmarks = useMemo(
    () =>
      data?.places.filter((p) =>
        [
          "Q270983",
          "Q257473",
          "Q221716",
          "Q1759226",
          "Q700448",
          "Q1046403",
          "Q1089767",
          "Q910281",
        ].includes(p.wikidata),
      ) || [],
    [data],
  );
  const forest = useMemo(
    () =>
      Array.from({ length: 95 }, (_, i) => {
        const n = Math.sin(i * 93.123) * 10000;
        const t = n - Math.floor(n);
        const north = i % 3 === 0;
        return {
          lon: north
            ? 135.61 + t * 0.23
            : i % 2
              ? 135.6 + t * 0.055
              : 135.81 + t * 0.05,
          lat:
            34.93 +
            (north ? 0.16 : 0.0) +
            ((Math.sin(i * 73.37) + 1) / 2) * (north ? 0.2 : 0.19),
          s: 0.6 + t * 0.7,
        };
      }),
    [],
  );
  const updateSearch = (e) => setFilter("query", e.target.value);
  if (error)
    return (
      <div className="atlas-load">
        <p>{error}</p>
        <button
          className="button outline"
          onClick={() => setAttempt(attempt + 1)}
        >
          重新载入地图
        </button>
      </div>
    );
  if (!data || !geography)
    return (
      <div className="atlas-load">
        <Compass size={36} />
        <h3>正在展开京都寺社图鉴…</h3>
        <p>加载本地地图资料与行政区边界</p>
      </div>
    );
  const officialCounts = { temples: 1656, shinto: 384 };
  return (
    <div
      className={`temple-atlas ${expanded ? "atlas-expanded" : ""}`}
      ref={shellRef}
      tabIndex={-1}
      role={expanded ? "dialog" : undefined}
      aria-modal={expanded ? true : undefined}
      aria-label="京都寺社大图鉴"
    >
      <div className="atlas-top">
        <div className="atlas-heading">
          <span className="atlas-seal">
            京<br />都
          </span>
          <div>
            <span className="atlas-eyebrow">THE SACRED ATLAS OF KYOTO</span>
            <h3>
              京都寺社大图鉴 <span>手绘地理版</span>
            </h3>
            <p>从一座名刹，走向千座寺社的日常。</p>
          </div>
        </div>
        <div className="atlas-top-actions">
          <button onClick={() => setNotes(!notes)} aria-expanded={notes}>
            <Info size={15} />
            <span>收录与分级说明</span>
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? "收起全屏地图" : "展开全屏地图"}
          >
            {expanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
            <span>{expanded ? "收起" : "展开大地图"}</span>
          </button>
        </div>
      </div>
      <div className="atlas-stats">
        <span>
          <b>{data.meta.total.toLocaleString()}</b> 具名寺社及附属地点
        </span>
        <span>
          <i className="temple-dot" />
          <b>{data.meta.kinds["寺院"]}</b> 佛教地点
        </span>
        <span>
          <i className="shrine-dot" />
          <b>{data.meta.kinds["神社"]}</b> 神道地点
        </span>
        <span>
          <b>11</b> 行政区
        </span>
        <span className="atlas-status">公开数据收录版 · 非完整名录</span>
      </div>
      {notes && (
        <div className="atlas-notes">
          <div>
            <h4>数量：法人 ≠ 地点 ≠ 建筑</h4>
            <p>
              京都府截至 2026-03-31 的京都市所辖法人：佛教系{" "}
              {officialCounts.temples}、神道系 {officialCounts.shinto}
              。地图收录的是具名地理对象，含塔头、境内社，默认隐藏单独殿堂；既有缺漏，也可能残留重复，不能用相除计算覆盖率。
            </p>
            <a
              href="https://www.pref.kyoto.jp/bunkyo/1186098257650.html"
              target="_blank"
              rel="noreferrer"
            >
              查看京都府官方统计 ↗
            </a>
          </div>
          <div>
            <h4>“等级”分开看，不给信仰打分</h4>
            <p>
              总本山／大本山属宗派组织；京都五山、式内社与旧官币社属历史制度；世界遗产、国宝与重要文化财是另一套保护体系。文化财标签可能指境内建筑或庭园，不代表整座寺社获同一级别认定。
            </p>
          </div>
          <div>
            <h4>来源、未详与地理精度</h4>
            <p>
              地点与边界：OpenStreetMap；宗派与文化财关联：Wikidata
              及所列官方资料。已知宗派的佛教地点 {data.meta.sectKnown}{" "}
              个，其余“未详”不等于无宗派。另有 {data.meta.typeProvisional}{" "}
              个地点类型依据建筑标签与名称推定，详情中标明待核验。地图艺术化简化道路与水系，点位为地图对象中心，非实测入口。
            </p>
            <a href="/data/kyoto-temples.json" target="_blank" rel="noreferrer">
              下载带来源的完整数据 JSON ↗
            </a>
          </div>
        </div>
      )}
      <div className="atlas-mobile-tools">
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          aria-expanded={filtersOpen}
        >
          <SlidersHorizontal size={16} />
          筛选 {activeFilters > 0 && <b>{activeFilters}</b>}
        </button>
        <div>
          {["map", "list", "pending"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={tab === t ? "active" : ""}
            >
              {t === "map" ? "地图" : t === "list" ? "名录" : "待定位"}
            </button>
          ))}
        </div>
        <span>{results.length} 个匹配</span>
      </div>
      <div className="atlas-workspace">
        <aside className={`atlas-filters ${filtersOpen ? "show" : ""}`}>
          <div className="atlas-filter-title">
            <h4>
              <SlidersHorizontal size={15} /> 寺社筛选
            </h4>
            <button onClick={reset} aria-label="清除全部筛选">
              <RotateCcw size={13} /> 重置
            </button>
            <button
              className="atlas-mobile-close"
              onClick={() => setFiltersOpen(false)}
              aria-label="收起筛选"
            >
              <X size={17} />
            </button>
          </div>
          <label className="atlas-search">
            <Search size={16} />
            <input
              aria-label="搜索寺社名称、宗派或区域"
              placeholder="名称、宗派、区域…"
              value={f.query}
              onChange={updateSearch}
            />
            {f.query && (
              <button
                onClick={() => setFilter("query", "")}
                aria-label="清除搜索"
              >
                <X size={13} />
              </button>
            )}
          </label>
          <div className="atlas-type-buttons">
            {["全部", "寺院", "神社"].map((k) => (
              <button
                key={k}
                className={f.kind === k ? "active" : ""}
                aria-pressed={f.kind === k}
                onClick={() => setF({ ...f, kind: k, family: "全部" })}
              >
                {k === "寺院" ? "寺院 ◈" : k === "神社" ? "神社 ⛩" : "全部"}
              </button>
            ))}
          </div>
          {[
            ["ward", "所在区域", options("ward")],
            [
              "family",
              "宗派系别",
              options("family").filter((v) => v !== "不适用（神道）"),
            ],
            ["rank", "寺格／历史社格", [...options("ranks"), "未详"]],
            ["heritage", "文化遗产关联", [...options("heritage"), "未详"]],
            [
              "unit",
              "地点性质",
              ["寺社地点", "塔头", "境外摄社", "殿堂／附属建筑"],
            ],
          ].map(([key, title, values]) => (
            <label className="atlas-select" key={key}>
              <span>
                {title}
                {key === "family" && f.kind === "神社" && (
                  <small>神社不适用佛教宗派</small>
                )}
              </span>
              <select
                aria-label={title}
                value={f[key]}
                disabled={key === "family" && f.kind === "神社"}
                onChange={(e) => setFilter(key, e.target.value)}
              >
                <option value="全部">
                  全部{key === "unit" ? "（含附属建筑）" : ""}
                </option>
                {values.map((v) => (
                  <option key={v} value={v}>
                    {v === "未详"
                      ? "未详／尚未补全"
                      : key === "unit" && v === "寺社地点"
                        ? "寺社／塔头／境内社"
                        : v}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <label className="atlas-saved-check">
            <input
              type="checkbox"
              checked={f.savedOnly}
              onChange={(e) => setFilter("savedOnly", e.target.checked)}
            />
            <Bookmark size={14} />
            只看我的寺社收藏 <b>{saved.length}</b>
          </label>
          <div className="atlas-quick">
            <span>从这里开始</span>
            <button
              onClick={() =>
                setF({ ...DEFAULT_FILTERS, heritage: "世界遗产组成部分" })
              }
            >
              世界遗产寺社 <ArrowUpRight size={13} />
            </button>
            <button
              onClick={() => setF({ ...DEFAULT_FILTERS, family: "临济宗" })}
            >
              京都的禅寺 <ArrowUpRight size={13} />
            </button>
            <button
              onClick={() =>
                setF({ ...DEFAULT_FILTERS, kind: "神社", ward: "东山区" })
              }
            >
              东山神社散步 <ArrowUpRight size={13} />
            </button>
          </div>
          <div className="atlas-filter-result">
            <b>{results.length.toLocaleString()}</b>
            <span>个地点符合当前筛选</span>
          </div>
          <button
            className="atlas-export"
            onClick={() => {
              downloadFile(
                csvForPlaces(results),
                "京都寺社筛选结果.csv",
                "text/csv;charset=utf-8",
              );
              setNotice(`已导出 ${results.length} 个地点`);
            }}
            disabled={!results.length}
          >
            <Download size={14} /> 导出筛选名录
          </button>
          <p className="atlas-filters-foot">
            未详不代表没有。所有分类均可在地点详情中追溯来源。
          </p>
        </aside>
        <div className="atlas-main">
          <div className="atlas-map-toolbar">
            <div className="atlas-view-tabs">
              {["map", "list", "pending"].map((t) => (
                <button
                  className={tab === t ? "active" : ""}
                  onClick={() => setTab(t)}
                  key={t}
                >
                  {t === "map"
                    ? "手绘地图"
                    : t === "list"
                      ? "全部匹配名录"
                      : `待定位 ${data.unlocated.length}`}
                </button>
              ))}
            </div>
            <span>
              {tab === "map"
                ? `视野内 ${visibleCount} / 匹配 ${results.length}`
                : tab === "list"
                  ? `${results.length} 个匹配地点`
                  : "有目录记录，暂无可靠坐标"}
            </span>
          </div>
          {tab === "map" ? (
            <div className="atlas-map" ref={mapHost}>
              <svg
                ref={svgRef}
                viewBox={`0 0 ${size.width} ${size.height}`}
                role="application"
                aria-label="可缩放的京都寺社地图。拖动平移，滚轮或双指缩放。方向键移动，加减键缩放，Home 回到市区。也可使用名录访问每个地点。"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (
                    [
                      "+",
                      "=",
                      "-",
                      "ArrowLeft",
                      "ArrowRight",
                      "ArrowUp",
                      "ArrowDown",
                      "Home",
                    ].includes(e.key)
                  ) {
                    e.preventDefault();
                    if (e.key === "Home") moveTo(INITIAL_BOUNDS);
                    else if (e.key === "+" || e.key === "=") zoomStep(1.5);
                    else if (e.key === "-") zoomStep(1 / 1.5);
                    else {
                      const dx =
                        e.key === "ArrowLeft"
                          ? 100
                          : e.key === "ArrowRight"
                            ? -100
                            : 0;
                      const dy =
                        e.key === "ArrowUp"
                          ? 100
                          : e.key === "ArrowDown"
                            ? -100
                            : 0;
                      select(svgRef.current).call(
                        zoomRef.current.translateBy,
                        dx / transform.k,
                        dy / transform.k,
                      );
                    }
                  }
                }}
              >
                <defs>
                  <pattern
                    id="atlas-paper"
                    width="32"
                    height="32"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M0 32V0H32"
                      fill="none"
                      stroke="#cbc3a0"
                      strokeWidth=".5"
                      opacity=".2"
                    />
                    <circle
                      cx="8"
                      cy="18"
                      r=".6"
                      fill="#a69f83"
                      opacity=".16"
                    />
                    <circle
                      cx="23"
                      cy="6"
                      r=".45"
                      fill="#a69f83"
                      opacity=".2"
                    />
                  </pattern>
                  <pattern
                    id="atlas-hatch"
                    width="8"
                    height="8"
                    patternUnits="userSpaceOnUse"
                    patternTransform="rotate(30)"
                  >
                    <path
                      d="M0 0V8"
                      stroke="#c0c9a1"
                      strokeWidth="1"
                      opacity=".4"
                    />
                  </pattern>
                  <g id="atlas-pine">
                    <path d="M0 13V-16" stroke="#9aa083" strokeWidth="1.2" />
                    <path
                      d="M-8 3 0-14 8 3M-6-4 0-23 6-4"
                      fill="#c2cba6"
                      stroke="#98a27b"
                      strokeWidth=".8"
                    />
                  </g>
                </defs>
                <rect width="100%" height="100%" fill="#f4efde" />
                <rect width="100%" height="100%" fill="url(#atlas-paper)" />
                <g
                  transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}
                >
                  <path
                    d={`M${projection([135.52, 35.37]).join(",")}L${projection([135.92, 35.37]).join(",")}L${projection([135.83, 35.08]).join(",")}L${projection([135.79, 35.06]).join(",")}L${projection([135.72, 35.09]).join(",")}L${projection([135.67, 35.06]).join(",")}L${projection([135.64, 34.91]).join(",")}L${projection([135.52, 34.91]).join(",")}Z`}
                    fill="#e2e6cc"
                  />
                  {geography.wards.features.map((w, i) => (
                    <path
                      key={w.properties.name}
                      d={path(w)}
                      fill={
                        f.ward === w.properties.name
                          ? "#d9dfbd"
                          : i % 2
                            ? "#ebe8d54a"
                            : "#e4e8cd60"
                      }
                      stroke="#aeb295"
                      strokeWidth={f.ward === w.properties.name ? 1.8 : 0.8}
                      strokeDasharray="5 4"
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                  {forest.map((tree, i) => {
                    const [x, y] = projection([tree.lon, tree.lat]);
                    return (
                      <use
                        href="#atlas-pine"
                        key={i}
                        transform={`translate(${x} ${y}) scale(${tree.s})`}
                        opacity=".7"
                      />
                    );
                  })}
                  {geography.lines.features.map((line, i) => (
                    <path
                      key={i}
                      d={path(line)}
                      fill="none"
                      stroke={
                        line.properties.kind === "river" ? "#9ebcb5" : "#c9bfa0"
                      }
                      strokeWidth={line.properties.kind === "river" ? 4 : 1}
                      opacity={line.properties.kind === "river" ? 0.8 : 0.65}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </g>
                {Object.entries(WARD_LABELS).map(([name, coord]) => {
                  const [x, y] = transform.apply(projection(coord));
                  return (
                    <text
                      key={name}
                      x={x}
                      y={y}
                      className="atlas-ward-label"
                      textAnchor="middle"
                    >
                      {name}
                    </text>
                  );
                })}
                {transform.k < 6 &&
                  landmarks.map((p) => {
                    const [x, y] = transform.apply(projection([p.lon, p.lat]));
                    if (x < 0 || y < 0 || x > size.width || y > size.height)
                      return null;
                    return (
                      <HandLandmark
                        key={p.id}
                        x={x}
                        y={y - 22}
                        kind={p.kind}
                        name={p.name}
                      />
                    );
                  })}
                {groups.map((g) => {
                  const p = g.items[0],
                    cluster = g.items.length > 1,
                    isSelected = g.items.some((x) => x.id === active),
                    shrine = g.items.every((x) => x.kind === "神社"),
                    mixed = g.items.some((x) => x.kind === "神社") && !shrine;
                  return (
                    <g
                      key={g.items.map((p) => p.id).join(":")}
                      transform={`translate(${g.x},${g.y})`}
                      className={`atlas-marker ${shrine ? "shrine" : ""} ${mixed ? "mixed" : ""} ${isSelected ? "selected" : ""}`}
                      role="button"
                      tabIndex={0}
                      aria-label={
                        cluster
                          ? `展开 ${g.items.length} 个寺社地点`
                          : `查看${p.name}，${p.ward}，${p.kind}`
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        clustersClick(g);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          clustersClick(g);
                        }
                      }}
                    >
                      <circle
                        r={cluster ? 25 : 19}
                        fill="transparent"
                        pointerEvents="all"
                      />
                      <circle
                        r={
                          cluster
                            ? Math.min(25, 13 + Math.log(g.items.length) * 2.5)
                            : isSelected
                              ? 11
                              : 7
                        }
                        className="atlas-marker-body"
                      />
                      {cluster ? (
                        <text textAnchor="middle" dy=".35em">
                          {g.items.length}
                        </text>
                      ) : p.kind === "神社" ? (
                        <path
                          d="M-3 3V-3M3 3V-3M-5-4Q0-2 5-4M-4-1H4"
                          fill="none"
                          stroke="#fff8e5"
                          strokeWidth="1.3"
                        />
                      ) : (
                        <path d="M0-3 3 0 0 3-3 0Z" fill="#fff8e5" />
                      )}
                      {!cluster &&
                        showLabels &&
                        (transform.k > 4 || isSelected) && (
                          <text
                            className="atlas-marker-label"
                            y="22"
                            textAnchor="middle"
                          >
                            {p.name.length > 13
                              ? p.name.slice(0, 12) + "…"
                              : p.name}
                          </text>
                        )}
                      <title>
                        {cluster
                          ? `${g.items.length} 个寺社，点击放大`
                          : p.name + " · " + p.sect}
                      </title>
                    </g>
                  );
                })}
              </svg>
              <div className="atlas-map-title">
                <span>京 都 寺 社 散 策 圖</span>
                <small>KYOTO SACRED PLACES · 2026</small>
              </div>
              <div className="atlas-north">
                N<span>↑</span>
              </div>
              <div className="atlas-map-buttons">
                <button aria-label="放大地图" onClick={() => zoomStep(1.5)}>
                  <Plus size={18} />
                </button>
                <button aria-label="缩小地图" onClick={() => zoomStep(1 / 1.5)}>
                  <Minus size={18} />
                </button>
                <button
                  aria-label="回到京都市区"
                  onClick={() => moveTo(INITIAL_BOUNDS)}
                >
                  <Compass size={18} />
                </button>
              </div>
              <div className="atlas-map-presets">
                <button onClick={() => moveTo(INITIAL_BOUNDS)}>市区</button>
                <button
                  onClick={() => {
                    const bounds = geoPath(projection).bounds(geography.wards);
                    const a = projection.invert(bounds[0]),
                      b = projection.invert(bounds[1]);
                    moveTo([
                      [a[0], b[1]],
                      [b[0], a[1]],
                    ]);
                  }}
                >
                  全市·含京北
                </button>
                <button onClick={fitResults} disabled={!results.length}>
                  定位筛选结果
                </button>
              </div>
              <label className="atlas-label-toggle">
                <input
                  type="checkbox"
                  checked={showLabels}
                  onChange={(e) => setShowLabels(e.target.checked)}
                />
                显示名称
              </label>
              <div className="atlas-map-legend">
                <span>
                  <i className="temple-dot" />
                  寺院
                </span>
                <span>
                  <i className="shrine-dot" />
                  神社
                </span>
                <span>
                  <i className="mixed-dot" />
                  混合聚合
                </span>
                <small>数字为聚合数量 · 点击展开</small>
              </div>
              {!results.length && (
                <div className="atlas-no-results">
                  <h4>暂时没有符合条件的地点</h4>
                  <p>试试减少筛选条件，或搜索另一种名称。</p>
                  <button onClick={reset}>重置筛选</button>
                </div>
              )}
            </div>
          ) : tab === "list" ? (
            <div className="atlas-directory">
              <p className="atlas-list-summary">
                地图与名录使用同一组筛选。点击地点打开地图详情。
              </p>
              {results.slice(page * 40, page * 40 + 40).map((p) => (
                <button
                  key={p.id}
                  onClick={() => focusPlace(p)}
                  className="atlas-directory-row"
                >
                  <span
                    className={p.kind === "寺院" ? "temple-dot" : "shrine-dot"}
                  />
                  <div>
                    <b>{p.name}</b>
                    <small>
                      {p.ward} · {p.kind} · {p.sect}
                    </small>
                  </div>
                  <span>{p.ranks[0] || p.heritage[0] || p.unit}</span>
                  <ArrowUpRight size={16} />
                </button>
              ))}
              {!results.length && (
                <p className="atlas-empty">
                  没有符合条件的地点。请调整或重置筛选。
                </p>
              )}
              <div className="atlas-pagination">
                <button disabled={page === 0} onClick={() => setPage(page - 1)}>
                  <ChevronLeft size={16} />
                  上一页
                </button>
                <span>
                  {results.length ? page + 1 : 0} /{" "}
                  {Math.ceil(results.length / 40)}
                </span>
                <button
                  disabled={(page + 1) * 40 >= results.length}
                  onClick={() => setPage(page + 1)}
                >
                  下一页
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="atlas-pending">
              <h4>在官方目录中，等待落到地图上。</h4>
              <p>
                以下是净土宗京都市目录中尚未与地图唯一匹配的记录。可能是坐标缺失、别名或同名匹配未确认；不代表一定是新地点。为避免把寺院放错位置，这些记录不计入地图点位。此页为独立目录，不受地图筛选影响。
              </p>
              <a
                href="https://otera.jodo.or.jp/temple/kyoto/ka/kyotosi/"
                target="_blank"
                rel="noreferrer"
              >
                净土宗官方目录 ↗
              </a>
              <div>
                {data.unlocated.map((p) => (
                  <a
                    key={p.source}
                    href={p.source}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <b>{p.name}</b>
                    <span>{p.address || "地址请查官方详情"}</span>
                    <ArrowUpRight size={14} />
                  </a>
                ))}
              </div>
            </div>
          )}
          <div className="atlas-attribution">
            <span>
              地理数据 ©{" "}
              <a
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noreferrer"
              >
                OpenStreetMap contributors
              </a>{" "}
              · ODbL · 分类参考{" "}
              <a
                href="https://www.wikidata.org/"
                target="_blank"
                rel="noreferrer"
              >
                Wikidata
              </a>
            </span>
            <span>收录更新 {data.meta.updated} · 手绘渲染 / 非导航地图</span>
          </div>
        </div>
        {(chosen || selectionGroup.length > 0) && (
          <aside className="atlas-detail">
            <button
              className="atlas-detail-close"
              aria-label="关闭寺社详情"
              onClick={() => {
                setActive(null);
                setSelectionGroup([]);
              }}
            >
              <X size={18} />
            </button>
            {chosen ? (
              <>
                <span className="atlas-detail-kicker">
                  {chosen.kind === "寺院" ? "TEMPLE NOTES" : "SHRINE NOTES"} /{" "}
                  {chosen.ward}
                </span>
                <div
                  className={`atlas-detail-symbol ${chosen.kind === "神社" ? "shrine" : ""}`}
                >
                  {chosen.kind === "寺院" ? "寺" : "社"}
                </div>
                <h3>{chosen.name}</h3>
                {chosen.aliases && (
                  <p className="atlas-aliases">{chosen.aliases}</p>
                )}
                <div className="atlas-detail-tags">
                  <span>{chosen.kind}</span>
                  <span>{chosen.ward}</span>
                  <span>{chosen.unit}</span>
                </div>
                <p className="atlas-type-source">
                  类型依据：{chosen.kindSource}
                </p>
                <dl>
                  <dt>{chosen.kind === "寺院" ? "所属宗派" : "信仰体系"}</dt>
                  <dd>
                    {chosen.kind === "寺院" ? chosen.sect : "神道"}
                    <small>
                      {chosen.kind === "寺院"
                        ? chosen.sectSource || "来源尚未标注宗派"
                        : "神社不使用佛教宗派分类"}
                    </small>
                  </dd>
                  <dt>寺格／历史社格</dt>
                  <dd>
                    {chosen.ranks.length
                      ? chosen.ranks.join(" · ")
                      : "未详／尚未补全"}
                  </dd>
                  <dt>文化遗产关联</dt>
                  <dd>
                    {chosen.heritage.length
                      ? chosen.heritage.join(" · ")
                      : "未详／尚未补全"}
                    {chosen.heritage.length > 0 && (
                      <small>
                        可能指境内建筑／庭园等具体资产，请核对来源。
                      </small>
                    )}
                  </dd>
                  {chosen.deity && (
                    <>
                      <dt>祭神</dt>
                      <dd>{chosen.deity}</dd>
                    </>
                  )}
                  {chosen.address && (
                    <>
                      <dt>目录地址</dt>
                      <dd>{chosen.address}</dd>
                    </>
                  )}
                  <dt>地理位置</dt>
                  <dd>
                    {chosen.lat.toFixed(5)}° N, {chosen.lon.toFixed(5)}° E
                    <small>地图对象中心，非实际入口</small>
                  </dd>
                </dl>
                {chosen.note && <p>{chosen.note}</p>}
                <button
                  className={`atlas-detail-save ${saved.includes(chosen.id) ? "saved" : ""}`}
                  onClick={() => switchSave(chosen)}
                >
                  {saved.includes(chosen.id) ? (
                    <Check size={15} />
                  ) : (
                    <Bookmark size={15} />
                  )}{" "}
                  {saved.includes(chosen.id)
                    ? "已收藏 · 点击移除"
                    : "收藏这座寺社"}
                </button>
                <a
                  className="atlas-nav-link"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(chosen.name + " 京都市 " + chosen.ward)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapPin size={14} />
                  在地图中查找与导航
                  <ArrowUpRight size={14} />
                </a>
                {safeLink(chosen.website) && (
                  <a
                    className="atlas-nav-link"
                    href={chosen.website}
                    target="_blank"
                    rel="noreferrer"
                  >
                    资料所列网站
                    <ArrowUpRight size={14} />
                  </a>
                )}
                <div className="atlas-detail-sources">
                  <h4>分类依据与资料来源</h4>
                  {chosen.osm.map((u, i) => (
                    <a key={u} href={u} target="_blank" rel="noreferrer">
                      OpenStreetMap 地点
                      {chosen.osm.length > 1 ? ` ${i + 1}` : ""} ↗
                    </a>
                  ))}
                  {chosen.wikidata && (
                    <a
                      href={`https://www.wikidata.org/wiki/${chosen.wikidata}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Wikidata · {chosen.wikidata} ↗
                    </a>
                  )}
                  {chosen.directorySource && (
                    <a
                      href={chosen.directorySource}
                      target="_blank"
                      rel="noreferrer"
                    >
                      净土宗官方寺院目录 ↗
                    </a>
                  )}
                  {chosen.editorialSources?.map((s) => (
                    <a
                      key={s.url}
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {s.label} ↗
                    </a>
                  ))}
                </div>
                <p className="atlas-detail-note">
                  收录不等于开放参观。塔头、小社或附属建筑可能限制进入；开放时间、参拜方式和入口请向寺社确认。
                </p>
                {!results.some((p) => p.id === chosen.id) && (
                  <p className="atlas-selected-outside">
                    此地点不在当前筛选结果中。
                  </p>
                )}
              </>
            ) : (
              <>
                <h3>这里有 {selectionGroup.length} 个地点</h3>
                <p>坐标接近或重叠，请选择具体寺社。</p>
                {selectionGroup.map((p) => (
                  <button
                    className="atlas-overlap-option"
                    key={p.id}
                    onClick={() => {
                      setActive(p.id);
                      setSelectionGroup([]);
                    }}
                  >
                    {p.name}
                    <ArrowUpRight size={15} />
                  </button>
                ))}
              </>
            )}
          </aside>
        )}
      </div>
      <div className="atlas-bottom">
        <span>
          <Info size={12} />{" "}
          本版含已定位寺社与单列待定位目录，不宣称收录京都全部寺社。
        </span>
        <button onClick={() => setNotes(!notes)}>
          了解数据边界 <ArrowUpRight size={13} />
        </button>
      </div>
      {notice && (
        <div className="atlas-toast" role="status">
          <Check size={14} />
          {notice}
        </div>
      )}
    </div>
  );
}
