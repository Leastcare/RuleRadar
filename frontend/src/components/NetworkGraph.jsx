import React, { useEffect, useRef, useState } from 'react'
import s from './NetworkGraph.module.css'

const W = 600
const H = 420

function seeded(seed) {
  return function() {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
}

function buildGraph(result) {
  const rand = seeded(result.docket_id.split('').reduce((a, c) => a + c.charCodeAt(0), 0))
  const nodes = []
  const edges = []
  const clusterIndexMap = {}
  result.clusters.forEach((c, i) => { clusterIndexMap[c.cluster_id] = i })

  // Cluster member nodes — positioned in tight groups on right side
  result.clusters.forEach((cluster, ci) => {
    const angle0 = (ci / result.clusters.length) * Math.PI * 2
    const groupX = W * 0.62 + Math.cos(angle0) * 100
    const groupY = H * 0.45 + Math.sin(angle0) * 110

    cluster.member_ids.forEach((id, mi) => {
      const a = (mi / cluster.member_ids.length) * Math.PI * 2
      const r = 20 + rand() * Math.min(40, cluster.size * 3)
      nodes.push({
        id, clusterId: cluster.cluster_id, ci,
        x: Math.max(20, Math.min(W-20, groupX + Math.cos(a) * r)),
        y: Math.max(20, Math.min(H-20, groupY + Math.sin(a) * r)),
        vx: 0, vy: 0,
      })
    })

    // Edges within cluster
    const members = cluster.member_ids
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        if (rand() > 0.35) {
          edges.push({ from: members[i], to: members[j], strong: cluster.avg_similarity > 0.9, clusterId: cluster.cluster_id, ci })
        }
      }
    }
  })

  // Singleton nodes — scattered on left side
  const singletonCount = Math.min(result.total_analyzed - nodes.length, 60)
  for (let i = 0; i < singletonCount; i++) {
    nodes.push({
      id: `s${i}`, clusterId: null, ci: -1,
      x: 20 + rand() * W * 0.52,
      y: 20 + rand() * (H - 40),
      vx: 0, vy: 0,
    })
  }

  return { nodes, edges }
}

const COLORS = ['#f0b428', '#00d4ff', '#ff6644', '#aa88ff', '#00ff88', '#ff88aa']

export default function NetworkGraph({ status, result, selCluster, onSelectCluster, activeDocket }) {
  const [graph, setGraph] = useState(null)
  const [hovered, setHovered] = useState(null)

  useEffect(() => {
    if (!result) { setGraph(null); return }
    setGraph(buildGraph(result))
  }, [result?.docket_id])

  const clusterIndexMap = {}
  result?.clusters?.forEach((c, i) => { clusterIndexMap[c.cluster_id] = i })

  // Compute cluster centroids
  const centroids = {}
  if (graph && result) {
    result.clusters.forEach(c => {
      const members = graph.nodes.filter(n => n.clusterId === c.cluster_id)
      if (!members.length) return
      centroids[c.cluster_id] = {
        x: members.reduce((s, n) => s + n.x, 0) / members.length,
        y: members.reduce((s, n) => s + n.y, 0) / members.length,
      }
    })
  }

  const activeCluster = hovered
    ? result?.clusters?.find(c => c.cluster_id === hovered)
    : selCluster

  return (
    <div className={s.wrap}>
      <div className={s.titleBar}>
        <span className={s.title}>COMMENT NETWORK GRAPH</span>
        {result && (
          <div className={s.meta}>
            <span>Nodes: <b>{result.total_analyzed}</b></span>
            <span className={s.sep}>|</span>
            <span>Clusters: <b>{result.clusters.length}</b></span>
            <span className={s.sep}>|</span>
            <span>Layout: Force</span>
          </div>
        )}
        <button className={s.expandBtn} title="Fullscreen">⛶</button>
      </div>

      <div className={s.canvas}>
        {status === 'idle' && (
          <div className={s.state}>
            <div className={s.idleIcon}>◎</div>
            <p className={s.stateTitle}>SELECT A DOCKET TO BEGIN ANALYSIS</p>
            <p className={s.stateHint}>Click any docket in the left panel to scan for coordinated comment patterns</p>
          </div>
        )}

        {status === 'scanning' && (
          <div className={s.state}>
            <div className={s.spinner}/>
            <p className={s.stateTitle}>SCANNING {activeDocket?.id}...</p>
            <p className={s.stateHint}>Fetching comments and computing similarity matrix</p>
          </div>
        )}

        {status === 'error' && (
          <div className={s.state}>
            <span className={s.errorIcon}>✕</span>
            <p className={s.stateTitle}>SCAN FAILED</p>
          </div>
        )}

        {status === 'done' && result && graph && (
          <>
            <svg viewBox={`0 0 ${W} ${H}`} className={s.svg}>
              <defs>
                <radialGradient id="bgG" cx="50%" cy="50%" r="60%">
                  <stop offset="0%"   stopColor="#0c1e28"/>
                  <stop offset="100%" stopColor="#040d0f"/>
                </radialGradient>
                {result.clusters.map((c, i) => (
                  <radialGradient key={c.cluster_id} id={`cg${c.cluster_id}`} cx="50%" cy="50%" r="50%">
                    <stop offset="0%"   stopColor={COLORS[i % COLORS.length]} stopOpacity="0.22"/>
                    <stop offset="100%" stopColor={COLORS[i % COLORS.length]} stopOpacity="0"/>
                  </radialGradient>
                ))}
              </defs>

              <rect width={W} height={H} fill="url(#bgG)"/>

              {/* Grid */}
              {Array.from({ length: 12 }, (_, r) =>
                Array.from({ length: 18 }, (_, c) => (
                  <circle key={`${r}-${c}`}
                    cx={c * (W/17)} cy={r * (H/11)}
                    r={0.7} fill="rgba(0,212,255,0.07)"/>
                ))
              )}

              {/* Cluster auras */}
              {result.clusters.map((c, i) => {
                const cen = centroids[c.cluster_id]
                if (!cen) return null
                const r = Math.max(32, Math.sqrt(c.size) * 15)
                const isSel = selCluster?.cluster_id === c.cluster_id
                return (
                  <circle key={c.cluster_id}
                    cx={cen.x} cy={cen.y} r={r}
                    fill={`url(#cg${c.cluster_id})`}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={isSel ? 0.8 : 0.3}
                    strokeOpacity={isSel ? 0.6 : 0.2}
                  />
                )
              })}

              {/* Edges */}
              {graph.edges.map((e, i) => {
                const a = graph.nodes.find(n => n.id === e.from)
                const b = graph.nodes.find(n => n.id === e.to)
                if (!a || !b) return null
                const col = COLORS[e.ci % COLORS.length]
                const isSel = selCluster?.cluster_id === e.clusterId
                return (
                  <line key={i}
                    x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke={col}
                    strokeWidth={e.strong ? (isSel ? 1.5 : 0.9) : (isSel ? 0.8 : 0.35)}
                    strokeOpacity={isSel ? 0.75 : (e.strong ? 0.45 : 0.2)}
                    strokeDasharray={e.strong ? undefined : '3 5'}
                  />
                )
              })}

              {/* Nodes */}
              {graph.nodes.map(node => {
                const ci = clusterIndexMap[node.clusterId]
                const color = node.clusterId != null ? COLORS[ci % COLORS.length] : '#1e6888'
                const isSel = selCluster?.cluster_id === node.clusterId
                const isHov = hovered === node.clusterId
                const r = node.clusterId != null ? (isSel || isHov ? 7 : 5.5) : 3.5
                return (
                  <circle key={node.id}
                    cx={node.x} cy={node.y} r={r}
                    fill={color}
                    fillOpacity={node.clusterId != null ? (isSel ? 1 : 0.85) : 0.5}
                    stroke={isSel ? '#ffffff' : color}
                    strokeWidth={isSel ? 1.5 : 0.6}
                    strokeOpacity={0.8}
                    style={{
                      filter: node.clusterId != null
                        ? `drop-shadow(0 0 ${isSel ? 8 : 4}px ${color})`
                        : 'none',
                      cursor: node.clusterId != null ? 'pointer' : 'default',
                    }}
                    onClick={() => {
                      if (node.clusterId == null) return
                      const c = result.clusters.find(c => c.cluster_id === node.clusterId)
                      if (c) onSelectCluster(c)
                    }}
                    onMouseEnter={() => node.clusterId != null && setHovered(node.clusterId)}
                    onMouseLeave={() => setHovered(null)}
                  />
                )
              })}

              {/* "INDIVIDUAL COMMENTS" corner label */}
              <text x={16} y={20} fill="rgba(0,180,220,0.45)"
                fontSize="9" fontFamily="Share Tech Mono" letterSpacing="1">
                INDIVIDUAL COMMENTS
              </text>

              {/* Single tooltip for hovered/selected cluster — always above the aura */}
              {activeCluster && centroids[activeCluster.cluster_id] && (() => {
                const cen = centroids[activeCluster.cluster_id]
                const ci  = clusterIndexMap[activeCluster.cluster_id]
                const col = COLORS[ci % COLORS.length]
                const auraR = Math.max(32, Math.sqrt(activeCluster.size) * 15)
                const ttW = 148
                const ttH = 34
                // Always prefer above; if too close to top edge go below
                const aboveY = cen.y - auraR - ttH - 16
                const belowY = cen.y + auraR + 16
                const ty = aboveY >= 6 ? aboveY : belowY
                const tx = Math.max(4, Math.min(W - ttW - 4, cen.x - ttW / 2))
                const lineY1 = ty === aboveY ? ty + ttH : ty
                const lineY2 = ty === aboveY ? cen.y - auraR : cen.y + auraR
                const line1 = `cluster_${String(ci).padStart(2,'0')} :: sim:${activeCluster.avg_similarity.toFixed(2)}`
                const line2 = activeCluster.timing_suspicious
                  ? `window:${Math.round(activeCluster.timing_score * 9)}min :: n=${activeCluster.size}`
                  : `n=${activeCluster.size}`
                return (
                  <g key="tooltip">
                    <line
                      x1={cen.x} y1={lineY1}
                      x2={cen.x} y2={lineY2}
                      stroke={col} strokeWidth="0.8" strokeDasharray="3 3" strokeOpacity="0.55"
                    />
                    <rect x={tx} y={ty} width={ttW} height={ttH}
                      fill="rgba(4,13,15,0.96)" stroke={col} strokeWidth="1" rx="1"/>
                    <text x={tx + 7} y={ty + 13}
                      fill={col} fontSize="9.5" fontFamily="Share Tech Mono" letterSpacing="0.4">
                      {line1}
                    </text>
                    <text x={tx + 7} y={ty + 26}
                      fill={col} fontSize="9.5" fontFamily="Share Tech Mono" letterSpacing="0.4">
                      {line2}
                    </text>
                  </g>
                )
              })()}

              {/* POTENTIAL COORDINATED CLUSTER label — only for flagged clusters, offset to the side */}
              {result.clusters.filter(c => c.timing_suspicious && c.cluster_id !== activeCluster?.cluster_id).slice(0, 1).map((c) => {
                const cen = centroids[c.cluster_id]
                if (!cen) return null
                const ci2 = clusterIndexMap[c.cluster_id]
                const col = COLORS[ci2 % COLORS.length]
                const auraR = Math.max(32, Math.sqrt(c.size) * 15)
                // Place to the right if space, otherwise left
                const toRight = cen.x < W * 0.6
                const lx = toRight ? cen.x + auraR + 10 : cen.x - auraR - 140
                const ly = Math.max(14, Math.min(H - 30, cen.y - 10))
                return (
                  <g key={c.cluster_id}>
                    <line
                      x1={toRight ? cen.x + auraR : cen.x - auraR} y1={cen.y}
                      x2={toRight ? lx : lx + 135} y2={ly + 8}
                      stroke={col} strokeWidth="0.7" strokeDasharray="3 3" strokeOpacity="0.55"
                    />
                    <text x={lx} y={ly} fill={col}
                      fontSize="10" fontFamily="Share Tech Mono" letterSpacing="0.5">
                      POTENTIAL
                    </text>
                    <text x={lx} y={ly + 13} fill={col}
                      fontSize="10" fontFamily="Share Tech Mono" letterSpacing="0.5">
                      COORDINATED CLUSTER
                    </text>
                  </g>
                )
              })}
            </svg>

            {/* Minimap */}
            <div className={s.minimap}>
              <svg viewBox={`0 0 ${W} ${H}`} className={s.minimapSvg}>
                <rect width={W} height={H} fill="#040d0f"/>
                {graph.nodes.map((n, i) => {
                  const ci = clusterIndexMap[n.clusterId]
                  const color = n.clusterId != null ? COLORS[ci % COLORS.length] : '#1e6888'
                  return <circle key={i} cx={n.x} cy={n.y} r={n.clusterId != null ? 5 : 3}
                    fill={color} fillOpacity={0.7}/>
                })}
              </svg>
            </div>
          </>
        )}
      </div>

      <div className={s.legend}>
        <span className={s.legItem}><span className={s.legDotSolo}/>Individual comment</span>
        <span className={s.legItem}><span className={s.legDotClus}/>Clustered comment</span>
        <span className={s.legItem}><span className={s.legLine}/>Connection (similarity)</span>
        <span className={s.legItem}><span className={s.legDash}/>Lower similarity</span>
      </div>
    </div>
  )
}
