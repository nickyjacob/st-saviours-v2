const fs = require('fs');
let content = fs.readFileSync('app/admin/page.tsx', 'utf8');

content = content.replace(
  `        {tab === 'history' && (
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>&#x1f4ca; Usage & Login History</h2>
            {!historyLoaded ? (
              <div style={{ textAlign: 'center', padding: '40px', backgroundColor: 'white', borderRadius: '10px' }}>
                <p style={{ color: '#6b7280', marginBottom: '12px', fontSize: '13px' }}>Login history is not loaded by default to keep things fast.</p>
                <button onClick={loadHistory} style={{ backgroundColor: '#111', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}>Load Last 20 Logins</button>
              </div>
            ) : historyLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>Loading...</div>
            ) : (
              <div>
                <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                    <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>User</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Email</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Logged In</th>
                    </tr>
                    </thead>
                    <tbody>
                    {loginHistory.map((h, i) => (
                      <tr key={h.id} style={{ borderBottom: i < loginHistory.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#111', fontWeight: '500' }}>{h.full_name || '—'}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#6b7280' }}>{h.email}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#6b7280' }}>{formatDateTime(h.logged_in_at)}</td>
                      </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
                <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px', textAlign: 'center' }}>Showing last 20 logins</p>
              </div>
            )}
          </div>
        )}`,
  `        {tab === 'history' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600' }}>&#x1f4ca; Usage & Login History</h2>
              {historyLoaded && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="Filter by user..."
                    value={historyUserFilter}
                    onChange={e => setHistoryUserFilter(e.target.value)}
                    style={{ border: '1px solid #d1d5db', borderRadius: '6px', padding: '5px 10px', fontSize: '12px', width: '150px' }}
                  />
                  <input
                    type="date"
                    value={historyDateFilter}
                    onChange={e => setHistoryDateFilter(e.target.value)}
                    style={{ border: '1px solid #d1d5db', borderRadius: '6px', padding: '5px 10px', fontSize: '12px' }}
                  />
                  {(historyUserFilter || historyDateFilter) && (
                    <button onClick={() => { setHistoryUserFilter(''); setHistoryDateFilter('') }} style={{ border: '1px solid #d1d5db', borderRadius: '6px', padding: '5px 10px', fontSize: '12px', cursor: 'pointer', backgroundColor: 'white' }}>Clear</button>
                  )}
                </div>
              )}
            </div>
            {!historyLoaded ? (
              <div style={{ textAlign: 'center', padding: '40px', backgroundColor: 'white', borderRadius: '10px' }}>
                <p style={{ color: '#6b7280', marginBottom: '12px', fontSize: '13px' }}>Login history is not loaded by default to keep things fast.</p>
                <button onClick={loadHistory} style={{ backgroundColor: '#111', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}>Load Last 20 Logins</button>
              </div>
            ) : historyLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>Loading...</div>
            ) : (
              <div>
                <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                    <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>User</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Email</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Logged In</th>
                    </tr>
                    </thead>
                    <tbody>
                    {loginHistory
                      .filter(h => {
                        if (historyUserFilter && !((h.full_name || '') + (h.email || '')).toLowerCase().includes(historyUserFilter.toLowerCase())) return false
                        if (historyDateFilter && !h.logged_in_at.startsWith(historyDateFilter)) return false
                        return true
                      })
                      .map((h, i, arr) => (
                      <tr key={h.id} style={{ borderBottom: i < arr.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#111', fontWeight: '500' }}>{h.full_name || '—'}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#6b7280' }}>{h.email}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#6b7280' }}>{formatDateTime(h.logged_in_at)}</td>
                      </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
                <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px', textAlign: 'center' }}>Showing last 20 logins</p>
              </div>
            )}
          </div>
        )}`
);

content = content.replace(
  `                  <div key={c.id} style={{ backgroundColor: 'white', borderRadius: '8px', borderLeft: \`4px solid \${c.pitch_colour || '#888'}\`, padding: '10px 14px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>`,
  `                  <div key={c.id} style={{ backgroundColor: '#f9fafb', borderRadius: '8px', borderLeft: '4px solid #4b5563', padding: '10px 14px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>`
);

content = content.replace(
  `                      <div style={{ fontWeight: '600', fontSize: '13px', color: c.pitch_colour || '#374151' }}>{c.pitch_name}</div>`,
  `                      <div style={{ fontWeight: '600', fontSize: '13px', color: '#374151' }}>{c.pitch_name}</div>`
);

fs.writeFileSync('app/admin/page.tsx', content, 'utf8');
console.log('Done');
