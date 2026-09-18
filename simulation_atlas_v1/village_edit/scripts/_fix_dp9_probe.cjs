const fs = require('fs')
let t = fs.readFileSync('scripts/_probe_phase5_eco_shock.ts', 'utf8')
if (!t.includes("from '../src/lib/sim/resources'")) {
  t = t.replace(
    "import { countOf } from '../src/lib/sim/inventory'",
    "import { countOf } from '../src/lib/sim/inventory'\nimport { BASE_PRICES } from '../src/lib/sim/resources'",
  )
}
const oldSnap = `const prePrices = {
  wheat: state.prices.wheat,
  flour: state.prices.flour,
  bread: state.prices.bread,
  food: state.prices.food,
}`
const neuSnap = `const priceOf = (res: 'wheat' | 'flour' | 'bread' | 'food') =>
  state.prices[res] ?? BASE_PRICES[res] ?? 3
const prePrices = {
  wheat: priceOf('wheat'),
  flour: priceOf('flour'),
  bread: priceOf('bread'),
  food: priceOf('food'),
}`
if (!t.includes(oldSnap)) throw new Error('prePrices block missing')
t = t.replace(oldSnap, neuSnap)

const oldPost = `const postPrices = {
  wheat: state.prices.wheat,
  flour: state.prices.flour,
  bread: state.prices.bread,
  food: state.prices.food,
}`
const neuPost = `const postPrices = {
  wheat: priceOf('wheat'),
  flour: priceOf('flour'),
  bread: priceOf('bread'),
  food: priceOf('food'),
}`
if (!t.includes(oldPost)) throw new Error('postPrices block missing')
t = t.replace(oldPost, neuPost)

fs.writeFileSync('scripts/_probe_phase5_eco_shock.ts', t, 'utf8')
console.log('probe price fallback ok')