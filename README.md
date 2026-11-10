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

`veupathVariantEffectColor(feature)` colours a VCF variant by its most severe
snpEff `INFO.ANN` effect (truncating, non-synonymous, synonymous, other):

```json
"displayDefaults": {
  "encoding": { "color": { "value": "jexl:veupathVariantEffectColor(feature)" } }
}
```

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
