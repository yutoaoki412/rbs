/**
 * 記事エディターの機能
 */
class AdminEditor {
  constructor() {
    this.auth = new AdminAuth();
    this.adminManager = new AdminManager();
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
    // 認証チェック
    if (!this.auth.requireAuth()) {
      return;
    }

    // 自動ログアウト設定
    this.auth.setupAutoLogout();

    try {
      // 記事データを読み込み
      await this.adminManager.loadArticles();
      
      // URLパラメータから記事IDを取得
      const urlParams = new URLSearchParams(window.location.search);
      this.currentArticleId = urlParams.get('id');
      
      if (this.currentArticleId) {
        this.isEditing = true;
        await this.loadArticle(this.currentArticleId);
      } else {
        this.setupNewArticle();
      }
      
      // UI初期化
      this.setupEventListeners();
      this.setupAutoSave();
      this.updatePreview();
      
      console.log('エディターを初期化しました');
    } catch (error) {
      console.error('初期化エラー:', error);
      this.showError('エディターの初期化に失敗しました');
    }
  }

  /**
   * イベントリスナーを設定
   */
  setupEventListeners() {
    // 戻るボタン
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (this.hasUnsavedChanges) {
          if (confirm('保存されていない変更があります。戻りますか？')) {
            window.location.href = 'index.html';
          }
        } else {
          window.location.href = 'index.html';
        }
      });
    }

    // 保存ボタン
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.saveArticle();
      });
    }

    // 下書き保存ボタン
    const saveDraftBtn = document.getElementById('saveDraftBtn');
    if (saveDraftBtn) {
      saveDraftBtn.addEventListener('click', () => {
        this.saveArticle('draft');
      });
    }

    // 公開ボタン
    const publishBtn = document.getElementById('publishBtn');
    if (publishBtn) {
      publishBtn.addEventListener('click', () => {
        this.saveArticle('published');
      });
    }

    // プレビューボタン
    const previewBtn = document.getElementById('previewBtn');
    if (previewBtn) {
      previewBtn.addEventListener('click', () => {
        this.togglePreview();
      });
    }

    // フォーム要素の変更監視
    const formElements = ['title', 'date', 'category', 'excerpt', 'content', 'featured'];
    formElements.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('input', () => {
          this.hasUnsavedChanges = true;
          this.updateSaveButtonState();
          if (id === 'content') {
            this.updatePreview();
          }
        });
      }
    });

    // カテゴリー変更時にカテゴリー名を自動設定
    const categorySelect = document.getElementById('category');
    if (categorySelect) {
      categorySelect.addEventListener('change', (e) => {
        const categoryNameInput = document.getElementById('categoryName');
        if (categoryNameInput) {
          categoryNameInput.value = this.adminManager.getCategoryName(e.target.value);
        }
      });
    }

    // ページ離脱時の警告
    window.addEventListener('beforeunload', (e) => {
      if (this.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    });

    // キーボードショートカット
    document.addEventListener('keydown', (e) => {
      // Ctrl+S で保存
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        this.saveArticle();
      }
      
      // Ctrl+P でプレビュー切り替え
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        this.togglePreview();
      }
    });

    // Markdownツールバー
    this.setupMarkdownToolbar();
  }

  /**
   * Markdownツールバーを設定
   */
  setupMarkdownToolbar() {
    const toolbar = document.getElementById('markdownToolbar');
    if (!toolbar) return;

    const tools = [
      { id: 'bold', icon: 'B', title: '太字', action: () => this.insertMarkdown('**', '**') },
      { id: 'italic', icon: 'I', title: '斜体', action: () => this.insertMarkdown('*', '*') },
      { id: 'heading1', icon: 'H1', title: '見出し1', action: () => this.insertMarkdown('# ', '') },
      { id: 'heading2', icon: 'H2', title: '見出し2', action: () => this.insertMarkdown('## ', '') },
      { id: 'heading3', icon: 'H3', title: '見出し3', action: () => this.insertMarkdown('### ', '') },
      { id: 'list', icon: '•', title: 'リスト', action: () => this.insertMarkdown('- ', '') },
      { id: 'quote', icon: '"', title: '引用', action: () => this.insertMarkdown('> ', '') },
      { id: 'hr', icon: '—', title: '水平線', action: () => this.insertMarkdown('\n---\n', '') }
    ];

    const html = tools.map(tool => `
      <button type="button" class="toolbar-btn" title="${tool.title}" data-action="${tool.id}">
        ${tool.icon}
      </button>
    `).join('');

    toolbar.innerHTML = html;

    // ツールバーボタンのイベント
    toolbar.addEventListener('click', (e) => {
      if (e.target.classList.contains('toolbar-btn')) {
        const action = e.target.dataset.action;
        const tool = tools.find(t => t.id === action);
        if (tool) {
          tool.action();
        }
      }
    });
  }

  /**
   * Markdownを挿入
   */
  insertMarkdown(before, after) {
    const textarea = document.getElementById('content');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    
    const newText = before + selectedText + after;
    
    textarea.value = textarea.value.substring(0, start) + newText + textarea.value.substring(end);
    
    // カーソル位置を調整
    const newCursorPos = start + before.length + selectedText.length;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
    
    textarea.focus();
    this.hasUnsavedChanges = true;
    this.updatePreview();
  }

  /**
   * 新規記事の設定
   */
  setupNewArticle() {
    document.getElementById('pageTitle').textContent = '新規記事作成';
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    document.getElementById('category').value = 'announcement';
    document.getElementById('categoryName').value = 'お知らせ';
  }

  /**
   * 記事を読み込み
   */
  async loadArticle(id) {
    try {
      const article = this.adminManager.getArticleById(parseInt(id));
      if (!article) {
        throw new Error('記事が見つかりません');
      }

      // メタデータを設定
      document.getElementById('pageTitle').textContent = `記事編集: ${article.title}`;
      document.getElementById('title').value = article.title;
      document.getElementById('date').value = article.date;
      document.getElementById('category').value = article.category;
      document.getElementById('categoryName').value = article.categoryName;
      document.getElementById('excerpt').value = article.excerpt;
      document.getElementById('featured').checked = article.featured || false;

      // コンテンツを読み込み
      const content = await this.adminManager.loadArticleContent(article.file);
      document.getElementById('content').value = content;

      this.hasUnsavedChanges = false;
      this.updateSaveButtonState();
    } catch (error) {
      console.error('記事読み込みエラー:', error);
      this.showError('記事の読み込みに失敗しました');
    }
  }

  /**
   * 記事を保存
   */
  async saveArticle(status = null) {
    try {
      const formData = this.getFormData();
      
      if (status) {
        formData.status = status;
      }

      // バリデーション
      if (!this.validateForm(formData)) {
        return;
      }

      let result;
      if (this.isEditing) {
        result = await this.adminManager.updateArticle(this.currentArticleId, formData);
      } else {
        result = await this.adminManager.createArticle(formData);
        this.currentArticleId = result.id;
        this.isEditing = true;
        
        // URLを更新
        const newUrl = `${window.location.pathname}?id=${result.id}`;
        window.history.replaceState({}, '', newUrl);
      }

      this.hasUnsavedChanges = false;
      this.updateSaveButtonState();
      
      const statusText = status === 'published' ? '公開' : status === 'draft' ? '下書き保存' : '保存';
      this.showSuccess(`記事を${statusText}しました`);
      
    } catch (error) {
      console.error('保存エラー:', error);
      this.showError('記事の保存に失敗しました');
    }
  }

  /**
   * フォームデータを取得
   */
  getFormData() {
    return {
      title: document.getElementById('title').value.trim(),
      date: document.getElementById('date').value,
      category: document.getElementById('category').value,
      categoryName: document.getElementById('categoryName').value.trim(),
      excerpt: document.getElementById('excerpt').value.trim(),
      content: document.getElementById('content').value,
      featured: document.getElementById('featured').checked,
      status: 'draft' // デフォルト
    };
  }

  /**
   * フォームバリデーション
   */
  validateForm(data) {
    const errors = [];

    if (!data.title) {
      errors.push('タイトルを入力してください');
    }

    if (!data.date) {
      errors.push('日付を入力してください');
    }

    if (!data.category) {
      errors.push('カテゴリーを選択してください');
    }

    if (!data.excerpt) {
      errors.push('抜粋を入力してください');
    }

    if (!data.content) {
      errors.push('本文を入力してください');
    }

    if (errors.length > 0) {
      this.showError(errors.join('\n'));
      return false;
    }

    return true;
  }

  /**
   * プレビューを更新
   */
  updatePreview() {
    const content = document.getElementById('content').value;
    const previewContainer = document.getElementById('previewContainer');
    
    if (previewContainer) {
      const html = this.markdownParser.parse(content);
      previewContainer.innerHTML = html;
    }
  }

  /**
   * プレビュー表示を切り替え
   */
  togglePreview() {
    const editorContainer = document.getElementById('editorContainer');
    const previewContainer = document.getElementById('previewContainer');
    const previewBtn = document.getElementById('previewBtn');
    
    if (!editorContainer || !previewContainer || !previewBtn) return;

    const isPreviewVisible = previewContainer.style.display !== 'none';
    
    if (isPreviewVisible) {
      // プレビューを非表示
      previewContainer.style.display = 'none';
      editorContainer.style.width = '100%';
      previewBtn.textContent = 'プレビュー表示';
    } else {
      // プレビューを表示
      previewContainer.style.display = 'block';
      editorContainer.style.width = '50%';
      previewBtn.textContent = 'プレビュー非表示';
      this.updatePreview();
    }
  }

  /**
   * 自動保存を設定
   */
  setupAutoSave() {
    // 30秒ごとに自動保存
    this.autoSaveInterval = setInterval(() => {
      if (this.hasUnsavedChanges && this.isEditing) {
        this.autoSave();
      }
    }, 30000);
  }

  /**
   * 自動保存実行
   */
  async autoSave() {
    try {
      const formData = this.getFormData();
      
      if (formData.title && formData.content) {
        await this.adminManager.updateArticle(this.currentArticleId, formData);
        this.showInfo('自動保存しました');
        this.hasUnsavedChanges = false;
        this.updateSaveButtonState();
      }
    } catch (error) {
      console.warn('自動保存に失敗:', error);
    }
  }

  /**
   * 保存ボタンの状態を更新
   */
  updateSaveButtonState() {
    const saveBtn = document.getElementById('saveBtn');
    const saveDraftBtn = document.getElementById('saveDraftBtn');
    
    if (saveBtn) {
      saveBtn.disabled = !this.hasUnsavedChanges;
      saveBtn.textContent = this.hasUnsavedChanges ? '保存する' : '保存済み';
    }
    
    if (saveDraftBtn) {
      saveDraftBtn.disabled = !this.hasUnsavedChanges;
    }
  }

  /**
   * 文字数カウント
   */
  updateCharCount() {
    const content = document.getElementById('content').value;
    const charCountElement = document.getElementById('charCount');
    
    if (charCountElement) {
      const charCount = content.length;
      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
      charCountElement.textContent = `${charCount}文字 / ${wordCount}語`;
    }
  }

  /**
   * 成功メッセージを表示
   */
  showSuccess(message) {
    this.showMessage(message, 'success');
  }

  /**
   * 情報メッセージを表示
   */
  showInfo(message) {
    this.showMessage(message, 'info');
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
   * クリーンアップ
   */
  destroy() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
  }
}

// グローバルインスタンス
let adminEditor;

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', () => {
  adminEditor = new AdminEditor();
});

// ページ離脱時にクリーンアップ
window.addEventListener('beforeunload', () => {
  if (adminEditor) {
    adminEditor.destroy();
  }
}); 