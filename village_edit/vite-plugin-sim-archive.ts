/**
 * Dev middleware: persist last 3 sim run archives under village_edit/sim_logs/
 * so agents can inspect GUI runs the same way as headless probes.
 */
import type { Plugin } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

const MAX = 3

export function simArchivePlugin(rootDir: string): Plugin {
  const logDir = path.join(rootDir, 'sim_logs')

  return {
    name: 'sim-archive-writer',
    configureServer(server) {
      server.middlewares.use('/__sim_archive', (req, res, next) => {
        if (req.method !== 'POST') {
          next()
          return
        }
        const chunks: Buffer[] = []
        req.on('data', (c) => chunks.push(Buffer.from(c)))
        req.on('end', () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
              archive?: { id?: string }
              index?: unknown[]
            }
            fs.mkdirSync(logDir, { recursive: true })
            const archive = body.archive
            if (archive?.id) {
              const file = path.join(logDir, `${archive.id}.json`)
              fs.writeFileSync(file, JSON.stringify(archive, null, 2), 'utf8')
            }
            const index = Array.isArray(body.index) ? body.index.slice(0, MAX) : []
            fs.writeFileSync(path.join(logDir, 'index.json'), JSON.stringify(index, null, 2), 'utf8')
            fs.writeFileSync(path.join(logDir, 'latest.json'), JSON.stringify(archive ?? null, null, 2), 'utf8')

            // Prune old run_*.json beyond the 3 kept in index.
            const keep = new Set(
              index
                .map((a) => (a && typeof a === 'object' && 'id' in a ? String((a as { id: string }).id) : ''))
                .filter(Boolean)
                .map((id) => `${id}.json`),
            )
            keep.add('index.json')
            keep.add('latest.json')
            keep.add('README.md')
            for (const name of fs.readdirSync(logDir)) {
              if (!keep.has(name) && name.startsWith('run_') && name.endsWith('.json')) {
                try {
                  fs.unlinkSync(path.join(logDir, name))
                } catch {
                  /* ignore */
                }
              }
            }

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true, kept: index.length }))
          } catch (err) {
            res.statusCode = 500
            res.end(String(err))
          }
        })
      })
    },
  }
}
