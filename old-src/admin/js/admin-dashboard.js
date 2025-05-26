/**
 * 管理画面ダッシュボードの機能
 */
class AdminDashboard {
  constructor() {
    this.auth = new AdminAuth();
    this.adminManager = new AdminManager();
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.currentFilter = '';
    this.searchQuery = '';
    
    this.init();
  }

  /**
   * 初期化
   */
  async init() {
    // 認証チェック
    if (!this.auth.requireAuth()) {
      return;
    }

    // 自動ログアウト設定
    this.auth.setupAutoLogout();

    try {
      // 記事データを読み込み
      await this.adminManager.loadArticles();
      
      // UI初期化
      this.setupEventListeners();
      this.renderDashboard();
      this.renderStats();
      this.renderArticleList();
      
      console.log('管理画面を初期化しました');
    } catch (error) {
      console.error('初期化エラー:', error);
      this.showError('管理画面の初期化に失敗しました');
    }
  }

  /**
   * イベントリスナーを設定
   */
  setupEventListeners() {
    // ログアウトボタン
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (confirm('ログアウトしますか？')) {
          this.auth.logout();
        }
      });
    }

    // 新規記事作成ボタン
    const newArticleBtn = document.getElementById('newArticleBtn');
    if (newArticleBtn) {
      newArticleBtn.addEventListener('click', () => {
        window.location.href = 'editor.html';
      });
    }

    // 検索フォーム
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.currentPage = 1;
        this.renderArticleList();
      });
    }

    // カテゴリーフィルター
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
      categoryFilter.addEventListener('change', (e) => {
        this.currentFilter = e.target.value;
        this.currentPage = 1;
        this.renderArticleList();
      });
    }

    // ステータスフィルター
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.statusFilter = e.target.value;
        this.currentPage = 1;
        this.renderArticleList();
      });
    }

    // 一括操作
    const bulkActions = document.getElementById('bulkActions');
    if (bulkActions) {
      bulkActions.addEventListener('change', (e) => {
        if (e.target.value) {
          this.handleBulkAction(e.target.value);
          e.target.value = '';
        }
      });
    }

    // データエクスポート
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.adminManager.exportData();
      });
    }

    // データインポート
    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile');
    if (importBtn && importFile) {
      importBtn.addEventListener('click', () => {
        importFile.click();
      });
      
      importFile.addEventListener('change', async (e) => {
        if (e.target.files[0]) {
          await this.handleImport(e.target.files[0]);
        }
      });
    }

    // 統計更新ボタン
    const refreshStatsBtn = document.getElementById('refreshStatsBtn');
    if (refreshStatsBtn) {
      refreshStatsBtn.addEventListener('click', () => {
        this.renderStats();
      });
    }

    // デバッグボタン（開発時のみ）
    const debugBtn = document.getElementById('debugBtn');
    if (debugBtn) {
      debugBtn.addEventListener('click', () => {
        this.debugInfo();
      });
    }
  }

  /**
   * ダッシュボード情報を表示
   */
  renderDashboard() {
    const sessionInfo = this.auth.getSessionInfo();
    if (sessionInfo) {
      const loginTimeElement = document.getElementById('loginTime');
      if (loginTimeElement) {
        loginTimeElement.textContent = sessionInfo.loginTime.toLocaleString('ja-JP');
      }
    }
  }

  /**
   * 統計情報を表示
   */
  renderStats() {
    const stats = this.adminManager.getStats();
    
    // 総記事数
    const totalElement = document.getElementById('totalArticles');
    if (totalElement) {
      totalElement.textContent = stats.total;
    }

    // 公開記事数
    const publishedElement = document.getElementById('publishedArticles');
    if (publishedElement) {
      publishedElement.textContent = stats.published;
    }

    // 下書き記事数
    const draftElement = document.getElementById('draftArticles');
    if (draftElement) {
      draftElement.textContent = stats.draft;
    }

    // 今月の記事数
    const thisMonthElement = document.getElementById('thisMonthArticles');
    if (thisMonthElement) {
      thisMonthElement.textContent = stats.thisMonth;
    }

    // カテゴリー別統計
    this.renderCategoryStats(stats.categories);
  }

  /**
   * カテゴリー別統計を表示
   */
  renderCategoryStats(categories) {
    const container = document.getElementById('categoryStats');
    if (!container) return;

    const categoryNames = {
      announcement: 'お知らせ',
      trial: '体験会',
      media: 'メディア',
      important: '重要'
    };

    const html = Object.entries(categories).map(([key, count]) => `
      <div class="stat-item">
        <span class="stat-label">${categoryNames[key]}</span>
        <span class="stat-value">${count}</span>
      </div>
    `).join('');

    container.innerHTML = html;
  }

  /**
   * 記事一覧を表示
   */
  renderArticleList() {
    let articles = [...this.adminManager.articles];

    // 検索フィルター
    if (this.searchQuery) {
      articles = this.adminManager.searchArticles(this.searchQuery);
    }

    // カテゴリーフィルター
    if (this.currentFilter) {
      articles = articles.filter(article => article.category === this.currentFilter);
    }

    // ステータスフィルター
    if (this.statusFilter) {
      articles = articles.filter(article => article.status === this.statusFilter);
    }

    // ページネーション
    const totalPages = Math.ceil(articles.length / this.itemsPerPage);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const paginatedArticles = articles.slice(startIndex, endIndex);

    // 記事一覧を表示
    this.renderArticleTable(paginatedArticles);
    
    // ページネーションを表示
    this.renderPagination(totalPages);

    // 結果数を表示
    this.updateResultCount(articles.length);
  }

  /**
   * 記事テーブルを表示
   */
  renderArticleTable(articles) {
    const tbody = document.getElementById('articleTableBody');
    if (!tbody) return;

    if (articles.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="no-articles">
            記事が見つかりませんでした
          </td>
        </tr>
      `;
      return;
    }

    const html = articles.map(article => `
      <tr data-id="${article.id}">
        <td>
          <input type="checkbox" class="article-checkbox" value="${article.id}">
        </td>
        <td>
          <div class="article-title">
            <a href="editor.html?id=${article.id}" class="title-link">
              ${this.escapeHtml(article.title)}
            </a>
            <div class="article-actions">
              <button class="btn-small" onclick="adminDashboard.editArticle(${article.id})">編集</button>
              <button class="btn-small" onclick="adminDashboard.duplicateArticle(${article.id})">複製</button>
              <button class="btn-small btn-danger" onclick="adminDashboard.deleteArticle(${article.id})">削除</button>
            </div>
          </div>
        </td>
        <td>
          <span class="category-badge" style="background-color: ${this.adminManager.getCategoryColor(article.category)}">
            ${article.categoryName}
          </span>
        </td>
        <td>${this.adminManager.formatDate(article.date)}</td>
        <td>
          <span class="status-badge status-${article.status}">
            ${article.status === 'published' ? '公開' : '下書き'}
          </span>
        </td>
        <td>
          <button class="btn-small" onclick="adminDashboard.toggleStatus(${article.id})">
            ${article.status === 'published' ? '下書きに戻す' : '公開する'}
          </button>
        </td>
        <td>
          <button class="btn-small" onclick="adminDashboard.previewArticle(${article.id})">プレビュー</button>
        </td>
      </tr>
    `).join('');

    tbody.innerHTML = html;
  }

  /**
   * ページネーションを表示
   */
  renderPagination(totalPages) {
    const container = document.getElementById('pagination');
    if (!container) return;

    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    let html = '';

    // 前のページ
    if (this.currentPage > 1) {
      html += `<button class="page-btn" onclick="adminDashboard.goToPage(${this.currentPage - 1})">前へ</button>`;
    }

    // ページ番号
    for (let i = 1; i <= totalPages; i++) {
      if (i === this.currentPage) {
        html += `<button class="page-btn active">${i}</button>`;
      } else {
        html += `<button class="page-btn" onclick="adminDashboard.goToPage(${i})">${i}</button>`;
      }
    }

    // 次のページ
    if (this.currentPage < totalPages) {
      html += `<button class="page-btn" onclick="adminDashboard.goToPage(${this.currentPage + 1})">次へ</button>`;
    }

    container.innerHTML = html;
  }

  /**
   * 結果数を更新
   */
  updateResultCount(count) {
    const element = document.getElementById('resultCount');
    if (element) {
      element.textContent = `${count}件の記事`;
    }
  }

  /**
   * ページ移動
   */
  goToPage(page) {
    this.currentPage = page;
    this.renderArticleList();
  }

  /**
   * 記事編集
   */
  editArticle(id) {
    window.location.href = `editor.html?id=${id}`;
  }

  /**
   * 記事複製
   */
  async duplicateArticle(id) {
    try {
      if (confirm('この記事を複製しますか？')) {
        await this.adminManager.duplicateArticle(id);
        this.showSuccess('記事を複製しました');
        this.renderArticleList();
        this.renderStats();
      }
    } catch (error) {
      console.error('複製エラー:', error);
      this.showError('記事の複製に失敗しました');
    }
  }

  /**
   * 記事削除
   */
  async deleteArticle(id) {
    try {
      const article = this.adminManager.getArticleById(id);
      if (confirm(`「${article.title}」を削除しますか？この操作は取り消せません。`)) {
        await this.adminManager.deleteArticle(id);
        this.showSuccess('記事を削除しました');
        this.renderArticleList();
        this.renderStats();
      }
    } catch (error) {
      console.error('削除エラー:', error);
      this.showError('記事の削除に失敗しました');
    }
  }

  /**
   * ステータス切り替え
   */
  async toggleStatus(id) {
    try {
      const article = await this.adminManager.toggleArticleStatus(id);
      this.showSuccess(`記事を${article.status === 'published' ? '公開' : '下書きに戻し'}ました`);
      this.renderArticleList();
      this.renderStats();
    } catch (error) {
      console.error('ステータス切り替えエラー:', error);
      this.showError('ステータスの切り替えに失敗しました');
    }
  }

  /**
   * 記事プレビュー
   */
  previewArticle(id) {
    window.open(`../news-detail.html?id=${id}`, '_blank');
  }

  /**
   * 一括操作
   */
  async handleBulkAction(action) {
    const checkboxes = document.querySelectorAll('.article-checkbox:checked');
    const selectedIds = Array.from(checkboxes).map(cb => parseInt(cb.value));

    if (selectedIds.length === 0) {
      this.showError('記事を選択してください');
      return;
    }

    try {
      switch (action) {
        case 'publish':
          if (confirm(`選択した${selectedIds.length}件の記事を公開しますか？`)) {
            for (const id of selectedIds) {
              const article = this.adminManager.getArticleById(id);
              if (article.status === 'draft') {
                await this.adminManager.toggleArticleStatus(id);
              }
            }
            this.showSuccess('選択した記事を公開しました');
          }
          break;

        case 'draft':
          if (confirm(`選択した${selectedIds.length}件の記事を下書きに戻しますか？`)) {
            for (const id of selectedIds) {
              const article = this.adminManager.getArticleById(id);
              if (article.status === 'published') {
                await this.adminManager.toggleArticleStatus(id);
              }
            }
            this.showSuccess('選択した記事を下書きに戻しました');
          }
          break;

        case 'delete':
          if (confirm(`選択した${selectedIds.length}件の記事を削除しますか？この操作は取り消せません。`)) {
            for (const id of selectedIds) {
              await this.adminManager.deleteArticle(id);
            }
            this.showSuccess('選択した記事を削除しました');
          }
          break;
      }

      this.renderArticleList();
      this.renderStats();
    } catch (error) {
      console.error('一括操作エラー:', error);
      this.showError('一括操作に失敗しました');
    }
  }

  /**
   * データインポート
   */
  async handleImport(file) {
    try {
      if (confirm('データをインポートしますか？既存のデータは上書きされます。')) {
        await this.adminManager.importData(file);
        this.showSuccess('データをインポートしました');
        this.renderArticleList();
        this.renderStats();
      }
    } catch (error) {
      console.error('インポートエラー:', error);
      this.showError('データのインポートに失敗しました');
    }
  }

  /**
   * 成功メッセージを表示
   */
  showSuccess(message) {
    this.showMessage(message, 'success');
  }

  /**
   * エラーメッセージを表示
   */
  showError(message) {
    this.showMessage(message, 'error');
  }

  /**
   * メッセージを表示
   */
  showMessage(message, type) {
    const container = document.getElementById('messageContainer');
    if (!container) return;

    const messageElement = document.createElement('div');
    messageElement.className = `message message-${type}`;
    messageElement.textContent = message;

    container.appendChild(messageElement);

    // 3秒後に自動削除
    setTimeout(() => {
      if (messageElement.parentNode) {
        messageElement.parentNode.removeChild(messageElement);
      }
    }, 3000);
  }

  /**
   * HTMLエスケープ
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * デバッグ情報を出力
   */
  debugInfo() {
    console.log('=== AdminDashboard デバッグ情報 ===');
    console.log('現在のページ:', this.currentPage);
    console.log('フィルター:', this.currentFilter);
    console.log('検索クエリ:', this.searchQuery);
    console.log('ステータスフィルター:', this.statusFilter);
    
    if (this.adminManager && this.adminManager.debugInfo) {
      this.adminManager.debugInfo();
    }
    
    console.log('================================');
  }
}

// グローバルインスタンス
let adminDashboard;

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', () => {
  adminDashboard = new AdminDashboard();
}); 