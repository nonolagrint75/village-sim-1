import fs from "fs"
const s = fs.readFileSync("src/lib/render/nature/shorePaint.ts","utf8")
const lines = s.split(/\n/)
for (let i=0;i<lines.length;i++) {
  if (/^(export )?function |^import |^const SHORE|^const DIRT|^let _|^export type|^export function shoreAlpha|^export function shoreHard|^export function shoreRgb|^export function shoreLerp|^function dirtBlob|^function smoothstep|^function rgb|^function isWater|^function isDirt|^function cell|^function strip|^function shoreTmp/.test(lines[i])) {
    console.log(String(i+1).padStart(4), lines[i].slice(0,100))
  }
}