document.addEventListener('DOMContentLoaded', () => {

    // ====================== STATE ======================
    let laps = [];
    let currentLapIndex = 0;
    let lapTimeRemaining = 0;
    let totalTimeElapsed = 0;
    let isPlaying = false;
    let timerInterval = null;
    let targetsVisible = true;
    let editingLapIndex = -1;
    let isPreparing = false;
    let prepCountdown = 5;
    let skippedCount = 0;
    let loopEnabled = false;
    let currentVolume = 0.9;
    let isDarkTheme = true;
    let userFTP = localStorage.getItem('userFTP') || '';
    let dragSrcIndex = -1;

    const LS_KEY = 'cycling_workouts';
    let savedWorkouts = JSON.parse(localStorage.getItem(LS_KEY) || '{}');

    // ====================== DOM ======================
    const setupScreen    = document.getElementById('setup-screen');
    const workoutScreen  = document.getElementById('workout-screen');
    const summaryScreen  = document.getElementById('summary-screen');
    const lapListEl      = document.getElementById('lap-list');
    const addLapBtn      = document.getElementById('add-lap-btn');
    const addRepeatsBtn  = document.getElementById('add-repeats-btn');
    const startWorkoutBtn = document.getElementById('start-workout-btn');
    const totalWorkoutTimeEl = document.getElementById('total-workout-time');

    const workoutNameInput    = document.getElementById('workout-name');
    const saveWorkoutBtn      = document.getElementById('save-workout-btn');
    const savedWorkoutsSelect = document.getElementById('saved-workouts');
    const loadWorkoutBtn      = document.getElementById('load-workout-btn');
    const exportWorkoutBtn    = document.getElementById('export-workout-btn');
    const importWorkoutBtn    = document.getElementById('import-workout-btn');

    const lapModal     = document.getElementById('lap-modal');
    const cancelLapBtn = document.getElementById('cancel-lap-btn');
    const saveLapBtn   = document.getElementById('save-lap-btn');
    const lapNameInput = document.getElementById('lap-name');
    const lapMinInput  = document.getElementById('lap-min');
    const lapSecInput  = document.getElementById('lap-sec');
    const lapWattInput = document.getElementById('lap-watt');
    const lapRpmInput  = document.getElementById('lap-rpm');

    const repeatsModal     = document.getElementById('repeats-modal');
    const cancelRepeatsBtn = document.getElementById('cancel-repeats-btn');
    const saveRepeatsBtn   = document.getElementById('save-repeats-btn');
    const repNameInput     = document.getElementById('rep-name');
    const addWorkPhaseBtn  = document.getElementById('add-work-phase-btn');
    // workPhasesContainer resolved at call time (inside functions) to avoid stale reference
    function getWorkPhasesContainer() { return document.getElementById('work-phases-container'); }
    const repRecMin   = document.getElementById('rep-rec-min');
    const repRecSec   = document.getElementById('rep-rec-sec');
    const repRecWatt  = document.getElementById('rep-rec-watt');
    const repRecRpm   = document.getElementById('rep-rec-rpm');
    const repCountInput = document.getElementById('rep-count');

    const stopWorkoutBtn    = document.getElementById('stop-workout-btn');
    const globalTimerEl     = document.getElementById('global-timer');
    const toggleTargetBtn   = document.getElementById('toggle-target-btn');
    const targetsContainer  = document.getElementById('targets-container');
    const lapTimerEl        = document.getElementById('lap-timer');
    const lapInfoEl         = document.getElementById('lap-info');
    const targetWattEl      = document.getElementById('target-watt');
    const targetRpmEl       = document.getElementById('target-rpm');
    const playPauseBtn      = document.getElementById('play-pause-btn');
    const skipBtn           = document.getElementById('skip-btn');
    const zoneBox           = document.getElementById('zone-box');

    const nextLapPreview   = document.getElementById('next-lap-preview');
    const nextLapNameEl    = document.getElementById('next-lap-name');
    const nextLapDetailsEl = document.getElementById('next-lap-details');

    const summaryDuration  = document.getElementById('summary-duration');
    const summaryLaps      = document.getElementById('summary-laps');
    const summarySkipped   = document.getElementById('summary-skipped');
    const summaryMessage   = document.getElementById('summary-message');
    const repeatWorkoutBtn = document.getElementById('repeat-workout-btn');
    const backToSetupBtn   = document.getElementById('back-to-setup-btn');

    const volumeSlider   = document.getElementById('volume-slider');
    const loopToggleBtn  = document.getElementById('loop-toggle-btn');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const ftpInput       = document.getElementById('ftp-input');
    const ftpZonesPanel  = document.getElementById('ftp-zones-panel');
    const ftpZonesGrid   = document.getElementById('ftp-zones-grid');

    // ====================== INIT ======================
    updateWorkoutSelect();

    if (userFTP) {
        ftpInput.value = userFTP;
        renderFTPZones();
    }

    if (Object.keys(savedWorkouts).length === 0) {
        laps.push({ name: 'Riscaldamento', time: 600, watt: 'Z1', rpm: 90 });
        laps.push({ name: 'Lavoro', time: 180, watt: '300W', rpm: 95 });
        laps.push({ name: 'Recupero', time: 180, watt: 'Z1', rpm: 85 });
    } else {
        const firstKey = Object.keys(savedWorkouts)[0];
        laps = [...savedWorkouts[firstKey]];
        workoutNameInput.value = firstKey;
    }
    renderLaps();

    // ====================== DRAG & DROP (event delegation) ======================
    lapListEl.addEventListener('dragstart', e => {
        const item = e.target.closest('.lap-item');
        if (!item) return;
        dragSrcIndex = parseInt(item.dataset.lapIndex);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(dragSrcIndex));
        setTimeout(() => item.classList.add('dragging'), 0);
    });

    lapListEl.addEventListener('dragend', e => {
        document.querySelectorAll('.lap-item.dragging').forEach(el => el.classList.remove('dragging'));
        document.querySelectorAll('.lap-item.drag-over').forEach(el => el.classList.remove('drag-over'));
    });

    lapListEl.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const item = e.target.closest('.lap-item');
        if (!item) return;
        document.querySelectorAll('.lap-item.drag-over').forEach(el => el.classList.remove('drag-over'));
        item.classList.add('drag-over');
    });

    lapListEl.addEventListener('dragleave', e => {
        const item = e.target.closest('.lap-item');
        if (item && !item.contains(e.relatedTarget)) {
            item.classList.remove('drag-over');
        }
    });

    lapListEl.addEventListener('drop', e => {
        e.preventDefault();
        const item = e.target.closest('.lap-item');
        if (!item) return;
        item.classList.remove('drag-over');
        const destIndex = parseInt(item.dataset.lapIndex);
        if (!isNaN(dragSrcIndex) && dragSrcIndex !== destIndex) {
            const moved = laps.splice(dragSrcIndex, 1)[0];
            laps.splice(destIndex, 0, moved);
            dragSrcIndex = -1;
            renderLaps();
        }
    });


    // ====================== THEME ======================
    themeToggleBtn.addEventListener('click', () => {
        isDarkTheme = !isDarkTheme;
        document.documentElement.setAttribute('data-theme', isDarkTheme ? 'dark' : 'light');
        themeToggleBtn.textContent = isDarkTheme ? '🌙' : '☀️';
    });

    // ====================== VOLUME ======================
    volumeSlider.addEventListener('input', () => {
        currentVolume = parseFloat(volumeSlider.value);
        audioController.setVolume(currentVolume);
    });

    // ====================== LOOP TOGGLE ======================
    loopToggleBtn.addEventListener('click', () => {
        loopEnabled = !loopEnabled;
        loopToggleBtn.textContent = loopEnabled ? 'ON' : 'OFF';
        loopToggleBtn.setAttribute('data-active', loopEnabled.toString());
    });

    // ====================== SAVE/LOAD ======================
    function updateWorkoutSelect() {
        savedWorkoutsSelect.innerHTML = '<option value="">-- Carica Allenamento --</option>';
        Object.keys(savedWorkouts).forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            savedWorkoutsSelect.appendChild(opt);
        });
    }

    saveWorkoutBtn.addEventListener('click', () => {
        const wName = workoutNameInput.value.trim();
        if (!wName) { alert("Inserisci un nome per l'allenamento"); return; }
        if (laps.length === 0) { alert("Non puoi salvare un allenamento vuoto"); return; }
        savedWorkouts[wName] = [...laps];
        localStorage.setItem(LS_KEY, JSON.stringify(savedWorkouts));
        updateWorkoutSelect();
        alert('Allenamento salvato!');
    });

    loadWorkoutBtn.addEventListener('click', () => {
        const selected = savedWorkoutsSelect.value;
        if (!selected) return;
        laps = [...savedWorkouts[selected]];
        workoutNameInput.value = selected;
        renderLaps();
    });

    exportWorkoutBtn.addEventListener('click', () => {
        if (laps.length === 0) { alert("Aggiungi almeno un lap!"); return; }
        const code = btoa(unescape(encodeURIComponent(JSON.stringify(laps))));
        navigator.clipboard.writeText(code).then(() => {
            alert("Codice COPIATO!\n\nIncollalo su WhatsApp/Telegram a te stesso,\npoi sul telefono usa 'Importa'.");
        }).catch(() => prompt("Copia questo codice:", code));
    });

    importWorkoutBtn.addEventListener('click', () => {
        const code = prompt("Incolla il codice allenamento:");
        if (!code) return;
        try {
            const importedLaps = JSON.parse(decodeURIComponent(escape(atob(code))));
            if (Array.isArray(importedLaps) && importedLaps.length > 0) {
                laps = importedLaps;
                workoutNameInput.value = 'Allenamento Importato';
                renderLaps();
                alert("Allenamento importato!");
            } else { alert("Codice non valido."); }
        } catch(e) { alert("Errore decodifica codice."); }
    });

    // ====================== LAP MODAL ======================
    addLapBtn.addEventListener('click', () => {
        editingLapIndex = -1;
        document.querySelector('#lap-modal h2').textContent = 'Configura Lap';
        saveLapBtn.textContent = 'Salva';
        lapNameInput.value = '';
        lapMinInput.value = 1;
        lapSecInput.value = 0;
        lapWattInput.value = '';
        lapRpmInput.value = '';
        lapModal.classList.remove('hidden');
    });
    cancelLapBtn.addEventListener('click', () => lapModal.classList.add('hidden'));

    saveLapBtn.addEventListener('click', () => {
        const time = (parseInt(lapMinInput.value) || 0) * 60 + (parseInt(lapSecInput.value) || 0);
        if (time <= 0) { alert("Inserire un tempo > 0"); return; }
        const newLap = {
            name: lapNameInput.value.trim(),
            time,
            watt: lapWattInput.value || '---',
            rpm: lapRpmInput.value || '---'
        };
        if (editingLapIndex !== -1) {
            laps[editingLapIndex] = newLap;
            editingLapIndex = -1;
        } else { laps.push(newLap); }
        lapModal.classList.add('hidden');
        renderLaps();
    });

    // ====================== RIPETUTE MODAL (MULTI-LAVORO) ======================
    let workPhaseCount = 0;

    function createWorkPhaseEl(phaseIndex) {
        const div = document.createElement('div');
        div.className = 'work-phase';
        div.setAttribute('data-phase', phaseIndex);
        div.innerHTML = [
            '<div class="work-phase-header">',
            `  <span class="work-phase-label">&#x1F525; Fase ${phaseIndex + 1}</span>`,
            phaseIndex > 0 ? '  <button class="remove-phase-btn" type="button">&#x2715; Rimuovi</button>' : '',
            '</div>',
            '<div class="form-group">',
            '  <input type="text" class="phase-name" placeholder="Nome fase (es. Z3, Soglia...)"',
            '   style="width:100%;background:var(--bg-surface);border:1px solid var(--border);',
            '   color:var(--text-primary);padding:10px;border-radius:10px;font-size:15px;font-weight:600;">',
            '</div>',
            '<div class="form-group row-group">',
            `  <div class="col"><label>Min</label><input type="number" class="phase-min" value="${phaseIndex === 0 ? 2 : 1}" min="0"></div>`,
            '  <div class="col"><label>Sec</label><input type="number" class="phase-sec" value="0" min="0" max="59"></div>',
            '  <div class="col"><label>Watt/Z</label><input type="text" class="phase-watt" placeholder="300W"></div>',
            '  <div class="col"><label>RPM</label><input type="number" class="phase-rpm" placeholder="95"></div>',
            '</div>'
        ].join('');

        const removeBtn = div.querySelector('.remove-phase-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                div.remove();
                renumberWorkPhases();
            });
        }
        return div;
    }

    function renumberWorkPhases() {
        const container = getWorkPhasesContainer();
        if (!container) return;
        const phases = container.querySelectorAll('.work-phase');
        phases.forEach((ph, i) => {
            ph.setAttribute('data-phase', i);
            const label = ph.querySelector('.work-phase-label');
            if (label) label.textContent = `\uD83D\uDD25 Fase ${i + 1}`;
            const rb = ph.querySelector('.remove-phase-btn');
            if (i === 0 && rb) rb.remove();
        });
        workPhaseCount = phases.length;
    }

    function initWorkPhases() {
        const container = getWorkPhasesContainer();
        if (!container) { console.error('work-phases-container not found!'); return; }
        container.innerHTML = '';
        workPhaseCount = 0;
        container.appendChild(createWorkPhaseEl(0));
        workPhaseCount = 1;
    }

    addRepeatsBtn.addEventListener('click', () => {
        repNameInput.value = '';
        repRecMin.value = 3;
        repRecSec.value = 0;
        repRecWatt.value = '';
        repRecRpm.value = '';
        repCountInput.value = 4;
        initWorkPhases();
        repeatsModal.classList.remove('hidden');
    });

    addWorkPhaseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const container = getWorkPhasesContainer();
        if (!container) return;
        const newPhase = createWorkPhaseEl(workPhaseCount);
        container.appendChild(newPhase);
        workPhaseCount++;
        renumberWorkPhases();
        // Scroll modal to show new phase
        newPhase.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    cancelRepeatsBtn.addEventListener('click', () => repeatsModal.classList.add('hidden'));

    saveRepeatsBtn.addEventListener('click', () => {
        // Collect all work phases
        const phases = [];
        const container = getWorkPhasesContainer();
        if (!container) return;
        container.querySelectorAll('.work-phase').forEach(phaseEl => {
            const min  = parseInt(phaseEl.querySelector('.phase-min').value) || 0;
            const sec  = parseInt(phaseEl.querySelector('.phase-sec').value) || 0;
            const time = min * 60 + sec;
            const watt = phaseEl.querySelector('.phase-watt').value.trim() || '---';
            const rpm  = phaseEl.querySelector('.phase-rpm').value.trim() || '---';
            const nm   = phaseEl.querySelector('.phase-name').value.trim();
            if (time > 0) phases.push({ time, watt, rpm, name: nm });
        });

        const timeRec = (parseInt(repRecMin.value) || 0) * 60 + (parseInt(repRecSec.value) || 0);
        const times   = Math.max(1, parseInt(repCountInput.value) || 1);
        const baseName = repNameInput.value.trim() || 'Ripetute';

        if (phases.length === 0 && timeRec === 0) {
            alert("Inserisci almeno una fase di lavoro o il recupero con tempo > 0");
            return;
        }

        for (let i = 1; i <= times; i++) {
            phases.forEach((phase, pi) => {
                const phaseName = phase.name ||
                    (phases.length === 1 ? 'LAV' : `LAV${pi + 1}`);
                laps.push({
                    name: `${baseName} - ${phaseName} ${i}/${times}`,
                    time: phase.time,
                    watt: phase.watt,
                    rpm:  phase.rpm
                });
            });
            if (timeRec > 0) {
                laps.push({
                    name: `${baseName} - REC ${i}/${times}`,
                    time: timeRec,
                    watt: repRecWatt.value.trim() || '---',
                    rpm:  repRecRpm.value.trim() || '---'
                });
            }
        }

        repeatsModal.classList.add('hidden');
        renderLaps();
    });

    // ====================== FTP LOGIC ======================
    ftpInput.addEventListener('input', () => {
        const val = parseInt(ftpInput.value);
        if (val && val >= 50 && val <= 600) {
            userFTP = val.toString();
            localStorage.setItem('userFTP', userFTP);
            renderFTPZones();
            renderLaps();
        } else if (!val) {
            userFTP = '';
            localStorage.removeItem('userFTP');
            ftpZonesPanel.classList.add('hidden');
            renderLaps();
        }
    });

    function renderFTPZones() {
        if (!userFTP) { ftpZonesPanel.classList.add('hidden'); return; }
        const ftp = parseInt(userFTP);
        const z1Max = Math.round(ftp * 0.55);
        const z2Min = z1Max + 1; const z2Max = Math.round(ftp * 0.75);
        const z3Min = z2Max + 1; const z3Max = Math.round(ftp * 0.90);
        const z4Min = z3Max + 1; const z4Max = Math.round(ftp * 1.05);
        const z5Min = z4Max + 1;
        ftpZonesGrid.innerHTML = `
            <div class="ftp-zone-badge badge-z1"><span class="zone-label">Z1</span><span class="zone-name">Risc.</span><span class="zone-range">&lt;${z1Max}W</span></div>
            <div class="ftp-zone-badge badge-z2"><span class="zone-label">Z2</span><span class="zone-name">Fondo</span><span class="zone-range">${z2Min}-${z2Max}W</span></div>
            <div class="ftp-zone-badge badge-z3"><span class="zone-label">Z3</span><span class="zone-name">Ritmo</span><span class="zone-range">${z3Min}-${z3Max}W</span></div>
            <div class="ftp-zone-badge badge-z4"><span class="zone-label">Z4</span><span class="zone-name">Soglia</span><span class="zone-range">${z4Min}-${z4Max}W</span></div>
            <div class="ftp-zone-badge badge-z5"><span class="zone-label">Z5</span><span class="zone-name">VO2/Sprint</span><span class="zone-range">&gt;${z5Min}W</span></div>`;
        ftpZonesPanel.classList.remove('hidden');
    }

    // ====================== ZONE DETECTION ======================
    function detectZone(wattStr) {
        if (!wattStr || wattStr === '---') return null;
        const s = wattStr.toString().toUpperCase();
        if (s.includes('Z5') || s.includes('ZONA 5') || s.includes('VO2')) return 'zone-5';
        if (s.includes('Z4') || s.includes('ZONA 4') || s.includes('SOGLIA')) return 'zone-4';
        if (s.includes('Z3') || s.includes('ZONA 3') || s.includes('RITMO')) return 'zone-3';
        if (s.includes('Z2') || s.includes('ZONA 2') || s.includes('FONDO')) return 'zone-2';
        if (s.includes('Z1') || s.includes('ZONA 1') || s.includes('RISC')) return 'zone-1';
        const wNum = parseInt(s);
        if (!isNaN(wNum)) {
            if (userFTP) {
                const ftp = parseInt(userFTP);
                if (wNum > Math.round(ftp * 1.05)) return 'zone-5';
                if (wNum > Math.round(ftp * 0.90)) return 'zone-4';
                if (wNum > Math.round(ftp * 0.75)) return 'zone-3';
                if (wNum > Math.round(ftp * 0.55)) return 'zone-2';
                return 'zone-1';
            } else {
                if (wNum >= 350) return 'zone-5';
                if (wNum >= 280) return 'zone-4';
                if (wNum >= 220) return 'zone-3';
                if (wNum >= 150) return 'zone-2';
                return 'zone-1';
            }
        }
        return null;
    }

    // ====================== RENDER LAPS (with Drag & Drop) ======================
    function renderLaps() {
        lapListEl.innerHTML = '';
        let totalSec = 0;

        laps.forEach((lap, index) => {
            totalSec += lap.time;
            const min = Math.floor(lap.time / 60);
            const sec = lap.time % 60;
            const timeStr = `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
            const displayName = lap.name || `Lap ${index + 1}`;
            const zone = detectZone(lap.watt);

            const item = document.createElement('div');
            item.className = 'lap-item' + (zone ? ' ' + zone : '');
            item.setAttribute('draggable', 'true');
            item.dataset.lapIndex = index;
            item.innerHTML = `
                <div class="drag-handle">&#x2807;</div>
                <div class="lap-item-info">
                    <span class="lap-item-time">${displayName} &mdash; ${timeStr}</span>
                    <span class="lap-item-targets">W: ${lap.watt} &nbsp;|&nbsp; RPM: ${lap.rpm}</span>
                </div>
                <div class="lap-actions">
                    <button class="edit-btn" data-index="${index}">&#x270F;&#xFE0F;</button>
                    <button class="delete-btn" data-index="${index}">&times;</button>
                </div>`;

            lapListEl.appendChild(item);
        });

        // Total time display
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        let t = '';
        if (h > 0) t += `${h}h `;
        t += `${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
        totalWorkoutTimeEl.textContent = `⏱ Tempo Totale: ${t}`;

        // Edit buttons
        document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', e => {
            editingLapIndex = parseInt(e.currentTarget.getAttribute('data-index'));
            const lap = laps[editingLapIndex];
            document.querySelector('#lap-modal h2').textContent = 'Modifica Lap';
            saveLapBtn.textContent = 'Aggiorna';
            lapNameInput.value = lap.name;
            lapMinInput.value = Math.floor(lap.time / 60);
            lapSecInput.value = lap.time % 60;
            lapWattInput.value = lap.watt === '---' ? '' : lap.watt;
            lapRpmInput.value  = lap.rpm  === '---' ? '' : lap.rpm;
            lapModal.classList.remove('hidden');
        }));

        // Delete buttons — con conferma
        document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', e => {
            const idx = parseInt(e.currentTarget.getAttribute('data-index'));
            const name = laps[idx].name || `Lap ${idx + 1}`;
            if (confirm(`Eliminare "${name}"?`)) {
                laps.splice(idx, 1);
                renderLaps();
            }
        }));

        startWorkoutBtn.disabled = laps.length === 0;
        startWorkoutBtn.style.opacity = laps.length === 0 ? '0.5' : '1';
    }

    // ====================== WORKOUT LOGIC ======================
    startWorkoutBtn.addEventListener('click', async () => {
        if (laps.length === 0) return;
        audioController.init();
        await requestWakeLock();

        isPreparing = true;
        prepCountdown = 5;
        currentLapIndex = 0;
        totalTimeElapsed = 0;
        skippedCount = 0;

        setupScreen.classList.remove('active');
        workoutScreen.classList.add('active');

        lapTimerEl.textContent = '00:05';
        lapInfoEl.textContent = 'PREPARATI...';
        targetWattEl.textContent = '---';
        targetRpmEl.textContent = '---';
        globalTimerEl.textContent = '00:00';
        nextLapPreview.classList.add('hidden');
        zoneBox.className = 'target-box';

        playWorkout();
    });

    stopWorkoutBtn.addEventListener('click', () => {
        if (confirm("Interrompere l'allenamento?")) {
            pauseWorkout();
            releaseWakeLock();
            workoutScreen.classList.remove('active');
            setupScreen.classList.add('active');
        }
    });

    toggleTargetBtn.addEventListener('click', () => {
        targetsVisible = !targetsVisible;
        targetsContainer.classList.toggle('hidden', !targetsVisible);
        toggleTargetBtn.style.opacity = targetsVisible ? '1' : '0.5';
    });

    playPauseBtn.addEventListener('click', () => {
        if (isPlaying) { pauseWorkout(); }
        else { audioController.init(); playWorkout(); }
    });

    skipBtn.addEventListener('click', () => {
        if (!isPlaying && !isPreparing) return;
        if (isPreparing) {
            isPreparing = false;
            startLap(currentLapIndex);
            return;
        }
        skippedCount++;
        currentLapIndex++;
        if (currentLapIndex >= laps.length) { finishWorkout(); }
        else { startLap(currentLapIndex); }
        vibrate([50]);
    });

    repeatWorkoutBtn.addEventListener('click', () => {
        summaryScreen.classList.remove('active');
        workoutScreen.classList.add('active');
        currentLapIndex = 0;
        totalTimeElapsed = 0;
        skippedCount = 0;
        isPreparing = true;
        prepCountdown = 5;
        lapTimerEl.textContent = '00:05';
        lapInfoEl.textContent = 'PREPARATI...';
        targetWattEl.textContent = '---';
        targetRpmEl.textContent = '---';
        globalTimerEl.textContent = '00:00';
        nextLapPreview.classList.add('hidden');
        zoneBox.className = 'target-box';
        playWorkout();
    });

    backToSetupBtn.addEventListener('click', () => {
        summaryScreen.classList.remove('active');
        setupScreen.classList.add('active');
    });

    function startLap(index) {
        nextLapPreview.classList.add('hidden');
        if (index >= laps.length) { finishWorkout(); return; }
        const lap = laps[index];
        lapTimeRemaining = lap.time;
        const displayName = lap.name || `Lap ${index + 1}`;
        lapInfoEl.textContent = `${displayName} (${index + 1} / ${laps.length})`;
        targetWattEl.textContent = lap.watt;
        targetRpmEl.textContent  = lap.rpm;
        const zone = detectZone(lap.watt);
        zoneBox.className = 'target-box' + (zone ? ' ' + zone : '');
        updateTimerDisplays();
        checkNextLapPreview();
    }

    function finishWorkout() {
        pauseWorkout();
        releaseWakeLock();
        audioController.playHighBeep();
        setTimeout(() => audioController.playHighBeep(), 600);
        vibrate([200, 100, 200]);

        workoutScreen.classList.remove('active');
        summaryScreen.classList.add('active');

        const th = Math.floor(totalTimeElapsed / 3600);
        const tm = Math.floor((totalTimeElapsed % 3600) / 60);
        const ts = totalTimeElapsed % 60;
        let td = '';
        if (th > 0) td += `${th}h `;
        td += `${String(tm).padStart(2,'0')}m ${String(ts).padStart(2,'0')}s`;
        summaryDuration.textContent = td;
        summaryLaps.textContent    = currentLapIndex - skippedCount;
        summarySkipped.textContent = skippedCount;

        const messages = [
            'Grande lavoro! Continua così! 💪',
            'Eccellente! Sei un vero campione! 🏆',
            'Allenamento completato! Recupera bene! 🚴',
            'Bravissimo! Gambe di ferro! 🔥',
            'Fantastico! Il podio si avvicina! 🎯'
        ];
        summaryMessage.textContent = messages[Math.floor(Math.random() * messages.length)];
        if (loopEnabled) setTimeout(() => repeatWorkoutBtn.click(), 3000);
    }

    function playWorkout() {
        if (!isPreparing && currentLapIndex >= laps.length) return;
        isPlaying = true;
        playPauseBtn.textContent = 'PAUSA';
        playPauseBtn.style.background = 'linear-gradient(135deg, var(--warning), #d97706)';
        playPauseBtn.style.boxShadow = '0 4px 20px rgba(245, 158, 11, 0.4)';
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(tick, 1000);
    }

    function pauseWorkout() {
        isPlaying = false;
        playPauseBtn.textContent = 'RIPRENDI';
        playPauseBtn.style.background = 'linear-gradient(135deg, var(--success), #059669)';
        playPauseBtn.style.boxShadow = '0 4px 20px rgba(16, 185, 129, 0.4)';
        clearInterval(timerInterval);
    }

    function tick() {
        if (isPreparing) {
            if (prepCountdown > 0) {
                audioController.playShortBeep();
                vibrate([80]);
            }
            prepCountdown--;
            if (prepCountdown <= 0) {
                isPreparing = false;
                audioController.playHighBeep();
                vibrate([300]);
                startLap(currentLapIndex);
            } else {
                lapTimerEl.textContent = `00:0${prepCountdown}`;
            }
            return;
        }

        lapTimeRemaining--;
        totalTimeElapsed++;
        updateTimerDisplays();
        checkNextLapPreview();

        if (lapTimeRemaining > 0 && lapTimeRemaining <= 5) {
            audioController.playShortBeep();
            vibrate([80]);
        } else if (lapTimeRemaining <= 0) {
            audioController.playHighBeep();
            vibrate([300]);
            currentLapIndex++;
            if (currentLapIndex >= laps.length) { finishWorkout(); }
            else { startLap(currentLapIndex); }
        }
    }

    function checkNextLapPreview() {
        if (currentLapIndex < laps.length - 1 && lapTimeRemaining <= 30 && lapTimeRemaining > 0) {
            const nextLap = laps[currentLapIndex + 1];
            nextLapNameEl.textContent    = nextLap.name || `Lap ${currentLapIndex + 2}`;
            nextLapDetailsEl.textContent = `${nextLap.watt} | ${nextLap.rpm} RPM`;
            nextLapPreview.classList.remove('hidden');
        } else {
            nextLapPreview.classList.add('hidden');
        }
    }

    function updateTimerDisplays() {
        const gm = Math.floor(totalTimeElapsed / 60);
        const gs = totalTimeElapsed % 60;
        globalTimerEl.textContent = `${String(gm).padStart(2,'0')}:${String(gs).padStart(2,'0')}`;
        if (lapTimeRemaining < 0) return;
        const lm = Math.floor(lapTimeRemaining / 60);
        const ls = lapTimeRemaining % 60;
        lapTimerEl.textContent = `${String(lm).padStart(2,'0')}:${String(ls).padStart(2,'0')}`;
    }

    // ====================== HAPTIC ======================
    function vibrate(pattern) {
        if ('vibrate' in navigator) { try { navigator.vibrate(pattern); } catch(e) {} }
    }
});
