document.addEventListener('DOMContentLoaded', () => {
    // --- Configurazione ---
    const quickTimes = ['06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00'];
    
    // --- Selectors ---
    const inputs = {
        modeA: document.getElementById('modeA-inputs'),
        modeB: document.getElementById('modeB-inputs'),
        start: document.getElementById('startTime'),
        end: document.getElementById('endTime'),
        pauseStart: document.getElementById('pauseStart'),
        pauseEnd: document.getElementById('pauseEnd'),
        pauseDur: document.getElementById('pauseDuration'),
        resHMM: document.getElementById('resHMM'),
        resDec: document.getElementById('resDec'),
        qsContainer: document.getElementById('quickSelectContainer')
    };

    let currentMode = localStorage.getItem('wt_mode') || 'A';

    // --- Inizializzazione ---
    initQuickSelect();
    loadState();
    switchMode(currentMode);
    
    // --- Event Listeners ---
    // Aggiunge listener a tutti gli input per calcolo automatico e salvataggio
    ['startTime', 'endTime', 'pauseStart', 'pauseEnd', 'pauseDuration'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            saveState();
            calculate();
        });
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
        if(confirm('Cancellare i dati inseriti?')) {
            clearState();
        }
    });

    // --- Funzioni Core ---

    function initQuickSelect() {
        inputs.qsContainer.innerHTML = '';
        quickTimes.forEach(time => {
            const btn = document.createElement('button');
            btn.className = 'qs-btn';
            btn.textContent = time;
            btn.onclick = () => {
                inputs.start.value = time;
                saveState();
                calculate();
            };
            inputs.qsContainer.appendChild(btn);
        });
    }

    window.switchMode = function(mode) {
        currentMode = mode;
        document.getElementById('btnModeA').className = mode === 'A' ? 'mode-btn active' : 'mode-btn';
        document.getElementById('btnModeB').className = mode === 'B' ? 'mode-btn active' : 'mode-btn';
        
        if (mode === 'A') {
            inputs.modeA.classList.remove('hidden');
            inputs.modeB.classList.add('hidden');
        } else {
            inputs.modeA.classList.add('hidden');
            inputs.modeB.classList.remove('hidden');
        }
        saveState();
        calculate();
    };

    window.adjustPause = function(delta) {
        let val = parseInt(inputs.pauseDur.value) || 0;
        val += delta;
        if (val < 0) val = 0;
        inputs.pauseDur.value = val;
        saveState();
        calculate();
    };

    function calculate() {
        const start = timeToMin(inputs.start.value);
        const end = timeToMin(inputs.end.value);
        let workedMinutes = 0;

        if (start === null || end === null) {
            updateUI(0);
            return;
        }

        if (currentMode === 'A') {
            // Modalità A: (Fine - FinePausa) + (InizioPausa - Inizio)
            const pStart = timeToMin(inputs.pauseStart.value);
            const pEnd = timeToMin(inputs.pauseEnd.value);

            if (pStart !== null && pEnd !== null) {
                // Prima parte + Seconda parte
                const session1 = pStart - start;
                const session2 = end - pEnd;
                workedMinutes = session1 + session2;
            } else {
                // Se mancano dati pausa, calcola diretto (fallback)
                workedMinutes = end - start;
            }

        } else {
            // Modalità B: (Fine - Inizio) - DurataPausa
            const pDur = parseInt(inputs.pauseDur.value) || 0;
            workedMinutes = (end - start) - pDur;
        }

        updateUI(workedMinutes);
    }

    function updateUI(minutes) {
        if (minutes <= 0) {
            inputs.resHMM.textContent = "--:--";
            inputs.resDec.textContent = "--";
            return;
        }

        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        const dec = (minutes / 60).toFixed(2);

        inputs.resHMM.textContent = `${h}h ${m.toString().padStart(2, '0')}m`;
        inputs.resDec.textContent = `${dec} ore`;
    }

    // --- Utilities ---

    function timeToMin(timeStr) {
        if (!timeStr) return null;
        const [h, m] = timeStr.split(':').map(Number);
        return (h * 60) + m;
    }

    function saveState() {
        const state = {
            mode: currentMode,
            start: inputs.start.value,
            end: inputs.end.value,
            pStart: inputs.pauseStart.value,
            pEnd: inputs.pauseEnd.value,
            pDur: inputs.pauseDur.value
        };
        localStorage.setItem('wt_state', JSON.stringify(state));
        localStorage.setItem('wt_mode', currentMode);
    }

    function loadState() {
        const saved = localStorage.getItem('wt_state');
        if (saved) {
            const s = JSON.parse(saved);
            inputs.start.value = s.start || '';
            inputs.end.value = s.end || '';
            inputs.pauseStart.value = s.pStart || '';
            inputs.pauseEnd.value = s.pEnd || '';
            inputs.pauseDur.value = s.pDur || '0';
        }
    }

    function clearState() {
        localStorage.removeItem('wt_state');
        location.reload();
    }
});