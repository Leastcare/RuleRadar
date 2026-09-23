import React, { useState } from 'react'
import s from './IntroScreen.module.css'

const STEPS = [
  {
    icon: '📋',
    title: 'What is a public comment?',
    body: 'When the U.S. government proposes a new regulation — on climate, healthcare, finance, anything — the law requires them to ask the public for input. Anyone can submit a comment. The agency must read and respond to every one.',
  },
  {
    icon: '🎭',
    title: 'The problem: fake grassroots',
    body: 'Companies and lobbying groups have learned to game this system. They secretly organize hundreds or thousands of people — sometimes bots — to submit near-identical comments. It creates the illusion of massive public support. The agency sees "10,000 people oppose this rule" but it\'s actually one campaign.',
    highlight: 'In 2017, the FCC\'s net neutrality docket received 22 million comments. Millions were later found to be fake or submitted without people\'s knowledge.',
  },
  {
    icon: '🔍',
    title: 'What RuleRadar does',
    body: 'RuleRadar fetches real comments from the official government database (Regulations.gov) and runs two tests on them:',
    bullets: [
      'Text similarity — are multiple comments nearly identical, sharing the same template language?',
      'Timing burst — were they all submitted within minutes of each other, like an automated campaign?',
    ],
    note: 'If both signals fire on the same group of comments, RuleRadar flags it.',
  },
  {
    icon: '⚖️',
    title: 'Important: this is not proof of fraud',
    body: 'RuleRadar detects statistical coordination patterns. It cannot determine legal wrongdoing, identity, or intent. A flagged cluster means "these comments are unusually similar and suspiciously timed" — not "these are definitely fake."',
    body2: 'Use it as a starting point for investigation, not a final verdict.',
  },
]

export default function IntroScreen({ onEnter }) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isLast  = step === STEPS.length - 1

  return (
    <div className={s.screen}>
      <div className={s.bg}/>

      <div className={s.card}>
        {/* Header */}
        <div className={s.header}>
          <div className={s.logo}>
            <span className={s.logoMark}>◎</span>
            <span className={s.logoName}>RULERADAR</span>
          </div>
          <span className={s.stepIndicator}>{step + 1} / {STEPS.length}</span>
        </div>

        {/* Step dots */}
        <div className={s.dots}>
          {STEPS.map((_, i) => (
            <button
              key={i}
              className={s.dot + (i === step ? ' ' + s.dotActive : '') + (i < step ? ' ' + s.dotDone : '')}
              onClick={() => setStep(i)}
              aria-label={`Step ${i + 1}`}
            />
          ))}
        </div>

        {/* Content */}
        <div className={s.content} key={step}>
          <div className={s.iconWrap}>
            <span className={s.icon}>{current.icon}</span>
          </div>

          <h2 className={s.title}>{current.title}</h2>
          <p className={s.body}>{current.body}</p>

          {current.highlight && (
            <div className={s.highlight}>
              <span className={s.highlightIcon}>📌</span>
              <p>{current.highlight}</p>
            </div>
          )}

          {current.bullets && (
            <ul className={s.bullets}>
              {current.bullets.map((b, i) => (
                <li key={i} className={s.bullet}>
                  <span className={s.bulletDot}/>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}

          {current.note && (
            <p className={s.note}>{current.note}</p>
          )}

          {current.body2 && (
            <p className={s.body2}>{current.body2}</p>
          )}
        </div>

        {/* Navigation */}
        <div className={s.nav}>
          <button
            className={s.backBtn}
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
          >
            ← Back
          </button>

          <button
            className={s.skipBtn}
            onClick={onEnter}
          >
            Skip intro
          </button>

          <button
            className={s.nextBtn + (isLast ? ' ' + s.enterBtn : '')}
            onClick={isLast ? onEnter : () => setStep(s => s + 1)}
          >
            {isLast ? '⚡ Enter RuleRadar' : 'Next →'}
          </button>
        </div>
      </div>

      {/* Bottom attribution */}
      <p className={s.attr}>
        Data source: <a href="https://api.regulations.gov" target="_blank" rel="noreferrer">Regulations.gov</a>
        &nbsp;·&nbsp;LexHack 2026
      </p>
    </div>
  )
}
