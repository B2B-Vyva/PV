import { useState } from 'react'
import type { CSSProperties, Dispatch, FormEvent, ReactNode, SetStateAction } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Database,
  Download,
  FileJson,
  FileText,
  Filter,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  MessageCircle,
  Mic2,
  PanelRightOpen,
  PackageCheck,
  PhoneCall,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Smartphone,
  UserRound,
  Users,
  Workflow,
} from 'lucide-react'
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import {
  demoAudit,
  demoEvidence,
  demoFollowups,
  demoInteractions,
  demoLeads,
  demoPatients,
  demoProjects,
  demoSignals,
} from './lib/demoData'
import PitchDemoScreen from './PitchDemo'
import VigilDemoScreen from './VigilDemo'
import VigilPitchScreen from './VigilPitch'
import type {
  AuditEntry,
  Evidence,
  Followup,
  Interaction,
  LeadStatus,
  Patient,
  Project,
  SafetyLead,
  Signal,
} from './lib/types'

const apiUrl = import.meta.env.VITE_API_URL || ''

type Session = {
  token: string | null
  demo: boolean
  user: {
    full_name: string
    role: string
    organization: { name: string }
  }
}

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/leads', label: 'Safety Leads', icon: ClipboardCheck },
  { path: '/signals', label: 'Signal Intelligence', icon: BarChart3 },
  { path: '/inbox', label: 'Conversation Intake', icon: MessageSquare },
  { path: '/followups', label: 'Follow-ups', icon: Send },
  { path: '/reports', label: 'Reports & Exports', icon: Download },
  { path: '/projects', label: 'Projects', icon: Workflow },
  { path: '/patients', label: 'Patients', icon: Users },
  { path: '/compliance', label: 'Compliance Center', icon: ShieldCheck },
]

const complianceCenterItems: Array<{ title: string; detail: string; Icon: typeof ShieldCheck }> = [
  {
    title: 'Audit Trail',
    detail: 'Every AI extraction, human edit, reviewer decision, export, and status change.',
    Icon: Clock3,
  },
  {
    title: 'Access & Roles',
    detail: 'User permissions, reviewer roles, admin controls, partner/CRO access.',
    Icon: Users,
  },
  {
    title: 'Consent Records',
    detail: 'Patient consent, caregiver permissions, channel permissions, withdrawal history.',
    Icon: ClipboardCheck,
  },
  {
    title: 'Validation Evidence',
    detail: 'Sandbox test results, reviewer scoring, false positives, false negatives, extraction accuracy.',
    Icon: Activity,
  },
  {
    title: 'SOP Mapping',
    detail: 'Sponsor-approved scripts, escalation rules, follow-up workflows, review steps.',
    Icon: Workflow,
  },
  {
    title: 'Model & Prompt Logs',
    detail: 'Model version, prompt version, extraction version, change history.',
    Icon: Sparkles,
  },
  {
    title: 'Export History',
    detail: 'PDF, CSV, API, E2B-ready packet logs, who exported, when, and why.',
    Icon: Download,
  },
  {
    title: 'Data Lineage',
    detail: 'Source channel, extraction version, reviewer decision, export traceability.',
    Icon: FileJson,
  },
  {
    title: 'Data Retention',
    detail: 'Retention policies, deletion rules, country/project-specific settings.',
    Icon: Database,
  },
  {
    title: 'Change Control',
    detail: 'Workflow changes, script updates, approval status, implementation date.',
    Icon: PackageCheck,
  },
]

const statusOrder: LeadStatus[] = [
  'urgent_review',
  'new',
  'ai_structured',
  'needs_followup',
  'in_medical_review',
  'ready_handoff',
  'exported',
  'closed_non_pv',
  'closed_duplicate',
  'closed_insufficient',
  'caregiver_requested',
]

const labelOverrides: Record<string, string> = {
  ai_structured: 'AI structured',
  adverse_event_and_missed_dose: 'Adverse event + missed dose',
  app: 'App',
  caregiver_requested: 'Caregiver requested',
  caregiver_app: 'Caregiver app',
  closed_duplicate: 'Closed duplicate',
  closed_insufficient: 'Closed insufficient',
  closed_non_pv: 'Closed non-PV',
  confusion_needs_review: 'Confusion needs review',
  exact_onset_date: 'Exact onset date',
  in_medical_review: 'In medical review',
  medical_attention: 'Medical attention / hospitalization',
  needs_followup: 'Needs follow-up',
  near_fall: 'Near fall',
  phone: 'Phone call',
  pv_reviewer: 'PV reviewer',
  ready_handoff: 'Ready for handoff',
  urgent_review: 'Urgent review',
  whatsapp: 'WhatsApp',
}

function pretty(value: string) {
  return labelOverrides[value] || value.replaceAll('_', ' ')
}

function statusTone(value: string) {
  if (value === 'urgent_review') return 'danger'
  if (['critical', 'urgent', 'needs_followup', 'pending', 'sent', 'overdue', 'caregiver_requested'].includes(value)) return 'warning'
  if (['ready_handoff', 'ai_structured', 'review', 'monitor'].includes(value)) return 'ready'
  if (
    [
      'active',
      'closed',
      'closed_duplicate',
      'closed_insufficient',
      'closed_non_pv',
      'completed',
      'confirmed',
      'consented',
      'exported',
      'responded',
    ].includes(value)
  ) {
    return 'success'
  }
  return 'neutral'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function Badge({ value }: { value: string }) {
  return <span className={`badge ${statusTone(value)}`}>{pretty(value)}</span>
}

function Metric({
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  label: string
  value: string | number
  detail: string
  tone?: 'neutral' | 'danger' | 'warning' | 'success' | 'ready'
}) {
  return (
    <section className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </section>
  )
}

function LoginScreen({ onLogin }: { onLogin: (session: Session) => void }) {
  const [email, setEmail] = useState('reviewer@vigil.demo')
  const [password, setPassword] = useState('Demo1234!')
  const [error, setError] = useState('')

  async function submitLogin(event: FormEvent) {
    event.preventDefault()
    setError('')
    try {
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!response.ok) throw new Error('Sign-in failed')
      const data = await response.json()
      onLogin({ token: data.token, demo: false, user: data.user })
    } catch {
      setError('Database-backed sign-in is unavailable. Use demo workspace or configure DATABASE_URL.')
    }
  }

  return (
    <main className="login-shell">
      <form className="login-panel" onSubmit={submitLogin}>
        <div className="login-wordmark">
          <strong>VIGIL</strong>
          <span>powered by VYVA</span>
        </div>
        <h1>Patient voice intelligence</h1>
        <p>Pharmacovigilance operations for patient-generated safety intelligence.</p>
        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          Password
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
          />
        </label>
        {error ? <div className="form-error">{error}</div> : null}
        <button type="submit" className="primary-action">
          Sign in
        </button>
        <button
          type="button"
          className="ghost-action"
          onClick={() =>
            onLogin({
              token: null,
              demo: true,
              user: {
                full_name: 'Dr. R. Moreno',
                role: 'pv_reviewer',
                organization: { name: 'Pharma Demo Co.' },
              },
            })
          }
        >
          Open demo workspace
        </button>
      </form>
    </main>
  )
}

function Shell({
  session,
  onLogout,
  children,
}: {
  session: Session
  onLogout: () => void
  children: ReactNode
}) {
  const location = useLocation()
  const isPitchDemoRoute = location.pathname.startsWith('/pitch-demo')
  const isPitchRoute = location.pathname.startsWith('/pitch/') || isPitchDemoRoute || location.search.includes('mode=pitch')
  const isCaptureRoute = location.pathname.startsWith('/pitch/capture')
  const isDashboardRoute = location.pathname.startsWith('/dashboard')
  const isWorkbenchRoute = location.pathname.startsWith('/leads/') || location.pathname.startsWith('/pitch/workbench')
  const title = isPitchDemoRoute
    ? 'VIGIL Pitch Demo'
    : isCaptureRoute
    ? 'Conversation Intake'
    : isDashboardRoute
      ? 'Program Safety Intelligence'
    : isWorkbenchRoute
      ? 'Safety Lead Workbench'
      : navItems.find((item) => location.pathname.startsWith(item.path))?.label || 'Safety Leads'
  const subtitle = isPitchDemoRoute
    ? 'Manual 3-minute pharmacovigilance product demo'
    : isDashboardRoute
    ? 'Early patient-generated safety intelligence for sponsor-led review'
    : `Project: ${demoProjects[0].name}`
  const environmentLabel = session.demo ? 'Controlled test environment' : 'Database live'

  return (
    <div className={`app-shell ${isPitchRoute ? 'pitch-shell' : ''} ${isDashboardRoute ? 'dashboard-shell' : ''}`}>
      <aside className="sidebar">
        <div className="brand-panel">
          <strong>VIGIL</strong>
          <span>Patient voice intelligence</span>
          <small>powered by VYVA</small>
        </div>
        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon
            const isRouteMatch = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
            const isCurrent =
              (isDashboardRoute && item.path === '/signals') ||
              (!isDashboardRoute && isRouteMatch) ||
              (item.path === '/leads' && location.pathname.startsWith('/pitch/workbench')) ||
              (item.path === '/inbox' && isCaptureRoute)
            return (
              <NavLink key={item.path} to={item.path} className={() => `nav-link ${isCurrent ? 'active' : ''}`}>
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>
        <div className="sidebar-footer">
          <span>Validation mode</span>
          <strong>{environmentLabel}</strong>
        </div>
      </aside>

      <section className="workspace">
        <header className={`topbar ${isWorkbenchRoute || isPitchRoute ? 'topbar-compact' : ''} ${isPitchRoute ? 'topbar-pitch' : ''}`}>
          <div className="topbar-heading">
            <h1>{title}</h1>
            <span className="topbar-context">{subtitle}</span>
          </div>
          <div className="topbar-tools">
            <div className="search-box">
              <Search size={16} />
              <input placeholder="Search leads, patients, products, MedDRA" />
            </div>
            <button className="icon-button" type="button" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <div className="user-chip">
              <UserRound size={18} />
              <div>
                <strong>{session.user.full_name}</strong>
                <span>{pretty(session.user.role)}</span>
              </div>
            </div>
            <button className="icon-button" type="button" aria-label="Sign out" onClick={onLogout}>
              <LogOut size={18} />
            </button>
          </div>
        </header>
        {children}
      </section>
    </div>
  )
}

export function SafetyLeadWorkbenchLegacy({
  leads,
  setLeads,
  selectedLeadId,
  setSelectedLeadId,
  evidence,
  addFollowup,
}: {
  leads: SafetyLead[]
  setLeads: Dispatch<SetStateAction<SafetyLead[]>>
  selectedLeadId: string
  setSelectedLeadId: (id: string) => void
  evidence: Evidence[]
  addFollowup: (lead: SafetyLead) => void
}) {
  const [tab, setTab] = useState<'extraction' | 'evidence' | 'followup' | 'history'>('extraction')
  const lead = leads.find((item) => item.id === selectedLeadId) || leads[0]
  const leadEvidence = evidence.filter((item) => item.lead_id === lead.id)

  function updateLead(changes: Partial<SafetyLead>) {
    setLeads((current) =>
      current.map((item) => (item.id === lead.id ? { ...item, ...changes } : item)),
    )
  }

  return (
    <main className="workbench">
      <section className="lead-queue panel">
        <div className="panel-header">
          <div>
            <h2>Lead queue</h2>
            <span>{leads.length} active safety leads</span>
          </div>
          <button className="tool-button" type="button">
            <Filter size={16} />
            Filter
          </button>
        </div>
        <div className="queue-list">
          {[...leads]
            .sort(
              (a, b) =>
                statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status) ||
                a.sla_due_at.localeCompare(b.sla_due_at),
            )
            .map((item) => (
              <button
                key={item.id}
                type="button"
                className={`queue-item ${item.id === lead.id ? 'selected' : ''}`}
                onClick={() => setSelectedLeadId(item.id)}
              >
                <span className="queue-topline">
                  <strong>{item.lead_number}</strong>
                  <Badge value={item.urgency} />
                </span>
                <span className="queue-title">{item.suggested_meddra_pt}</span>
                <span className="queue-meta">
                  {item.patient_ref} · {item.primary_channel} · SLA {formatDate(item.sla_due_at)}
                </span>
                <span className="mini-progress">
                  <span style={{ width: `${item.completeness_score}%` }} />
                </span>
              </button>
            ))}
        </div>
      </section>

      <section className="lead-detail panel">
        <div className="case-header">
          <div>
            <span className="case-number">{lead.lead_number}</span>
            <h2>{lead.event_description}</h2>
            <div className="case-meta">
              <Badge value={lead.status} />
              <Badge value={lead.urgency} />
              {lead.is_serious ? <Badge value="serious" /> : <Badge value="non serious" />}
            </div>
          </div>
          <div className="confidence-block">
            <Sparkles size={18} />
            <strong>{lead.ai_confidence}%</strong>
            <span>AI confidence</span>
          </div>
        </div>

        <div className="tabs">
          {[
            ['extraction', 'AI extraction'],
            ['evidence', 'Evidence'],
            ['followup', 'Follow-up questions'],
            ['history', 'Review history'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={tab === key ? 'active' : ''}
              onClick={() => setTab(key as typeof tab)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'extraction' ? (
          <div className="field-grid">
            <DataField label="Patient" value={`${lead.patient_ref} · ${lead.sex}/${lead.age_group} · ${lead.country}`} />
            <DataField label="Suspected product" value={lead.suspected_product} />
            <DataField label="Dose / route" value={lead.dose} />
            <DataField label="MedDRA suggestion" value={`${lead.suggested_meddra_pt} · ${lead.suggested_meddra_code}`} />
            <DataField label="Outcome" value={lead.outcome} />
            <DataField
              label="Seriousness criteria"
              value={lead.seriousness_criteria.length ? lead.seriousness_criteria.join(', ') : 'None'}
            />
            <article className="narrative-box">
              <span>Draft narrative</span>
              <p>{lead.ai_narrative}</p>
            </article>
          </div>
        ) : null}

        {tab === 'evidence' ? (
          <div className="timeline">
            {leadEvidence.map((item) => (
              <article key={item.id} className="timeline-item">
                <div className="timeline-dot" />
                <div>
                  <span>
                    {item.channel} · {item.reporter_type} · {formatDate(item.interaction_at)}
                  </span>
                  <p>{item.transcript_text}</p>
                  <strong>
                    {item.suggested_meddra_pt} · {item.ai_confidence}% confidence
                  </strong>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {tab === 'followup' ? (
          <div className="question-bank">
            {lead.missing_fields.map((field) => (
              <button key={field} type="button" onClick={() => addFollowup(lead)}>
                <MessageSquare size={16} />
                Ask patient/caregiver for {pretty(field)}
              </button>
            ))}
          </div>
        ) : null}

        {tab === 'history' ? (
          <div className="history-list">
            <article>
              <CheckCircle2 size={18} />
              <div>
                <strong>AI extraction generated</strong>
                <span>{formatDate(lead.received_at)} · model gpt-4o-mini · prompt pv-detectors-v1</span>
              </div>
            </article>
            <article>
              <Clock3 size={18} />
              <div>
                <strong>SLA clock started</strong>
                <span>Due {formatDate(lead.sla_due_at)}</span>
              </div>
            </article>
          </div>
        ) : null}
      </section>

      <aside className="review-panel panel">
        <div className="completion-ring" style={{ '--score': `${lead.completeness_score}%` } as CSSProperties}>
          <strong>{lead.completeness_score}%</strong>
          <span>ICSR completeness</span>
        </div>
        <div className="missing-list">
          <strong>Missing fields</strong>
          {lead.missing_fields.map((field) => (
            <span key={field}>{pretty(field)}</span>
          ))}
        </div>
        <div className="action-stack">
          <button
            type="button"
            className="primary-action"
            onClick={() => updateLead({ status: 'ai_structured', completeness_score: Math.max(lead.completeness_score, 75) })}
          >
            <CheckCircle2 size={17} />
            Approve extraction
          </button>
          <button type="button" className="warning-action" onClick={() => addFollowup(lead)}>
            <Send size={17} />
            Request follow-up
          </button>
          <button type="button" className="danger-action" onClick={() => updateLead({ status: 'urgent_review', urgency: 'critical' })}>
            <AlertTriangle size={17} />
            Escalate
          </button>
          <button type="button" className="ghost-action" onClick={() => updateLead({ status: 'ready_handoff' })}>
            <PackageCheck size={17} />
            Approve handoff
          </button>
        </div>
      </aside>
    </main>
  )
}

function SafetyLeadWorkbench({
  leads,
  setLeads,
  evidence,
  addFollowup,
  pitchMode = false,
}: {
  leads: SafetyLead[]
  setLeads: Dispatch<SetStateAction<SafetyLead[]>>
  evidence: Evidence[]
  addFollowup: (lead: SafetyLead) => void
  pitchMode?: boolean
}) {
  const { leadId } = useParams()
  const [searchParams] = useSearchParams()
  const isPitchMode = pitchMode || searchParams.get('mode') === 'pitch'
  const sortedLeads = [...leads].sort(
    (a, b) =>
      statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status) ||
      a.sla_due_at.localeCompare(b.sla_due_at),
  )
  const normalizedLeadId = leadId?.toLowerCase()
  const lead =
    (normalizedLeadId
      ? sortedLeads.find(
          (item) => item.id.toLowerCase() === normalizedLeadId || item.lead_number.toLowerCase() === normalizedLeadId,
        )
      : undefined) ||
    (isPitchMode ? leads.find((item) => item.lead_number === 'SL-01001') : undefined) ||
    sortedLeads[0] ||
    leads[0]

  if (!lead) {
    return (
      <main className="workbench-empty panel">
        <h2>No safety leads available</h2>
        <p>New patient voice captures will appear here after intake.</p>
      </main>
    )
  }

  const leadEvidence = evidence.filter((item) => item.lead_id === lead.id)
  const primaryEvidence = leadEvidence.find((item) => item.reporter_type === 'patient') || leadEvidence[0]
  const caregiverEvidence =
    leadEvidence.find((item) => item.reporter_type === 'caregiver') ||
    leadEvidence.find((item) => item.evidence_type.includes('caregiver'))
  const isPitchLead = lead.lead_number === 'SL-01001'
  const handoffReady = ['ready_handoff', 'exported'].includes(lead.status)
  const structuredFields = isPitchLead
    ? [
        { label: 'Potential event', value: 'Dizziness / near fall' },
        { label: 'Medication issue', value: 'Missed dose' },
        { label: 'Suspect product', value: 'CardioPress 10 mg' },
        { label: 'Reporter', value: 'Patient + caregiver' },
        { label: 'Timing', value: 'After medication start' },
        { label: 'Status', value: 'Human review required' },
        { label: 'Possible seriousness indicators', value: 'Near fall / confusion / needs review' },
      ]
    : [
        { label: 'Patient', value: `${lead.patient_ref} / ${lead.sex}, ${lead.age_group} / ${lead.country}` },
        { label: 'Suspected product', value: lead.suspected_product },
        { label: 'Dose / route', value: lead.dose },
        { label: 'MedDRA suggestion', value: `${lead.suggested_meddra_pt} / ${lead.suggested_meddra_code}` },
        { label: 'Outcome', value: lead.outcome },
        {
          label: 'Possible seriousness indicators',
          value: lead.seriousness_criteria.length ? lead.seriousness_criteria.map(pretty).join(', ') : 'Needs reviewer decision',
        },
      ]
  const voiceHighlights = isPitchLead ? ['new pill', 'dizzy', 'skipped it', 'afraid I would fall'] : [lead.suggested_meddra_pt]
  const caregiverHighlights = isPitchLead ? ['confused', 'almost fell'] : caregiverEvidence ? [pretty(caregiverEvidence.observation_type)] : []
  const followupItems = isPitchLead
    ? [
        { label: 'Exact onset date', requirement: 'Required' },
        { label: 'Outcome', requirement: 'Required' },
        { label: 'Medical attention / hospitalization', requirement: 'Required' },
        { label: 'Concomitant medications', requirement: 'Recommended' },
      ]
    : lead.missing_fields.map((field, index) => ({
        label: pretty(field),
        requirement: index < 3 ? 'Required' : 'Recommended',
      }))
  const reviewFields = [
    { label: 'Assessment status', value: 'Pending human review' },
    { label: 'Causality', value: 'Not assessed by AI' },
    { label: 'Seriousness', value: 'Requires reviewer decision' },
    { label: 'Data quality', value: 'Follow-up required' },
  ]
  const transformationSteps = [
    { label: 'Voice captured', detail: 'Phone call' },
    { label: 'Draft structured', detail: `${lead.completeness_score}% complete` },
    { label: 'Follow-up needed', detail: `${followupItems.length} items` },
    { label: 'Caregiver linked', detail: caregiverEvidence ? 'Linked' : 'Not captured' },
    { label: 'Human review + handoff', detail: handoffReady ? 'Ready' : 'Draft' },
  ]
  const handoffPackage = [
    { label: 'Lead summary', status: 'Preview' },
    { label: 'Evidence bundle', status: 'Preview' },
    { label: 'Structured data packet', status: 'Preview' },
    { label: 'Audit log', status: 'Preview' },
    { label: 'Model logs', status: 'Preview' },
  ]

  function updateLead(changes: Partial<SafetyLead>) {
    setLeads((current) =>
      current.map((item) => (item.id === lead.id ? { ...item, ...changes } : item)),
    )
  }

  if (isPitchMode) {
    const pitchWorkflow = [
      'Voice captured',
      'Draft structured',
      'Follow-up needed',
      'Caregiver linked',
      'Human review',
      'Handoff draft',
    ]
    const auditSteps = [
      'Phone call captured',
      'Draft structured',
      'Missing fields surfaced',
      'Caregiver context added',
      'Routed to PV reviewer',
    ]

    return (
      <main className="lead-workbench-screen pitch-workbench-screen">
        <section className="lead-workbench-main pitch-workbench-main">
          <section className="lead-workbench-hero pitch-hero panel">
            <div>
              <span className="case-number">{lead.lead_number}</span>
              <h2>{lead.event_description}</h2>
              <p>Free-form patient voice → structured PV intake → human-reviewed handoff</p>
            </div>
            <div className="hero-status-grid pitch-status-grid">
              <span>
                <strong>Status</strong>
                Human review
              </span>
              <span>
                <strong>Completeness</strong>
                {lead.completeness_score}%
              </span>
              <span>
                <strong>Priority</strong>
                Urgent
              </span>
              <span>
                <strong>Source</strong>
                Phone + caregiver
              </span>
            </div>
          </section>

          <section className="trust-strip pitch-trust-strip panel">
            <ShieldCheck size={15} />
            <span>Human-in-the-loop</span>
            <span>Sponsor-controlled</span>
            <span>No autonomous reporting</span>
            <span>Audit-ready</span>
          </section>

          <section className="pitch-workflow-strip panel" aria-label="Pitch workflow">
            {pitchWorkflow.map((step, index) => (
              <span key={step}>
                {step}
                {index < pitchWorkflow.length - 1 ? <ArrowRight size={13} /> : null}
              </span>
            ))}
          </section>

          <section className="pitch-workbench-grid">
            <article className="pitch-evidence-panel panel">
              <div className="panel-header pitch-panel-header">
                <div>
                  <h2>Patient voice + caregiver context</h2>
                </div>
              </div>
              {primaryEvidence ? (
                <div className="pitch-source-block">
                  <span className="pitch-meta-line">Phone call · Spanish → English</span>
                  <blockquote>{primaryEvidence.transcript_text}</blockquote>
                </div>
              ) : (
                <p className="empty-copy">No source transcript is linked to this safety lead yet.</p>
              )}
              {caregiverEvidence ? (
                <div className="pitch-source-block caregiver">
                  <span className="pitch-meta-line">Caregiver app</span>
                  <blockquote>{caregiverEvidence.transcript_text}</blockquote>
                </div>
              ) : null}
            </article>

            <article className="pitch-structured-panel structured-lead-panel panel">
              <div className="panel-header pitch-panel-header">
                <div>
                  <h2>Structured safety lead</h2>
                  <span>AI draft · human review required</span>
                </div>
                <span className="status-chip">Human review required</span>
              </div>
              <div className="structured-field-list pitch-structured-fields">
                {structuredFields.slice(0, 6).map((field) => (
                  <DataField key={field.label} label={field.label} value={field.value} />
                ))}
              </div>
            </article>

            <article className="pitch-review-panel panel">
              <div className="pitch-review-section">
                <div className="panel-header pitch-panel-header">
                  <div>
                    <h2>Follow-up needed before handoff</h2>
                    <span>{followupItems.length} items before sponsor handoff</span>
                  </div>
                  <AlertTriangle size={17} />
                </div>
                <div className="missing-chip-grid pitch-missing-fields">
                  {followupItems.map((field) => (
                    <span key={field.label}>
                      <strong>{field.label}</strong>
                      <small>{field.requirement}</small>
                    </span>
                  ))}
                </div>
              </div>

              <div className="pitch-review-section">
                <div className="panel-header pitch-panel-header">
                  <div>
                    <h2>Human PV review controls</h2>
                  </div>
                  <span className="status-chip draft">Handoff draft</span>
                </div>
                <div className="review-field-list pitch-review-fields">
                  <DataField label="Assessment" value="Pending" />
                  <DataField label="Causality" value="Not assessed by AI" />
                  <DataField label="Seriousness" value="Reviewer decision required" />
                </div>
                <div className="pitch-actions">
                  <button type="button" className="warning-action" onClick={() => addFollowup(lead)}>
                    <Send size={16} />
                    Request follow-up
                  </button>
                  <button type="button" className="ghost-action" onClick={() => updateLead({ status: 'caregiver_requested' })}>
                    <Users size={16} />
                    Ask caregiver
                  </button>
                  <button type="button" className="ghost-action" disabled>
                    <FileText size={16} />
                    Prepare handoff package
                  </button>
                </div>
              </div>
            </article>
          </section>

          <section className="audit-trace-strip pitch-audit-strip panel">
            <Clock3 size={15} />
            <span>Audit trail:</span>
            {auditSteps.map((step, index) => (
              <strong key={step}>
                {step}
                {index < auditSteps.length - 1 ? <ArrowRight size={13} /> : null}
              </strong>
            ))}
          </section>
        </section>
      </main>
    )
  }

  return (
    <main className="lead-workbench-screen">
      <section className="lead-workbench-main">
        <section className="transformation-spine panel" aria-label="Safety lead transformation">
          {transformationSteps.map((step, index) => (
            <article key={step.label} className="spine-step">
              <div className="spine-marker">{index + 1}</div>
              <div>
                <strong>{step.label}</strong>
                <span>{step.detail}</span>
              </div>
              {index < transformationSteps.length - 1 ? <ArrowRight className="spine-arrow" size={16} /> : null}
            </article>
          ))}
        </section>

        <section className="lead-workbench-hero panel">
          <div>
            <span className="case-number">{lead.lead_number}</span>
            <h2>{lead.event_description}</h2>
            <p>Free-form patient voice structured into PV-ready intake before sponsor handoff.</p>
            <div className="hero-status-grid">
              <span>
                <strong>Status</strong>
                Human review required
              </span>
              <span>
                <strong>Completeness</strong>
                {lead.completeness_score}%
              </span>
              <span>
                <strong>Priority</strong>
                Urgent review
              </span>
              <span>
                <strong>Source</strong>
                Phone + caregiver app
              </span>
            </div>
          </div>
        </section>

        <section className="trust-strip panel">
          <ShieldCheck size={16} />
          <span>Human-in-the-loop</span>
          <span>Sponsor-controlled</span>
          <span>No autonomous reporting</span>
          <span>Audit-ready</span>
        </section>

        <section className="lead-workbench-grid">
          <article className="voice-panel panel">
            <div className="panel-header">
              <div>
                <h2>Captured patient voice</h2>
              </div>
              <Badge value={lead.primary_channel} />
            </div>
            {primaryEvidence ? (
              <>
                <blockquote>{primaryEvidence.transcript_text}</blockquote>
                <div className="highlight-row">
                  {voiceHighlights.slice(1).map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </>
            ) : (
              <p className="empty-copy">No source transcript is linked to this safety lead yet.</p>
            )}
            {caregiverEvidence ? (
              <div className="caregiver-mini">
                <strong>Caregiver app</strong>
                <p>{caregiverEvidence.transcript_text}</p>
                <div className="highlight-row">
                  {caregiverHighlights.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </div>
            ) : null}
          </article>

          <article className="structured-lead-panel panel">
            <div className="panel-header">
              <div>
                <h2>Structured safety lead</h2>
                <span>Draft created / {lead.completeness_score}% complete</span>
              </div>
              <span className="status-chip">Human review required</span>
            </div>
            <div className="structured-field-list">
              {structuredFields.map((field) => (
                <DataField key={field.label} label={field.label} value={field.value} />
              ))}
            </div>
          </article>

          <article className="missing-fields-panel panel">
            <div className="panel-header">
              <div>
                <h2>Follow-up needed</h2>
                <span>{followupItems.length} items before sponsor handoff</span>
              </div>
              <AlertTriangle size={18} />
            </div>
            <div className="missing-chip-grid">
              {followupItems.map((field) => (
                <span key={field.label}>
                  <strong>{field.label}</strong>
                  <small>{field.requirement}</small>
                </span>
              ))}
            </div>
          </article>

          <aside className="human-review-panel panel">
            <div className="panel-header">
              <div>
                <h2>Human PV review</h2>
                <span>PV reviewer remains in control</span>
              </div>
              <span className="status-chip draft">Handoff draft</span>
            </div>
            <div className="review-field-list">
              {reviewFields.map((field) => (
                <DataField key={field.label} label={field.label} value={field.value} />
              ))}
            </div>
            <div className="handoff-mini">
              <strong>Draft</strong>
              <span>Pending required follow-up + reviewer approval</span>
              <div>
                {handoffPackage.slice(0, 4).map((item) => (
                  <small key={item.label}>{item.label}: {item.status}</small>
                ))}
              </div>
            </div>
            <div className="action-stack compact">
              <button type="button" className="warning-action" onClick={() => addFollowup(lead)}>
                <Send size={17} />
                Request follow-up
              </button>
              <button type="button" className="ghost-action" onClick={() => updateLead({ status: 'caregiver_requested' })}>
                <Users size={17} />
                Ask caregiver
              </button>
              <button
                type="button"
                className="ghost-action"
                disabled={!handoffReady}
                onClick={() => updateLead({ status: 'ready_handoff' })}
              >
                <PackageCheck size={17} />
                Approve handoff
              </button>
            </div>
            <button type="button" className="ghost-action prepare-action">
              <FileText size={17} />
              Prepare handoff package
            </button>
          </aside>
        </section>

        <section className="audit-trace-strip panel">
          <Clock3 size={16} />
          <span>Audit trail:</span>
          <strong>Voice captured</strong>
          <ArrowRight size={14} />
          <strong>AI draft created</strong>
          <ArrowRight size={14} />
          <strong>Missing fields surfaced</strong>
          <ArrowRight size={14} />
          <strong>Caregiver context added</strong>
          <ArrowRight size={14} />
          <strong>Routed to reviewer</strong>
        </section>

      </section>
    </main>
  )
}

function DataField({ label, value }: { label: string; value: string }) {
  return (
    <article className="data-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function DashboardScreen() {
  const pipeline = [
    { label: 'Urgent review', count: 4 },
    { label: 'AI draft structured', count: 28 },
    { label: 'Needs follow-up', count: 11 },
    { label: 'In medical review', count: 6 },
    { label: 'Ready for handoff', count: 9 },
    { label: 'Exported / closed', count: 18 },
  ]
  const attentionLeads = [
    {
      leadNumber: 'SL-01001',
      event: 'CardioPress 10 mg / Dizziness + missed dose; near-fall risk',
      status: 'urgent_review',
    },
    { leadNumber: 'SL-01002', event: 'Dyspnoea', status: 'in_medical_review' },
    { leadNumber: 'SL-01003', event: 'Myalgia', status: 'needs_followup' },
  ]
  const emergingPatterns = [
    { pattern: 'Dizziness', detail: 'Rising across phone and smart speaker check-ins', status: 'review' },
    { pattern: 'Missed doses', detail: 'Common follow-up trigger', status: 'monitor' },
    { pattern: 'Falls / near falls', detail: 'Caregiver-confirmed cases require review', status: 'review' },
    { pattern: 'Caregiver-confirmed deterioration', detail: 'Monitor', status: 'monitor' },
    { pattern: 'Therapeutic failure concerns', detail: 'Baseline', status: 'baseline' },
  ]
  const channelYield = ['Phone', 'App', 'WhatsApp', 'Smart speaker', 'Caregiver app']
  const maxPipelineCount = Math.max(...pipeline.map((item) => item.count))

  return (
    <main className="screen-stack">
      <div className="trust-bar">
        <div className="trust-pills">
          <span>Human-in-the-loop</span>
          <span>Sponsor-controlled</span>
          <span>No autonomous reporting</span>
          <span>Audit-ready</span>
        </div>
        <div className="trust-clue">
          <strong>Latest captured clue</strong>
          <span>Same case: SL-01001 · Phone 09:42 · "New pill made me dizzy" · AI draft structured, human review required</span>
        </div>
      </div>
      <div className="metrics-grid">
        <Metric label="Active patients" value={248} detail="Across ES and DE" tone="success" />
        <Metric label="Interactions today" value={76} detail="Phone, app, WhatsApp, speaker" />
        <Metric label="Urgent review" value={4} detail="Immediate reviewer action" tone="danger" />
        <Metric label="Avg completeness" value="82%" detail="Available safety intake fields" tone="ready" />
      </div>
      <section className="dashboard-focus-grid">
        <div className="wide-panel panel">
          <div className="panel-header">
            <div>
              <h2>Safety pipeline</h2>
              <span>Lead status distribution</span>
            </div>
            <Activity size={20} />
          </div>
          <div className="pipeline-bars">
            {pipeline.map((item) => (
              <article key={item.label}>
                <span>{item.label}</span>
                <div>
                  <strong style={{ width: `${Math.max((item.count / maxPipelineCount) * 100, 10)}%` }} />
                </div>
                <b>{item.count}</b>
              </article>
            ))}
          </div>
        </div>

        <div className="panel compliance-preview">
          <div className="panel-header">
            <div>
              <h2>Compliance Center</h2>
              <span>Evidence-ready controls for sponsor review</span>
            </div>
            <ShieldCheck size={20} />
          </div>
          <div className="compliance-preview-list">
            {complianceCenterItems
              .filter(({ title }) =>
                [
                  'Audit Trail',
                  'Access & Roles',
                  'Consent Records',
                  'Validation Evidence',
                  'SOP Mapping',
                  'Model & Prompt Logs',
                  'Export History',
                  'Data Lineage',
                ].includes(title),
              )
              .map(({ title, Icon }) => (
              <article key={title}>
                <Icon size={16} />
                <span>{title}</span>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="dashboard-insight-grid">
        <div className="panel">
          <div className="panel-header">
            <h2>Safety leads requiring attention</h2>
          </div>
          {attentionLeads.map((lead) => (
            <article className="compact-row" key={lead.leadNumber}>
              <div>
                <strong>{lead.leadNumber}</strong>
                <span>{lead.event}</span>
              </div>
              <Badge value={lead.status} />
            </article>
          ))}
          <div className="channel-yield">
            <div>
              <h3>Channel yield</h3>
              <span>Where senior safety clues are arriving</span>
            </div>
            <div className="channel-yield-list">
              {channelYield.map((channel) => (
                <span key={channel}>{channel}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="panel emerging-patterns-panel">
          <div className="panel-header">
            <div>
              <h2>Emerging patient-generated patterns</h2>
              <span>For sponsor-led safety review. Not autonomous signal confirmation.</span>
            </div>
          </div>
          <div className="pattern-list">
            {emergingPatterns.map((item) => (
              <article className="compact-row pattern-row" key={item.pattern}>
                <div>
                  <strong>{item.pattern}</strong>
                  <span>{item.detail}</span>
                </div>
                <Badge value={item.status} />
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

function SignalScreen({ signals, setSignals }: { signals: Signal[]; setSignals: Dispatch<SetStateAction<Signal[]>> }) {
  const [selectedId, setSelectedId] = useState(signals[0]?.id || '')
  const selected = signals.find((signal) => signal.id === selectedId) || signals[0]
  return (
    <main className="signals-layout">
      <section className="panel table-panel">
        <div className="panel-header">
          <div>
            <h2>Disproportionality signals</h2>
            <span>PRR, ROR, EBGM, and chi-square from safety observations</span>
          </div>
          <button
            className="primary-action"
            type="button"
            onClick={() =>
              setSignals((current) =>
                current.map((signal) =>
                  signal.id === 'sig-4' ? { ...signal, signal_status: 'monitor', prr: 1.74 } : signal,
                ),
              )
            }
          >
            <Activity size={17} />
            Recompute
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Drug</th>
              <th>Reaction</th>
              <th>N</th>
              <th>PRR</th>
              <th>ROR</th>
              <th>χ²</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {signals.map((signal) => (
              <tr key={signal.id} className={signal.id === selected.id ? 'selected-row' : ''} onClick={() => setSelectedId(signal.id)}>
                <td>{signal.drug}</td>
                <td>{signal.reaction_meddra_pt}</td>
                <td>{signal.n}</td>
                <td>{signal.prr}</td>
                <td>{signal.ror}</td>
                <td>{signal.chi_squared}</td>
                <td>
                  <Badge value={signal.signal_status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <aside className="panel detail-aside">
        <PanelRightOpen size={20} />
        <h2>{selected.reaction_meddra_pt}</h2>
        <p>
          {selected.drug} · MedDRA {selected.reaction_meddra_code} · last computed{' '}
          {formatDate(selected.last_computed_at)}
        </p>
        <div className="signal-metrics">
          <Metric label="PRR" value={selected.prr} detail="Threshold >= 2" tone={selected.prr >= 2 ? 'ready' : 'neutral'} />
          <Metric label="EBGM" value={selected.ebgm} detail="Pilot estimate" />
        </div>
        <textarea defaultValue={selected.notes || 'Reviewer notes'} />
        <button
          className="primary-action"
          type="button"
          onClick={() =>
            setSignals((current) =>
              current.map((signal) =>
                signal.id === selected.id ? { ...signal, signal_status: 'review', notes: 'Marked for signal scientist review.' } : signal,
              ),
            )
          }
        >
          Mark for review
        </button>
      </aside>
    </main>
  )
}

function InboxScreen({ interactions }: { interactions: Interaction[] }) {
  const [selectedId, setSelectedId] = useState(interactions[0]?.id || '')
  const selected = interactions.find((interaction) => interaction.id === selectedId) || interactions[0]
  return (
    <main className="signals-layout">
      <section className="panel table-panel">
        <div className="panel-header">
          <div>
            <h2>Conversation Intake</h2>
            <span>Patient-generated source evidence before and after AI processing</span>
          </div>
          <button className="tool-button" type="button">
            <Database size={16} />
            Ingest
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Patient</th>
              <th>Channel</th>
              <th>Reporter</th>
              <th>Language</th>
              <th>AI</th>
              <th>Observed</th>
            </tr>
          </thead>
          <tbody>
            {interactions.map((interaction) => (
              <tr key={interaction.id} className={interaction.id === selected.id ? 'selected-row' : ''} onClick={() => setSelectedId(interaction.id)}>
                <td>{interaction.patient_ref}</td>
                <td>{interaction.channel}</td>
                <td>{interaction.reporter_type}</td>
                <td>{interaction.language}</td>
                <td>{interaction.ai_processed ? 'processed' : 'queued'}</td>
                <td>{interaction.observations_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <aside className="panel detail-aside">
        <MessageSquare size={20} />
        <h2>{selected.patient_ref}</h2>
        <p>{selected.transcript_text}</p>
        <div className="field-grid compact">
          <DataField label="Channel" value={selected.channel} />
          <DataField label="Safety mention" value={selected.safety_mention_detected ? 'Detected' : 'Not detected'} />
          <DataField label="Interaction time" value={formatDate(selected.interaction_at)} />
        </div>
      </aside>
    </main>
  )
}

function CapturePitchScreen() {
  const captureChannels: Array<{
    channel: string
    quote: string
    Icon: typeof MessageSquare
    tone: 'gold' | 'purple' | 'green'
  }> = [
    {
      channel: 'Phone call',
      quote: 'New pill made me dizzy...',
      Icon: PhoneCall,
      tone: 'gold',
    },
    {
      channel: 'Mobile app',
      quote: 'Missed dose confirmed',
      Icon: Smartphone,
      tone: 'purple',
    },
    {
      channel: 'WhatsApp',
      quote: 'I nearly fell today.',
      Icon: MessageCircle,
      tone: 'gold',
    },
    {
      channel: 'Smart speaker',
      quote: 'Still feeling unsteady today.',
      Icon: Mic2,
      tone: 'green',
    },
    {
      channel: 'Caregiver app',
      quote: 'She seemed confused and almost fell...',
      Icon: Users,
      tone: 'purple',
    },
  ]
  const vigilQuestions = ['When did it start?', 'Did you miss a dose?', 'Did you fall or need medical help?', 'Can we ask your caregiver to confirm?']
  const extractedContext = ['Dizziness', 'missed dose', 'near-fall risk', 'timing', 'caregiver context', 'missing fields']
  const leadFields = [
    { label: 'Safety Lead', value: 'SL-01001' },
    { label: 'Patient', value: 'P-ES-042' },
    { label: 'Potential event', value: 'dizziness / near fall' },
    { label: 'Medication issue', value: 'Missed dose' },
    { label: 'Caregiver context', value: 'confusion + near-fall concern' },
    { label: 'Missing fields', value: 'onset · outcome · medical attention · concomitant meds' },
    { label: 'Next step', value: 'human PV review' },
  ]

  return (
    <main className="capture-pitch-screen">
      <section className="capture-hero panel">
        <div>
          <h2>VIGIL helps the patient tell the story.</h2>
          <p>No portal. No form. The agent asks sponsor-approved follow-up questions and extracts PV-ready context.</p>
        </div>
        <div className="capture-hero-proof">
          <span>Same case</span>
          <strong>Safety Lead SL-01001</strong>
        </div>
      </section>

      <section className="capture-stage">
        <section className="capture-channel-panel panel">
          <div className="panel-header capture-panel-header">
            <div>
              <h2>Where the story starts</h2>
              <span>Same patient. Same episode. Multiple natural touchpoints.</span>
            </div>
          </div>
          <div className="capture-channel-stack">
            {captureChannels.map(({ channel, quote, Icon, tone }) => (
              <article key={channel} className={`capture-channel-card ${tone}`}>
                <div className="capture-channel-icon">
                  <Icon size={17} />
                </div>
                <div>
                  <h3>{channel}</h3>
                  <blockquote>{quote}</blockquote>
                </div>
              </article>
            ))}
          </div>
          <p className="capture-channel-footer">Same episode. Multiple clues. One safety lead.</p>
        </section>

        <div className="capture-stage-arrow" aria-hidden="true">
          <ArrowRight size={17} />
        </div>

        <section className="capture-conversation-panel panel">
          <div className="panel-header capture-panel-header">
            <div>
              <h2>VIGIL conversation agent</h2>
              <span>Guided follow-up through natural voice or chat</span>
            </div>
          </div>
          <div className="capture-dialogue-stack">
            <article className="capture-dialogue-card patient">
              <span>Patient says</span>
              <blockquote>New pill made me dizzy.</blockquote>
            </article>
            <article className="capture-dialogue-card agent">
              <span>VIGIL asks</span>
              <div className="capture-question-list">
                {vigilQuestions.map((question) => (
                  <p key={question}>{question}</p>
                ))}
              </div>
            </article>
            <article className="capture-dialogue-card patient">
              <span>Patient adds</span>
              <blockquote>I skipped it yesterday because I was afraid I would fall.</blockquote>
            </article>
            <article className="capture-dialogue-card caregiver">
              <span>Caregiver adds</span>
              <blockquote>She seemed confused and almost fell in the bathroom.</blockquote>
            </article>
          </div>
          <div className="capture-extraction-strip">
            <span>Extracted</span>
            <div>
              {extractedContext.map((item) => (
                <strong key={item}>{item}</strong>
              ))}
            </div>
          </div>
        </section>

        <div className="capture-stage-arrow" aria-hidden="true">
          <ArrowRight size={17} />
        </div>

        <aside className="capture-output-panel panel">
          <div className="panel-header capture-panel-header">
            <div>
              <h2>Structured safety lead</h2>
              <span>Conversation becomes reviewer-ready safety context</span>
            </div>
            <span className="status-chip">Human review required</span>
          </div>
          <div className="capture-field-list">
            {leadFields.map((field) => (
              <DataField key={field.label} label={field.label} value={field.value} />
            ))}
          </div>
          <NavLink to="/pitch/workbench" className="capture-lead-node">
            <span>Open Safety Lead Workbench →</span>
            <strong>SL-01001 · Human PV review required</strong>
          </NavLink>
        </aside>
      </section>

      <section className="capture-bottom-line panel">
        <strong>No portal. No form. VIGIL asks, extracts, and structures the safety lead.</strong>
      </section>
    </main>
  )
}

function FollowupsScreen({ followups, setFollowups }: { followups: Followup[]; setFollowups: Dispatch<SetStateAction<Followup[]>> }) {
  return (
    <main className="screen-stack">
      <section className="panel table-panel">
        <div className="panel-header">
          <div>
            <h2>Follow-up Manager</h2>
            <span>Pending questions grouped by safety lead and channel</span>
          </div>
          <button className="primary-action" type="button">
            <Send size={17} />
            Send batch
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Lead</th>
              <th>Patient</th>
              <th>Question</th>
              <th>Channel</th>
              <th>Due</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {followups.map((task) => (
              <tr key={task.id}>
                <td>{task.lead_number}</td>
                <td>{task.patient_ref}</td>
                <td>{task.question_text}</td>
                <td>{task.channel}</td>
                <td>{formatDate(task.due_at)}</td>
                <td>
                  <button
                    type="button"
                    className="status-button"
                    onClick={() =>
                      setFollowups((current) =>
                        current.map((item) =>
                          item.id === task.id ? { ...item, status: 'responded', response_text: 'Response captured.' } : item,
                        ),
                      )
                    }
                  >
                    <Badge value={task.status} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  )
}

function ReportsScreen() {
  const [message, setMessage] = useState('Exports are generated from approved or review-ready safety leads.')
  const exportOptions: Array<{ title: string; Icon: typeof FileJson; copy: string }> = [
    {
      title: 'E2B-ready JSON',
      Icon: FileJson,
      copy: 'Structured case packet mapping for sponsor safety systems.',
    },
    {
      title: 'Line listing CSV',
      Icon: FileText,
      copy: 'Reviewer-facing table of all leads, products, events, and SLA fields.',
    },
    {
      title: 'Audit CSV',
      Icon: ShieldCheck,
      copy: 'GxP audit trail for access, field edits, review actions, and exports.',
    },
  ]

  return (
    <main className="screen-stack">
      <section className="export-grid">
        {exportOptions.map(({ title, Icon, copy }) => {
          return (
            <article className="panel export-card" key={title}>
              <Icon size={28} />
              <h2>{title}</h2>
              <p>{copy}</p>
              <button className="primary-action" type="button" onClick={() => setMessage(`${title} prepared for download.`)}>
                <Download size={17} />
                Export
              </button>
            </article>
          )
        })}
      </section>
      <div className="notice">{message}</div>
    </main>
  )
}

function ProjectsScreen({ projects, setProjects }: { projects: Project[]; setProjects: Dispatch<SetStateAction<Project[]>> }) {
  const [name, setName] = useState('New adherence and safety monitoring project')
  return (
    <main className="screen-stack">
      <section className="two-column">
        <div className="panel">
          <div className="panel-header">
            <h2>PV Project Builder</h2>
          </div>
          <label className="form-field">
            Project name
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <div className="switch-row">
            <span>Detect adverse events</span>
            <input type="checkbox" defaultChecked />
          </div>
          <div className="switch-row">
            <span>Detect medication errors</span>
            <input type="checkbox" defaultChecked />
          </div>
          <div className="switch-row">
            <span>Auto-escalate serious leads</span>
            <input type="checkbox" defaultChecked />
          </div>
          <button
            className="primary-action"
            type="button"
            onClick={() =>
              setProjects((current) => [
                {
                  ...current[0],
                  id: `project-${current.length + 1}`,
                  name,
                  status: 'draft',
                  patient_count: 0,
                  lead_count: 0,
                },
                ...current,
              ])
            }
          >
            Create draft project
          </button>
        </div>
        <div className="panel">
          <div className="panel-header">
            <h2>Active projects</h2>
          </div>
          {projects.map((project) => (
            <article className="compact-row" key={project.id}>
              <div>
                <strong>{project.name}</strong>
                <span>
                  {project.brand_name} · {project.patient_count} patients · SLA {project.sla_hours}h
                </span>
              </div>
              <Badge value={project.status} />
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

function PatientsScreen({ patients }: { patients: Patient[] }) {
  return (
    <main className="screen-stack">
      <section className="panel table-panel">
        <div className="panel-header">
          <div>
            <h2>Patient Onboarding Hub</h2>
            <span>Pseudonymous enrolled seniors and channel configuration</span>
          </div>
          <button className="primary-action" type="button">
            <Users size={17} />
            Enroll patient
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Patient</th>
              <th>Age</th>
              <th>Country</th>
              <th>Condition</th>
              <th>Channel</th>
              <th>Consent</th>
              <th>Evidence</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((patient) => (
              <tr key={patient.id}>
                <td>{patient.patient_ref}</td>
                <td>
                  {patient.sex}/{patient.age_group}
                </td>
                <td>{patient.country}</td>
                <td>{patient.condition}</td>
                <td>{patient.preferred_channel}</td>
                <td>
                  <Badge value={patient.consent_status} />
                </td>
                <td>
                  {patient.interaction_count} interactions · {patient.lead_count} leads
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  )
}

function ComplianceScreen({ audit }: { audit: AuditEntry[] }) {
  return (
    <main className="screen-stack">
      <section className="compliance-hero panel">
        <div>
          <span className="topbar-kicker">GxP readiness</span>
          <h2>Compliance Center</h2>
          <p>Auditability, permissions, validation evidence, retention policy, and controlled change history for patient-generated safety operations.</p>
        </div>
        <ShieldCheck size={30} />
      </section>

      <section className="compliance-grid">
        {complianceCenterItems.map(({ title, detail, Icon }) => (
          <article className="panel compliance-tile" key={title}>
            <Icon size={20} />
            <div>
              <h2>{title}</h2>
              <p>{detail}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="two-column">
        <div className="panel table-panel">
          <div className="panel-header">
            <h2>Recent audit trail</h2>
          </div>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>Entity</th>
                <th>User</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDate(entry.created_at)}</td>
                  <td>{entry.action}</td>
                  <td>{entry.entity_type}</td>
                  <td>{entry.user_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel compliance-card">
          <ShieldCheck size={26} />
          <h2>Readiness snapshot</h2>
          <p>Audit log is insert-only, model versions are tracked, reviewer decisions are captured, and exports are logged for traceability.</p>
          <div className="model-version">
            <strong>gpt-4o-mini</strong>
            <span>pv-detectors-v1 / extraction version 1.0 / deployed pilot</span>
          </div>
          <div className="model-version">
            <strong>Sponsor controls</strong>
            <span>SOP-approved scripts / escalation rules / export rationale required</span>
          </div>
        </div>
      </section>
    </main>
  )
}

function AppRoutes({
  leads,
  setLeads,
  signals,
  setSignals,
  interactions,
  followups,
  setFollowups,
  projects,
  setProjects,
  patients,
  audit,
}: {
  leads: SafetyLead[]
  setLeads: Dispatch<SetStateAction<SafetyLead[]>>
  signals: Signal[]
  setSignals: Dispatch<SetStateAction<Signal[]>>
  interactions: Interaction[]
  followups: Followup[]
  setFollowups: Dispatch<SetStateAction<Followup[]>>
  projects: Project[]
  setProjects: Dispatch<SetStateAction<Project[]>>
  patients: Patient[]
  audit: AuditEntry[]
}) {
  const navigate = useNavigate()

  function addFollowup(lead: SafetyLead) {
    const task: Followup = {
      id: `followup-${Date.now()}`,
      lead_id: lead.id,
      lead_number: lead.lead_number,
      patient_ref: lead.patient_ref,
      task_type: 'question_to_patient',
      question_text: `Please confirm: ${pretty(lead.missing_fields[0] || 'missing safety detail')}.`,
      channel: lead.primary_channel,
      status: 'pending',
      due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }
    setFollowups((current) => [task, ...current])
    setLeads((current) =>
      current.map((item) => (item.id === lead.id ? { ...item, status: 'needs_followup' } : item)),
    )
    navigate('/followups')
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/leads" replace />} />
      <Route
        path="/leads"
        element={leads[0] ? <Navigate to={`/leads/${leads[0].id}`} replace /> : <Navigate to="/dashboard" replace />}
      />
      <Route
        path="/leads/:leadId"
        element={
          <SafetyLeadWorkbench
            leads={leads}
            setLeads={setLeads}
            evidence={demoEvidence}
            addFollowup={addFollowup}
          />
        }
      />
      <Route
        path="/pitch/workbench"
        element={
          <SafetyLeadWorkbench
            leads={leads}
            setLeads={setLeads}
            evidence={demoEvidence}
            addFollowup={addFollowup}
            pitchMode
          />
        }
      />
      <Route path="/dashboard" element={<DashboardScreen />} />
      <Route path="/signals" element={<SignalScreen signals={signals} setSignals={setSignals} />} />
      <Route path="/inbox" element={<InboxScreen interactions={interactions} />} />
      <Route path="/pitch/capture" element={<CapturePitchScreen />} />
      <Route path="/pitch-demo" element={<PitchDemoScreen />} />
      <Route path="/followups" element={<FollowupsScreen followups={followups} setFollowups={setFollowups} />} />
      <Route path="/reports" element={<ReportsScreen />} />
      <Route path="/projects" element={<ProjectsScreen projects={projects} setProjects={setProjects} />} />
      <Route path="/patients" element={<PatientsScreen patients={patients} />} />
      <Route path="/compliance" element={<ComplianceScreen audit={audit} />} />
      <Route path="*" element={<Navigate to="/leads" replace />} />
    </Routes>
  )
}

function AppContent({
  session,
  setSession,
  leads,
  setLeads,
  signals,
  setSignals,
  interactions,
  followups,
  setFollowups,
  projects,
  setProjects,
  patients,
  audit,
}: {
  session: Session | null
  setSession: Dispatch<SetStateAction<Session | null>>
  leads: SafetyLead[]
  setLeads: Dispatch<SetStateAction<SafetyLead[]>>
  signals: Signal[]
  setSignals: Dispatch<SetStateAction<Signal[]>>
  interactions: Interaction[]
  followups: Followup[]
  setFollowups: Dispatch<SetStateAction<Followup[]>>
  projects: Project[]
  setProjects: Dispatch<SetStateAction<Project[]>>
  patients: Patient[]
  audit: AuditEntry[]
}) {
  const location = useLocation()
  const standalonePitchFile =
    window.location.protocol === 'file:' && window.location.pathname.toLowerCase().endsWith('vigil-pitch.html')

  if (standalonePitchFile || location.pathname.startsWith('/vigil-pitch')) {
    return <VigilPitchScreen />
  }

  if (location.pathname.startsWith('/vigil-demo')) {
    return <VigilDemoScreen />
  }

  if (location.pathname.startsWith('/pitch-demo')) {
    return <PitchDemoScreen />
  }

  if (!session) return <LoginScreen onLogin={setSession} />

  return (
    <Shell session={session} onLogout={() => setSession(null)}>
      <AppRoutes
        leads={leads}
        setLeads={setLeads}
        signals={signals}
        setSignals={setSignals}
        interactions={interactions}
        followups={followups}
        setFollowups={setFollowups}
        projects={projects}
        setProjects={setProjects}
        patients={patients}
        audit={audit}
      />
    </Shell>
  )
}

function App() {
  const [session, setSession] = useState<Session | null>({
    token: null,
    demo: true,
    user: {
      full_name: 'Dr. R. Moreno',
      role: 'pv_reviewer',
      organization: { name: 'Pharma Demo Co.' },
    },
  })
  const [leads, setLeads] = useState(demoLeads)
  const [signals, setSignals] = useState(demoSignals)
  const [followups, setFollowups] = useState(demoFollowups)
  const [projects, setProjects] = useState(demoProjects)

  return (
    <BrowserRouter>
      <AppContent
        session={session}
        setSession={setSession}
        leads={leads}
        setLeads={setLeads}
        signals={signals}
        setSignals={setSignals}
        interactions={demoInteractions}
        followups={followups}
        setFollowups={setFollowups}
        projects={projects}
        setProjects={setProjects}
        patients={demoPatients}
        audit={demoAudit}
      />
    </BrowserRouter>
  )
}

export default App
