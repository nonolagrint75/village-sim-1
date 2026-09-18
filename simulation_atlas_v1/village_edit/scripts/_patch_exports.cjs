const fs = require("fs");
const contracts = "C:/Users/kamel/village-sim-1/_wt_rhythm/village_edit/src/lib/sim/emergence/contracts.ts";
const index = "C:/Users/kamel/village-sim-1/_wt_rhythm/village_edit/src/lib/sim/emergence/index.ts";
let c = fs.readFileSync(contracts, "utf8");
if (!c.includes("careerMetricsSnapshot")) {
  c = c.replace(
    "export { groupMetricsSnapshot }",
    "export { groupMetricsSnapshot }\nexport { careerMetricsSnapshot } from './mobility'",
  );
  fs.writeFileSync(contracts, c, "utf8");
  console.log("contracts ok");
}
let i = fs.readFileSync(index, "utf8");
if (!i.includes("careerMetricsSnapshot")) {
  i = i.replace("groupMetricsSnapshot,", "groupMetricsSnapshot,\n  careerMetricsSnapshot,");
  fs.writeFileSync(index, i, "utf8");
  console.log("index ok");
}