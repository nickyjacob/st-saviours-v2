const fs = require('fs');
let content = fs.readFileSync('components/PitchCalendar.tsx', 'utf8');

const oldControls = content.slice(
  content.indexOf('      <div style={{ display: \'flex\', alignItems: \'center\', gap: \'12px\', marginBottom: \'8px\', fontSize: \'13px\', flexWrap: \'wrap\' }}>'),
  content.indexOf('      {loading ?')
);

const newControls = `      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap', fontSize: '13px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#2e7d32', display: 'inline-block' }}></span>Booked</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', border: '2px dashed #f9ab2b', display: 'inline-block' }}></span>Awaiting</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#9e9e9e', display: 'inline-block' }}></span>Closed</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
        <select value={selectedPitch} onChange={e => setSelectedPitch(e.target.value)} style={{ border: '1px solid #d1d5db', borderRadius: '8px', padding: '6px 10px', fontSize: '13px' }}>
          <option value="all">All Pitches</option>
          {pitches.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
        </select>
        <select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)} style={{ border: '1px solid #d1d5db', borderRadius: '8px', padding: '6px 10px', fontSize: '13px' }}>
          <option value="all">All Teams</option>
          {uniqueTeams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <div style={{ display: 'flex', border: '1px solid #d1d5db', borderRadius: '8px', overflow: 'hidden' }}>
          {isMobile && <button onClick={() => { setView('day'); setSelectedDay(new Date()) }} style={{ padding: '6px 12px', fontSize: '13px', fontWeight: '500', backgroundColor: view === 'day' ? '#111' : 'white', color: view === 'day' ? 'white' : '#374151', border: 'none', cursor: 'pointer' }}>Day</button>}
          <button onClick={() => setView('week')} style={{ padding: '6px 12px', fontSize: '13px', fontWeight: '500', backgroundColor: view === 'week' ? '#111' : 'white', color: view === 'week' ? 'white' : '#374151', border: 'none', cursor: 'pointer' }}>Week</button>
          <button onClick={() => setView('month')} style={{ padding: '6px 12px', fontSize: '13px', fontWeight: '500', backgroundColor: view === 'month' ? '#111' : 'white', color: view === 'month' ? 'white' : '#374151', border: 'none', cursor: 'pointer' }}>Month</button>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <button onClick={() => {
          if (view === 'day') { const d = new Date(selectedDay); d.setDate(d.getDate() - 1); setSelectedDay(d) }
          else if (view === 'month') setCurrentDate(subMonths(currentDate, 1))
          else setCurrentDate(subWeeks(currentDate, 1))
        }} style={{ border: '1px solid #d1d5db', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', backgroundColor: 'white' }}>&larr; Prev</button>
        <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#111', textAlign: 'center', flex: 1, margin: '0 8px' }}>
          {view === 'month' ? format(currentDate, 'MMMM yyyy') : view === 'day' ? getDayLabel() : getWeekLabel()}
        </h2>
        <button onClick={() => {
          if (view === 'day') { const d = new Date(selectedDay); d.setDate(d.getDate() + 1); setSelectedDay(d) }
          else if (view === 'month') setCurrentDate(addMonths(currentDate, 1))
          else setCurrentDate(addWeeks(currentDate, 1))
        }} style={{ border: '1px solid #d1d5db', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', backgroundColor: 'white' }}>Next &rarr;</button>
      </div>
      `;

content = content.replace(oldControls, newControls);
fs.writeFileSync('components/PitchCalendar.tsx', content, 'utf8');
console.log('Done');
