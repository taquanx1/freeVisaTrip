import { useMemo, useRef, useState } from 'react'
import { Check, Search, X } from 'lucide-react'
import { passports } from '../../shared/countries'

interface Props { selected: string[]; onChange: (codes: string[]) => void; onContinue: () => void }

export function PassportPicker({ selected, onChange, onContinue }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const matches = useMemo(() => passports.filter((item) => !selected.includes(item.code) && `${item.name} ${item.code}`.toLowerCase().includes(query.toLowerCase())).slice(0, 8), [query, selected])

  const choose = (code: string) => { onChange([...selected, code]); setQuery(''); setOpen(false); input.current?.focus() }
  return <section className="step passport-step" aria-labelledby="passport-title">
    <div className="step-heading"><span className="step-number">01</span><div><p className="eyebrow">Start with your group</p><h2 id="passport-title">Which passports are travelling?</h2><p>Add everyone. We’ll only show places that welcome the whole group without preapproval.</p></div></div>
    <div className="passport-panel">
      <div className="chips" aria-label="Selected passports">
        {selected.map((code) => { const passport = passports.find((item) => item.code === code)!; return <span className="chip" key={code}><span aria-hidden>{passport.flag}</span>{passport.name}<button aria-label={`Remove ${passport.name}`} onClick={() => onChange(selected.filter((item) => item !== code))}><X size={15}/></button></span> })}
      </div>
      <div className="combobox">
        <Search size={19} aria-hidden />
        <input ref={input} value={query} aria-label="Search passports" aria-expanded={open} aria-controls="passport-options" role="combobox" placeholder={selected.length ? 'Add another passport' : 'Search country or passport'} onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true) }} onKeyDown={(event) => { if (event.key === 'Enter' && matches[0]) choose(matches[0].code); if (event.key === 'Escape') setOpen(false) }}/>
        {open && <ul className="options" id="passport-options" role="listbox">{matches.map((passport) => <li key={passport.code}><button role="option" aria-selected="false" onMouseDown={(event) => event.preventDefault()} onClick={() => choose(passport.code)}><span className="option-flag">{passport.flag}</span><span>{passport.name}<small>{passport.code}</small></span><Check size={17}/></button></li>)}{!matches.length && <li className="no-option">No matching passports</li>}</ul>}
      </div>
      <button className="primary-button" disabled={!selected.length} onClick={onContinue}>See destinations <span aria-hidden>→</span></button>
    </div>
  </section>
}
