import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode, RefObject } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Database,
  FileJson,
  FileText,
  MessageCircle,
  Mic2,
  PackageCheck,
  PhoneCall,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
} from 'lucide-react'
import { vigilDemoSteps, type DemoStep } from './vigilDemoSteps'
import './VigilDemo.css'

type IconComponent = typeof ShieldCheck

const patientQuote = 'New pill made me dizzy. I skipped it yesterday because I was afraid I would fall.'
const caregiverQuote = 'She seemed confused and almost fell in the bathroom.'

const guardrailPills = ['Human-in-the-loop', 'Sponsor-controlled', 'No autonomous reporting', 'Audit-ready']

const autoplayDurationsMs: Record<string, number> = {
  // Conversation Intake: 29.0s
  '1A': 6200,
  '1B': 5200,
  '1C': 6200,
  '1D': 5600,
  '1E': 5800,
  // Safety Lead Workbench: 34.0s
  '2A': 6200,
  '2B': 7200,
  '2C': 7000,
  '2D': 6600,
  '2E': 7000,
  // Program Safety Intelligence: 24.0s
  '3A': 6000,
  '3B': 6000,
  '3C': 5800,
  '3D': 6200,
}

const touchpoints: Array<{ label: string; clue: string; icon: IconComponent }> = [
  { label: 'Phone call', clue: 'New pill made me dizzy...', icon: PhoneCall },
  { label: 'Mobile app', clue: 'Missed dose confirmed', icon: Smartphone },
  { label: 'WhatsApp', clue: 'I nearly fell today.', icon: MessageCircle },
  { label: 'Smart speaker', clue: 'Still feeling unsteady today.', icon: Mic2 },
  { label: 'Caregiver app', clue: 'She seemed confused and almost fell...', icon: Users },
]

const followUpQuestions = [
  'When did it start?',
  'Did you miss a dose?',
  'Did you fall or need medical help?',
  'Can we ask your caregiver to confirm?',
]

const followUpSignals = ['onset', 'adherence', 'fall risk', 'caregiver context']

const leadFields = [
  ['Potential event', 'dizziness / near fall'],
  ['Medication issue', 'missed dose'],
  ['Caregiver context', 'confusion + near-fall concern'],
  ['Missing fields', 'onset, outcome, medical attention, concomitant meds'],
  ['Next step', 'human PV review'],
]

const workbenchFacts = [
  ['Status', 'human review required'],
  ['Completeness', '82%'],
  ['Priority', 'urgent review'],
  ['Source', 'phone + caregiver app'],
]

const structuredLead = [
  ['Potential event', 'dizziness / near fall'],
  ['Medication issue', 'missed dose'],
  ['Suspect product', 'CardioPress 10 mg'],
  ['Reporter', 'patient + caregiver'],
  ['Timing', 'after medication start'],
  ['Status', 'human review required'],
  ['Completeness', '82%'],
]

const missingFields = [
  ['Exact onset date', 'required'],
  ['Outcome', 'required'],
  ['Medical attention', 'required'],
  ['Concomitant medications', 'recommended'],
]

const pipeline = [
  ['Urgent review', '4'],
  ['AI draft structured', '28'],
  ['Needs follow-up', '11'],
  ['In medical review', '6'],
  ['Ready for handoff', '9'],
  ['Exported / closed', '18'],
]

const patterns = [
  ['Dizziness', 'review'],
  ['Missed doses', 'monitor'],
  ['Falls / near falls', 'review'],
  ['Caregiver-confirmed deterioration', 'monitor'],
  ['Therapeutic failure concerns', 'baseline'],
]

const complianceItems: Array<{ label: string; detail: string; icon: IconComponent }> = [
  { label: 'Audit Trail', detail: 'Every edit and decision logged', icon: Clock3 },
  { label: 'Access & Roles', detail: 'Reviewer permissions preserved', icon: Users },
  { label: 'Consent Records', detail: 'Patient and caregiver consent', icon: ClipboardCheck },
  { label: 'Validation Evidence', detail: 'Extraction quality checks', icon: ShieldCheck },
  { label: 'SOP Mapping', detail: 'Sponsor-approved workflows', icon: PackageCheck },
  { label: 'Model & Prompt Logs', detail: 'Versioned AI activity', icon: Bot },
  { label: 'Export History', detail: 'Traceable handoff packets', icon: FileJson },
  { label: 'Data Lineage', detail: 'Source to reviewer trail', icon: Database },
]

function clampStep(value: number) {
  return Math.max(0, Math.min(vigilDemoSteps.length - 1, value))
}

function parseStep(value: string | null, offset: number) {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) ? clampStep(parsed + offset) : null
}

function getQueryMode() {
  if (typeof window === 'undefined') {
    return { autoplay: false, exportFrames: false, fixedFrame: null, initialStep: 0 }
  }

  const params = new URLSearchParams(window.location.search)
  const exportFrames = params.get('export') === 'frames'
  const explicitFrame = parseStep(params.get('frame'), 0)
  const requestedStep = parseStep(params.get('step'), -1)

  return {
    autoplay: params.get('autoplay') === '1',
    exportFrames,
    fixedFrame: explicitFrame ?? (exportFrames ? requestedStep : null),
    initialStep: requestedStep ?? explicitFrame ?? 0,
  }
}

function writeStepToUrl(stepIndex: number) {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  url.searchParams.set('step', String(stepIndex + 1))
  url.searchParams.delete('frame')
  window.history.replaceState(null, '', url)
}

function useViewportScale() {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const updateScale = () => {
      setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080))
    }

    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  return scale
}

function isFocus(step: DemoStep, focus: string) {
  return step.focus === focus
}

function Panel({ active, children, className = '' }: { active: boolean; children: ReactNode; className?: string }) {
  return <section className={`vigil-card ${active ? 'is-active' : ''} ${className}`}>{children}</section>
}

function MiniLabel({ children }: { children: ReactNode }) {
  return <p className="vigil-mini-label">{children}</p>
}

function QuoteCard({
  label,
  quote,
  active,
  source,
  className = '',
}: {
  label: string
  quote: string
  active: boolean
  source: string
  className?: string
}) {
  return (
    <div className={`vigil-quote-card ${active ? 'is-active' : ''} ${className}`}>
      <div className="vigil-card-topline">
        <MiniLabel>{label}</MiniLabel>
        <span>{source}</span>
      </div>
      <p>"{quote}"</p>
    </div>
  )
}

function DataRows({ rows, activeKey, compact = false }: { rows: string[][]; activeKey?: string; compact?: boolean }) {
  return (
    <div className={`vigil-data-rows ${compact ? 'is-compact' : ''}`}>
      {rows.map(([label, value]) => (
        <div
          key={label}
          className={`vigil-data-row ${activeKey && label.toLowerCase().includes(activeKey) ? 'is-highlighted' : ''}`}
        >
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  )
}

function EvidenceQuote({ label, quote, source }: { label: string; quote: string; source: string }) {
  return (
    <div className="vigil-evidence-quote">
      <div className="vigil-card-topline">
        <MiniLabel>{label}</MiniLabel>
        <span>{source}</span>
      </div>
      <p>"{quote}"</p>
    </div>
  )
}

function StructuredLeadGrid() {
  return (
    <div className="vigil-structured-grid">
      {structuredLead.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  )
}

function Header({ step }: { step: DemoStep }) {
  return (
    <header className="vigil-header">
      <div>
        <div className="vigil-title-lockup">
          <div className="vigil-logo-mark">
            <ShieldCheck size={24} />
          </div>
          <div>
            <p>VIGIL powered by VYVA</p>
            <h1>{step.title}</h1>
          </div>
        </div>
        <p className="vigil-subtitle">{step.subtitle}</p>
        <div className="vigil-step-cue">
          <span>{step.label}</span>
          <strong>{step.takeaway}</strong>
        </div>
      </div>
      <div className="vigil-guardrail-pills">
        {guardrailPills.map((pill) => (
          <span key={pill}>{pill}</span>
        ))}
      </div>
    </header>
  )
}

function PresentationBar({
  step,
  stepIndex,
  progressIndex = stepIndex,
  progressTotal = vigilDemoSteps.length,
  progressMarkers,
  marker = step.id,
  title,
  onBack,
  onNext,
  presentMode = false,
}: {
  step: DemoStep
  stepIndex: number
  progressIndex?: number
  progressTotal?: number
  progressMarkers?: string[]
  marker?: string
  title?: string
  onBack: () => void
  onNext: () => void
  presentMode?: boolean
}) {
  return (
    <nav className={`vigil-presentation-bar ${presentMode ? 'is-present-mode' : ''}`} aria-label="Demo progress">
      <div className="vigil-bar-title" aria-hidden={presentMode}>
        <span>{marker}</span>
        <strong>{title ?? (step.scene === 'intelligence' ? 'Program Safety Intelligence' : step.title)}</strong>
      </div>
      <div className="vigil-progress-wrap" aria-label={`Step ${progressIndex + 1} of ${progressTotal}`}>
        <div className="vigil-progress-rail">
          {(progressMarkers ?? vigilDemoSteps.map((item) => item.id)).map((item, index) => (
            <i
              key={`${item}-${index}`}
              className={index < progressIndex ? 'is-complete' : index === progressIndex ? 'is-current' : ''}
            />
          ))}
        </div>
        <span aria-hidden={presentMode}>{progressIndex + 1}/{progressTotal}</span>
      </div>
      <div className="vigil-nav-actions" aria-hidden={presentMode}>
        <button type="button" onClick={onBack} aria-label="Previous demo step">
          <ArrowLeft size={18} />
          Back
        </button>
        <button type="button" onClick={onNext} aria-label="Next demo step">
          Next
          <ArrowRight size={18} />
        </button>
      </div>
    </nav>
  )
}

function IntakeScene({ step }: { step: DemoStep }) {
  return (
    <div className="vigil-intake-grid">
      <div className="vigil-intake-flow" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <Panel active={isFocus(step, 'touchpoints')} className="vigil-touchpoint-panel vigil-stage-frame vigil-stage-touchpoints">
        <MiniLabel>Upstream data capture channels</MiniLabel>
        <div className="vigil-touchpoint-list">
          {touchpoints.map(({ label, clue, icon: Icon }) => (
            <div key={label}>
              <span>
                <Icon size={21} />
              </span>
              <p>
                <strong>{label}</strong>
                <small>{clue}</small>
              </p>
            </div>
          ))}
        </div>
        <div className="vigil-no-portal">
          <strong>No portal. No form.</strong>
          <span>The story starts in the channel the patient already uses.</span>
        </div>
      </Panel>

      <div className="vigil-intake-middle">
        <QuoteCard
          label="Patient says"
          quote="New pill made me dizzy."
          active={isFocus(step, 'patient-says')}
          source="Phone 09:42"
          className="vigil-stage-frame vigil-stage-patient-says"
        />
        <Panel active={isFocus(step, 'vigil-asks')} className="vigil-stage-frame vigil-stage-vigil-asks">
          <div className="vigil-agent-heading">
            <span>
              <Sparkles size={22} />
            </span>
            <div>
              <MiniLabel>VIGIL asks</MiniLabel>
              <h2>Sponsor-approved follow-up</h2>
            </div>
          </div>
          <div className="vigil-question-list">
            {followUpQuestions.map((question) => (
              <div key={question}>{question}</div>
            ))}
          </div>
          <div className="vigil-ai-chip-row" aria-label="AI extracts">
            <span>AI extracts</span>
            {followUpSignals.map((signal) => (
              <strong key={signal}>{signal}</strong>
            ))}
          </div>
        </Panel>
        <div className={`vigil-context-grid vigil-stage-frame vigil-stage-context ${isFocus(step, 'context') ? 'is-active-stage' : ''}`}>
          <QuoteCard
            label="Patient adds"
            quote="I skipped it yesterday because I was afraid I would fall."
            active={isFocus(step, 'context')}
            source="Follow-up"
          />
          <QuoteCard label="Caregiver adds" quote={caregiverQuote} active={isFocus(step, 'context')} source="Caregiver app" />
        </div>
      </div>

      <Panel active={isFocus(step, 'lead-created')} className="vigil-lead-panel vigil-stage-frame vigil-stage-lead-created">
        <div className="vigil-card-topline">
          <MiniLabel>Structured safety lead created</MiniLabel>
          <span className="vigil-alert-pill">Human PV review required</span>
        </div>
        <h2>SL-01001</h2>
        <p>Product: CardioPress 10 mg</p>
        <DataRows rows={leadFields} />
        <div className="vigil-lead-callout">
          <div>
            <span className="vigil-callout-kicker">Structured handoff</span>
            <strong>Safety lead ready for human review.</strong>
          </div>
          <div className="vigil-lead-route">
            <span>Workbench</span>
            <ArrowRight size={18} />
            <strong>SL-01001</strong>
            <em>Human PV review required</em>
          </div>
        </div>
      </Panel>
    </div>
  )
}

function WorkbenchScene({ step }: { step: DemoStep }) {
  return (
    <div className="vigil-workbench-grid">
      <div className="vigil-workbench-flow" aria-hidden="true">
        <span />
        <span />
      </div>
      <Panel active={isFocus(step, 'workbench-open')} className="vigil-workbench-summary vigil-stage-frame vigil-stage-workbench-open">
        <MiniLabel>Safety Lead Workbench</MiniLabel>
        <h2>SL-01001</h2>
        <p>Dizziness + missed dose; near-fall risk</p>
        <DataRows rows={workbenchFacts} compact />
        <div className="vigil-summary-metrics">
          <div>
            <strong>82%</strong>
            <span>Completeness</span>
          </div>
          <div>
            <strong>urgent</strong>
            <span>Review</span>
          </div>
        </div>
      </Panel>

      <div className="vigil-workbench-middle">
        <Panel active={isFocus(step, 'source-evidence')} className="vigil-stage-frame vigil-stage-source-evidence">
          <div className="vigil-card-topline">
            <MiniLabel>Source evidence preserved</MiniLabel>
            <span>original words - channel - timestamp</span>
          </div>
          <div className="vigil-evidence-stack">
            <EvidenceQuote label="Patient voice" quote={patientQuote} source="Phone 09:42" />
            <EvidenceQuote label="Caregiver context" quote={caregiverQuote} source="Caregiver app 09:58" />
          </div>
          <p className="vigil-small-note">Follow-up path preserved: patient prompt - caregiver confirmation - reviewer route.</p>
        </Panel>

        <Panel active={isFocus(step, 'structured-lead')} className="vigil-stage-frame vigil-stage-structured-lead">
          <div className="vigil-card-topline">
            <MiniLabel>Structured safety lead</MiniLabel>
            <span className="vigil-draft-pill">AI draft - human review required</span>
          </div>
          <StructuredLeadGrid />
        </Panel>
      </div>

      <div className="vigil-workbench-right">
        <Panel active={isFocus(step, 'missing-fields')} className="vigil-stage-frame vigil-stage-missing-fields">
          <div className="vigil-warning-heading">
            <AlertTriangle size={26} />
            <div>
              <MiniLabel>Follow-up needed before handoff</MiniLabel>
              <h2>Missing fields surfaced</h2>
            </div>
          </div>
          <div className="vigil-missing-list">
            {missingFields.map(([field, status]) => (
              <div key={field}>
                <strong>{field}</strong>
                <span>{status}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel active={isFocus(step, 'review-controls')} className="vigil-review-controls vigil-stage-frame vigil-stage-review-controls">
          <MiniLabel>Human PV review controls</MiniLabel>
          <div className="vigil-control-fields">
            {[
              ['Assessment', 'pending'],
              ['Causality', 'not assessed by AI'],
              ['Seriousness', 'reviewer decision required'],
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <div className="vigil-action-row">
            {[
              ['Request follow-up', FileText],
              ['Ask caregiver', Users],
              ['Prepare handoff package', PackageCheck],
            ].map(([action, Icon]) => (
              <button key={action as string} type="button">
                <Icon size={14} />
                {action as string}
              </button>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}

function IntelligenceScene({ step }: { step: DemoStep }) {
  return (
    <div className="vigil-intel-grid">
      <div className="vigil-intel-left">
        <Panel active={isFocus(step, 'program-kpis')} className="vigil-stage-frame vigil-stage-program-kpis">
          <div className="vigil-latest-clue">
            <div>
              <MiniLabel>Latest captured clue</MiniLabel>
              <p>Same case: SL-01001 - Phone 09:42 - "New pill made me dizzy" - AI draft structured - human review required</p>
            </div>
            <Sparkles size={42} />
          </div>
          <div className="vigil-kpi-grid">
            {[
              ['Active patients', '248'],
              ['Interactions today', '76'],
              ['Urgent review', '4'],
              ['Avg completeness', '82%'],
            ].map(([label, value]) => (
              <div key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel active={isFocus(step, 'pipeline')} className="vigil-stage-frame vigil-stage-pipeline">
          <div className="vigil-card-topline">
            <MiniLabel>Safety pipeline</MiniLabel>
            <Activity size={28} />
          </div>
          <div className="vigil-pipeline">
            {pipeline.map(([label, value], index) => (
              <div key={label}>
                <span>{label}</span>
                <i>
                  <b style={{ '--bar-width': `${92 - index * 10}%` } as CSSProperties} />
                </i>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="vigil-intel-right">
        <Panel active={isFocus(step, 'patterns')} className="vigil-stage-frame vigil-stage-patterns">
          <MiniLabel>Emerging patient-generated patterns</MiniLabel>
          <div className="vigil-patterns">
            {patterns.map(([pattern, status]) => (
              <div key={pattern}>
                <strong>{pattern}</strong>
                <span className={status === 'review' ? 'is-review' : ''}>{status}</span>
              </div>
            ))}
          </div>
          <p className="vigil-sponsor-note">For sponsor-led safety review. Not autonomous signal confirmation.</p>
        </Panel>

        <Panel active={isFocus(step, 'compliance')} className="vigil-compliance-card vigil-stage-frame vigil-stage-compliance">
          <MiniLabel>Compliance Center</MiniLabel>
          <div className="vigil-compliance-grid">
            {complianceItems.map(({ label, detail, icon: Icon }) => (
              <div className="vigil-compliance-item" key={label}>
                <span>
                  <Icon size={17} />
                </span>
                <strong>{label}</strong>
                <small>{detail}</small>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}

function WorkflowStrip({ step }: { step: DemoStep }) {
  const items = ['patient clue', 'AI follow-up', 'safety lead', 'human review', 'program view']
  const activeIndex =
    step.scene === 'intake'
      ? step.focus === 'vigil-asks'
        ? 1
        : step.focus === 'lead-created'
          ? 2
          : 0
      : step.scene === 'workbench'
        ? 3
        : 4

  return (
    <div className="vigil-workflow-strip">
      <div>
        {items.map((item, index) => (
          <span key={item} className={index <= activeIndex ? 'is-active' : ''}>
            {item}
            {index < items.length - 1 ? <ArrowRight size={15} /> : null}
          </span>
        ))}
      </div>
      <p>{step.takeaway}</p>
    </div>
  )
}

function CurrentScene({ step }: { step: DemoStep }) {
  if (step.scene === 'intake') return <IntakeScene step={step} />
  if (step.scene === 'workbench') return <WorkbenchScene step={step} />
  return <IntelligenceScene step={step} />
}

export function VigilDemoFrame({
  stepIndex,
  scale = 1,
  onBack,
  onNext,
  exportFrames = false,
  autoplay = false,
  presentMode = false,
  progressIndex,
  progressTotal,
  progressMarkers,
  marker,
  title,
  frameRef,
}: {
  stepIndex: number
  scale?: number
  onBack: () => void
  onNext: () => void
  exportFrames?: boolean
  autoplay?: boolean
  presentMode?: boolean
  progressIndex?: number
  progressTotal?: number
  progressMarkers?: string[]
  marker?: string
  title?: string
  frameRef?: RefObject<HTMLElement | null>
}) {
  const clampedStepIndex = clampStep(stepIndex)
  const step = vigilDemoSteps[clampedStepIndex]

  return (
    <main
      className={`vigil-standalone-page scene-${step.scene} focus-${step.focus} ${exportFrames ? 'is-export' : ''} ${autoplay ? 'is-autoplay' : ''} ${presentMode ? 'is-present-mode' : ''}`}
      data-testid="vigil-demo"
    >
      <div className="vigil-background" />
      <div className="vigil-scale-stage">
        <div style={{ width: `${1920 * scale}px`, height: `${1080 * scale}px` }}>
          <section
            ref={frameRef}
            className="vigil-canvas"
            style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
          >
            <PresentationBar
              step={step}
              stepIndex={clampedStepIndex}
              progressIndex={progressIndex}
              progressTotal={progressTotal}
              progressMarkers={progressMarkers}
              marker={marker}
              title={title}
              onBack={onBack}
              onNext={onNext}
              presentMode={presentMode}
            />
            <Header step={step} />
            <CurrentScene key={step.id} step={step} />
            <div className="vigil-bottom-stack">
              <WorkflowStrip step={step} />
            </div>
          </section>
        </div>
      </div>
      {exportFrames ? (
        <div className="vigil-mode-badge">Export frame mode - use ?frame=0-{vigilDemoSteps.length - 1}</div>
      ) : null}
      {autoplay ? (
        <div className="vigil-autoplay-badge">
          <Sparkles size={14} /> Autoplay recording mode
        </div>
      ) : null}
    </main>
  )
}

export default function VigilDemoScreen() {
  const [queryMode] = useState(getQueryMode)
  const scale = useViewportScale()
  const frameRef = useRef<HTMLElement | null>(null)
  const [manualIndex, setManualIndex] = useState(queryMode.initialStep)
  const stepIndex = queryMode.fixedFrame ?? manualIndex
  const step = vigilDemoSteps[stepIndex]

  const commitStep = useCallback(
    (nextIndex: number) => {
      if (queryMode.fixedFrame !== null) return
      const clamped = clampStep(nextIndex)
      setManualIndex(clamped)
      writeStepToUrl(clamped)
    },
    [queryMode.fixedFrame],
  )

  const goNext = useCallback(() => commitStep(manualIndex + 1), [commitStep, manualIndex])
  const goBack = useCallback(() => commitStep(manualIndex - 1), [commitStep, manualIndex])
  const restart = useCallback(() => commitStep(0), [commitStep])

  useEffect(() => {
    if (!queryMode.autoplay || queryMode.fixedFrame !== null) return undefined
    const scenePause = autoplayDurationsMs[step.id] ?? 6000
    const timer = window.setTimeout(() => {
      setManualIndex((index) => {
        const nextIndex = index >= vigilDemoSteps.length - 1 ? 0 : index + 1
        writeStepToUrl(nextIndex)
        return nextIndex
      })
    }, scenePause)
    return () => window.clearTimeout(timer)
  }, [queryMode.autoplay, queryMode.fixedFrame, step.id])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (queryMode.fixedFrame !== null) return
      if (event.key === 'ArrowRight' || event.key === ' ') {
        event.preventDefault()
        goNext()
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goBack()
      }
      if (event.key.toLowerCase() === 'r') {
        event.preventDefault()
        restart()
      }
      if (event.key.toLowerCase() === 'f') {
        event.preventDefault()
        if (!document.fullscreenElement) {
          void frameRef.current?.requestFullscreen?.()
        } else {
          void document.exitFullscreen?.()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goBack, goNext, queryMode.fixedFrame, restart])

  return (
    <>
      <VigilDemoFrame
        stepIndex={stepIndex}
        scale={scale}
        onBack={goBack}
        onNext={goNext}
        exportFrames={queryMode.exportFrames}
        autoplay={queryMode.autoplay}
        frameRef={frameRef}
      />
      <button type="button" className="vigil-sr-only" onClick={goNext}>
        Next demo step
      </button>
      <button type="button" className="vigil-sr-only" onClick={goBack}>
        Previous demo step
      </button>
      <CheckCircle2 className="vigil-sr-only" aria-label="VIGIL demo loaded" />
    </>
  )
}
