document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. CONFIGURAZIONE DATI ---
    
    const config = {
        startTime: ['06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00'],
        
        pauseStart: ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30'],
        
        pauseEnd: ['13:00', '13:30', '14:00', '14:30', '15:00', '15:30'],
        
        // Label: cosa vede l'utente, Value: minuti da sottrarre
        pauseSimple: [
            { label: '-0', value: 0 },
            { label: '-30m', value: 30 },
            { label: '-1h', value: 60 },
            { label: '-1h 30', value: 90 },
            { label: '-2h', value: 120 },
            // Aggiungo un bottone per resettare manuale se serve
            { label: 'Reset', value: 0 } 
        ],

        // Genero orari fine turno dalle 14:00 alle 20:30 ogni 30 min
        endTime: [] 
    };

    // Popolazione dinamica fine turno (14:00 -> 20:30)
    let h = 14, m = 0;
    while(h < 20 || (h === 20 && m <= 30)) {
        const timeStr = `${h}:${m === 0 ? '00' : m}`;
        config.endTime.push(timeStr);
        m += 30;
        if(m === 60) { m = 0; h++; }
    }

    // --- 2. ELEMENTI DOM ---
    
    const els = {
        start: document.getElementById('startTime'),
        end: document.getElementById('endTime'),
        
        // Mode Detailed
        pStart: document.getElementById('pauseStartTime'),
        pEnd: document.getElementById('pauseEndTime'),
        secDetailed: document.getElementById('section-detailed'),
        btnDetailed: document.getElementById('btnModeDetailed'),
        
        // Mode Simple
        pDur: document.getElementById('pauseDuration'),
        secSimple: document.getElementById('section-simple'),
        btnSimple: document.getElementById('btnModeSimple'),
        
        // Grids
        gStart: document.getElementById('grid-start'),
        gPStart: document.getElementById('grid-pause-start'),
        gPEnd: document.getElementById('grid-pause-end'),
        gPSimple: document.getElementById('grid-pause-simple'),
        gEnd: document.getElementById('grid-end'),
        
        // Results
        resHMM: document.getElementById('resHMM'),
        resDec: document.getElementById('resDec')
    };

    let pauseMode = localStorage.getItem('wt_pause_mode') || 'detailed';

    // --- 3. INIZIALIZZAZIONE ---

    function init() {
        // Render Griglie
        renderButtons(els.gStart, els.start, config.startTime);
        renderButtons(els.gPStart, els.pStart, config.pauseStart);
        renderButtons(els.gPEnd, els.pEnd, config.pauseEnd);
        renderButtons(els.gEnd, els.end, config.endTime);
        
        // Render speciale per Pausa Semplice (oggetti {label, value})
        renderSimplePauseButtons();

        // Load Dati Salvati
        loadState();
        
        // Imposta vista iniziale
        setPauseMode(pauseMode);
        
        // Calcola subito
        calculate();

        // Listener su tutti gli input
        const allInputs = [els.start, els.end, els.pStart, els.pEnd, els.pDur];
        allInputs.forEach(input => {
            input.addEventListener('input', () => {
                saveState();
                calculate();
            });
        });

        // Reset
        document.getElementById('resetBtn').addEventListener('click', () => {
            if(confirm('Resettare tutti i campi?')) {
                localStorage.removeItem('wt_state');
                location.reload();
            }
        });
    }

    // --- 4. RENDER BOTTONI ---

    function renderButtons(container, inputTarget, values) {
        container.innerHTML = '';
        values.forEach(val => {
            const btn = document.createElement('button');
            btn.className = 'qs-btn';
            btn.textContent = val;
            
            // Click Handler
            btn.addEventListener('click', (e) => {
                e.preventDefault(); // Evita focus strani su mobile
                inputTarget.value = val;
                
                // Feedback visivo "Selezionato"
                Array.from(container.children).forEach(c => c.classList.remove('selected'));
                btn.classList.add('selected');

                saveState();
                calculate();
            });
            container.appendChild(btn);
        });
    }

    function renderSimplePauseButtons() {
        els.gPSimple.innerHTML = '';
        config.pauseSimple.forEach(item => {
            const btn = document.createElement('button');
            btn.className = 'qs-btn';
            btn.textContent = item.label;
            
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                els.pDur.value = item.value;
                
                Array.from(els.gPSimple.children).forEach(c => c.classList.remove('selected'));
                btn.classList.add('selected');

                saveState();
                calculate();
            });
            els.gPSimple.appendChild(btn);
        });
    }

    // --- 5. LOGICA CORE ---

    window.setPauseMode = function(mode) {
        pauseMode = mode;
        localStorage.setItem('wt_pause_mode', mode);

        if (mode === 'detailed') {
            els.secDetailed.classList.remove('hidden');
            els.secSimple.classList.add('hidden');
            els.btnDetailed.classList.add('active');
            els.btnSimple.classList.remove('active');
        } else {
            els.secDetailed.classList.add('hidden');
            els.secSimple.classList.remove('hidden');
            els.btnDetailed.classList.remove('active');
            els.btnSimple.classList.add('active');
        }
        calculate();
    };

    function calculate() {
        const startMin = timeToMin(els.start.value);
        const endMin = timeToMin(els.end.value);

        // Se mancano inizio o fine, non calcolo nulla
        if (startMin === null || endMin === null) {
            updateUI(0);
            return;
        }

        let totalMinutes = endMin - startMin;
        let pauseMinutes = 0;

        if (pauseMode === 'detailed') {
            const ps = timeToMin(els.pStart.value);
            const pe = timeToMin(els.pEnd.value);
            
            // Calcola pausa solo se entrambi i campi sono pieni
            if (ps !== null && pe !== null) {
                pauseMinutes = pe - ps;
            }
        } else {
            // Simple Mode
            pauseMinutes = parseInt(els.pDur.value) || 0;
        }

        // Evita risultati negativi se la pausa è > del turno (errore utente)
        let worked = totalMinutes - pauseMinutes;
        
        updateUI(worked);
    }

    function updateUI(minutes) {
        if (minutes <= 0) {
            els.resHMM.textContent = "0h 00m";
            els.resDec.textContent = "0.0";
            return;
        }

        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        const dec = (minutes / 60).toFixed(2);

        els.resHMM.textContent = `${h}h ${m.toString().padStart(2, '0')}m`;
        els.resDec.textContent = `${dec}`;
    }

    // --- UTILITIES ---

    function timeToMin(str) {
        if (!str) return null;
        const [h, m] = str.split(':').map(Number);
        return h * 60 + m;
    }

    function saveState() {
        const state = {
            start: els.start.value,
            end: els.end.value,
            pStart: els.pStart.value,
            pEnd: els.pEnd.value,
            pDur: els.pDur.value
        };
        localStorage.setItem('wt_state', JSON.stringify(state));
    }

    function loadState() {
        const json = localStorage.getItem('wt_state');
        if (!json) return;
        const s = JSON.parse(json);
        
        els.start.value = s.start || '';
        els.end.value = s.end || '';
        els.pStart.value = s.pStart || '';
        els.pEnd.value = s.pEnd || '';
        els.pDur.value = s.pDur || '';
    }

    // Avvio
    init();
});