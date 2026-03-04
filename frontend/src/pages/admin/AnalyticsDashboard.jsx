// ---------------------------------------------------------------------------
// Analytics Dashboard – admin page for traffic & usage statistics
// ---------------------------------------------------------------------------
//
// Fetches data from  GET /api/usage/summary  and renders KPI cards,
// line charts (daily traffic), bar charts (event breakdown), pie charts
// (browsers, OS), and tables (countries, pages, errors).
//
// No cookies, no fingerprinting – all data is aggregated server-side.
// ---------------------------------------------------------------------------

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import IconButton from '@mui/material/IconButton';

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

import { API_BASE_URL } from '../../config';

// ── Admin token storage ────────────────────────────────────────────────────

const ADMIN_TOKEN_STORAGE_KEY = 'pp-editor:analytics-admin-token:v1';

function readAdminToken() {
  try {
    const raw = window?.localStorage?.getItem(ADMIN_TOKEN_STORAGE_KEY);
    const v = String(raw ?? '').trim();
    return v || null;
  } catch {
    return null;
  }
}

function writeAdminToken(token) {
  const v = String(token ?? '').trim();
  try {
    if (!v) {
      window?.localStorage?.removeItem(ADMIN_TOKEN_STORAGE_KEY);
      return null;
    }
    window?.localStorage?.setItem(ADMIN_TOKEN_STORAGE_KEY, v);
    return v;
  } catch {
    return v || null;
  }
}

// Event types hidden from the dashboard (tracked server-side for internal use)
const HIDDEN_EVENT_TYPES = new Set(['api_request']);

// ── Colour palette ─────────────────────────────────────────────────────────

const COLORS = [
  '#60a5fa', // blue-400
  '#34d399', // emerald-400
  '#fbbf24', // amber-400
  '#f87171', // red-400
  '#a78bfa', // violet-400
  '#38bdf8', // sky-400
  '#fb923c', // orange-400
  '#4ade80', // green-400
  '#e879f9', // fuchsia-400
  '#2dd4bf', // teal-400
];

const EVENT_COLORS = {
  page_view: '#60a5fa',
  conformer_generation: '#34d399',
  conformer_completed: '#fbbf24',
  error: '#f87171',
  monomer_create: '#a78bfa',
  pdb_upload: '#38bdf8',
  secondary_structure: '#fb923c',
  session_created: '#4ade80',
  session_recovered: '#e879f9',
};

// ── Fetcher ────────────────────────────────────────────────────────────────

async function fetchSummary(scope = 'recent', options = {}, adminToken = null) {
  const params = new URLSearchParams();
  params.set('scope', scope);
  if (options.from) params.set('from', options.from);
  if (options.to) params.set('to', options.to);
  if (options.eventType) params.set('event_type', options.eventType);

  const headers = {};
  const t = String(adminToken ?? '').trim();
  if (t) headers['X-Admin-Token'] = t;

  const res = await fetch(`${API_BASE_URL}/api/usage/summary?${params}`, { headers });
  if (res.status === 401 || res.status === 403) {
    throw new Error('Unauthorized — invalid or missing admin token.');
  }
  if (!res.ok) throw new Error(`Analytics API error ${res.status}`);
  const json = await res.json();
  return json?.data ?? json;
}

// ── Formatting helpers ─────────────────────────────────────────────────────

function fmtNumber(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString();
}

function fmtPercent(n) {
  if (n == null) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

function fmtSeconds(n) {
  if (n == null) return '—';
  return `${Number(n).toFixed(1)} s`;
}

function shortDate(iso) {
  if (!iso) return '';
  // "2026-03-01" → "Mar 1"
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function eventLabel(type) {
  return (type || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── KPI Card ───────────────────────────────────────────────────────────────

const KpiCard = memo(function KpiCard({ title, value, subtitle, color }) {
  return (
    <Card
      variant="outlined"
      sx={{
        flex: '1 1 180px',
        minWidth: 150,
        bgcolor: 'background.paper',
      }}
    >
      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="caption" color="text.secondary" noWrap>
          {title}
        </Typography>
        <Typography
          variant="h5"
          fontWeight={700}
          sx={{ color: color || 'text.primary', mt: 0.5, lineHeight: 1.2 }}
        >
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
});

// ── Daily traffic chart ────────────────────────────────────────────────────

const DailyTrafficChart = memo(function DailyTrafficChart({ byDay }) {
  const data = useMemo(() => {
    if (!byDay || typeof byDay !== 'object') return [];
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({
        date: shortDate(date),
        rawDate: date,
        page_view: counts?.page_view ?? 0,
        conformer_generation: counts?.conformer_generation ?? 0,
        other: Object.entries(counts || {})
          .filter(([k]) => k !== 'page_view' && k !== 'conformer_generation' && !HIDDEN_EVENT_TYPES.has(k))
          .reduce((s, [, v]) => s + (v || 0), 0),
      }));
  }, [byDay]);

  if (!data.length) return <EmptyState text="No daily data available" />;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#94a3b8" />
        <RechartsTooltip
          contentStyle={{
            backgroundColor: '#1e293b',
            border: '1px solid rgba(148,163,184,0.25)',
            borderRadius: 6,
            fontSize: 12,
          }}
          labelStyle={{ color: '#e2e8f0' }}
          itemStyle={{ color: '#e2e8f0' }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} iconSize={10} />
        <Area
          type="monotone"
          dataKey="page_view"
          name="Page Views"
          stackId="1"
          stroke="#60a5fa"
          fill="#60a5fa"
          fillOpacity={0.3}
        />
        <Area
          type="monotone"
          dataKey="conformer_generation"
          name="Conformer Gen."
          stackId="1"
          stroke="#34d399"
          fill="#34d399"
          fillOpacity={0.3}
        />
        <Area
          type="monotone"
          dataKey="other"
          name="Other Events"
          stackId="1"
          stroke="#a78bfa"
          fill="#a78bfa"
          fillOpacity={0.2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
});

// ── Event breakdown bar chart ──────────────────────────────────────────────

const EventBreakdownChart = memo(function EventBreakdownChart({ eventCounts }) {
  const data = useMemo(() => {
    if (!eventCounts || typeof eventCounts !== 'object') return [];
    return Object.entries(eventCounts)
      .filter(([type]) => !HIDDEN_EVENT_TYPES.has(type))
      .map(([type, count]) => ({
        type: eventLabel(type),
        rawType: type,
        count: count || 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [eventCounts]);

  if (!data.length) return <EmptyState text="No events recorded" />;

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} stroke="#94a3b8" />
        <YAxis
          type="category"
          dataKey="type"
          width={140}
          tick={{ fontSize: 11 }}
          stroke="#94a3b8"
        />
        <RechartsTooltip
          contentStyle={{
            backgroundColor: '#1e293b',
            border: '1px solid rgba(148,163,184,0.25)',
            borderRadius: 6,
            fontSize: 12,
          }}
          labelStyle={{ color: '#e2e8f0' }}
          itemStyle={{ color: '#e2e8f0' }}
        />
        <Bar dataKey="count" name="Count" radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => (
            <Cell key={entry.rawType} fill={EVENT_COLORS[entry.rawType] || COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
});

// ── Pie chart (reused for browsers, OS, PDB sources) ──────────────────────

const PieSection = memo(function PieSection({ data, dataKey, nameKey, title }) {
  if (!data?.length) return <EmptyState text={`No ${title?.toLowerCase() || 'data'} available`} />;

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey={dataKey || 'count'}
            nameKey={nameKey || 'name'}
            cx="50%"
            cy="50%"
            outerRadius={80}
            innerRadius={35}
            paddingAngle={2}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
            style={{ fontSize: 11 }}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <RechartsTooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid rgba(148,163,184,0.25)',
              borderRadius: 6,
              fontSize: 12,
            }}
            labelStyle={{ color: '#e2e8f0' }}
            itemStyle={{ color: '#e2e8f0' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
});

// ── Country table ──────────────────────────────────────────────────────────

const CountryTable = memo(function CountryTable({ topCountries }) {
  if (!topCountries?.length) return <EmptyState text="No geographic data" />;

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>#</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>Country</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600, fontSize: 12 }}>
              Visitors
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {topCountries.map((c, i) => (
            <TableRow key={c.country_code || i} hover>
              <TableCell sx={{ fontSize: 12, py: 0.5, color: 'text.secondary' }}>{i + 1}</TableCell>
              <TableCell sx={{ fontSize: 12, py: 0.5 }}>
                <span title={c.country_code}>{c.country || c.country_code}</span>
              </TableCell>
              <TableCell align="right" sx={{ fontSize: 12, py: 0.5, fontVariantNumeric: 'tabular-nums' }}>
                {fmtNumber(c.visitors)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
});

// ── Paths table ────────────────────────────────────────────────────────────

const PathsTable = memo(function PathsTable({ topPaths }) {
  if (!topPaths?.length) return <EmptyState text="No page data" />;

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>#</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>Path</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600, fontSize: 12 }}>
              Views
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {topPaths.map((p, i) => (
            <TableRow key={p.path || i} hover>
              <TableCell sx={{ fontSize: 12, py: 0.5, color: 'text.secondary' }}>{i + 1}</TableCell>
              <TableCell
                sx={{
                  fontSize: 12,
                  py: 0.5,
                  fontFamily: 'monospace',
                  maxWidth: 220,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {p.path}
              </TableCell>
              <TableCell align="right" sx={{ fontSize: 12, py: 0.5, fontVariantNumeric: 'tabular-nums' }}>
                {fmtNumber(p.count)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
});

// ── Error breakdown table ──────────────────────────────────────────────────

const ErrorTable = memo(function ErrorTable({ errorBreakdown }) {
  if (!errorBreakdown?.length) return <EmptyState text="No errors recorded" />;

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>Status</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600, fontSize: 12 }}>Count</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>Endpoints</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {errorBreakdown.map((e, i) => (
            <TableRow key={i} hover>
              <TableCell sx={{ fontSize: 12, py: 0.5 }}>
                <Box
                  component="span"
                  sx={{
                    display: 'inline-block',
                    px: 0.8,
                    py: 0.1,
                    borderRadius: 1,
                    fontSize: 11,
                    fontWeight: 600,
                    bgcolor: e.status_code >= 500 ? 'error.dark' : 'warning.dark',
                    color: '#fff',
                  }}
                >
                  {e.status_code}
                </Box>
              </TableCell>
              <TableCell align="right" sx={{ fontSize: 12, py: 0.5, fontVariantNumeric: 'tabular-nums' }}>
                {fmtNumber(e.count)}
              </TableCell>
              <TableCell
                sx={{
                  fontSize: 11,
                  py: 0.5,
                  fontFamily: 'monospace',
                  maxWidth: 280,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {(e.endpoints || []).join(', ')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
});

// ── Empty state placeholder ────────────────────────────────────────────────

function EmptyState({ text }) {
  return (
    <Box sx={{ py: 4, textAlign: 'center' }}>
      <Typography variant="body2" color="text.secondary">
        {text || 'No data'}
      </Typography>
    </Box>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────

function Section({ title, children, sx }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        bgcolor: 'background.paper',
        ...sx,
      }}
    >
      {title && (
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
          {title}
        </Typography>
      )}
      {children}
    </Paper>
  );
}

// ── Constraint usage pie chart ─────────────────────────────────────────────

const CONSTRAINT_COLORS = {
  ss_constraints: '#60a5fa',  // blue
  template: '#fbbf24',        // amber
  none: '#94a3b8',            // slate
};

const CONSTRAINT_LABELS = {
  ss_constraints: 'SS Constraints',
  template: 'Template / Scaffold',
  none: 'Unconstrained',
};

// ── Conformer stats section ────────────────────────────────────────────────

const ConformerStatsSection = memo(function ConformerStatsSection({ stats, scopeLabel }) {
  if (!stats) return null;

  const duration = stats.duration_s;

  // Constraint usage data for pie chart
  const constraintData = useMemo(() => {
    const ct = stats.constraint_types;
    if (!ct || typeof ct !== 'object') return [];
    return Object.entries(ct)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ name: CONSTRAINT_LABELS[k] || eventLabel(k), count: v, rawKey: k }));
  }, [stats.constraint_types]);

  return (
    <Section title={`Conformer Performance${scopeLabel ? ` (${scopeLabel})` : ''}`}>
      {/* KPI cards row */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2.5 }}>
        <KpiCard title="Conformers Completed" value={fmtNumber(stats.total)} />
        <KpiCard title="Succeeded" value={fmtNumber(stats.success_count)} color="#34d399" />
        <KpiCard
          title="Success Rate"
          value={fmtPercent(stats.success_rate)}
          color={stats.success_rate >= 0.9 ? '#34d399' : '#fbbf24'}
        />
        {stats.avg_peptide_length != null && (
          <KpiCard
            title="Avg Peptide Length"
            value={Number(stats.avg_peptide_length).toFixed(1)}
            subtitle="monomers"
          />
        )}
      </Box>

      {/* Duration + Constraint usage row */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
        {/* Computation time: min / avg / max */}
        {duration && (
          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Computation Time</Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <KpiCard title="Min" value={fmtSeconds(duration.min)} color="#34d399" />
              <KpiCard title="Avg" value={fmtSeconds(duration.avg)} color="#60a5fa" />
              <KpiCard title="Max" value={fmtSeconds(duration.max)} color="#f87171" />
            </Box>
          </Paper>
        )}

        {/* Constraint usage pie */}
        {constraintData.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Constraint Usage</Typography>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={constraintData}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={72}
                  innerRadius={32}
                  paddingAngle={2}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                  style={{ fontSize: 11 }}
                >
                  {constraintData.map((entry) => (
                    <Cell key={entry.rawKey} fill={CONSTRAINT_COLORS[entry.rawKey] || COLORS[0]} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid rgba(148,163,184,0.25)',
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: '#e2e8f0' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        )}
      </Box>
    </Section>
  );
});

// ── Secondary Structure section ────────────────────────────────────────────

const SecondaryStructureSection = memo(function SecondaryStructureSection({ ss }) {
  if (!ss) return null;

  return (
    <Section title="Secondary Structure Usage">
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {ss.predict && (
          <KpiCard
            title="SS Predictions"
            value={fmtNumber(ss.predict.count)}
            subtitle={`Avg seq length: ${ss.predict.avg_seq_length?.toFixed(1) ?? '—'}`}
          />
        )}
        {ss.generate && (
          <KpiCard
            title="SS Generations"
            value={fmtNumber(ss.generate.count)}
            subtitle={`Avg seq length: ${ss.generate.avg_seq_length?.toFixed(1) ?? '—'}`}
          />
        )}
      </Box>
    </Section>
  );
});

// ════════════════════════════════════════════════════════════════════════════
// Main Dashboard Component
// ════════════════════════════════════════════════════════════════════════════

function AnalyticsDashboard() {
  // ── Admin token gate ───────────────────────────────────────────────────
  const [adminToken, setAdminToken] = useState(() => readAdminToken());
  const [tokenDraft, setTokenDraft] = useState('');
  const [authStatus, setAuthStatus] = useState('idle'); // idle | checking | ok | denied | error
  const [authMessage, setAuthMessage] = useState('');

  const isAuthed = authStatus === 'ok';

  const tryAuth = useCallback(async (token) => {
    const t = String(token ?? '').trim();
    if (!t) {
      setAuthStatus('idle');
      return;
    }
    setAuthStatus('checking');
    setAuthMessage('');
    try {
      await fetchSummary('recent', {}, t);
      setAuthStatus('ok');
    } catch (e) {
      const msg = e?.message || 'Authentication failed';
      if (msg.includes('Unauthorized') || msg.includes('401') || msg.includes('403')) {
        setAuthStatus('denied');
        setAuthMessage('Invalid admin token.');
      } else {
        setAuthStatus('error');
        setAuthMessage(msg);
      }
    }
  }, []);

  useEffect(() => {
    tryAuth(adminToken);
  }, [adminToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveToken = useCallback(async () => {
    const candidate = String(tokenDraft ?? '').trim();
    if (!candidate) return;
    setAuthStatus('checking');
    try {
      await fetchSummary('recent', {}, candidate);
      const next = writeAdminToken(candidate);
      setAdminToken(next);
      setTokenDraft('');
      setAuthStatus('ok');
    } catch (e) {
      setAuthStatus('denied');
      setAuthMessage(e?.message || 'Invalid admin token.');
    }
  }, [tokenDraft]);

  const clearToken = useCallback(() => {
    writeAdminToken('');
    setAdminToken(null);
    setTokenDraft('');
    setAuthStatus('idle');
    setAuthMessage('');
    setData(null);
  }, []);

  // ── Dashboard state ────────────────────────────────────────────────────
  const [scope, setScope] = useState('recent');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (s) => {
    if (!adminToken) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSummary(s || scope, {}, adminToken);
      setData(result);
    } catch (e) {
      if (e?.message?.includes('Unauthorized')) {
        setAuthStatus('denied');
        setAuthMessage('Session expired — please re-enter your admin token.');
        return;
      }
      setError(e?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [scope, adminToken]);

  useEffect(() => {
    if (isAuthed) load(scope);
  }, [scope, isAuthed]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScopeChange = useCallback((e) => {
    setScope(e.target.value);
  }, []);

  const handleRefresh = useCallback(() => {
    load(scope);
  }, [load, scope]);

  // Derive data from the current or all-time response
  const effectiveData = useMemo(() => {
    if (!data) return null;
    // all_time scope wraps the current month data inside `current_month_raw`
    if (scope === 'all_time' && data.current_month_raw) {
      return {
        ...data,
        // Merge in current_month_raw fields when they aren't set at top level
        by_day: data.by_day || data.current_month_raw.by_day,
        top_paths: data.top_paths || data.current_month_raw.top_paths,
        top_countries: data.top_countries || data.current_month_raw.top_countries,
        browsers: data.browsers || data.current_month_raw.browsers,
        operating_systems: data.operating_systems || data.current_month_raw.operating_systems,
        error_breakdown: data.error_breakdown || data.current_month_raw.error_breakdown,
        pdb_sources: data.pdb_sources || data.current_month_raw.pdb_sources,
        secondary_structure: data.secondary_structure || data.current_month_raw.secondary_structure,
      };
    }
    return data;
  }, [data, scope]);

  // Browser / OS data for pie charts
  const browserData = useMemo(() => {
    return (effectiveData?.browsers || []).map((b) => ({ name: b.browser, count: b.count }));
  }, [effectiveData]);

  const osData = useMemo(() => {
    return (effectiveData?.operating_systems || []).map((o) => ({ name: o.os, count: o.count }));
  }, [effectiveData]);

  const pdbData = useMemo(() => {
    const src = effectiveData?.pdb_sources;
    if (!src) return [];
    return Object.entries(src).map(([k, v]) => ({ name: eventLabel(k), count: v }));
  }, [effectiveData]);

  // ── Render ─────────────────────────────────────────────────────────────

  // ── Auth gate ──────────────────────────────────────────────────────────
  if (!isAuthed) {
    return (
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 3,
          bgcolor: 'grey.50',
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper variant="outlined" sx={{ p: 4, maxWidth: 520, width: '100%' }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
            Analytics Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Enter the admin token to access analytics data.
          </Typography>

          {authStatus === 'checking' && (
            <Alert severity="info" sx={{ mb: 2 }}>Verifying token…</Alert>
          )}
          {authStatus === 'denied' && (
            <Alert severity="error" sx={{ mb: 2 }}>{authMessage || 'Invalid admin token.'}</Alert>
          )}
          {authStatus === 'error' && (
            <Alert severity="error" sx={{ mb: 2 }}>{authMessage || 'Failed to verify token.'}</Alert>
          )}

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              label="Admin token"
              value={tokenDraft}
              onChange={(e) => setTokenDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveToken(); }}
              placeholder="Paste token"
              type="password"
              size="small"
              sx={{ flex: 1 }}
              autoFocus
            />
            <Button
              variant="contained"
              onClick={saveToken}
              disabled={!String(tokenDraft).trim() || authStatus === 'checking'}
            >
              Connect
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        flex: 1,
        overflow: 'auto',
        p: 3,
        bgcolor: 'grey.50',
        minHeight: 0,
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Typography variant="h5" fontWeight={700} sx={{ flexGrow: 1 }}>
          Analytics Dashboard
        </Typography>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="scope-label">Scope</InputLabel>
          <Select
            labelId="scope-label"
            value={scope}
            label="Scope"
            onChange={handleScopeChange}
          >
            <MenuItem value="recent">Last 90 days</MenuItem>
            <MenuItem value="all_time">All time</MenuItem>
          </Select>
        </FormControl>

        <Tooltip title="Refresh">
          <IconButton onClick={handleRefresh} disabled={loading} size="small">
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Disconnect">
          <Button variant="text" color="inherit" size="small" onClick={clearToken} sx={{ minWidth: 'auto', fontSize: 12 }}>
            Logout
          </Button>
        </Tooltip>
      </Box>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={32} />
        </Box>
      )}

      {/* Dashboard content */}
      {!loading && effectiveData && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* ── KPI row ─────────────────────────────────────────── */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <KpiCard
              title="Total Events"
              value={fmtNumber(effectiveData.total_events)}
            />
            <KpiCard
              title="Unique Sessions"
              value={fmtNumber(effectiveData.unique_sessions ?? effectiveData.unique_sessions_approx)}
              subtitle={scope === 'all_time' ? 'approximate' : undefined}
            />
            <KpiCard
              title="Unique IPs"
              value={fmtNumber(effectiveData.unique_ips ?? effectiveData.unique_ips_approx)}
              subtitle={scope === 'all_time' ? 'approximate' : undefined}
            />
            <KpiCard
              title="Page Views"
              value={fmtNumber(effectiveData.event_counts?.page_view)}
              color="#60a5fa"
            />
            <KpiCard
              title="Conformers Requested"
              value={fmtNumber(effectiveData.event_counts?.conformer_generation)}
              color="#34d399"
            />
          </Box>

          {/* ── Daily traffic ───────────────────────────────────── */}
          <Section title="Daily Traffic">
            <DailyTrafficChart byDay={effectiveData.by_day} />
          </Section>

          {/* ── Two-column row: pages + countries ────────────── */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
            <Section title="Popular Pages">
              <PathsTable topPaths={effectiveData.top_paths} />
            </Section>
            <Section title="Top Countries">
              <CountryTable topCountries={effectiveData.top_countries} />
            </Section>
          </Box>

          {/* ── Conformer stats ─────────────────────────────── */}
          {effectiveData.conformer_stats && (
            <ConformerStatsSection
              stats={effectiveData.conformer_stats}
              scopeLabel={scope === 'all_time' ? 'All-Time' : 'Last 90 Days'}
            />
          )}

          {/* ── Secondary Structure usage ───────────────────── */}
          {effectiveData.secondary_structure && (
            <SecondaryStructureSection ss={effectiveData.secondary_structure} />
          )}

          {/* ── Two-column row: event breakdown + errors ───── */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
            <Section title="Event Breakdown">
              <EventBreakdownChart eventCounts={effectiveData.event_counts} />
            </Section>
            <Section title="Errors">
              <ErrorTable errorBreakdown={effectiveData.error_breakdown} />
            </Section>
          </Box>

          {/* ── Three-column row: browsers, OS, PDB sources ─── */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2.5 }}>
            <Section>
              <PieSection data={browserData} title="Browsers" />
            </Section>
            <Section>
              <PieSection data={osData} title="Operating Systems" />
            </Section>
            <Section>
              <PieSection data={pdbData} title="PDB Input Methods" />
            </Section>
          </Box>

          {/* ── Footer meta ─────────────────────────────────── */}
          {scope === 'all_time' && effectiveData.rollup_count != null && (
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>
              Based on {effectiveData.rollup_count} monthly rollup(s) + current month raw data
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}

export default memo(AnalyticsDashboard);
