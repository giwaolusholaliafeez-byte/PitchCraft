import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import type { DesignedSlide } from './domain/ai'
import {
  buildPitchSections,
  calculatePitchScore,
  defaultPitchState,
  exportPitchMarkdown,
  generateSlides,
  normalizeList,
  type PitchInput,
  type PitchState,
} from './domain/pitch'
import { clearPitchState, loadPitchState, savePitchState } from './domain/storage'
import { generateDesignedSlidesWithAi, improvePitchWithAi } from './services/ai'
import { downloadPitchMarkdown, downloadPitchPdf } from './services/exportFiles'

const splitLines = (value: string): string[] => value.split('\n')

function App() {
  const [pitchState, setPitchState] = useState<PitchState>(() => loadPitchState())
  const [status, setStatus] = useState('PitchCraft loaded locally.')
  const [exportText, setExportText] = useState('')
  const [aiSlides, setAiSlides] = useState<DesignedSlide[]>([])
  const [aiDesignSystem, setAiDesignSystem] = useState('')
  const [aiError, setAiError] = useState('')
  const [isImprovingPitch, setIsImprovingPitch] = useState(false)
  const [isGeneratingSlides, setIsGeneratingSlides] = useState(false)
  const exportSectionRef = useRef<HTMLElement | null>(null)

  const pitch = pitchState.input
  const sections = useMemo(() => buildPitchSections(pitch), [pitch])
  const slides = useMemo(() => generateSlides(pitch), [pitch])
  const score = useMemo(() => calculatePitchScore(pitch), [pitch])
  const missingSections = sections.filter((section) => !section.complete)
  const completedSections = sections.length - missingSections.length

  useEffect(() => {
    const saved = savePitchState(pitchState)
    setStatus(saved ? 'Saved locally.' : 'Unable to save. Browser storage may be blocked.')
  }, [pitchState])

  const updatePitch = (changes: Partial<PitchInput>) => {
    setPitchState((currentState) => ({
      ...currentState,
      input: { ...currentState.input, ...changes },
    }))
  }

  const saveSnapshot = () => {
    setPitchState((currentState) => ({
      ...currentState,
      savedPitches: [currentState.input, ...currentState.savedPitches].slice(0, 6),
    }))
    setStatus('Pitch snapshot saved.')
  }

  const loadSnapshot = (snapshot: PitchInput) => {
    setPitchState((currentState) => ({ ...currentState, input: snapshot }))
    setExportText('')
    setStatus(`${snapshot.projectName || 'Pitch'} loaded.`)
  }

  const deleteSnapshot = (index: number) => {
    setPitchState((currentState) => ({
      ...currentState,
      savedPitches: currentState.savedPitches.filter((_, savedIndex) => savedIndex !== index),
    }))
  }

  const handleExport = async () => {
    const markdown = exportPitchMarkdown(pitch)
    setExportText(markdown)
    window.setTimeout(() => exportSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)

    try {
      await navigator.clipboard.writeText(markdown)
      setStatus('Pitch Markdown copied to clipboard.')
    } catch (error) {
      console.error('Clipboard copy failed', error)
      setStatus('Pitch generated below. Clipboard permission was unavailable.')
    }
  }

  const handleDownloadMarkdown = () => {
    downloadPitchMarkdown(pitch)
    setStatus('Markdown file downloaded.')
  }

  const handleDownloadPdf = async (targetPitch: PitchInput = pitch) => {
    try {
      await downloadPitchPdf(targetPitch, targetPitch === pitch ? aiSlides : [])
      setStatus(`${targetPitch.projectName || 'Pitch'} PDF downloaded.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'PDF export failed.'
      setStatus(message)
    }
  }

  const handleImprovePitch = async () => {
    setIsImprovingPitch(true)
    setAiError('')

    try {
      const result = await improvePitchWithAi(pitch)
      setPitchState((currentState) => ({ ...currentState, input: result.pitch }))
      setStatus(`AI improved the pitch: ${result.rationale.slice(0, 2).join(' ')}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI pitch improvement failed.'
      setAiError(message)
      setStatus(message)
    } finally {
      setIsImprovingPitch(false)
    }
  }

  const handleGenerateAiSlides = async () => {
    setIsGeneratingSlides(true)
    setAiError('')

    try {
      const result = await generateDesignedSlidesWithAi(pitch, slides)
      setAiSlides(result.slides)
      setAiDesignSystem(
        `${result.designSystem.theme} • ${result.designSystem.colors.join(', ')} • ${result.designSystem.typography}`,
      )
      setStatus('AI generated designed slide directions.')
      window.location.hash = 'ai-slides'
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI slide generation failed.'
      setAiError(message)
      setStatus(message)
    } finally {
      setIsGeneratingSlides(false)
    }
  }

  const handleReset = () => {
    const cleared = clearPitchState()
    setPitchState(defaultPitchState)
    setExportText('')
    setStatus(cleared ? 'Starter pitch restored.' : 'Starter pitch restored, but storage could not be cleared.')
  }

  return (
    <main>
      <nav className="site-nav" aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label="PitchCraft home">
          <img src="/pitchcraft-logo.svg" alt="PitchCraft" />
        </a>
        <div className="nav-links">
          <a href="#builder">Builder</a>
          <a href="#slides">Slides</a>
          <a href="#export">Export</a>
        </div>
        <button type="button" className="nav-cta" onClick={handleExport}>Export pitch</button>
      </nav>

      <section id="top" className="hero-section">
        <div className="hero-copy">
          <div className="hero-badge">
            <span>Live builder</span>
            <span>Ready for real submissions</span>
          </div>
          <p className="eyebrow">Built for Build Beyond teams</p>
          <h1>Turn your hackathon idea into a pitch judges understand.</h1>
          <p>
            PitchCraft helps builders clarify the story, polish the presentation flow, generate a slide
            outline, and export a clean Devpost-ready summary.
          </p>
          <div className="hero-actions">
            <a className="button-link" href="#builder">Start building</a>
            <button type="button" onClick={handleImprovePitch} disabled={isImprovingPitch}>
              {isImprovingPitch ? 'Improving...' : 'Improve with AI'}
            </button>
            <button type="button" className="secondary" onClick={() => handleDownloadPdf()}>Download PDF</button>
            <button type="button" className="secondary" onClick={saveSnapshot}>Save snapshot</button>
          </div>
          {aiError && <p className="ai-error" role="alert">{aiError}</p>}
          <p className="status" role="status">{status}</p>
        </div>

        <aside className="hero-builder" aria-label="Live pitch readiness preview">
          <div className="mock-browser">
            <div className="browser-bar">
              <div className="traffic-lights" aria-hidden="true">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <strong>pitchcraft.dev/builder</strong>
              <div aria-hidden="true"></div>
            </div>
            <div className="mock-content">
              <div className="preview-header">
                <div className="preview-title">
                  <img src="/pitchcraft-mark.svg" alt="" aria-hidden="true" />
                  <div>
                    <span className="preview-label">Current pitch</span>
                    <h2>{pitch.projectName || 'Untitled pitch'}</h2>
                  </div>
                </div>
                <div className="score-pill">
                  <strong>{score}%</strong>
                  <span>ready</span>
                </div>
              </div>

              <p className="preview-tagline">{pitch.tagline || 'Add a tagline to sharpen your opening.'}</p>

              <div className="preview-document">
                <div>
                  <span>Problem</span>
                  <p>{pitch.problem || 'Describe the core problem.'}</p>
                </div>
                <div>
                  <span>Solution</span>
                  <p>{pitch.solution || 'Explain the solution.'}</p>
                </div>
              </div>

              <div className="mini-checks">
                {sections.slice(0, 4).map((section) => (
                  <span key={section.id} className={section.complete ? 'complete' : ''}>
                    {section.complete ? '✓' : '!'} {section.title}
                  </span>
                ))}
              </div>

              <div className="preview-footer">
                <span>{completedSections}/{sections.length} sections ready</span>
                <span>{slides.length} slide outline</span>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section className="proof-strip" aria-label="PitchCraft highlights">
        <article>
          <strong>Local-first</strong>
          <span>Drafts save privately in your browser.</span>
        </article>
        <article>
          <strong>Judge-focused</strong>
          <span>Problem, audience, solution, impact, and presentation flow stay visible.</span>
        </article>
        <article>
          <strong>Export-ready</strong>
          <span>Copy Markdown into Devpost or presentation notes.</span>
        </article>
      </section>

      <section className="ai-section" aria-label="AI pitch tools">
        <div>
          <p className="eyebrow">AI assist</p>
          <h2>Upgrade the story and design the deck.</h2>
          <p>
            Use the backend AI assistant to tighten your project pitch or generate slide-by-slide
            design direction. Your API key stays on the server.
          </p>
        </div>
        <div className="ai-actions">
          <button type="button" onClick={handleImprovePitch} disabled={isImprovingPitch}>
            {isImprovingPitch ? 'Improving pitch...' : 'Improve pitch with AI'}
          </button>
          <button type="button" className="secondary" onClick={handleGenerateAiSlides} disabled={isGeneratingSlides}>
            {isGeneratingSlides ? 'Generating slides...' : 'Generate designed slides'}
          </button>
        </div>
      </section>

      <section id="builder" className="builder-section">
        <div className="section-intro">
          <p className="eyebrow">Live builder</p>
          <h2>Write the pitch once. Reuse it everywhere.</h2>
          <p>Edit your project story below and PitchCraft updates the checklist, slides, score, and export in real time.</p>
        </div>

        <div className="builder-grid">
          <article className="form-panel">
            <div className="form-toolbar">
              <div>
                <span className="step-pill">01</span>
                <strong>Project story</strong>
              </div>
              <small>{missingSections.length === 0 ? 'Ready to submit' : `${missingSections.length} sections left`}</small>
            </div>
            <div className="two-column">
              <label>
                <span>Project name</span>
                <input value={pitch.projectName} onChange={(event) => updatePitch({ projectName: event.target.value })} />
              </label>
              <label>
                <span>Tagline</span>
                <input value={pitch.tagline} onChange={(event) => updatePitch({ tagline: event.target.value })} />
              </label>
            </div>
            <label>
              <span>Problem</span>
              <textarea value={pitch.problem} onChange={(event) => updatePitch({ problem: event.target.value })} rows={4} />
            </label>
            <label>
              <span>Intended audience</span>
              <textarea value={pitch.audience} onChange={(event) => updatePitch({ audience: event.target.value })} rows={3} />
            </label>
            <label>
              <span>Solution</span>
              <textarea value={pitch.solution} onChange={(event) => updatePitch({ solution: event.target.value })} rows={4} />
            </label>
            <div className="two-column">
              <label>
                <span>Main features</span>
                <textarea
                  value={pitch.features.join('\n')}
                  onChange={(event) => updatePitch({ features: splitLines(event.target.value) })}
                  onBlur={() => updatePitch({ features: normalizeList(pitch.features) })}
                  rows={6}
                />
              </label>
              <label>
                <span>Tech stack</span>
                <textarea
                  value={pitch.techStack.join('\n')}
                  onChange={(event) => updatePitch({ techStack: splitLines(event.target.value) })}
                  onBlur={() => updatePitch({ techStack: normalizeList(pitch.techStack) })}
                  rows={6}
                />
              </label>
            </div>
            <label>
              <span>Impact</span>
              <textarea value={pitch.impact} onChange={(event) => updatePitch({ impact: event.target.value })} rows={3} />
            </label>
            <div className="two-column">
              <label>
                <span>Presentation plan</span>
                <textarea value={pitch.demoPlan} onChange={(event) => updatePitch({ demoPlan: event.target.value })} rows={4} />
              </label>
              <label>
                <span>Next steps</span>
                <textarea
                  value={pitch.nextSteps.join('\n')}
                  onChange={(event) => updatePitch({ nextSteps: splitLines(event.target.value) })}
                  onBlur={() => updatePitch({ nextSteps: normalizeList(pitch.nextSteps) })}
                  rows={4}
                />
              </label>
            </div>
          </article>

          <aside className="check-panel">
            <div className="panel-heading">
              <p className="eyebrow">Readiness</p>
              <h3>Pitch checklist</h3>
            </div>
            <ul className="checklist">
              {sections.map((section) => (
                <li key={section.id} className={section.complete ? 'complete' : ''}>
                  <span>{section.complete ? '✓' : '!'}</span>
                  <div>
                    <strong>{section.title}</strong>
                    <small>{section.complete ? 'Ready for judges' : 'Needs more detail'}</small>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      <section id="slides" className="slides-section">
        <div className="section-intro">
          <p className="eyebrow">Presentation outline</p>
          <h2>Your pitch becomes five focused slides.</h2>
          <p>Each slide is generated from the pitch fields above, so your presentation stays aligned with your Devpost submission.</p>
        </div>
        <div className="slide-showcase">
          {slides.map((slide, index) => (
            <article className="website-slide" key={`${slide.title}-${index}`}>
              <span>Slide {index + 1}</span>
              <h3>{slide.title}</h3>
              <ul>
                {slide.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section id="ai-slides" className="slides-section ai-slides-section">
        <div className="section-intro">
          <p className="eyebrow">AI-designed deck</p>
          <h2>Slide design directions for your project.</h2>
          <p>{aiDesignSystem || 'Generate designed slides to get layout, visual direction, and speaker notes.'}</p>
        </div>
        <div className="slide-showcase">
          {aiSlides.length === 0 ? (
            <p className="empty-state">AI slide design output will appear here after generation.</p>
          ) : (
            aiSlides.map((slide, index) => (
              <article className="website-slide designed-slide" key={`${slide.title}-${index}`}>
                <span>{slide.layout} · Slide {index + 1}</span>
                <h3>{slide.title}</h3>
                <ul>
                  {slide.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
                <p><strong>Design:</strong> {slide.visualDirection}</p>
                <p><strong>Speaker note:</strong> {slide.speakerNote}</p>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="snapshot-section">
        <div className="section-intro">
          <p className="eyebrow">Alternate angles</p>
          <h2>Save versions before changing direction.</h2>
        </div>
        <div className="snapshot-grid">
          {pitchState.savedPitches.length === 0 ? (
            <p className="empty-state">No snapshots yet. Save one from the hero or export area.</p>
          ) : (
            pitchState.savedPitches.map((snapshot, index) => (
              <article className="snapshot-card" key={`${snapshot.projectName}-${index}`}>
                <h3>{snapshot.projectName || 'Untitled pitch'}</h3>
                <p>{snapshot.tagline || 'No tagline yet.'}</p>
                <div>
                  <button type="button" className="secondary compact" onClick={() => loadSnapshot(snapshot)}>Load</button>
                  <button type="button" className="secondary compact" onClick={() => handleDownloadPdf(snapshot)}>PDF</button>
                  <button type="button" className="ghost compact" onClick={() => deleteSnapshot(index)}>Delete</button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section id="export" className="export-section" ref={exportSectionRef}>
        <div>
          <span className="step-pill">Final</span>
          <p className="eyebrow">Final handoff</p>
          <h2>Export a clean Devpost draft.</h2>
          <p>Generate Markdown that includes the project overview and the full presentation outline.</p>
          <div className="export-actions">
            <button type="button" onClick={handleExport}>Generate Markdown</button>
            <button type="button" className="secondary" onClick={handleDownloadMarkdown}>Download .md</button>
            <button type="button" className="secondary" onClick={() => handleDownloadPdf()}>Download PDF</button>
            <button type="button" className="secondary" onClick={saveSnapshot}>Save snapshot</button>
            <button type="button" className="ghost" onClick={handleReset}>Reset starter</button>
          </div>
        </div>
        {exportText ? (
          <textarea className="export-output" value={exportText} readOnly rows={18} />
        ) : (
          <p className="empty-state">Your generated Markdown export will appear here.</p>
        )}
      </section>
    </main>
  )
}

export default App
