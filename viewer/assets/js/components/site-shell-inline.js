// Site Shell Components - Independent inline navigation
// Works with file:// protocol and keeps spiral pages separate

(() => {
  // Independent inline navigation - no external dependencies
  const HEADER_HTML = `
    <header class="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-16">
                <div class="flex items-center space-x-8">
                    <div class="flex items-center space-x-2">
                        <a href="https://recursive.eco/index.html" class="flex items-center space-x-2" data-nav>
                            <!-- May 20 2026 round 2: REVERTED from h-12 back to
                                 h-20. At h-12 (48px) the spiral SVG renders
                                 its 0.8-unit stroke at sub-pixel width and
                                 effectively disappears — the user saw a blank
                                 area where the spiral animation should be.
                                 The spiral path was designed for ~80px display
                                 (strokeWidth 0.8 on a 100-unit viewBox needs
                                 the container at h-20 to be visible). The
                                 visual misalignment with Flow's h-12 logo is
                                 a real cost, but the animated spiral
                                 identity is the more important constraint
                                 — the spiral IS the brand. Flow's header
                                 logo could be enlarged in a future pass to
                                 match this h-20 instead. -->
                            <div id="header-logo-container" class="h-20 w-20">
                                <!-- Animated spiral logo will be inserted here by JavaScript -->
                            </div>
                        </a>
                    </div>

                    <!-- Navigation: Home | Journal | Create | Library -->
                    <!-- May 20 2026: text-gray-600 → text-gray-700 on all nav
                         links to match Flow's inactiveClass (text-gray-700).
                         The two headers now use the same shade for resting
                         nav links so jumping between Flow and static surfaces
                         doesn't show a subtle color shift. -->
                    <nav class="hidden md:flex space-x-6 items-center">
                        <!-- Home - text links to home, arrow opens dropdown -->
                        <div class="relative dropdown flex items-center">
                            <a href="https://recursive.eco/index.html" class="text-gray-700 hover:text-gray-900 font-medium transition-colors" data-nav>
                                Home
                            </a>
                            <button class="p-1 text-gray-700 hover:text-gray-900 transition-colors dropdown-trigger" aria-label="Show home options">
                                <svg class="h-4 w-4 transition-transform dropdown-arrow" aria-hidden="true"><use href="icons.svg#chevron-down"/></svg>
                            </button>
                            <div class="dropdown-menu absolute top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-20 overflow-hidden opacity-0 invisible transition-all duration-200">
                                <a href="https://recursive.eco/pages/about.html" class="block px-4 py-3 hover:bg-gray-50 transition-colors" data-nav>
                                    <div class="font-medium text-gray-900">About</div>
                                    <div class="text-xs text-gray-500">What this is and how it works</div>
                                </a>
                                <a href="https://recursive.eco/pages/safer-containers.html" class="block px-4 py-3 hover:bg-gray-50 transition-colors" data-nav>
                                    <div class="font-medium text-gray-900">AI Risks &amp; Safer Containers</div>
                                    <div class="text-xs text-gray-500">What we know, what we have done</div>
                                </a>
                                <a href="https://recursive.eco/pages/courses/index.html" class="block px-4 py-3 hover:bg-gray-50 transition-colors" data-nav>
                                    <div class="font-medium text-gray-900">Courses</div>
                                    <div class="text-xs text-gray-500">Vibe code your own tools</div>
                                </a>
                                <a href="https://recursive.eco/pages/studies.html" class="block px-4 py-3 hover:bg-gray-50 transition-colors" data-nav>
                                    <div class="font-medium text-gray-900">Studies</div>
                                    <div class="text-xs text-gray-500">Philosophical explorations</div>
                                </a>
                            </div>
                        </div>

                        <!-- Journal - text links to Journal, arrow opens dropdown.
                             Round 47 (May 28 2026): aligned with Flow's Header.tsx
                             which lets users pick between Stacked (all oracles
                             visible) and Tabbed (one oracle at a time) layouts.
                             Landing was missing this. The two URLs route to
                             flow.recursive.eco; the layout switch is handled
                             there. -->
                        <div class="relative dropdown flex items-center">
                            <a href="https://flow.recursive.eco" class="text-gray-700 hover:text-gray-900 font-medium inline-flex items-center gap-1" data-nav>Journal<svg class="w-3.5 h-3.5" aria-hidden="true"><use href="icons.svg#notebook"/></svg></a>
                            <button class="p-1 text-gray-700 hover:text-gray-900 transition-colors dropdown-trigger" aria-label="Show journal layouts">
                                <svg class="h-4 w-4 transition-transform dropdown-arrow" aria-hidden="true"><use href="icons.svg#chevron-down"/></svg>
                            </button>
                            <div class="dropdown-menu absolute top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-20 overflow-hidden opacity-0 invisible transition-all duration-200">
                                <a href="https://flow.recursive.eco" class="block px-4 py-2.5 hover:bg-gray-50 transition-colors" data-nav>
                                    <div class="font-medium text-gray-900">Stacked view</div>
                                    <div class="text-xs text-gray-500">All oracles visible at once</div>
                                </a>
                                <a href="https://flow.recursive.eco/play?journal=1" class="block px-4 py-2.5 hover:bg-gray-50 transition-colors" data-nav>
                                    <div class="font-medium text-gray-900">Tabbed view</div>
                                    <div class="text-xs text-gray-500">One oracle at a time, tap to flip</div>
                                </a>
                            </div>
                        </div>

                        <a href="https://flow.recursive.eco/create/dashboard/unified/new" class="text-gray-700 hover:text-gray-900 font-medium inline-flex items-center gap-1" data-nav>Create<svg class="w-3.5 h-3.5" aria-hidden="true"><use href="icons.svg#pencil"/></svg></a>

                        <!-- Library - text links to library, arrow opens dropdown -->
                        <div class="relative dropdown flex items-center">
                            <a href="https://flow.recursive.eco/library" class="text-gray-700 hover:text-gray-900 font-medium transition-colors inline-flex items-center gap-1" data-nav>
                                Library<svg class="w-3.5 h-3.5" aria-hidden="true"><use href="icons.svg#library"/></svg>
                            </a>
                            <button class="p-1 text-gray-700 hover:text-gray-900 transition-colors dropdown-trigger" aria-label="Show library channels">
                                <svg class="h-4 w-4 transition-transform dropdown-arrow" aria-hidden="true"><use href="icons.svg#chevron-down"/></svg>
                            </button>
                            <!-- May 21 2026: dropdown restructured to match
                                 the Flow Next.js Header (apps/flow/src/components/
                                 shared/Header.tsx). Secondary subtitle text
                                 removed; "Resources" channel renamed to
                                 "Parenting"; My Library section (My
                                 Collection + Dashboard) added at the top,
                                 hidden by default and shown only when the
                                 user is signed in (wired via initializeAuthState
                                 below). -->
                            <div class="dropdown-menu absolute top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-20 overflow-hidden opacity-0 invisible transition-all duration-200">
                                <!-- My Library — purple block, shown when signed in -->
                                <div id="library-my-section" class="hidden">
                                    <div class="px-4 py-1.5 text-xs font-semibold text-purple-600 uppercase tracking-wider bg-purple-50">My Library</div>
                                    <a id="library-my-collection" href="https://flow.recursive.eco/library" class="block px-4 py-2.5 hover:bg-purple-50 transition-colors" data-nav>
                                        <span class="font-medium text-purple-700">Personal Channel</span>
                                    </a>
                                    <a href="https://flow.recursive.eco/library?view=mine" class="block px-4 py-2.5 hover:bg-purple-50 transition-colors border-b border-gray-100" data-nav>
                                        <span class="font-medium text-purple-700">My Grammars</span>
                                    </a>
                                </div>
                                <!-- Browse All -->
                                <a href="https://flow.recursive.eco/library" class="block px-4 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-100" data-nav>
                                    <span class="font-medium text-gray-900">Browse All</span>
                                </a>
                                <!-- Grammars -->
                                <div class="px-4 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">Grammars</div>
                                <a href="https://flow.recursive.eco/library/channels/kids-stories" class="block px-4 py-2 hover:bg-gray-50 transition-colors" data-nav>
                                    <span class="font-medium text-gray-900">Kids Stories</span>
                                </a>
                                <a href="https://flow.recursive.eco/library/channels/tarot" class="block px-4 py-2 hover:bg-gray-50 transition-colors" data-nav>
                                    <span class="font-medium text-gray-900">Tarot</span>
                                </a>
                                <a href="https://flow.recursive.eco/library/channels/astrology" class="block px-4 py-2 hover:bg-gray-50 transition-colors" data-nav>
                                    <span class="font-medium text-gray-900">Astrology</span>
                                </a>
                                <a href="https://flow.recursive.eco/library/channels/iching" class="block px-4 py-2 hover:bg-gray-50 transition-colors" data-nav>
                                    <span class="font-medium text-gray-900">I Ching</span>
                                </a>
                                <!-- Resources -->
                                <div class="px-4 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">Resources</div>
                                <a href="https://flow.recursive.eco/library/channels/wellness" class="block px-4 py-2 hover:bg-gray-50 transition-colors" data-nav>
                                    <span class="font-medium text-gray-900">Wellness</span>
                                </a>
                                <a href="https://flow.recursive.eco/library/channels/resources" class="block px-4 py-2 hover:bg-gray-50 transition-colors" data-nav>
                                    <span class="font-medium text-gray-900">Parenting</span>
                                </a>
                                <a href="https://flow.recursive.eco/library/channels/recursive-learning" class="block px-4 py-2 hover:bg-gray-50 transition-colors" data-nav>
                                    <span class="font-medium text-gray-900">Recursive Learning</span>
                                </a>
                            </div>
                        </div>
                    </nav>
                </div>

                <div class="flex items-center space-x-4">
                    <a id="desktop-auth-link" href="https://flow.recursive.eco"
                       class="hidden sm:inline-flex text-gray-700 hover:text-gray-900 font-medium transition-colors">
                        Sign In
                    </a>
                    <button id="desktop-sign-out" class="hidden sm:hidden text-xs text-gray-400 hover:text-gray-600 transition-colors">
                        Sign Out
                    </button>

                    <!-- Mobile menu button -->
                    <button id="mobile-menu-button" class="md:hidden p-2 text-gray-700 hover:text-gray-900" aria-label="Open menu">
                        <svg class="h-6 w-6" aria-hidden="true"><use href="icons.svg#menu"/></svg>
                    </button>
                </div>
            </div>

            <!-- Mobile menu panel - same poem order -->
            <div id="mobile-menu" class="md:hidden hidden max-h-[calc(100vh-4rem)] overflow-y-auto">
                <div class="px-2 pt-2 pb-3 space-y-1 bg-white border-t border-gray-200">
                    <!-- Home Section -->
                    <div class="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Home
                    </div>
                    <a href="https://recursive.eco/pages/about.html" class="block pl-6 pr-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50" data-nav>
                        About
                    </a>
                    <a href="https://recursive.eco/pages/safer-containers.html" class="block pl-6 pr-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50" data-nav>
                        AI Risks &amp; Safer Containers
                    </a>
                    <a href="https://recursive.eco/pages/courses/index.html" class="block pl-6 pr-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50" data-nav>
                        Courses
                    </a>
                    <a href="https://recursive.eco/pages/studies.html" class="block pl-6 pr-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50" data-nav>
                        Studies
                    </a>

                    <!-- Divider -->
                    <div class="border-t border-gray-200 my-2"></div>

                    <!-- Journal Section — Stacked / Tabbed picker (matches Flow Header) -->
                    <div class="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        Journal<svg class="w-3.5 h-3.5" aria-hidden="true"><use href="icons.svg#notebook"/></svg>
                    </div>
                    <a href="https://flow.recursive.eco" class="block pl-6 pr-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50" data-nav>
                        Stacked view
                    </a>
                    <a href="https://flow.recursive.eco/play?journal=1" class="block pl-6 pr-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50" data-nav>
                        Tabbed view
                    </a>

                    <a href="https://flow.recursive.eco/create/dashboard/unified/new" class="flex items-center gap-1.5 px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50" data-nav>
                        Create
                        <svg class="w-4 h-4" aria-hidden="true"><use href="icons.svg#pencil"/></svg>
                    </a>

                    <!-- Divider -->
                    <div class="border-t border-gray-200 my-2"></div>

                    <!-- Library Section -->
                    <div class="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        Library<svg class="w-3.5 h-3.5" aria-hidden="true"><use href="icons.svg#library"/></svg>
                    </div>
                    <!-- My Library — purple, only when signed in -->
                    <div id="mobile-library-my-section" class="hidden">
                        <div class="pl-6 pr-3 py-1 text-xs font-semibold text-purple-600 uppercase tracking-wider">My Library</div>
                        <a id="mobile-library-my-collection" href="https://flow.recursive.eco/library" class="block pl-8 pr-3 py-2 rounded-md text-base font-medium text-purple-700 hover:bg-purple-50" data-nav>
                            Personal Channel
                        </a>
                        <a href="https://flow.recursive.eco/library?view=mine" class="block pl-8 pr-3 py-2 rounded-md text-base font-medium text-purple-700 hover:bg-purple-50" data-nav>
                            My Grammars
                        </a>
                    </div>
                    <a href="https://flow.recursive.eco/library" class="block pl-6 pr-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50" data-nav>
                        Browse All
                    </a>
                    <!-- Grammars -->
                    <div class="pl-6 pr-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Grammars
                    </div>
                    <a href="https://flow.recursive.eco/library/channels/kids-stories" class="block pl-8 pr-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50" data-nav>
                        Kids Stories
                    </a>
                    <a href="https://flow.recursive.eco/library/channels/tarot" class="block pl-8 pr-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50" data-nav>
                        Tarot
                    </a>
                    <a href="https://flow.recursive.eco/library/channels/astrology" class="block pl-8 pr-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50" data-nav>
                        Astrology
                    </a>
                    <a href="https://flow.recursive.eco/library/channels/iching" class="block pl-8 pr-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50" data-nav>
                        I Ching
                    </a>
                    <!-- Resources -->
                    <div class="pl-6 pr-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Resources
                    </div>
                    <a href="https://flow.recursive.eco/library/channels/wellness" class="block pl-8 pr-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50" data-nav>
                        Wellness
                    </a>
                    <a href="https://flow.recursive.eco/library/channels/resources" class="block pl-8 pr-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50" data-nav>
                        Parenting
                    </a>
                    <a href="https://flow.recursive.eco/library/channels/recursive-learning" class="block pl-8 pr-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50" data-nav>
                        Recursive Learning
                    </a>
                    <!-- Divider -->
                    <div class="border-t border-gray-200 my-2"></div>

                    <a id="mobile-auth-link" href="https://flow.recursive.eco"
                       class="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50" data-nav>
                        Sign In
                    </a>
                    <button id="mobile-sign-out" class="hidden w-full text-left px-3 py-2 rounded-md text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50">
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    </header>
  `;

  // Independent footer HTML
  const FOOTER_HTML = `
    <footer class="bg-gray-900 text-white py-12">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center">
                <div class="flex items-center justify-center mb-4">
                    <div id="footer-logo-container" class="h-24 w-24">
                        <!-- Animated spiral logo will be inserted here by JavaScript -->
                    </div>
                </div>

                <div class="bg-amber-800 text-amber-200 p-4 rounded-lg mb-6 max-w-2xl mx-auto">
                    <div class="text-lg font-semibold mb-2">Under construction, recursive spiral</div>
                </div>

                <!-- Email Collection -->
                <div class="mb-8 max-w-2xl mx-auto">
                    <h3 class="text-2xl font-bold text-white mb-3">Join the Recursive Public</h3>
                    <p class="text-gray-300 mb-6 leading-relaxed">
                        Get updates on new tools, courses, and experiments as we make sense of things together through open practice.
                    </p>

                    <form id="footer-email-form" class="max-w-md mx-auto">
                        <div class="flex flex-col sm:flex-row gap-3">
                            <input
                                type="email"
                                id="footer-email-input"
                                placeholder="Enter your email"
                                required
                                maxlength="254"
                                pattern="[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}"
                                title="Please enter a valid email address"
                                class="flex-1 px-4 py-3 rounded-lg border border-gray-600 bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                            <button
                                type="submit"
                                class="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors whitespace-nowrap"
                            >
                                Sign Up
                            </button>
                        </div>
                        <p id="footer-form-message" class="mt-3 text-center text-sm hidden"></p>
                    </form>
                </div>

                <div class="flex flex-wrap justify-center items-center gap-x-6 gap-y-2">
                    <a href="https://recursive.eco/pages/about.html" class="text-gray-400 hover:text-white transition-colors">
                        About
                    </a>
                    <a href="https://recursive.eco/pages/safer-containers.html" class="text-gray-400 hover:text-white transition-colors">
                        AI Risks &amp; Safer Containers
                    </a>
                    <a href="https://lifeisprocess.substack.com/" target="_blank" rel="noopener noreferrer" class="text-gray-400 hover:text-white transition-colors">
                        Substack
                    </a>
                    <a href="https://www.goodreads.com/review/list/176283912-playfulprocess?shelf=read" target="_blank" rel="noopener noreferrer" class="text-gray-400 hover:text-white transition-colors">
                        Goodreads
                    </a>
                    <a href="mailto:pp@playfulprocess.com" class="text-gray-400 hover:text-white transition-colors">
                        Contact: pp@playfulprocess.com
                    </a>
                </div>
            </div>

            <div class="mt-8 pt-8 border-t border-gray-800 text-gray-500 text-sm">
                <p class="mb-2 text-center">User content remains with creators | © 2025 Recursive.eco by PlayfulProcess LLC</p>
            </div>
        </div>
    </footer>
  `;

  // Spiral Header HTML template
  const SPIRAL_HEADER_HTML = `
    <header class="bg-white border-b border-gray-200">
        <div class="container mx-auto px-6 py-4">
            <nav class="flex justify-between items-center">
                <!-- Back to Home -->
                <div>
                    <a href="https://recursive.eco/index.html" class="flex items-center space-x-2 text-gray-600 hover:text-purple-600 transition-colors" data-nav>
                        <svg class="h-5 w-5" aria-hidden="true"><use href="icons.svg#arrow-left"/></svg>
                        <span class="font-medium">Back to Home</span>
                    </a>
                </div>
                
                <!-- Interactive Study Title -->
                <div>
                    <span class="text-gray-700 font-medium">Logo Generator - Interactive Study</span>
                </div>
            </nav>
        </div>
    </header>
  `;

  function injectHTML(el, html, type = 'header') {
    el.innerHTML = html;

    // Mark active navigation
    const here = new URL(window.location.href);
    el.querySelectorAll('[data-nav]').forEach(a => {
      const href = a.getAttribute('href');
      if (!href) return;

      // Skip external URLs
      if (href.startsWith('http') && !href.startsWith(here.origin)) {
        return;
      }

      try {
        const u = new URL(href, here.origin);
        const isCurrentPage = u.pathname === here.pathname ||
                             (u.pathname === '/index.html' && here.pathname === '/') ||
                             (u.pathname === '/' && here.pathname === '/index.html') ||
                             (u.pathname === '/index.html' && (here.pathname === '/' || here.pathname === '/index.html')) ||
                             (href.includes('pages/') && here.pathname.includes(href.split('/').pop()));

        if (isCurrentPage) {
          a.setAttribute('aria-current', 'page');
          a.classList.add('is-active');

          // Add visual highlighting for mobile menu items
          if (a.classList.contains('block')) {
            a.classList.add('bg-purple-50', 'text-purple-600', 'font-semibold');
          }

          // Special styling for spiral tools (purple background when active)
          if (a.hasAttribute('data-spiral-tool')) {
            a.classList.remove('text-gray-600', 'hover:text-purple-600', 'hover:bg-purple-50');
            a.classList.add('bg-purple-600', 'text-white', '!text-white');
            // Force white text with inline style for better specificity
            a.style.color = 'white';
          }
        }
      } catch (e) {
        console.log('URL parsing error for nav:', href, e);
      }
    });

    // Initialize spiral header if this is a header component
    if (type === 'header') {
      initializeSpiralHeader();
    }

    // Initialize dropdown functionality
    initializeDropdowns();

    // Initialize mobile menu
    initializeMobileMenu();
  }

  function initializeMobileMenu() {
    // Prevent duplicate initialization
    if (window.__mobileMenuInitialized) {
      return;
    }
    window.__mobileMenuInitialized = true;

    // Initialize immediately on next tick
    requestAnimationFrame(() => {
      const menuButton = document.getElementById('mobile-menu-button');
      const mobileMenu = document.getElementById('mobile-menu');

      if (menuButton && mobileMenu) {
        // Force high z-index and clickability (use !important via inline style)
        menuButton.style.cssText = `
          position: relative !important;
          z-index: 99999 !important;
          pointer-events: auto !important;
          touch-action: manipulation !important;
          -webkit-tap-highlight-color: rgba(0,0,0,0.1);
        `;

        // Add visual feedback for touch
        let touchActive = false;

        // Toggle function
        const toggleMenu = (e) => {
          e.preventDefault();
          e.stopPropagation();

          // Prevent rapid-fire clicks
          if (touchActive) return;
          touchActive = true;
          setTimeout(() => touchActive = false, 300);

          mobileMenu.classList.toggle('hidden');
          console.log('Mobile menu toggled:', !mobileMenu.classList.contains('hidden'));

          // Visual feedback
          menuButton.style.opacity = '0.5';
          setTimeout(() => menuButton.style.opacity = '1', 150);
        };

        // Touchstart for immediate visual feedback
        menuButton.addEventListener('touchstart', (e) => {
          menuButton.style.opacity = '0.7';
        }, { passive: true });

        // Use touchend for actual toggle (faster than click on mobile)
        menuButton.addEventListener('touchend', toggleMenu, { passive: false });

        // Keep click for desktop
        menuButton.addEventListener('click', (e) => {
          // Only handle if not already handled by touch
          if (!touchActive) {
            toggleMenu(e);
          }
        });

        // Close menu when clicking outside
        const closeOnOutsideClick = (e) => {
          if (!menuButton.contains(e.target) && !mobileMenu.contains(e.target)) {
            mobileMenu.classList.add('hidden');
          }
        };
        document.addEventListener('touchend', closeOnOutsideClick);
        document.addEventListener('click', closeOnOutsideClick);

        // Close menu when clicking a link
        mobileMenu.querySelectorAll('a').forEach(link => {
          link.addEventListener('click', () => {
            mobileMenu.classList.add('hidden');
          });
        });

        // Continuously enforce z-index (in case spiral canvas is added later)
        const enforceZIndex = () => {
          if (menuButton) {
            menuButton.style.zIndex = '99999';
            menuButton.style.position = 'relative';
            menuButton.style.pointerEvents = 'auto';
          }
        };
        setInterval(enforceZIndex, 1000); // Re-enforce every second

      } else {
        console.log('Mobile menu elements not found:', {
          button: !!menuButton,
          menu: !!mobileMenu
        });
      }
    });
  }

  function initializeSpiralHeader() {
    const init = () => {
      const container = document.getElementById('header-logo-container');
      if (window.createSpiral && container) {
        // Render like the hero spiral: a static, full path (no draw-on
        // strokeDasharray animation, which segmented the line and looked
        // "broken" at the header's small size). Thicker stroke so the line
        // stays solid when scaled down — at 0.8 it went sub-pixel. The hero
        // stays exactly as-is; this just makes the header match its calm look.
        // (Jun 3 2026 builder direction.)
        window.createSpiral(container, {
          size: 100,
          turns: 6,
          color: '#9333ea',
          strokeWidth: 4,
          opacity: 0.85,
          animated: false
        });
      } else if (container) {
        console.log('Spiral container found but createSpiral not available yet');
      }
    };

    if (window.createSpiral) {
      init();
    } else {
      // Wait for spiral.js to load
      let attempts = 0;
      const maxAttempts = 50;
      const checkSpiral = () => {
        attempts++;
        if (window.createSpiral) {
          init();
        } else if (attempts < maxAttempts) {
          setTimeout(checkSpiral, 100);
        } else {
          console.log('Spiral functions not found after waiting');
        }
      };
      setTimeout(checkSpiral, 100);
    }
  }

  function initializeDropdowns() {
    const dropdowns = document.querySelectorAll('.dropdown');
    
    dropdowns.forEach(dropdown => {
      const trigger = dropdown.querySelector('.dropdown-trigger');
      const menu = dropdown.querySelector('.dropdown-menu');
      const arrow = dropdown.querySelector('.dropdown-arrow');
      
      if (!trigger || !menu || !arrow) return;
      
      let isOpen = false;
      
      // Toggle dropdown
      trigger.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Close other dropdowns first
        dropdowns.forEach(otherDropdown => {
          if (otherDropdown !== dropdown) {
            const otherMenu = otherDropdown.querySelector('.dropdown-menu');
            const otherArrow = otherDropdown.querySelector('.dropdown-arrow');
            if (otherMenu && otherArrow) {
              otherMenu.classList.add('opacity-0', 'invisible');
              otherArrow.classList.remove('rotate-180');
            }
          }
        });
        
        // Toggle current dropdown
        isOpen = !isOpen;
        if (isOpen) {
          menu.classList.remove('opacity-0', 'invisible');
          arrow.classList.add('rotate-180');
        } else {
          menu.classList.add('opacity-0', 'invisible');
          arrow.classList.remove('rotate-180');
        }
      });
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', function() {
      dropdowns.forEach(dropdown => {
        const menu = dropdown.querySelector('.dropdown-menu');
        const arrow = dropdown.querySelector('.dropdown-arrow');
        if (menu && arrow) {
          menu.classList.add('opacity-0', 'invisible');
          arrow.classList.remove('rotate-180');
        }
      });
    });
    
    // Close dropdowns on menu item click
    document.querySelectorAll('.dropdown-menu a').forEach(link => {
      link.addEventListener('click', function() {
        dropdowns.forEach(dropdown => {
          const menu = dropdown.querySelector('.dropdown-menu');
          const arrow = dropdown.querySelector('.dropdown-arrow');
          if (menu && arrow) {
            menu.classList.add('opacity-0', 'invisible');
            arrow.classList.remove('rotate-180');
          }
        });
      });
    });
  }

  // Site Header Component (recursive.eco platform nav — Journal / Create / Library).
  // Jul 6 2026: registered as <viewer-shell-header>, NOT <site-header>. This repo's
  // own site-header.js (repo root) defines <site-header> — the shared nav every other
  // page uses (Home / Views / Grammars / GitHub) — and astrology-viewer.html now loads
  // it too, so registering the SAME tag name here a second time would throw
  // "already defined" and silently kill every statement after it in this file
  // (SiteFooter/SpiralHeader registration, the signin-modal.js autoload, and the
  // desktop-auth-link/mobile-auth-link click intercept below all live in this one
  // script). Nothing in this repo currently instantiates <viewer-shell-header> — it's
  // kept, renamed rather than deleted, so this class's auth logic (session detection
  // via RecursiveAuth, sign-in/sign-out wiring, the My Library reveal) stays available
  // if a future page wants the full platform header again.
  class SiteHeader extends HTMLElement {
    connectedCallback() {
      injectHTML(this, HEADER_HTML, 'header');
      this.initializeAuthState();
      this.openCrossAppLinksInNewTab();
    }

    // Round 64 (Jun 1 2026): all header nav links that point to flow.recursive.eco
    // cross the landing → flow boundary, so they open in new tabs. Same-app
    // nav (between landing pages) stays same-tab. See CLAUDE.md → Cross-app
    // links rule. Centralized here so we don't sprinkle target="_blank" across
    // every nav anchor in HEADER_HTML.
    openCrossAppLinksInNewTab() {
      this.querySelectorAll('a[data-nav][href*="flow.recursive.eco"]').forEach((a) => {
        a.target = '_blank';
        a.rel = a.rel ? `${a.rel} noopener` : 'noopener';
      });
    }

    initializeAuthState() {
      // Use shared auth module if available, otherwise try directly
      const tryReadSession = () => {
        if (window.RecursiveAuth?.readSessionFromCookies) {
          return window.RecursiveAuth.readSessionFromCookies();
        }
        return null;
      };

      const updateLinks = (session) => {
        if (!session) return;
        const user = session.user;
        if (!user) return;

        const label = user.email || (user.is_anonymous ? 'Guest' : null);
        if (!label) return;

        const accountUrl = 'https://flow.recursive.eco/account';
        const desktopLink = document.getElementById('desktop-auth-link');
        const mobileLink = document.getElementById('mobile-auth-link');
        const desktopSignOut = document.getElementById('desktop-sign-out');
        const mobileSignOut = document.getElementById('mobile-sign-out');

        // May 21 2026: when signed in, reveal the My Library section
        // at the top of the Library dropdown (My Collection + Dashboard)
        // and point My Collection at /library/altar/<user.id>. Mirrors
        // Flow's Header which gates these behind `user`.
        const mySection = document.getElementById('library-my-section');
        const myCollection = document.getElementById('library-my-collection');
        if (user.id && mySection) {
          mySection.classList.remove('hidden');
          if (myCollection) {
            myCollection.href = 'https://flow.recursive.eco/library/altar/' + user.id;
          }
        }
        const mobileMySection = document.getElementById('mobile-library-my-section');
        const mobileMyCollection = document.getElementById('mobile-library-my-collection');
        if (user.id && mobileMySection) {
          mobileMySection.classList.remove('hidden');
          if (mobileMyCollection) {
            mobileMyCollection.href = 'https://flow.recursive.eco/library/altar/' + user.id;
          }
        }

        // May 22 2026 audit-sweep: hero CTA label adapts to auth state.
        // Default label is "Sign In to Create a Personal Channel" (set
        // in the static HTML so visitors see the sign-in signal first).
        // Once auth is detected, swap to the cleaner "Create a Personal
        // Channel" label since the user is already signed in.
        if (user.id) {
          document.querySelectorAll('[data-cta-label][data-signed-in]').forEach(function (el) {
            const next = el.getAttribute('data-signed-in');
            if (next) el.textContent = next;
          });
        }

        // Round 64 (Jun 1 2026): My Account link crosses the landing → flow
        // boundary, so it opens in a new tab. See CLAUDE.md → Cross-app
        // links rule. Same for the mobile menu equivalent.
        if (desktopLink) {
          desktopLink.href = accountUrl;
          desktopLink.textContent = label;
          desktopLink.target = '_blank';
          desktopLink.rel = 'noopener';
          // Smaller text for email, like Flow header
          desktopLink.classList.remove('font-medium');
          desktopLink.classList.add('text-xs');
        }
        if (mobileLink) {
          mobileLink.href = accountUrl;
          mobileLink.textContent = label;
          mobileLink.target = '_blank';
          mobileLink.rel = 'noopener';
          mobileLink.classList.remove('text-base');
          mobileLink.classList.add('text-sm');
        }

        // Show sign out buttons
        if (desktopSignOut) {
          desktopSignOut.classList.remove('sm:hidden');
          desktopSignOut.classList.add('sm:inline-flex');
          desktopSignOut.addEventListener('click', handleSignOut);
        }
        if (mobileSignOut) {
          mobileSignOut.classList.remove('hidden');
          mobileSignOut.addEventListener('click', handleSignOut);
        }
      };

      const handleSignOut = async () => {
        // Clear auth cookies
        const cookieDomain = window.ENV?.AUTH_COOKIE_DOMAIN || '.recursive.eco';
        const storageKey = 'recursive-eco-auth';
        // Clear unchunked
        document.cookie = storageKey + '=; path=/; domain=' + cookieDomain + '; max-age=0; SameSite=Lax; Secure';
        // Clear chunked (up to 20 chunks)
        for (var i = 0; i < 20; i++) {
          document.cookie = storageKey + '.' + i + '=; path=/; domain=' + cookieDomain + '; max-age=0; SameSite=Lax; Secure';
        }

        // Also try signOut via client if available
        var client = window.RecursiveAuth?.getClient?.();
        if (client) {
          try { await client.auth.signOut(); } catch (e) { /* ignore */ }
        }

        // Reload page to reflect signed-out state
        window.location.reload();
      };

      // Try immediately
      const session = tryReadSession();
      if (session) {
        updateLinks(session);
      } else {
        // Retry after auth-init.js loads (it may not be loaded yet)
        let attempts = 0;
        const retry = () => {
          attempts++;
          const s = tryReadSession();
          if (s) { updateLinks(s); return; }
          if (attempts < 20) setTimeout(retry, 100);
        };
        setTimeout(retry, 50);
      }

      // Round 38: also refresh on the custom auth-changed event
      // dispatched by signin-modal.js after a successful sign-in. The
      // page-load retry above gives up after 2s — before round 38, that
      // meant the modal could complete after the retry exhausted and
      // the header would still say "Sign In" until a manual reload.
      // Now we re-read the cookies (which the supabase client has just
      // populated) and update the header in place.
      const authChangeHandler = () => {
        // Brief delay so the supabase client has flushed the session
        // into cookies before we read.
        setTimeout(() => {
          const s = tryReadSession();
          if (s) updateLinks(s);
        }, 50);
      };
      window.addEventListener('recursive:authchanged', authChangeHandler);
    }
  }

  // Site Footer Component
  class SiteFooter extends HTMLElement {
    connectedCallback() {
      injectHTML(this, FOOTER_HTML, 'footer');
      // Initialize footer spiral after injecting HTML
      this.initializeFooterSpiral();
      // Initialize email form
      this.initializeEmailForm();
    }

    initializeFooterSpiral() {
      const init = () => {
        const container = document.getElementById('footer-logo-container');
        if (window.createSpiral && container) {
          // Use the same animation settings as header but with white color for dark background
          window.createSpiral(container, {
            size: 100,
            turns: 6,
            color: '#ffffff', // White for dark footer background
            strokeWidth: 0.8,
            opacity: 0.9,
            animated: true,
            rhythms: {
              breathe: { duration: 12000, timing: 'ease-in-out' },
              draw: { duration: 12000, timing: 'ease-in-out' }
            }
          });
        } else if (container) {
          console.log('Footer spiral container found but createSpiral not available yet');
        }
      };

      if (window.createSpiral) {
        init();
      } else {
        // Wait for spiral.js to load
        let attempts = 0;
        const maxAttempts = 50;
        const checkSpiral = () => {
          attempts++;
          if (window.createSpiral) {
            init();
          } else if (attempts < maxAttempts) {
            setTimeout(checkSpiral, 100);
          } else {
            console.log('Footer spiral functions not found after waiting');
          }
        };
        setTimeout(checkSpiral, 100);
      }
    }

    initializeEmailForm() {
      // Wait for Supabase to be available
      const initForm = () => {
        if (!window.supabase || !window.ENV) {
          console.log('Waiting for Supabase and config...');
          return;
        }

        // Use shared auth client or create a simple one for newsletter
        const supabaseClient = window.RecursiveAuth
          ? window.RecursiveAuth.getSimpleClient()
          : window.supabaseClient;
        if (!supabaseClient) return;

        const form = document.getElementById('footer-email-form');
        if (!form) {
          console.log('Footer email form not found');
          return;
        }

        form.addEventListener('submit', async (e) => {
          e.preventDefault();

          const emailInput = document.getElementById('footer-email-input');
          const messageEl = document.getElementById('footer-form-message');
          const submitButton = e.target.querySelector('button[type="submit"]');

          // Validate email
          const email = emailInput.value.trim();
          if (email.length > 254) {
            messageEl.innerHTML = '❌ Email address is too long';
            messageEl.className = 'mt-3 text-center text-sm text-red-400';
            messageEl.classList.remove('hidden');
            return;
          }

          const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
          if (!emailRegex.test(email)) {
            messageEl.innerHTML = '❌ Please enter a valid email address';
            messageEl.className = 'mt-3 text-center text-sm text-red-400';
            messageEl.classList.remove('hidden');
            return;
          }

          // Disable button and show loading
          submitButton.disabled = true;
          submitButton.textContent = 'Signing up...';
          messageEl.classList.add('hidden');

          try {
            const { data, error } = await supabaseClient
              .from('newsletter_subscribers')
              .insert([{
                email: email,
                subscribed_from: 'footer',
                subscribed: true
              }]);

            if (error) {
              if (error.code === '23505') {
                messageEl.innerHTML = '✅ You\'re already signed up!';
                messageEl.className = 'mt-3 text-center text-sm text-blue-400 font-medium';
              } else {
                throw error;
              }
            } else {
              messageEl.innerHTML = '✅ Welcome to the recursive public!';
              messageEl.className = 'mt-3 text-center text-sm text-blue-400 font-medium';
              emailInput.value = '';
            }
            messageEl.classList.remove('hidden');

          } catch (error) {
            console.error('Error:', error);
            messageEl.innerHTML = '❌ Something went wrong. Please try again or contact <a href="mailto:pp@playfulprocess.com" class="underline hover:text-red-300">pp@playfulprocess.com</a>';
            messageEl.className = 'mt-3 text-center text-sm text-red-400';
            messageEl.classList.remove('hidden');
          } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Sign Up';
          }
        });

      };

      // Try to initialize immediately, or wait for dependencies
      if (window.supabase && window.ENV) {
        initForm();
      } else {
        let attempts = 0;
        const checkDeps = () => {
          attempts++;
          if (window.supabase && window.ENV) {
            initForm();
          } else if (attempts < 50) {
            setTimeout(checkDeps, 100);
          } else {
            console.log('Supabase or ENV not available for footer form');
          }
        };
        setTimeout(checkDeps, 100);
      }
    }
  }

  // Spiral Header Component (for spiral playground pages)
  class SpiralHeader extends HTMLElement {
    connectedCallback() {
      injectHTML(this, SPIRAL_HEADER_HTML, 'header');
      // Cross-app links open in new tab (same rule as SiteHeader). The
      // course-viewer + studies pages use this lighter header.
      this.querySelectorAll('a[data-nav][href*="flow.recursive.eco"]').forEach((a) => {
        a.target = '_blank';
        a.rel = a.rel ? `${a.rel} noopener` : 'noopener';
      });
    }
  }

  // Register custom elements
  customElements.define('viewer-shell-header', SiteHeader);
  customElements.define('site-footer', SiteFooter);
  customElements.define('spiral-header', SpiralHeader);

  // Round 36: auto-inject signin-modal.js so every page with a
  // <site-header> gets the in-place Sign In popup without having to
  // remember a second <script> tag. Round 34 added the tag to 10
  // landing pages by hand — page-level boilerplate that any future
  // page would forget. Defer-loaded, idempotent (skip if already
  // present), gated on document.head existing.
  //
  // Aug 2 2026: the src used to be the page-relative 'assets/js/components/…',
  // which only resolved when the page itself sat in the same directory as
  // assets/. chart.recursive.eco serves this viewer at the site root, so every
  // load asked for /assets/js/components/signin-modal.js and got a 404 (the
  // file lives under /viewer/assets/…). Resolve against THIS script's own URL
  // instead — signin-modal.js is its sibling in every deployment, so the
  // injection now follows the shell wherever it is mounted.
  if (typeof document !== 'undefined' && document.head && !window.SigninModal && !document.querySelector('script[data-signin-modal-autoload]')) {
    const here = (document.currentScript && document.currentScript.src) ||
      (() => {
        const tag = document.querySelector('script[src*="site-shell-inline.js"]');
        return tag ? tag.src : '';
      })();
    const s = document.createElement('script');
    s.src = here
      ? new URL('signin-modal.js', here).href
      : 'assets/js/components/signin-modal.js';
    s.defer = true;
    s.dataset.signinModalAutoload = '1';
    document.head.appendChild(s);
  }

  // Round 25 (May 25 2026): one shared "Sign In" click intercept across
  // every landing page. The auto-injection above ensures window.SigninModal
  // is available; pre-auto-injection pages may have loaded it manually too
  // (harmless — idempotent guard above skips). If for any reason the modal
  // isn't loaded by the time a click fires, the handler falls through to
  // the original navigate behavior.
  //
  // The course-viewer had a duplicate of this intercept inline; that
  // can stay (defensive) or be removed in a separate cleanup. The
  // global handler here is idempotent — re-firing on the same click is
  // a no-op since the modal already opened.
  document.addEventListener('click', async (e) => {
    const target = e.target instanceof Element ? e.target.closest('#desktop-auth-link, #mobile-auth-link') : null;
    if (!target) return;
    if (!window.SigninModal) return; // fall through to href navigation
    // Round 62 (May 31 2026): when the user is already signed-in, the
    // auth link is repurposed as "My Account" → /account (see ~line 696
    // above). Without this guard, the global intercept hijacked the
    // click and popped the SigninModal even for signed-in users —
    // author flagged: "When I click my account in course viewer, the
    // sign in pop up emerges instead of going to my account."
    try {
      const sess = await (window.RecursiveAuth && window.RecursiveAuth.readSessionFromCookies && window.RecursiveAuth.readSessionFromCookies());
      if (sess && sess.user) return; // signed in — let the link navigate to /account
    } catch { /* fall through to modal on detection failure */ }
    e.preventDefault();
    window.SigninModal.open({
      title: 'Sign In',
      description: 'Sign in to save your progress and edit grammars.',
    });
  }, true); // capture phase — intercept before any page-specific handlers

})();