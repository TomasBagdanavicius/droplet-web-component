/*! Breadcrumbs v1.0.0 */

class Breadcrumbs {

    constructor( el, opts ) {

        this.el = el;
        this.list = el.firstElementChild;
    }

    static create( opts ) {

        let breadcrumbElem = document.createElement('div');
        breadcrumbElem.classList.add('brcr');

        let list = document.createElement('ol');
        list.classList.add('brcr-l');

        breadcrumbElem.appendChild(list);

        return new Breadcrumbs(breadcrumbElem, opts);
    }

    buildListItem( textStr, classes ) {

        const listItem = document.createElement('li');

        if( classes ) {
            listItem.classList.add(...classes);
        }

        return [
            listItem,
            document.createTextNode(textStr)
        ];
    }

    createListItem( textStr, classes, prepend = false ) {

        const [listItem, text] = this.buildListItem(textStr, classes);

        listItem.appendChild(text);

        if( !prepend ) {
            this.list.appendChild(listItem);
        } else {
            this.list.insertBefore(listItem, this.list.firstElementChild);
        }

        return listItem;
    }

    createListItemWithHyperlink( textStr, href, classes, prepend = false ) {

        const [listItem, text] = this.buildListItem(textStr, classes);

        const breadcrumbHyperlink = document.createElement('a');
        breadcrumbHyperlink.setAttribute('href', href);
        breadcrumbHyperlink.appendChild(text);
        listItem.appendChild(breadcrumbHyperlink);

        if( !prepend ) {
            this.list.appendChild(listItem);
        } else {
            this.list.insertBefore(listItem, this.list.firstElementChild);
        }

        return listItem;
    }
}

export { Breadcrumbs };