export type PitchInput = {
  projectName: string
  tagline: string
  problem: string
  audience: string
  solution: string
  features: string[]
  techStack: string[]
  impact: string
  demoPlan: string
  nextSteps: string[]
}

export type PitchSection = {
  id: string
  title: string
  body: string
  complete: boolean
}

export type Slide = {
  title: string
  bullets: string[]
}

export type PitchState = {
  input: PitchInput
  savedPitches: PitchInput[]
}

export const defaultPitch: PitchInput = {
  projectName: 'PitchCraft',
  tagline: 'Turn a hackathon idea into a clear, judge-ready pitch.',
  problem:
    'Hackathon builders often create useful projects but struggle to explain the problem, value, presentation flow, and technical choices clearly before the deadline.',
  audience:
    'Build Beyond participants, solo hackers, beginner teams, mentors, and students preparing a project submission.',
  solution:
    'PitchCraft guides teams through the essential parts of a project pitch, scores readiness, and generates a concise presentation outline and Devpost-ready summary.',
  features: [
    'Guided pitch fields for problem, audience, solution, impact, and presentation flow',
    'Readiness score based on required pitch sections',
    'Auto-generated slide outline',
    'Markdown export for Devpost or a presentation script',
    'Local persistence with saved pitch snapshots',
  ],
  techStack: ['React', 'TypeScript', 'Vite', 'LocalStorage', 'CSS'],
  impact:
    'Teams can communicate their work faster, reduce last-minute confusion, and present projects with a stronger story.',
  demoPlan:
    'Walk through the project story, readiness score, generated slide outline, saved snapshots, and final Markdown export.',
  nextSteps: ['Add shareable links', 'Add PDF export', 'Support team feedback comments'],
}

export const defaultPitchState: PitchState = {
  input: defaultPitch,
  savedPitches: [],
}

const isCompleteText = (value: string): boolean => value.trim().length >= 12

export const normalizeList = (items: string[]): string[] =>
  items.map((item) => item.trim()).filter((item) => item.length > 0)

const listText = (items: string[], fallback: string): string => {
  const cleanItems = normalizeList(items)

  if (cleanItems.length === 0) {
    return fallback
  }

  return cleanItems.map((item) => `- ${item}`).join('\n')
}

export const buildPitchSections = (input: PitchInput): PitchSection[] => [
  {
    id: 'name',
    title: 'Project Name',
    body: input.projectName.trim(),
    complete: input.projectName.trim().length >= 3,
  },
  {
    id: 'tagline',
    title: 'Tagline',
    body: input.tagline.trim(),
    complete: isCompleteText(input.tagline),
  },
  {
    id: 'problem',
    title: 'Problem',
    body: input.problem.trim(),
    complete: isCompleteText(input.problem),
  },
  {
    id: 'audience',
    title: 'Audience',
    body: input.audience.trim(),
    complete: isCompleteText(input.audience),
  },
  {
    id: 'solution',
    title: 'Solution',
    body: input.solution.trim(),
    complete: isCompleteText(input.solution),
  },
  {
    id: 'features',
    title: 'Main Features',
    body: listText(input.features, 'No features added yet.'),
    complete: normalizeList(input.features).length >= 3,
  },
  {
    id: 'stack',
    title: 'Technology Stack',
    body: listText(input.techStack, 'No technologies added yet.'),
    complete: normalizeList(input.techStack).length >= 2,
  },
  {
    id: 'impact',
    title: 'Impact',
    body: input.impact.trim(),
    complete: isCompleteText(input.impact),
  },
  {
    id: 'demo',
    title: 'Presentation Plan',
    body: input.demoPlan.trim(),
    complete: isCompleteText(input.demoPlan),
  },
]

export const calculatePitchScore = (input: PitchInput): number => {
  const sections = buildPitchSections(input)
  const completedSections = sections.filter((section) => section.complete).length

  return Math.round((completedSections / sections.length) * 100)
}

export const generateSlides = (input: PitchInput): Slide[] => [
  {
    title: `${input.projectName || 'Project'}: ${input.tagline || 'Hackathon pitch'}`,
    bullets: [input.audience || 'Define who this is for', input.impact || 'Define the expected impact'],
  },
  {
    title: 'Problem',
    bullets: [input.problem || 'Describe the pain point', `Audience: ${input.audience || 'Not defined yet'}`],
  },
  {
    title: 'Solution',
    bullets: [input.solution || 'Describe the solution', ...normalizeList(input.features).slice(0, 3)],
  },
  {
    title: 'Build',
    bullets: [`Stack: ${normalizeList(input.techStack).join(', ') || 'Add your stack'}`, input.demoPlan || 'Plan the presentation flow'],
  },
  {
    title: 'What Comes Next',
    bullets: normalizeList(input.nextSteps).length > 0 ? normalizeList(input.nextSteps) : ['Add roadmap items'],
  },
]

export const exportPitchMarkdown = (input: PitchInput): string => {
  const slides = generateSlides(input)
    .map((slide, index) => {
      const bullets = slide.bullets.map((bullet) => `- ${bullet}`).join('\n')
      return `## Slide ${index + 1}: ${slide.title}\n${bullets}`
    })
    .join('\n\n')

  return `# ${input.projectName.trim() || 'Untitled Project'}

${input.tagline.trim() || 'Add a one-line pitch.'}

## Project Overview

### Problem
${input.problem.trim() || 'Not provided yet.'}

### Intended Audience
${input.audience.trim() || 'Not provided yet.'}

### Solution
${input.solution.trim() || 'Not provided yet.'}

### Main Features
${listText(input.features, 'No features added yet.')}

### Technology Stack
${listText(input.techStack, 'No technologies added yet.')}

### Impact
${input.impact.trim() || 'Not provided yet.'}

### Presentation Plan
${input.demoPlan.trim() || 'Not provided yet.'}

### Next Steps
${listText(input.nextSteps, 'No next steps added yet.')}

# Presentation Outline

${slides}
`
}
