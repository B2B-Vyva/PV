import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode, RefObject } from 'react'
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  MessageCircle,
  Mic2,
  PackageCheck,
  PhoneCall,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
} from 'lucide-react'
import { VigilDemoFrame } from './VigilDemo'
import { vigilDemoSteps } from './vigilDemoSteps'
import './VigilPitch.css'

type PitchStep =
  | {
      kind: 'cover' | 'problem' | 'solution' | 'ask' | 'why'
      marker: string
      label: string
      duration: number
      speakerCue?: string
    }
  | {
      kind: 'demo'
      marker: string
      label: string
      duration: number
      demoIndex: number
      speakerCue?: string
    }

type IconComponent = typeof ShieldCheck

const trustChips = ['Human-in-the-loop', 'Sponsor-controlled', 'No autonomous reporting', 'Audit-ready']

const extendedTrustChips = [
  'Human-in-the-loop',
  'Sponsor-controlled',
  'No autonomous reporting',
  'Causality not assessed by AI',
]

const demoPitchIndices = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
const demoDurationsByIndex: Record<number, number> = {
  2: 1400,
  3: 6200,
  4: 7200,
  5: 6200,
  6: 7000,
  7: 7600,
  8: 7000,
  9: 7200,
  10: 5600,
  11: 6000,
  12: 5600,
  13: 5800,
  14: 6400,
}

function getDemoMarker(index: number) {
  if (index < 5) return `4${String.fromCharCode(63 + index)}`
  if (index < 10) return `5${String.fromCharCode(65 + index - 5)}`
  return `6${String.fromCharCode(65 + index - 10)}`
}

function getDemoLabel(index: number) {
  const step = vigilDemoSteps[index]
  if (step.scene === 'intake') return 'Demo: Conversation Intake'
  if (step.scene === 'workbench') return 'Demo: Safety Lead Workbench'
  return 'Demo: Program Safety Intelligence'
}

const pitchSteps: PitchStep[] = [
  { kind: 'cover', marker: '1', label: 'Cover', duration: 5000 },
  { kind: 'problem', marker: '2', label: 'Problem', duration: 21000 },
  {
    kind: 'solution',
    marker: '3',
    label: 'Solution',
    duration: 21000,
    speakerCue: 'Let me show that through one safety lead.',
  },
  ...demoPitchIndices.map((index) => ({
    kind: 'demo' as const,
    marker: getDemoMarker(index),
    label: getDemoLabel(index),
    duration: demoDurationsByIndex[index] ?? 6000,
    demoIndex: index,
  })),
  {
    kind: 'ask',
    marker: '7',
    label: 'The Ask',
    duration: 20000,
    speakerCue: 'That is the workflow we want to validate with pharma partners.',
  },
  { kind: 'why', marker: '8', label: 'Why VYVA', duration: 17000 },
]

const progressMarkers = pitchSteps.map((step) => step.marker)
const pitchTargetMs = 180000
const medwatchPages = [
  '/vigil-media/fda-3500b-page-1.png',
  '/vigil-media/fda-3500b-page-2.png',
  '/vigil-media/fda-3500b-page-3.png',
]

function clampPitchStep(value: number) {
  return Math.max(0, Math.min(pitchSteps.length - 1, value))
}

function parsePitchStep(value: string | null, offset: number) {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) ? clampPitchStep(parsed + offset) : null
}

function getPitchQueryMode() {
  if (typeof window === 'undefined') {
    return { autoplay: false, exportFrames: false, fixedFrame: null, initialStep: 0, presentMode: false }
  }

  const params = new URLSearchParams(window.location.search)
  const exportFrames = params.get('export') === 'frames'
  const explicitFrame = parsePitchStep(params.get('frame'), 0)
  const requestedStep = parsePitchStep(params.get('step'), -1)
  const autoplay = params.get('autoplay') === '1'

  return {
    autoplay,
    exportFrames,
    fixedFrame: explicitFrame ?? (exportFrames ? requestedStep : null),
    initialStep: requestedStep ?? explicitFrame ?? 0,
    presentMode: params.get('present') === '1' || autoplay,
  }
}

function writePitchStepToUrl(stepIndex: number) {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  url.searchParams.set('step', String(stepIndex + 1))
  url.searchParams.delete('frame')
  window.history.replaceState(null, '', url)
}

function usePitchScale() {
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

function PitchBar({
  step,
  stepIndex,
  onBack,
  onNext,
  presentMode,
}: {
  step: PitchStep
  stepIndex: number
  onBack: () => void
  onNext: () => void
  presentMode: boolean
}) {
  return (
    <nav
      className={`vigil-pitch-bar ${presentMode ? 'is-present-mode' : ''}`}
      aria-label="Pitch progress"
      style={{ '--progress-count': pitchSteps.length } as CSSProperties}
    >
      <div className="vigil-pitch-bar-title" aria-hidden={presentMode}>
        <span>{step.marker}</span>
        <strong>{step.label}</strong>
      </div>
      <div className="vigil-pitch-progress" aria-label={`Step ${stepIndex + 1} of ${pitchSteps.length}`}>
        <div className="vigil-pitch-progress-rail">
          {progressMarkers.map((marker, index) => (
            <i
              key={`${marker}-${index}`}
              className={index < stepIndex ? 'is-complete' : index === stepIndex ? 'is-current' : ''}
            />
          ))}
        </div>
        <span aria-hidden={presentMode}>{stepIndex + 1}/{pitchSteps.length}</span>
      </div>
      <div className="vigil-pitch-nav-actions" aria-hidden={presentMode}>
        <button type="button" onClick={onBack} aria-label="Previous slide">
          <ArrowLeft size={19} />
          Back
        </button>
        <button type="button" onClick={onNext} aria-label="Next slide">
          Next
          <ArrowRight size={19} />
        </button>
      </div>
    </nav>
  )
}

function PitchFrame({
  step,
  stepIndex,
  scale,
  onBack,
  onNext,
  frameRef,
  presentMode,
  children,
}: {
  step: PitchStep
  stepIndex: number
  scale: number
  onBack: () => void
  onNext: () => void
  frameRef: RefObject<HTMLElement | null>
  presentMode: boolean
  children: ReactNode
}) {
  return (
    <main className={`vigil-pitch-page slide-${step.kind} ${presentMode ? 'is-present-mode' : ''}`} data-testid="vigil-pitch">
      <div className="vigil-pitch-background" />
      <div className="vigil-pitch-scale-stage">
        <div style={{ width: `${1920 * scale}px`, height: `${1080 * scale}px` }}>
          <section
            ref={frameRef}
            className="vigil-pitch-canvas"
            style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
          >
            <PitchBar step={step} stepIndex={stepIndex} onBack={onBack} onNext={onNext} presentMode={presentMode} />
            <div className="vigil-pitch-slide-wrap" key={`${step.marker}-${step.kind}`}>
              {children}
            </div>
            <PresenterGuide stepIndex={stepIndex} presentMode={presentMode} />
            {step.speakerCue ? <p className="vigil-pitch-speaker-note">Presenter cue: {step.speakerCue}</p> : null}
          </section>
        </div>
      </div>
    </main>
  )
}

function formatPitchTime(ms: number) {
  const safeSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = String(safeSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

function PresenterGuide({ stepIndex, presentMode }: { stepIndex: number; presentMode: boolean }) {
  const [elapsedMs, setElapsedMs] = useState(0)
  const startRef = useRef(0)

  useEffect(() => {
    if (!presentMode) return

    startRef.current = window.performance.now()
    setElapsedMs(0)

    const timer = window.setInterval(() => {
      setElapsedMs(window.performance.now() - startRef.current)
    }, 250)

    return () => window.clearInterval(timer)
  }, [presentMode])

  useEffect(() => {
    if (!presentMode || stepIndex !== 0) return

    startRef.current = window.performance.now()
    setElapsedMs(0)
  }, [presentMode, stepIndex])

  if (!presentMode) return null

  const remainingMs = Math.max(0, pitchTargetMs - elapsedMs)
  const slideProgress = pitchSteps.length <= 1 ? 1 : stepIndex / (pitchSteps.length - 1)
  const timeProgress = Math.min(1, elapsedMs / pitchTargetMs)

  return (
    <aside
      className="vigil-presenter-guide"
      aria-label="Presenter guide"
      style={
        {
          '--slide-progress': `${slideProgress * 100}%`,
          '--time-progress': `${timeProgress * 100}%`,
        } as CSSProperties
      }
    >
      <div className="vigil-presenter-time">
        <span>{formatPitchTime(remainingMs)}</span>
        <small>3 min</small>
      </div>
      <div className="vigil-presenter-rail" aria-hidden="true">
        <i />
      </div>
      <strong>{stepIndex + 1}/{pitchSteps.length}</strong>
    </aside>
  )
}

function TrustRow({ chips = trustChips }: { chips?: string[] }) {
  return (
    <div className="vigil-pitch-trust-row">
      {chips.map((chip) => (
        <span key={chip}>
          <ShieldCheck size={16} />
          {chip}
        </span>
      ))}
    </div>
  )
}

function CoverSlide() {
  return (
    <section className="vigil-pitch-slide vigil-cover-slide">
      <div className="vigil-cover-signal" aria-hidden="true">
        {Array.from({ length: 18 }, (_, index) => (
          <span key={index} style={{ '--delay': `${index * 70}ms` } as CSSProperties} />
        ))}
      </div>
      <div className="vigil-cover-content">
        <div className="vigil-brand-kicker">
          <span>Powered by VYVA</span>
          <strong>Patient voice infrastructure for VIGIL</strong>
        </div>
        <h1>VIGIL</h1>
        <p className="vigil-cover-line">Turning patient conversations into structured safety leads</p>
        <p className="vigil-cover-descriptor">AI-powered adverse-event intake and patient voice intelligence</p>
        <TrustRow />
      </div>
      <div className="vigil-cover-footer">
        <span>R2GConnect Pharma HealthTech Innovation Pitching</span>
        <strong>June 30, 2026</strong>
      </div>
    </section>
  )
}

function ProblemSlide() {
  return (
    <section className="vigil-pitch-slide vigil-problem-slide">
      <div className="vigil-slide-heading is-centered">
        <p>Upstream case discovery problem</p>
        <h1>Patient safety intake still starts with paperwork.</h1>
      </div>
      <div className="vigil-medwatch-stage" aria-label="FDA MedWatch form example">
        <div className="vigil-medwatch-copy">
          <span>Current reality</span>
          <strong>Dense forms. Manual interpretation. Late context.</strong>
          <p>The patient story is forced into static paperwork before the safety team can act.</p>
        </div>
        <div className="vigil-medwatch-stack">
          {medwatchPages.map((page, index) => (
            <img
              key={page}
              src={page}
              alt={index === 0 ? 'FDA MedWatch Consumer Voluntary Reporting form' : ''}
              aria-hidden={index === 0 ? undefined : true}
            />
          ))}
        </div>
        <p className="vigil-medwatch-callout">Archaic intake is still carrying modern pharmacovigilance.</p>
      </div>
      <p className="vigil-bottom-line">The bottleneck is not just reporting. It is turning patient language into usable safety evidence.</p>
    </section>
  )
}

function SolutionSlide() {
  const channelIcons: IconComponent[] = [Smartphone, MessageCircle, PhoneCall, Mic2]
  const aiSteps = ['Ask', 'Extract', 'Enrich']

  return (
    <section className="vigil-pitch-slide vigil-solution-slide">
      <div className="vigil-slide-heading">
        <p>VIGIL powered by VYVA</p>
        <h1>Patient conversation becomes a structured safety lead.</h1>
        <span>AI intake prepares the case. Human PV review stays in control.</span>
      </div>
      <div className="vigil-solution-flow is-clean">
        <div className="vigil-conversation-node">
          <div className="vigil-conversation-orbit" aria-hidden="true">
            {channelIcons.map((Icon, index) => (
              <span key={String(index)}>
                <Icon size={28} />
              </span>
            ))}
          </div>
          <div className="vigil-conversation-core">
            <video src="/vigil-media/patient-voice.mp4" autoPlay muted loop playsInline aria-hidden="true" />
            <div className="vigil-patient-video-scrim" />
            <div className="vigil-patient-video-copy">
              <Users size={40} />
              <h2>Patient feedback</h2>
              <p>"This new pill is making me dizzy."</p>
            </div>
          </div>
        </div>
        <ArrowRight className="vigil-flow-arrow" size={42} />
        <div className="vigil-ai-zone">
          <div className="vigil-ai-zone-title">
            <Sparkles size={34} />
            <strong>AI intake</strong>
          </div>
          {aiSteps.map((title) => (
            <div key={title} className="vigil-ai-step">
              <span>{title}</span>
            </div>
          ))}
        </div>
        <ArrowRight className="vigil-flow-arrow" size={42} />
        <div className="vigil-human-node">
          <div className="vigil-flow-icon is-gold">
            <ShieldCheck size={40} />
          </div>
          <h2>Human PV review</h2>
          <p>Sponsor-controlled assessment, follow-up, and handoff.</p>
        </div>
        <ArrowRight className="vigil-flow-arrow" size={42} />
        <div className="vigil-output-card">
          <h2 className="vigil-output-title">
            <ClipboardCheck size={34} />
            Structured safety lead
          </h2>
          <strong>Human PV review required</strong>
        </div>
      </div>
      <TrustRow chips={['Human-in-the-loop', 'Sponsor-controlled', 'No autonomous reporting']} />
      <p className="vigil-bottom-line">Traditional AE forms collect fields. VIGIL captures the story.</p>
    </section>
  )
}

function AskSlide() {
  const steps = [
    {
      title: 'Validate',
      kicker: 'Controlled validation',
      time: '6-8 weeks',
      detail: 'Sponsor scripts, PSP scenarios, reviewer scoring.',
      icon: ClipboardCheck,
    },
    {
      title: 'Pilot',
      kicker: 'Limited live pilot',
      time: '12-16 weeks',
      detail: 'Live cohort, caregiver input, human PV review.',
      icon: Activity,
    },
    {
      title: 'Deploy',
      kicker: 'Flexible commercial models',
      time: 'Sponsor-fit',
      detail: 'Commercial model that fits the sponsor.',
      icon: PackageCheck,
    },
  ]
  const metrics = [
    'Same-day routing',
    'Audit-ready workflow',
    'Earlier safety visibility',
  ]

  return (
    <section className="vigil-pitch-slide vigil-ask-slide">
      <div className="vigil-slide-heading">
        <p>Partner path</p>
        <h1>The Ask</h1>
        <span>
          Seeking pharma partners to validate and deploy VIGIL as an AI-powered adverse-event intake and patient safety
          intelligence layer.
        </span>
      </div>
      <div className="vigil-ask-path">
        {steps.map(({ title, kicker, time, detail, icon: Icon }, index) => (
          <div key={title} className="vigil-ask-card">
            <div className="vigil-ask-number">{index + 1}</div>
            <Icon size={38} />
            <h2>{title}</h2>
            <strong>{kicker} - {time}</strong>
            <p>{detail}</p>
          </div>
        ))}
      </div>
      <div className="vigil-success-metrics">
        {metrics.map((metric) => (
          <span key={metric}>
            <CheckCircle2 size={18} />
            {metric}
          </span>
        ))}
      </div>
      <p className="vigil-bottom-line">Start controlled. Validate. Then deploy through the model that fits the sponsor.</p>
    </section>
  )
}

function WhySlide({ onStart }: { onStart: () => void }) {
  const proofPillars: Array<{
    title: string
    sentence: string
    keywords: string[]
    icon: IconComponent
  }> = [
    {
      title: 'AI patient voice',
      sentence: 'Natural conversations across channels.',
      keywords: ['Phone', 'App', 'WhatsApp', 'Desktop', 'Smart speaker-ready', 'Caregiver input'],
      icon: MessageCircle,
    },
    {
      title: 'Safety context',
      sentence: 'Richer clues than static forms.',
      keywords: ['Medication routines', 'Symptom checks', 'Vitals', 'Falls', 'Mood changes', 'Caregiver alerts'],
      icon: Activity,
    },
    {
      title: 'Closed-loop workflow',
      sentence: 'Action around the signal.',
      keywords: ['Patient interface', 'Caregiver input', 'Operations console', 'Follow-up', 'Human review', 'Sponsor handoff'],
      icon: PackageCheck,
    },
  ]

  return (
    <section className="vigil-pitch-slide vigil-why-slide">
      <div className="vigil-why-header">
        <div>
          <p className="vigil-why-kicker">Execution foundation</p>
          <h1>Why VYVA</h1>
        </div>
        <div className="vigil-why-opening">
          <h2>VIGIL is not starting from zero.</h2>
          <p>
            VYVA already gives hard-to-reach patients a voice. VIGIL turns that voice into pharma-grade safety intake.
          </p>
        </div>
      </div>

      <div className="vigil-why-pillars" aria-label="VYVA proof pillars">
        {proofPillars.map(({ title, sentence, keywords, icon: Icon }) => (
          <article className="vigil-why-pillar" key={title}>
            <div className="vigil-why-pillar-icon">
              <Icon size={34} />
            </div>
            <h3>{title}</h3>
            <p>{sentence}</p>
            <div className="vigil-why-keywords">
              {keywords.map((keyword) => (
                <span key={keyword}>{keyword}</span>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="vigil-why-proof-strip">
        <strong>Real-world deployment foundation</strong>
        <span>European Commission RURACTIVE pilot · German Red Cross / DRK project partner</span>
      </div>

      <div className="vigil-why-close-row">
        <p className="vigil-why-final-line">
          VYVA gives patients a voice. VIGIL makes that voice usable for pharmacovigilance.
        </p>
        <button className="vigil-why-start-button" type="button" onClick={onStart}>
          Start
          <ArrowRight size={24} />
        </button>
      </div>
    </section>
  )
}

function CurrentPitchSlide({ step, onStart }: { step: PitchStep; onStart: () => void }) {
  if (step.kind === 'cover') return <CoverSlide />
  if (step.kind === 'problem') return <ProblemSlide />
  if (step.kind === 'solution') return <SolutionSlide />
  if (step.kind === 'ask') return <AskSlide />
  return <WhySlide onStart={onStart} />
}

export default function VigilPitchScreen() {
  const [queryMode] = useState(getPitchQueryMode)
  const scale = usePitchScale()
  const frameRef = useRef<HTMLElement | null>(null)
  const [manualIndex, setManualIndex] = useState(queryMode.initialStep)
  const stepIndex = queryMode.fixedFrame ?? manualIndex
  const step = pitchSteps[stepIndex]

  const commitStep = useCallback(
    (nextIndex: number) => {
      if (queryMode.fixedFrame !== null) return
      const clamped = clampPitchStep(nextIndex)
      setManualIndex(clamped)
      writePitchStepToUrl(clamped)
    },
    [queryMode.fixedFrame],
  )

  const goNext = useCallback(() => commitStep(stepIndex + 1), [commitStep, stepIndex])
  const goBack = useCallback(() => commitStep(stepIndex - 1), [commitStep, stepIndex])
  const restart = useCallback(() => commitStep(0), [commitStep])

  useEffect(() => {
    if (!queryMode.autoplay || queryMode.fixedFrame !== null) return undefined
    if (stepIndex >= pitchSteps.length - 1) return undefined
    const timer = window.setTimeout(() => {
      setManualIndex((index) => {
        const nextIndex = index >= pitchSteps.length - 1 ? index : index + 1
        writePitchStepToUrl(nextIndex)
        return nextIndex
      })
    }, step.duration)
    return () => window.clearTimeout(timer)
  }, [queryMode.autoplay, queryMode.fixedFrame, step.duration, stepIndex])

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

  if (step.kind === 'demo') {
    return (
      <>
        <VigilDemoFrame
          stepIndex={step.demoIndex}
          scale={scale}
          onBack={goBack}
          onNext={goNext}
          exportFrames={queryMode.exportFrames}
          autoplay={queryMode.autoplay}
          presentMode={queryMode.presentMode}
          progressIndex={stepIndex}
          progressTotal={pitchSteps.length}
          progressMarkers={progressMarkers}
          marker={step.marker}
          title={step.label}
          frameRef={frameRef}
        />
        <div className="vigil-pitch-hidden-context" aria-hidden="true">
          <span>{extendedTrustChips.join(' | ')}</span>
        </div>
      </>
    )
  }

  return (
    <PitchFrame
      step={step}
      stepIndex={stepIndex}
      scale={scale}
      onBack={goBack}
      onNext={goNext}
      frameRef={frameRef}
      presentMode={queryMode.presentMode}
    >
      <CurrentPitchSlide step={step} onStart={restart} />
    </PitchFrame>
  )
}
