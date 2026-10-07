export const DEFAULT_FILTERS = {
  query: "",
  kind: "全部",
  ward: "全部",
  family: "全部",
  rank: "全部",
  heritage: "全部",
  unit: "寺社地点",
  savedOnly: false,
};
export function normalizeSearch(value = "") {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s・·-]/g, "")
    .replace(/[淨浄]/g, "净")
    .replace(/臨/g, "临")
    .replace(/[濟済]/g, "济")
    .replace(/龍/g, "龙")
    .replace(/徳/g, "德")
    .replace(/觀/g, "观")
    .replace(/佛/g, "仏")
    .replace(/蓮/g, "莲")
    .replace(/禪/g, "禅")
    .replace(/國/g, "国")
    .replace(/萬/g, "万")
    .replace(/東/g, "东")
    .replace(/見/g, "见")
    .replace(/樂/g, "乐")
    .replace(/壽/g, "寿")
    .replace(/滿/g, "满")
    .replace(/閣/g, "阁")
    .replace(/蔵/g, "藏")
    .replace(/眞/g, "真")
    .replace(/稲/g, "稻")
    .replace(/鴨/g, "鸭")
    .replace(/賀/g, "贺")
    .replace(/寶/g, "宝")
    .replace(/靈/g, "灵")
    .replace(/円/g, "圆");
}
export function filterPlaces(places, f, saved = []) {
  const q = normalizeSearch(f.query);
  return places.filter(
    (p) =>
      (!q ||
        normalizeSearch(
          [p.name, p.aliases, p.sect, p.ward, p.address, p.deity].join(" "),
        ).includes(q)) &&
      (f.kind === "全部" || p.kind === f.kind) &&
      (f.ward === "全部" || p.ward === f.ward) &&
      (f.family === "全部" || p.family === f.family) &&
      (f.rank === "全部" ||
        (f.rank === "未详"
          ? p.ranks.length === 0
          : p.ranks.includes(f.rank))) &&
      (f.heritage === "全部" ||
        (f.heritage === "未详"
          ? p.heritage.length === 0
          : p.heritage.includes(f.heritage))) &&
      (f.unit === "全部" ||
        (f.unit === "寺社地点"
          ? p.unit !== "殿堂／附属建筑"
          : p.unit === f.unit)) &&
      (!f.savedOnly || saved.includes(p.id)),
  );
}
export function clusterPlaces(places, project, transform, viewport) {
  const cells = new Map();
  const cellSize = transform.k >= 7 ? 30 : 56;
  for (const p of places) {
    const [x, y] = project([p.lon, p.lat]);
    const sx = x * transform.k + transform.x,
      sy = y * transform.k + transform.y;
    if (
      sx < -30 ||
      sy < -30 ||
      sx > viewport.width + 30 ||
      sy > viewport.height + 30
    )
      continue;
    const key =
      transform.k >= 22
        ? `${p.lon.toFixed(6)}:${p.lat.toFixed(6)}`
        : `${Math.floor(sx / cellSize)}:${Math.floor(sy / cellSize)}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push({ ...p, sx, sy });
  }
  return [...cells.values()].map((items) => ({
    items,
    x: items.reduce((s, p) => s + p.sx, 0) / items.length,
    y: items.reduce((s, p) => s + p.sy, 0) / items.length,
  }));
}
export function csvForPlaces(places) {
  const esc = (v) =>
    '"' +
    String(v ?? "")
      .replace(/^[=+@-]/, "'" + "$&")
      .replaceAll('"', '""') +
    '"';
  return (
    "\ufeff" +
    [
      [
        "名称",
        "类型",
        "行政区",
        "宗派",
        "寺格／旧社格",
        "文化财关联",
        "地点性质",
        "经度",
        "纬度",
        "来源",
      ],
      ...places.map((p) => [
        p.name,
        p.kind,
        p.ward,
        p.sect,
        p.ranks.join("；"),
        p.heritage.join("；"),
        p.unit,
        p.lon,
        p.lat,
        p.osm[0],
      ]),
    ]
      .map((row) => row.map(esc).join(","))
      .join("\r\n")
  );
}
