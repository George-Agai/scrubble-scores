import { useEffect, useMemo, useState } from 'react'

type Player = {
  id: string
  name: string
  emoji: string
  total: number
}

type Turn = {
  id: string
  playerId: string
  points: number
  timestamp: number
}

const EMOJIS = [
  '🦁','🐙','🦄','🚀','🔥','🌵','🍕','🎯','🧩','🎲','👑','🧠','⚡','🌈','🥇','🎸','🐉','🐼','🐧','🤖'
]
const STORAGE_KEY = 'scrubble_score_tracker_v2'
const uid = (p = '') => p + Math.random().toString(36).slice(2,9)

export default function App(){
  const [stage, setStage] = useState<'setup'|'naming'|'play'>('setup')
  const [playerCount, setPlayerCount] = useState(2)
  const [players, setPlayers] = useState<Player[]>([])
  const [turns, setTurns] = useState<Turn[]>([])
  const [currentPoints, setCurrentPoints] = useState('')
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0)

  // load
  useEffect(()=>{
    const raw = localStorage.getItem(STORAGE_KEY)
    if(!raw) return
    try{
      const data = JSON.parse(raw)
      setPlayers(data.players || [])
      setTurns(data.turns || [])
      setStage(data.stage || 'setup')
      setPlayerCount(data.playerCount || 2)
      setCurrentPlayerIndex(data.currentPlayerIndex || 0)
    }catch(e){ console.warn('load failed', e) }
  },[])

  // persist
  useEffect(()=>{
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ players, turns, stage, playerCount, currentPlayerIndex }))
  },[players, turns, stage, playerCount, currentPlayerIndex])

  // totals
  const totals = useMemo(()=>{
    const map: Record<string,number> = {}
    players.forEach(p=> map[p.id] = 0)
    turns.forEach(t=>{
      map[t.playerId] = (map[t.playerId] || 0) + t.points
    })
    return map
  },[players, turns])

  useEffect(()=>{
    setPlayers(prev => prev.map(p => ({ ...p, total: totals[p.id] || 0 })))
  },[totals])

  // setup
  const beginNaming = () => {
    const list = Array.from({length: playerCount}).map((_,i)=>({
      id: uid('p_'),
      name: `Player ${i+1}`,
      emoji: EMOJIS[i % EMOJIS.length],
      total: 0
    }))
    setPlayers(list)
    setStage('naming')
  }

  const startPlaying = () => {
    setTurns([])
    setCurrentPlayerIndex(0)
    setCurrentPoints('')
    setStage('play')
  }

  const updatePlayerName = (id:string, val:string) => {
    setPlayers(p => p.map(x => x.id===id ? {...x, name: val} : x))
  }
  const updatePlayerEmoji = (id:string, emoji:string) => {
    setPlayers(p => p.map(x => x.id===id ? {...x, emoji} : x))
  }

  // play
  const addTurn = () => {
    const n = Number(currentPoints)
    if(!Number.isFinite(n)) return
    if(players.length === 0) return

    const player = players[currentPlayerIndex]
    const turn: Turn = { id: uid('t_'), playerId: player.id, points: n, timestamp: Date.now() }
    setTurns(t => [...t, turn])
    setCurrentPoints('')
    setCurrentPlayerIndex(i => (i + 1) % players.length)
  }

  const undoLast = () => {
    setTurns(t => t.slice(0, -1))
    setCurrentPlayerIndex(i => (i - 1 + players.length) % players.length)
  }

  const resetAll = () => {
    setPlayers([])
    setTurns([])
    setStage('setup')
    setPlayerCount(2)
    setCurrentPoints('')
    setCurrentPlayerIndex(0)
    localStorage.removeItem(STORAGE_KEY)
  }

  // responsive helpers (small; purely presentational)

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 p-3 flex items-center justify-center">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl p-3">

        <header className="mb-6 text-center">
          <h1 className="text-4xl font-extrabold text-purple-700">Scrubble - Score Tracker</h1>
          <p className="text-sm text-slate-500 mt-1">Turn-based scoring • Local storage • Responsive</p>
        </header>

        {/* Setup */}
        {stage === 'setup' && (
          <section className="text-center">
            <p className="mb-4 font-medium text-lg">How many players?</p>
            <div className="flex flex-col items-center gap-4">
              <input type="range" min={2} max={8} value={playerCount} onChange={e=>setPlayerCount(Number(e.target.value))} className="w-20" />
              <div className="text-xl font-semibold">{playerCount} players</div>
              <div className="flex gap-3">
                <button className="px-4 py-2 rounded-lg border" onClick={()=>{ setPlayerCount(2); setStage('setup') }}>Reset</button>
                <button className="px-5 py-2 bg-purple-600 text-white rounded-lg shadow" onClick={beginNaming}>Next →</button>
              </div>
            </div>
          </section>
        )}

        {/* Naming */}
        {stage === 'naming' && (
          <section>
            <p className="mb-6 text-xl font-semibold text-center">Name players & choose avatars</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {players.map((p) => (
                <div key={p.id} className="border rounded-xl p-4 bg-slate-50">
                  <div className="flex flex-col items-center">
                    <div className="w-5 h-5 rounded-full bg-purple-200 flex items-center justify-center text-4xl mb-3">
                      {p.emoji}
                    </div>
                    <input className="w-full max-w-xs border-b bg-transparent py-1 text-center font-medium" value={p.name}
                      onChange={e=>updatePlayerName(p.id, e.target.value)} />
                  </div>

                  <div className="mt-4 text-sm text-slate-500 text-center">Pick avatar</div>

                  <div className="mt-3 grid grid-cols-4 gap-2 justify-center">
                    {EMOJIS.map(e => (
                      <button key={e}
                        className={`text-2xl rounded-md transition ${p.emoji === e ? 'ring-2 ring-purple-600' : 'hover:bg-white'}`}
                        onClick={()=>updatePlayerEmoji(p.id, e)}
                        aria-label={`Select ${e}`}
                      >{e}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-between">
              <button className="px-4 py-2 border rounded-lg" onClick={()=>setStage('setup')}>Back</button>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg shadow" onClick={startPlaying}>Start Playing →</button>
            </div>
          </section>
        )}

        {/* Play */}
        {stage === 'play' && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Turn-based scoring</h2>
              <div className="flex gap-2">
                <button className="px-3 py-1 border rounded" onClick={undoLast} disabled={turns.length===0}>Undo</button>
                <button className="px-3 py-1 border rounded" onClick={resetAll}>Reset</button>
              </div>
            </div>

            {/* Current Turn Card */}
            <div className="bg-white border rounded-xl p-6 mb-6">
              <div className="flex flex-col items-center">
                <div className="text-sm text-slate-500">Current player</div>
                <div className="text-6xl my-2">{players[currentPlayerIndex]?.emoji}</div>
                <div className="text-xl font-semibold">{players[currentPlayerIndex]?.name}</div>

                <div className="mt-4 flex flex-col items-center gap-3">
                  <input
                    inputMode="numeric"
                    className="w-35 text-center p-3 border rounded-lg text-2xl"
                    placeholder="Points"
                    value={currentPoints}
                    onChange={e=>setCurrentPoints(e.target.value)}
                  />

                  <div className="flex gap-3">
                    <button className="px-4 py-2 bg-purple-600 text-white rounded-lg" onClick={addTurn}>Add Turn</button>
                    <button className="px-4 py-2 border rounded-lg" onClick={()=>{ setCurrentPoints(''); }}>Clear</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Totals */}
            <h3 className="font-semibold mb-3">Totals</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {players.map(p => (
                <div key={p.id} className="p-4 bg-purple-50 rounded-xl text-center shadow-sm">
                  <div className="text-3xl mb-1">{p.emoji}</div>
                  <div className="font-medium">{p.name}</div>
                  <div className="mt-1 text-2xl font-bold">{totals[p.id] ?? 0}</div>
                </div>
              ))}
            </div>

            {/* Turn History */}
            <h3 className="font-semibold mb-2">Turn history</h3>
            <div className="space-y-3">
              {turns.length === 0 && (
                <div className="text-sm text-slate-500">No turns yet — add points to begin.</div>
              )}

              {turns.map((t) => {
                const p = players.find(x => x.id === t.playerId)
                return (
                  <div key={t.id} className="p-3 border rounded-lg bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{p?.emoji}</div>
                      <div>
                        <div className="font-medium">{p?.name}</div>
                        <div className="text-sm text-slate-500">{new Date(t.timestamp).toLocaleTimeString()}</div>
                      </div>
                    </div>
                    <div className="text-xl font-semibold">+{t.points}</div>
                  </div>
                )
              })}
            </div>

          </section>
        )}

        <footer className="mt-6 text-center text-xs text-slate-400">Made with ♥︎ - Copy & adapt freely.</footer>

      </div>
    </div>
  )
}