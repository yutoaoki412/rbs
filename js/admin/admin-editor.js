/**
 * 記事エディターの機能
 */
class AdminEditor {
  constructor() {
    this.auth = new AdminAuth();
    this.adminManager = new AdminManager(); // Assumes AdminManager is correctly refactored
    this.markdownParser = new MarkdownParser();
    this.currentArticleId = null;
    this.isEditing = false;
    this.autoSaveInterval = null;
    this.hasUnsavedChanges = false;
    
    this.init();
  }

  /**
   * 初期化
   */
  async init() {
    if (!this.auth.requireAuth()) { // Redirects if not authenticated
      return;
    }
    this.auth.setupAutoLogout();

    try {
      const urlParams = new URLSearchParams(window.location.search);
      this.currentArticleId = urlParams.get('id');
      
      const pageTitleEl = document.getElementById('pageTitle') || document.querySelector('.breadcrumb'); 

      if (this.currentArticleId) {
        this.isEditing = true;
        if (pageTitleEl) pageTitleEl.textContent = '記事を読み込み中...';
        await this.loadArticle(this.currentArticleId);
      } else {
        if (pageTitleEl) pageTitleEl.textContent = '新規記事作成';
        this.setupNewArticle(); 
        this.updateEditorStatusDisplay('draft'); 
        this.updateEditorSaveStatus('unsaved'); 
      }
      
      this.setupEventListeners();
      this.setupAutoSave();
      this.updatePreview(); 
      
      console.log('エディターを初期化しました');
    } catch (error) {
      console.error('初期化エラー:', error);
      this.showError('エディターの初期化に失敗しました');
      this.updateEditorSaveStatus('error');
    }
  }

  /**
   * イベントリスナーを設定
   */
  setupEventListeners() {
    const backBtn = document.getElementById('backBtn'); 
    if (backBtn) {
      backBtn.addEventListener('click', (e) => {
        e.preventDefault(); 
        if (this.hasUnsavedChanges) {
          if (confirm('保存されていない変更があります。戻りますか？')) {
            window.location.href = 'index.html';
          }
        } else {
          window.location.href = 'index.html';
        }
      });
    }

    const saveDraftBtn = document.getElementById('saveDraftBtn'); 
    if (saveDraftBtn) {
      saveDraftBtn.addEventListener('click', () => this.saveArticle('draft'));
    }

    const publishBtn = document.getElementById('publishBtn'); 
    if (publishBtn) {
      publishBtn.addEventListener('click', () => this.saveArticle('published'));
    }
    
    const formElementIDs = ['article-title', 'article-date', 'article-category', 'article-excerpt', 'markdown-editor', 'article-featured'];
    formElementIDs.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        const eventType = (element.tagName.toLowerCase() === 'select' || element.type === 'checkbox') ? 'change' : 'input';
        element.addEventListener(eventType, () => {
          this.hasUnsavedChanges = true;
          this.updateSaveButtonState();
          this.updateEditorSaveStatus('unsaved'); 
          if (id === 'markdown-editor') {
            this.updatePreview();
          }
        });
      }
    });

    const categorySelect = document.getElementById('article-category');
    if (categorySelect) {
      categorySelect.addEventListener('change', () => {
        this.hasUnsavedChanges = true; 
        this.updateSaveButtonState();
        this.updateEditorSaveStatus('unsaved');
      });
    }

    window.addEventListener('beforeunload', (e) => {
      if (this.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        this.saveArticle('draft'); // Ctrl+S saves as draft
      }
    });
  }

  /**
   * 新規記事の設定 (uses editor.html IDs)
   */
  setupNewArticle() {
    (document.getElementById('article-title')).value = '';
    (document.getElementById('article-date')).value = new Date().toISOString().split('T')[0];
    (document.getElementById('article-category')).value = 'announcement';
    (document.getElementById('article-excerpt')).value = '';
    (document.getElementById('markdown-editor')).value = '';
    (document.getElementById('article-featured')).checked = false;
    // Initial status for a new article
    this.updateEditorStatusDisplay('draft');
    this.updateEditorSaveStatus('unsaved'); // A new article is unsaved
  }

  /**
   * 記事を読み込み (uses editor.html IDs)
   */
  async loadArticle(id) {
    try {
      this.updateEditorSaveStatus('saving'); 
      const articleWithContent = await this.adminManager.loadArticleWithContent(id);
      
      if (!articleWithContent) {
        this.showError('記事が見つかりません。リダイレクトします...');
        this.updateEditorSaveStatus('error');
        setTimeout(() => { window.location.href = 'index.html'; }, 2000);
        return;
      }

      const pageTitleEl = document.getElementById('pageTitle') || document.querySelector('.breadcrumb');
      if (pageTitleEl) pageTitleEl.textContent = `記事編集: ${articleWithContent.title}`;
      
      (document.getElementById('article-title')).value = articleWithContent.title;
      (document.getElementById('article-date')).value = articleWithContent.date;
      (document.getElementById('article-category')).value = articleWithContent.category;
      (document.getElementById('article-excerpt')).value = articleWithContent.excerpt;
      (document.getElementById('article-featured')).checked = articleWithContent.featured || false;
      (document.getElementById('markdown-editor')).value = articleWithContent.content || '';
      
      this.updateEditorStatusDisplay(articleWithContent.status || 'published');
      this.updateEditorSaveStatus('saved');

      this.hasUnsavedChanges = false;
      this.updateSaveButtonState();
      this.updatePreview();

    } catch (error) {
      console.error('記事読み込みエラー:', error);
      this.showError(`記事の読み込みに失敗しました: ${error.message}`);
      this.updateEditorSaveStatus('error');
    }
  }
  
  updateEditorStatusDisplay(status) {
    const indicator = document.getElementById('status-indicator');
    const textEl = document.getElementById('status-text');
    if (indicator && textEl) {
      indicator.className = 'status-indicator'; 
      if (status === 'draft') {
        indicator.classList.add('status-draft');
        textEl.textContent = '下書き';
      } else { 
        indicator.classList.add('status-published');
        textEl.textContent = '公開済み';
      }
    }
  }

  updateEditorSaveStatus(statusKey) {
    const element = document.getElementById('save-status');
    if (!element) return;
    
    element.className = 'save-status'; 
    switch (statusKey) {
      case 'saving':
        element.classList.add('saving');
        element.textContent = '保存中...';
        break;
      case 'saved':
        element.classList.add('saved');
        element.textContent = '保存済み';
        break;
      case 'error':
        element.classList.add('error');
        element.textContent = '保存エラー';
        break;
      case 'unsaved':
      default:
        element.textContent = '未保存'; 
        break;
    }
  }

  async saveArticle(status = null) { 
    try {
      this.updateEditorSaveStatus('saving'); 
      const formData = this.getFormData();
      
      formData.status = status || (this.isEditing && this.currentArticleId ? (this.adminManager.getArticleById(this.currentArticleId)?.status || 'draft') : 'draft');

      if (!this.validateForm(formData)) {
        this.updateEditorSaveStatus('error'); 
        return;
      }

      let result;
      if (this.isEditing && this.currentArticleId) {
        result = await this.adminManager.updateArticle(this.currentArticleId, formData);
      } else {
        result = await this.adminManager.createArticle(formData);
        this.currentArticleId = result.id; 
        this.isEditing = true;
        
        const newUrl = `${window.location.pathname}?id=${result.id}`;
        window.history.replaceState({}, '', newUrl);
        
        const pageTitleEl = document.getElementById('pageTitle') || document.querySelector('.breadcrumb');
        if (pageTitleEl) pageTitleEl.textContent = `記事編集: ${result.title}`;
      }

      this.hasUnsavedChanges = false;
      this.updateSaveButtonState(); 
      this.updateEditorStatusDisplay(result.status); 
      this.updateEditorSaveStatus('saved'); 
      
      if (result.status === 'published') {
        if (window.confirm('記事を公開しました。管理画面に戻りますか？')) {
          window.location.href = 'index.html';
        }
      } else { 
        this.showInfo('下書きを保存しました。');
      }
      
    } catch (error) {
      console.error('保存エラー:', error);
      this.showError(`記事の保存に失敗しました: ${error.message}`); 
      this.updateEditorSaveStatus('error');
    }
  }

  getFormData() {
    const title = document.getElementById('article-title').value.trim();
    const date = document.getElementById('article-date').value;
    const category = document.getElementById('article-category').value;
    const excerpt = document.getElementById('article-excerpt').value.trim();
    const content = document.getElementById('markdown-editor').value;
    const featured = document.getElementById('article-featured').checked;
    // categoryName is derived by AdminManager/API
    return { title, date, category, excerpt, content, featured };
  }

  validateForm(data) {
    const errors = [];
    if (!data.title) errors.push('タイトルを入力してください');
    if (!data.date) errors.push('日付を入力してください');
    if (!data.category) errors.push('カテゴリーを選択してください');
    if (!data.excerpt) errors.push('抜粋を入力してください');
    if (!data.content) errors.push('本文を入力してください');

    if (errors.length > 0) {
      this.showError(errors.join('\n'));
      return false;
    }
    return true;
  }

  updatePreview() {
    const contentEl = document.getElementById('markdown-editor'); 
    const previewContainer = document.getElementById('preview-content'); 
    
    if (contentEl && previewContainer) {
      const html = this.markdownParser.parse(contentEl.value);
      previewContainer.innerHTML = html;
    }
  }

  setupAutoSave() {
    this.autoSaveInterval = setInterval(() => {
      if (this.hasUnsavedChanges && this.isEditing && this.currentArticleId) { 
        console.log("AdminEditor: Attempting auto-save...");
        this.saveArticle('draft'); 
      }
    }, 30000); 
  }

  updateSaveButtonState() {
    const saveDraftButton = document.getElementById('saveDraftBtn');
    const publishButton = document.getElementById('publishBtn');

    if (saveDraftButton) {
      saveDraftButton.disabled = !this.hasUnsavedChanges;
    }
    if (publishButton) {
      publishButton.disabled = !this.hasUnsavedChanges;
    }
  }

  showSuccess(message) { this.showMessage(message, 'success'); }
  showInfo(message) { this.showMessage(message, 'info'); }
  showError(message) { this.showMessage(message, 'error'); }

  showMessage(message, type) {
    const container = document.getElementById('messageContainer'); 
    if (!container) {
        alert(`${type}: ${message}`); 
        return;
    }
    const messageElement = document.createElement('div');
    messageElement.className = `message message-${type}`; 
    messageElement.textContent = message;
    container.appendChild(messageElement);
    setTimeout(() => {
      if (messageElement.parentNode) messageElement.parentNode.removeChild(messageElement);
    }, 3000);
  }

  destroy() {
    if (this.autoSaveInterval) clearInterval(this.autoSaveInterval);
  }
}

let adminEditor;
document.addEventListener('DOMContentLoaded', () => {
  adminEditor = new AdminEditor();
});
window.addEventListener('beforeunload', () => { 
  if (adminEditor && typeof adminEditor.destroy === 'function') { 
    adminEditor.destroy();
  }
});
