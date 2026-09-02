/**
 * Signature Detailing CRM Dashboard - Frontend Application Logic
 */

// State Management
const state = {
  leads: [],
  filteredLeads: [],
  loading: false,
  viewMode: 'table', // 'table' | 'kanban'
  viewMode: 'table', // 'table' | 'kanban' | 'inbox'
  searchQuery: '',
  filters: {
    status: '',
    service: '',
    source: '',
  },
  pagination: {
    page: 1,
    limit: 20,
    totalPages: 1,
    totalItems: 0,
  },
  deletingLeadId: null,
  inbox: {
    conversations: [],
    activePhone: null,
    activeCustomerName: '',
    messages: [],
    loading: false,
    searchQuery: '',
  },
};

// DOM Elements
const elements = {
  // KPI Stats
  statTotal: document.getElementById('stat-total'),
  statNew: document.getElementById('stat-new'),
  statActive: document.getElementById('stat-active'),
  statCompleted: document.getElementById('stat-completed'),
  statWhatsapp: document.getElementById('stat-whatsapp'),
  statWebsite: document.getElementById('stat-website'),

  // Filters & Controls
  searchInput: document.getElementById('search-input'),
  filterStatus: document.getElementById('filter-status'),
  filterService: document.getElementById('filter-service'),
  filterSource: document.getElementById('filter-source'),
  btnRefresh: document.getElementById('btn-refresh'),
  btnExportCsv: document.getElementById('btn-export-csv'),
  btnExportCsvMobile: document.getElementById('btn-export-csv-mobile'),

  // Views
  viewToggleTable: document.getElementById('view-toggle-table'),
  viewToggleKanban: document.getElementById('view-toggle-kanban'),
  viewToggleInbox: document.getElementById('view-toggle-inbox'),
  tableViewContainer: document.getElementById('table-view-container'),
  kanbanViewContainer: document.getElementById('kanban-view-container'),
  inboxViewContainer: document.getElementById('inbox-view-container'),
  leadsTableBody: document.getElementById('leads-table-body'),
  leadsMobileList: document.getElementById('leads-mobile-list'),
  paginationInfo: document.getElementById('table-pagination-info'),
  currentPageLabel: document.getElementById('pagination-current-page'),
  btnPrevPage: document.getElementById('btn-prev-page'),
  btnNextPage: document.getElementById('btn-next-page'),

  // WhatsApp Inbox Elements
  inboxSidebar: document.getElementById('inbox-sidebar'),
  inboxChatPane: document.getElementById('inbox-chat-pane'),
  inboxConversationList: document.getElementById('inbox-conversation-list'),
  inboxSearchInput: document.getElementById('inbox-search-input'),
  btnRefreshInbox: document.getElementById('btn-refresh-inbox'),
  btnInboxBack: document.getElementById('btn-inbox-back'),
  inboxHeaderAvatar: document.getElementById('inbox-header-avatar'),
  inboxHeaderName: document.getElementById('inbox-header-name'),
  inboxHeaderPhone: document.getElementById('inbox-header-phone'),
  inboxHeaderActions: document.getElementById('inbox-header-actions'),
  btnInboxOpenWa: document.getElementById('btn-inbox-open-wa'),
  inboxMessagesContainer: document.getElementById('inbox-messages-container'),
  inboxQuickTemplates: document.getElementById('inbox-quick-templates'),
  inboxComposerBar: document.getElementById('inbox-composer-bar'),
  formInboxSend: document.getElementById('form-inbox-send'),
  inboxInputMessage: document.getElementById('inbox-input-message'),
  btnInboxSend: document.getElementById('btn-inbox-send'),

  // Kanban Columns
  kanbanCols: {
    new: document.getElementById('kanban-column-new'),
    contacted: document.getElementById('kanban-column-contacted'),
    scheduled: document.getElementById('kanban-column-scheduled'),
    in_progress: document.getElementById('kanban-column-in_progress'),
    completed: document.getElementById('kanban-column-completed'),
  },
  kanbanCounts: {
    new: document.getElementById('kanban-count-new'),
    contacted: document.getElementById('kanban-count-contacted'),
    scheduled: document.getElementById('kanban-count-scheduled'),
    in_progress: document.getElementById('kanban-count-in_progress'),
    completed: document.getElementById('kanban-count-completed'),
  },

  // Modals
  modalAddLead: document.getElementById('modal-add-lead'),
  btnOpenAddModal: document.getElementById('btn-open-add-modal'),
  btnCloseAddModal: document.getElementById('btn-close-add-modal'),
  btnCancelAddModal: document.getElementById('btn-cancel-add-modal'),
  formAddLead: document.getElementById('form-add-lead'),

  modalDeleteLead: document.getElementById('modal-delete-lead'),
  deleteLeadName: document.getElementById('delete-lead-name'),
  btnCancelDelete: document.getElementById('btn-cancel-delete'),
  btnConfirmDelete: document.getElementById('btn-confirm-delete'),

  toastContainer: document.getElementById('toast-container'),
  btnLogout: document.getElementById('btn-logout'),
};

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  fetchLeads();
});

// Setup Event Listeners
function setupEventListeners() {
  // Logout Listener
  if (elements.btnLogout) {
    elements.btnLogout.addEventListener('click', handleLogout);
  }

  // Search & Filter Listeners
  elements.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.toLowerCase().trim();
    applyFilters();
  });

  elements.filterStatus.addEventListener('change', (e) => {
    state.filters.status = e.target.value;
    applyFilters();
  });

  elements.filterService.addEventListener('change', (e) => {
    state.filters.service = e.target.value;
    applyFilters();
  });

  elements.filterSource.addEventListener('change', (e) => {
    state.filters.source = e.target.value;
    applyFilters();
  });

  // Refresh & Export
  elements.btnRefresh.addEventListener('click', () => {
    elements.btnRefresh.classList.add('animate-spin');
    fetchLeads().finally(() => {
      setTimeout(() => elements.btnRefresh.classList.remove('animate-spin'), 600);
    });
  });

  if (elements.btnExportCsv) {
    elements.btnExportCsv.addEventListener('click', exportToCSV);
  }
  if (elements.btnExportCsvMobile) {
    elements.btnExportCsvMobile.addEventListener('click', exportToCSV);
  }

  // View Switcher
  elements.viewToggleTable.addEventListener('click', () => switchView('table'));
  elements.viewToggleKanban.addEventListener('click', () => switchView('kanban'));
  if (elements.viewToggleInbox) {
    elements.viewToggleInbox.addEventListener('click', () => switchView('inbox'));
  }

  // Inbox Event Listeners
  if (elements.btnRefreshInbox) {
    elements.btnRefreshInbox.addEventListener('click', () => fetchConversations());
  }
  if (elements.inboxSearchInput) {
    elements.inboxSearchInput.addEventListener('input', (e) => {
      state.inbox.searchQuery = e.target.value.toLowerCase().trim();
      renderConversationsList();
    });
  }
  if (elements.formInboxSend) {
    elements.formInboxSend.addEventListener('submit', handleInboxSend);
  }
  if (elements.btnInboxBack) {
    elements.btnInboxBack.addEventListener('click', handleInboxBack);
  }
  if (elements.inboxQuickTemplates) {
    elements.inboxQuickTemplates.addEventListener('click', (e) => {
      const btn = e.target.closest('.quick-reply-btn');
      if (btn && btn.dataset.reply && elements.inboxInputMessage) {
        elements.inboxInputMessage.value = btn.dataset.reply;
        elements.inboxInputMessage.focus();
      }
    });
  }

  // Pagination
  elements.btnPrevPage.addEventListener('click', () => {
    if (state.pagination.page > 1) {
      state.pagination.page--;
      renderTable();
    }
  });

  elements.btnNextPage.addEventListener('click', () => {
    if (state.pagination.page < state.pagination.totalPages) {
      state.pagination.page++;
      renderTable();
    }
  });

  // Add Lead Modal
  elements.btnOpenAddModal.addEventListener('click', openAddModal);
  elements.btnCloseAddModal.addEventListener('click', closeAddModal);
  elements.btnCancelAddModal.addEventListener('click', closeAddModal);
  elements.formAddLead.addEventListener('submit', handleAddLeadSubmit);

  // Delete Modal
  elements.btnCancelDelete.addEventListener('click', closeDeleteModal);
  elements.btnConfirmDelete.addEventListener('click', confirmDeleteLead);
}

// Handle Admin Logout
async function handleLogout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (err) {
    console.error('[Logout Error]', err);
  }
  window.location.href = '/login';
}

// Fetch Leads from Backend API
async function fetchLeads() {
  state.loading = true;
  try {
    const res = await fetch('/api/leads?limit=100&sortBy=created_at&order=desc');

    if (res.status === 401) {
      window.location.href = '/login';
      return;
    }

    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || 'Failed to fetch leads');
    }

    state.leads = json.data || [];
    calculateKPIs(state.leads);
    applyFilters();
  } catch (err) {
    console.error('[Fetch Error]', err);
    showToast(err.message || 'Failed to connect to database', 'error');
  } finally {
    state.loading = false;
  }
}

// Calculate KPI Summary
function calculateKPIs(leads) {
  const total = leads.length;
  const newLeads = leads.filter((l) => l.status === 'new').length;
  const active = leads.filter((l) => l.status === 'scheduled' || l.status === 'in_progress').length;
  const completed = leads.filter((l) => l.status === 'completed').length;
  const whatsapp = leads.filter((l) => l.source === 'whatsapp').length;
  const website = leads.filter((l) => l.source === 'website').length;

  elements.statTotal.textContent = total;
  elements.statNew.textContent = newLeads;
  elements.statActive.textContent = active;
  elements.statCompleted.textContent = completed;
  elements.statWhatsapp.textContent = whatsapp;
  elements.statWebsite.textContent = website;
}

// Apply Filters and Search Client-Side
function applyFilters() {
  state.filteredLeads = state.leads.filter((lead) => {
    // Search query
    const matchesSearch =
      !state.searchQuery ||
      lead.name.toLowerCase().includes(state.searchQuery) ||
      lead.phone.toLowerCase().includes(state.searchQuery) ||
      lead.service.toLowerCase().includes(state.searchQuery);

    // Status filter
    const matchesStatus = !state.filters.status || lead.status === state.filters.status;

    // Service filter
    const matchesService =
      !state.filters.service ||
      lead.service.toLowerCase().includes(state.filters.service.toLowerCase());

    // Source filter
    const matchesSource = !state.filters.source || lead.source === state.filters.source;

    return matchesSearch && matchesStatus && matchesService && matchesSource;
  });

  state.pagination.totalItems = state.filteredLeads.length;
  state.pagination.totalPages = Math.max(1, Math.ceil(state.filteredLeads.length / state.pagination.limit));
  if (state.pagination.page > state.pagination.totalPages) {
    state.pagination.page = 1;
  }

  if (state.viewMode === 'table') {
    renderTable();
  } else {
    renderKanban();
  }
}

// Switch between Table and Kanban Views
// Switch between Table, Kanban, and WhatsApp Inbox Views
function switchView(mode) {
  state.viewMode = mode;

  if (elements.tableViewContainer) elements.tableViewContainer.classList.toggle('hidden', mode !== 'table');
  if (elements.kanbanViewContainer) elements.kanbanViewContainer.classList.toggle('hidden', mode !== 'kanban');
  if (elements.inboxViewContainer) elements.inboxViewContainer.classList.toggle('hidden', mode !== 'inbox');

  const toggles = [
    { el: elements.viewToggleTable, active: mode === 'table' },
    { el: elements.viewToggleKanban, active: mode === 'kanban' },
    { el: elements.viewToggleInbox, active: mode === 'inbox' },
  ];

  toggles.forEach(({ el, active }) => {
    if (!el) return;
    if (active) {
      el.classList.add('bg-zinc-800', 'text-white', 'shadow');
      el.classList.remove('text-zinc-400');
    } else {
      el.classList.remove('bg-zinc-800', 'text-white', 'shadow');
      el.classList.add('text-zinc-400');
    }
  });

  if (mode === 'table') {
    elements.tableViewContainer.classList.remove('hidden');
    elements.kanbanViewContainer.classList.add('hidden');
    elements.viewToggleTable.classList.add('bg-zinc-800', 'text-white', 'shadow');
    elements.viewToggleTable.classList.remove('text-zinc-400');
    elements.viewToggleKanban.classList.remove('bg-zinc-800', 'text-white', 'shadow');
    elements.viewToggleKanban.classList.add('text-zinc-400');
    renderTable();
  } else {
    elements.tableViewContainer.classList.add('hidden');
    elements.kanbanViewContainer.classList.remove('hidden');
    elements.viewToggleKanban.classList.add('bg-zinc-800', 'text-white', 'shadow');
    elements.viewToggleKanban.classList.remove('text-zinc-400');
    elements.viewToggleTable.classList.remove('bg-zinc-800', 'text-white', 'shadow');
    elements.viewToggleTable.classList.add('text-zinc-400');
  } else if (mode === 'kanban') {
    renderKanban();
  } else if (mode === 'inbox') {
    fetchConversations(true);
  }
}

// Render Table View & Mobile Cards View
function renderTable() {
  const { page, limit, totalItems, totalPages } = state.pagination;
  const start = (page - 1) * limit;
  const end = start + limit;
  const pageLeads = state.filteredLeads.slice(start, end);

  elements.paginationInfo.textContent = `Showing ${Math.min(start + 1, totalItems)} to ${Math.min(end, totalItems)} of ${totalItems} leads`;
  elements.currentPageLabel.textContent = `Page ${page} of ${totalPages}`;
  elements.btnPrevPage.disabled = page <= 1;
  elements.btnNextPage.disabled = page >= totalPages;

  if (pageLeads.length === 0) {
    const emptyHtml = `
      <div class="py-12 text-center text-zinc-500">
        <div class="flex flex-col items-center justify-center space-y-1.5">
          <i data-lucide="inbox" class="w-8 h-8 text-zinc-600"></i>
          <p class="text-xs">No matching leads found.</p>
        </div>
      </div>
    `;
    elements.leadsTableBody.innerHTML = `<tr><td colspan="7">${emptyHtml}</td></tr>`;
    elements.leadsMobileList.innerHTML = emptyHtml;
    lucide.createIcons();
    return;
  }

  // 1. Render Desktop Table Rows
  elements.leadsTableBody.innerHTML = pageLeads
    .map((lead) => {
      const cleanPhone = lead.phone.replace(/[^0-9]/g, '');
      const waGreeting = encodeURIComponent(
        `Hi ${lead.name}, thank you for contacting Signature Detailing regarding your inquiry for ${lead.service}. How can we assist you with your vehicle?`
      );
      const waUrl = `https://wa.me/${cleanPhone}?text=${waGreeting}`;
      const initials = lead.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

      const timeAgo = formatTimeAgo(lead.created_at);

      return `
        <tr class="hover:bg-zinc-900/60 transition group border-b border-zinc-800/40">
          <td class="py-3 px-4">
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-700 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-sky-400">
                ${initials}
              </div>
              <div>
                <p class="font-medium text-white text-xs">${escapeHtml(lead.name)}</p>
                <p class="text-[11px] text-zinc-500">ID: ${lead.id.slice(0, 8)}</p>
              </div>
            </div>
          </td>

          <td class="py-3 px-4 font-mono text-xs text-zinc-300">
            <a href="tel:${lead.phone}" class="hover:text-sky-400 transition">
              <span>${escapeHtml(lead.phone)}</span>
            </a>
          </td>

          <td class="py-3 px-4">
            <span class="px-2.5 py-1 text-xs font-medium rounded-md bg-zinc-900 border border-zinc-800 text-zinc-200">
              ${escapeHtml(lead.service)}
            </span>
          </td>

          <td class="py-3 px-4">
            ${getSourceBadge(lead.source)}
          </td>

          <td class="py-3 px-4">
            <select 
              onchange="handleStatusChange('${lead.id}', this.value)"
              class="text-xs font-semibold rounded-md px-2.5 py-1 border focus:outline-none cursor-pointer ${getStatusBadgeClass(lead.status)}"
            >
              <option value="new" ${lead.status === 'new' ? 'selected' : ''}>New</option>
              <option value="contacted" ${lead.status === 'contacted' ? 'selected' : ''}>Contacted</option>
              <option value="scheduled" ${lead.status === 'scheduled' ? 'selected' : ''}>Scheduled</option>
              <option value="in_progress" ${lead.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
              <option value="completed" ${lead.status === 'completed' ? 'selected' : ''}>Completed</option>
              <option value="cancelled" ${lead.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </td>

          <td class="py-3 px-4 text-xs text-zinc-400">
            <span>${timeAgo}</span>
          </td>

          <td class="py-3 px-4 text-right">
            <div class="flex items-center justify-end space-x-1.5">
              <button 
                onclick="openInboxChat('${cleanPhone}', '${escapeHtml(lead.name)}')" 
                title="Open in CRM WhatsApp Inbox"
                class="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-green-400 border border-zinc-700/60 transition"
              >
                <i data-lucide="message-square" class="w-3.5 h-3.5"></i>
              </button>

              <a 
                href="${waUrl}" 
                target="_blank" 
                title="Chat on WhatsApp"
                class="p-1.5 rounded-lg bg-green-950/50 hover:bg-green-900/80 text-green-400 border border-green-800/40 transition"
              >
                <i data-lucide="message-circle" class="w-3.5 h-3.5"></i>
              </a>

              <a 
                href="tel:${lead.phone}" 
                title="Call Customer"
                class="p-1.5 rounded-lg bg-sky-950/50 hover:bg-sky-900/80 text-sky-400 border border-sky-800/40 transition"
              >
                <i data-lucide="phone" class="w-3.5 h-3.5"></i>
              </a>

              <button 
                onclick="promptDeleteLead('${lead.id}', '${escapeHtml(lead.name)}')" 
                title="Delete Lead"
                class="p-1.5 rounded-lg bg-zinc-900 hover:bg-red-950/60 text-zinc-500 hover:text-red-400 border border-zinc-800 hover:border-red-900/50 transition"
              >
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');

  // 2. Render Native Mobile Cards
  elements.leadsMobileList.innerHTML = pageLeads
    .map((lead) => {
      const cleanPhone = lead.phone.replace(/[^0-9]/g, '');
      const waGreeting = encodeURIComponent(
        `Hi ${lead.name}, thank you for contacting Signature Detailing regarding ${lead.service}. How can we assist you?`
      );
      const waUrl = `https://wa.me/${cleanPhone}?text=${waGreeting}`;
      const initials = lead.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
      const timeAgo = formatTimeAgo(lead.created_at);

      return `
        <div class="p-3.5 space-y-2.5 bg-zinc-900/40 hover:bg-zinc-900/80 transition">
          <!-- Top Row: Avatar, Name & Source Badge -->
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center space-x-2.5 min-w-0">
              <div class="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-700 border border-zinc-700 flex items-center justify-center text-xs font-bold text-sky-400 shrink-0">
                ${initials}
              </div>
              <div class="min-w-0">
                <h4 class="font-semibold text-white text-xs truncate">${escapeHtml(lead.name)}</h4>
                <a href="tel:${lead.phone}" class="text-[11px] text-zinc-400 hover:text-sky-400 font-mono">${escapeHtml(lead.phone)}</a>
              </div>
            </div>
            <div class="shrink-0">
              ${getSourceBadge(lead.source)}
            </div>
          </div>

          <!-- Middle Row: Service & Time Ago -->
          <div class="flex items-center justify-between text-xs pt-0.5">
            <span class="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-200 font-medium text-[11px]">
              ${escapeHtml(lead.service)}
            </span>
            <span class="text-[11px] text-zinc-500">${timeAgo}</span>
          </div>

          <!-- Bottom Row: Status Dropdown & 1-Touch Buttons -->
          <div class="grid grid-cols-4 gap-1.5 pt-1.5 border-t border-zinc-800/50">
            <div class="col-span-2">
              <select 
                onchange="handleStatusChange('${lead.id}', this.value)"
                class="w-full text-[11px] font-semibold rounded-lg px-2 py-1.5 border focus:outline-none cursor-pointer ${getStatusBadgeClass(lead.status)}"
              >
                <option value="new" ${lead.status === 'new' ? 'selected' : ''}>New</option>
                <option value="contacted" ${lead.status === 'contacted' ? 'selected' : ''}>Contacted</option>
                <option value="scheduled" ${lead.status === 'scheduled' ? 'selected' : ''}>Scheduled</option>
                <option value="in_progress" ${lead.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                <option value="completed" ${lead.status === 'completed' ? 'selected' : ''}>Completed</option>
                <option value="cancelled" ${lead.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
              </select>
            </div>

            <!-- WhatsApp 1-Touch Button -->
            <a 
              href="${waUrl}" 
              target="_blank" 
              class="flex items-center justify-center py-1.5 rounded-lg bg-green-950/70 hover:bg-green-900 text-green-400 border border-green-800/50 transition active:scale-95"
              title="Chat on WhatsApp"
            >
              <i data-lucide="message-circle" class="w-4 h-4"></i>
            </a>

            <!-- Call 1-Touch Button -->
            <a 
              href="tel:${lead.phone}" 
              class="flex items-center justify-center py-1.5 rounded-lg bg-sky-950/70 hover:bg-sky-900 text-sky-400 border border-sky-800/50 transition active:scale-95"
              title="Call"
            >
              <i data-lucide="phone" class="w-4 h-4"></i>
            </a>
          </div>
        </div>
      `;
    })
    .join('');

  lucide.createIcons();
}

// Render Kanban Board View
function renderKanban() {
  const columns = {
    new: [],
    contacted: [],
    scheduled: [],
    in_progress: [],
    completed: [],
  };

  // Group filtered leads into columns
  state.filteredLeads.forEach((lead) => {
    if (columns[lead.status]) {
      columns[lead.status].push(lead);
    }
  });

  // Render cards for each column
  Object.keys(columns).forEach((statusKey) => {
    const colElement = elements.kanbanCols[statusKey];
    const countElement = elements.kanbanCounts[statusKey];
    const leadsInCol = columns[statusKey];

    countElement.textContent = leadsInCol.length;

    if (leadsInCol.length === 0) {
      colElement.innerHTML = `
        <div class="h-28 sm:h-32 flex flex-col items-center justify-center text-zinc-600 text-xs border border-dashed border-zinc-800 rounded-lg">
          <span>No leads</span>
        </div>
      `;
    } else {
      colElement.innerHTML = leadsInCol
        .map((lead) => {
          const cleanPhone = lead.phone.replace(/[^0-9]/g, '');
          const waGreeting = encodeURIComponent(
            `Hi ${lead.name}, thank you for contacting Signature Detailing regarding ${lead.service}.`
          );
          const waUrl = `https://wa.me/${cleanPhone}?text=${waGreeting}`;

          return `
            <div class="glass-card glass-card-hover p-3 rounded-xl border border-zinc-800/80 space-y-2 bg-zinc-900/90 shadow-sm">
              <div class="flex items-start justify-between gap-1.5">
                <div class="min-w-0">
                  <h5 class="text-xs font-bold text-white truncate">${escapeHtml(lead.name)}</h5>
                  <a href="tel:${lead.phone}" class="text-[11px] text-zinc-400 hover:text-sky-400 font-mono">${escapeHtml(lead.phone)}</a>
                </div>
                <div class="shrink-0">
                  ${getSourceBadge(lead.source)}
                </div>
              </div>

              <div class="text-[11px] font-medium text-sky-300 bg-sky-950/40 border border-sky-900/40 px-2 py-0.5 rounded inline-block truncate max-w-full">
                ${escapeHtml(lead.service)}
              </div>

              <div class="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-[11px] text-zinc-500">
                <span>${formatTimeAgo(lead.created_at)}</span>

                <div class="flex items-center space-x-1.5">
                  <button onclick="openInboxChat('${cleanPhone}', '${escapeHtml(lead.name)}')" class="p-1 rounded bg-zinc-800 text-zinc-300 hover:text-green-400 hover:bg-zinc-700 border border-zinc-700" title="Open in CRM Inbox">
                    <i data-lucide="message-square" class="w-3 h-3"></i>
                  </button>
                  <a href="${waUrl}" target="_blank" class="p-1 rounded bg-green-950 text-green-400 hover:bg-green-900 border border-green-800/40" title="WhatsApp">
                    <i data-lucide="message-circle" class="w-3 h-3"></i>
                  </a>
                  <a href="tel:${lead.phone}" class="p-1 rounded bg-sky-950 text-sky-400 hover:bg-sky-900 border border-sky-800/40" title="Call">
                    <i data-lucide="phone" class="w-3 h-3"></i>
                  </a>
                  <button onclick="promptDeleteLead('${lead.id}', '${escapeHtml(lead.name)}')" class="p-1 rounded bg-zinc-900 text-zinc-500 hover:text-red-400 hover:bg-red-950 border border-zinc-800" title="Delete">
                    <i data-lucide="trash-2" class="w-3 h-3"></i>
                  </button>
                </div>
              </div>
            </div>
          `;
        })
        .join('');
    }
  });

  lucide.createIcons();
}

// Handle Status Change via API
async function handleStatusChange(leadId, newStatus) {
  try {
    const res = await fetch(`/api/leads/${leadId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || 'Failed to update status');
    }

    // Update in local state
    const lead = state.leads.find((l) => l.id === leadId);
    if (lead) {
      lead.status = newStatus;
    }

    calculateKPIs(state.leads);
    applyFilters();
    showToast(`Status updated to "${newStatus.replace('_', ' ')}"`, 'success');
  } catch (err) {
    showToast(err.message || 'Error updating status', 'error');
  }
}

// Handle Add Lead Form Submission
async function handleAddLeadSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('add-name').value.trim();
  const phone = document.getElementById('add-phone').value.trim();
  const service = document.getElementById('add-service').value;
  const source = document.getElementById('add-source').value;
  const status = document.getElementById('add-status').value;

  const submitBtn = document.getElementById('btn-submit-add-lead');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';

  try {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, service, source, status }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || 'Failed to create lead');
    }

    showToast('New lead added successfully!', 'success');
    closeAddModal();
    elements.formAddLead.reset();
    fetchLeads();
  } catch (err) {
    showToast(err.message || 'Failed to add lead', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i data-lucide="check" class="w-3.5 h-3.5"></i><span>Save Lead</span>';
    lucide.createIcons();
  }
}

// Delete Lead Modal Prompt
function promptDeleteLead(id, name) {
  state.deletingLeadId = id;
  elements.deleteLeadName.textContent = `"${name}"`;
  elements.modalDeleteLead.classList.remove('hidden');
}

function closeDeleteModal() {
  state.deletingLeadId = null;
  elements.modalDeleteLead.classList.add('hidden');
}

// Confirm Delete Lead via API
async function confirmDeleteLead() {
  if (!state.deletingLeadId) return;

  const id = state.deletingLeadId;
  elements.btnConfirmDelete.disabled = true;
  elements.btnConfirmDelete.textContent = 'Deleting...';

  try {
    const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || 'Failed to delete lead');
    }

    state.leads = state.leads.filter((l) => l.id !== id);
    calculateKPIs(state.leads);
    applyFilters();
    showToast('Lead deleted successfully', 'info');
    closeDeleteModal();
  } catch (err) {
    showToast(err.message || 'Error deleting lead', 'error');
  } finally {
    elements.btnConfirmDelete.disabled = false;
    elements.btnConfirmDelete.textContent = 'Delete';
  }
}

// Modal Helpers
function openAddModal() {
  elements.modalAddLead.classList.remove('hidden');
}
function closeAddModal() {
  elements.modalAddLead.classList.add('hidden');
}

// Export Filtered Leads to CSV
function exportToCSV() {
  if (state.filteredLeads.length === 0) {
    showToast('No leads available to export', 'error');
    return;
  }

  const headers = ['ID', 'Customer Name', 'Phone', 'Service', 'Source', 'Status', 'Created At'];
  const rows = state.filteredLeads.map((l) => [
    l.id,
    `"${l.name.replace(/"/g, '""')}"`,
    `"${l.phone}"`,
    `"${l.service}"`,
    l.source,
    l.status,
    l.created_at,
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `signature_detailing_leads_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('Leads exported to CSV', 'success');
}

// Utility: Badge Color & Style
function getStatusBadgeClass(status) {
  switch (status) {
    case 'new': return 'badge-status-new';
    case 'contacted': return 'badge-status-contacted';
    case 'scheduled': return 'badge-status-scheduled';
    case 'in_progress': return 'badge-status-in_progress';
    case 'completed': return 'badge-status-completed';
    case 'cancelled': return 'badge-status-cancelled';
    default: return 'badge-status-new';
  }
}

// Utility: Source Icon Badge
function getSourceBadge(source) {
  switch (source) {
    case 'whatsapp':
      return `
        <span class="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium bg-green-950/60 text-green-400 border border-green-800/50">
          <i data-lucide="message-square" class="w-3 h-3"></i>
          <span>WhatsApp</span>
        </span>
      `;
    case 'website':
      return `
        <span class="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium bg-sky-950/60 text-sky-400 border border-sky-800/50">
          <i data-lucide="globe" class="w-3 h-3"></i>
          <span>Website</span>
        </span>
      `;
    default:
      return `
        <span class="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
          <i data-lucide="user" class="w-3 h-3"></i>
          <span>${escapeHtml(source || 'direct')}</span>
        </span>
      `;
  }
}

// Utility: Relative Time Formatter
function formatTimeAgo(dateString) {
  if (!dateString) return 'Just now';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Utility: Toast Notification System
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-triangle' : 'info';
  const color =
    type === 'success'
      ? 'border-emerald-500/40 bg-emerald-950/90 text-emerald-200'
      : type === 'error'
      ? 'border-red-500/40 bg-red-950/90 text-red-200'
      : 'border-sky-500/40 bg-zinc-900/90 text-zinc-100';

  toast.className = `toast-enter flex items-center space-x-2.5 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl border backdrop-blur-md shadow-2xl text-xs font-medium pointer-events-auto ${color}`;
  toast.innerHTML = `
    <i data-lucide="${icon}" class="w-4 h-4 shrink-0"></i>
    <span>${escapeHtml(message)}</span>
  `;

  elements.toastContainer.appendChild(toast);
  lucide.createIcons();

  setTimeout(() => {
    toast.classList.remove('toast-enter');
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

// Escape HTML utility
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ==========================================================================
   WhatsApp Live Inbox Module
   ========================================================================== */

/**
 * Fetch list of active WhatsApp conversations
 */
async function fetchConversations(autoSelectFirst = false) {
  if (!elements.inboxConversationList) return;
  state.inbox.loading = true;

  try {
    const res = await fetch('/api/inbox/whatsapp/conversations');
    if (res.status === 401) {
      window.location.href = '/login';
      return;
    }

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to load conversations');

    state.inbox.conversations = json.data || [];
    renderConversationsList();

    // Auto-select first conversation if none active or requested
    if (autoSelectFirst && state.inbox.conversations.length > 0 && !state.inbox.activePhone) {
      const first = state.inbox.conversations[0];
      loadChatThread(first.phone, first.customer_name);
    }
  } catch (err) {
    console.error('[Inbox Error]', err);
    showToast(err.message, 'error');
  } finally {
    state.inbox.loading = false;
  }
}

/**
 * Filter and render conversation previews in the left sidebar
 */
function renderConversationsList() {
  if (!elements.inboxConversationList) return;

  const query = state.inbox.searchQuery;
  const filtered = state.inbox.conversations.filter((c) => {
    if (!query) return true;
    return (
      c.customer_name.toLowerCase().includes(query) ||
      c.phone.toLowerCase().includes(query) ||
      (c.last_message && c.last_message.toLowerCase().includes(query))
    );
  });

  if (filtered.length === 0) {
    elements.inboxConversationList.innerHTML = `
      <div class="p-6 text-center text-zinc-500 text-xs">
        <i data-lucide="message-square-off" class="w-8 h-8 mx-auto mb-2 opacity-40"></i>
        <p class="font-medium text-zinc-400">No conversations found</p>
        <p class="text-[11px] text-zinc-600 mt-1">When customers message on WhatsApp, their threads appear here.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  elements.inboxConversationList.innerHTML = filtered
    .map((conv) => {
      const isActive = state.inbox.activePhone === conv.phone;
      const activeClass = isActive
        ? 'bg-zinc-800/90 border-l-4 border-l-green-500'
        : 'hover:bg-zinc-900/60 border-l-4 border-l-transparent';
      
      const initials = (conv.customer_name || 'C')
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

      const senderTag =
        conv.last_sender === 'customer'
          ? ''
          : conv.last_sender === 'bot'
          ? '<span class="text-sky-400 text-[10px] mr-1">🤖 Bot:</span>'
          : '<span class="text-green-400 text-[10px] mr-1">You:</span>';

      return `
        <div 
          onclick="loadChatThread('${escapeHtml(conv.phone)}', '${escapeHtml(conv.customer_name)}')"
          class="p-3.5 cursor-pointer transition flex items-start space-x-3 ${activeClass}"
        >
          <div class="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700/80 text-zinc-200 font-bold flex items-center justify-center text-xs shrink-0">
            ${escapeHtml(initials)}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between">
              <h5 class="text-xs font-bold text-white truncate">${escapeHtml(conv.customer_name)}</h5>
              <span class="text-[10px] text-zinc-500 shrink-0 ml-1">${formatTimeAgo(conv.last_message_at)}</span>
            </div>
            <p class="text-[11px] text-zinc-400 font-mono mt-0.5">${escapeHtml(conv.phone)}</p>
            <p class="text-xs text-zinc-400 truncate mt-1">
              ${senderTag}${escapeHtml(conv.last_message || '')}
            </p>
          </div>
        </div>
      `;
    })
    .join('');

  lucide.createIcons();
}

/**
 * Load and display full message thread for a selected customer
 */
async function loadChatThread(phone, customerName) {
  state.inbox.activePhone = phone;
  state.inbox.activeCustomerName = customerName || 'Customer';

  // Update header details
  if (elements.inboxHeaderName) elements.inboxHeaderName.textContent = customerName || 'Customer';
  if (elements.inboxHeaderPhone) elements.inboxHeaderPhone.textContent = `+${phone.replace(/[^0-9]/g, '')}`;

  const initials = (customerName || 'C')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  if (elements.inboxHeaderAvatar) elements.inboxHeaderAvatar.textContent = initials;

  // Set direct WhatsApp Web fallback link
  if (elements.btnInboxOpenWa) {
    elements.btnInboxOpenWa.href = `https://wa.me/${phone.replace(/[^0-9]/g, '')}`;
  }

  // Unhide actions and composer
  if (elements.inboxHeaderActions) elements.inboxHeaderActions.classList.remove('hidden');
  if (elements.inboxQuickTemplates) elements.inboxQuickTemplates.classList.remove('hidden');
  if (elements.inboxComposerBar) elements.inboxComposerBar.classList.remove('hidden');

  // Mobile layout switch: Hide sidebar, show chat pane
  if (window.innerWidth < 768) {
    if (elements.inboxSidebar) elements.inboxSidebar.classList.add('hidden');
    if (elements.inboxChatPane) elements.inboxChatPane.classList.remove('hidden');
  }

  renderConversationsList();

  // Show loading indicator in message container
  if (elements.inboxMessagesContainer) {
    elements.inboxMessagesContainer.innerHTML = `
      <div class="h-full flex items-center justify-center text-zinc-500 text-xs">
        <i data-lucide="loader-2" class="w-5 h-5 animate-spin mr-2 text-green-400"></i>
        <span>Loading messages...</span>
      </div>
    `;
    lucide.createIcons();
  }

  try {
    const res = await fetch(`/api/inbox/whatsapp/messages/${encodeURIComponent(phone)}`);
    if (res.status === 401) {
      window.location.href = '/login';
      return;
    }

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to load message thread');

    state.inbox.messages = json.data || [];
    renderMessageThread();
  } catch (err) {
    console.error('[Load Thread Error]', err);
    showToast(err.message, 'error');
  }
}

/**
 * Render message bubbles inside chat pane
 */
function renderMessageThread() {
  if (!elements.inboxMessagesContainer) return;

  if (state.inbox.messages.length === 0) {
    elements.inboxMessagesContainer.innerHTML = `
      <div class="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
        <i data-lucide="message-square" class="w-8 h-8 mb-2 opacity-40"></i>
        <p class="text-xs">No recorded messages in this thread yet.</p>
        <p class="text-[11px] text-zinc-600 mt-1">Send a message below to reach out on WhatsApp.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  elements.inboxMessagesContainer.innerHTML = state.inbox.messages
    .map((msg) => {
      const isCustomer = msg.direction === 'inbound';
      const isBot = msg.sender === 'bot';
      const timeStr = formatMessageClock(msg.created_at);

      if (isCustomer) {
        return `
          <div class="flex flex-col items-start max-w-[85%] sm:max-w-[75%] animate-fade-in">
            <div class="px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-zinc-800 text-zinc-100 text-xs sm:text-sm border border-zinc-700/60 shadow-sm leading-relaxed whitespace-pre-wrap">
              ${escapeHtml(msg.message_text)}
            </div>
            <span class="text-[10px] text-zinc-500 mt-1 ml-1.5">${escapeHtml(timeStr)}</span>
          </div>
        `;
      } else if (isBot) {
        return `
          <div class="flex flex-col items-end self-end max-w-[85%] sm:max-w-[75%] animate-fade-in">
            <div class="px-3.5 py-2.5 rounded-2xl rounded-tr-sm bg-zinc-900 text-zinc-300 text-xs sm:text-sm border border-zinc-800 shadow-sm leading-relaxed whitespace-pre-wrap">
              <div class="flex items-center space-x-1 text-[10px] text-sky-400 font-semibold mb-1">
                <i data-lucide="bot" class="w-3 h-3"></i>
                <span>Automated Bot</span>
              </div>
              ${escapeHtml(msg.message_text)}
            </div>
            <span class="text-[10px] text-zinc-500 mt-1 mr-1.5">${escapeHtml(timeStr)}</span>
          </div>
        `;
      } else {
        // Agent (Manual reply)
        return `
          <div class="flex flex-col items-end self-end max-w-[85%] sm:max-w-[75%] animate-fade-in">
            <div class="px-3.5 py-2.5 rounded-2xl rounded-tr-sm bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xs sm:text-sm shadow-md shadow-green-600/20 leading-relaxed whitespace-pre-wrap">
              <div class="flex items-center space-x-1 text-[10px] text-green-200 font-semibold mb-1">
                <i data-lucide="user-check" class="w-3 h-3"></i>
                <span>You (Agent)</span>
              </div>
              ${escapeHtml(msg.message_text)}
            </div>
            <span class="text-[10px] text-zinc-500 mt-1 mr-1.5">${escapeHtml(timeStr)}</span>
          </div>
        `;
      }
    })
    .join('');

  lucide.createIcons();

  // Scroll to bottom
  elements.inboxMessagesContainer.scrollTop = elements.inboxMessagesContainer.scrollHeight;
}

/**
 * Handle sending outbound WhatsApp message from composer
 */
async function handleInboxSend(e) {
  e.preventDefault();
  if (!state.inbox.activePhone || !elements.inboxInputMessage) return;

  const text = elements.inboxInputMessage.value.trim();
  if (!text) return;

  const phone = state.inbox.activePhone;
  const customerName = state.inbox.activeCustomerName;

  // Optimistic UI update
  const tempMessage = {
    phone,
    customer_name: customerName,
    direction: 'outbound',
    sender: 'agent',
    message_text: text,
    created_at: new Date().toISOString(),
  };

  state.inbox.messages.push(tempMessage);
  renderMessageThread();

  elements.inboxInputMessage.value = '';
  if (elements.btnInboxSend) elements.btnInboxSend.disabled = true;

  try {
    const res = await fetch('/api/inbox/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone,
        customerName,
        message: text,
      }),
    });

    if (res.status === 401) {
      window.location.href = '/login';
      return;
    }

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to send WhatsApp message');

    showToast('WhatsApp message sent!', 'success');
    // Refresh conversations list in background to update latest snippet
    fetchConversations();
  } catch (err) {
    console.error('[Send Message Error]', err);
    showToast(err.message, 'error');
  } finally {
    if (elements.btnInboxSend) elements.btnInboxSend.disabled = false;
  }
}

/**
 * Mobile back button in chat header
 */
function handleInboxBack() {
  if (elements.inboxSidebar) elements.inboxSidebar.classList.remove('hidden');
  if (elements.inboxChatPane) elements.inboxChatPane.classList.add('hidden');
}

/**
 * Helper to jump directly from Lead Table or Kanban into WhatsApp Inbox
 */
function openInboxChat(phone, customerName) {
  switchView('inbox');
  loadChatThread(phone, customerName);
}

// Format message clock (e.g. "10:45 AM")
function formatMessageClock(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Expose openInboxChat and loadChatThread globally for inline onclick attributes
window.openInboxChat = openInboxChat;
window.loadChatThread = loadChatThread;

