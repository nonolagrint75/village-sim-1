const fs = require("fs");
const out = process.argv[2];
let s = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (d) => { s += d; });
process.stdin.on("end", () => {
  fs.writeFileSync(out, s, "utf8");
  console.log("ok", out, Buffer.byteLength(s));
});