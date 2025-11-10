// --- KONFIGURASI ---
// Gunakan URL relatif jika di-host di Vercel bersama proxy
const API_URL = "/api/proxy"; 

let currentUser = null;
let allPeserta = [];
let currentPeserta = null;

// --- AUTH (Tidak Berubah) ---
async function doLogin() {
    const user = document.getElementById('usernameInput').value;
    const pass = document.getElementById('passwordInput').value;
    const btn = document.getElementById('loginBtn');
    const err = document.getElementById('loginError');

    if (!user || !pass) { err.textContent = 'Isi semua kolom!'; return; }
    btn.textContent = 'Memverifikasi...'; btn.disabled = true; err.textContent = '';

    try {
        const res = await fetch(`${API_URL}?action=login&username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`);
        const data = await res.json();
        if (data.success) {
            currentUser = data.name;
            sessionStorage.setItem('pengawas', currentUser);
            showDashboard();
        } else {
            err.textContent = data.error || 'Login gagal.';
        }
    } catch (e) {
        err.textContent = 'Gagal terhubung ke server.';
    } finally {
        btn.textContent = 'Masuk'; btn.disabled = false;
    }
}

function doLogout() {
    if (confirm('Keluar dari aplikasi?')) {
        sessionStorage.removeItem('pengawas');
        window.location.reload();
    }
}

// --- DASHBOARD ---
function showDashboard() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'block';
    document.getElementById('pengawasName').textContent = currentUser;
    loadPeserta();
}

async function loadPeserta() {
    const loadingEl = document.getElementById('loadingData');
    loadingEl.style.display = 'block';
    document.getElementById('pesertaList').innerHTML = '';
    
    try {
        const res = await fetch(`${API_URL}?action=getExaminees`);
        const data = await res.json();

        if (data.success) {
            allPeserta = data.data;
            renderPeserta(allPeserta);
        } else {
            alert('Gagal memuat data: ' + (data.error || 'Unknown error'));
        }
    } catch (e) {
        document.getElementById('pesertaList').innerHTML = '<p style="text-align:center; color:red; margin-top:20px;">Gagal memuat data. Coba refresh.</p>';
    } finally {
        loadingEl.style.display = 'none';
    }
}

function renderPeserta(list) {
    const listEl = document.getElementById('pesertaList');
    listEl.innerHTML = '';

    if (!list || list.length === 0) {
        listEl.innerHTML = '<p style="text-align:center; color:#94a3b8; margin-top:40px;">Tidak ada data peserta.</p>';
        return;
    }

    list.forEach(p => {
        // --- MAPPING DATA ---
        const no = p['NO PESERTA'] || '-';
        const nama = p['NAMA LENGKAP'] || 'Tanpa Nama';
        const jurusan = p['JURUSAN'] || '-';
        const universitas = p['UNIVERSITAS'] || '-';
        
        // Cek nilai dari berbagai kemungkinan nama kolom
        const scoreValue = p['Score'] || p['SCORE'] || p['NILAI']; 
        // Tentukan status: jika ada nilai, anggap sudah dinilai
        const isDone = (scoreValue !== undefined && scoreValue !== null && scoreValue.toString().trim() !== '');

        const li = document.createElement('li');
        li.className = 'peserta-item';
        li.onclick = () => openScoreModal(no);

        li.innerHTML = `
            <div class="peserta-info">
                <h4>${nama}</h4>
                <p>#${no} • ${jurusan}</p>
                <p style="font-size:0.8em; color:#94a3b8;">${universitas}</p>
            </div>
            <div style="display:flex; align-items:center; gap:10px;">
                ${isDone 
                    ? `<span class="status-badge status-sudah">Score: ${scoreValue}</span>` 
                    : `<span class="status-badge status-belum">Belum Dinilai</span>`
                }
                <span class="arrow-icon">&rsaquo;</span>
            </div>
        `;
        listEl.appendChild(li);
    });
}

function filterPeserta() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    const filtered = allPeserta.filter(p => {
        const namaStr = String(p['NAMA LENGKAP'] || '').toLowerCase();
        const noStr = String(p['NO PESERTA'] || '').toLowerCase();
        return namaStr.includes(q) || noStr.includes(q);
    });
    renderPeserta(filtered);
}

// --- MODAL FLOW ---

// Fungsi baru untuk handle klik peserta
function openScoreModal(noPeserta) {
    currentPeserta = allPeserta.find(p => String(p['NO PESERTA']) === String(noPeserta));
    if (!currentPeserta) return;

    // Ambil data lama jika ada
    const existingScore = currentPeserta['Score'] || currentPeserta['SCORE'] || currentPeserta['NILAI'];
    const existingNotes = currentPeserta['Catatan Tambahan'] || currentPeserta['CATATAN TAMBAHAN'] || currentPeserta['Catatan'] || '';
    const existingAssessor = currentPeserta['Penilai'] || currentPeserta['Pewawancara'] || '';

    // Tentukan status: jika ada nilai, anggap sudah dinilai
    const isDone = (existingScore !== undefined && existingScore !== null && existingScore.toString().trim() !== '');

    if (isDone) {
        // --- MODE READ-ONLY (Lihat Nilai) ---
        document.getElementById('detailNamaView').textContent = currentPeserta['NAMA LENGKAP'];
        document.getElementById('detailNoView').textContent = currentPeserta['NO PESERTA'];
        document.getElementById('detailJurusanView').textContent = currentPeserta['JURUSAN'] || '-';
        document.getElementById('detailUniversitasView').textContent = currentPeserta['UNIVERSITAS'] || '-';

        document.getElementById('viewScore').textContent = existingScore;
        document.getElementById('viewAssessor').textContent = existingAssessor || '(Tidak ada data penilai)';

        const notesRow = document.getElementById('viewNotesRow');
        if (existingNotes && existingNotes.trim().length > 0) {
            document.getElementById('viewNotes').textContent = existingNotes;
            notesRow.style.display = 'flex';
        } else {
            document.getElementById('viewNotes').textContent = '(Tidak ada catatan)';
            notesRow.style.display = 'flex';
        }
        
        document.getElementById('viewScoreModal').style.display = 'flex';

    } else {
        // --- MODE INPUT (Belum Dinilai) ---
        document.getElementById('detailNama').textContent = currentPeserta['NAMA LENGKAP'];
        document.getElementById('detailNo').textContent = currentPeserta['NO PESERTA'];
        document.getElementById('detailJurusan').textContent = currentPeserta['JURUSAN'] || '-';
        document.getElementById('detailUniversitas').textContent = currentPeserta['UNIVERSITAS'] || '-';

        document.getElementById('scoreInput').value = '';
        document.getElementById('notesInput').value = '';
        
        document.getElementById('scoreModal').style.display = 'flex';
    }
}

function openConfirmModal() {
    const score = document.getElementById('scoreInput').value;
    const notes = document.getElementById('notesInput').value;

    if (score === '') {
        alert("Harap isi nilai terlebih dahulu.");
        document.getElementById('scoreInput').focus();
        return;
    }
    const scoreNum = parseFloat(score);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
        alert("Nilai harus angka 0 - 100.");
        return;
    }

    document.getElementById('confirmName').textContent = currentPeserta['NAMA LENGKAP'];
    document.getElementById('confirmScore').textContent = scoreNum;
    
    const notesRow = document.getElementById('confirmNotesRow');
    if (notes && notes.trim().length > 0) {
        document.getElementById('confirmNotes').textContent = notes;
        notesRow.style.display = 'flex';
    } else {
        notesRow.style.display = 'none';
    }

    document.getElementById('confirmModal').style.display = 'flex';
}

function closeAllModals() {
    document.getElementById('scoreModal').style.display = 'none';
    document.getElementById('confirmModal').style.display = 'none';
    document.getElementById('viewScoreModal').style.display = 'none'; // Tutup juga modal view
}

function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
}

async function submitScoreFinal() {
    if (!currentPeserta) return;

    const score = document.getElementById('scoreInput').value;
    const notes = document.getElementById('notesInput').value;
    const btnSave = document.getElementById('finalSubmitBtn');
    const btnCancel = document.getElementById('cancelConfirmBtn');
    const originalText = btnSave.innerHTML;

    btnSave.innerHTML = 'Menyimpan...'; btnSave.disabled = true; btnCancel.disabled = true;

    try {
        const url = `${API_URL}?action=submitScore` +
                    `&id=${encodeURIComponent(currentPeserta['NO PESERTA'])}` +
                    `&nilai=${encodeURIComponent(score)}` +
                    `&catatan=${encodeURIComponent(notes)}` +
                    `&pewawancara=${encodeURIComponent(currentUser)}`;
        
        const res = await fetch(url);
        const data = await res.json();

        if (data.success) {
            // Update data lokal agar UI langsung berubah tanpa refresh
            currentPeserta['Score'] = score; 
            currentPeserta['SCORE'] = score;
            currentPeserta['Catatan Tambahan'] = notes;
            currentPeserta['CATATAN TAMBAHAN'] = notes;
            // Simpan nama pewawancara juga agar muncul saat dilihat kembali
            currentPeserta['Pewawancara'] = currentUser;
            currentPeserta['PEWAWANCARA'] = currentUser;

            closeAllModals();
            renderPeserta(allPeserta);
            filterPeserta();
        } else {
            throw new Error(data.error || 'Gagal menyimpan.');
        }
    } catch (e) {
        alert('Terjadi kesalahan: ' + e.message);
        closeConfirmModal();
    } finally {
        btnSave.innerHTML = originalText; btnSave.disabled = false; btnCancel.disabled = false;
    }
}

// Session check
if (sessionStorage.getItem('pengawas')) {
    currentUser = sessionStorage.getItem('pengawas');
    showDashboard();
} else {
    document.getElementById('loginSection').style.display = 'flex';
    document.getElementById('dashboardSection').style.display = 'none';
}