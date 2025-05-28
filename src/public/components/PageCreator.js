/**
 * ページ作成ヘルパー
 * 新しいページを効率的に作成するためのユーティリティ
 */
class PageCreator {
  constructor() {
    this.pageTemplate = new PageTemplate();
  }

  /**
   * お問い合わせページを作成
   * @returns {string} HTML文字列
   */
  createContactPage() {
    const config = {
      title: 'お問い合わせ - RBS陸上教室',
      description: 'RBS陸上教室へのお問い合わせフォーム。体験申し込みやご質問はこちらから。',
      pageTitle: 'お問い合わせ',
      pageSubtitle: 'ご質問やご相談がございましたら、お気軽にお問い合わせください',
      bodyClass: 'page-contact',
      pageId: 'contact',
      includedCSS: [
        '../css/base.css',
        '../css/common.css',
        '../css/components.css',
        '../css/layout.css',
        '../css/shared.css',
        '../css/form-components.css',
        '../css/responsive.css'
      ],
      content: this.generateContactFormContent()
    };

    return this.pageTemplate.generatePageTemplate(config);
  }

  /**
   * 体験申し込みページを作成
   * @returns {string} HTML文字列
   */
  createTrialPage() {
    const config = {
      title: '体験申し込み - RBS陸上教室',
      description: 'RBS陸上教室の無料体験レッスンお申し込みフォーム',
      pageTitle: '無料体験申し込み',
      pageSubtitle: 'まずは体験してみませんか？お気軽にお申し込みください',
      bodyClass: 'page-trial',
      pageId: 'trial',
      includedCSS: [
        '../css/base.css',
        '../css/common.css',
        '../css/components.css',
        '../css/layout.css',
        '../css/shared.css',
        '../css/form-components.css',
        '../css/responsive.css'
      ],
      content: this.generateTrialFormContent()
    };

    return this.pageTemplate.generatePageTemplate(config);
  }

  /**
   * ギャラリーページを作成
   * @returns {string} HTML文字列
   */
  createGalleryPage() {
    const config = {
      title: 'ギャラリー - RBS陸上教室',
      description: 'RBS陸上教室の活動写真・動画ギャラリー',
      pageTitle: 'ギャラリー',
      pageSubtitle: 'レッスンの様子や子どもたちの成長をご覧ください',
      bodyClass: 'page-gallery',
      pageId: 'gallery',
      includedCSS: [
        '../css/base.css',
        '../css/common.css',
        '../css/components.css',
        '../css/layout.css',
        '../css/shared.css',
        '../css/responsive.css'
      ],
      content: this.generateGalleryContent()
    };

    return this.pageTemplate.generatePageTemplate(config);
  }

  /**
   * イベント一覧ページを作成
   * @returns {string} HTML文字列
   */
  createEventsPage() {
    const config = {
      title: 'イベント - RBS陸上教室',
      description: 'RBS陸上教室のイベント・体験会情報',
      pageTitle: 'イベント',
      pageSubtitle: '体験会や特別イベントの情報をお知らせします',
      bodyClass: 'page-events',
      pageId: 'events',
      includedCSS: [
        '../css/base.css',
        '../css/common.css',
        '../css/components.css',
        '../css/layout.css',
        '../css/shared.css',
        '../css/responsive.css'
      ],
      content: this.generateEventsContent()
    };

    return this.pageTemplate.generatePageTemplate(config);
  }

  /**
   * よくある質問ページを作成
   * @returns {string} HTML文字列
   */
  createFAQPage() {
    const config = {
      title: 'よくある質問 - RBS陸上教室',
      description: 'RBS陸上教室に関するよくある質問と回答',
      pageTitle: 'よくある質問',
      pageSubtitle: 'お客様からよく寄せられる質問をまとめました',
      bodyClass: 'page-faq',
      pageId: 'faq',
      includedCSS: [
        '../css/base.css',
        '../css/common.css',
        '../css/components.css',
        '../css/layout.css',
        '../css/shared.css',
        '../css/responsive.css'
      ],
      content: this.generateFAQContent()
    };

    return this.pageTemplate.generatePageTemplate(config);
  }

  /**
   * ニュース詳細ページを作成
   * @returns {string} HTML文字列
   */
  createNewsDetailPage() {
    const config = {
      title: 'ニュース詳細 - RBS陸上教室',
      description: 'RBS陸上教室のニュース詳細',
      pageTitle: 'ニュース詳細',
      bodyClass: 'page-news-detail',
      pageId: 'news-detail',
      hasStatusBanner: false,
      includedCSS: [
        '../css/base.css',
        '../css/common.css',
        '../css/components.css',
        '../css/layout.css',
        '../css/shared.css',
        '../css/news.css',
        '../css/responsive.css'
      ],
      content: this.generateNewsDetailContent()
    };

    return this.pageTemplate.generatePageTemplate(config);
  }

  /**
   * お問い合わせフォームコンテンツを生成
   * @returns {string} HTML文字列
   */
  generateContactFormContent() {
    const formConfig = {
      formId: 'contact-form',
      title: 'お問い合わせフォーム',
      description: '下記のフォームに必要事項をご入力の上、送信してください。2営業日以内にご返信いたします。',
      fields: [
        {
          type: 'text',
          id: 'name',
          label: 'お名前',
          placeholder: '山田 太郎',
          required: true
        },
        {
          type: 'text',
          id: 'kana',
          label: 'フリガナ',
          placeholder: 'ヤマダ タロウ',
          required: true
        },
        {
          type: 'email',
          id: 'email',
          label: 'メールアドレス',
          placeholder: 'example@email.com',
          required: true
        },
        {
          type: 'tel',
          id: 'phone',
          label: '電話番号',
          placeholder: '090-1234-5678'
        },
        {
          type: 'select',
          id: 'subject',
          label: 'お問い合わせ種別',
          required: true,
          options: [
            { value: '', text: '選択してください' },
            { value: 'trial', text: '体験レッスンについて' },
            { value: 'enrollment', text: '入会について' },
            { value: 'schedule', text: 'スケジュールについて' },
            { value: 'other', text: 'その他' }
          ]
        },
        {
          type: 'textarea',
          id: 'message',
          label: 'お問い合わせ内容',
          placeholder: 'お問い合わせ内容を具体的にご記入ください',
          required: true,
          rows: 6
        }
      ],
      submitText: '送信する',
      submitClass: 'btn-primary'
    };

    return this.pageTemplate.generateFormTemplate(formConfig);
  }

  /**
   * 体験申し込みフォームコンテンツを生成
   * @returns {string} HTML文字列
   */
  generateTrialFormContent() {
    const formConfig = {
      formId: 'trial-form',
      title: '無料体験申し込みフォーム',
      description: '体験レッスンは無料です。動きやすい服装でお越しください。',
      fields: [
        {
          type: 'text',
          id: 'parent-name',
          label: '保護者様お名前',
          placeholder: '山田 太郎',
          required: true
        },
        {
          type: 'text',
          id: 'child-name',
          label: 'お子様のお名前',
          placeholder: '山田 花子',
          required: true
        },
        {
          type: 'text',
          id: 'child-kana',
          label: 'お子様のフリガナ',
          placeholder: 'ヤマダ ハナコ',
          required: true
        },
        {
          type: 'select',
          id: 'child-age',
          label: 'お子様の年齢',
          required: true,
          options: [
            { value: '', text: '選択してください' },
            { value: '5', text: '5歳' },
            { value: '6', text: '6歳' },
            { value: '7', text: '7歳' },
            { value: '8', text: '8歳' },
            { value: '9', text: '9歳' },
            { value: '10', text: '10歳' },
            { value: '11', text: '11歳' },
            { value: '12', text: '12歳' }
          ]
        },
        {
          type: 'email',
          id: 'email',
          label: 'メールアドレス',
          placeholder: 'example@email.com',
          required: true
        },
        {
          type: 'tel',
          id: 'phone',
          label: '電話番号',
          placeholder: '090-1234-5678',
          required: true
        },
        {
          type: 'select',
          id: 'preferred-date',
          label: '希望日時',
          required: true,
          options: [
            { value: '', text: '選択してください' },
            { value: 'weekday', text: '平日' },
            { value: 'weekend', text: '土日' },
            { value: 'discuss', text: '相談して決める' }
          ]
        },
        {
          type: 'textarea',
          id: 'notes',
          label: 'その他・ご質問',
          placeholder: '何かご質問やご要望がございましたらご記入ください',
          rows: 4
        }
      ],
      submitText: '体験を申し込む',
      submitClass: 'btn-primary'
    };

    return this.pageTemplate.generateFormTemplate(formConfig);
  }

  /**
   * ギャラリーコンテンツを生成
   * @returns {string} HTML文字列
   */
  generateGalleryContent() {
    return `      <!-- ギャラリーセクション -->
      <div class="gallery-section">
        <div class="gallery-tabs">
          <button class="gallery-tab active" data-category="all">すべて</button>
          <button class="gallery-tab" data-category="lesson">レッスン</button>
          <button class="gallery-tab" data-category="event">イベント</button>
          <button class="gallery-tab" data-category="achievement">成果</button>
        </div>

        <div class="gallery-grid" id="gallery-grid">
          <div class="gallery-item" data-category="lesson">
            <img src="../assets/images/gallery/lesson1.jpg" alt="レッスンの様子1">
            <div class="gallery-overlay">
              <h3>基本フォーム練習</h3>
              <p>正しいフォームを身につけます</p>
            </div>
          </div>
          
          <div class="gallery-item" data-category="lesson">
            <img src="../assets/images/gallery/lesson2.jpg" alt="レッスンの様子2">
            <div class="gallery-overlay">
              <h3>スタート練習</h3>
              <p>素早いスタートを目指します</p>
            </div>
          </div>
          
          <div class="gallery-item" data-category="event">
            <img src="../assets/images/gallery/event1.jpg" alt="イベントの様子1">
            <div class="gallery-overlay">
              <h3>体験会</h3>
              <p>多くの子どもたちが参加</p>
            </div>
          </div>
          
          <div class="gallery-item" data-category="achievement">
            <img src="../assets/images/gallery/achievement1.jpg" alt="成果発表">
            <div class="gallery-overlay">
              <h3>タイム測定</h3>
              <p>成長を実感できる瞬間</p>
            </div>
          </div>
        </div>
      </div>`;
  }

  /**
   * イベントコンテンツを生成
   * @returns {string} HTML文字列
   */
  generateEventsContent() {
    return `      <!-- イベント一覧 -->
      <div class="events-section">
        <div class="events-filters">
          <button class="event-filter active" data-filter="upcoming">開催予定</button>
          <button class="event-filter" data-filter="past">過去のイベント</button>
        </div>

        <div class="events-grid" id="events-grid">
          <div class="event-card" data-status="upcoming">
            <div class="event-date">
              <span class="month">12</span>
              <span class="day">15</span>
            </div>
            <div class="event-content">
              <h3>無料体験会</h3>
              <p class="event-time">10:00-12:00</p>
              <p class="event-location">○○公園 運動場</p>
              <p class="event-description">
                初めての方向けの体験会です。運動の楽しさを体感できます。
              </p>
              <a href="trial.html" class="btn btn-primary">申し込む</a>
            </div>
          </div>

          <div class="event-card" data-status="upcoming">
            <div class="event-date">
              <span class="month">1</span>
              <span class="day">20</span>
            </div>
            <div class="event-content">
              <h3>新春運動会</h3>
              <p class="event-time">9:00-15:00</p>
              <p class="event-location">△△体育館</p>
              <p class="event-description">
                生徒限定の新春イベント。1年の成果を発揮しよう！
              </p>
              <a href="contact.html" class="btn btn-outline">詳細確認</a>
            </div>
          </div>
        </div>
      </div>`;
  }

  /**
   * FAQコンテンツを生成
   * @returns {string} HTML文字列
   */
  generateFAQContent() {
    return `      <!-- FAQ一覧 -->
      <div class="faq-section">
        <div class="faq-categories">
          <button class="faq-category active" data-category="all">すべて</button>
          <button class="faq-category" data-category="basic">基本情報</button>
          <button class="faq-category" data-category="lesson">レッスン</button>
          <button class="faq-category" data-category="fee">料金</button>
        </div>

        <div class="faq-list" id="faq-list">
          <div class="faq-item" data-category="basic">
            <div class="faq-question">
              対象年齢を教えてください
              <span class="faq-icon">+</span>
            </div>
            <div class="faq-answer">
              <p>年長（5歳）から小学6年生（12歳）までが対象です。運動経験がなくても安心してご参加いただけます。</p>
            </div>
          </div>

          <div class="faq-item" data-category="lesson">
            <div class="faq-question">
              雨の日はどうなりますか？
              <span class="faq-icon">+</span>
            </div>
            <div class="faq-answer">
              <p>雨天の場合は室内での代替プログラムを実施します。当日の開催状況はサイト上部のステータスバナーでご確認いただけます。</p>
            </div>
          </div>

          <div class="faq-item" data-category="fee">
            <div class="faq-question">
              月謝以外にかかる費用はありますか？
              <span class="faq-icon">+</span>
            </div>
            <div class="faq-answer">
              <p>入会金と年会費が必要です。詳細は料金ページをご確認ください。特別なイベント参加時は別途費用が発生する場合があります。</p>
            </div>
          </div>

          <div class="faq-item" data-category="basic">
            <div class="faq-question">
              体験レッスンは有料ですか？
              <span class="faq-icon">+</span>
            </div>
            <div class="faq-answer">
              <p>体験レッスンは無料です。動きやすい服装と水分補給用のドリンクをお持ちください。</p>
            </div>
          </div>
        </div>
      </div>`;
  }

  /**
   * ニュース詳細コンテンツを生成
   * @returns {string} HTML文字列
   */
  generateNewsDetailContent() {
    return `      <!-- ニュース詳細 -->
      <div class="news-detail-section">
        <!-- パンくずナビ -->
        <nav class="breadcrumb">
          <a href="index.html">ホーム</a>
          <span class="breadcrumb-separator">></span>
          <a href="news.html">ニュース</a>
          <span class="breadcrumb-separator">></span>
          <span class="current">記事詳細</span>
        </nav>

        <!-- 記事本文 -->
        <article class="news-article" id="news-article">
          <!-- 記事ヘッダー -->
          <header class="news-article-header">
            <div class="news-meta">
              <div class="news-date" id="article-date">2024.01.15</div>
              <div class="news-category" id="article-category">お知らせ</div>
            </div>
            <h1 class="news-article-title" id="article-title">記事タイトルが表示されます</h1>
          </header>

          <!-- 記事画像 -->
          <div class="news-article-image" id="article-image-container" style="display: none;">
            <img id="article-image" src="" alt="記事画像">
          </div>

          <!-- 記事内容 -->
          <div class="news-article-content" id="article-content">
            <div class="loading-message">
              <div class="loading-spinner"></div>
              <p>記事を読み込み中...</p>
            </div>
          </div>

          <!-- 記事フッター -->
          <footer class="news-article-footer">
            <div class="share-buttons">
              <p>この記事をシェア</p>
              <a href="#" class="share-btn twitter" onclick="shareOnTwitter()">Twitter</a>
              <a href="#" class="share-btn facebook" onclick="shareOnFacebook()">Facebook</a>
              <a href="#" class="share-btn line" onclick="shareOnLine()">LINE</a>
            </div>
          </footer>
        </article>

        <!-- 関連記事 -->
        <section class="related-articles">
          <h2>関連記事</h2>
          <div class="related-articles-grid" id="related-articles">
            <!-- 関連記事は動的に読み込まれます -->
          </div>
        </section>

        <!-- 記事一覧に戻る -->
        <div class="back-to-list">
          <a href="news.html" class="btn btn-outline">記事一覧に戻る</a>
        </div>
      </div>`;
  }

  /**
   * すべてのページテンプレート例を取得
   * @returns {Object} ページテンプレートのオブジェクト
   */
  getAllPageTemplates() {
    return {
      contact: this.createContactPage(),
      trial: this.createTrialPage(),
      gallery: this.createGalleryPage(),
      events: this.createEventsPage(),
      faq: this.createFAQPage(),
      newsDetail: this.createNewsDetailPage()
    };
  }

  /**
   * デモ用のページHTMLを生成（コンソールで確認用）
   */
  generateDemoPages() {
    const pages = this.getAllPageTemplates();
    
    console.log('=== 生成されたページテンプレート ===');
    
    Object.keys(pages).forEach(pageName => {
      console.log(`\n--- ${pageName}.html ---`);
      console.log(pages[pageName]);
    });
    
    return pages;
  }

  /**
   * 新規ページ作成の使用例を表示
   */
  static showUsageExample() {
    console.log(`
=== PageCreator 使用例 ===

// 1. PageCreatorのインスタンスを作成
const pageCreator = new PageCreator();

// 2. お問い合わせページを作成
const contactHTML = pageCreator.createContactPage();

// 3. 体験申し込みページを作成
const trialHTML = pageCreator.createTrialPage();

// 4. ギャラリーページを作成
const galleryHTML = pageCreator.createGalleryPage();

// 5. すべてのページテンプレートを取得
const allPages = pageCreator.getAllPageTemplates();

// 6. カスタムページの作成
const customConfig = {
  title: 'カスタムページ - RBS陸上教室',
  pageTitle: 'カスタムページ',
  content: '<div>カスタムコンテンツ</div>'
};
const customHTML = pageCreator.pageTemplate.generatePageTemplate(customConfig);

=== 新しいページの追加手順 ===

1. PageCreatorクラスに新しいメソッドを追加
2. そのページ専用のCSSが必要な場合は作成
3. 必要に応じてJavaScriptファイルを作成
4. ナビゲーションメニューに追加

例：
createPricingPage() {
  const config = {
    title: '料金 - RBS陸上教室',
    pageTitle: '料金',
    content: this.generatePricingContent()
  };
  return this.pageTemplate.generatePageTemplate(config);
}
    `);
  }
}

// グローバルで利用可能にする
window.PageCreator = PageCreator; 