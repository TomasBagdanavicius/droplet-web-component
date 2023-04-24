/*! Droplet v1.0.1 */

import { Breadcrumbs } from './breadcrumbs.js';
import { Progress } from './progress.js';

class Droplet extends HTMLElement {

    constructor() {

        super();
        this.shadow = this.attachShadow({mode: 'open'});
        this.shadow.host.classList.add('d-js-init');
        this.wrapper = this.shadow.host;
        this.o = Droplet.getDefaultOptions();

        for( let key in this.dataset ) {

            if( this.o.hasOwnProperty(key) ) {
                this.o[key] = Droplet.convertStringValueToType(this.dataset[key]);
            }
        }

        this.playing = false;
        this.history = [];
        this.actionHistoryCount = 0;
        this.actionHistory = [];
        this.defer = [];
        this.request;
        this.progress = Progress.createElement();
        this.bar; // Menu bar element.
        this.breadcrumbs; // Breadcrumbs object.
        this.effectNames = ['d-film-track', 'd-slide-over', 'd-cross-fade'];
        this.effectDirections = ['d-anim-top', 'd-anim-right', 'd-anim-bottom', 'd-anim-left'];
        this.elemTitle;

        this.createElements();
        this.wrapper.setAttribute('data-level', '0');
        this.shadow.appendChild(this.progress.wrapper);

        // If default effect option is not used, check if any effect classes are on the wrapper.

        if( !this.o.defaultEffect ) {

            const currentEffectClasses = [];

            [...this.effectNames, ...this.effectDirections].forEach( val => {

                if( this.wrapper.classList.contains(val) ) {
                    currentEffectClasses.push(val);
                }
            });

            if( currentEffectClasses.length ) {
                this.o.defaultEffect = currentEffectClasses.join(' ');
            }
        }

        if( this.o.captureInsideLinks ) {
            this.bindToHyperlinks(this.activeElement);
        }

        this.bindGlobalEvents();
    }

    // Returns an object with all default Droplet options.

    static getDefaultOptions() {

        return {
            'captureInsideLinks': true,
            'useLinkTitles': false,
            'defaultEffect': null,
            'returnOppositeDirection': true,
            'showMenuBar': 'breadcrumbs',
            'requestTimeout': 10000,
            'stylesheet': 'css/droplet.min.css',
            'defaultFragment': 'content',
            'variableHeight': true,
            /* Translations */
            'homeButtonText': "Home",
            'homeButtonTitle': "Go to the Home card",
            'backButtonText': "Back",
            'backButtonTitle': "Go back",
            /* Callbacks */
            'onEnd': null
        };
    }

    // Attempts to cast a string into another type based on string value.

    static convertStringValueToType( value ) {

        if( value === 'true' ) {
            value = true;
        } else if( value === 'false' ) {
            value = false;
        } else if( value === 'null' ) {
            value = null;
        } else if( /^[\d\.]+$/.test(value) ) {
            value = parseFloat(value);
        }

        return value;
    }

    // Generates a unique ID string for an element in the current shadow DOM context.

    createUniqueElemId( prefix = 'e' ) {

        let i = 0;

        while( this.shadow.getElementById('e' + i) ) i++;

        return prefix + i;
    }

    // Moves all child elements from a target container to a new element.

    createInnerWrapper( targetElement, newElement, append = true ) {

        while( targetElement.firstChild ) {

            // This moves the child element into the new element as per "appendChild" behaviour when the given child is a reference to an existing node in the document.
            newElement.appendChild(targetElement.firstChild);
        }

        if( append ) {
            targetElement.appendChild(newElement);
        }
    }

    // Creates all main Droplet elements (eg. progress bar, breadcrumb bar, etc.) inside the host container.

    createElements() {

        // Since we want to avoid transferring nodes with innerHTML, using a temporary element to store the nodes.
        const tempElem = document.createElement('div');
        this.createInnerWrapper(this.shadow.host, tempElem, false);

        // Creates inner wrapper.
        this.inner = document.createElement('div');
        this.inner.classList.add('inn');

        // Creates pane wrapper.
        this.pane = document.createElement('div');
        this.pane.classList.add('pane');

        // Creates item wrapper.
        this.activeElement = document.createElement('div');
        this.activeElement.classList.add(...['i', 'act', 'on']);

        this.pane.appendChild(this.activeElement);
        this.inner.appendChild(this.pane);

        // Transfer the nodes from the temporary element.
        this.createInnerWrapper(tempElem, this.activeElement, false);

        // Apply external styles to the shadow DOM.
        const linkElem = document.createElement('link');

        linkElem.setAttribute('rel', 'stylesheet');
        linkElem.setAttribute('href', this.o.stylesheet);
        linkElem.setAttribute('type', 'text/css');

        linkElem.addEventListener('load', () => {

            console.log("Stylesheet loaded: " + (new URL(this.o.stylesheet, location.href)).href);

            if( !this.o.variableHeight ) {

                let wrapperMaxHeight = getComputedStyle(this.wrapper).getPropertyValue('max-height');

                if( wrapperMaxHeight && wrapperMaxHeight != 'none' ) {

                    wrapperMaxHeight = parseInt(wrapperMaxHeight);

                    if( !isNaN(wrapperMaxHeight) ) {

                        const diff = (wrapperMaxHeight - this.wrapper.offsetHeight);

                        // If difference is zero, set anyway, because future cards might be smaller.
                        if( diff >= 0 ) {
                            this.inner.style.height = (this.inner.offsetHeight + diff) + 'px';
                        }
                    }
                }
            }

        });

        // Appends all necessary elements to the shadow DOM.
        this.shadow.appendChild(linkElem);
        this.shadow.appendChild(this.inner);

        const itemId = this.createUniqueElemId();
        this.activeElement.id = itemId;

        const event = {
            id: itemId,
        };

        let wrapperTitle;

        if( this.wrapper.hasAttribute('data-title') ) {

            wrapperTitle = this.wrapper.getAttribute('data-title');
            this.wrapper.removeAttribute('data-title');
            this.activeElement.setAttribute('data-title', wrapperTitle);
            this.elemTitle = event.title = wrapperTitle;
        }

        this.history.push(event);

        if( this.o.showMenuBar ) {
            this.wrapper.classList.add('d-with-bar');
        }

        if( this.o.showMenuBar === 'breadcrumbs' ) {

            this.addBreadcrumbBar();

            // If primary title is provided, create a breadcrumb item for it.

            if( wrapperTitle ) {

                const newBreadcrumbsItem = this.breadcrumbs.createListItemWithHyperlink(wrapperTitle, '#' + itemId, ['act']);

                newBreadcrumbsItem.setAttribute('data-ref-id', itemId);
                newBreadcrumbsItem.setAttribute('title', wrapperTitle);

                newBreadcrumbsItem.addEventListener('click', e => {

                    console.log("Titular breadcrumb item click.");

                    e.preventDefault();

                    // There is a history of action.
                    if( this.actionHistory.length ) {

                        this.goHome();

                    // Nothing's in the history, but request is running.
                    } else if( this.request ) {

                        this.terminateRequest();
                        this.wrapper.classList.remove('d-non-root');
                    }

                    this.itemFlash(newBreadcrumbsItem);

                });
            }

        } else if( this.o.showMenuBar === 'navigation' ) {

            this.addNavigationBar(wrapperTitle);
        }
    }

    // Builds and adds the navigation bar.

    addNavigationBar( wrapperTitle ) {

        let menuBar = document.createElement('div');
        menuBar.classList.add('menu-bar');

        let homeButton = document.createElement('button');
        homeButton.appendChild(document.createTextNode(this.o.homeButtonText));
        homeButton.setAttribute('type', 'button');
        homeButton.classList.add('home');
        homeButton.title = this.o.homeButtonTitle;

        let backButton = document.createElement('button');
        backButton.appendChild(document.createTextNode(this.o.backButtonText));
        homeButton.setAttribute('type', 'button');
        backButton.classList.add('back');
        backButton.title = this.o.backButtonTitle;

        homeButton.addEventListener('click', e => {

            this.itemFlash(homeButton);
            this.goHome();

        }, false);

        backButton.addEventListener('click', e => {

            this.itemFlash(backButton);
            this.goBackByOne();

        }, false);

        if( wrapperTitle ) {

            let titleElem = document.createElement('span');
            titleElem.appendChild(document.createTextNode(wrapperTitle));
            titleElem.classList.add('t');

            menuBar.appendChild(titleElem);

            titleElem.addEventListener('click', e => {

                e.preventDefault();
                this.reload();
            });
        }

        menuBar.appendChild(backButton);
        menuBar.appendChild(homeButton);

        this.shadow.appendChild(menuBar);

        this.bar = menuBar;
    }

    // Builds and adds the breadcrumb bar.

    addBreadcrumbBar() {

        if( !this.breadcrumbs ) {

            const breadcrumbs =  this.createBreadcrumbs();
            const appendedBreadcrumbElem = this.shadow.appendChild(breadcrumbs.el);

            appendedBreadcrumbElem.classList.add('menu-bar');

            this.bar = appendedBreadcrumbElem;
        }
    }

    // Adds "flash" class name to a given element, which should be configured to perform the flash effect.

    itemFlash( el ) {

        el.classList.add('flash');

        setTimeout( () => {
            el.classList.remove('flash');
        }, 250);
    }

    // Tells if main animation effects are currently playing.

    isPlaying() {

        return this.playing;
    }

    // Builds the breadcrumb bar elements.

    createBreadcrumbs() {

        this.breadcrumbs = Breadcrumbs.create();

        return this.breadcrumbs;
    }

    // When playing, it will return the effect direction that is currently in action.

    getDirection( nextItem ) {

        if( this.playing ) {

            const computedStyles = getComputedStyle(nextItem);
            const top = parseFloat(computedStyles.getPropertyValue('top'));
            const left = parseFloat(computedStyles.getPropertyValue('left'));

            console.log(
                "Getting offsets for direction: "
                + top + " "
                + parseFloat(computedStyles.getPropertyValue('right')) + " "
                + parseFloat(computedStyles.getPropertyValue('bottom')) + " "
                + left
            );

            // With "Opacity" effect.
            if( top == 0 && left == 0 ) {
                return false;
            }

            // The order of conditional statements is important and shouldn't be shuffled around.
            // The positioning is based upon the notion that the item can not be negative in top or left directions.
            if( top < 0 ) {
                return 'bottom';
            } else if( left < 0 ) {
                return 'right';
            } else if( parseFloat(computedStyles.getPropertyValue('right')) < 0 && top == 0 ) {
                return 'left';
            } else if( parseFloat(computedStyles.getPropertyValue('bottom')) < 0 && left == 0 ) {
                return 'top';
            }
        }

        return false;
    }

    // Gets primitive axis representation by a given direction.

    static getAxisByDirection( direction ) {

        if( direction == 'top' || direction == 'bottom' ) {
            return 'y';
        } else if( direction == 'right' || direction == 'left' ) {
            return 'x';
        } else {
            return false;
        }
    }

    // Gets opposite direction to the given one.

    static getOppositeDirection( direction ) {

        if( direction == 'top' ) {
            return 'bottom';
        } else if( direction == 'right' ) {
            return 'left';
        } else if( direction == 'bottom' ) {
            return 'top';
        } else if( direction == 'left' ) {
            return 'right';
        }
    }

    // Removes all Droplet effect associated classes from the host element.

    resetAnimClasses() {

        this.wrapper.classList.remove(...[...this.effectNames, ...this.effectDirections]);
    }

    // Converts effects string into an effects object.

    parseAnimClasses( effectStr ) {

        let result = {
            'transitions': [],
            'direction': null,
        };

        if( typeof effectStr !== 'string' || effectStr == '' || effectStr == 'none' ) {
            return result;
        }

        const effectParts = effectStr.toLowerCase().split(/\s+/);
        const includesFilmTrack = effectParts.includes('d-film-track');
        const includesSlide = effectParts.includes('d-slide-over');

        if( includesFilmTrack && includesSlide ) {
            throw new Error("Film-track and slide-over effects cannot be used together.");
        }

        effectParts.forEach( (value, index) => {

            if( this.effectDirections.includes(value) ) {

                if( !result.direction ) {

                    // Removes current item by index.
                    effectParts.splice(index, 1);
                    result.direction = value;

                } else {

                    console.error("Direction effect cannot be used multiple times. Will ignore \"" + value + "\".");
                }

            } else if( this.effectNames.indexOf(value) === -1 ) {

                console.error("Unrecognized effect name \"" + value + "\" in \"" + effectStr + "\".");
            }

        });

        result.transitions = effectParts;

        return result;
    }

    // Adds effect classes by a given effects object to the host element.

    addAnimClasses( effect ) {

        this.resetAnimClasses();

        this.wrapper.classList.add(...effect.transitions);

        if( effect.direction ) {
            this.wrapper.classList.add(effect.direction);
        }
    }

    // Converts an effects object to an effects string.

    effectObjectToAnimClassesStr( effect, oppositeDirection = false ) {

        let result = 'none';

        if( effect.transitions.length ) {
            result = effect.transitions.join(' ');
        }

        if( effect.direction ) {

            result = result + ' ' + ( ( !oppositeDirection )
                ? effect.direction
                : 'd-anim-' + Droplet.getOppositeDirection(effect.direction.substr(7)) );
        }

        return result;
    }

    // Initializes and starts the transition.

    initTransition( item, effect, reduceNumber = 0, relocated = false ) {

        console.log("Init transition. Programmatic effect: " + effect + "; reduce number: " + reduceNumber + "; relocated: " + relocated);

        if( (effect == '' || effect == 'none') && this.o.defaultEffect ) {
            effect = this.o.defaultEffect;
        }

        // Add effect classes.
        effect = this.parseAnimClasses(effect);
        console.log("Effect object:", effect);

        if( effect.transitions.length ) {
            this.addAnimClasses(effect);
        } else {
            this.resetAnimClasses();
        }

        if( this.o.variableHeight ) {
            this.inner.style.height = this.inner.offsetHeight + 'px';
        }

        // Force a new event cycle.
        const itemOffsetWidth = item.offsetWidth;
        item.classList.add('act');

        this.wrapper.classList.add('d-play');
        this.playing = true;

        const direction = this.getDirection(item);
        console.log("Direction: " + direction);

        const isFilmTrack = ( getComputedStyle(this.pane).getPropertyValue('transition-property').substr(0,9) === 'transform' );
        const itemTransitionProperty = getComputedStyle(item).getPropertyValue('transition-property');
        const isSlide = ( itemTransitionProperty.substr(0,9) === 'transform' );
        const isCrossFade = ( itemTransitionProperty.substr(-7) === 'opacity' );

        if( !relocated ) {

            const myTransitions = [];

            if( isFilmTrack ) {
                myTransitions.push('d-film-track');
            } else if( isSlide ) {
                myTransitions.push('d-slide-over');
            }

            if( isCrossFade ) {
                myTransitions.push('d-cross-fade');
            }

            this.actionHistory.push({
                'transitions': myTransitions,
                'direction': ( direction )
                    ? 'd-anim-' + direction
                    : null,
            });
        }

        // Direction is available with "film-track" or "slide-over" effects.
        if( direction ) {

            const axis = Droplet.getAxisByDirection(direction);
            let nextTranslate;

            if( direction == 'top' || direction == 'left' ) {

                nextTranslate = ( axis == 'x' )
                    ? Math.min(this.activeElement.offsetWidth, window.innerWidth)
                    : Math.min(this.activeElement.offsetHeight, window.innerHeight);

            } else {

                nextTranslate = ( axis == 'x' )
                    ? Math.min(item.offsetWidth, window.innerWidth)
                    : Math.min(item.offsetHeight, window.innerHeight);
            }

            const sign = ( direction == 'left' || direction == 'top' )
                ? '-'
                : '';

            // With "film-track" effect.
            if( isFilmTrack ) {
                this.pane.style.transform = 'translate' + axis.toUpperCase() + '(' + sign + nextTranslate + 'px)';
            }

            // With "slide-over" effect.
            if( isSlide ) {
                item.style.transform = 'translate' + axis.toUpperCase() + '(' + sign + nextTranslate + 'px) scale(1)';
            }
        }

        this.defer = {
            'relocated': relocated,
            'effect': effect,
            'isFilmTrack': isFilmTrack,
            'isSlide': isSlide,
            'isCrossFade': isCrossFade,
        };

        if( !relocated ) {

            this.actionHistoryCount++;

        } else {

            this.defer.reduceNumber = reduceNumber;
            this.actionHistoryCount = (this.actionHistoryCount - reduceNumber);
            this.actionHistory.splice(-reduceNumber, reduceNumber);
            this.history.splice(-reduceNumber, reduceNumber);

            console.log("History left:", this.history);

            if( this.bar && !this.breadcrumbs ) {
                this.setMenuBarTitle(item.getAttribute('data-title'));
            }
        }

        this.wrapper.setAttribute('data-level', this.actionHistoryCount);

        if( !this.actionHistoryCount ) {
            this.wrapper.classList.remove('d-non-root');
        } else {
            this.wrapper.classList.add('d-non-root');
        }

        if( this.o.variableHeight ) {
            this.inner.style.height = Math.min(item.offsetHeight, window.innerHeight) + 'px';
        }

        console.log("Action history:", this.actionHistory);

        console.log("History:", this.history);

        if( reduceNumber ) {

            // Keep in mind that the new active item has been moved to the top of the list.
            for( let i = reduceNumber; i >= 1; i-- ) {

                let item = this.pane.children[i];

                if( !item.classList.contains('on') ) {
                    // Deactivates pane items.
                    item.classList.remove('act');
                }

                // Deactivates corresponding breadcrumb items.

                if( this.o.showMenuBar == 'breadcrumbs' ) {

                    let breadcrumbItem = this.breadcrumbs.list.querySelector('[data-ref-id="' + item.id + '"]');

                    if( breadcrumbItem ) {
                        breadcrumbItem.classList.remove('act');
                    }
                }
            }
        }

        const result = new Promise((resolve, reject) => {
            this.defer.resolution = [resolve, reject];
        });

        // Check if it should be completed immediately. Represents any effect transition.
        if( !( isFilmTrack || isCrossFade || isSlide ) ) {
            this.completeTransition();
        }

        return result;
    }

    // Performs transition completion tasks.

    completeTransition() {

        console.log("Completing transition. Defer info:", this.defer);

        this.wrapper.classList.remove('d-play');
        this.playing = false;

        this.activeElement.classList.remove('on', 'act');

        const prevElement = this.pane.children[0];
        prevElement.classList.add('on');

        if( typeof this.o.onEnd === 'function' ) {
            this.o.onEnd.call(this, this.newItem, this.activeElement);
        }

        this.activeElement = prevElement;

        if( this.o.variableHeight ) {
            // With all effects.
            this.inner.style.height = '';
        }

        // With "film-track" effect.
        if( this.defer.isFilmTrack ) {
            this.pane.style.transform = '';
        }

        // With "slide-over" effect.
        if( this.defer.isSlide ) {
            this.newItem.style.transform = '';
        }

        if( this.defer.reduceNumber ) {

            for( let i = this.defer.reduceNumber; i >= 1; i-- ) {

                // Removes pane items.
                const paneItem = this.pane.children[i];
                const paneItemId = paneItem.id;
                paneItem.remove();

                if( this.o.showMenuBar == 'breadcrumbs' ) {

                    // Removes corresponding breadcrumb items.
                    let breadcrumbItem = this.breadcrumbs.list.querySelector('[data-ref-id="' + paneItemId + '"]');

                    // It could be already removed in "terminateRequest()".
                    if( breadcrumbItem ) {
                        breadcrumbItem.remove();
                    }
                }
            }
        }

        if( this.defer ) {
            this.defer.resolution[0]();
        }

        this.newItem = null;
    }

    // Builds a new item element.

    createItemElement() {

        const item = document.createElement('div');
        item.classList.add('i');
        item.id = this.createUniqueElemId();

        return item;
    }

    // Finds all hyperlinks in a given elements and binds them to the Droplet system.

    bindToHyperlinks( el ) {

        const hyperlinks = el.getElementsByTagName('a');

        for( let hyperlink of hyperlinks ) {

            hyperlink.addEventListener('click', e => {

                // Captured hyperlinks are excluded if they have the 'd-prevent' or 'target' attribute with a value.
                if( !hyperlink.classList.contains('d-prevent') && !hyperlink.getAttribute('target') ) {

                    const hrefAttribute = hyperlink.getAttribute('href');

                    if( hrefAttribute != '' && hrefAttribute.charAt(0) != '#' ) {

                        e.preventDefault();

                        let effectStr = 'none';

                        if( hyperlink.hasAttribute('data-effect') && hyperlink.getAttribute('data-effect') != '' ) {
                            effectStr = hyperlink.getAttribute('data-effect');
                        }

                        let url = hyperlink.href;
                        let hash = null;

                        if( hyperlink.hash ) {
                            url = hyperlink.href.substr(0, (hyperlink.href.length - hyperlink.hash.length));
                            hash = hyperlink.hash.substr(1);
                        }

                        this.populateContentFromURL(url, hash, effectStr, hyperlink.innerText);

                    } else if( hrefAttribute == '#back' ) {

                        e.preventDefault();

                        this.goBackByOne();

                    } else if( hrefAttribute == '#home' ) {

                        e.preventDefault();

                        this.goHome();
                    }
                }

            });
        }
    }

    // Detects maximum width for a given breadcrumb item.

    getBreadcrumbMaxWidth( breadcrumbItem ) {

        const propertyMaxWidth = getComputedStyle(breadcrumbItem).getPropertyValue('max-width');

        return Math.min(
            ( ( propertyMaxWidth != 'none' )
                ? parseFloat(propertyMaxWidth)
                : 100 ),
            // Use the ceiling value of precise offset width.
            Math.ceil(breadcrumbItem.firstElementChild.getBoundingClientRect().width)
        );
    }

    // Creates the initial version of a breadcrumb item.

    createInitialBreadcrumbItem( url ) {

        if( this.o.showMenuBar == 'breadcrumbs' ) {

            this.addBreadcrumbBar();
            const breadcrumbItem = this.breadcrumbs.createListItemWithHyperlink("Loading...", url, ['load'], true);

            // Create a new event cycle (eg. reflow) and add the acting class name.
            const breadcrumbItemOffsetWidth = breadcrumbItem.offsetWidth;
            breadcrumbItem.classList.add('act');

            return breadcrumbItem;
        }
    }

    // Upgrades the initial breadcrumb item.

    populateInitialBreadcrumb( title ) {

        if( this.o.showMenuBar == 'breadcrumbs' ) {

            if( typeof title === 'string' ) {
                this.setMenuBarTitle(title);
            }

            // Get item width and at the same time initiate a new cycle event.
            const propertyMaxWidth = this.getBreadcrumbMaxWidth(this.currentBreadcrumbItem);

            this.currentBreadcrumbItem.style.setProperty('--item-max-width', propertyMaxWidth + 'px');
            this.currentBreadcrumbItem.classList.remove('load');
        }
    }

    // Starts a new card and populates it with the given HTML content.

    populateContent( content, title, effect, breadcrumbItem, event ) {

        if( !breadcrumbItem && this.request ) {
            this.terminateRequest();
        }

        // Create a new content item.

        let newItem = this.createItemElement();
        this.pane.insertBefore(newItem, this.activeElement);
        newItem.insertAdjacentHTML('afterbegin', content);
        newItem.setAttribute('data-title', title);
        this.elemTitle = title;

        this.newItem = newItem;

        if( this.o.captureInsideLinks ) {
            this.bindToHyperlinks(newItem);
        }

        if( event ) {

            this.history.push(event);

        } else {

            this.history.push({
                title,
            });
        }

        // Start a new breadcrumb, if it hasn't been created yet.

        if( this.o.showMenuBar == 'breadcrumbs' ) {

            const staticPosition = (this.actionHistoryCount + 1);

            if( !breadcrumbItem ) {

                this.addBreadcrumbBar();
                breadcrumbItem = this.breadcrumbs.createListItemWithHyperlink(title, '#' + newItem.id, [], true);

                let maxWidth = this.getBreadcrumbMaxWidth(breadcrumbItem);

                breadcrumbItem.classList.add('act');
                breadcrumbItem.style.setProperty('--item-max-width', maxWidth + 'px');
                breadcrumbItem.setAttribute('data-ref-id', newItem.id);

                this.currentBreadcrumbItem = breadcrumbItem;
            }

            breadcrumbItem.setAttribute('data-ref-id', newItem.id);
            breadcrumbItem.setAttribute('title', title);

            // Bind content control event.

            breadcrumbItem.addEventListener('click', e => {

                console.log("Content control click event", breadcrumbItem);

                // Make sure it's not loading now.
                if( !this.request || (this.request && this.currentBreadcrumbItem !== breadcrumbItem) ) {

                    e.preventDefault();

                    console.log("Static position: " + staticPosition);

                    const goBackEffect = ( this.currentBreadcrumbItem !== breadcrumbItem && (this.actionHistory.length - 1) >= staticPosition )
                        ? this.effectObjectToAnimClassesStr(
                            this.actionHistory[staticPosition], // The corresponding item in history.
                            true // Sets opposite direction.
                        ) : 'none';

                    this.goBack(newItem.id, goBackEffect);

                    const link = breadcrumbItem.firstElementChild;

                    // If it's a hyperlink with a full URL, reload content.
                    if( link.getAttribute('href').charAt(0) != '#' ) {

                        breadcrumbItem.classList.add('load');

                        let url = link.href;
                        let hash = null;

                        if( link.hash ) {
                            url = link.href.substr(0, (link.href.length - link.hash.length));
                            hash = link.hash.substr(1);
                        }

                        this.populateContentFromURL(url, hash, effect, breadcrumbItem.innerText, breadcrumbItem);
                    }
                }

                this.itemFlash(breadcrumbItem);

            });

        } else {

            this.setMenuBarTitle(title);
        }

        return this.initTransition(newItem, effect);
    }

    // Sets menu bar title - either with breadcrumb or navigation.

    setMenuBarTitle( title ) {

        if( this.breadcrumbs ) {

            this.currentBreadcrumbItem.firstElementChild.innerText = title;
            this.currentBreadcrumbItem.setAttribute('title', title);

        } else if( this.bar ) {

            const titleElem = this.bar.getElementsByClassName('t')[0];
            titleElem.textContent = title;
            titleElem.setAttribute('title', title);
        }
    }

    // Puts content into the current element.

    putContent( content, title ) {

        console.log("Putting content.");

        const firstPaneChild = this.pane.children[0];

        firstPaneChild.innerHTML = content;

        this.setMenuBarTitle(title);

        if( this.o.captureInsideLinks ) {
            this.bindToHyperlinks(firstPaneChild);
        }
    }

    // Reloads the current card. If current card was added programatically, nothing will happen.

    reload() {

        const currentHistoryItem = this.history[this.history.length-1];

        if( currentHistoryItem.hasOwnProperty('url') ) {
            return this.populateContentFromURL(currentHistoryItem.url, currentHistoryItem.fragment, 'none');
        }
    }

    // Fetches content from the given URL and sends it over the the "populateContent" method.

    async populateContentFromURL( url, fragment, effect, innerText, breadcrumbItem ) {

        console.log("Populate content from URL: " + url);

        // If breadcrumb was provided the transition must have been started via "goBack".
        if( !breadcrumbItem && this.playing ) {
            throw new Error("Request blocked: it is currently playing.");
        }

        // If other request is running, terminate it.
        if( this.request ) {
            this.terminateRequest();
        }

        const abortController = new AbortController();

        // Set a timer for the abort to run. This needs to be cleared upon success.
        let timeoutCallback = setTimeout( () => {

            console.log("Aborting after timeout.");

            this.terminateRequest();

        }, this.o.requestTimeout);

        // Setup a new request.
        const request = {
            url,
            timeout: this.o.requestTimeout,
            abortController: abortController,
            timeoutCallback,
        };

        // Setup a new event.
        const event = {
            url,
            fragment,
        };

        const currentHistoryItem = this.history[(this.history.length - 1)];
        let newInstance = !(
            // URL property exists in the history item and it matches with given URL.
            currentHistoryItem.hasOwnProperty('url') && currentHistoryItem.url == url
            // No fragment at all or it matches.
            && (!fragment || (currentHistoryItem.hasOwnProperty('fragment') && fragment == currentHistoryItem.fragment))
        );

        if( this.o.showMenuBar == 'breadcrumbs' ) {

            // No duplicate of current item, and no breadcrumb item.
            if( newInstance && !breadcrumbItem ) {
                breadcrumbItem = this.createInitialBreadcrumbItem(url + ((fragment) ? '#' + fragment : ''));
            // Duplicate of current item, and no breadcrumb item.
            } else if( !breadcrumbItem ) {
                breadcrumbItem = this.currentBreadcrumbItem;
            // Breadcrumb provided, so surely not new card.
            } else {
                newInstance = false;
            }

            const breadcrumbAbortEvent = e => {

                console.log("Breadcrumb abort event.");

                e.preventDefault();

                this.terminateRequest(!newInstance);

                if( !newInstance ) {
                    this.populateInitialBreadcrumb();
                }

                // Since it has just ran, don't run it again. This is required for when breadcrumb is toggled between loading and normal state and never completes the request.
                breadcrumbItem.removeEventListener('click', breadcrumbAbortEvent);
            }

            breadcrumbItem.addEventListener('click', breadcrumbAbortEvent);

            request.breadcrumbItem = breadcrumbItem;
            request.breadcrumbAbortEvent = breadcrumbAbortEvent;

            this.currentBreadcrumbItem = breadcrumbItem;
        }

        this.request = request;

        if( this.progress instanceof Progress ) {
            // Run progress plan.
            const plan = Progress.generateRandomNumbers(Progress.randomBetweenTwoNumbers(90, 99), 10);
            this.progress.progressPlanTo(plan, this.o.requestTimeout);
        }

        return await Droplet.loadContent(url, ( fragment ?? this.o.defaultFragment ), abortController).then( contentData => {

            console.log("Request completed:", this.request);

            // Complete request.

            clearTimeout(timeoutCallback);

            // Complete progress.
            if( this.progress instanceof Progress ) {
                this.progress.complete(this.getCSSSpeed());
            }

            // Expire abort event.
            if( this.o.showMenuBar == 'breadcrumbs' && this.request.hasOwnProperty('breadcrumbAbortEvent') ) {
                this.currentBreadcrumbItem.removeEventListener('click', this.request.breadcrumbAbortEvent);
            }

            // Destroy request.
            this.request = null;

            let title = ( !this.o.useLinkTitles || !innerText )
                ? contentData[0] // Resource location title.
                : innerText; // Link title.

            event.title = title;

            if( this.o.showMenuBar == 'breadcrumbs' ) {
                this.populateInitialBreadcrumb(title);
            }

            // Fresh new card.
            if( newInstance ) {

                this.populateContent(contentData[1], title, effect, this.currentBreadcrumbItem, event);

            // Reloaded existing card.
            } else {

                this.putContent(contentData[1], title);

                this.wrapper.classList.add('d-flash');

                setTimeout( () => {
                    this.wrapper.classList.remove('d-flash');
                }, 100);
            }

        }).catch( exception => {

            console.error("Populate content from URL error: " + exception.message);

            if( !(exception instanceof DOMException) || exception.name !== 'AbortError' ) {
                this.terminateRequest();
            }

        });
    }

    // Gets the value of the "speed" variable from the CSS department.

    getCSSSpeed() {

        return (parseFloat(getComputedStyle(this.wrapper).getPropertyValue('--speed')) * 1000);
    }

    // Terminates the running request.

    terminateRequest( leaveBreadcrumb = false ) {

        if( this.request ) {

            console.log("Terminating request.");

            // Expire the request timer.
            clearTimeout(this.request.timeoutCallback);

            // Abort the request.
            if( !this.request.abortController.signal.aborted ) {
                this.request.abortController.abort();
            }

            // Remove breadcrumb.
            if( this.o.showMenuBar == 'breadcrumbs' && !leaveBreadcrumb ) {

                this.currentBreadcrumbItem.classList.remove('act', 'load');

                // Save into variable before timeout runs.
                const currentBreadCrumbItem = this.currentBreadcrumbItem;

                setTimeout( () => {

                    if( currentBreadCrumbItem && currentBreadCrumbItem.parentNode && currentBreadCrumbItem.parentNode === this.breadcrumbs.list ) {
                        this.breadcrumbs.list.removeChild(currentBreadCrumbItem);
                    }

                }, this.getCSSSpeed());
            }

            // Revert the progress bar.
            if( this.progress instanceof Progress ) {
                this.progress.revert();
            }

            // Destroy the request container.
            this.request = null;
        }
    }

    // Statically loads HTML, JSON, or plain text content and retrieves title and result elements from the received data.

    static async loadContent( url, fragment, abortController ) {

        let headers = new Headers();
        headers.append('Cache-Control', 'no-store');
        let contentType, format;

        return await fetch(url, {'signal': abortController.signal, headers}).then(response => {

            contentType = response.headers.get('Content-Type');

            if( contentType.startsWith('text/html') ) {
                format = 'text/html';
                return response.text();
            } else if( contentType.startsWith('application/json') ) {
                format = 'application/json';
                return response.json();
            } else if( contentType.startsWith('text/plain') ) {
                format = 'text/plain';
                return response.text();
            } else {
                throw Error("Unrecognized content type.");
            }

        }).then( data => {

            let title = '', result, content;

            const makeExcerpt = function( str ) {
                return str.replace(/[\t]/gm, '').replace(/[\r\n]+/gm, ' ').split(/\s+/).slice(0,3).join(' ')
            }

            if( typeof data === 'object' ) {

                if( data.title ) {

                    title = data.title;

                } else {

                    let k;
                    for( k in data ) break;

                    if( k ) {
                        title = k + ": " + data[k];
                    }
                }

                result = ( typeof fragment === 'string' && data.hasOwnProperty(fragment) )
                    ? data[fragment]
                    : JSON.stringify(data);

            } else if( format == 'text/html' ) {

                const doc = new DOMParser().parseFromString(data, 'text/html');

                if( typeof fragment === 'string' ) {

                    content = doc.getElementById(fragment);

                    if( content ) {
                        result = content.innerHTML;
                    }
                }

                if( !result ) {
                    result = data;
                }

                const titleElem = doc.getElementsByTagName('title');

                if( titleElem.length ) {

                    title = titleElem[0].innerText;

                } else {

                    const textContent = ( content )
                        ? content.textContent
                        : doc.body.textContent;

                    // Strips off tab chars, replaces new lines with single whitespace, splits into words, leave first 3, and joins into a new sentence.
                    title = makeExcerpt(textContent);
                }

            } else {

                let lineBreakIndex = Math.max(data.indexOf("\r"), data.indexOf("\n"));

                // Line break found.
                if( lineBreakIndex >= 0 ) {

                    title = data.substring(0, lineBreakIndex).trim();
                    result = data.substring(lineBreakIndex).trim();

                // Single line.
                } else {

                    result = data.trim();
                }

                if( title == '' && result != '' ) {
                    title = makeExcerpt(result);
                }

                if( result != '' ) {
                    // Converts multi-line-breaks into paragraph wrappers, single line breaks into BR tags, and markdown link syntax into hyperlinks.
                    result = '<p>' + result.replace(/(\r?\n){2,}/gm, '</p><p>').replace(/(\r?\n){1}/gm, '<br>').replace(/\[([^\]]+)\]\(([^\)]+)\)/, '<a href="$2">$1</a>') + '</p>';
                }
            }

            return [title, result];

        }).catch( exception => {

            console.error("Load content error: " + exception.message);

            throw exception;

        });
    }

    // Goes back to one of the previous cards.

    goBack( id, effect = 'none' ) {

        console.log("Go back with: " + id + "; effect: " + effect);

        let reduceNumber = 0;

        // If other request is running, terminate it.
        if( this.request ) {
            this.terminateRequest();
        }

        if( this.playing ) {
            throw new Error("Request blocked: it is currently playing.");
        }

        let target;

        if( typeof id === 'number' ) {

            if( (this.pane.children.length - 1) < id ) {
                return null;
            }

            reduceNumber = (reduceNumber + id);
            target = this.pane.children[id];

        } else if( typeof id === 'string' ) {

            const len = this.pane.children.length;
            let index;

            for( index = 0; index < len; index++ ) {

                if( this.pane.children[index].id == id ) {
                    target = this.pane.children[index];
                    break;
                }
            }

            if( !target ) {
                return null;
            }

            reduceNumber = (reduceNumber + index);
        }

        if( this.activeElement === target ) {
            return null;
        }

        const detached = target.parentNode.removeChild(target);
        const relocatedItem = this.pane.insertBefore(detached, this.pane.children[0]);

        this.newItem = relocatedItem;

        return this.initTransition(relocatedItem, effect, reduceNumber, true);
    }

    // Goes back to the previous card.

    goBackByOne() {

        if( this.actionHistoryCount ) {
            return this.goBack(1, this.effectObjectToAnimClassesStr(this.actionHistory[(this.actionHistoryCount - 1)], true));
        }
    }

    // Restores the initial state and closes all previous cards.

    goHome() {

        if( this.actionHistoryCount ) {
            return this.goBack(this.actionHistoryCount, this.effectObjectToAnimClassesStr(this.actionHistory[0], true));
        }
    }

    // Gets the count number of action history.

    getActionHistoryCount() {

        return this.actionHistoryCount;
    }

    // Binds events to various Droplet system elements.

    bindGlobalEvents() {

        this.pane.addEventListener('transitionend', e => {

            if(
                // Film-Track effect.
                (e.target === this.pane && e.propertyName == 'transform')
                // Cross-Fade effect.
                || (e.target === this.activeElement && e.propertyName == 'opacity')
                // Slide-Over effect.
                || (e.target === this.newItem && e.propertyName == 'transform')
            ) {

                console.log("Global transitionend event:", e);

                // Is this good enough not to fire multiple times?
                if( this.playing ) {

                    console.log("About to complete transition with: " + e.propertyName, e.target);

                    this.completeTransition();
                }
            }

        });
    }
}

export { Droplet };