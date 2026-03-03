import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface ExerciseHistoryData {
    date: string;
    volume: number;
    estimated1RM: number;
    sets: { weight: number; reps: number; rir: number | null }[];
    avgRir?: number | null;
    displayDate?: string;
}

interface ExerciseChartProps {
    data: ExerciseHistoryData[];
}

export default function ExerciseChart({ data }: ExerciseChartProps) {
    const [metric, setMetric] = useState<'volume' | 'estimated1RM' | 'rir'>('estimated1RM');

    // Color palette for multiple sets
    const setColors = ['var(--accent-primary)', '#FF6B6B', '#4ECDC4', '#FFE66D', '#FF9F43', '#A29BFE', '#55E6C1', '#FD7272'];

    // Sort data chronologically and limit to last 20
    const { chartData, maxSets } = useMemo(() => {
        let maxS = 0;
        const processed = [...data]
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(-20) // Show last 20 results
            .map(d => {
                const dateObj = new Date(d.date);
                if (d.sets.length > maxS) maxS = d.sets.length;

                // Calculate average RIR for the session (excluding nulls)
                const validRirs = d.sets.map(s => s.rir).filter((rir): rir is number => rir !== null);
                const avgRir = validRirs.length > 0
                    ? Math.round((validRirs.reduce((a, b) => a + b, 0) / validRirs.length) * 10) / 10
                    : null;

                // Create set-specific RIR keys for the chart lines
                const setRirs: Record<string, number | null> = {};
                d.sets.forEach((s, i) => {
                    setRirs[`set_${i}_rir`] = s.rir;
                });

                return {
                    ...d,
                    avgRir,
                    ...setRirs,
                    // Short date format for X axis (e.g. "12 Feb")
                    displayDate: dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                };
            });
        return { chartData: processed, maxSets: maxS };
    }, [data]);

    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center p-md" style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)', height: '200px' }}>
                No hay suficientes datos históricos.
            </div>
        );
    }

    // Custom tooltip to show detailed metrics
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const point = payload[0].payload as ExerciseHistoryData;
            return (
                <div style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    padding: 'var(--space-sm)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    fontSize: 'var(--font-xs)',
                    color: 'var(--text-primary)'
                }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px', color: 'var(--text-muted)' }}>{point.date}</div>
                    {metric === 'volume' ? (
                        <div>Volumen: <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>{point.volume} kg</span></div>
                    ) : metric === 'estimated1RM' ? (
                        <div>1RM Est.: <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>{point.estimated1RM} kg</span></div>
                    ) : (
                        <div>RIR Medio: <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>{point.avgRir !== undefined && point.avgRir !== null ? point.avgRir : '—'}</span></div>
                    )}
                    <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        {point.sets.map((s, i) => (
                            <div key={i} style={{ color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                                <span>Set {i + 1}: {s.weight}kg × {s.reps}</span>
                                {s.rir !== null && <span style={{ color: 'var(--text-muted)' }}>RIR {s.rir}</span>}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div style={{ width: '100%' }}>
            {/* Metric toggles */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 'var(--space-xs)',
                justifyContent: 'center',
                marginBottom: 'var(--space-sm)'
            }}>
                <button
                    className="btn"
                    style={{
                        background: metric === 'estimated1RM' ? 'var(--accent-primary)' : 'transparent',
                        color: metric === 'estimated1RM' ? 'white' : 'var(--text-muted)',
                        border: `1px solid ${metric === 'estimated1RM' ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                        borderRadius: 'var(--radius-full)',
                        padding: '6px 12px',
                        fontSize: 'var(--font-xs)',
                        whiteSpace: 'nowrap'
                    }}
                    onClick={() => setMetric('estimated1RM')}
                >
                    1RM
                </button>
                <button
                    className="btn"
                    style={{
                        background: metric === 'volume' ? 'var(--accent-primary)' : 'transparent',
                        color: metric === 'volume' ? 'white' : 'var(--text-muted)',
                        border: `1px solid ${metric === 'volume' ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                        borderRadius: 'var(--radius-full)',
                        padding: '6px 12px',
                        fontSize: 'var(--font-xs)',
                        whiteSpace: 'nowrap'
                    }}
                    onClick={() => setMetric('volume')}
                >
                    Volumen
                </button>
                <button
                    className="btn"
                    style={{
                        background: metric === 'rir' ? 'var(--accent-primary)' : 'transparent',
                        color: metric === 'rir' ? 'white' : 'var(--text-muted)',
                        border: `1px solid ${metric === 'rir' ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                        borderRadius: 'var(--radius-full)',
                        padding: '6px 12px',
                        fontSize: 'var(--font-xs)',
                        whiteSpace: 'nowrap'
                    }}
                    onClick={() => setMetric('rir')}
                >
                    RIR
                </button>
            </div>

            {/* Chart Area */}
            <div style={{ height: 220, width: '100%', marginTop: 'var(--space-md)' }}>
                <ResponsiveContainer width="100%" height="100%">
                    {metric === 'volume' ? (
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <XAxis
                                dataKey="displayDate"
                                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                            />
                            <YAxis
                                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                                tickLine={false}
                                axisLine={false}
                                domain={['auto', 'auto']}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                            <Bar
                                dataKey="volume"
                                fill="var(--accent-primary)"
                                radius={[4, 4, 0, 0]}
                                activeBar={{ fill: 'var(--text-primary)' }}
                            />
                        </BarChart>
                    ) : metric === 'estimated1RM' ? (
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="displayDate"
                                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                            />
                            <YAxis
                                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                                tickLine={false}
                                axisLine={false}
                                domain={['auto', 'auto']}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="estimated1RM"
                                stroke="var(--accent-primary)"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorMetric)"
                                activeDot={{ r: 6, fill: 'var(--accent-primary)', stroke: 'white', strokeWidth: 2 }}
                            />
                        </AreaChart>
                    ) : (
                        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <XAxis
                                dataKey="displayDate"
                                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                            />
                            <YAxis
                                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                                tickLine={false}
                                axisLine={false}
                                domain={[0, 5]}
                                reversed={true}
                                label={{ value: 'RIR', angle: -90, position: 'insideLeft', offset: 10, fill: 'var(--text-muted)', fontSize: 10 }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            {Array.from({ length: maxSets }).map((_, i) => (
                                <Line
                                    key={i}
                                    type="monotone"
                                    dataKey={`set_${i}_rir`}
                                    name={`Set ${i + 1}`}
                                    stroke={setColors[i % setColors.length]}
                                    strokeWidth={2}
                                    dot={{ r: 3, fill: setColors[i % setColors.length], strokeWidth: 1, stroke: 'white' }}
                                    activeDot={{ r: 5, fill: setColors[i % setColors.length], stroke: 'white', strokeWidth: 2 }}
                                    connectNulls={false} // Only show points where set exists
                                />
                            ))}
                        </LineChart>
                    )}
                </ResponsiveContainer>
            </div>

            <div className="text-center mt-xs" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                {metric === 'estimated1RM' ? 'Fórmula Epley: Peso × (1 + Reps/30)' :
                    metric === 'volume' ? 'Suma de (Peso × Reps) en la sesión' :
                        'Repeticiones en Reserva: menor RIR = mayor intensidad'}
            </div>
        </div>
    );
}
