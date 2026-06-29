import { type MouseEvent, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  MessageCircle,
  Mic2,
  PhoneCall,
  Send,
  ShieldCheck,
  Smartphone,
  Users,
} from 'lucide-react'

type PitchStep =
  | { id: string; slide: 1 | 2 | 3 | 7 | 8; label: string; marker: string; view: 'cover' | 'problem' | 'solution' | 'ask' | 'why' }
  | { id: string; slide: 4; label: string; marker: string; view: 'capture'; reveal: 'touchpoints' | 'patient' | 'questions' | 'context' | 'lead' }
  | { id: string; slide: 5; label: string; marker: string; view: 'workbench'; reveal: 'open' | 'evidence' | 'structured' | 'missing' | 'review' }
  | { id: string; slide: 6; label: string; marker: string; view: 'intelligence'; reveal: 'kpis' | 'pipeline' | 'patterns' | 'compliance' }

type CaptureReveal = Extract<PitchStep, { view: 'capture' }>['reveal']
type WorkbenchReveal = Extract<PitchStep, { view: 'workbench' }>['reveal']
type IntelligenceReveal = Extract<PitchStep, { view: 'intelligence' }>['reveal']

const pitchSteps: PitchStep[] = [
  { id: 'cover', slide: 1, label: 'Cover', marker: '1', view: 'cover' },
  { id: 'problem', slide: 2, label: 'Problem', marker: '2', view: 'problem' },
  { id: 'solution', slide: 3, label: 'Solution', marker: '3', view: 'solution' },
  { id: 'capture-touchpoints', slide: 4, label: 'Conversation Intake', marker: '4A', view: 'capture', reveal: 'touchpoints' },
  { id: 'capture-patient', slide: 4, label: 'Conversation Intake', marker: '4B', view: 'capture', reveal: 'patient' },
  { id: 'capture-questions', slide: 4, label: 'Conversation Intake', marker: '4C', view: 'capture', reveal: 'questions' },
  { id: 'capture-context', slide: 4, label: 'Conversation Intake', marker: '4D', view: 'capture', reveal: 'context' },
  { id: 'capture-lead', slide: 4, label: 'Conversation Intake', marker: '4E', view: 'capture', reveal: 'lead' },
  { id: 'workbench-open', slide: 5, label: 'Safety Lead Workbench', marker: '5A', view: 'workbench', reveal: 'open' },
  { id: 'workbench-evidence', slide: 5, label: 'Safety Lead Workbench', marker: '5B', view: 'workbench', reveal: 'evidence' },
  { id: 'workbench-structured', slide: 5, label: 'Safety Lead Workbench', marker: '5C', view: 'workbench', reveal: 'structured' },
  { id: 'workbench-missing', slide: 5, label: 'Safety Lead Workbench', marker: '5D', view: 'workbench', reveal: 'missing' },
  { id: 'workbench-review', slide: 5, label: 'Safety Lead Workbench', marker: '5E', view: 'workbench', reveal: 'review' },
  { id: 'intel-kpis', slide: 6, label: 'Program Safety Intelligence', marker: '6A', view: 'intelligence', reveal: 'kpis' },
  { id: 'intel-pipeline', slide: 6, label: 'Program Safety Intelligence', marker: '6B', view: 'intelligence', reveal: 'pipeline' },
  { id: 'intel-patterns', slide: 6, label: 'Program Safety Intelligence', marker: '6C', view: 'intelligence', reveal: 'patterns' },
  { id: 'intel-compliance', slide: 6, label: 'Program Safety Intelligence', marker: '6D', view: 'intelligence', reveal: 'compliance' },
  { id: 'ask', slide: 7, label: 'The Ask', marker: '7', view: 'ask' },
  { id: 'why-vyva', slide: 8, label: 'Why VYVA', marker: '8', view: 'why' },
]

const trustPhrases = ['Human-in-the-loop', 'Sponsor-controlled', 'No autonomous reporting', 'Audit-ready']

const touchpoints = [
  { channel: 'Phone call', quote: 'New pill made me dizzy...', Icon: PhoneCall, tone: 'gold' },
  { channel: 'Mobile app', quote: 'Missed dose confirmed', Icon: Smartphone, tone: 'purple' },
  { channel: 'WhatsApp', quote: 'I nearly fell today.', Icon: MessageCircle, tone: 'green' },
  { channel: 'Smart speaker', quote: 'Still feeling unsteady today.', Icon: Mic2, tone: 'green' },
  { channel: 'Caregiver app', quote: 'She seemed confused and almost fell...', Icon: Users, tone: 'purple' },
]

const leadFields = [
  ['Safety Lead', 'SL-01001'],
  ['Patient', 'P-ES-042'],
  ['Product', 'CardioPress 10 mg'],
  ['Potential event', 'Dizziness / near fall'],
  ['Medication issue', 'Missed dose'],
  ['Caregiver context', 'Confusion + near-fall concern'],
  ['Missing fields', 'Onset / outcome / medical attention / concomitant meds'],
  ['Next step', 'Human PV review'],
]

const pipeline = [
  ['Urgent review', '4', 14],
  ['AI draft structured', '28', 100],
  ['Needs follow-up', '11', 39],
  ['In medical review', '6', 22],
  ['Ready for handoff', '9', 32],
  ['Exported / closed', '18', 64],
]

const patterns = [
  ['Dizziness', 'Rising across phone and smart speaker check-ins', 'review'],
  ['Missed doses', 'Common follow-up trigger', 'monitor'],
  ['Falls / near falls', 'Caregiver-confirmed cases require review', 'review'],
  ['Caregiver-confirmed deterioration', 'Monitor', 'monitor'],
  ['Therapeutic failure concerns', 'Baseline', 'baseline'],
]

const complianceTiles = [
  'Audit Trail',
  'Access & Roles',
  'Consent Records',
  'Validation Evidence',
  'SOP Mapping',
  'Model & Prompt Logs',
  'Export History',
  'Data Lineage',
]

function getInitialStep() {
  const requested = Number(new URLSearchParams(window.location.search).get('step') || '1')
  if (!Number.isFinite(requested)) return 0
  return Math.min(Math.max(requested - 1, 0), pitchSteps.length - 1)
}

function updateStepUrl(stepIndex: number) {
  const url = new URL(window.location.href)
  url.searchParams.set('step', String(stepIndex + 1))
  window.history.replaceState(null, '', url)
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="pitch-demo-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function MiniBadge({ children, tone = 'neutral' }: { children: string; tone?: 'neutral' | 'gold' | 'purple' | 'red' | 'green' }) {
  return <span className={`pitch-demo-badge ${tone}`}>{children}</span>
}

export default function PitchDemoScreen() {
  const [stepIndex, setStepIndex] = useState(getInitialStep)
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement))
  const slideRef = useRef<HTMLElement | null>(null)
  const step = pitchSteps[stepIndex]

  function commitStep(nextIndex: number) {
    const clamped = Math.min(Math.max(nextIndex, 0), pitchSteps.length - 1)
    setStepIndex(clamped)
    updateStepUrl(clamped)
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      void document.exitFullscreen()
      return
    }
    void document.documentElement.requestFullscreen?.()
  }

  function handleSlideClick(event: MouseEvent<HTMLElement>) {
    const target = event.target as HTMLElement
    if (target.closest('button, a, input, textarea, select')) return
    commitStep(stepIndex + 1)
  }

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      const tagName = target?.tagName.toLowerCase()
      if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') return

      if (event.key === 'ArrowRight' || event.key === ' ') {
        event.preventDefault()
        commitStep(stepIndex + 1)
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        commitStep(stepIndex - 1)
      }
      if (event.key.toLowerCase() === 'r') {
        event.preventDefault()
        commitStep(0)
      }
      if (event.key.toLowerCase() === 'f') {
        event.preventDefault()
        toggleFullscreen()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
    }
  }, [stepIndex])

  useEffect(() => {
    slideRef.current?.focus({ preventScroll: true })
  }, [stepIndex])

  return (
    <main className={`pitch-demo-screen ${isFullscreen ? 'is-fullscreen' : ''}`}>
      <header className="pitch-demo-topline">
        <div>
          <span>{step.marker}</span>
          <strong>{step.label}</strong>
        </div>
        <div className="pitch-demo-progress" aria-label="Pitch progress">
          {pitchSteps.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={index <= stepIndex ? 'active' : ''}
              aria-label={`Go to step ${index + 1}`}
              onClick={() => commitStep(index)}
            />
          ))}
          <small>
            {stepIndex + 1}/{pitchSteps.length}
          </small>
        </div>
        <div className="pitch-demo-controls" aria-label="Pitch controls">
          <button type="button" onClick={() => commitStep(stepIndex - 1)} disabled={stepIndex === 0}>
            <ArrowLeft size={15} />
            Back
          </button>
          <button type="button" className="primary" onClick={() => commitStep(stepIndex + 1)} disabled={stepIndex === pitchSteps.length - 1}>
            Next
            <ArrowRight size={15} />
          </button>
        </div>
      </header>

      <section
        key={step.id}
        ref={slideRef}
        className={`pitch-demo-slide pitch-demo-slide-${step.view}`}
        tabIndex={0}
        onClick={handleSlideClick}
      >
        {step.view === 'cover' ? <CoverSlide /> : null}
        {step.view === 'problem' ? <ProblemSlide /> : null}
        {step.view === 'solution' ? <SolutionSlide /> : null}
        {step.view === 'capture' ? <CaptureSlide reveal={step.reveal} /> : null}
        {step.view === 'workbench' ? <WorkbenchSlide reveal={step.reveal} /> : null}
        {step.view === 'intelligence' ? <IntelligenceSlide reveal={step.reveal} /> : null}
        {step.view === 'ask' ? <AskSlide /> : null}
        {step.view === 'why' ? <WhyVyvaSlide /> : null}
      </section>
    </main>
  )
}

function TrustLine() {
  return (
    <div className="pitch-demo-trust-line">
      {trustPhrases.map((phrase) => (
        <span key={phrase}>{phrase}</span>
      ))}
    </div>
  )
}

function CoverSlide() {
  return (
    <div className="pitch-demo-cover">
      <section className="pitch-demo-hero-copy">
        <div className="pitch-demo-wordmark">
          <strong>VIGIL</strong>
          <span>Patient voice intelligence</span>
          <small>powered by VYVA</small>
        </div>
        <h2>Patient-generated pharmacovigilance intelligence.</h2>
        <p>From everyday senior conversations to sponsor-controlled safety review.</p>
        <TrustLine />
      </section>
      <aside className="pitch-demo-case-card">
        <span>Demo case</span>
        <strong>SL-01001</strong>
        <p>CardioPress 10 mg / Dizziness + missed dose; near-fall risk</p>
        <MiniBadge tone="red">Human PV review required</MiniBadge>
      </aside>
    </div>
  )
}

function ProblemSlide() {
  const problems = [
    ['Patient voice gets lost', 'Seniors describe symptoms through phone calls, apps, caregivers, and informal check-ins.'],
    ['PV intake is incomplete', 'Onset, outcome, medical attention, and concomitant meds are often missing at first capture.'],
    ['Teams need control', 'AI can structure evidence, but causality and seriousness must stay with qualified reviewers.'],
  ]

  return (
    <div className="pitch-demo-narrative">
      <section>
        <h2>Patient-generated safety clues arrive before PV systems can use them.</h2>
        <p>Traditional portals and forms miss how older patients actually report medication concerns.</p>
      </section>
      <div className="pitch-demo-three">
        {problems.map(([title, copy], index) => (
          <article className="pitch-demo-panel" key={title}>
            <span>0{index + 1}</span>
            <h3>{title}</h3>
            <p>{copy}</p>
          </article>
        ))}
      </div>
    </div>
  )
}

function SolutionSlide() {
  const flow = [
    ['Capture', 'Phone, app, WhatsApp, smart speaker, caregiver app'],
    ['Ask', 'Sponsor-approved follow-up questions'],
    ['Structure', 'AI draft safety lead with missing fields'],
    ['Review', 'Human PV reviewer remains in control'],
    ['Handoff', 'Sponsor-ready evidence and audit trail'],
  ]

  return (
    <div className="pitch-demo-solution">
      <section>
        <h2>VIGIL turns natural patient conversations into review-ready safety leads.</h2>
        <p>No portal. No form. The patient tells the story, VIGIL structures the intake, and the sponsor controls the workflow.</p>
      </section>
      <div className="pitch-demo-flow">
        {flow.map(([title, copy], index) => (
          <article key={title}>
            <strong>{title}</strong>
            <span>{copy}</span>
            {index < flow.length - 1 ? <ArrowRight size={18} /> : null}
          </article>
        ))}
      </div>
      <TrustLine />
    </div>
  )
}

function CaptureSlide({ reveal }: { reveal: CaptureReveal }) {
  const level = ['touchpoints', 'patient', 'questions', 'context', 'lead'].indexOf(reveal)

  return (
    <div className="pitch-demo-product-slide">
      <section className="pitch-demo-slide-heading">
        <h2>Conversation Intake</h2>
        <p>No portal. No form. The agent asks sponsor-approved follow-up questions and extracts PV-ready context.</p>
      </section>

      <section className="pitch-demo-capture-grid">
        <article className={`pitch-demo-panel pitch-demo-capture-touchpoints ${level >= 0 ? 'visible active' : ''}`}>
          <div className="pitch-demo-panel-heading">
            <h3>Where the story starts</h3>
            <span>Same patient. Same episode. Multiple natural touchpoints.</span>
          </div>
          <div className="pitch-demo-touchpoint-list">
            {touchpoints.map(({ channel, quote, Icon, tone }) => (
              <div className={`pitch-demo-touchpoint ${tone}`} key={channel}>
                <Icon size={16} />
                <strong>{channel}</strong>
                <span>{quote}</span>
              </div>
            ))}
          </div>
          <p>Same episode. Multiple clues. One safety lead.</p>
        </article>

        <ArrowConnector />

        <article className={`pitch-demo-panel pitch-demo-conversation ${level >= 1 ? 'visible' : ''} ${level >= 1 && level <= 3 ? 'active' : ''}`}>
          <div className="pitch-demo-panel-heading">
            <h3>VIGIL conversation agent</h3>
            <span>Guided follow-up through natural voice or chat</span>
          </div>
          <div className={`pitch-demo-dialogue ${level >= 1 ? 'visible' : ''}`}>
            <span>Patient says</span>
            <blockquote>"New pill made me dizzy."</blockquote>
          </div>
          <div className={`pitch-demo-question-card ${level >= 2 ? 'visible' : ''}`}>
            <span>VIGIL asks</span>
            <p>When did it start?</p>
            <p>Did you miss a dose?</p>
            <p>Did you fall or need medical help?</p>
            <p>Can we ask your caregiver to confirm?</p>
          </div>
          <div className={`pitch-demo-dialogue ${level >= 3 ? 'visible' : ''}`}>
            <span>Patient adds</span>
            <blockquote>"I skipped it yesterday because I was afraid I would fall."</blockquote>
          </div>
          <div className={`pitch-demo-dialogue caregiver ${level >= 3 ? 'visible' : ''}`}>
            <span>Caregiver adds</span>
            <blockquote>"She seemed confused and almost fell in the bathroom."</blockquote>
          </div>
        </article>

        <ArrowConnector />

        <aside className={`pitch-demo-panel pitch-demo-output ${level >= 4 ? 'visible active' : ''}`}>
          <div className="pitch-demo-panel-heading">
            <h3>Structured safety lead</h3>
            <span>Conversation becomes reviewer-ready safety context</span>
          </div>
          <div className="pitch-demo-field-list">
            {leadFields.slice(0, 7).map(([label, value]) => (
              <Field key={label} label={label} value={value} />
            ))}
          </div>
          <MiniBadge tone="purple">SL-01001 - Human PV review required</MiniBadge>
        </aside>
      </section>
    </div>
  )
}

function WorkbenchSlide({ reveal }: { reveal: WorkbenchReveal }) {
  const isActive = (target: typeof reveal) => reveal === target

  return (
    <div className="pitch-demo-product-slide">
      <section className="pitch-demo-slide-heading compact">
        <div>
          <h2>Safety Lead Workbench</h2>
          <p>Free-form patient voice in - structured safety lead out - human reviewer in control.</p>
        </div>
        <div className="pitch-demo-status-row">
          <MiniBadge tone="red">Urgent review</MiniBadge>
          <MiniBadge tone="gold">82% complete</MiniBadge>
          <MiniBadge tone="purple">Phone + caregiver</MiniBadge>
        </div>
      </section>

      <section className="pitch-demo-workbench-grid">
        <article className={`pitch-demo-panel pitch-demo-evidence ${isActive('evidence') ? 'active' : ''}`}>
          <div className="pitch-demo-panel-heading">
            <h3>Source evidence</h3>
            <span>Voice and caregiver context remain inspectable</span>
          </div>
          <blockquote>"New pill made me dizzy. I skipped it yesterday because I was afraid I would fall."</blockquote>
          <blockquote className="caregiver">"She seemed confused and almost fell in the bathroom."</blockquote>
        </article>

        <article className={`pitch-demo-panel pitch-demo-structured ${isActive('structured') ? 'active' : ''}`}>
          <div className="pitch-demo-panel-heading">
            <h3>Structured safety lead</h3>
            <span>AI draft - human review required</span>
          </div>
          <div className="pitch-demo-field-list">
            {leadFields.slice(0, 6).map(([label, value]) => (
              <Field key={label} label={label} value={value} />
            ))}
          </div>
        </article>

        <article className={`pitch-demo-panel pitch-demo-review ${isActive('missing') || isActive('review') ? 'active' : ''}`}>
          <section className={isActive('missing') ? 'pitch-demo-highlight-section' : ''}>
            <div className="pitch-demo-panel-heading">
              <h3>Missing fields</h3>
              <span>Follow-up needed before sponsor handoff</span>
            </div>
            <div className="pitch-demo-missing-grid">
              {['Exact onset date', 'Outcome', 'Medical attention', 'Concomitant meds'].map((item) => (
                <strong key={item}>{item}</strong>
              ))}
            </div>
          </section>
          <section className={isActive('review') ? 'pitch-demo-highlight-section' : ''}>
            <div className="pitch-demo-panel-heading">
              <h3>Human PV review controls</h3>
              <span>Reviewer decides assessment and handoff</span>
            </div>
            <Field label="Causality" value="Causality not assessed by AI" />
            <Field label="Seriousness" value="Seriousness requires reviewer decision" />
            <div className="pitch-demo-action-row">
              <button type="button">
                <Send size={14} />
                Request follow-up
              </button>
              <button type="button">
                <Users size={14} />
                Ask caregiver
              </button>
              <button type="button">
                <FileText size={14} />
                Prepare handoff
              </button>
            </div>
          </section>
        </article>
      </section>
    </div>
  )
}

function IntelligenceSlide({ reveal }: { reveal: IntelligenceReveal }) {
  const isActive = (target: typeof reveal) => reveal === target

  return (
    <div className="pitch-demo-product-slide">
      <section className="pitch-demo-slide-heading compact">
        <div>
          <h2>Program Safety Intelligence</h2>
          <p>Early patient-generated safety intelligence for sponsor-led review.</p>
        </div>
        <TrustLine />
      </section>

      <section className="pitch-demo-intel-grid">
        <article className={`pitch-demo-panel pitch-demo-latest ${isActive('kpis') ? 'active' : ''}`}>
          <span>Latest captured clue</span>
          <strong>Same case: SL-01001 - Phone 09:42 - "New pill made me dizzy" - AI draft structured</strong>
          <div className="pitch-demo-kpi-grid">
            <MetricLite label="Active patients" value="248" detail="Across ES and DE" />
            <MetricLite label="Interactions today" value="76" detail="Phone, app, WhatsApp, speaker" />
            <MetricLite label="Urgent review" value="4" detail="Immediate reviewer action" tone="red" />
            <MetricLite label="Avg completeness" value="82%" detail="Available safety intake fields" tone="gold" />
          </div>
        </article>

        <article className={`pitch-demo-panel ${isActive('pipeline') ? 'active' : ''}`}>
          <div className="pitch-demo-panel-heading">
            <h3>Safety pipeline</h3>
            <span>Lead status distribution</span>
          </div>
          <div className="pitch-demo-pipeline">
            {pipeline.map(([label, count, width]) => (
              <div key={label}>
                <span>{label}</span>
                <i>
                  <b style={{ width: `${width}%` }} />
                </i>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className={`pitch-demo-panel ${isActive('patterns') ? 'active' : ''}`}>
          <div className="pitch-demo-panel-heading">
            <h3>Emerging patient-generated patterns</h3>
            <span>For sponsor-led safety review. Not autonomous signal confirmation.</span>
          </div>
          {patterns.map(([title, detail, status]) => (
            <div className="pitch-demo-pattern-row" key={title}>
              <div>
                <strong>{title}</strong>
                <span>{detail}</span>
              </div>
              <MiniBadge tone={status === 'review' ? 'gold' : 'neutral'}>{status}</MiniBadge>
            </div>
          ))}
        </article>

        <article className={`pitch-demo-panel ${isActive('compliance') ? 'active' : ''}`}>
          <div className="pitch-demo-panel-heading">
            <h3>Compliance Center</h3>
            <span>Evidence-ready controls for sponsor review</span>
          </div>
          <div className="pitch-demo-compliance-grid">
            {complianceTiles.map((tile) => (
              <span key={tile}>
                <ShieldCheck size={14} />
                {tile}
              </span>
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}

function AskSlide() {
  return (
    <div className="pitch-demo-narrative pitch-demo-ask">
      <section>
        <h2>The ask: run one sponsor-controlled pilot.</h2>
        <p>Validate VIGIL on a bounded post-market safety watch where patient voice is already high-value but hard to structure.</p>
      </section>
      <div className="pitch-demo-three">
        <article className="pitch-demo-panel active">
          <span>01</span>
          <h3>90-day validation</h3>
          <p>Measure intake completeness, follow-up lift, reviewer agreement, and false positive / false negative handling.</p>
        </article>
        <article className="pitch-demo-panel">
          <span>02</span>
          <h3>Sponsor-approved workflow</h3>
          <p>Use approved scripts, escalation rules, reviewer scoring, audit trails, and export rationale.</p>
        </article>
        <article className="pitch-demo-panel">
          <span>03</span>
          <h3>Defined handoff</h3>
          <p>Deliver evidence packets and structured safety leads into the sponsor PV workflow.</p>
        </article>
      </div>
    </div>
  )
}

function WhyVyvaSlide() {
  const strengths = [
    'Voice-first senior check-ins',
    'Medication management',
    'Symptom checks',
    'Caregiver alerts',
    'Fall detection',
    'Vitals monitoring',
    'App, phone, WhatsApp, desktop, and local service points',
  ]

  return (
    <div className="pitch-demo-why">
      <section>
        <div className="pitch-demo-wordmark">
          <strong>VIGIL</strong>
          <span>powered by VYVA</span>
        </div>
        <h2>Why VYVA can make pharmacovigilance feel natural to seniors.</h2>
        <p>VYVA already sits where safety clues begin: voice, medication, symptoms, caregivers, falls, vitals, and everyday support access.</p>
      </section>
      <div className="pitch-demo-strength-grid">
        {strengths.map((strength) => (
          <span key={strength}>
            <CheckCircle2 size={15} />
            {strength}
          </span>
        ))}
      </div>
      <div className="pitch-demo-closing-line">
        <strong>Free-form patient voice in.</strong>
        <ArrowRight size={18} />
        <strong>Structured safety lead out.</strong>
        <ArrowRight size={18} />
        <strong>Human reviewer in control.</strong>
      </div>
    </div>
  )
}

function MetricLite({ label, value, detail, tone = 'green' }: { label: string; value: string; detail: string; tone?: 'green' | 'red' | 'gold' }) {
  return (
    <div className={`pitch-demo-metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  )
}

function ArrowConnector() {
  return (
    <div className="pitch-demo-arrow" aria-hidden="true">
      <ArrowRight size={18} />
    </div>
  )
}
