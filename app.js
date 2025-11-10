const API_URL = "/api/proxy"; 

let currentUser = null;
let allPeserta = [];
let selectedPesertaId = null;
let selectedPesertaName = null;

// --- AUTH ---
async function doLogin() {
    const user = document.getElementById('usernameInput').value;
    const pass = document.getElementById('passwordInput').value;
    const btn = document.getElementById('loginBtn');
    const err = document.getElementById('loginError');

    if (!user || !pass) { err.textContent = 'Isi semua kolom!'; return; }

    btn.textContent = 'Loading...'; btn.disabled = true; err.textContent = '';

    try {
        const res = await fetch(`${API_URL}?action=login&username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`);
        const data = await res.json();

        if (data.success) {
            currentUser = data.name;
            sessionStorage.setItem('pengawas', currentUser);
            showDashboard();
        } else {
            err.textContent = data.error || 'Login gagal';
        }
    } catch (e) {
        err.textContent = 'Gagal terhubung ke server.';
    } finally {
        btn.textContent = 'Masuk'; btn.disabled = false;
    }
}

function doLogout() {
    sessionStorage.removeItem('pengawas');
    window.location.reload();
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
    
    try {
        const res = await fetch(`${API_URL}?action=getExaminees`);
        const data = await res.json();

        if (data.success) {
            allPeserta = data.data;
            renderPeserta(allPeserta);
        } else {
            alert('Gagal memuat data: ' + data.error);
        }
    } catch (e) {
        alert('Error koneksi saat memuat data.');
    } finally {
        loadingEl.style.display = 'none';
    }
}

function renderPeserta(list) {
    const listEl = document.getElementById('pesertaList');
    listEl.innerHTML = '';

    if (list.length === 0) {
        listEl.innerHTML = '<p style="text-align:center; color:#666;">Tidak ada data.</p>';
        return;
    }

    list.forEach(p => {
        // KUNCI PERUBAHAN DI SINI: Menggunakan nama kolom baru Anda
        // Pastikan key ini SAMA PERSIS dengan Header di Google Sheet (huruf besar/kecil, spasi)
        const no = p['NO PESERTA'] || '-';
        const nama = p['NAMA LENGKAP'] || 'Tanpa Nama';
        const jurusan = p['JURUSAN'] || '-';
        const universitas = p['UNIVERSITAS'] || '-';
        const status = p['STATUS']; // Kolom H yang kita tambahkan
        const nilai = p['NILAI'];   // Kolom I yang kita tambahkan
        
        const isDone = status === 'Sudah Dinilai';

        const li = document.createElement('li');
        li.className = 'peserta-item';
        li.innerHTML = `
            <div class="peserta-info">
                <h4>${nama} <span style="font-weight:normal; font-size:0.9em; color:#666;">(#${no})</span></h4>
                <p>${jurusan} - ${universitas}</p>
            </div>
            <div>
                ${isDone 
                    ? `<span class="status-badge status-sudah">Nilai: ${nilai}</span>` 
                    : `<button onclick="openModal('${no}', '${nama.replace(/'/g, "\\'")}')" style="cursor:pointer; background:#2563eb; color:white; border:none; padding:8px 12px; border-radius:6px; font-weight:600;">Input Nilai</button>`
                }
            </div>
        `;
        listEl.appendChild(li);
    });
}

function filterPeserta() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    const filtered = allPeserta.filter(p => {
        // Filter berdasarkan NAMA LENGKAP atau NO PESERTA
        const namaStr = String(p['NAMA LENGKAP'] || '').toLowerCase();
        const noStr = String(p['NO PESERTA'] || '').toLowerCase();
        return namaStr.includes(q) || noStr.includes(q);
    });
    renderPeserta(filtered);
}

// --- MODAL & SUBMIT ---
function openModal(id, name) {
    selectedPesertaId = id; // Ini sekarang adalah 'NO PESERTA' (contoh: 720)
    selectedPesertaName = name;
    document.getElementById('modalPesertaName').textContent = name;
    document.getElementById('scoreModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('scoreModal').style.display = 'none';
    document.getElementById('scoreInput').value = '';
}

async function submitScore() {
    const score = document.getElementById('scoreInput').value;
    if (!score) return alert("Masukkan nilai terlebih dahulu!");

    const btn = document.querySelector('.save-btn');
    const originalText = btn.textContent;
    btn.textContent = 'Menyimpan...'; btn.disabled = true;

    try {
        // Kita kirim 'id' yang isinya adalah NO PESERTA
        const url = `${API_URL}?action=submitScore&id=${encodeURIComponent(selectedPesertaId)}&nilai=${score}&pewawancara=${encodeURIComponent(currentUser)}`;
        
        const res = await fetch(url);
        const data = await res.json();

        if (data.success) {
            closeModal();
            // Update data lokal agar tidak perlu reload seluruh halaman dari server
            updateLocalData(selectedPesertaId, score);
        } else {
            alert('Gagal menyimpan: ' + data.error);
        }
    } catch (e) {
        alert('Gagal terhubung ke server.');
    } finally {
        btn.textContent = originalText; btn.disabled = false;
    }
}

// Helper untuk update tampilan instan setelah submit
function updateLocalData(noPeserta, nilaiBaru) {
    const target = allPeserta.find(p => String(p['NO PESERTA']) === String(noPeserta));
    if (target) {
        target['STATUS'] = 'Sudah Dinilai';
        target['NILAI'] = nilaiBaru;
        renderPeserta(allPeserta); // Render ulang list dengan data baru
        filterPeserta(); // Terapkan filter pencarian jika sedang aktif
    }
}

// Cek sesi saat halaman dimuat
if (sessionStorage.getItem('pengawas')) {
    currentUser = sessionStorage.getItem('pengawas');
    showDashboard();
}