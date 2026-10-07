import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DEFAULT_FILTERS,
  filterPlaces,
  clusterPlaces,
  csvForPlaces,
} from "../src/atlas-utils.js";
const data = JSON.parse(
  readFileSync(new URL("../public/data/kyoto-temples.json", import.meta.url)),
);
const geo = JSON.parse(
  readFileSync(new URL("../public/data/kyoto-geography.json", import.meta.url)),
);
const run = (overrides = {}, saved = []) =>
  filterPlaces(data.places, { ...DEFAULT_FILTERS, ...overrides }, saved);
test("snapshot has unique IDs, valid coordinates, 11 matching administrative wards and auditable sources", () => {
  assert.equal(new Set(data.places.map((p) => p.id)).size, data.places.length);
  assert.equal(data.meta.total, data.places.length);
  const wards = new Set(geo.wards.features.map((f) => f.properties.name));
  assert.equal(wards.size, 11);
  for (const p of data.places) {
    assert.ok(wards.has(p.ward));
    assert.ok(p.lat > 34.8 && p.lat < 35.4);
    assert.ok(p.lon > 135.4 && p.lon < 136);
    assert.ok(p.osm.length > 0);
    assert.ok(
      p.osm.every((u) =>
        /^https:\/\/www.openstreetmap.org\/(node|way|relation)\/\d+$/.test(u),
      ),
    );
  }
  assert.equal(data.meta.namedSites, run().length);
  assert.equal(data.meta.directoryUnlocated, data.unlocated.length);
  assert.equal(
    data.meta.total,
    Object.values(data.meta.kinds).reduce((a, b) => a + b, 0),
  );
});
test("Chinese aliases locate major temples and shrines without fabricated points", () => {
  assert.ok(run({ query: "金阁寺" }).some((p) => p.wikidata === "Q270983"));
  assert.ok(run({ query: "伏见稻荷" }).some((p) => p.wikidata === "Q714828"));
  assert.ok(
    run({ query: "临济宗", ward: "东山区" }).some(
      (p) => p.wikidata === "Q1440954",
    ),
  );
});
test("combined filters, unclassified records, saved-only and no-match behavior", () => {
  const temples = run({ kind: "寺院", ward: "东山区", family: "临济宗" });
  assert.ok(temples.length > 0);
  assert.ok(
    temples.every(
      (p) => p.kind === "寺院" && p.ward === "东山区" && p.family === "临济宗",
    ),
  );
  assert.equal(run({ query: "不存在的寺社 abcxyz" }).length, 0);
  assert.equal(run({ savedOnly: true }).length, 0);
  assert.deepEqual(
    run({ savedOnly: true }, [temples[0].id]).map((p) => p.id),
    [temples[0].id],
  );
  assert.ok(run({ rank: "未详" }).every((p) => p.ranks.length === 0));
  assert.ok(
    run({ heritage: "世界遗产组成部分" }).some((p) => p.wikidata === "Q221716"),
  );
  assert.ok(run().every((p) => p.unit !== "殿堂／附属建筑"));
});
test("spatial clustering conserves all in-view records and separates high zoom", () => {
  const points = [
    { id: "a", lon: 10, lat: 10 },
    { id: "b", lon: 11, lat: 11 },
    { id: "c", lon: 75, lat: 75 },
    { id: "outside", lon: 300, lat: 300 },
  ];
  const grouped = clusterPlaces(
    points,
    (p) => p,
    { x: 0, y: 0, k: 1 },
    { width: 100, height: 100 },
  );
  assert.equal(
    grouped.reduce((n, g) => n + g.items.length, 0),
    3,
  );
  assert.ok(grouped.some((g) => g.items.length === 2));
  const ungrouped = clusterPlaces(
    points.slice(0, 3),
    (p) => p,
    { x: 0, y: 0, k: 22 },
    { width: 2000, height: 2000 },
  );
  assert.equal(ungrouped.length, 3);
});
test("CSV exports Unicode fields, source links and quoted names safely", () => {
  const p = { ...data.places[0], name: 'A,"B"\n寺' };
  const csv = csvForPlaces([p]);
  assert.ok(csv.startsWith("\ufeff"));
  assert.ok(csv.includes('"A,""B""\n寺"'));
  assert.ok(csv.includes(p.osm[0]));
});

test("coincident points remain selectable together at maximum zoom", () => {
  const points = [
    { id: "a", lon: 1, lat: 1 },
    { id: "b", lon: 1, lat: 1 },
  ];
  const clusters = clusterPlaces(
    points,
    (p) => p,
    { x: 0, y: 0, k: 40 },
    { width: 100, height: 100 },
  );
  assert.equal(clusters.length, 1);
  assert.equal(clusters[0].items.length, 2);
});
test("CSV neutralizes formula-prefixed source labels", () => {
  const p = { ...data.places[0], name: "=SUM(1,2)" };
  assert.ok(csvForPlaces([p]).includes('"\'=SUM(1,2)"'));
});
