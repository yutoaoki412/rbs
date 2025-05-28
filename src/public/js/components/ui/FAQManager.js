/**
 * FAQ管理クラス
 * よくある質問セクションのトグル機能を管理
 */
class FAQManager {
  constructor() {
    this.faqItems = [];
    this.isInitialized = false;
  }

  /**
   * FAQ機能の初期化
   */
  init() {
    try {
      // FAQ要素の存在確認
      const faqSection = document.getElementById('faq');
      if (!faqSection) {
        console.warn('⚠️ FAQセクションが見つかりません');
        return false;
      }

      this.faqItems = document.querySelectorAll('.faq-item');
      
      if (this.faqItems.length === 0) {
        console.warn('⚠️ FAQ項目が見つかりません');
        return false;
      }

      this.setupEventListeners();
      this.setupInitialState();
      this.isInitialized = true;
      
      console.log(`✅ FAQManager初期化完了 - ${this.faqItems.length}項目`);
      return true;
    } catch (error) {
      console.error('❌ FAQManager初期化エラー:', error);
      return false;
    }
  }

  /**
   * イベントリスナーの設定
   */
  setupEventListeners() {
    this.faqItems.forEach((item, index) => {
      const question = item.querySelector('.faq-question');
      const answer = item.querySelector('.faq-answer');
      const icon = item.querySelector('.faq-icon');

      if (!question || !answer || !icon) {
        console.warn(`⚠️ FAQ項目${index + 1}の要素が不完全です`);
        return;
      }

      // クリックイベントの設定
      question.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleFAQ(item, answer, icon);
      });

      // キーボードアクセシビリティ
      question.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.toggleFAQ(item, answer, icon);
        }
      });

      // アクセシビリティ属性の設定
      question.setAttribute('role', 'button');
      question.setAttribute('tabindex', '0');
      question.setAttribute('aria-expanded', 'false');
      question.setAttribute('aria-controls', `faq-answer-${index}`);
      
      answer.setAttribute('id', `faq-answer-${index}`);
      answer.setAttribute('aria-hidden', 'true');
    });
  }

  /**
   * 初期状態の設定
   */
  setupInitialState() {
    this.faqItems.forEach(item => {
      const icon = item.querySelector('.faq-icon');

      if (icon) {
        // 初期状態では全て閉じた状態
        item.classList.remove('active');
        icon.textContent = '+';
      }
    });
  }

  /**
   * FAQ項目のトグル
   */
  toggleFAQ(item, answer, icon) {
    const question = item.querySelector('.faq-question');
    const isOpen = item.classList.contains('active');

    if (isOpen) {
      // 閉じる
      this.closeFAQ(item, answer, icon, question);
    } else {
      // 開く
      this.openFAQItem(item, answer, icon, question);
    }
  }

  /**
   * FAQ項目を開く
   */
  openFAQItem(item, answer, icon, question) {
    // activeクラスを追加（CSSアニメーションが適用される）
    item.classList.add('active');
    
    // アクセシビリティ属性の更新
    question.setAttribute('aria-expanded', 'true');
    answer.setAttribute('aria-hidden', 'false');
    
    // アイコンの更新
    icon.textContent = '−';
  }

  /**
   * FAQ項目を閉じる
   */
  closeFAQ(item, answer, icon, question) {
    // activeクラスを削除（CSSアニメーションが適用される）
    item.classList.remove('active');
    
    // アクセシビリティ属性の更新
    question.setAttribute('aria-expanded', 'false');
    answer.setAttribute('aria-hidden', 'true');
    
    // アイコンの更新
    icon.textContent = '+';
  }

  /**
   * 全てのFAQを閉じる
   */
  closeAll() {
    this.faqItems.forEach(item => {
      const answer = item.querySelector('.faq-answer');
      const icon = item.querySelector('.faq-icon');
      const question = item.querySelector('.faq-question');

      if (answer && icon && question) {
        this.closeFAQ(item, answer, icon, question);
      }
    });
  }

  /**
   * 特定のFAQを開く
   */
  openFAQByIndex(index) {
    if (index >= 0 && index < this.faqItems.length) {
      const item = this.faqItems[index];
      const answer = item.querySelector('.faq-answer');
      const icon = item.querySelector('.faq-icon');
      const question = item.querySelector('.faq-question');

      if (answer && icon && question) {
        this.openFAQItem(item, answer, icon, question);
      }
    }
  }

  /**
   * 初期化状態の確認
   */
  isReady() {
    return this.isInitialized;
  }

  /**
   * FAQ項目数の取得
   */
  getItemCount() {
    return this.faqItems.length;
  }
}

// グローバルに公開（他のスクリプトから利用可能）
window.FAQManager = FAQManager;

// グローバルに公開（main.jsから初期化される）
window.rbsFAQManager = null; 