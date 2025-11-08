const API_URL = "/api/proxy"; // Points to Vercel proxy

let currentUser = null;
let allPeserta = [];
let selectedPesertaId = null;

// --- AUTH ---
async function doLogin() {
    const user = document.getElementById('usernameInput').value;
    const pass = document.getElementById('passwordInput').value;
    const btn = document.getElementById('loginBtn');
    const err = document.getElementById('loginError');

    btn.textContent = 'Loading...'; btn.disabled = true; err.textContent = '';

    try {
        // Call our secure proxy with login action
        const res = await fetch(`${API_URL}?action=login&username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`);
        const data = await res.json();

        if (data.success) {
            currentUser = data.name;
            // Save session so refresh doesn't log them out immediately
            sessionStorage.setItem('pengawas', currentUser);
            showDashboard();
        } else {
            err.textContent = data.error || 'Login gagal';
        }
    } catch (e) {
        err.textContent = 'Error koneksi: ' + e.message;
    } finally {
        btn.textContent = 'Masuk'; btn.disabled = false;
    }
}

function doLogout() {
    sessionStorage.removeItem('pengawas');
    location.reload();
}

// --- DASHBOARD ---
function showDashboard() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'block';
    document.getElementById('pengawasName').textContent = currentUser;
    loadPeserta();
}

async function loadPeserta() {
    const listEl = document.getElementById('pesertaList');
    const loadingEl = document.getElementById('loadingData');
    
    try {
        const res = await fetch(`${API_URL}?action=getExaminees`);
        const data = await res.json();

        if (data.success) {
            allPeserta = data.data;
            renderPeserta(allPeserta);
            loadingEl.style.display = 'none';
        }
    } catch (e) {
        loadingEl.textContent = 'Gagal memuat data.';
    }
}

function renderPeserta(list) {
    const listEl = document.getElementById('pesertaList');
    listEl.innerHTML = '';
    list.forEach(p => {
        // Assuming headers: id_peserta, nama_peserta, posisi_dilamar, status, nilai_wawancara
        const isDone = p.status === 'Sudah Dinilai';
        const li = document.createElement('li');
        li.className = 'peserta-item';
        li.innerHTML = `
            <div class="peserta-info">
                <h4>${p.nama_peserta}</h4>
                <p>${p.posisi_dilamar} (${p.id_peserta})</p>
            </div>
            <div>
                ${isDone 
                    ? `<span class="status-badge status-sudah">Nilai: ${p.nilai_wawancara}</span>` 
                    : `<button onclick="openModal('${p.id_peserta}', '${p.nama_peserta}')" style="width:auto; padding: 6px 12px; font-size: 12px;">Input Nilai</button>`
                }
            </div>
        `;
        listEl.appendChild(li);
    });
}

function filterPeserta() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    const filtered = allPeserta.filter(p => p.nama_peserta.toLowerCase().includes(q));
    renderPeserta(filtered);
}

// --- SCORING ---
function openModal(id, name) {
    selectedPesertaId = id;
    document.getElementById('modalPesertaName').textContent = name;
    document.getElementById('scoreModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('scoreModal').style.display = 'none';
    document.getElementById('scoreInput').value = '';
}

async function submitScore() {
    const score = document.getElementById('scoreInput').value;
    if (!score) return alert("Masukkan nilai!");

    const btn = document.querySelector('.save-btn');
    btn.textContent = 'Menyimpan...'; btn.disabled = true;

    try {
        const url = `${API_URL}?action=submitScore&id_peserta=${selectedPesertaId}&nilai=${score}&pewawancara=${encodeURIComponent(currentUser)}`;
        await fetch(url);
        closeModal();
        loadPeserta(); // Reload list to see update
    } catch (e) {
        alert("Gagal menyimpan: " + e.message);
    } finally {
        btn.textContent = 'Simpan'; btn.disabled = false;
    }
}

// Check session on load
if (sessionStorage.getItem('pengawas')) {
    currentUser = sessionStorage.getItem('pengawas');
    showDashboard();
}