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

    // Populate detail peserta di modal pertama
    document.getElementById('detailNama').textContent = currentPeserta['NAMA LENGKAP'];
    document.getElementById('detailNo').textContent = currentPeserta['NO PESERTA'];
    // Gunakan kolom baru Anda jika ada, atau fallback ke '-'
    document.getElementById('detailJurusan').textContent = currentPeserta['JURUSAN'] || '-';
    document.getElementById('detailUniversitas').textContent = currentPeserta['UNIVERSITAS'] || '-';

    // Reset form dengan data yang sudah ada (jika edit)
    const existingScore = currentPeserta['SCORE'] || currentPeserta['NILAI'];
    const existingNotes = currentPeserta['CATATAN TAMBAHAN'];

    document.getElementById('scoreInput').value = existingScore || '';
    document.getElementById('notesInput').value = existingNotes || '';
    
    // Tampilkan modal skor
    document.getElementById('scoreModal').style.display = 'flex';
}

// 2. Buka Modal Konfirmasi (Validasi dulu)
function openConfirmModal() {
    const score = document.getElementById('scoreInput').value;
    const notes = document.getElementById('notesInput').value;

    // Validasi Input
    if (score === '') {
        alert("Harap isi nilai terlebih dahulu.");
        document.getElementById('scoreInput').focus();
        return;
    }
    const scoreNum = parseFloat(score);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
        alert("Nilai harus berupa angka antara 0 sampai 100.");
        document.getElementById('scoreInput').focus();
        return;
    }

    // Populate data ke modal konfirmasi
    document.getElementById('confirmName').textContent = currentPeserta['NAMA LENGKAP'];
    document.getElementById('confirmScore').textContent = scoreNum;
    
    const notesRow = document.getElementById('confirmNotesRow');
    if (notes && notes.trim().length > 0) {
        document.getElementById('confirmNotes').textContent = notes;
        notesRow.style.display = 'flex';
    } else {
        notesRow.style.display = 'none';
    }

    // Tampilkan modal konfirmasi (tumpuk di atas modal skor)
    document.getElementById('confirmModal').style.display = 'flex';
}

// 3. Tutup Modal
function closeAllModals() {
    // Tutup semua dengan animasi fade-out sederhana (opsional bisa ditambah class)
    document.getElementById('scoreModal').style.display = 'none';
    document.getElementById('confirmModal').style.display = 'none';
}

function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
}

// 4. Submit Final
async function submitScoreFinal() {
    if (!currentPeserta) return;

    const score = document.getElementById('scoreInput').value;
    const notes = document.getElementById('notesInput').value;
    
    const btnSave = document.getElementById('finalSubmitBtn');
    const btnCancel = document.getElementById('cancelConfirmBtn');
    const originalText = btnSave.innerHTML;

    // State loading di tombol
    btnSave.innerHTML = '<i class="ri-loader-4-line spin"></i> Menyimpan...';
    btnSave.disabled = true;
    btnCancel.disabled = true;

    try {
        // Kirim data lengkap
        const url = `${API_URL}?action=submitScore` +
                    `&id=${encodeURIComponent(currentPeserta['NO PESERTA'])}` +
                    `&nilai=${encodeURIComponent(score)}` +
                    `&catatan=${encodeURIComponent(notes)}` +
                    `&pewawancara=${encodeURIComponent(currentUser)}`;
        
        const res = await fetch(url);
        const data = await res.json();

        if (data.success) {
            // Update data lokal agar UI langsung berubah tanpa reload
            currentPeserta['STATUS'] = 'Sudah Dinilai';
            currentPeserta['SCORE'] = score; // Pastikan key ini sesuai dengan yang dipakai di renderPeserta
            currentPeserta['NILAI'] = score; // Jaga-jaga jika masih pakai key lama
            currentPeserta['CATATAN TAMBAHAN'] = notes;

            closeAllModals();
            renderPeserta(allPeserta); // Refresh tampilan list
            filterPeserta(); // Re-apply filter pencarian
            
            // Opsional: Feedback getar di HP (jika didukung browser)
            if (navigator.vibrate) navigator.vibrate(50);

        } else {
            throw new Error(data.error || 'Gagal menyimpan data di server.');
        }
    } catch (e) {
        alert('Terjadi kesalahan: ' + e.message);
        closeConfirmModal(); // Tutup konfirmasi saja agar bisa coba lagi
    } finally {
        // Reset tombol
        btnSave.innerHTML = originalText;
        btnSave.disabled = false;
        btnCancel.disabled = false;
    }
}

// Cek sesi saat load
if (sessionStorage.getItem('pengawas')) {
    currentUser = sessionStorage.getItem('pengawas');
    showDashboard();
} else {
    // Pastikan login section terlihat jika belum login
    document.getElementById('loginSection').style.display = 'flex';
    document.getElementById('dashboardSection').style.display = 'none';
}