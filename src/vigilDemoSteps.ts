export type SceneKey = 'intake' | 'workbench' | 'intelligence'

export type DemoStep = {
  id: string
  scene: SceneKey
  label: string
  title: string
  subtitle: string
  takeaway: string
  focus: string
}

export const vigilDemoSteps: DemoStep[] = [
  {
    id: '1A',
    scene: 'intake',
    label: 'Touchpoints',
    title: 'VIGIL helps the patient tell the story.',
    subtitle: 'No portal. No form. The agent asks sponsor-approved follow-up questions and extracts PV-ready context.',
    takeaway: 'Start where the patient already talks.',
    focus: 'touchpoints',
  },
  {
    id: '1B',
    scene: 'intake',
    label: 'Patient signal',
    title: 'VIGIL helps the patient tell the story.',
    subtitle: 'No portal. No form. The agent asks sponsor-approved follow-up questions and extracts PV-ready context.',
    takeaway: 'Capture the first vague safety clue.',
    focus: 'patient-says',
  },
  {
    id: '1C',
    scene: 'intake',
    label: 'Follow-up',
    title: 'VIGIL helps the patient tell the story.',
    subtitle: 'No portal. No form. The agent asks sponsor-approved follow-up questions and extracts PV-ready context.',
    takeaway: 'Ask only the missing PV essentials.',
    focus: 'vigil-asks',
  },
  {
    id: '1D',
    scene: 'intake',
    label: 'Context added',
    title: 'VIGIL helps the patient tell the story.',
    subtitle: 'No portal. No form. The agent asks sponsor-approved follow-up questions and extracts PV-ready context.',
    takeaway: 'Add patient and caregiver context.',
    focus: 'context',
  },
  {
    id: '1E',
    scene: 'intake',
    label: 'Lead created',
    title: 'VIGIL helps the patient tell the story.',
    subtitle: 'No portal. No form. The agent asks sponsor-approved follow-up questions and extracts PV-ready context.',
    takeaway: 'Create a review-ready safety lead.',
    focus: 'lead-created',
  },
  {
    id: '2A',
    scene: 'workbench',
    label: 'Workbench opens',
    title: 'A natural conversation becomes PV-ready intake.',
    subtitle: 'A safety lead lands with source evidence, gaps, and reviewer controls preserved.',
    takeaway: 'Open the case with source, status, and urgency.',
    focus: 'workbench-open',
  },
  {
    id: '2B',
    scene: 'workbench',
    label: 'Source evidence',
    title: 'A natural conversation becomes PV-ready intake.',
    subtitle: 'A safety lead lands with source evidence, gaps, and reviewer controls preserved.',
    takeaway: 'Keep the original words beside the draft.',
    focus: 'source-evidence',
  },
  {
    id: '2C',
    scene: 'workbench',
    label: 'Structured lead',
    title: 'A natural conversation becomes PV-ready intake.',
    subtitle: 'A safety lead lands with source evidence, gaps, and reviewer controls preserved.',
    takeaway: 'Show extracted fields, not AI conclusions.',
    focus: 'structured-lead',
  },
  {
    id: '2D',
    scene: 'workbench',
    label: 'Follow-up needed',
    title: 'A natural conversation becomes PV-ready intake.',
    subtitle: 'A safety lead lands with source evidence, gaps, and reviewer controls preserved.',
    takeaway: 'Surface gaps before handoff.',
    focus: 'missing-fields',
  },
  {
    id: '2E',
    scene: 'workbench',
    label: 'Human controls',
    title: 'A natural conversation becomes PV-ready intake.',
    subtitle: 'A safety lead lands with source evidence, gaps, and reviewer controls preserved.',
    takeaway: 'Keep reviewer decisions in control.',
    focus: 'review-controls',
  },
  {
    id: '3A',
    scene: 'intelligence',
    label: 'Captured clue',
    title: 'Program Safety Intelligence',
    subtitle: 'Early patient-generated safety intelligence feeding sponsor-led signal review.',
    takeaway: 'Roll one case into program visibility.',
    focus: 'program-kpis',
  },
  {
    id: '3B',
    scene: 'intelligence',
    label: 'Pipeline',
    title: 'Program Safety Intelligence',
    subtitle: 'Early patient-generated safety intelligence feeding sponsor-led signal review.',
    takeaway: 'Show where every safety lead sits.',
    focus: 'pipeline',
  },
  {
    id: '3C',
    scene: 'intelligence',
    label: 'Patterns',
    title: 'Program Safety Intelligence',
    subtitle: 'Early patient-generated safety intelligence feeding sponsor-led signal review.',
    takeaway: 'Spot patterns without confirming signals.',
    focus: 'patterns',
  },
  {
    id: '3D',
    scene: 'intelligence',
    label: 'Compliance',
    title: 'Program Safety Intelligence',
    subtitle: 'Early patient-generated safety intelligence feeding sponsor-led signal review.',
    takeaway: 'Keep evidence, roles, and auditability close.',
    focus: 'compliance',
  },
]
