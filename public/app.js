/**
 * Signature Detailing CRM Dashboard - Frontend Application Logic
 */

// Meta WhatsApp Coexistence (Option 2) Configuration
const META_CONFIG = {
  appId: '1086490643745739',
  configId: '2499074500567851',
};

// Initialize Facebook JavaScript SDK for Embedded Signup
window.fbAsyncInit = function() {
  if (typeof FB !== 'undefined') {
    FB.init({
      appId: META_CONFIG.appId,
      autoLogAppEvents: true,
      xfbml: true,
      version: 'v21.0',
    });
    console.log('[Meta FB SDK] Initialized successfully for WhatsApp Embedded Signup');
  }
};

// State Management
const state = {
  leads: [],
  filteredLeads: [],
  loading: false,
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
  instagramInbox: {
    conversations: [],
    activeSenderId: null,
    activeCustomerName: '',
    messages: [],
    loading: false,
    searchQuery: '',
    botPaused: false,
  },
  instagramComments: {
    list: [],
    activeTab: 'dms',
    loading: false,
  },
};

// DOM Elements
const elements = {
  // Primary Top Navigation
  navBtnInbox: document.getElementById('nav-btn-inbox'),
  navBtnInstagram: document.getElementById('nav-btn-instagram'),
  mainNavLeads: document.getElementById('main-nav-leads'),
  mainNavInbox: document.getElementById('main-nav-inbox'),
  mainNavInstagram: document.getElementById('main-nav-instagram'),

  // KPI Stats
  statTotal: document.getElementById('stat-total'),
  statNew: document.getElementById('stat-new'),
  statActive: document.getElementById('stat-active'),
  statCompleted: document.getElementById('stat-completed'),
  statWhatsapp: document.getElementById('stat-whatsapp'),
  statWebsite: document.getElementById('stat-website'),
  statInstagram: document.getElementById('stat-instagram'),
  cardMetricInstagram: document.getElementById('card-metric-instagram'),

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
  viewToggleInstagram: document.getElementById('view-toggle-instagram'),
  tableViewContainer: document.getElementById('table-view-container'),
  kanbanViewContainer: document.getElementById('kanban-view-container'),
  inboxViewContainer: document.getElementById('inbox-view-container'),
  instagramInboxViewContainer: document.getElementById('instagram-inbox-view-container'),
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
  btnBotActive: document.getElementById('btn-bot-active'),
  btnBotInactive: document.getElementById('btn-bot-inactive'),
  dotBotActive: document.getElementById('dot-bot-active'),
  dotBotInactive: document.getElementById('dot-bot-inactive'),
  btnComposerBotActive: document.getElementById('btn-composer-bot-active'),
  btnComposerBotInactive: document.getElementById('btn-composer-bot-inactive'),
  composerBotStatusBadge: document.getElementById('composer-bot-status-badge'),
  inboxHumanBanner: document.getElementById('inbox-human-banner'),
  btnResumeBotBanner: document.getElementById('btn-resume-bot-banner'),
  inboxMessagesContainer: document.getElementById('inbox-messages-container'),
  inboxQuickTemplates: document.getElementById('inbox-quick-templates'),
  inboxComposerBar: document.getElementById('inbox-composer-bar'),
  formInboxSend: document.getElementById('form-inbox-send'),
  inboxInputMessage: document.getElementById('inbox-input-message'),
  btnInboxSend: document.getElementById('btn-inbox-send'),

  // Instagram Inbox Elements
  instagramSidebar: document.getElementById('instagram-sidebar'),
  instagramChatPane: document.getElementById('instagram-chat-pane'),
  instagramConversationList: document.getElementById('instagram-conversation-list'),
  instagramSearchInput: document.getElementById('instagram-search-input'),
  btnRefreshInstagramInbox: document.getElementById('btn-refresh-instagram-inbox'),
  btnInstagramBack: document.getElementById('btn-instagram-back'),
  instagramHeaderAvatar: document.getElementById('instagram-header-avatar'),
  instagramHeaderName: document.getElementById('instagram-header-name'),
  instagramHeaderId: document.getElementById('instagram-header-id'),
  instagramHeaderActions: document.getElementById('instagram-header-actions'),
  btnIgBotActive: document.getElementById('btn-ig-bot-active'),
  btnIgBotInactive: document.getElementById('btn-ig-bot-inactive'),
  dotIgBotActive: document.getElementById('dot-ig-bot-active'),
  dotIgBotInactive: document.getElementById('dot-ig-bot-inactive'),
  instagramHumanBanner: document.getElementById('instagram-human-banner'),
  btnResumeIgBotBanner: document.getElementById('btn-resume-ig-bot-banner'),
  instagramMessagesContainer: document.getElementById('instagram-messages-container'),
  instagramQuickTemplates: document.getElementById('instagram-quick-templates'),
  instagramComposerBar: document.getElementById('instagram-composer-bar'),
  igComposerBotStatusBadge: document.getElementById('ig-composer-bot-status-badge'),
  btnIgComposerBotActive: document.getElementById('btn-ig-composer-bot-active'),
  btnIgComposerBotInactive: document.getElementById('btn-ig-composer-bot-inactive'),
  formInstagramSend: document.getElementById('form-instagram-send'),
  instagramInputMessage: document.getElementById('instagram-input-message'),
  btnInstagramSend: document.getElementById('btn-instagram-send'),
  igWebhookBadge: document.getElementById('ig-webhook-badge'),
  igDiagnosticLastEvent: document.getElementById('ig-diagnostic-last-event'),
  igConversationCount: document.getElementById('ig-conversation-count'),
  btnIgTestPing: document.getElementById('btn-ig-test-ping'),
  btnIgCheckStatus: document.getElementById('btn-ig-check-status'),
  btnIgSync: document.getElementById('btn-ig-sync'),
  btnSendIgServiceButtons: document.getElementById('btn-send-ig-service-buttons'),
  btnSendIgWhatsappButton: document.getElementById('btn-send-ig-whatsapp-button'),
  tabIgDms: document.getElementById('tab-ig-dms'),
  tabIgComments: document.getElementById('tab-ig-comments'),
  igDmsTabCount: document.getElementById('ig-dms-tab-count'),
  igCommentsTabCount: document.getElementById('ig-comments-tab-count'),
  instagramDmsView: document.getElementById('instagram-dms-view'),
  instagramCommentsView: document.getElementById('instagram-comments-view'),
  instagramCommentsStream: document.getElementById('instagram-comments-stream'),
  btnRefreshIgComments: document.getElementById('btn-refresh-ig-comments'),
  btnCommentsSimulateFeed: document.getElementById('btn-comments-simulate-feed'),
  btnIgTestCommentPing: document.getElementById('btn-ig-test-comment-ping'),

  // Instagram Diagnostics Modal
  modalIgDiagnostics: document.getElementById('modal-ig-diagnostics'),
  btnCloseIgDiagnostics: document.getElementById('btn-close-ig-diagnostics'),
  igDiagTokenStatus: document.getElementById('ig-diag-token-status'),
  igDiagTokenPrefix: document.getElementById('ig-diag-token-prefix'),
  igDiagEventTime: document.getElementById('ig-diag-event-time'),
  igRawEventJson: document.getElementById('ig-raw-event-json'),
  btnModalTestPing: document.getElementById('btn-modal-test-ping'),
  btnSyncIcebreakers: document.getElementById('btn-sync-icebreakers'),

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

  // WhatsApp Coexistence Modal
  modalCoexistence: document.getElementById('modal-coexistence'),
  btnOpenCoexistenceModal: document.getElementById('btn-open-coexistence-modal'),
  btnCloseCoexistenceModal: document.getElementById('btn-close-coexistence-modal'),
  btnLaunchMetaSignup: document.getElementById('btn-launch-meta-signup'),
  coexistenceStatusBanner: document.getElementById('coexistence-status-banner'),
  coexistenceStatusText: document.getElementById('coexistence-status-text'),

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
  // Coexistence Modal Listeners
  if (elements.btnOpenCoexistenceModal) {
    elements.btnOpenCoexistenceModal.addEventListener('click', () => {
      if (elements.modalCoexistence) elements.modalCoexistence.classList.remove('hidden');
    });
  }
  if (elements.btnCloseCoexistenceModal) {
    elements.btnCloseCoexistenceModal.addEventListener('click', () => {
      if (elements.modalCoexistence) elements.modalCoexistence.classList.add('hidden');
    });
  }
  if (elements.btnLaunchMetaSignup) {
    elements.btnLaunchMetaSignup.addEventListener('click', launchMetaEmbeddedSignup);
  }

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
  if (elements.viewToggleInstagram) {
    elements.viewToggleInstagram.addEventListener('click', () => switchView('instagram'));
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
  if (elements.btnBotActive) {
    elements.btnBotActive.addEventListener('click', () => handleToggleBot(true));
  }
  if (elements.btnBotInactive) {
    elements.btnBotInactive.addEventListener('click', () => handleToggleBot(false));
  }
  if (elements.btnComposerBotActive) {
    elements.btnComposerBotActive.addEventListener('click', () => handleToggleBot(true));
  }
  if (elements.btnComposerBotInactive) {
    elements.btnComposerBotInactive.addEventListener('click', () => handleToggleBot(false));
  }
  if (elements.btnResumeBotBanner) {
    elements.btnResumeBotBanner.addEventListener('click', () => handleToggleBot(true));
  }
  if (elements.navBtnInbox) {
    elements.navBtnInbox.addEventListener('click', () => switchView('inbox'));
  }
  if (elements.navBtnInstagram) {
    elements.navBtnInstagram.addEventListener('click', () => switchView('instagram'));
  }
  if (elements.mainNavLeads) {
    elements.mainNavLeads.addEventListener('click', () => switchView('table'));
  }
  if (elements.mainNavInbox) {
    elements.mainNavInbox.addEventListener('click', () => switchView('inbox'));
  }
  if (elements.mainNavInstagram) {
    elements.mainNavInstagram.addEventListener('click', () => switchView('instagram'));
  }
  const cardMetricWhatsapp = document.getElementById('card-metric-whatsapp');
  if (cardMetricWhatsapp) {
    cardMetricWhatsapp.addEventListener('click', () => switchView('inbox'));
  }
  if (elements.cardMetricInstagram) {
    elements.cardMetricInstagram.addEventListener('click', () => switchView('instagram'));
  }

  // Instagram Inbox Event Listeners
  if (elements.btnRefreshInstagramInbox) {
    elements.btnRefreshInstagramInbox.addEventListener('click', () => fetchInstagramConversations());
  }
  if (elements.instagramSearchInput) {
    elements.instagramSearchInput.addEventListener('input', (e) => {
      state.instagramInbox.searchQuery = e.target.value.toLowerCase().trim();
      renderInstagramConversationsList();
    });
  }
  if (elements.formInstagramSend) {
    elements.formInstagramSend.addEventListener('submit', handleInstagramSend);
  }
  if (elements.btnInstagramBack) {
    elements.btnInstagramBack.addEventListener('click', handleInstagramBack);
  }
  if (elements.instagramQuickTemplates) {
    elements.instagramQuickTemplates.addEventListener('click', (e) => {
      const btn = e.target.closest('.ig-quick-reply-btn');
      if (btn && btn.dataset.reply && elements.instagramInputMessage) {
        elements.instagramInputMessage.value = btn.dataset.reply;
        elements.instagramInputMessage.focus();
      }
    });
  }
  if (elements.btnIgBotActive) {
    elements.btnIgBotActive.addEventListener('click', () => handleToggleInstagramBot(true));
  }
  if (elements.btnIgBotInactive) {
    elements.btnIgBotInactive.addEventListener('click', () => handleToggleInstagramBot(false));
  }
  if (elements.btnIgComposerBotActive) {
    elements.btnIgComposerBotActive.addEventListener('click', () => handleToggleInstagramBot(true));
  }
  if (elements.btnIgComposerBotInactive) {
    elements.btnIgComposerBotInactive.addEventListener('click', () => handleToggleInstagramBot(false));
  }
  if (elements.btnResumeIgBotBanner) {
    elements.btnResumeIgBotBanner.addEventListener('click', () => handleToggleInstagramBot(true));
  }
  if (elements.btnIgTestPing) {
    elements.btnIgTestPing.addEventListener('click', triggerInstagramTestPing);
  }
  if (elements.btnIgSync) {
    elements.btnIgSync.addEventListener('click', syncInstagramFromMeta);
  }
  if (elements.btnSendIgServiceButtons) {
    elements.btnSendIgServiceButtons.addEventListener('click', handleSendServiceButtons);
  }
  if (elements.btnSendIgWhatsappButton) {
    elements.btnSendIgWhatsappButton.addEventListener('click', handleSendWhatsappButton);
  }
  if (elements.btnSyncIcebreakers) {
    elements.btnSyncIcebreakers.addEventListener('click', handleSyncIceBreakers);
  }
  if (elements.tabIgDms) {
    elements.tabIgDms.addEventListener('click', () => switchInstagramSubTab('dms'));
  }
  if (elements.tabIgComments) {
    elements.tabIgComments.addEventListener('click', () => switchInstagramSubTab('comments'));
  }
  if (elements.btnRefreshIgComments) {
    elements.btnRefreshIgComments.addEventListener('click', fetchInstagramComments);
  }
  if (elements.btnCommentsSimulateFeed) {
    elements.btnCommentsSimulateFeed.addEventListener('click', triggerInstagramCommentTestPing);
  }
  if (elements.btnIgTestCommentPing) {
    elements.btnIgTestCommentPing.addEventListener('click', triggerInstagramCommentTestPing);
  }
  if (elements.btnModalTestPing) {
    elements.btnModalTestPing.addEventListener('click', triggerInstagramTestPing);
  }
  if (elements.btnIgCheckStatus) {
    elements.btnIgCheckStatus.addEventListener('click', () => {
      if (elements.modalIgDiagnostics) elements.modalIgDiagnostics.classList.remove('hidden');
      fetchInstagramWebhookStatus();
    });
  }
  if (elements.btnCloseIgDiagnostics) {
    elements.btnCloseIgDiagnostics.addEventListener('click', () => {
      if (elements.modalIgDiagnostics) elements.modalIgDiagnostics.classList.add('hidden');
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
  const instagram = leads.filter((l) => l.source === 'instagram').length;

  elements.statTotal.textContent = total;
  elements.statNew.textContent = newLeads;
  elements.statActive.textContent = active;
  elements.statCompleted.textContent = completed;
  elements.statWhatsapp.textContent = whatsapp;
  elements.statWebsite.textContent = website;
  if (elements.statInstagram) {
    elements.statInstagram.textContent = instagram || state.instagramInbox.conversations.length;
  }
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
  } else if (state.viewMode === 'kanban') {
    renderKanban();
  }
}

// Switch between Table, Kanban, WhatsApp Inbox, and Instagram Inbox Views
function switchView(mode) {
  state.viewMode = mode;

  if (elements.tableViewContainer) elements.tableViewContainer.classList.toggle('hidden', mode !== 'table');
  if (elements.kanbanViewContainer) elements.kanbanViewContainer.classList.toggle('hidden', mode !== 'kanban');
  if (elements.inboxViewContainer) elements.inboxViewContainer.classList.toggle('hidden', mode !== 'inbox');
  if (elements.instagramInboxViewContainer) elements.instagramInboxViewContainer.classList.toggle('hidden', mode !== 'instagram');

  const toggles = [
    { el: elements.viewToggleTable, active: mode === 'table' },
    { el: elements.viewToggleKanban, active: mode === 'kanban' },
    { el: elements.viewToggleInbox, active: mode === 'inbox' },
    { el: elements.viewToggleInstagram, active: mode === 'instagram' },
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

  // Update Primary Top Navigation Tabs
  if (elements.mainNavLeads && elements.mainNavInbox && elements.mainNavInstagram) {
    if (mode === 'instagram') {
      elements.mainNavInstagram.className = 'flex items-center space-x-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg shadow-pink-600/20 active:scale-95';
      elements.mainNavInbox.className = 'flex items-center space-x-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800 active:scale-95';
      elements.mainNavLeads.className = 'flex items-center space-x-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800 active:scale-95';
    } else if (mode === 'inbox') {
      elements.mainNavInbox.className = 'flex items-center space-x-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition bg-green-600 text-white shadow-lg shadow-green-600/20 active:scale-95';
      elements.mainNavInstagram.className = 'flex items-center space-x-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800 active:scale-95';
      elements.mainNavLeads.className = 'flex items-center space-x-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800 active:scale-95';
    } else {
      elements.mainNavLeads.className = 'flex items-center space-x-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition bg-sky-600 text-white shadow-lg shadow-sky-600/20 active:scale-95';
      elements.mainNavInbox.className = 'flex items-center space-x-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800 active:scale-95';
      elements.mainNavInstagram.className = 'flex items-center space-x-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800 active:scale-95';
    }
  }

  if (mode === 'table') {
    renderTable();
  } else if (mode === 'kanban') {
    renderKanban();
  } else if (mode === 'inbox') {
    fetchConversations(true);
  } else if (mode === 'instagram') {
    fetchInstagramConversations(true);
    fetchInstagramWebhookStatus();
    fetchInstagramComments();
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
              <div 
                onclick="openInboxChat('${cleanPhone}', '${escapeHtml(lead.name)}')" 
                title="Click to open in CRM Chat" 
                class="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-700 hover:from-emerald-950 hover:to-emerald-900 border border-zinc-700 hover:border-emerald-500/50 flex items-center justify-center text-xs font-semibold text-sky-400 hover:text-emerald-400 cursor-pointer transition shadow-sm"
              >
                ${initials}
              </div>
              <div>
                <button 
                  onclick="openInboxChat('${cleanPhone}', '${escapeHtml(lead.name)}')" 
                  title="Click to open in CRM Chat"
                  class="font-semibold text-white hover:text-emerald-400 text-xs transition text-left cursor-pointer"
                >
                  ${escapeHtml(lead.name)}
                </button>
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
              <!-- Showcased CRM Live Chat Button -->
              <button 
                onclick="openInboxChat('${cleanPhone}', '${escapeHtml(lead.name)}')" 
                title="Open inside CRM Live Chat"
                class="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold shadow-sm transition active:scale-95 mr-0.5"
              >
                <i data-lucide="message-square" class="w-3.5 h-3.5"></i>
                <span class="hidden xl:inline">CRM Chat</span>
              </button>

              <!-- 1. Open WhatsApp Web/App -->
              <a 
                href="${waUrl}" 
                target="_blank" 
                title="Open in WhatsApp Web / App"
                class="p-1.5 rounded-lg bg-green-950/60 hover:bg-green-900 text-green-400 border border-green-800/50 transition active:scale-95"
              >
                <i data-lucide="message-circle" class="w-3.5 h-3.5"></i>
              </a>

              <!-- 2. Call Customer -->
              <a 
                href="tel:${lead.phone}" 
                title="Call Customer"
                class="p-1.5 rounded-lg bg-sky-950/60 hover:bg-sky-900 text-sky-400 border border-sky-800/50 transition active:scale-95"
              >
                <i data-lucide="phone" class="w-3.5 h-3.5"></i>
              </a>

              <!-- 3. Delete Lead -->
              <button 
                onclick="promptDeleteLead('${lead.id}', '${escapeHtml(lead.name)}')" 
                title="Delete Lead"
                class="p-1.5 rounded-lg bg-zinc-900 hover:bg-red-950/60 text-zinc-500 hover:text-red-400 border border-zinc-800 hover:border-red-900/50 transition active:scale-95"
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
          <div class="space-y-2 pt-1.5 border-t border-zinc-800/50">
            <!-- Row 1: Status Dropdown & Showcased CRM Chat -->
            <div class="grid grid-cols-5 gap-1.5">
              <div class="col-span-3">
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

              <!-- Showcased CRM Chat Button -->
              <button 
                onclick="openInboxChat('${cleanPhone}', '${escapeHtml(lead.name)}')" 
                class="col-span-2 flex items-center justify-center space-x-1 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition active:scale-95 shadow-sm"
                title="Open inside CRM Live Chat"
              >
                <i data-lucide="message-square" class="w-3.5 h-3.5"></i>
                <span>CRM Chat</span>
              </button>
            </div>

            <!-- Row 2: 3 Quick Action Buttons (WhatsApp, Call, Delete) -->
            <div class="grid grid-cols-3 gap-1.5">
              <a 
                href="${waUrl}" 
                target="_blank" 
                class="flex items-center justify-center space-x-1 py-1.5 rounded-lg bg-green-950/60 hover:bg-green-900 text-green-400 border border-green-800/50 text-[11px] font-medium transition active:scale-95"
                title="Open in WhatsApp Web / App"
              >
                <i data-lucide="message-circle" class="w-3.5 h-3.5"></i>
                <span>WhatsApp</span>
              </a>

              <a 
                href="tel:${lead.phone}" 
                class="flex items-center justify-center space-x-1 py-1.5 rounded-lg bg-sky-950/60 hover:bg-sky-900 text-sky-400 border border-sky-800/50 text-[11px] font-medium transition active:scale-95"
                title="Call Customer"
              >
                <i data-lucide="phone" class="w-3.5 h-3.5"></i>
                <span>Call</span>
              </a>

              <button 
                onclick="promptDeleteLead('${lead.id}', '${escapeHtml(lead.name)}')" 
                class="flex items-center justify-center space-x-1 py-1.5 rounded-lg bg-zinc-900 hover:bg-red-950/60 text-zinc-500 hover:text-red-400 border border-zinc-800 text-[11px] font-medium transition active:scale-95"
                title="Delete Lead"
              >
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                <span>Delete</span>
              </button>
            </div>
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
                  <h5 
                    onclick="openInboxChat('${cleanPhone}', '${escapeHtml(lead.name)}')" 
                    class="text-xs font-bold text-white hover:text-emerald-400 cursor-pointer transition truncate"
                    title="Click to open CRM Chat"
                  >
                    ${escapeHtml(lead.name)}
                  </h5>
                  <a href="tel:${lead.phone}" class="text-[11px] text-zinc-400 hover:text-sky-400 font-mono">${escapeHtml(lead.phone)}</a>
                </div>
                <div class="shrink-0">
                  ${getSourceBadge(lead.source)}
                </div>
              </div>

              <div class="text-[11px] font-medium text-sky-300 bg-sky-950/40 border border-sky-900/40 px-2 py-0.5 rounded inline-block truncate max-w-full">
                ${escapeHtml(lead.service)}
              </div>

              <!-- Showcased CRM Chat Action Bar -->
              <button 
                onclick="openInboxChat('${cleanPhone}', '${escapeHtml(lead.name)}')" 
                class="w-full flex items-center justify-center space-x-1.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition active:scale-95 shadow-sm"
                title="Open inside CRM Live Chat"
              >
                <i data-lucide="message-square" class="w-3.5 h-3.5"></i>
                <span>Open CRM Chat</span>
              </button>

              <div class="flex items-center justify-between pt-1.5 border-t border-zinc-800/60 text-[11px] text-zinc-500">
                <span>${formatTimeAgo(lead.created_at)}</span>

                <!-- 3 Quick Action Buttons: WhatsApp, Call, Delete -->
                <div class="flex items-center space-x-1.5">
                  <a href="${waUrl}" target="_blank" class="p-1.5 rounded-lg bg-green-950/60 text-green-400 hover:bg-green-900 border border-green-800/40 transition active:scale-95" title="Open WhatsApp Web / App">
                    <i data-lucide="message-circle" class="w-3.5 h-3.5"></i>
                  </a>
                  <a href="tel:${lead.phone}" class="p-1.5 rounded-lg bg-sky-950/60 text-sky-400 hover:bg-sky-900 border border-sky-800/40 transition active:scale-95" title="Call Customer">
                    <i data-lucide="phone" class="w-3.5 h-3.5"></i>
                  </a>
                  <button onclick="promptDeleteLead('${lead.id}', '${escapeHtml(lead.name)}')" class="p-1.5 rounded-lg bg-zinc-900 text-zinc-500 hover:text-red-400 hover:bg-red-950 border border-zinc-800 transition active:scale-95" title="Delete Lead">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
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
        ? 'conversation-item-active bg-zinc-800/90 shadow-sm'
        : 'hover:bg-zinc-900/60 border-l-4 border-l-transparent';
      
      const initials = (conv.customer_name || 'C')
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

      const senderTag =
        conv.last_sender === 'customer'
          ? '<span class="text-zinc-500 text-[10px] mr-1">↙</span>'
          : conv.last_sender === 'bot'
          ? '<span class="text-indigo-400 text-[10px] font-semibold mr-1">🤖 Bot:</span>'
          : '<span class="text-emerald-400 text-[10px] font-semibold mr-1">↗ You:</span>';

      const avatarBg = isActive 
        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm' 
        : 'bg-zinc-900 text-zinc-300 border-zinc-700/80';

      return `
        <div 
          onclick="loadChatThread('${escapeHtml(conv.phone)}', '${escapeHtml(conv.customer_name)}')"
          class="conversation-item p-3.5 cursor-pointer transition flex items-start space-x-3 border-b border-zinc-900/80 ${activeClass}"
        >
          <div class="w-10 h-10 rounded-xl ${avatarBg} border font-bold flex items-center justify-center text-xs shrink-0 transition shadow-inner">
            ${escapeHtml(initials)}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between">
              <h5 class="text-xs font-bold text-zinc-100 truncate">${escapeHtml(conv.customer_name)}</h5>
              <span class="text-[10px] text-zinc-500 font-medium shrink-0 ml-1.5">${formatTimeAgo(conv.last_message_at)}</span>
            </div>
            <p class="text-[11px] text-zinc-400 font-mono mt-0.5">${escapeHtml(conv.phone)}</p>
            <p class="text-xs text-zinc-400 truncate mt-1 flex items-center">
              ${senderTag}<span>${escapeHtml(conv.last_message || '')}</span>
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

    // Check Bot Paused status from backend meta
    const isBotPaused = Boolean(json.meta?.botPaused);
    updateBotStatusUI(isBotPaused);
  } catch (err) {
    console.error('[Load Thread Error]', err);
    showToast(err.message, 'error');
  }
}

/**
 * Update Bot Status badge, toggle button, and human mode banner
 */
function updateBotStatusUI(isPaused) {
  state.inbox.botPaused = Boolean(isPaused);

  // Top-Right Header 2 Options: Bot Active vs Bot Inactive
  if (elements.btnBotActive && elements.btnBotInactive) {
    if (isPaused) {
      // Inactive is selected
      elements.btnBotActive.className = 'flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-white transition active:scale-95 bg-transparent';
      if (elements.dotBotActive) elements.dotBotActive.className = 'w-2 h-2 rounded-full bg-zinc-600';

      elements.btnBotInactive.className = 'flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition bg-amber-600 text-white shadow active:scale-95';
      if (elements.dotBotInactive) elements.dotBotInactive.className = 'w-2 h-2 rounded-full bg-white animate-pulse';
    } else {
      // Active is selected
      elements.btnBotActive.className = 'flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition bg-green-600 text-white shadow active:scale-95';
      if (elements.dotBotActive) elements.dotBotActive.className = 'w-2 h-2 rounded-full bg-white animate-pulse';

      elements.btnBotInactive.className = 'flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-white transition active:scale-95 bg-transparent';
      if (elements.dotBotInactive) elements.dotBotInactive.className = 'w-2 h-2 rounded-full bg-zinc-600';
    }
  }

  // Composer Bar 2 Options
  if (elements.btnComposerBotActive && elements.btnComposerBotInactive) {
    if (isPaused) {
      elements.btnComposerBotActive.className = 'px-2.5 py-0.5 rounded text-[11px] font-medium transition text-zinc-400 hover:text-white active:scale-95 bg-transparent';
      elements.btnComposerBotInactive.className = 'px-2.5 py-0.5 rounded text-[11px] font-bold transition bg-amber-600 text-white shadow-sm active:scale-95';
    } else {
      elements.btnComposerBotActive.className = 'px-2.5 py-0.5 rounded text-[11px] font-bold transition bg-green-600 text-white shadow-sm active:scale-95';
      elements.btnComposerBotInactive.className = 'px-2.5 py-0.5 rounded text-[11px] font-medium transition text-zinc-400 hover:text-white active:scale-95 bg-transparent';
    }
  }

  if (elements.composerBotStatusBadge) {
    if (isPaused) {
      elements.composerBotStatusBadge.className = 'px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-950 text-amber-400 border border-amber-800/80';
      elements.composerBotStatusBadge.textContent = '⏸️ Bot Inactive';
    } else {
      elements.composerBotStatusBadge.className = 'px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-950 text-green-400 border border-green-800/80';
      elements.composerBotStatusBadge.textContent = '🟢 Bot Active';
    }
  }

  if (elements.inboxHumanBanner) {
    elements.inboxHumanBanner.classList.toggle('hidden', !isPaused);
  }
}

/**
 * Toggle Bot Active / Inactive state for current active conversation
 */
async function handleToggleBot(forceActive = null) {
  if (!state.inbox.activePhone) return;

  const currentPaused = state.inbox.botPaused;
  const targetActive = forceActive !== null ? forceActive : currentPaused; // If paused, target is active (true)

  // Optimistic UI update
  updateBotStatusUI(!targetActive);

  try {
    const res = await fetch('/api/inbox/whatsapp/bot-toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: state.inbox.activePhone,
        botActive: targetActive,
      }),
    });

    if (res.status === 401) {
      window.location.href = '/login';
      return;
    }

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to toggle bot status');

    if (targetActive) {
      showToast('Bot set to Active! Automated replies enabled.', 'success');
    } else {
      showToast('Bot set to Inactive! Human mode enabled.', 'info');
    }
  } catch (err) {
    console.error('[Bot Toggle Error]', err);
    showToast(err.message, 'error');
    // Revert UI on error
    updateBotStatusUI(currentPaused);
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
          <div class="flex flex-col items-start max-w-[85%] sm:max-w-[70%] animate-fade-in">
            <div class="px-4 py-2.5 rounded-2xl rounded-tl-xs bg-zinc-900/95 text-zinc-100 text-xs sm:text-sm border border-zinc-700/60 shadow-md leading-relaxed whitespace-pre-wrap select-text">
              ${escapeHtml(msg.message_text)}
            </div>
            <span class="text-[10px] text-zinc-500 font-medium mt-1 ml-1.5">${escapeHtml(timeStr)}</span>
          </div>
        `;
      } else if (isBot) {
        return `
          <div class="flex flex-col items-end self-end max-w-[85%] sm:max-w-[70%] animate-fade-in">
            <div class="px-4 py-2.5 rounded-2xl rounded-tr-xs bg-indigo-950/40 text-zinc-200 text-xs sm:text-sm border border-indigo-500/30 shadow-md leading-relaxed whitespace-pre-wrap select-text">
              <div class="flex items-center space-x-1.5 text-[10px] text-indigo-400 font-bold mb-1">
                <i data-lucide="bot" class="w-3 h-3"></i>
                <span>Automated Assistant</span>
              </div>
              ${escapeHtml(msg.message_text)}
            </div>
            <span class="text-[10px] text-zinc-500 font-medium mt-1 mr-1.5">${escapeHtml(timeStr)}</span>
          </div>
        `;
      } else {
        // Agent / Staff reply
        return `
          <div class="flex flex-col items-end self-end max-w-[85%] sm:max-w-[70%] animate-fade-in">
            <div class="px-4 py-2.5 rounded-2xl rounded-tr-xs bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs sm:text-sm shadow-lg shadow-emerald-950/40 leading-relaxed whitespace-pre-wrap select-text">
              <div class="flex items-center space-x-1.5 text-[10px] text-emerald-200 font-bold mb-1">
                <i data-lucide="user-check" class="w-3 h-3"></i>
                <span>You (Staff)</span>
              </div>
              ${escapeHtml(msg.message_text)}
            </div>
            <span class="text-[10px] text-zinc-500 font-medium mt-1 mr-1.5">${escapeHtml(timeStr)}</span>
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
  // Automatically switch to Human Takeover mode
  updateBotStatusUI(true);

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

/**
 * Launch Meta Embedded Signup Popup for WhatsApp Coexistence (Option 2)
 */
function launchMetaEmbeddedSignup() {
  if (typeof FB === 'undefined') {
    showToast('Meta Facebook SDK is loading. If blocked, please allow scripts or disable ad blockers.', 'warning');
    return;
  }

  showToast('Launching Meta WhatsApp Coexistence dialog...', 'info');

  FB.login(function(response) {
    if (response.authResponse && response.authResponse.code) {
      console.log('[Meta Embedded Signup Code]', response.authResponse.code);
      showToast('Linking WhatsApp Business account to CRM...', 'info');
      handleCoexistenceSignupCallback({ code: response.authResponse.code });
    } else {
      console.log('[Meta Embedded Signup Response]', response);
    }
  }, {
    config_id: META_CONFIG.configId,
    response_type: 'code',
    override_default_response_type: true,
    extras: {
      setup: {},
      feature: 'whatsapp_embedded_signup',
      version: 2,
      sessionInfoVersion: 3,
    },
  });
}

/**
 * Listen for Meta Embedded Signup postMessage events from the popup
 */
window.addEventListener('message', async (event) => {
  if (event.origin !== 'https://www.facebook.com' && event.origin !== 'https://web.facebook.com') {
    return;
  }

  try {
    const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    if (data?.type === 'WA_EMBEDDED_SIGNUP') {
      console.log('[Meta WA_EMBEDDED_SIGNUP Event]', data);
      if (data.event === 'FINISH' || data.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING') {
        const { phone_number_id, waba_id } = data.data || {};
        showToast('WhatsApp Coexistence successfully completed on Meta!', 'success');
        await handleCoexistenceSignupCallback({
          phoneNumberId: phone_number_id,
          wabaId: waba_id,
        });
      } else if (data.event === 'CANCEL') {
        showToast('WhatsApp setup was cancelled.', 'info');
      }
    }
  } catch (err) {
    // Ignore non-JSON messages from other browser extensions
  }
});

/**
 * Send Embedded Signup completion data to CRM Backend
 */
async function handleCoexistenceSignupCallback(payload) {
  try {
    const res = await fetch('/api/inbox/whatsapp/embedded-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to link Coexistence');

    if (elements.coexistenceStatusBanner && elements.coexistenceStatusText) {
      elements.coexistenceStatusText.textContent = 'WhatsApp Coexistence successfully active! Your phone app & CRM are synced.';
      elements.coexistenceStatusBanner.classList.remove('hidden');
    }

    showToast('WhatsApp Coexistence is now ACTIVE! Phone & CRM synced.', 'success');
  } catch (err) {
    console.error('[Coexistence Registration Error]', err);
    showToast(err.message, 'error');
  }
}

/* ==========================================================================
   Instagram Live Inbox & Webhook Diagnostic Module
   ========================================================================== */

/**
 * Fetch list of active Instagram conversations
 */
async function fetchInstagramConversations(autoSelectFirst = false) {
  if (!elements.instagramConversationList) return;
  state.instagramInbox.loading = true;

  try {
    const res = await fetch('/api/inbox/instagram/conversations');
    if (res.status === 401) {
      window.location.href = '/login';
      return;
    }

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to load Instagram conversations');

    state.instagramInbox.conversations = json.data || [];
    renderInstagramConversationsList();

    // Update conversation count badge and KPI card
    if (elements.igConversationCount) {
      elements.igConversationCount.textContent = state.instagramInbox.conversations.length;
    }
    if (elements.igDmsTabCount) {
      elements.igDmsTabCount.textContent = state.instagramInbox.conversations.length;
    }
    if (elements.statInstagram) {
      elements.statInstagram.textContent = state.instagramInbox.conversations.length;
    }

    // Auto-select first conversation if requested
    if (autoSelectFirst && state.instagramInbox.conversations.length > 0 && !state.instagramInbox.activeSenderId) {
      const first = state.instagramInbox.conversations[0];
      loadInstagramChatThread(first.senderId, first.customer_name);
    }
  } catch (err) {
    console.error('[Instagram Inbox Error]', err);
    showToast(err.message, 'error');
  } finally {
    state.instagramInbox.loading = false;
  }
}

/**
 * Filter and render conversation previews in the Instagram sidebar
 */
function renderInstagramConversationsList() {
  if (!elements.instagramConversationList) return;

  const query = state.instagramInbox.searchQuery;
  const filtered = state.instagramInbox.conversations.filter((c) => {
    if (!query) return true;
    return (
      (c.customer_name && c.customer_name.toLowerCase().includes(query)) ||
      (c.senderId && c.senderId.toLowerCase().includes(query)) ||
      (c.last_message && c.last_message.toLowerCase().includes(query))
    );
  });

  if (filtered.length === 0) {
    elements.instagramConversationList.innerHTML = `
      <div class="p-6 text-center text-zinc-500 text-xs">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-yellow-500/20 via-pink-500/20 to-purple-500/20 text-pink-400 flex items-center justify-center mx-auto mb-2 border border-pink-500/30 shadow-inner">
          <i data-lucide="instagram" class="w-6 h-6"></i>
        </div>
        <p class="font-medium text-zinc-300">No Instagram conversations yet</p>
        <p class="text-[11px] text-zinc-500 mt-1 max-w-[220px] mx-auto">When customers send a DM to @creationindia_, their threads appear here.</p>
        <button onclick="triggerInstagramTestPing()" class="mt-3.5 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-pink-600 to-rose-600 text-white text-[11px] font-semibold shadow hover:brightness-110 active:scale-95 transition">
          <i data-lucide="zap" class="w-3 h-3 text-yellow-300"></i>
          <span>Simulate Test DM</span>
        </button>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  elements.instagramConversationList.innerHTML = filtered
    .map((conv) => {
      const isActive = state.instagramInbox.activeSenderId === conv.senderId;
      const activeClass = isActive
        ? 'conversation-item-ig-active bg-zinc-800/90 shadow-sm'
        : 'hover:bg-zinc-900/60 border-l-4 border-l-transparent';

      const initials = (conv.customer_name || 'IG')
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

      const senderTag =
        conv.last_sender === 'customer'
          ? '<span class="text-pink-400 text-[10px] font-medium mr-1">↙</span>'
          : conv.last_sender === 'bot'
          ? '<span class="text-indigo-400 text-[10px] font-semibold mr-1">🤖 Bot:</span>'
          : '<span class="text-rose-400 text-[10px] font-semibold mr-1">↗ You:</span>';

      const avatarBg = isActive
        ? 'bg-gradient-to-tr from-yellow-500 via-pink-600 to-purple-600 text-white shadow-md'
        : 'bg-zinc-900 text-pink-300 border border-zinc-700/80';

      const botBadge = conv.botPaused
        ? '<span class="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800/60 font-medium">Human</span>'
        : '';

      return `
        <div 
          onclick="loadInstagramChatThread('${escapeHtml(conv.senderId)}', '${escapeHtml(conv.customer_name)}')"
          class="conversation-item p-3.5 cursor-pointer transition flex items-start space-x-3 border-b border-zinc-900/80 ${activeClass}"
        >
          <div class="w-10 h-10 rounded-xl ${avatarBg} font-bold flex items-center justify-center text-xs shrink-0 transition shadow-inner">
            ${escapeHtml(initials)}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between">
              <h5 class="text-xs font-bold text-zinc-100 truncate">${escapeHtml(conv.customer_name)}</h5>
              <span class="text-[10px] text-zinc-500 font-medium shrink-0 ml-1.5">${formatTimeAgo(conv.last_message_at)}</span>
            </div>
            <div class="flex items-center justify-between mt-0.5">
              <p class="text-[11px] text-zinc-400 font-mono">ID: ${escapeHtml(conv.senderId)}</p>
              ${botBadge}
            </div>
            <p class="text-xs text-zinc-400 truncate mt-1 flex items-center">
              ${senderTag}<span>${escapeHtml(conv.last_message || '')}</span>
            </p>
          </div>
        </div>
      `;
    })
    .join('');

  lucide.createIcons();
}

/**
 * Load and display full message thread for a selected Instagram user
 */
async function loadInstagramChatThread(senderId, customerName) {
  state.instagramInbox.activeSenderId = senderId;
  state.instagramInbox.activeCustomerName = customerName || `Instagram User (${senderId.slice(-4)})`;

  // Update header details
  if (elements.instagramHeaderName) elements.instagramHeaderName.textContent = customerName || `Instagram User (${senderId.slice(-4)})`;
  if (elements.instagramHeaderId) elements.instagramHeaderId.textContent = `Instagram IGSID: ${senderId}`;

  const initials = (customerName || 'IG')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  if (elements.instagramHeaderAvatar) elements.instagramHeaderAvatar.textContent = initials;

  // Unhide actions and composer
  if (elements.instagramHeaderActions) elements.instagramHeaderActions.classList.remove('hidden');
  if (elements.instagramQuickTemplates) elements.instagramQuickTemplates.classList.remove('hidden');
  if (elements.instagramComposerBar) elements.instagramComposerBar.classList.remove('hidden');

  // Mobile layout switch: Hide sidebar, show chat pane
  if (window.innerWidth < 768) {
    if (elements.instagramSidebar) elements.instagramSidebar.classList.add('hidden');
    if (elements.instagramChatPane) elements.instagramChatPane.classList.remove('hidden');
  }

  renderInstagramConversationsList();

  // Show loading indicator in message container
  if (elements.instagramMessagesContainer) {
    elements.instagramMessagesContainer.innerHTML = `
      <div class="h-full flex items-center justify-center text-zinc-500 text-xs">
        <i data-lucide="loader-2" class="w-5 h-5 animate-spin mr-2 text-pink-400"></i>
        <span>Loading Instagram messages...</span>
      </div>
    `;
    lucide.createIcons();
  }

  try {
    const res = await fetch(`/api/inbox/instagram/messages/${encodeURIComponent(senderId)}`);
    if (res.status === 401) {
      window.location.href = '/login';
      return;
    }

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to load Instagram thread');

    state.instagramInbox.messages = json.data || [];
    renderInstagramMessageThread();

    // Check Bot Paused status from backend meta
    const isBotPaused = Boolean(json.meta?.botPaused);
    updateInstagramBotStatusUI(isBotPaused);
  } catch (err) {
    console.error('[Load Instagram Thread Error]', err);
    showToast(err.message, 'error');
  }
}

/**
 * Update Bot Status UI for Instagram
 */
function updateInstagramBotStatusUI(isPaused) {
  state.instagramInbox.botPaused = Boolean(isPaused);

  // Top-Right Header 2 Options: Bot Active vs Bot Inactive
  if (elements.btnIgBotActive && elements.btnIgBotInactive) {
    if (isPaused) {
      elements.btnIgBotActive.className = 'flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-white transition active:scale-95 bg-transparent';
      if (elements.dotIgBotActive) elements.dotIgBotActive.className = 'w-2 h-2 rounded-full bg-zinc-600';

      elements.btnIgBotInactive.className = 'flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition bg-amber-600 text-white shadow active:scale-95';
      if (elements.dotIgBotInactive) elements.dotIgBotInactive.className = 'w-2 h-2 rounded-full bg-white animate-pulse';
    } else {
      elements.btnIgBotActive.className = 'flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition bg-green-600 text-white shadow active:scale-95';
      if (elements.dotIgBotActive) elements.dotIgBotActive.className = 'w-2 h-2 rounded-full bg-white animate-pulse';

      elements.btnIgBotInactive.className = 'flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-white transition active:scale-95 bg-transparent';
      if (elements.dotIgBotInactive) elements.dotIgBotInactive.className = 'w-2 h-2 rounded-full bg-zinc-600';
    }
  }

  // Composer Bar 2 Options
  if (elements.btnIgComposerBotActive && elements.btnIgComposerBotInactive) {
    if (isPaused) {
      elements.btnIgComposerBotActive.className = 'px-2.5 py-0.5 rounded text-[11px] font-medium transition text-zinc-400 hover:text-white active:scale-95 bg-transparent';
      elements.btnIgComposerBotInactive.className = 'px-2.5 py-0.5 rounded text-[11px] font-bold transition bg-amber-600 text-white shadow-sm active:scale-95';
    } else {
      elements.btnIgComposerBotActive.className = 'px-2.5 py-0.5 rounded text-[11px] font-bold transition bg-green-600 text-white shadow-sm active:scale-95';
      elements.btnIgComposerBotInactive.className = 'px-2.5 py-0.5 rounded text-[11px] font-medium transition text-zinc-400 hover:text-white active:scale-95 bg-transparent';
    }
  }

  if (elements.igComposerBotStatusBadge) {
    if (isPaused) {
      elements.igComposerBotStatusBadge.className = 'px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-950 text-amber-400 border border-amber-800/80';
      elements.igComposerBotStatusBadge.textContent = '⏸️ Bot Inactive';
    } else {
      elements.igComposerBotStatusBadge.className = 'px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-950 text-green-400 border border-green-800/80';
      elements.igComposerBotStatusBadge.textContent = '🟢 Bot Active';
    }
  }

  if (elements.instagramHumanBanner) {
    elements.instagramHumanBanner.classList.toggle('hidden', !isPaused);
  }
}

/**
 * Toggle Bot Active / Inactive state for current Instagram conversation
 */
async function handleToggleInstagramBot(forceActive = null) {
  if (!state.instagramInbox.activeSenderId) return;

  const currentPaused = state.instagramInbox.botPaused;
  const targetActive = forceActive !== null ? forceActive : currentPaused;

  updateInstagramBotStatusUI(!targetActive);

  try {
    const res = await fetch('/api/inbox/instagram/bot-toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderId: state.instagramInbox.activeSenderId,
        botActive: targetActive,
      }),
    });

    if (res.status === 401) {
      window.location.href = '/login';
      return;
    }

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to toggle Instagram bot status');

    if (targetActive) {
      showToast('Instagram bot set to Active! Automated DM replies enabled.', 'success');
    } else {
      showToast('Instagram bot set to Inactive! Human mode enabled.', 'info');
    }
    fetchInstagramConversations();
  } catch (err) {
    console.error('[Instagram Bot Toggle Error]', err);
    showToast(err.message, 'error');
    updateInstagramBotStatusUI(currentPaused);
  }
}

/**
 * Render message bubbles inside Instagram chat pane
 */
function renderInstagramMessageThread() {
  if (!elements.instagramMessagesContainer) return;

  if (state.instagramInbox.messages.length === 0) {
    elements.instagramMessagesContainer.innerHTML = `
      <div class="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
        <i data-lucide="message-square" class="w-8 h-8 mb-2 opacity-40 text-pink-400"></i>
        <p class="text-xs">No recorded messages in this Instagram thread yet.</p>
        <p class="text-[11px] text-zinc-600 mt-1">Send a message below to reach out directly.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  elements.instagramMessagesContainer.innerHTML = state.instagramInbox.messages
    .map((msg) => {
      const isCustomer = msg.direction === 'inbound';
      const isBot = msg.sender === 'bot';
      const timeStr = formatMessageClock(msg.created_at);
      const rawText = msg.message_text || '';

      // Check if incoming customer message is a button tap response
      const isButtonTap =
        ['1', '2', '3', '4', '5', 'menu', 'location'].includes(rawText.trim().toLowerCase()) ||
        rawText.includes('1. PPF') ||
        rawText.includes('2. Ceramic') ||
        rawText.includes('3. Correction') ||
        rawText.includes('4. Interior') ||
        rawText.includes('5. Full Detail');

      // Check if outbound bot or staff message delivered interactive buttons
      let buttonPreviewHtml = '';
      if (
        rawText.includes('Tap a button below') ||
        rawText.includes('Tap an option below') ||
        rawText.includes('Which service are you interested in')
      ) {
        buttonPreviewHtml = `
          <div class="mt-2.5 pt-2 border-t border-indigo-500/30">
            <span class="text-[9px] text-indigo-300 font-semibold block mb-1">Quick Reply Buttons Delivered:</span>
            <div class="flex flex-wrap gap-1">
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-pink-900/70 text-pink-200 border border-pink-700/60 shadow-sm">1. PPF 🛡️</span>
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-pink-900/70 text-pink-200 border border-pink-700/60 shadow-sm">2. Ceramic ✨</span>
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-pink-900/70 text-pink-200 border border-pink-700/60 shadow-sm">3. Correction 🚘</span>
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-pink-900/70 text-pink-200 border border-pink-700/60 shadow-sm">4. Interior 🧼</span>
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-pink-900/70 text-pink-200 border border-pink-700/60 shadow-sm">5. Full Detail 🏎️</span>
            </div>
          </div>
        `;
      } else if (
        rawText.includes('Connect directly with our senior detailing specialist') ||
        rawText.includes('Chat on WhatsApp')
      ) {
        buttonPreviewHtml = `
          <div class="mt-2.5 pt-2 border-t border-pink-500/30">
            <span class="text-[9px] text-emerald-300 font-semibold block mb-1">Interactive Link Buttons Delivered:</span>
            <div class="flex flex-wrap gap-1.5">
              <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-emerald-700/90 text-white shadow-sm border border-emerald-500/70">💬 Chat on WhatsApp</span>
              <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-zinc-800 text-zinc-200 shadow-sm border border-zinc-700">🚗 View Services</span>
            </div>
          </div>
        `;
      }

      if (isCustomer) {
        const buttonBadge = isButtonTap
          ? '<span class="px-1.5 py-0.2 rounded bg-pink-950 text-pink-300 border border-pink-700/60 text-[9px] font-semibold ml-1.5 inline-flex items-center">🖲️ Button Click</span>'
          : '';
        return `
          <div class="flex flex-col items-start max-w-[85%] sm:max-w-[70%] animate-fade-in">
            <div class="px-4 py-2.5 rounded-2xl rounded-tl-xs bg-zinc-900/95 text-zinc-100 text-xs sm:text-sm border border-pink-900/40 shadow-md leading-relaxed whitespace-pre-wrap select-text">
              <div class="flex items-center space-x-1.5 text-[10px] text-pink-400 font-bold mb-1">
                <i data-lucide="instagram" class="w-3 h-3"></i>
                <span>Customer DM</span>
                ${buttonBadge}
              </div>
              ${escapeHtml(rawText)}
            </div>
            <span class="text-[10px] text-zinc-500 font-medium mt-1 ml-1.5">${escapeHtml(timeStr)}</span>
          </div>
        `;
      } else if (isBot) {
        return `
          <div class="flex flex-col items-end self-end max-w-[85%] sm:max-w-[70%] animate-fade-in">
            <div class="px-4 py-2.5 rounded-2xl rounded-tr-xs bg-indigo-950/40 text-zinc-200 text-xs sm:text-sm border border-indigo-500/30 shadow-md leading-relaxed whitespace-pre-wrap select-text">
              <div class="flex items-center space-x-1.5 text-[10px] text-indigo-400 font-bold mb-1">
                <i data-lucide="bot" class="w-3 h-3"></i>
                <span>Automated Assistant</span>
              </div>
              ${escapeHtml(rawText)}
              ${buttonPreviewHtml}
            </div>
            <span class="text-[10px] text-zinc-500 font-medium mt-1 mr-1.5">${escapeHtml(timeStr)}</span>
          </div>
        `;
      } else {
        // Staff reply
        return `
          <div class="flex flex-col items-end self-end max-w-[85%] sm:max-w-[70%] animate-fade-in">
            <div class="px-4 py-2.5 rounded-2xl rounded-tr-xs bubble-ig-outbound text-white text-xs sm:text-sm shadow-lg leading-relaxed whitespace-pre-wrap select-text">
              <div class="flex items-center space-x-1.5 text-[10px] text-pink-100 font-bold mb-1">
                <i data-lucide="user-check" class="w-3 h-3"></i>
                <span>You (Staff)</span>
              </div>
              ${escapeHtml(rawText)}
              ${buttonPreviewHtml}
            </div>
            <span class="text-[10px] text-zinc-500 font-medium mt-1 mr-1.5">${escapeHtml(timeStr)}</span>
          </div>
        `;
      }
    })
    .join('');

  lucide.createIcons();
  elements.instagramMessagesContainer.scrollTop = elements.instagramMessagesContainer.scrollHeight;
}

/**
 * Handle sending manual outbound reply from Instagram composer
 */
async function handleInstagramSend(e) {
  e.preventDefault();
  if (!state.instagramInbox.activeSenderId || !elements.instagramInputMessage) return;

  const text = elements.instagramInputMessage.value.trim();
  if (!text) return;

  const senderId = state.instagramInbox.activeSenderId;
  const customerName = state.instagramInbox.activeCustomerName;

  // Optimistic UI update
  const tempMessage = {
    phone: `ig_${senderId}`,
    customer_name: customerName,
    direction: 'outbound',
    sender: 'agent',
    message_text: text,
    created_at: new Date().toISOString(),
  };

  state.instagramInbox.messages.push(tempMessage);
  renderInstagramMessageThread();
  updateInstagramBotStatusUI(true); // Automatically switch to Human mode

  elements.instagramInputMessage.value = '';
  if (elements.btnInstagramSend) elements.btnInstagramSend.disabled = true;

  try {
    const res = await fetch('/api/inbox/instagram/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderId,
        customerName,
        message: text,
      }),
    });

    if (res.status === 401) {
      window.location.href = '/login';
      return;
    }

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to dispatch Instagram message');

    showToast('Instagram DM dispatched successfully!', 'success');
    fetchInstagramConversations();
  } catch (err) {
    console.error('[Send Instagram Message Error]', err);
    // Remove optimistic message if dispatch failed
    const idx = state.instagramInbox.messages.indexOf(tempMessage);
    if (idx !== -1) {
      state.instagramInbox.messages.splice(idx, 1);
      renderInstagramMessageThread();
    }
    // Restore message text to input field
    elements.instagramInputMessage.value = text;
    showToast(err.message, 'error');
  } finally {
    if (elements.btnInstagramSend) elements.btnInstagramSend.disabled = false;
  }
}

/**
 * Mobile back button in Instagram chat header
 */
function handleInstagramBack() {
  if (elements.instagramSidebar) elements.instagramSidebar.classList.remove('hidden');
  if (elements.instagramChatPane) elements.instagramChatPane.classList.add('hidden');
}

/**
 * Helper to jump directly from Lead Table or Kanban into Instagram Inbox
 */
function openInstagramChat(senderId, customerName) {
  switchView('instagram');
  loadInstagramChatThread(senderId, customerName);
}

/**
 * Fetch Instagram Webhook & account health status
 */
async function fetchInstagramWebhookStatus() {
  try {
    const res = await fetch('/api/inbox/instagram/status');
    if (res.status === 401) return;

    const json = await res.json();
    if (!res.ok) return;

    const { tokenConfigured, tokenPrefix, latestEvent } = json.data || {};

    if (elements.igWebhookBadge) {
      elements.igWebhookBadge.innerHTML = tokenConfigured
        ? '<span class="text-emerald-400 font-bold">🟢 Listening</span>'
        : '<span class="text-amber-400 font-bold">⚠️ Token Missing</span>';
    }

    if (elements.igDiagnosticLastEvent) {
      if (latestEvent) {
        elements.igDiagnosticLastEvent.textContent = `${formatTimeAgo(latestEvent.timestamp)} (${latestEvent.senderId || 'user'}): "${latestEvent.message || ''}"`;
      } else {
        elements.igDiagnosticLastEvent.textContent = 'No events received yet';
      }
    }

    // Update Diagnostics Modal fields
    if (elements.igDiagTokenStatus) {
      elements.igDiagTokenStatus.innerHTML = tokenConfigured
        ? '<span class="w-2 h-2 rounded-full bg-emerald-400 mr-1.5"></span> Configured & Active'
        : '<span class="w-2 h-2 rounded-full bg-red-400 mr-1.5"></span> Token Unset';
    }
    if (elements.igDiagTokenPrefix) {
      elements.igDiagTokenPrefix.textContent = tokenPrefix || 'None';
    }
    if (elements.igDiagEventTime) {
      elements.igDiagEventTime.textContent = latestEvent?.timestamp ? new Date(latestEvent.timestamp).toLocaleString() : 'None';
    }
    if (elements.igRawEventJson) {
      elements.igRawEventJson.textContent = latestEvent
        ? JSON.stringify(latestEvent, null, 2)
        : '// Awaiting first webhook event from Meta...\n// Tip: Click "Simulate Test DM Now" to test live reception!';
    }
  } catch (err) {
    console.warn('[Fetch IG Status Error]', err);
  }
}

/**
 * Simulate an incoming Instagram DM to test live reception
 */
async function triggerInstagramTestPing() {
  showToast('Simulating incoming Instagram DM...', 'info');

  try {
    const sampleMessages = [
      'Hi! What is the price for full body PPF on BMW 3 Series?',
      'Hello, do you have ceramic coating slots available this weekend?',
      'Hey Signature Detailing! Looking for interior deep cleaning and exterior polish.',
      'Hi, where is your workshop located in town?',
    ];
    const randomMsg = sampleMessages[Math.floor(Math.random() * sampleMessages.length)];

    const res = await fetch('/api/inbox/instagram/test-ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderId: 'arc____hit_simulated',
        message: randomMsg,
      }),
    });

    if (res.status === 401) {
      window.location.href = '/login';
      return;
    }

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Simulation failed');

    showToast('Simulated Instagram DM received! Conversation created & bot replied.', 'success');

    // Switch view to instagram and auto-load the simulated thread
    switchView('instagram');
    await fetchInstagramConversations();
    loadInstagramChatThread('arc____hit_simulated', 'Instagram User (simulated)');
    fetchInstagramWebhookStatus();
  } catch (err) {
    console.error('[Test Ping Error]', err);
    showToast(err.message, 'error');
  }
}

/**
 * Sync conversations directly from Meta Instagram Graph API
 */
async function syncInstagramFromMeta() {
  showToast('Querying Meta Graph API for active conversations...', 'info');
  if (elements.btnIgSync) elements.btnIgSync.disabled = true;

  try {
    const res = await fetch('/api/inbox/instagram/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (res.status === 401) {
      window.location.href = '/login';
      return;
    }

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Meta sync failed');

    const { count, notice } = json.data || {};
    if (count > 0) {
      showToast(`Synced ${count} conversation(s) from Meta!`, 'success');
      await fetchInstagramConversations();
    } else {
      showToast(notice || 'Meta returned 0 conversations.', 'warning');
    }
  } catch (err) {
    console.error('[Sync Meta Error]', err);
    showToast(err.message, 'error');
  } finally {
    if (elements.btnIgSync) elements.btnIgSync.disabled = false;
  }
}

// Expose openInstagramChat, loadInstagramChatThread, triggerInstagramTestPing, and syncInstagramFromMeta globally
window.openInstagramChat = openInstagramChat;
window.loadInstagramChatThread = loadInstagramChatThread;
window.triggerInstagramTestPing = triggerInstagramTestPing;
window.syncInstagramFromMeta = syncInstagramFromMeta;

/**
 * Send 5 Interactive Service Quick Reply Buttons to customer on Instagram
 */
async function handleSendServiceButtons() {
  if (!state.instagramInbox.activeSenderId) {
    showToast('Please select an Instagram conversation first', 'warning');
    return;
  }

  const senderId = state.instagramInbox.activeSenderId;
  const customerName = state.instagramInbox.activeCustomerName;
  const promptText = 'Which service are you interested in?\n\nTap an option below:';

  const quickReplies = [
    { content_type: 'text', title: '1. PPF 🛡️', payload: '1' },
    { content_type: 'text', title: '2. Ceramic ✨', payload: '2' },
    { content_type: 'text', title: '3. Correction 🚘', payload: '3' },
    { content_type: 'text', title: '4. Interior 🧼', payload: '4' },
    { content_type: 'text', title: '5. Full Detail 🏎️', payload: '5' },
  ];

  await dispatchInstagramButtonMessage(senderId, customerName, promptText, { quick_replies: quickReplies });
}

/**
 * Send Clickable WhatsApp & Portfolio Link Button Template to customer on Instagram
 */
async function handleSendWhatsappButton() {
  if (!state.instagramInbox.activeSenderId) {
    showToast('Please select an Instagram conversation first', 'warning');
    return;
  }

  const senderId = state.instagramInbox.activeSenderId;
  const customerName = state.instagramInbox.activeCustomerName;
  const promptText = 'Connect directly with our senior detailing specialist:';

  const buttons = [
    {
      type: 'web_url',
      url: 'https://wa.me/919876543210?text=Hi%20Signature%20Detailing,%20I%20am%20inquiring%20from%20Instagram',
      title: 'Chat on WhatsApp 💬',
    },
    {
      type: 'postback',
      title: 'View Services 🚗',
      payload: 'menu',
    },
  ];

  await dispatchInstagramButtonMessage(senderId, customerName, promptText, { buttons });
}

/**
 * Helper to dispatch button message payload to backend
 */
async function dispatchInstagramButtonMessage(senderId, customerName, text, options = {}) {
  showToast('Sending interactive button message...', 'info');

  const tempMessage = {
    phone: `ig_${senderId}`,
    customer_name: customerName,
    direction: 'outbound',
    sender: 'agent',
    message_text: text,
    created_at: new Date().toISOString(),
  };

  state.instagramInbox.messages.push(tempMessage);
  renderInstagramMessageThread();
  updateInstagramBotStatusUI(true);

  try {
    const res = await fetch('/api/inbox/instagram/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderId,
        customerName,
        message: text,
        quick_replies: options.quick_replies,
        buttons: options.buttons,
      }),
    });

    if (res.status === 401) {
      window.location.href = '/login';
      return;
    }

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to dispatch button message');

    showToast('Instagram buttons dispatched successfully!', 'success');
    fetchInstagramConversations();
  } catch (err) {
    console.error('[Send Button Message Error]', err);
    const idx = state.instagramInbox.messages.indexOf(tempMessage);
    if (idx !== -1) {
      state.instagramInbox.messages.splice(idx, 1);
      renderInstagramMessageThread();
    }
    showToast(err.message, 'error');
  }
}

/**
 * Re-apply or sync Ice Breaker prompt buttons to Meta profile
 */
async function handleSyncIceBreakers() {
  showToast('Re-applying 4 Ice Breaker buttons to @creationindia_ profile...', 'info');

  try {
    const res = await fetch('/api/inbox/instagram/icebreakers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    if (res.status === 401) {
      window.location.href = '/login';
      return;
    }

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to update ice breakers on Meta');

    showToast('4 Ice Breaker buttons confirmed active on Instagram!', 'success');
  } catch (err) {
    console.error('[Sync Ice Breakers Error]', err);
    showToast(err.message, 'error');
  }
}

window.handleSendServiceButtons = handleSendServiceButtons;
window.handleSendWhatsappButton = handleSendWhatsappButton;
window.handleSyncIceBreakers = handleSyncIceBreakers;

/**
 * Switch between Instagram DMs and Post & Reel Comments sub-tabs
 */
function switchInstagramSubTab(tab) {
  state.instagramComments.activeTab = tab;

  if (tab === 'dms') {
    if (elements.instagramDmsView) {
      elements.instagramDmsView.classList.remove('hidden');
      elements.instagramDmsView.classList.add('flex');
    }
    if (elements.instagramCommentsView) {
      elements.instagramCommentsView.classList.add('hidden');
      elements.instagramCommentsView.classList.remove('flex');
    }
    if (elements.tabIgDms) {
      elements.tabIgDms.className = 'px-3.5 py-1.5 rounded-md text-xs font-bold transition bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-sm flex items-center space-x-1.5 active:scale-95';
    }
    if (elements.tabIgComments) {
      elements.tabIgComments.className = 'px-3.5 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-white transition flex items-center space-x-1.5 active:scale-95 bg-transparent';
    }
  } else if (tab === 'comments') {
    if (elements.instagramDmsView) {
      elements.instagramDmsView.classList.add('hidden');
      elements.instagramDmsView.classList.remove('flex');
    }
    if (elements.instagramCommentsView) {
      elements.instagramCommentsView.classList.remove('hidden');
      elements.instagramCommentsView.classList.add('flex');
    }
    if (elements.tabIgComments) {
      elements.tabIgComments.className = 'px-3.5 py-1.5 rounded-md text-xs font-bold transition bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-sm flex items-center space-x-1.5 active:scale-95';
    }
    if (elements.tabIgDms) {
      elements.tabIgDms.className = 'px-3.5 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-white transition flex items-center space-x-1.5 active:scale-95 bg-transparent';
    }
    fetchInstagramComments();
  }
}

/**
 * Fetch latest Instagram post comments and auto-reply delivery status
 */
async function fetchInstagramComments() {
  state.instagramComments.loading = true;

  try {
    const res = await fetch('/api/inbox/instagram/comments');
    if (res.status === 401) {
      window.location.href = '/login';
      return;
    }

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to load Instagram comments');

    state.instagramComments.list = json.data?.comments || [];
    if (elements.igCommentsTabCount) {
      elements.igCommentsTabCount.textContent = state.instagramComments.list.length;
    }

    renderInstagramCommentsList();
  } catch (err) {
    console.error('[Instagram Comments Fetch Error]', err);
    showToast(err.message, 'error');
  } finally {
    state.instagramComments.loading = false;
  }
}

/**
 * Render the live stream of Instagram post comments and auto-replies
 */
function renderInstagramCommentsList() {
  if (!elements.instagramCommentsStream) return;

  const comments = state.instagramComments.list;
  if (!comments || comments.length === 0) {
    elements.instagramCommentsStream.innerHTML = `
      <div class="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6 text-zinc-500">
        <div class="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center mb-3">
          <i data-lucide="message-circle" class="w-6 h-6"></i>
        </div>
        <p class="text-sm font-bold text-zinc-200">No Post Comments Recorded Yet</p>
        <p class="text-xs text-zinc-500 mt-1 max-w-[320px]">
          When customers comment on your Instagram posts or reels, the comments appear here with automated public replies and private DM quick-replies.
        </p>
        <button onclick="triggerInstagramCommentTestPing()" class="mt-4 inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 text-white text-xs font-bold shadow-lg shadow-pink-600/20 transition active:scale-95">
          <i data-lucide="zap" class="w-3.5 h-3.5 text-yellow-300"></i>
          <span>Simulate Test Post Comment</span>
        </button>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  elements.instagramCommentsStream.innerHTML = comments
    .map((c) => {
      const initials = (c.fromUsername || 'User')
        .slice(0, 2)
        .toUpperCase();

      const publicBadge = c.publicReplied
        ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
             <i data-lucide="check-circle" class="w-3 h-3 mr-1"></i> Public Auto-Replied
           </span>`
        : `<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-950/80 text-amber-300 border border-amber-800/80">
             <i data-lucide="alert-circle" class="w-3 h-3 mr-1"></i> Public Reply Pending/Failed
           </span>`;

      const privateBadge = c.privateReplied
        ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-pink-950/80 text-pink-300 border border-pink-800/80">
             <i data-lucide="send" class="w-3 h-3 mr-1"></i> Private DM Sent w/ Quick Buttons
           </span>`
        : `<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-950/80 text-amber-300 border border-amber-800/80">
             <i data-lucide="alert-circle" class="w-3 h-3 mr-1"></i> Private DM Pending/Failed
           </span>`;

      const publicReplyQuote = c.publicReplyText
        ? `
          <div class="mt-2 text-xs bg-zinc-900/90 border border-zinc-800 p-2.5 rounded-lg text-zinc-300 flex items-start space-x-2">
            <i data-lucide="corner-down-right" class="w-3.5 h-3.5 text-pink-400 mt-0.5 shrink-0"></i>
            <div>
              <span class="font-semibold text-pink-400">@creationindia_ public reply:</span>
              <p class="mt-0.5 text-zinc-200">${escapeHtml(c.publicReplyText)}</p>
            </div>
          </div>
        `
        : '';

      return `
        <div class="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700/80 transition space-y-3 shadow-sm">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center space-x-2.5">
              <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-600 to-amber-500 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                ${escapeHtml(initials)}
              </div>
              <div>
                <span class="text-xs font-bold text-white">@${escapeHtml(c.fromUsername || 'user')}</span>
                <span class="text-[11px] text-zinc-500 ml-2">on Post #${escapeHtml(String(c.mediaId || '').slice(-8) || 'post')}</span>
              </div>
            </div>
            <span class="text-[11px] text-zinc-500 font-medium">${formatTimeAgo(c.createdAt)}</span>
          </div>

          <!-- Customer Comment Text -->
          <div class="p-3 rounded-lg bg-zinc-950 border border-zinc-800/90 text-sm text-zinc-200">
            "${escapeHtml(c.text || '')}"
          </div>

          <!-- Delivery Status Badges -->
          <div class="flex items-center space-x-2 flex-wrap gap-y-1">
            ${publicBadge}
            ${privateBadge}
          </div>

          <!-- Public Reply Quoted Text -->
          ${publicReplyQuote}

          <!-- Inline Staff Reply Form -->
          <form onsubmit="handleSendManualCommentReply(event, '${escapeHtml(c.id)}')" class="mt-2.5 pt-2.5 border-t border-zinc-800/60 flex items-center space-x-2">
            <input 
              type="text" 
              placeholder="Post an additional public reply to @${escapeHtml(c.fromUsername || 'user')}..."
              class="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500 transition"
              required
            />
            <button 
              type="submit" 
              class="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold flex items-center space-x-1 transition active:scale-95"
            >
              <i data-lucide="send" class="w-3 h-3 text-pink-400"></i>
              <span>Reply</span>
            </button>
          </form>
        </div>
      `;
    })
    .join('');

  lucide.createIcons();
}

/**
 * Handle manual staff reply to an Instagram post comment
 */
async function handleSendManualCommentReply(event, commentId) {
  event.preventDefault();
  const form = event.target;
  const input = form.querySelector('input');
  const message = (input?.value || '').trim();

  if (!message) return;

  try {
    const res = await fetch('/api/inbox/instagram/comments/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId, message }),
    });

    if (res.status === 401) {
      window.location.href = '/login';
      return;
    }

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to post reply to comment');

    showToast('Reply published successfully to Instagram comment!', 'success');
    input.value = '';
    fetchInstagramComments();
  } catch (err) {
    console.error('[Manual Comment Reply Error]', err);
    showToast(err.message, 'error');
  }
}

/**
 * 1-Click Simulation of a customer commenting on an Instagram Post
 */
async function triggerInstagramCommentTestPing() {
  showToast('Simulating customer comment on post...', 'info');

  try {
    const res = await fetch('/api/inbox/instagram/comments/test-ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'car_enthusiast_delhi',
        text: 'What is the price of Ceramic Coating on BMW 3 series? Do you have slots this weekend?',
      }),
    });

    if (res.status === 401) {
      window.location.href = '/login';
      return;
    }

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Simulation failed');

    showToast('Customer comment simulated! Public reply & DM dispatched.', 'success');
    
    // Switch to comments sub-tab to view the new comment
    switchInstagramSubTab('comments');
    fetchInstagramComments();
    fetchInstagramConversations();
  } catch (err) {
    console.error('[Comment Test Ping Error]', err);
    showToast(err.message, 'error');
  }
}

window.switchInstagramSubTab = switchInstagramSubTab;
window.fetchInstagramComments = fetchInstagramComments;
window.handleSendManualCommentReply = handleSendManualCommentReply;
window.triggerInstagramCommentTestPing = triggerInstagramCommentTestPing;



