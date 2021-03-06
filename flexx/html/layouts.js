/*  Script for handling widgets and layout.

*/

/* JSLint config */
/*global zoof */
/*jslint node: true, continue:true */
"use strict";

zoof.widgets = {};
zoof.AUTOFLEX = 729;  // magic number unlikely to occur in practice


zoof.createWidgetElement = function (type, D) {
    /* Used by all createX functions to create the HTML element, assign
       id and class name, and insert the element in the DOM.
    */
    var e = document.createElement(type),
        par;  // semantic parent
    
    e.id = D.id;
    zoof.widgets[D.id] = e;
    
    e.className = D.className;  // represents the Python class and all bases up to Widget
    
    e.hflex = D.hflex;
    e.vflex = D.vflex;
    e.zfInfo = D;  // store info used to create the widget
    
    // Set position. pos is used in Grid and PinBoard layout
    // Ignored unless position is absolute or relative
    e.style.left = (D.pos[0] > 1 ? D.pos[0] + "px" : D.pos[0] * 100 + "%");
    e.style.top = (D.pos[1] > 1 ? D.pos[1] + "px" : D.pos[1] * 100 + "%");
    
    // Set some style-related props
    e.style.minWidth = D.min_width + 'px';
    e.style.minHeight = D.min_height + 'px';
    e.style.cssText += D.css;
    
    // Add to parent
    par = zoof.get(D.parent);
    if (typeof par.appendWidget === 'function') {
        par.appendWidget(e);
    } else {
        par.appendChild(e);
    }
    
    // Add callback for resizing    
    e.checkResize = function () {
        /* This needs to be called if there is a chance that the widget has
           changed size. If will check the real size the next tick and emit
           a resize event if necessary.
        */
        setTimeout(e.checkResizeNow, 0);
    };
    e.storedSize = [0, 0];
    e.checkResizeNow = function () {
        var i, func, event;
        event = new window.CustomEvent("resize");
        event.widthChanged = (e.storedSize[0] !== e.clientWidth);
        event.heightChanged = (e.storedSize[1] !== e.clientHeight);
        if (event.widthChanged || event.heightChanged) {
            e.storedSize = [e.clientWidth, e.clientHeight];
            e.dispatchEvent(event);
        }
    };
        
    // Always invoke a resize after all initialization is done
    e.checkResize();
    // Keep up to date from parent size changes    
    if (par === document.body) {
        window.addEventListener('resize', e.checkResize, false);
    } else {
        par.addEventListener('resize', e.checkResize, false);
    }
    
    // Properties - not used yet ...
    e.setMinWidth = function (val) { e.style.minWidth = val + 'px'; };
    e.setMinHeight = function (val) { e.style.minHeight = val + 'px'; };
    e.setPos = function (pos) {
        e.style.left = (pos[0] > 1 ? pos[0] + "px" : pos[0] * 100 + "%");
        e.style.top  = (pos[1] > 1 ? pos[1] + "px" : pos[1] * 100 + "%");
        e.parentWidget.updateLayout();
    };
    
    return e;
};


zoof.setProps = function (id) {
    var i,
        e = zoof.get(id);
    for (i = 0; i < arguments.length; i += 2) {
        e[arguments[i]] = arguments[i + 1];
    }
};

zoof.setStyle = function (id) {
    var i,
        e = zoof.get(id);
    for (i = 1; i < arguments.length; i += 2) {
        e.style[arguments[i]] = arguments[i + 1];
    }
};


zoof.createWidget = function (D) {
    var e = zoof.createWidgetElement('div', D);
    return e;
};


zoof.createLabel = function (D) {
    var e = zoof.createWidgetElement('div', D);
    e.innerHTML = D.text;
    return e;
};


zoof.createButton = function (D) {
    var e = zoof.createWidgetElement('button', D);
    e.innerHTML = D.text;
    return e;
};


zoof.createBox = function (D) {
    var e;
    e = zoof.createWidgetElement('div', D);
            
    // layout margin is implemented by table padding
    e.style.padding = D.margin;
        
    e.applyLayout = function () { };
    
    e.applyBoxStyle = function (e, sty, value) {
        var prefix, prefixes, i;
        prefixes = ['-webkit-', '-ms-', '-moz-', ''];
        for (i = 0; i < prefixes.length; i += 1) {
            prefix = prefixes[i];
            e.style[prefix + sty] = value;
        }
    };
    return e;
};

zoof.createHBox = function (D) {
    var e = zoof.createBox(D);
        
    e.appendWidget = function (child) {
        e.appendChild(child);
        e.applyBoxStyle(child, 'flex-grow', child.hflex);
        if (child.hflex > 0) {
            e.applyBoxStyle(child, 'flex-basis', 0);
        }
        // todo: make this work also when items are removed and inserted
        if (e.children.length > 1) {
            child.style['margin-left'] = D.spacing;
        }
        // todo: flex-shrink?
    };
    
    // todo: allow setting these dynamically from Python (in a scalabale way)
    e.applyBoxStyle(e, 'align-items', 'center');  // flex-start, flex-end, center, baseline, stretch
    e.applyBoxStyle(e, 'justify-content', 'space-around');  // flex-start, flex-end, center, space-between, space-around
    return e;
};

zoof.createVBox = function (D) {
    var e = zoof.createBox(D);
    
    e.appendWidget = function (child) {
        e.appendChild(child);
        e.applyBoxStyle(child, 'flex-grow', child.vflex);
        if (child.vflex > 0) {
            e.applyBoxStyle(child, 'flex-basis', 0);
        }
    };
    
    e.applyBoxStyle(e, 'align-items', 'stretch');
    e.applyBoxStyle(e, 'justify-content', 'space-around');
    return e;
};


zoof.createTableHBox = function (D) {
    var e, row;
    
    e = zoof.createWidgetElement('table', D);
    row = document.createElement("tr");
    e.appendChild(row);
        
    // layout margin is implemented by table padding
    e.style.padding = D.margin;
    
    e.appendWidget = function (child) {
        var td = document.createElement("td");
        row.appendChild(td);
        td.appendChild(child);
        if (row.children.length > 1) {
            td.style['padding-left'] = D.spacing;
        }
    };
    
    e.applyLayout = function () {zoof.applyTableLayout(this); };
    
    e.applyCellLayout = function (row, col, vflex, hflex, cum_vflex, cum_hflex) {
        col.style.height = '100%';
        if (hflex === 0) {
            col.className = '';
            col.style.width = 'auto';
        } else {
            col.className = 'hflex';
            col.style.width = hflex * 100 / cum_hflex + '%';
        }
    };
    
    // no need to adjust the row-height when resizing
};


zoof.createTableVBox = function (D) {
    var e = zoof.createWidgetElement('table', D);
    
    e.appendWidget = function (child) {
        var tr = document.createElement("tr"),
            td = document.createElement("td");
        this.appendChild(tr);
        tr.appendChild(td);
        td.appendChild(child);
    };
    
    e.applyLayout = function () {zoof.applyTableLayout(this); };
    
    e.applyCellLayout = function (row, col, vflex, hflex, cum_vflex, cum_hflex) {
        
        row.vflex = vflex;
        if (vflex === 0) {
            col.className = 'hflex';
            row.style.height = 'auto';
        } else {
            col.className = 'vflex hflex';
            row.style.height = vflex * 100 / cum_vflex + '%';
        }
    };
    
    // We need to adjust height-percent when there is a vertical resize
    e.addEventListener('resize', zoof.adaptLayoutToSizeChange, false);
};


zoof.createForm = function (D) {
    var e = zoof.createWidgetElement('table', D);
    e.appendChild(document.createElement("tr"));
    
    e.appendWidget = function (child) {
        var row, td, itemsinrow;
        row = e.children[e.children.length - 1];
        itemsinrow = row.children.length;
        if (itemsinrow >= 2) {
            row = document.createElement("tr");
            e.appendChild(row);
        }
        td = document.createElement("td");
        row.appendChild(td);
        td.appendChild(child);
        // Do some auto-flexing
        child.hflex = (row.children.length === 1 ? 0 : 1);
    };
    
    e.applyLayout = function () {zoof.applyTableLayout(this); };
    
    e.applyCellLayout = function (row, col, vflex, hflex, cum_vflex, cum_hflex) {
        var className = '';
        if ((vflex === zoof.AUTOFLEX) || (vflex === 0)) {
            row.style.height = 'auto';
            className += '';
        } else {
            row.style.height = vflex * 100 / cum_vflex + '%';
            className += 'vflex';
        }
        className += ' ';
        if (hflex === 0) {
            col.style.width = 'auto';
            className += '';
        } else {
            col.style.width = '100%';
            className += 'hflex';
        }
        col.className = className;
    };
    
    // We need to adjust height-percent when there is a vertical resize
    e.addEventListener('resize', zoof.adaptLayoutToSizeChange, false);
};


zoof.createGrid = function (D) {
    var e = zoof.createWidgetElement('table', D);
    e.appendChild(document.createElement("tr"));
    
    e.appendWidget = function (child) {
        var i, j, row, cell;
        i = child.zfInfo.pos[1];
        j = child.zfInfo.pos[0];
        // Ensure enough rows
        while (i >= e.children.length) {
            e.appendChild(document.createElement("tr"));
        }
        row = e.children[i];
        // Ensure enough coloums
        while (j >= row.children.length) {
            row.appendChild(document.createElement("td"));
        }
        cell = row.children[j];
        // Append
        cell.appendChild(child);
    };
    
    e.applyLayout = function () {zoof.applyTableLayout(this); };
    
    e.applyCellLayout = function (row, col, vflex, hflex, cum_vflex, cum_hflex) {
        var className = '';
        if (vflex === 0) {
            row.style.height = 'auto';
            className += '';
        } else {
            row.style.height = vflex * 100 / cum_vflex + '%';
            className += 'vflex';
        }
        className += ' ';
        if (hflex === 0) {
            col.style.width = 'auto';
            className += '';
        } else {
            col.style.width = hflex * 100 / cum_hflex + '%';
            className += ' hflex';
        }
        col.className = className;
    };
    
    // We need to adjust height-percent when there is a vertical resize
    e.addEventListener('resize', zoof.adaptLayoutToSizeChange, false);

};


zoof.createPinBoard = function (D) {
    var e = zoof.createWidgetElement('div', D);
    e.applyLayout = function () {}; // dummy    
};


zoof.applyTableLayout = function (table) {
    /* To be called with a layout id when a child is added or stretch factor
       changes. Calculates the flexes and (via a layout-dependent function)
       sets the class of the td element and the width of the td element.
       The heights of tr elements is set on resize, since it behaves slightly 
       different.
    */
    var row, col,
        i, j, nrows, ncols,
        vflexes, hflexes, cum_vflex, cum_hflex;
        
    // Get table dimensions    
    nrows = table.children.length;
    ncols = 0;
    for (i = 0; i < nrows; i += 1) {
        row = table.children[i];
        ncols = Math.max(ncols, row.children.length);
    }
    if (nrows === 0 || ncols === 0) {
        return;
    }
    
    // Collect flexes
    vflexes = [];
    hflexes = [];
    for (i = 0; i < nrows; i += 1) {
        row = table.children[i];
        for (j = 0; j < ncols; j += 1) {
            col = row.children[j];
            if ((col === undefined) || (col.children.length === 0)) {
                continue;
            }
            vflexes[i] = Math.max(vflexes[i] || 0, col.children[0].vflex || 0);
            hflexes[j] = Math.max(hflexes[j] || 0, col.children[0].hflex || 0);
        }
    }
    
    // What is the cumulative "flex-value"?
    cum_vflex = vflexes.reduce(function (pv, cv) { return pv + cv; }, 0);
    cum_hflex = hflexes.reduce(function (pv, cv) { return pv + cv; }, 0);
    
    // If no flexes are given; assign each equal
    if (cum_vflex === 0) {
        for (i = 0; i < vflexes.length; i += 1) {  vflexes[i] = zoof.AUTOFLEX; }
        cum_vflex = vflexes.length * zoof.AUTOFLEX;
    }
    if (cum_hflex === 0) {
        for (i = 0; i < hflexes.length; i += 1) {  hflexes[i] = zoof.AUTOFLEX; }
        cum_hflex = hflexes.length * zoof.AUTOFLEX;
    }
    
    // Assign css class and height/weight to cells
    for (i = 0; i < nrows; i += 1) {
        row = table.children[i];
        row.vflex = vflexes[i] || 0;  // Store for use during resizing
        for (j = 0; j < ncols; j += 1) {
            col = row.children[j];
            if ((col === undefined) || (col.children.length === 0)) {
                continue;
            }
            table.applyCellLayout(row, col, vflexes[i], hflexes[j], cum_vflex, cum_hflex);
        }
    }
};


zoof.adaptLayoutToSizeChange = function (event) {
    /* This function adapts the height (in percent) of the flexible rows
    of a layout. This is needed because the percent-height applies to the
    total height of the table. This function is called whenever the
    table resizes, and adjusts the percent-height, taking the available 
    remaining table height into account. This is not necesary for the
    width, since percent-width in colums *does* apply to available width.
    */
    
    var table, row, col, i, j,
        cum_vflex, remainingHeight, remainingPercentage, maxHeight;
    
    table = event.target;
    
    if (event.heightChanged) {
        
        // Set one flex row to max, so that non-flex rows have their minimum size
        // The table can already have been stretched a bit, causing the total row-height
        // in % to not be sufficient from keeping the non-flex rows from growing.
        for (i = 0; i < table.children.length; i += 1) {
            row = table.children[i];
            if (row.vflex > 0) {
                row.style.height = '100%';
                break;
            }
        }
        
        // Get remaining height: subtract height of each non-flex row
        remainingHeight = table.clientHeight;
        cum_vflex = 0;
        for (i = 0; i < table.children.length; i += 1) {
            row = table.children[i];
            cum_vflex += row.vflex;
            if ((row.vflex === 0) && (row.children.length > 0)) {
                remainingHeight -= row.children[0].clientHeight;
            }
        }
        
        // Apply height % for each flex row
        remainingPercentage = 100 * remainingHeight / table.clientHeight;
        for (i = 0; i < table.children.length; i += 1) {
            row = table.children[i];
            if (row.vflex > 0) {
                row.style.height = Math.round(row.vflex / cum_vflex * remainingPercentage) + 1 + '%';
            }
        }
    }
};



zoof.createHSplit = function (D) {
    var e, container, ghost, widget, widgets, divider, dividers,
        i, w2, minWidth,
        onResize, onMouseDown, onMouseMove, onMouseUp, clipT, setOwnMinSize;
    
    e = zoof.createWidgetElement('div', D);
    
    // List of child elements and dividers to split them
    widgets = [];
    dividers = [];
    
    // Add container. We need a container that is absolutely positioned,
    // because the children are positoned relative to the first absolutely 
    // positioned parent.
    container = document.createElement("div");
    container.classList.add('zf-splitter-container');
    e.appendChild(container);
    
    // Add Ghost (the thing the usr grabs and moves around)
    ghost = document.createElement("div");
    ghost.classList.add('zf-splitter-ghost');
    container.appendChild(ghost);
    ghost.style.visibility = 'hidden';
    
    // Divider width    
    w2 = 3; // half of divider width    
    ghost.style.width = 2 * w2 + 'px';
    
    // Flag to indicate dragging, the number indicates which divider is dragged (-1)
    ghost.isdragging = 0;
        
    // Public methods
    
    e.appendWidget = function (child) {
        return e.insertWidget(child, widgets.length);
    };
    
    e.insertWidget = function (child, index) {
        /* Add to container and create divider if there is something to divide.
        */
        var needSize, newTs, tPrev, curSize, sizeLeft;
        container.appendChild(child);
        widgets.splice(index, 0, child);
        if (widgets.length >= 2) {
            divider = document.createElement("div");
            divider.classList.add('zf-splitter-divider');
            divider.style.width = 2 * w2 + 'px';
            divider.addEventListener('mousedown', onMouseDown, false);
            divider.dividerIndex = dividers.length;
            divider.t = e.clientWidth;
            divider.tInPerc = 1.0;
            container.appendChild(divider);
            dividers.push(divider);  // does not have to be inserted at index 
            
            // Set new divider positions; take space from each widget
            needSize = e.clientWidth / widgets.length;
            sizeLeft = e.clientWidth - needSize;
            newTs = [];
            for (i = 0; i < dividers.length; i += 1) {
                if (i !== index - 1) {
                    tPrev = (i > 0) ? dividers[i - 1].t : 0;
                    curSize = (dividers[i].t - tPrev);
                    newTs.push(curSize * sizeLeft / e.clientWidth);
                    //console.log([index, i, t, dividers[i].t, curSize, newTs[i]]);
                } else {
                    newTs.push(needSize);
                }
                newTs[i] += newTs[i - 1] || 0;
            }
            //console.log([newTs + '', sizeLeft]);
            for (i = 0; i < dividers.length; i += 1) {
                e.moveDivider(i, newTs[i]);
            }
        }
        setOwnMinSize();
    };
    
    e.applyLayout = function () {}; // dummy    
                    
    e.moveDivider = function (i, t) {
        /* Move the given divider.
        Each divider keep
        */
        var begin, end;
        if (t < 1) {
            t *= e.clientWidth;
        }
        t = clipT(i, t);
        // Store data
        dividers[i].t = t;
        dividers[i].tInPerc = t / e.clientWidth;  // to use during resizing
        // Set divider and ghost
        ghost.style.left = (t - w2) + 'px';
        dividers[i].style.left = (t - w2) + 'px';
        // Set widgets
        begin = (i - 1 < 0) ? 0 : dividers[i - 1].t + w2;
        end = (i + 1 >= dividers.length) ? e.clientWidth : dividers[i + 1].t - w2;
        widgets[i].style.width = (t - begin - w2) + 'px';
        widgets[i + 1].style.left = (t + w2) + 'px';
        widgets[i + 1].style.width = (end - t - w2) + 'px';  // there seems to be a margin?        
    };
    
    //  Private functions
    
    setOwnMinSize = function () {
        var w = 50,
            h = 50;
        for (i = 0; i < widgets.length; i += 1) {
            w += 2 * w2 + parseFloat(widgets[i].style.minWidth) || minWidth;
            h += 2 * w2 + parseFloat(widgets[i].style.minHeight) || minWidth;
        }
        e.style.minWidth = w + 'px';
        e.style.minHeight = h + 'px';
    };
    
    minWidth = 20;
    clipT = function (i, t) {
        /* Clip the t value, taking into account the boundary of the 
        splitter itself, neighboring dividers, and the minimum sizes 
        of widget elements.
        */
        var min, max;
        // Get min and max towards edges or other dividers
        min = (i > 0) ? dividers[i - 1].t : 0;
        max = (i < dividers.length - 1) ? dividers[i + 1].t : e.clientWidth;
        // Take minimum width of widget into account
        // todo: this assumes the minWidth is specied in pixels, not e.g em.
        min += 2 * w2 + parseFloat(widgets[i].style.minWidth) || minWidth;
        max -= 2 * w2 + parseFloat(widgets[i + 1].style.minWidth) || minWidth;
        // Clip
        return Math.min(max, Math.max(min, t));
    };
    
    onResize = function () {
        /* Keep container in its max size
        */
        var i;
        container.style.left = e.offsetLeft + 'px';
        container.style.top = e.offsetTop + 'px';
        container.style.width = e.offsetWidth + 'px';
        container.style.height = e.offsetHeight + 'px';
        container.classList.remove('dotransition');
        for (i = 0; i < dividers.length; i += 1) {
            e.moveDivider(i, dividers[i].tInPerc);
        }
    };
    
    onMouseDown = function (ev) {
        container.classList.add('dotransition');  //
        ev.stopPropagation();
        ev.preventDefault();
        ghost.isdragging = ev.target.dividerIndex + 1;
        e.moveDivider(ev.target.dividerIndex, ev.clientX - e.offsetLeft);
        ghost.style.visibility = 'visible';
        //ev.dataTransfer.setData("Text", ev.target.id); // for dragging
    };
    
    onMouseMove = function (ev) {
        if (ghost.isdragging) {
            ev.stopPropagation();
            ev.preventDefault();
            i = ghost.isdragging - 1;
            ghost.style.left = clipT(i, ev.clientX - e.offsetLeft - w2) + 'px';
        }
    };
    
    onMouseUp = function (ev) {
        var t;
        if (ghost.isdragging) {
            ev.stopPropagation();
            ev.preventDefault();
            i = ghost.isdragging - 1;
            ghost.isdragging = 0;
            ghost.style.visibility = 'hidden';
            e.moveDivider(i, clipT(i, ev.clientX - e.offsetLeft));
        }
    };
    
    // Bind event handlers
    e.addEventListener('resize', onResize, false);
    container.addEventListener('mousemove', onMouseMove, false);
    window.addEventListener('mouseup', onMouseUp, false);
    return e;
};


zoof.createPHSplit = function (D) {
    var e, container,
        onResize;
    e = zoof.createWidgetElement('div', D);
    container = new window.phosphor.ui.splitter.Splitter(0);
    window.ccc = container;  // debugging
    //e.appendChild(container.node);
    
    e.applyLayout = function () {}; // dummy    
    
    onResize = function () {
        /* Keep container in its max size
        */
        return;
        var i;
        container.node.style.left = e.offsetLeft + 'px';
        container.node.style.top = e.offsetTop + 'px';
        container.node.style.width = e.offsetWidth + 'px';
        container.node.style.height = e.offsetHeight + 'px';
    };
    container.attach(e);
    container.fitToHost();
    
    e.appendWidget = function (child) {
        var widget = new window.phosphor.ui.widget.Widget();
        widget.node.appendChild(child);
        container.addWidget(widget);
    };
        
};

zoof.createPDockArea = function (D) {
    var e, container,
        onResize;
    e = zoof.createWidgetElement('div', D);
    container = new window.phosphor.ui.dockarea.DockArea(0);
    window.ccc = container;  // debugging
    //e.appendChild(container.node);
    
    e.applyLayout = function () {}; // dummy    
    
    onResize = function () {
        /* Keep container in its max size
        */
        return;
        var i;
        container.node.style.left = e.offsetLeft + 'px';
        container.node.style.top = e.offsetTop + 'px';
        container.node.style.width = e.offsetWidth + 'px';
        container.node.style.height = e.offsetHeight + 'px';
    };
    container.attach(e);
    container.fitToHost();
    
    e.appendWidget = function (child) {
        var name = 'fooo';
        var widget = new window.phosphor.ui.dockwidget.DockWidget(name);
        widget.node.appendChild(child);
        widget.tab.closable = true;
        container.addWidget(widget);
    };
};

zoof.createMenuBar = function (D) {
    var e, container,
        onResize;
    e = zoof.createWidgetElement('div', D);
    container = new window.phosphor.ui.menubar.MenuBar();
    window.ccc = container;  // debugging
    //e.appendChild(container.node);  
    
    container.attach(e);
    container.fitToHost();
    
    e.appendWidget = function (child) {
        container.addItem(child);
        //container._m_items.push(child);
        console.log('adding ' + D.name + ' to menu bar');
    };
    return e;
};

/*
zoof.createMenu = function (D) {
    var e = new window.phosphor.ui.menu.Menu({'text': D.text});
    zoof.widgets[D.id] = e;
    
    e.appendWidget = function (child) {
        e.addItem(child);
    };
    return e;
};
*/

zoof.createMenuItem = function (D) {
    var menu = new window.phosphor.ui.menu.Menu();
    var e = new window.phosphor.ui.menuitem.MenuItem({'text': D.text, 'submenu': menu});
    window.cccc = window.cccc || e;
    zoof.widgets[D.id] = e;
    
    var par = zoof.get(D.parent);
    par.appendWidget(e);
    
    e.appendWidget = function (child) {
        menu.addItem(child);
    };
    
    return e;
};
