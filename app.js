const API_URL = "/api/proxy"; 

let currentUser = null;
let allPeserta = [];
let currentPeserta = null; // Menyimpan objek peserta yang sedang dipilih

// --- AUTH ---
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
            err.textContent = data.error || 'Login gagal, periksa username/password.';
        }
    } catch (e) {
        err.textContent = 'Gagal terhubung ke server. Periksa internet Anda.';
    } finally {
        btn.textContent = 'Masuk'; btn.disabled = false;
    }
}

function doLogout() {
    if (confirm('Anda yakin ingin keluar?')) {
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
        document.getElementById('pesertaList').innerHTML = '<p style="text-align:center; color:red; margin-top:20px;">Gagal memuat data. Coba refresh halaman.</p>';
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
        // Mapping data sesuai header baru
        const no = p['NO PESERTA'] || '-';
        const nama = p['NAMA LENGKAP'] || 'Tanpa Nama';
        const jurusan = p['JURUSAN'] || '-';
        const status = p['STATUS'];
        // Cek 'SCORE' dulu, kalau kosong coba cek 'NILAI' (untuk backward compatibility)
        const score = p['SCORE'] || p['NILAI']; 
        
        const isDone = status === 'Sudah Dinilai';

        const li = document.createElement('li');
        li.className = 'peserta-item';
        // Saat baris diklik, buka modal detail
        li.onclick = () => openScoreModal(no);

        li.innerHTML = `
            <div class="peserta-info">
                <h4>${nama}</h4>
                <p>#${no} • ${jurusan}</p>
            </div>
            <div style="display:flex; align-items:center; gap:10px;">
                ${isDone 
                    ? `<span class="status-badge status-sudah">Score: ${score}</span>` 
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

// 1. Buka Modal Input Skor
function openScoreModal(noPeserta) {
    currentPeserta = allPeserta.find(p => String(p['NO PESERTA']) === String(noPeserta));
    if (!currentPeserta) return;

    // Isi detail peserta di modal
    document.getElementById('detailNama').textContent = currentPeserta['NAMA LENGKAP'];
    document.getElementById('detailNo').textContent = currentPeserta['NO PESERTA'];
    document.getElementById('detailJurusan').textContent = `${currentPeserta['JURUSAN']} - ${currentPeserta['UNIVERSITAS']}`;

    // Reset form input
    const existingScore = currentPeserta['SCORE'] || currentPeserta['NILAI'];
    const existingNotes = currentPeserta['CATATAN TAMBAHAN'];

    document.getElementById('scoreInput').value = existingScore || '';
    document.getElementById('notesInput').value = existingNotes || '';
    
    // Tampilkan modal
    document.getElementById('scoreModal').style.display = 'flex';
}

// 2. Buka Modal Konfirmasi
function openConfirmModal() {
    const score = document.getElementById('scoreInput').value;
    if (!score) {
        alert("Mohon isi nilai terlebih dahulu.");
        return;
    }
    if (score < 0 || score > 100) {
        alert("Nilai harus antara 0 - 100.");
        return;
    }

    // Tampilkan ringkasan di modal konfirmasi
    document.getElementById('confirmScore').textContent = score;
    document.getElementById('confirmModal').style.display = 'flex';
}

// 3. Tutup Modal
function closeAllModals() {
    document.getElementById('scoreModal').style.display = 'none';
    document.getElementById('confirmModal').style.display = 'none';
}

function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
}

// 4. Submit Final ke Server
async function submitScoreFinal() {
    if (!currentPeserta) return;

    const score = document.getElementById('scoreInput').value;
    const notes = document.getElementById('notesInput').value;
    const btn = document.getElementById('finalSubmitBtn');
    
    const originalBtnText = btn.textContent;
    btn.textContent = 'Menyimpan...'; btn.disabled = true;

    try {
        // Kirim data lengkap ke proxy -> GAS
        const url = `${API_URL}?action=submitScore` +
                    `&id=${encodeURIComponent(currentPeserta['NO PESERTA'])}` +
                    `&nilai=${encodeURIComponent(score)}` +
                    `&catatan=${encodeURIComponent(notes)}` +
                    `&pewawancara=${encodeURIComponent(currentUser)}`;
        
        const res = await fetch(url);
        const data = await res.json();

        if (data.success) {
            // Update data lokal instan
            currentPeserta['STATUS'] = 'Sudah Dinilai';
            currentPeserta['SCORE'] = score; // Update nilai lokal
            currentPeserta['CATATAN TAMBAHAN'] = notes;

            closeAllModals();
            renderPeserta(allPeserta); // Refresh list UI
            filterPeserta(); // Re-apply filter jika ada

            // Opsional: Tampilkan notifikasi sukses kecil (toast)
            // alert('Data berhasil disimpan!'); 
        } else {
            alert('Gagal menyimpan: ' + data.error);
            closeConfirmModal(); // Tutup konfirmasi saja agar bisa edit lagi
        }
    } catch (e) {
        alert('Error koneksi saat menyimpan. Coba lagi.');
        closeConfirmModal();
    } finally {
        btn.textContent = originalBtnText; btn.disabled = false;
    }
}

// Cek sesi saat load
if (sessionStorage.getItem('pengawas')) {
    currentUser = sessionStorage.getItem('pengawas');
    showDashboard();
}