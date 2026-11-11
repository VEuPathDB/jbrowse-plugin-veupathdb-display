# jbrowse-plugin-veupathdb-display

JBrowse 2 (v5) plugin `VEuPathDBDisplay`: VEuPathDB-specific feature details and
colouring, ported from the JBrowse 1 `functions.conf` callbacks.

## Track declaration

A track opts in through `metadata.veupathdb` in its config. Tracks without it
get the stock feature details unchanged.

```json
"metadata": {
  "veupathdb": {
    "record": {
      "type": "gene",
      "id": "{parent|id}",
      "tables": ["GeneTranscripts", "GOTerms", "PubMed"],
      "baseUrl": "/a"
    },
    "ncbiProteinTitles": { "idField": "id" }
  }
}
```

### `record`: WDK record iframe

Adds a "Record details" card under the stock details of the clicked feature,
framing `<baseUrl>/app/embed-record/<type>/<id>?tables=<tables>`.

| field     | required | meaning                                                        |
| --------- | -------- | -------------------------------------------------------------- |
| `type`    | yes      | WDK record type (`gene`, `junction`, `variation`, …)           |
| `id`      | yes      | id template, see below                                         |
| `tables`  | no       | record tables to request; none means no `tables` parameter     |
| `baseUrl` | no       | site prefix, default `/a` (same origin)                        |

`id` template: `{field}` reads a feature field by its lowercase name (the v5
GFF3 adapter lowercases attributes; a name colliding with a core field becomes
`<name>2`). `{a|b}` takes the first field present. `{position}` is the 1-based
start.

| record   | declaration                                                                        | URL                                                                         |
| -------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| gene     | `{"type":"gene","id":"{parent\|id}","tables":["GeneTranscripts","GOTerms","PubMed"]}` | `/a/app/embed-record/gene/PF3D7_0100100?tables=GeneTranscripts,GOTerms,PubMed` |
| junction | `{"type":"junction","id":"{id}","tables":["SampleInfo"]}`                          | `/a/app/embed-record/junction/<feature ID>?tables=SampleInfo`               |
| variant  | `{"type":"variation","id":"Variant_{refName}_{position}","tables":["PredictedEffects"]}` | `/a/app/embed-record/variation/Variant_Pf3D7_01_v3_100418?tables=PredictedEffects` |

A gene click in v5 opens the transcript, whose `parent` is the gene id; a click
on the gene itself falls back to `id`.

### `ncbiProteinTitles`: NRDB titles

Fetches NCBI E-utilities `esummary` (db=protein, no API key) titles for the
comma-separated ids in `idField` (default `id`) when the details open. On
failure or an 8 s timeout the card shows a short notice; the stock attributes
are always shown. `true` is shorthand for `{ "idField": "id" }`.

## Jexl

Ports of the JBrowse 1 `functions.conf` styling callbacks (ApiCommonModel
`Model/lib/jbrowse/functions.conf` @ `5a80b14e`). Every function takes
`feature` first and reads attributes by their lowercase v5 name. This table is
the contract producers code against.

| function | signature | attributes read | v5 display and slot | replaces (JBrowse 1) |
| --- | --- | --- | --- | --- |
| `veupathVariantEffectColor` | `(feature)` | `INFO.ANN` | `LinearMarkDisplay` `marks[].encoding.color.value` (point mark) | `variantEffectColorFxn` |
| `veupathStrandColor` | `(feature, plus, minus)` | `strand` | `LinearBasicDisplay` `encoding.color.value` | `processedApolloTranscriptColor` (`'#6666FF', '#F18F74'`), `estColor` (`'deepskyblue', 'pink'`), `nrdbColor` (`'mediumblue', 'crimson'`), `orfColor`, `piggyBacColor` (`'dodgerblue', 'mediumvioletred'`); border callbacks, see below |
| `veupathProcessedTranscriptColor` | `(feature)` | `type`, `soterm`, `strand`, of the root ancestor (a transcript or exon paints as its gene) | `LinearBasicDisplay` `encoding.color.value` | `processedTranscriptColor` |
| `veupathGsnapIntronColor` | `(feature)` | `strand`, `totalscore` | `LinearMarkDisplay` `marks[].encoding.color.value` (link mark) | `gsnapIntronColorFromStrandAndScore` |
| `veupathGsnapIntronLineThickness` | `(feature)` → px | `totalscore` | `LinearMarkDisplay` `marks[].encoding.strokeWidth.field` (link mark), with the identity scale below | `gsnapIntronLineThickness` |
| `veupathHaplotypeColor` | `(feature)` | `boundary` | `LinearBasicDisplay` `encoding.color.value` | `haplotypeColorFxn` → `haplotypeColor` |
| `veupathBindingSiteColor` | `(feature)` | `strand`, `score2` | `LinearBasicDisplay` `encoding.color.value` | `colorForBindingSitesByPvalueFxn` → `colorForBindingSitesByPvalue` |
| `veupathInterproColor` | `(feature)` | `source` | `LinearBasicDisplay` `encoding.color.value` | `interproColorFxn` |
| `veupathSignalpColor` | `(feature)` | `source`, `type` | `LinearBasicDisplay` `encoding.color.value` | `signalpColorFxn` |
| `veupathIedbColor` | `(feature)` | `matchesfulllengthprotein`, `mismatches` | `LinearBasicDisplay` `encoding.color.value` | `iedbColorFxn` → `iedbColor` |
| `veupathPostTranslationalModColor` | `(feature)` | `modificationtype` | `LinearBasicDisplay` `encoding.color.value` | `unifiedPostTranslationalModColor` |

`encoding.color.value` is the `FeatureColor` slot of
`@jbrowse/display-kit` `featureEncodingConfigSchema` (`maybeColor`,
`contextVariable: ['feature']`); a point or link mark's `color.value` is
`MarkColor.value`, and a link's `strokeWidth.field` a `featureField`, which evaluates a
`jexl:` expression with `feature` in scope.

```json
{ "type": "LinearBasicDisplay",
  "encoding": { "color": { "value": "jexl:veupathStrandColor(feature, 'deepskyblue', 'pink')" } } }
```

```json
{ "type": "LinearMarkDisplay",
  "marks": [{ "mark": "link", "encoding": {
    "color": { "value": "jexl:veupathGsnapIntronColor(feature)" },
    "strokeWidth": { "field": "jexl:veupathGsnapIntronLineThickness(feature)",
      "scale": { "type": "linear", "domainMin": 2, "domainMax": 6, "range": [2, 6] } } } }] }
```

A link's `strokeWidth` field always passes through a scale; the pinned domain
equal to its range makes the returned px the drawn px.

### Missing attributes and deviations

- `totalscore` absent: the darkest colour bin and the 6 px stroke, as in
  JBrowse 1.
- `score2` (GFF3 `Score=`; the score column is not read) absent: the weakest
  colour of the strand (`skyblue` / `tomato`).
- `boundary` absent: `darkgreen`. `matchesfulllengthprotein` and `mismatches`
  absent: `rgba(30,130,76,0.2)`. `modificationtype` absent: `blue`.
  `source` unknown: `black`. Strand absent or 0: the minus colour, except
  `veupathGsnapIntronColor`, where it is the plus ramp.
- InterPro `PRINTS`: JBrowse 1 returned `maize`, which is not a CSS colour;
  this returns `#fbec5d`.

### JBrowse 1 properties with no v5 slot

- Border colour (`processedTranscriptBorderColor`, `estBorderColor`):
  `LinearBasicDisplay` has a fill channel only; outlines take the theme's
  stroke. `veupathStrandColor` reproduces them should a slot appear.
- Junction post height (`gsnapIntronPostHeight`): a link mark has `y`, `row`,
  `color` and `strokeWidth` channels and no posts. Not ported.

## Development

Node 24, pnpm 11.

```
pnpm install --frozen-lockfile
pnpm test        # jest
pnpm typecheck   # tsc --noEmit
pnpm lint
pnpm build       # dist/jbrowse-plugin-veupathdb-display.umd.{development,production.min}.js
pnpm serve       # bundle + test_config on :9004
```

With the jbrowse-components dev server on :3000, open
`http://localhost:3000/?config=http://localhost:9004/test_config/veupathdb-display-test.json&assembly=volvox&loc=ctgA:1..26000&tracks=vdb_variants,vdb_genes,vdb_junctions,vdb_nrdb,vdb_undeclared`.
The fixtures in `test_config/` are synthetic, on the volvox test assembly.

Releases: push a `v*` tag; the release workflow attaches the UMD bundle.
