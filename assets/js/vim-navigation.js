class VimNavigation {
    constructor() {
        this.currentLinkIndex = -1;
        this.links = [];
        this.paragraphs = [];
        this.currentParagraphIndex = -1;
        this.searchMode = false;
        this.searchQuery = '';
        this.searchResults = [];
        this.searchResultIndex = -1;
        this.mode = 'normal';

        this.init();
    }

    init() {
        // Create mode indicator
        this.createModeIndicator();
        // Store reference to title cursor
        this.titleCursor = document.querySelector('.site-title .vim-cursor');
        // Update title cursor text if it exists
        if (this.titleCursor && this.titleCursor.textContent === '█') {
            this.titleCursor.textContent = '|';
        }
        // Check if we're in a post
        this.isInPostContent = document.querySelector('.post-content') !== null;
        // Initialize navigation
        this.updateLinksList();
        if (this.isInPostContent) {
            this.updateParagraphsList();
        }
        // Set initial focus for non-homepage
        if (!this.isHomePage) {
            this.focusOnTitleLink();
        }
        // Add keyboard event listener
        document.addEventListener('keydown', this.handleKeyPress.bind(this));
    }

    focusOnTitleLink() {
        // Find the title link (usually first link in breadcrumbs)
        const titleLink = document.querySelector('.breadcrumbs a');
        if (titleLink) {
            this.currentLinkIndex = this.links.indexOf(titleLink);
            this.highlightCurrentElement();
        }
    }

    createModeIndicator() {
        this.modeIndicator = document.createElement('div');
        this.modeIndicator.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            color: var(--primary);
            padding: 5px 10px;
            border-radius: 4px;
            font-family: monospace;
            z-index: 1000;
            border: 1px solid var(--border);
        `;
        this.modeIndicator.textContent = '-- NORMAL --';
        document.body.appendChild(this.modeIndicator);
    }

    updateLinksList() {
        // Get navigation links but not content links or logo
        const allLinks = Array.from(document.querySelectorAll('a')).filter(link => {
            const inSiteTitle = link.closest('.site-title');
            const inPostContent = link.closest('.post-content');
            const inLogo = link.closest('.logo');
            return !inSiteTitle && !inPostContent && !inLogo;
        });

        // Sort links to prioritize breadcrumbs
        this.links = allLinks.sort((a, b) => {
            const aInBreadcrumbs = a.closest('.breadcrumbs') !== null;
            const bInBreadcrumbs = b.closest('.breadcrumbs') !== null;

            if (aInBreadcrumbs && !bInBreadcrumbs) return -1;
            if (!aInBreadcrumbs && bInBreadcrumbs) return 1;

            // If both are breadcrumbs, maintain their order
            if (aInBreadcrumbs && bInBreadcrumbs) {
                return Array.from(document.querySelectorAll('.breadcrumbs a')).indexOf(a) -
                       Array.from(document.querySelectorAll('.breadcrumbs a')).indexOf(b);
            }

            return 0;
        });

        this.currentLinkIndex = -1;
    }

    updateParagraphsList() {
        // Get all block elements in post content
        const postContent = document.querySelector('.post-content');
        if (postContent) {
            // Get all elements in visual order
            const elements = [];

            // Get block elements first
            elements.push(...Array.from(postContent.querySelectorAll('p, h1, h2, h3, h4, h5, h6, blockquote, pre')));

            // Get list items, excluding nested ones
            const listItems = Array.from(postContent.querySelectorAll('li')).filter(li => {
                const parentList = li.parentElement;
                const grandparent = parentList.parentElement;
                return !grandparent || !grandparent.closest('li');
            });

            elements.push(...listItems);

            // Filter out empty elements
            this.paragraphs = elements.filter(el => {
                const text = el.textContent.trim();
                const hasImages = el.querySelector('img') !== null;
                return text.length > 0 || hasImages;
            });
        }
    }

    highlightCurrentElement() {
        // Remove all navigation cursors and selected states
        document.querySelectorAll('.nav-cursor').forEach(cursor => cursor.remove());
        document.querySelectorAll('.nav-selected').forEach(el => el.classList.remove('nav-selected'));

        // Hide title cursor when navigating
        if (this.titleCursor) {
            this.titleCursor.style.display = 'none';
        }

        let currentElement = null;

        // If we're in post content and navigating paragraphs
        if (this.isInPostContent && this.currentParagraphIndex >= 0) {
            currentElement = this.paragraphs[this.currentParagraphIndex];
        }
        // Otherwise, if we're navigating links
        else if (this.currentLinkIndex >= 0 && this.currentLinkIndex < this.links.length) {
            currentElement = this.links[this.currentLinkIndex];
        }

        if (currentElement) {
            // For footer links, post entries, and breadcrumbs, just add selected class
            if (currentElement.closest('.footer') ||
                currentElement.closest('.post-entry') ||
                currentElement.closest('.breadcrumbs')) {
                if (currentElement.closest('.post-entry')) {
                    currentElement.closest('.post-entry').classList.add('nav-selected');
                } else {
                    currentElement.classList.add('nav-selected');
                }
            } else {
                // Create and add vim cursor for other elements
                const cursor = document.createElement('span');
                cursor.className = 'nav-cursor';
                cursor.textContent = '|';
                currentElement.appendChild(cursor);
            }

            // Scroll element into view
            currentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            // Show title cursor when not navigating
            if (this.titleCursor) {
                this.titleCursor.style.display = '';
            }
        }
    }

    handleKeyPress(event) {
        // Handle special keys
        if (event.key === 'G' && !event.shiftKey) {
            return;
        }

        // Allow default behavior for input elements
        if (event.target.tagName.toLowerCase() === 'input' ||
            event.target.tagName.toLowerCase() === 'textarea') {
            return;
        }

        // Prevent default for navigation keys
        if (['j', 'k', 'g', 'G', 'Enter', 'Escape'].includes(event.key)) {
            event.preventDefault();
        }

        // Handle enter key
        if (event.key === 'Enter') {
            if (this.currentLinkIndex >= 0 && this.currentLinkIndex < this.links.length) {
                this.links[this.currentLinkIndex].click();
            }
            return;
        }

        // Update command buffer
        if (event.key === 'g') {
            if (this.commandBuffer === 'g') {
                this.handleNormalMode('g');
                this.commandBuffer = '';
            } else {
                this.commandBuffer = 'g';
                setTimeout(() => {
                    this.commandBuffer = '';
                }, 500);
            }
            return;
        }

        // Clear command buffer for other keys
        this.commandBuffer = '';

        // Handle normal mode navigation
        if (this.mode === 'normal') {
            // Convert Shift+G to 'G' command
            const key = event.key === 'G' && event.shiftKey ? 'G' : event.key;
            this.handleNormalMode(key);
        }
    }

    handleNormalMode(key) {
        // Handle navigation in post content
        if (this.isInPostContent) {
            switch (key) {
                case 'j': // Move down
                    if (this.currentLinkIndex >= 0) {
                        const currentLink = this.links[this.currentLinkIndex];
                        const inBreadcrumbs = currentLink.closest('.breadcrumbs') !== null;

                        if (inBreadcrumbs && this.currentLinkIndex === this.links.filter(l => l.closest('.breadcrumbs')).length - 1) {
                            // If at last breadcrumb, move to content
                            this.currentLinkIndex = -1;
                            this.currentParagraphIndex = 0;
                        } else if (this.currentLinkIndex < this.links.length - 1) {
                            // Move to next link
                            this.currentLinkIndex++;
                        }
                    } else if (this.currentParagraphIndex === -1) {
                        // Start at first paragraph
                        this.currentParagraphIndex = 0;
                    } else if (this.currentParagraphIndex < this.paragraphs.length - 1) {
                        // Move down in paragraphs
                        this.currentParagraphIndex++;
                    } else {
                        // At last paragraph, move to footer links if any
                        const footerLinks = this.links.filter(l => l.closest('.footer'));
                        if (footerLinks.length > 0) {
                            this.currentParagraphIndex = -1;
                            this.currentLinkIndex = this.links.indexOf(footerLinks[0]);
                        }
                    }
                    this.highlightCurrentElement();
                    break;

                case 'k': // Move up
                    if (this.currentLinkIndex >= 0) {
                        const currentLink = this.links[this.currentLinkIndex];
                        const inFooter = currentLink.closest('.footer') !== null;

                        if (inFooter && this.currentLinkIndex === this.links.indexOf(this.links.filter(l => l.closest('.footer'))[0])) {
                            // If at first footer link, move to content
                            this.currentLinkIndex = -1;
                            this.currentParagraphIndex = this.paragraphs.length - 1;
                        } else if (this.currentLinkIndex > 0) {
                            // Move up in links
                            this.currentLinkIndex--;
                        }
                    } else if (this.currentParagraphIndex <= 0) {
                        // At or before first paragraph, move to breadcrumbs
                        this.currentParagraphIndex = -1;
                        const breadcrumbLinks = this.links.filter(l => l.closest('.breadcrumbs'));
                        if (breadcrumbLinks.length > 0) {
                            this.currentLinkIndex = this.links.indexOf(breadcrumbLinks[breadcrumbLinks.length - 1]);
                        }
                    } else {
                        // Move up in paragraphs
                        this.currentParagraphIndex--;
                    }
                    this.highlightCurrentElement();
                    break;

                case 'g': // Go to top
                    this.currentParagraphIndex = -1;
                    this.currentLinkIndex = 0;
                    this.highlightCurrentElement();
                    break;

                case 'G': // Go to bottom (footer links if present, otherwise last paragraph)
                    const footerLinks = this.links.filter(l => l.closest('.footer'));
                    if (footerLinks.length > 0) {
                        this.currentParagraphIndex = -1;
                        this.currentLinkIndex = this.links.indexOf(footerLinks[footerLinks.length - 1]);
                    } else {
                        this.currentLinkIndex = -1;
                        this.currentParagraphIndex = this.paragraphs.length - 1;
                    }
                    this.highlightCurrentElement();
                    break;

                case 'enter': // Follow link
                    if (this.currentLinkIndex >= 0 && this.currentLinkIndex < this.links.length) {
                        this.links[this.currentLinkIndex].click();
                    }
                    break;

                case 'escape': // Reset navigation
                    this.currentParagraphIndex = -1;
                    this.currentLinkIndex = -1;
                    this.highlightCurrentElement();
                    break;
            }
            return;
        }

        // Handle navigation for links
        switch (key) {
            case 'j': // Move down
                if (this.currentLinkIndex === -1) {
                    this.currentLinkIndex = 0;
                } else {
                    this.currentLinkIndex = Math.min(this.currentLinkIndex + 1, this.links.length - 1);
                }
                this.highlightCurrentElement();
                break;
            case 'k': // Move up
                if (this.currentLinkIndex > 0) {
                    this.currentLinkIndex = Math.max(this.currentLinkIndex - 1, 0);
                    this.highlightCurrentElement();
                }
                break;
            case 'g': // Go to top
                this.currentLinkIndex = 0;
                this.highlightCurrentElement();
                break;
            case 'G': // Go to bottom
                this.currentLinkIndex = this.links.length - 1;
                this.highlightCurrentElement();
                break;
            case 'escape': // Reset navigation
                this.currentLinkIndex = -1;
                this.highlightCurrentElement();
                break;
        }
    }
}

// Initialize Vim navigation when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.vimNav = new VimNavigation();
});
