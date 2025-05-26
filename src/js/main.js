// 記事管理システムを初期化
const articleManager = new ArticleManager();

// レッスン状況更新システムを初期化
const statusUpdater = new LessonStatusUpdater();

document.addEventListener('DOMContentLoaded', async () => {
  // 記事を読み込み
  await articleManager.loadArticles();
  
  // レッスン状況を初期化
  statusUpdater.init();
  
  // ニュース一覧を表示
  displayNews();
});

// ニュース一覧を表示（メインページ用）
function displayNews() {
  const newsList = document.getElementById('news-list');
  if (!newsList) return;

  try {
    // 最新3件の記事を取得
    const latestArticles = articleManager.articles
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 3);

    if (latestArticles.length === 0) {
      newsList.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--gray-medium);">
          <p style="font-size: 16px; font-weight: 600;">まだニュースがありません</p>
          <p style="font-size: 14px; margin-top: 10px;">管理画面から記事を作成してください</p>
        </div>
      `;
      return;
    }

    // ニュース項目を生成
    const newsHtml = latestArticles.map(article => {
      const categoryColor = articleManager.getCategoryColor(article.category);
      return `
        <div class="news-item">
          <div class="news-date">${articleManager.formatDate(article.date)}</div>
          <div class="news-content">
            <span class="news-category" style="background: ${categoryColor};">${article.categoryName}</span>
            <a href="news-detail.html?id=${article.id}" style="color: var(--navy-dark); text-decoration: none; font-weight: 600;">${article.title}</a>
          </div>
        </div>
      `;
    }).join('');

    newsList.innerHTML = newsHtml;
  } catch (error) {
    console.error('ニュース表示エラー:', error);
    newsList.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--primary-red);">
        <p style="font-size: 16px; font-weight: 600;">ニュースの読み込みに失敗しました</p>
      </div>
    `;
  }
}

// Smooth Scroll for anchor links & offset for fixed header
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            let headerOffset = 120; // デフォルトのオフセット
            const statusBanner = document.querySelector('#status-banner-container .status-banner');
            if (statusBanner && getComputedStyle(statusBanner).display !== 'none') {
                headerOffset += statusBanner.offsetHeight;
            }
            const elementPosition = targetElement.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        
            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth"
            });
            const navLinks = document.querySelector('.nav-links');
            const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
            const menuIcon = mobileMenuBtn.querySelector('i');
            if (navLinks.classList.contains('active')) {
                 mobileMenuBtn.setAttribute('aria-expanded', 'false');
                 navLinks.classList.remove('active');
                 menuIcon.classList.remove('fa-times');
                 menuIcon.classList.add('fa-bars');
            }
        }
    });
});

// Scroll Animation
const animatedElements = document.querySelectorAll('.animate-on-scroll');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
    }
  });
}, {
  threshold: 0.1
});
animatedElements.forEach(el => {
  observer.observe(el);
  const delay = el.dataset.animationDelay;
  if(delay) {
    el.style.transitionDelay = delay;
  }
});

// Mobile Menu Toggle
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');
// navLinks が null の場合にエラーが発生するのを防ぐため、存在確認を追加
if (mobileMenuBtn && navLinks) {
    const menuIcon = mobileMenuBtn.querySelector('i');
    mobileMenuBtn.addEventListener('click', () => {
        const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
        mobileMenuBtn.setAttribute('aria-expanded', !isExpanded);
        navLinks.classList.toggle('active');
        if (navLinks.classList.contains('active')) {
            menuIcon.classList.remove('fa-bars');
            menuIcon.classList.add('fa-times');
        } else {
            menuIcon.classList.remove('fa-times');
            menuIcon.classList.add('fa-bars');
        }
    });

    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            if (navLinks.classList.contains('active')) {
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
                navLinks.classList.remove('active');
                menuIcon.classList.remove('fa-times');
                menuIcon.classList.add('fa-bars');
            }
        });
    });
}

// FAQ Accordion
const faqItems = document.querySelectorAll('.faq-item');
faqItems.forEach(item => {
  const question = item.querySelector('.faq-question');
  question.addEventListener('click', () => {
    const currentlyActive = document.querySelector('.faq-item.active');
    if (currentlyActive && currentlyActive !== item) {
      currentlyActive.classList.remove('active');
    }
    item.classList.toggle('active');
  });
});


// Status Banner Logic (Dummy Data)
function displayDummyStatus() {
    const statusBannerContainer = document.getElementById('status-banner-container');
     if (!statusBannerContainer) return;
    const dummyData = {
        active: true, 
        message: "【重要】12月24日(日) 練習場所変更のお知らせ。詳細は<a href='news.html'>こちら</a>。",
        backgroundColor: "var(--primary-red)",
        textColor: "white",
        isSticky: true
    };
    if (dummyData.active && dummyData.message) {
        const banner = document.createElement('div');
        banner.className = 'status-banner';
        banner.innerHTML = dummyData.message;
        banner.style.backgroundColor = dummyData.backgroundColor;
        banner.style.color = dummyData.textColor;
        if (dummyData.isSticky) {
            banner.classList.add('is-sticky');
            const header = document.querySelector('header');
            if (header) { // header要素が存在するか確認
                const headerHeight = header.offsetHeight || 115;
                banner.style.top = `${headerHeight}px`;
            }
        }
        statusBannerContainer.innerHTML = '';
        statusBannerContainer.appendChild(banner);
        statusBannerContainer.style.display = 'block';
    } else {
        statusBannerContainer.style.display = 'none';
    }
}
document.addEventListener('DOMContentLoaded', displayDummyStatus);

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
window.onload = function() {
  window.scrollTo(0, 0);
} 