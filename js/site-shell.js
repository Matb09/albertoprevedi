const SITE_PAGE_BY_FILE = {
    '': 'home',
    'index.html': 'home',
    'chi-sono.html': 'chi-sono',
    'coaching.html': 'coaching',
    'servizi.html': 'servizi',
    'programmi.html': 'servizi',
    'programma.html': 'servizi',
    'carrello.html': 'servizi',
    'checkout.html': 'servizi',
    'checkout-success.html': 'servizi',
    'checkout-cancel.html': 'servizi',
    'gallery.html': 'gallery',
    'contatti.html': 'contatti'
};

const SITE_NAV_LINKS = [
    { key: 'chi-sono', href: 'chi-sono.html', label: 'Chi Sono' },
    { key: 'coaching', href: 'coaching.html', label: 'Il coaching' },
    { key: 'servizi', href: 'servizi.html', label: 'Servizi' },
    { key: 'gallery', href: 'gallery.html', label: 'Gallery' },
    { key: 'contatti', href: 'contatti.html', label: 'Contatti' }
];

document.addEventListener('DOMContentLoaded', () => {
    mountSiteNavigation();
    mountSiteFooter();
});

function getCurrentFileName() {
    const pathname = window.location.pathname || '';
    const fileName = pathname.split('/').pop() || '';
    return fileName.toLowerCase();
}

function getCurrentPageKey() {
    return SITE_PAGE_BY_FILE[getCurrentFileName()] || '';
}

function mountSiteNavigation() {
    const mount = document.querySelector('[data-site-nav]');
    if (!mount) return;

    const currentPage = getCurrentPageKey();
    const navLinks = SITE_NAV_LINKS.map((link) => {
        const activeClass = currentPage === link.key ? ' active' : '';
        return `<a href="${link.href}" class="${activeClass.trim()}">${link.label}</a>`;
    }).join('');

    mount.innerHTML = `
        <nav class="navbar" id="navbar">
            <div class="container">
                <a href="index.html" class="navbar-brand">Alberto<span>Prevedi</span></a>
                <div class="nav-links" id="nav-links">
                    ${navLinks}
                    <a href="servizi.html#programmi-allenamento" class="nav-cart-link" aria-label="Apri carrello">
                        <svg class="nav-cart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <circle cx="9" cy="20" r="1"></circle>
                            <circle cx="17" cy="20" r="1"></circle>
                            <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L22 7H7"></path>
                        </svg>
                        <span class="cart-badge" data-cart-count>0</span>
                    </a>
                </div>
                <button class="hamburger" id="hamburger" aria-label="Menu">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
            </div>
        </nav>
    `;
}

function mountSiteFooter() {
    const mount = document.querySelector('[data-site-footer]');
    if (!mount) return;

    const footerMenuLinks = [
        { href: 'index.html', label: 'Home' },
        ...SITE_NAV_LINKS.map((link) => ({ href: link.href, label: link.label }))
    ];

    const menuLinks = footerMenuLinks.map((link) => {
        return `<a href="${link.href}">${link.label}</a>`;
    }).join('');

    mount.innerHTML = `
        <footer class="footer">
            <div class="container">
                <div class="footer-shell">
                    <div class="footer-shell-top">
                        <div class="footer-brand-block">
                            <div class="footer-brand">Alberto<span>Prevedi</span></div>
                            <p class="footer-brand-copy">Bodybuilding, Nutrizione e prep. Gare</p>
                            <div class="social-links">
                                <a href="https://www.instagram.com/albe_prepcoach/" target="_blank" rel="noopener" class="social-link" aria-label="Instagram" title="Instagram">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                                    </svg>
                                </a>
                                <a href="https://www.youtube.com/@albe_prepcoach" target="_blank" rel="noopener" class="social-link" aria-label="YouTube" title="YouTube">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path>
                                        <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
                                    </svg>
                                </a>
                                <a href="https://www.tiktok.com/@albe_prepcoach" target="_blank" rel="noopener" class="social-link" aria-label="TikTok" title="TikTok">
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1 0-5.78 2.86 2.86 0 0 1 .89.14V9.02a6.29 6.29 0 0 0-.89-.06 6.34 6.34 0 1 0 6.34 6.34V9.87a8.16 8.16 0 0 0 3.76.92V7.34a4.85 4.85 0 0 1-.01-.65z"></path>
                                    </svg>
                                </a>
                                <a href="https://www.facebook.com/alberto.prevedi" target="_blank" rel="noopener" class="social-link" aria-label="Facebook" title="Facebook">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                                    </svg>
                                </a>
                                <a href="https://wa.me/393887587034" target="_blank" rel="noopener" class="social-link" aria-label="WhatsApp" title="WhatsApp">
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"></path>
                                        <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 0 1-4.243-1.212l-.256-.16-2.867.852.852-2.867-.16-.256A8 8 0 1 1 12 20z"></path>
                                    </svg>
                                </a>
                                <a href="mailto:albertoprevedi@gmail.com" class="social-link" aria-label="Email" title="Email">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                        <polyline points="22,6 12,13 2,6"></polyline>
                                    </svg>
                                </a>
                            </div>
                        </div>

                        <div class="footer-card">
                            <p class="footer-card-label">Partner</p>
                            <div class="footer-partner-list">
                                <a href="https://nutraff.com?aff=121" target="_blank" rel="noopener" class="footer-partner-link">
                                    <div class="footer-partner-logo-wrap">
                                        <img src="assets/partners/Logo_Nutraff_Athletics_Black_comp.webp" alt="Logo Nutraff Athletics" class="footer-partner-logo">
                                    </div>
                                    <div class="footer-partner-copy">
                                        <strong>NUTRAFF</strong>
                                        <span>Codice sconto: ALBECOACH</span>
                                    </div>
                                </a>
                                <a href="https://genolift.com?ta_aff=4BME3NQ2JS&discount=ALBECOACH15" target="_blank" rel="noopener" class="footer-partner-link">
                                    <div class="footer-partner-logo-wrap footer-partner-logo-wrap--dark">
                                        <img src="assets/partners/IMG_0341-removebg-preview_1.webp" alt="Logo Genolift" class="footer-partner-logo">
                                    </div>
                                    <div class="footer-partner-copy">
                                        <strong>GENOLIFT</strong>
                                        <span>Codice sconto: ALBECOACH15</span>
                                    </div>
                                </a>
                            </div>
                        </div>

                        <div class="footer-card">
                            <p class="footer-card-label">Pagamenti</p>
                            <div class="footer-payment-row" aria-label="Metodi di pagamento">
                                <div class="payment-logo-card">
                                    <img src="assets/payments/visa.svg" alt="Visa" class="payment-logo payment-logo--visa">
                                </div>
                                <div class="payment-logo-card">
                                    <img src="assets/payments/mastercard.svg" alt="Mastercard" class="payment-logo payment-logo--mastercard">
                                </div>
                                <div class="payment-logo-card">
                                    <img src="assets/payments/paypal.svg" alt="PayPal" class="payment-logo payment-logo--paypal">
                                </div>
                            </div>
                        </div>

                        <div class="footer-card">
                            <p class="footer-card-label">Menu</p>
                            <div class="footer-menu-links">
                                ${menuLinks}
                            </div>
                        </div>
                    </div>

                    <div class="footer-shell-bottom">
                        <div class="footer-legal-links">
                            <a href="privacy.html">Privacy Policy</a>
                            <a href="cookie.html">Cookie Policy</a>
                            <a href="termini-vendita.html">Termini di vendita</a>
                        </div>

                        <p class="footer-copy">&copy; 2026 Alberto Prevedi. Tutti i diritti riservati.</p>
                    </div>
                </div>
            </div>
        </footer>
    `;
}
