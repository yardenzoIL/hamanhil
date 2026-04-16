import React, { useState, useEffect, useRef } from 'react';
import { Bell, Calendar, Clock, AlertTriangle, Info, School, Star, Coffee, Terminal, LayoutGrid, CheckCircle2, FlaskConical, Target, Lightbulb, Megaphone } from 'lucide-react';

const App = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentView, setCurrentView] = useState('alerts');
  const [sheetData, setSheetData] = useState({ alerts: [], marquee: [], changes: [], isDateValid: false });
  const [weeklyData, setWeeklyData] = useState({ rows: [], fullRange: "", isWeekValid: false });
  const [loadingStage, setLoadingStage] = useState('text'); 
  const [loadingText, setLoadingText] = useState("");
  const [loadPercent, setLoadPercent] = useState(0);
  const [dataReady, setDataReady] = useState(false);

  const schoolLogo = "https://i.ibb.co/vxVr4jPg/logo.png";
  
  const mainSheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSvAPCgpwTyuR_spSNF-dDeoSikh_C9Aq8RUbZ7w8qfmz9bGqcz3DG1usYiREOqFvSbqAqAKOW675i3/pub?gid=1798761539&single=true&output=csv";
  const changesSheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSvAPCgpwTyuR_spSNF-dDeoSikh_C9Aq8RUbZ7w8qfmz9bGqcz3DG1usYiREOqFvSbqAqAKOW675i3/pub?gid=0&single=true&output=csv";
  const weeklySheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSvAPCgpwTyuR_spSNF-dDeoSikh_C9Aq8RUbZ7w8qfmz9bGqcz3DG1usYiREOqFvSbqAqAKOW675i3/pub?gid=1122409961&single=true&output=csv";

  const proxies = [
    (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    (url) => `https://thingproxy.freeboard.io/fetch/${url}`,
    (url) => `${url}` 
  ];

  const calculateWeekEnd = (dateStr) => {
    if (!dateStr || !dateStr.includes('/')) return "";
    try {
      const [day, month, year] = dateStr.split('/').map(Number);
      const startDate = new Date(year, month - 1, day);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      return `${String(endDate.getDate()).padStart(2, '0')}/${String(endDate.getMonth() + 1).padStart(2, '0')}/${endDate.getFullYear()}`;
    } catch (e) { return ""; }
  };

  const currentDayIndex = currentTime.getDay(); 

  useEffect(() => {
    if (loadingStage === 'text') {
      const messages = [
        "מאתחל את שרתי המנחיל... 🛠️",
        "צובע את המבזקים בכתום, סגול וירוק... 🎨",
        "מושך הודעות מטור F (שורות 2-10)... 📋",
        "המערכת מוכנה לפעולה! 🚀"
      ];
      let msgIndex = 0;
      let charIndex = 0;
      const typeInterval = setInterval(() => {
        if (msgIndex < messages.length) {
          if (charIndex === 0) setLoadingText(p => p + "> ");
          if (charIndex < messages[msgIndex].length) {
            setLoadingText(p => p + messages[msgIndex][charIndex]);
            charIndex++;
          } else {
            setLoadingText(p => p + "\n");
            msgIndex++;
            charIndex = 0;
          }
        } else {
          clearInterval(typeInterval);
          setLoadingStage('progress');
        }
      }, 15);
      return () => clearInterval(typeInterval);
    }
  }, [loadingStage]);

  useEffect(() => {
    if (loadingStage === 'progress') {
      const interval = setInterval(() => {
        setLoadPercent(p => {
          if (dataReady) return 100;
          if (p < 90) return p + 10;
          return p;
        });
        if (loadPercent >= 100 || (dataReady && loadPercent > 90)) {
           clearInterval(interval);
           setLoadingStage('done');
        }
      }, 30);
      return () => clearInterval(interval);
    }
  }, [loadingStage, dataReady, loadPercent]);

  const fetchCSVWithRetry = async (url, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      for (const proxyFn of proxies) {
        try {
          const proxyUrl = proxyFn(url);
          const response = await fetch(proxyUrl, { cache: 'no-store' });
          if (!response.ok) continue;
          const text = proxyUrl.includes('allorigins') ? (await response.json()).contents : await response.text();
          if (text && text.length > 5) return text;
        } catch (e) { }
      }
    }
    return "";
  };

  const parseCSV = (csv) => {
    return csv.split(/\r?\n/).map(row => 
      row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim())
    );
  };

  const fetchAllData = async () => {
    try {
      const t = new Date().getTime();
      const [mainCsv, changesCsv, weeklyCsv] = await Promise.all([
        fetchCSVWithRetry(`${mainSheetUrl}&t=${t}`),
        fetchCSVWithRetry(`${changesSheetUrl}&t=${t}`),
        fetchCSVWithRetry(`${weeklySheetUrl}&t=${t}`)
      ]);

      const mainRows = parseCSV(mainCsv || "");
      const changesRows = parseCSV(changesCsv || "");
      const weeklyRows = parseCSV(weeklyCsv || "");

      const today = new Date();
      const todayStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
      
      const alerts = [];
      const marquee = [];

      // עיבוד שורות 2 עד 100 (למבזקים הגדולים)
      mainRows.slice(1, 100).forEach((r, index) => {
        // המבזקים הגדולים (מבוסס על עמודה D - אינדקס 3)
        if (r[3]) {
          let style = { 
            bg: "bg-emerald-50", 
            border: "border-emerald-400", 
            icon: <CheckCircle2 className="text-emerald-600" size={35} />,
            accent: "text-emerald-700"
          };

          const colorLabel = (r[1] || "").toLowerCase();
          if (colorLabel.includes('orange') || colorLabel.includes('כתום')) {
            style = { 
              bg: "bg-orange-50", 
              border: "border-orange-400", 
              icon: <Star className="text-orange-600" size={35} />,
              accent: "text-orange-700"
            };
          } else if (colorLabel.includes('purple') || colorLabel.includes('סגול')) {
            style = { 
              bg: "bg-purple-50", 
              border: "border-purple-400", 
              icon: <Bell className="text-purple-600" size={35} />,
              accent: "text-purple-700"
            };
          } else if (colorLabel.includes('green') || colorLabel.includes('ירוק')) {
            style = { 
              bg: "bg-emerald-50", 
              border: "border-emerald-400", 
              icon: <CheckCircle2 className="text-emerald-600" size={35} />,
              accent: "text-emerald-700"
            };
          }
          alerts.push({ title: r[3], content: r[2], date: r[0], ...style });
        }
      });

      // משיכת מבזק תחתון (טור F - אינדקס 5) רק שורות 2 עד 10
      // המערך מתחיל מ-0, אז שורה 2 בגוגל שיטס היא אינדקס 1
      mainRows.slice(1, 10).forEach(r => {
        if (r[5] && r[5].trim() !== "") {
          marquee.push(r[5]);
        }
      });

      const changes = [];
      const changesValid = (changesRows[0]?.[0] === todayStr);
      if (changesValid) {
        changesRows.slice(2, 50).forEach(r => {
          if (r[0]) changes.push({ kita: r[0], hour: r[1], subject: r[2], note: r[3] });
        });
      }

      const weekStart = weeklyRows[0]?.[0];
      const weekEnd = calculateWeekEnd(weekStart);
      const weekRows = weeklyRows.slice(2).filter(r => r[0]).map(r => ({
        kita: r[0], sun: r[1], mon: r[2], tue: r[3], wed: r[4], thu: r[5]
      }));

      setSheetData({ 
        alerts, 
        marquee: marquee.length ? marquee : ["ברוכים הבאים למנחיל! 🏫", "יום מוצלח לכל התלמידים והצוות! ✨"], 
        changes, 
        isDateValid: changesValid 
      });
      setWeeklyData({ rows: weekRows, fullRange: `${weekStart} - ${weekEnd}`, isWeekValid: !!weekStart });
      setDataReady(true);
    } catch (e) { setDataReady(true); }
  };

  useEffect(() => {
    fetchAllData();
    const clock = setInterval(() => setCurrentTime(new Date()), 1000);
    const sync = setInterval(fetchAllData, 30000);
    const viewSwitch = setInterval(() => {
      setCurrentView(prev => prev === 'alerts' ? 'weekly' : 'alerts');
    }, 45000);
    return () => { clearInterval(clock); clearInterval(sync); clearInterval(viewSwitch); };
  }, []);

  if (loadingStage !== 'done') {
    return (
      <div className="h-screen w-screen bg-[#020617] text-emerald-400 font-mono flex flex-col items-center justify-center p-10 overflow-hidden" dir="ltr">
        <div className="w-full max-w-2xl border-2 border-emerald-900/50 p-8 rounded-[3rem] bg-[#0f172a] relative">
          <pre className="text-lg leading-relaxed h-64 overflow-hidden text-emerald-400 font-bold">{loadingText}</pre>
          <div className="mt-8">
            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-emerald-800/20">
              <div className="h-full bg-emerald-500 transition-all duration-100" style={{width: `${loadPercent}%`}}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#f1f5f9] text-slate-900 font-sans overflow-hidden flex flex-col relative" dir="rtl">
      
      {/* Header */}
      <header className="h-28 bg-white border-b-8 border-emerald-600 shadow-xl flex items-center justify-between px-12 z-50">
        <div className="flex items-center gap-8">
          <div className="bg-white p-1 rounded-2xl shadow-xl border border-slate-100 w-24 h-24 flex items-center justify-center">
            <img src={schoolLogo} alt="Logo" className="max-w-full max-h-full object-contain" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic">המנחיל - {currentView === 'alerts' ? 'מבזקים וחדשות 📰' : 'לוח שבועי 📑'}</h1>
            <p className="text-emerald-700 font-black text-xl flex items-center gap-2 mt-1 drop-shadow-sm">
              <Calendar size={22} className="text-purple-600" />
              {currentTime.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
           <div className="bg-slate-900 px-10 py-4 rounded-[3rem] border-4 border-emerald-500 shadow-2xl relative">
             <div className="text-5xl font-mono font-black text-emerald-400 tabular-nums">
               {currentTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
             </div>
           </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden p-8 relative">
        {currentView === 'alerts' ? (
          <div className="h-full w-full flex gap-10">
            {/* Alerts Area */}
            <div className="flex-[2.4] bg-white rounded-[4rem] border-2 border-slate-100 shadow-2xl flex flex-col overflow-hidden">
              <div className="p-10 border-b-4 border-slate-50 flex items-center justify-between bg-slate-50/80 shrink-0">
                <div className="flex items-center gap-6">
                    <div className="p-5 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-[2rem] text-white shadow-xl">
                        <Megaphone size={45} />
                    </div>
                    <div>
                        <h2 className="text-5xl font-black text-slate-900 tracking-tight">מה קורה בביה"ס?</h2>
                        <p className="text-slate-500 font-bold text-xl uppercase tracking-widest mt-1">עדכונים שוטפים מהשטח</p>
                    </div>
                </div>
                <div className="bg-white px-6 py-2 rounded-full border-2 border-slate-200 font-black text-slate-400 shadow-sm">
                    סה"כ {sheetData.alerts.length} הודעות
                </div>
              </div>
              
              <div className="flex-1 relative overflow-hidden p-10">
                <div className={`space-y-12 ${sheetData.alerts.length > 3 ? 'animate-infinite-scroll-v' : ''}`}>
                  {(sheetData.alerts.length > 3 ? [...sheetData.alerts, ...sheetData.alerts] : sheetData.alerts).map((alert, i) => (
                    <div key={i} className={`p-10 ${alert.bg} rounded-[3.5rem] border-r-[15px] ${alert.border} shadow-lg relative group transition-transform hover:scale-[1.01]`}>
                      <div className="flex items-start gap-8">
                        <div className="p-4 bg-white rounded-2xl border border-slate-100 shrink-0 mt-2 shadow-sm">
                            {alert.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-4xl font-black text-slate-900 leading-none">{alert.title}</h3>
                            <span className="bg-white/60 px-6 py-1.5 rounded-full text-lg font-black text-slate-500 border border-slate-200">{alert.date}</span>
                          </div>
                          <p className="text-3xl text-slate-700 font-bold leading-relaxed">{alert.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Changes Area */}
            <div className="flex-[1.6] bg-slate-950 rounded-[4rem] border-4 border-orange-600 shadow-2xl flex flex-col overflow-hidden relative">
              <div className="p-10 bg-gradient-to-br from-orange-600 to-red-700 flex items-center gap-6 shrink-0 relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10 mix-blend-overlay"></div>
                <div className="relative z-10 p-4 bg-white/20 rounded-2xl backdrop-blur-md">
                    <AlertTriangle className="text-white animate-bounce" size={50} />
                </div>
                <div className="relative z-10">
                    <h2 className="text-4xl font-black text-white italic">שינויי מערכת</h2>
                    <p className="text-orange-100 font-bold text-lg opacity-80 uppercase tracking-tighter">זמן אמת: {currentTime.toLocaleTimeString()}</p>
                </div>
              </div>

              <div className="flex-1 p-10 overflow-hidden bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 to-black">
                {sheetData.isDateValid && sheetData.changes.length > 0 ? (
                  <div className={`space-y-8 ${sheetData.changes.length > 4 ? 'animate-infinite-scroll-v-fast' : ''}`}>
                    {(sheetData.changes.length > 4 ? [...sheetData.changes, ...sheetData.changes] : sheetData.changes).map((change, idx) => (
                      <div key={idx} className="p-10 bg-slate-900/50 rounded-[3rem] border border-slate-800 backdrop-blur-sm shadow-inner group hover:border-orange-500/50 transition-colors">
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-orange-500 font-black text-5xl italic tracking-tighter">כיתה {change.kita}</span>
                            <div className="bg-orange-600 text-white px-5 py-1.5 rounded-2xl font-black text-2xl shadow-lg">שעה {change.hour}</div>
                        </div>
                        <div className="text-4xl font-black mb-4 text-white drop-shadow-sm">{change.subject}</div>
                        <div className="text-orange-100/90 text-2xl font-bold bg-white/5 p-6 rounded-[2rem] border border-white/5 italic">
                           {change.note} ✨
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-12">
                    <div className="relative">
                        <div className="absolute inset-0 bg-emerald-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                        <div className="w-48 h-48 bg-slate-900 rounded-[3rem] border-4 border-emerald-500/50 flex items-center justify-center relative">
                            <CheckCircle2 size={100} className="text-emerald-500" />
                        </div>
                    </div>
                    <div>
                      <h3 className="text-5xl font-black text-white mb-6 tracking-tight">הכל דבש! 🍯</h3>
                      <p className="text-3xl text-emerald-400 font-black italic">לימודים כסדרם ללא שינויים</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Weekly Grid */
          <div className="h-full w-full bg-slate-900 rounded-[4rem] border-4 border-purple-500 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-500">
            <div className="p-10 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between shadow-xl shrink-0">
              <div className="flex items-center gap-8">
                <div className="p-5 bg-white/10 rounded-3xl backdrop-blur-md">
                    <LayoutGrid size={55} className="text-purple-300" />
                </div>
                <div>
                  <h2 className="text-5xl font-black tracking-tight">לוח אירועים שבועי 📑</h2>
                  <div className="text-emerald-300 font-bold text-2xl mt-2 tracking-wide flex items-center gap-3">
                    <Clock size={24} /> {weeklyData.fullRange}
                  </div>
                </div>
              </div>
              <div className="bg-yellow-400 text-slate-900 px-10 py-5 rounded-[2.5rem] font-black text-3xl shadow-2xl border-b-8 border-yellow-600 animate-pulse">
                שבוע של הצלחה! 🚀
              </div>
            </div>

            <div className="flex-1 p-8">
               <table className="w-full h-full border-separate border-spacing-3">
                 <thead>
                   <tr>
                     <th className="bg-slate-800 p-6 rounded-[2.5rem] border-2 border-slate-700 text-3xl font-black w-44 text-white">כיתה</th>
                     {['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי'].map((day, dIdx) => {
                       const isActive = dIdx === currentDayIndex - 1;
                       return (
                         <th key={day} className={`p-5 rounded-[2.5rem] border-4 text-3xl font-black transition-all duration-500 ${isActive ? 'bg-purple-600 border-purple-400 shadow-xl scale-105' : 'bg-slate-800/40 border-slate-700/20 text-white opacity-60'}`}>
                           {day}
                         </th>
                       );
                     })}
                   </tr>
                 </thead>
                 <tbody className="text-center">
                   {weeklyData.rows.map((row, idx) => (
                     <tr key={idx}>
                       <td className="bg-slate-800 text-white text-5xl font-black rounded-[2.5rem] border-2 border-purple-500/30 shadow-inner italic">
                          {row.kita}
                       </td>
                       {[row.sun, row.mon, row.tue, row.wed, row.thu].map((cell, cidx) => {
                         const isActive = cidx === currentDayIndex - 1;
                         return (
                           <td key={cidx} className={`p-6 rounded-[3rem] border-2 transition-all duration-700 ${isActive ? 'bg-purple-200 border-white shadow-2xl scale-105 z-10 ring-4 ring-purple-500/20' : 'bg-slate-800/20 border-white/5 text-white/40'}`}>
                             {cell && (
                               <div className="flex flex-col items-center justify-center h-full">
                                  <span className={`text-3xl font-black leading-tight tracking-tight ${isActive ? 'text-slate-900' : 'text-white opacity-80'}`}>{cell}</span>
                               </div>
                             )}
                           </td>
                         );
                       })}
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          </div>
        )}
      </div>

      {/* Footer Marquee - Now using rows 2-10 from Column F */}
      <footer className="h-20 bg-slate-950 flex items-center border-t-8 border-emerald-600 overflow-hidden relative z-50">
        <div className="flex whitespace-nowrap animate-infinite-marquee">
          {(sheetData.marquee.length > 5 ? [...sheetData.marquee, ...sheetData.marquee] : [...sheetData.marquee, ...sheetData.marquee, ...sheetData.marquee, ...sheetData.marquee]).map((text, i) => (
            <div key={i} className="flex items-center mx-20 shrink-0">
              <Star className="text-yellow-400 fill-yellow-400 mr-10" size={28} />
              <span className="font-black text-4xl text-white tracking-wider italic drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)]">{text}</span>
            </div>
          ))}
        </div>
      </footer>

      <style>{`
        * { font-style: normal !important; }
        
        @keyframes infinite-scroll-v {
          from { transform: translateY(0); }
          to { transform: translateY(-50%); }
        }
        .animate-infinite-scroll-v {
          animation: infinite-scroll-v 40s linear infinite;
        }
        .animate-infinite-scroll-v-fast {
          animation: infinite-scroll-v 20s linear infinite;
        }

        @keyframes infinite-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(50%); }
        }
        .animate-infinite-marquee {
          animation: infinite-marquee 80s linear infinite;
        }

        .animate-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        
        .zoom-in { animation: zoomIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        @keyframes zoomIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }

        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default App;
