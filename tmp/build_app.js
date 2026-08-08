const fs = require('fs');

let code = fs.readFileSync('/tmp/overdesk-checklist/src/App.tsx', 'utf8');

// 1. Add FxCalendar import
code = code.replace(
  "import overdeskLogo from './logo.svg';",
  "import overdeskLogo from './logo.svg';\nimport FxCalendar, { playSynthSound } from './components/FxCalendar';"
);

// 2. Add activeApp & calendarSettingsOpen state inside App()
code = code.replace(
  "export default function App() {",
  "export default function App() {\n  const [activeApp, setActiveApp] = useState<'checklist' | 'calendar'>('checklist');\n  const [calendarSettingsOpen, setCalendarSettingsOpen] = useState<boolean>(false);"
);

// 3. Find top-bar-right block
const topBarRightStart = code.indexOf('<div className="top-bar-right">');
const topBarRightEnd = code.indexOf('</div>', topBarRightStart) + 6;
const topBarRightOld = code.substring(topBarRightStart, topBarRightEnd);

const topBarRightNew = `<div className="top-bar-right">
          {activeApp === 'checklist' && (
            <>
              <button
                onClick={() => {
                  if (minimized) setMinimized(false);
                  setActiveApp('calendar');
                }}
                style={{
                  background: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: isLight ? '#4f46e5' : '#818cf8',
                  transition: 'all 0.15s ease-in-out',
                  padding: 0,
                  margin: 0,
                }}
                title="Switch to FX Economic Calendar"
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.0" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 6H8a5 5 0 0 0-5 5v2a5 5 0 0 0 5 5h4" />
                  <line x1="7" y1="12" x2="21" y2="12" />
                  <polyline points="16 7 21 12 16 17" />
                </svg>
              </button>

              <button className="close-btn" id="close-btn" onClick={triggerAppShutdown} title="Shutdown App">
                <svg viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              <button
                className={\`settings-toggle \${settingsOpen ? 'on' : ''}\`}
                id="settings-toggle"
                onClick={() => {
                  if (minimized) setMinimized(false);
                  setSettingsOpen(!settingsOpen);
                  setPickerOpen(false);
                  setEditMode(false);
                }}
                title="Global Settings"
              >
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>

              <button
                className={\`edit-toggle \${editMode ? 'on' : ''}\`}
                id="edit-toggle"
                onClick={() => {
                  if (minimized) setMinimized(false);
                  setEditMode(!editMode);
                  setSettingsOpen(false);
                  setEditingTitle(false);
                  setEditingItemIdx(null);
                }}
                title="Edit List Configurations"
              >
                {editMode ? (
                  <svg viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                )}
              </button>
            </>
          )}

          {activeApp === 'calendar' && (
            <>
              <button
                onClick={() => setActiveApp('checklist')}
                style={{
                  background: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: isLight ? '#1a1a2e' : '#ffffff',
                  transition: 'all 0.15s ease-in-out',
                  padding: 0,
                  margin: 0,
                }}
                title="Switch back to Checklist"
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.0" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 6h4a5 5 0 0 1 5 5v2a5 5 0 0 1-5 5h-4" />
                  <line x1="17" y1="12" x2="3" y2="12" />
                  <polyline points="8 7 3 12 8 17" />
                </svg>
              </button>

              <button
                onClick={() => setCalendarSettingsOpen(!calendarSettingsOpen)}
                style={{
                  background: calendarSettingsOpen 
                    ? (isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.22)') 
                    : (isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.08)'),
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: calendarSettingsOpen ? '#0082ff' : (isLight ? '#1a1a2e' : '#ffffff'),
                  transition: 'all 0.15s ease-in-out',
                  padding: 0,
                  margin: 0,
                }}
                title={calendarSettingsOpen ? "Close Simulator Panel" : "Open Simulator & Advanced Settings"}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{
                  transform: calendarSettingsOpen ? 'scale(1.08)' : 'none',
                  transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}>
                  <line x1="4" y1="21" x2="4" y2="14" fill="none"></line>
                  <line x1="4" y1="10" x2="4" y2="3" fill="none"></line>
                  <line x1="12" y1="21" x2="12" y2="12" fill="none"></line>
                  <line x1="12" y1="8" x2="12" y2="3" fill="none"></line>
                  <line x1="20" y1="21" x2="20" y2="16" fill="none"></line>
                  <line x1="20" y1="12" x2="20" y2="3" fill="none"></line>
                  <line x1="2" y1="14" x2="6" y2="14" fill="none"></line>
                  <line x1="10" y1="8" x2="14" y2="8" fill="none"></line>
                  <line x1="18" y1="16" x2="22" y2="16" fill="none"></line>
                </svg>
              </button>

              <button className="close-btn" id="close-btn" onClick={triggerAppShutdown} title="Shutdown App">
                <svg viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </>
          )}
        </div>`;

code = code.replace(topBarRightOld, topBarRightNew);

// 4. Wrap the checklist content inside display: activeApp === 'checklist'
// Find the end of top-bar div
const topBarStart = code.indexOf('<div className="top-bar" id="top-bar">');
const topBarEnd = code.indexOf('</div>', topBarRightStart) + 6; // closes top-bar-right
const topBarOuterEnd = code.indexOf('</div>', topBarEnd) + 6; // closes top-bar

// Find the last closing div of card content
const lastDivIdx = code.lastIndexOf('</div>');
const cardEndDivIdx = code.lastIndexOf('</div>', lastDivIdx - 1);

const checklistContent = code.substring(topBarOuterEnd, cardEndDivIdx);

const newContent = `
        <div style={{ display: activeApp === 'checklist' ? 'contents' : 'none' }}>
${checklistContent}
        </div>
        <div style={{ display: activeApp === 'calendar' ? 'contents' : 'none' }}>
          <FxCalendar
            isLight={isLight}
            isMinimized={minimized}
            onBackToChecklist={() => setActiveApp('checklist')}
            settingsPanelOpen={calendarSettingsOpen}
            setSettingsPanelOpen={setCalendarSettingsOpen}
          />
        </div>
`;

code = code.substring(0, topBarOuterEnd) + newContent + code.substring(cardEndDivIdx);

fs.writeFileSync('src/App.tsx', code);
console.log('App.tsx converted and written successfully!');
