/* ═══════════════════════════════════════════════════
   ALBERTO PREVEDI — Main JavaScript
   ═══════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initMobileCartFab();
    initCartBadge();
    initScrollReveal();
    initGallery();
    initContactForm();
    initProgramFilters();
    initServicePurchaseToggles();
});

function initMobileCartFab() {
    if (document.querySelector('[data-mobile-cart-fab]')) return;

    const fab = document.createElement('a');
    fab.href = 'carrello.html';
    fab.className = 'mobile-cart-fab';
    fab.setAttribute('aria-label', 'Apri carrello');
    fab.setAttribute('data-mobile-cart-fab', '');
    fab.innerHTML = `
        <svg class="nav-cart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="9" cy="20" r="1"></circle>
            <circle cx="17" cy="20" r="1"></circle>
            <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L22 7H7"></path>
        </svg>
        <span class="cart-badge" data-cart-count>0</span>
    `;
    document.body.appendChild(fab);
}

function initCartBadge() {
    let raw = null;
    try {
        raw = window.localStorage.getItem('ap_shop_cart_v1');
    } catch (_) {
        raw = null;
    }
    let cart = [];
    try {
        cart = JSON.parse(raw || '[]');
    } catch (_) {
        cart = [];
    }

    const total = Array.isArray(cart)
        ? cart.reduce((sum, item) => sum + (Number.isFinite(item.qty) ? Math.max(1, item.qty) : 1), 0)
        : 0;

    document.querySelectorAll('[data-cart-count]').forEach((badge) => {
        badge.textContent = String(total);
        badge.style.display = total > 0 ? 'inline-flex' : 'none';
    });

    document.querySelectorAll('[data-cart-empty-label]').forEach((label) => {
        label.style.display = total > 0 ? 'none' : 'inline-flex';
    });

    document.querySelectorAll('.nav-cart-link').forEach((link) => {
        link.href = total > 0 ? 'carrello.html' : 'servizi.html#programmi-allenamento';
        link.setAttribute('aria-label', total > 0 ? 'Apri carrello' : 'Vai ai programmi');
    });

    const mobileFab = document.querySelector('[data-mobile-cart-fab]');
    if (mobileFab) {
        const onCartPage = /\/?carrello\.html$/i.test(window.location.pathname);
        mobileFab.classList.toggle('is-visible', total > 0 && !onCartPage);
    }
}

/* ── Navbar ── */
function initNavbar() {
    const navbar = document.querySelector('.navbar');
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    if (!navbar || !hamburger || !navLinks) return;

    const links = navLinks.querySelectorAll('a');

    // Scroll effect
    const onScroll = () => {
        navbar.classList.toggle('scrolled', window.scrollY > 60);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Hamburger
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navLinks.classList.toggle('open');
        document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
    });

    // Close on link click (mobile)
    links.forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navLinks.classList.remove('open');
            document.body.style.overflow = '';
        });
    });

    // Active link highlight on scroll
    const sections = document.querySelectorAll('.section[id]');
    const highlightNav = () => {
        if (!sections.length) return;
        const scrollPos = window.scrollY + 120;
        sections.forEach(section => {
            const top = section.offsetTop;
            const height = section.offsetHeight;
            const id = section.getAttribute('id');
            const link = navLinks.querySelector(`a[href="#${id}"]`);
            if (link) {
                link.classList.toggle('active', scrollPos >= top && scrollPos < top + height);
            }
        });
    };
    window.addEventListener('scroll', highlightNav, { passive: true });
    highlightNav();
}

/* ── Scroll Reveal ── */
function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal:not(.visible)');
    if (!reveals.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    reveals.forEach((el, i) => {
        el.style.transitionDelay = `${i % 3 * 0.1}s`;
        observer.observe(el);
    });
}

/* ── Gallery — Auto-discover images from photos/ folder ── */
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'bmp', 'svg'];

function normalizeGalleryPhoto(entry) {
    if (typeof entry === 'string') {
        const baseName = entry.replace(/\.[^.]+$/, '');
        return {
            original: `photos/${entry}`,
            thumb: `photos/optimized/thumbs/${baseName}.webp`,
            lightbox: `photos/optimized/lightbox/${baseName}.webp`
        };
    }

    if (!entry || typeof entry !== 'object') return null;

    return {
        original: entry.original || entry.full || entry.src || '',
        thumb: entry.thumb || entry.original || entry.full || entry.src || '',
        lightbox: entry.lightbox || entry.original || entry.full || entry.src || ''
    };
}

function bindFallbackImage(imageNode) {
    if (!imageNode || imageNode.dataset.fallbackBound === 'true') return;

    imageNode.dataset.fallbackBound = 'true';
    imageNode.addEventListener('error', () => {
        const fallbackSrc = imageNode.dataset.fallback;
        if (!fallbackSrc || imageNode.dataset.fallbackApplied === 'true') return;

        imageNode.dataset.fallbackApplied = 'true';
        imageNode.src = fallbackSrc;
    });
}

function setImageSourceWithFallback(imageNode, primarySrc, fallbackSrc) {
    if (!imageNode) return;

    bindFallbackImage(imageNode);
    imageNode.dataset.fallback = fallbackSrc || '';
    imageNode.dataset.fallbackApplied = 'false';
    imageNode.src = primarySrc || fallbackSrc || '';
}

function initGallery() {
    const gallerySection = document.getElementById('gallery');
    const scrollContainer = document.getElementById('gallery-scroll');
    if (!scrollContainer) return;

    // GALLERY_PHOTOS is defined in js/gallery-data.js (generated by build-gallery.js)
    const images = ((typeof GALLERY_PHOTOS !== 'undefined') ? GALLERY_PHOTOS : [])
        .map(normalizeGalleryPhoto)
        .filter(Boolean);

    if (!images.length) {
        showGalleryEmpty(scrollContainer);
        return;
    }

    const mountGallery = () => {
        if (scrollContainer.dataset.galleryMounted === 'true') return;
        scrollContainer.dataset.galleryMounted = 'true';
        renderGallery(scrollContainer, images);
        initGalleryNav();
    };

    if ('IntersectionObserver' in window && gallerySection) {
        const observer = new IntersectionObserver((entries) => {
            if (!entries.some((entry) => entry.isIntersecting)) return;
            observer.disconnect();
            mountGallery();
        }, {
            rootMargin: '300px 0px'
        });

        observer.observe(gallerySection);
        return;
    }

    mountGallery();
}

function renderGallery(container, images) {
    container.innerHTML = '';

    images.forEach((imageData, index) => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.innerHTML = `
      <img alt="Alberto Prevedi - Foto ${index + 1}" loading="lazy" decoding="async" width="560" height="760">
      <div class="gallery-item-overlay">
        <div class="gallery-zoom-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            <path d="M11 8v6M8 11h6"/>
          </svg>
        </div>
      </div>
    `;

        const galleryImage = item.querySelector('img');
        setImageSourceWithFallback(galleryImage, imageData.thumb, imageData.original);
        item.addEventListener('click', () => openLightbox(images, index));
        container.appendChild(item);
    });
}

function showGalleryEmpty(container) {
    container.innerHTML = `
    <div class="gallery-empty" style="width:100%;">
      <p>📸 Le foto saranno disponibili a breve.</p>
      <p style="font-size:0.85rem; margin-top:0.5rem; opacity:0.7;">Aggiungi le immagini nella cartella <code>photos/</code></p>
    </div>
  `;
}

/* Gallery carousel navigation */
function initGalleryNav() {
    const scrollContainer = document.getElementById('gallery-scroll');
    const prevBtn = document.getElementById('gallery-prev');
    const nextBtn = document.getElementById('gallery-next');

    if (!scrollContainer || !prevBtn || !nextBtn) return;

    const scrollAmount = 300;

    prevBtn.addEventListener('click', () => {
        scrollContainer.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    });

    nextBtn.addEventListener('click', () => {
        scrollContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    });
}

/* ── Lightbox ── */
let currentLightboxIndex = 0;
let currentLightboxImages = [];

function openLightbox(images, index) {
    currentLightboxImages = images;
    currentLightboxIndex = index;

    const imageData = normalizeGalleryPhoto(images[index]);
    if (!imageData) return;

    const lightbox = document.getElementById('lightbox');
    const lightboxImg = lightbox.querySelector('img');
    setImageSourceWithFallback(lightboxImg, imageData.lightbox, imageData.original);
    lightboxImg.alt = `Alberto Prevedi - Foto ${index + 1}`;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
}

function navigateLightbox(direction) {
    currentLightboxIndex += direction;
    if (currentLightboxIndex < 0) currentLightboxIndex = currentLightboxImages.length - 1;
    if (currentLightboxIndex >= currentLightboxImages.length) currentLightboxIndex = 0;

    const imageData = normalizeGalleryPhoto(currentLightboxImages[currentLightboxIndex]);
    if (!imageData) return;

    const lightbox = document.getElementById('lightbox');
    const lightboxImg = lightbox.querySelector('img');
    setImageSourceWithFallback(lightboxImg, imageData.lightbox, imageData.original);
    lightboxImg.alt = `Alberto Prevedi - Foto ${currentLightboxIndex + 1}`;
}

// Lightbox keyboard navigation
document.addEventListener('keydown', (e) => {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox || !lightbox.classList.contains('active')) return;

    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navigateLightbox(-1);
    if (e.key === 'ArrowRight') navigateLightbox(1);
});

/* ── Contact Form — Google Apps Script Integration ── */
// ⚠️ SOSTITUISCI questo URL con il tuo deployment di Apps Script
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbysJwpfvo4_5_1BTTVQbk2RulyhranIBiZg6AFBOjzfauD8M-749OA9zqF8mC9JS6hu/exec';

function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;
    const feedback = document.getElementById('contact-form-feedback');
    const privacyInput = document.getElementById('contact-privacy');

    const clearFeedback = () => {
        if (!feedback) return;
        feedback.textContent = '';
        feedback.classList.remove('is-visible');
    };

    const showFeedback = (message) => {
        if (!feedback) return;
        feedback.textContent = message;
        feedback.classList.add('is-visible');
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearFeedback();

        if (privacyInput && !privacyInput.checked) {
            showFeedback('Devi accettare l\'informativa privacy per inviare il messaggio.');
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnHTML = submitBtn.innerHTML;

        // Se l'URL non è stato configurato, fallback a mailto
        if (APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL_HERE') {
            fallbackMailto(form);
            return;
        }

        // Loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
      <svg class="spinner" viewBox="0 0 24 24" width="18" height="18" style="animation: spin 1s linear infinite;">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="31.4 31.4" stroke-linecap="round"/>
      </svg>
      Invio in corso...
    `;

        const formData = new FormData(form);
        const payload = {
            name: formData.get('name'),
            email: formData.get('email'),
            subject: formData.get('subject'),
            message: formData.get('message'),
            privacyConsent: privacyInput ? privacyInput.checked : false,
            privacyConsentAt: privacyInput && privacyInput.checked ? new Date().toISOString() : '',
            privacyPolicyVersion: '2026-04-16'
        };

        try {
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'text/plain' }
            });

            const result = await response.json();

            if (result.success) {
                // Success state
                submitBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          Messaggio inviato!
        `;
                submitBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                form.reset();
                clearFeedback();

                // Reset after 4 seconds
                setTimeout(() => {
                    submitBtn.innerHTML = originalBtnHTML;
                    submitBtn.style.background = '';
                    submitBtn.disabled = false;
                }, 4000);
            } else {
                throw new Error(result.message || 'Errore invio');
            }
        } catch (error) {
            showFeedback('Invio non riuscito. Riprova tra qualche secondo.');
            // Error state
            submitBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
          <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        Errore — Riprova
      `;
            submitBtn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';

            setTimeout(() => {
                submitBtn.innerHTML = originalBtnHTML;
                submitBtn.style.background = '';
                submitBtn.disabled = false;
            }, 3000);
        }
    });
}

function fallbackMailto(form) {
    const formData = new FormData(form);
    const subject = encodeURIComponent(formData.get('subject') || 'Richiesta informazioni');
    const body = encodeURIComponent(
        `Nome: ${formData.get('name')}\nEmail: ${formData.get('email')}\n\n${formData.get('message')}`
    );
    window.location.href = `mailto:albertoprevedi@gmail.com?subject=${subject}&body=${body}`;
}

/* ── Program Options Toggle ── */
function initProgramFilters() {
    // Main accordions (program cards + coaching card)
    const toggleBtns = document.querySelectorAll('.program-toggle-btn');

    toggleBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const optionsDiv = btn.previousElementSibling;
            if (!optionsDiv || !optionsDiv.classList.contains('program-options')) return;

            const isOpen = optionsDiv.classList.contains('open');

            // Close all top-level options
            document.querySelectorAll('.program-options').forEach(opt => opt.classList.remove('open'));
            document.querySelectorAll('.program-toggle-btn').forEach(b => b.classList.remove('open'));
            // Also close any nested sub-options
            document.querySelectorAll('.coaching-sub-options').forEach(s => s.classList.remove('open'));
            document.querySelectorAll('.coaching-sub-toggle').forEach(b => b.classList.remove('open'));

            if (!isOpen) {
                optionsDiv.classList.add('open');
                btn.classList.add('open');
            }
        });
    });

    // Nested coaching sub-toggle
    document.addEventListener('click', (e) => {
        const subBtn = e.target.closest('.coaching-sub-toggle');
        if (!subBtn) return;
        e.preventDefault();
        const subOptions = subBtn.nextElementSibling;
        if (!subOptions || !subOptions.classList.contains('coaching-sub-options')) return;
        const isOpen = subOptions.classList.contains('open');
        subOptions.classList.toggle('open', !isOpen);
        subBtn.classList.toggle('open', !isOpen);
    });
}

function initServicePurchaseToggles() {
    const toggles = document.querySelectorAll('[data-service-toggle-target]');
    if (!toggles.length) return;

    function syncToggleState(targetId, isOpen) {
        document.querySelectorAll(`[data-service-toggle-target="${targetId}"]`).forEach((toggle) => {
            toggle.classList.toggle('open', isOpen);
            toggle.setAttribute('aria-expanded', String(isOpen));
        });
    }

    toggles.forEach((toggle) => {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = toggle.getAttribute('data-service-toggle-target');
            const target = targetId ? document.getElementById(targetId) : null;
            if (!target) return;

            const isOpen = target.classList.contains('open');

            document.querySelectorAll('.service-purchase-options').forEach((options) => {
                options.classList.remove('open');
            });
            toggles.forEach((node) => {
                node.classList.remove('open');
                node.setAttribute('aria-expanded', 'false');
            });

            if (!isOpen) {
                target.classList.add('open');
                syncToggleState(targetId, true);
            }
        });
    });
}
