(function () {
  const STORAGE_KEY = 'taxiAdminTokens';

  const loginView = document.getElementById('login-view');
  const dashboardView = document.getElementById('dashboard-view');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const logoutBtn = document.getElementById('logout-btn');

  function getTokens() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch {
      return null;
    }
  }

  function setTokens(tokens) {
    if (tokens) localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    else localStorage.removeItem(STORAGE_KEY);
  }

  function showLogin(message) {
    setTokens(null);
    loginView.classList.remove('hidden');
    dashboardView.classList.add('hidden');
    logoutBtn.classList.add('hidden');
    if (message) {
      loginError.textContent = message;
      loginError.classList.remove('hidden');
    }
  }

  function showDashboard() {
    loginView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
  }

  // Attaches the current access token, and on a 401 tries exactly one silent
  // refresh-and-retry before giving up and sending the admin back to login -
  // same pattern as the mobile app's api/client.js, reimplemented in plain JS
  // since this page has no bundler/shared code with mobile/.
  //
  // The dashboard fires several requests in parallel (Promise.all in
  // loadDashboard), so a shared in-flight promise is needed here: refresh
  // tokens rotate on use (the old one is revoked the moment it's redeemed),
  // so if each parallel 401 called tryRefresh() independently, only the
  // first would succeed and the rest would fail against an already-revoked
  // token. Every caller awaits the same promise instead of starting its own.
  let refreshInFlight = null;

  async function apiFetch(path, options = {}, isRetry = false) {
    const tokens = getTokens();
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (tokens?.accessToken) headers.Authorization = `Bearer ${tokens.accessToken}`;

    const res = await fetch(path, { ...options, headers });

    if (res.status === 401 && !isRetry && tokens?.refreshToken) {
      if (!refreshInFlight) refreshInFlight = tryRefresh(tokens.refreshToken).finally(() => (refreshInFlight = null));
      const refreshed = await refreshInFlight;
      if (refreshed) return apiFetch(path, options, true);
    }

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      if (res.status === 401) showLogin('Session expirée, reconnectez-vous.');
      throw new Error(json?.error?.message || `Request failed (${res.status})`);
    }
    return json.data;
  }

  async function tryRefresh(refreshToken) {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) return false;
      setTokens({ accessToken: json.data.accessToken, refreshToken: json.data.refreshToken });
      return true;
    } catch {
      return false;
    }
  }

  function formatDate(iso) {
    return iso ? new Date(iso).toLocaleDateString('fr-FR') : '-';
  }

  function cell(text) {
    const td = document.createElement('td');
    td.textContent = text ?? '-';
    return td;
  }

  function renderPending(drivers) {
    const tbody = document.getElementById('pending-tbody');
    const empty = document.getElementById('pending-empty');
    tbody.innerHTML = '';
    empty.classList.toggle('hidden', drivers.length > 0);

    for (const driver of drivers) {
      const tr = document.createElement('tr');
      tr.append(
        cell(driver.fullName),
        cell(driver.email),
        cell(driver.phone),
        cell(driver.vehiclePlate),
        cell(driver.vehicleModel),
        cell(formatDate(driver.createdAt))
      );

      const actionsTd = document.createElement('td');
      const row = document.createElement('div');
      row.className = 'btn-row';

      const approveBtn = document.createElement('button');
      approveBtn.className = 'btn btn-approve';
      approveBtn.textContent = 'Valider';
      approveBtn.addEventListener('click', () => handleDecision(driver.id, 'approve'));

      const rejectBtn = document.createElement('button');
      rejectBtn.className = 'btn btn-reject';
      rejectBtn.textContent = 'Rejeter';
      rejectBtn.addEventListener('click', () => handleDecision(driver.id, 'reject'));

      row.append(approveBtn, rejectBtn);
      actionsTd.appendChild(row);
      tr.appendChild(actionsTd);
      tbody.appendChild(tr);
    }
  }

  function renderAllDrivers(drivers) {
    const tbody = document.getElementById('drivers-tbody');
    tbody.innerHTML = '';
    for (const driver of drivers) {
      const tr = document.createElement('tr');
      const statusTd = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = `status-badge status-${driver.approvalStatus}`;
      badge.textContent = driver.approvalStatus;
      statusTd.appendChild(badge);

      tr.append(
        cell(driver.fullName),
        cell(driver.email),
        cell(driver.phone),
        cell(driver.vehiclePlate),
        cell(driver.vehicleModel),
        statusTd,
        cell(formatDate(driver.createdAt))
      );
      tbody.appendChild(tr);
    }
  }

  function statCard(label, value) {
    const div = document.createElement('div');
    div.className = 'stat-card';
    const valueEl = document.createElement('div');
    valueEl.className = 'stat-value';
    valueEl.textContent = value;
    const labelEl = document.createElement('div');
    labelEl.className = 'stat-label';
    labelEl.textContent = label;
    div.append(valueEl, labelEl);
    return div;
  }

  function formatMRO(amount) {
    return `${(amount || 0).toFixed(2)} MRO`;
  }

  function renderStats(stats) {
    const grid = document.getElementById('stats-grid');
    grid.innerHTML = '';
    grid.append(
      statCard('Clients', stats.totalClients),
      statCard('Chauffeurs', `${stats.totalDrivers} (${stats.driversPending} en attente)`),
      statCard('Courses au total', stats.totalRides),
      statCard('Courses terminées', `${stats.completedRides} (${stats.completedRidesToday} aujourd'hui)`),
      statCard('Revenu total', formatMRO(stats.totalRevenue)),
      statCard('Revenu ce mois-ci', formatMRO(stats.revenueThisMonth))
    );
  }

  function renderClients(clients) {
    const tbody = document.getElementById('clients-tbody');
    tbody.innerHTML = '';
    for (const client of clients) {
      const tr = document.createElement('tr');
      tr.append(cell(client.fullName), cell(client.email), cell(client.phone), cell(formatDate(client.createdAt)));
      tbody.appendChild(tr);
    }
  }

  async function loadDashboard() {
    const [stats, pending, allDrivers, clients] = await Promise.all([
      apiFetch('/api/admin/stats'),
      apiFetch('/api/admin/drivers?status=PENDING'),
      apiFetch('/api/admin/drivers'),
      apiFetch('/api/admin/clients'),
    ]);
    renderStats(stats);
    renderPending(pending);
    renderAllDrivers(allDrivers);
    renderClients(clients);
  }

  async function handleDecision(driverId, action) {
    try {
      await apiFetch(`/api/admin/drivers/${driverId}/${action}`, { method: 'PATCH' });
      await loadDashboard();
    } catch (err) {
      alert(err.message);
    }
  }

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    loginError.classList.add('hidden');
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || 'Connexion impossible');
      }
      if (json.data.user.role !== 'ADMIN') {
        throw new Error("Ce compte n'a pas les droits administrateur");
      }
      setTokens({ accessToken: json.data.accessToken, refreshToken: json.data.refreshToken });
      showDashboard();
      await loadDashboard();
    } catch (err) {
      showLogin(err.message);
    }
  });

  logoutBtn.addEventListener('click', () => showLogin());

  (async function init() {
    const tokens = getTokens();
    if (!tokens) {
      showLogin();
      return;
    }
    try {
      showDashboard();
      await loadDashboard();
    } catch {
      showLogin('Session expirée, reconnectez-vous.');
    }
  })();
})();
