import { useEffect, useMemo, useState } from 'react'
import index from "../assets/images/index.png"
import avatar from "../assets/images/avatar.png"

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
    '🦁', '🐙', '🦄', '🚀', '🔥', '🌵', '🍕', '🎯', '🎲', '👑', '🧠', '⚡', '🌈', '🐼', '🐧', '🤖'
]
const STORAGE_KEY = 'scrubble_score_tracker_v2'
const uid = (p = '') => p + Math.random().toString(36).slice(2, 9)

export default function App() {
    const [stage, setStage] = useState<'setup' | 'naming' | 'play'>('setup')
    const [playerCount, setPlayerCount] = useState(2)
    const [players, setPlayers] = useState<Player[]>([])
    const [turns, setTurns] = useState<Turn[]>([])
    const [currentPoints, setCurrentPoints] = useState('')
    const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0)

    // load
    useEffect(() => {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return
        try {
            const data = JSON.parse(raw)
            setPlayers(data.players || [])
            setTurns(data.turns || [])
            setStage(data.stage || 'setup')
            setPlayerCount(data.playerCount || 2)
            setCurrentPlayerIndex(data.currentPlayerIndex || 0)
        } catch (e) { console.warn('load failed', e) }
    }, [])

    // persist
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ players, turns, stage, playerCount, currentPlayerIndex }))
    }, [players, turns, stage, playerCount, currentPlayerIndex])

    // totals
    const totals = useMemo(() => {
        const map: Record<string, number> = {}
        players.forEach(p => map[p.id] = 0)
        turns.forEach(t => {
            map[t.playerId] = (map[t.playerId] || 0) + t.points
        })
        return map
    }, [players, turns])

    useEffect(() => {
        setPlayers(prev => prev.map(p => ({ ...p, total: totals[p.id] || 0 })))
    }, [totals])

    // setup
    const beginNaming = () => {
        const list = Array.from({ length: playerCount }).map((_, i) => ({
            id: uid('p_'),
            name: `Player ${i + 1}`,
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

    const updatePlayerName = (id: string, val: string) => {
        setPlayers(p => p.map(x => x.id === id ? { ...x, name: val } : x))
    }
    const updatePlayerEmoji = (id: string, emoji: string) => {
        setPlayers(p => p.map(x => x.id === id ? { ...x, emoji } : x))
    }

    // play
    const addTurn = () => {
        const n = Number(currentPoints)
        if (!Number.isFinite(n)) return
        if (players.length === 0) return

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
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 p-1 px-0.5 sm:p-3 flex items-center justify-center">
            <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl p-1 sm:p-3">

                {stage === 'setup' ?
                    <header className="mb-3 sm:mb-5 text-center flex flex-col items-center">
                        {stage === 'setup' && <img src={index} alt='image' className='sm:w-[180px] w-[180px]' />}
                        <h1 className="text-4xl font-extrabold text-gray-700">Scrabbler - Score Tracker</h1>
                        <p className="text-sm text-slate-500 mt-1">Keep track of points when playing the Scrabble board game</p>
                    </header>
                    :
                    stage === 'naming' ?
                        <header className="mb-3 sm:mb-5 text-center flex flex-col items-center">
                            <div className="w-6 h-6 rounded-full bg-[#F6A9F6] flex items-center justify-center -mb-2 mt-2">
                                <img src={avatar} alt='avatar' className='sm:w-[70px] w-[70px]' />
                            </div>
                        </header>
                        : null}

                {/* Setup */}
                {stage === 'setup' && (
                    <section className="text-center">
                        <p className="mb-2 font-medium text-lg">How many players?</p>
                        <div className="flex flex-col items-center gap-2 sm:gap-3">
                            <input type="range" min={2} max={8} value={playerCount} onChange={e => setPlayerCount(Number(e.target.value))} className="w-15 sm:w-20" />
                            <div className="text-xl font-semibold">{playerCount} players</div>
                            <div className="flex gap-1 w-[100%]">
                                <button className="flex-[0.6] sm:py-1.5 py-1 rounded-lg border border-gray-300 active:bg-gray-100" onClick={() => { setPlayerCount(2); setStage('setup') }}>Reset</button>
                                <button className="flex-1 sm:py-1.5 py-1 bg-purple-600 active:bg-purple-300 text-white rounded-lg shadow" onClick={beginNaming}>Next</button>
                            </div>
                        </div>
                    </section>
                )}

                {/* Naming */}
                {stage === 'naming' && (
                    <section>
                        <p className="mb-2 sm:mb-3 sm:text-xl text-l font-semibold text-center">Name players & choose avatars</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {players.map((p) => (
                                <div key={p.id} className="border border-gray-300 rounded-xl p-2 bg-slate-50 shadow-xs">
                                    <div className="flex flex-col items-center">
                                        <div className="w-4 h-4 rounded-full bg-purple-200 flex items-center justify-center text-3xl mb-1 sm:mb-2">
                                            {p.emoji}
                                        </div>
                                        <input className="w-full max-w-xs border-b bg-transparent py-1 text-center font-medium" value={p.name}
                                            onChange={e => updatePlayerName(p.id, e.target.value)} />
                                    </div>

                                    <div className="mt-2 sm:mt-4 text-sm text-slate-500 text-center">Pick avatar</div>

                                    <div className="mt-2 grid grid-cols-4 gap-2 justify-center">
                                        {EMOJIS.map(e => (
                                            <button key={e}
                                                className={`text-xl rounded-md transition ${p.emoji === e ? 'ring-2 ring-purple-600' : 'hover:bg-white'}`}
                                                onClick={() => updatePlayerEmoji(p.id, e)}
                                                aria-label={`Select ${e}`}
                                            >{e}</button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 flex justify-between">
                            <button className="sm:py-1.5 flex-[0.6] py-1 mr-1 border border-gray-300 rounded-lg active:bg-gray-100" onClick={() => setStage('setup')}>Back</button>
                            <button className="sm:py-1.5 flex-1 py-1 bg-purple-600 active:bg-purple-300 text-white rounded-lg shadow" onClick={startPlaying}>Start Playing </button>
                        </div>
                    </section>
                )}

                {/* Play */}
                {stage === 'play' && (
                    <section>

                        {/* Totals */}
                        <h3 className="font-semibold mb-1">Totals</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-1 sm:gap-2 mb-1 sm:mb-3">
                            {players.map(p => (
                                <div key={p.id} className="px-2 p-1 bg-purple-50 border border-purple-100 rounded-xl text-center shadow-sm">
                                    <div className="sm:text-2xl text-xl mb-0.5">{p.emoji}</div>
                                    <div className="font-medium text-sm">{p.name}</div>
                                    <div className="text-2xl font-bold">{totals[p.id] ?? 0}</div>
                                </div>
                            ))}
                        </div>

                        {/* Current Turn Card */}
                        <div className="bg-white border border-2 border-green-200 rounded-xl py-2 px-1 sm:p-2 mb-2 shadow-xs">
                            <div className="flex flex-col items-center">
                                <div className="text-sm text-slate-500">Current player</div>
                                <div className="text-4xl sm:text-6xl mt-1 mb-0.5">{players[currentPlayerIndex]?.emoji}</div>
                                <div className="text-l font-semibold">{players[currentPlayerIndex]?.name}</div>

                                <div className="mt-2 flex flex-col items-center gap-2 w-[100%]">
                                    <input
                                        inputMode="numeric"
                                        className="w-[100%] text-center p-1 sm:p-2 border border-gray-300 rounded-lg text-2xl"
                                        placeholder="Points"
                                        value={currentPoints}
                                        onChange={e => setCurrentPoints(e.target.value)}
                                    />

                                    <div className="w-[100%] flex gap-1">
                                        <button className="sm:px-3 sm:py-1.5 flex-[0.6] py-1 border border-gray-200 active:bg-gray-100 rounded-lg" onClick={() => { setCurrentPoints(''); }}>Clear</button>
                                        <button className="sm:px-4 sm:py-1.5 flex-1 py-1 bg-purple-600 active:bg-purple-300 text-white rounded-lg" onClick={addTurn}>+ Add Turn</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mb-3">
                            <div className="flex gap-2">
                                <button
                                    className="px-2 py-1 text-sm border border-gray-400 shadow-xs rounded active:bg-gray-100 flex items-center gap-0.5 disabled:opacity-40"
                                    onClick={undoLast}
                                    disabled={turns.length === 0}
                                >
                                    <span>↩️</span>
                                    Undo
                                </button>

                                <button
                                    className="px-2 py-1 text-sm border border-gray-400 shadow-xs rounded active:bg-gray-100 flex items-center gap-0.5"
                                    onClick={resetAll}
                                >
                                    <span>🔄</span>
                                    Reset
                                </button>
                            </div>
                        </div>


                        {/* Turn History */}
                        <h3 className="font-semibold mb-1">Turn history</h3>
                        <div className="space-y-1">
                            {turns.length === 0 && (
                                <div className="text-sm text-slate-500">No turns yet — add points to begin.</div>
                            )}

                            {turns.map((t) => {
                                const p = players.find(x => x.id === t.playerId)
                                return (
                                    <div key={t.id} className="p-1 border rounded-lg bg-slate-50 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="text-xl">{p?.emoji}</div>
                                            <div>
                                                <div className="font-medium text-sm sm:text-md">{p?.name}</div>
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

                <footer className="mt-2 sm:mt-6 text-center text-xs text-slate-400">Made with ♥︎ - Scrubble & adapt freely.</footer>

            </div>
        </div>
    )
}