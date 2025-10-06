import { elements, qs } from '../utils/dom.js';
import { EventBus } from '../core/EventBus.js';
import { Parser } from '../markdown/Parser.js';
import { state } from '../core/State.js';

/**
 * ماژول پیش‌نمایش زنده
 * این ماژول مسئول رندر کردن محتوای مارک‌داون در پنل پیش‌نمایش است.
 */

// --- توابع رندرینگ خاص ---

/**
 * رندر کردن تمام نمودارهای Mermaid در پنل پیش‌نمایش
 */
async function renderMermaidDiagrams() {
    if (typeof window.mermaid === 'undefined') return;
    try {
        const mermaidElements = elements.preview.querySelectorAll('.mermaid');
        for (const el of mermaidElements) {
            const code = el.textContent;
            const id = `mermaid-svg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            el.textContent = 'در حال رندر شدن...';
            try {
                const { svg } = await mermaid.render(id, code);
                el.innerHTML = svg;
            } catch (e) {
                console.error("خطا در رندر Mermaid:", e);
                el.innerHTML = 'نمودار نامعتبر است';
            }
        }
    } catch (e) {
        console.error('خطای کلی در پردازش Mermaid:', e);
    }
}


/**
 * ایجاد یک نقشه ذهنی تعاملی
 * @param {HTMLElement} container - المانی که نقشه ذهنی در آن رندر می‌شود
 * @param {string} rawContent - محتوای خام نقشه ذهنی
 */
function createInteractiveMindMap(container, rawContent) {
    const { config, dataText } = parseMindmapConfigAndData(rawContent);
    const rootData = parseMindmapData(dataText, config);
    if (!rootData) {
        container.innerHTML = '<p style="padding: 1rem; text-align: center;">ساختار نقشه ذهنی نامعتبر است.</p>';
        return;
    }

    const NODE_PADDING_X = 20;
    const NODE_PADDING_Y = 10;
    const LEVEL_WIDTH = 200;
    const VERTICAL_GAP = 25;

    container.innerHTML = '';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.appendChild(g);
    container.appendChild(svg);
    svg.classList.add('mindmap-svg');

    let transform = { x: 0, y: 0, k: 1 };

    function applyTransform() {
        g.setAttribute('transform', `translate(${transform.x}, ${transform.y}) scale(${transform.k})`);
    }

    function redrawMindmap() {
        g.innerHTML = '';
        const mindmapMeasurementDiv = qs('#app > div[style*="visibility: hidden"]');

        function measureNodes(node) {
            mindmapMeasurementDiv.innerHTML = Parser.parseInline(node.text || ' ');
            node.width = mindmapMeasurementDiv.offsetWidth;
            node.height = mindmapMeasurementDiv.offsetHeight;
            if (!node.isCollapsed) node.children.forEach(measureNodes);
        }
        measureNodes(rootData);

        if (config.layout === 'two-sided') {
            const rightChildren = rootData.children.filter((_, i) => i % 2 === 0);
            const leftChildren = rootData.children.filter((_, i) => i % 2 !== 0);
            let rightY = 0, leftY = 0;

            function doLayoutBranch(node, depth, isRight) {
                const direction = isRight ? 1 : -1;
                const rootWidthOffset = (rootData.width / 2) + 40;
                node.x = direction * (depth * LEVEL_WIDTH * 0.75 + rootWidthOffset);
                if (node.isCollapsed || node.children.length === 0) {
                    if (isRight) {
                        node.y = rightY;
                        rightY += node.height + VERTICAL_GAP;
                    } else {
                        node.y = leftY;
                        leftY += node.height + VERTICAL_GAP;
                    }
                } else {
                    node.children.forEach(child => doLayoutBranch(child, depth + 1, isRight));
                    node.y = (node.children[0].y + node.children[node.children.length - 1].y) / 2;
                }
            }
            rightChildren.forEach(child => doLayoutBranch(child, 1, true));
            leftChildren.forEach(child => doLayoutBranch(child, 1, false));
            const totalHeight = Math.max(rightY, leftY);
            const rightShift = (totalHeight - rightY) / 2;
            const leftShift = (totalHeight - leftY) / 2;
            const shiftYs = (node, shift) => {
                node.y += shift;
                if (!node.isCollapsed) node.children.forEach(child => shiftYs(child, shift));
            };
            rightChildren.forEach(node => shiftYs(node, rightShift));
            leftChildren.forEach(node => shiftYs(node, leftShift));
            rootData.x = 0;
            rootData.y = totalHeight / 2;
        } else {
            let y = 0;
            function doLayoutRTL(node, depth) {
                node.x = -depth * LEVEL_WIDTH;
                if (node.isCollapsed || node.children.length === 0) {
                    node.y = y;
                    y += node.height + VERTICAL_GAP;
                } else {
                    node.children.forEach(child => doLayoutRTL(child, depth + 1));
                    node.y = (node.children[0].y + node.children[node.children.length - 1].y) / 2;
                }
            }
            doLayoutRTL(rootData, 0);
        }

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        function draw(node, parent = null) {
            if (parent) {
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.classList.add('mindmap-connector');
                const startX = parent.x + (node.x > parent.x ? parent.width / 2 : -parent.width / 2);
                const startY = parent.y + parent.height / 2;
                const endX = node.x + (node.x > parent.x ? -node.width / 2 : node.width / 2);
                const endY = node.y + node.height / 2;
                const c1X = startX + (endX - startX) / 2;
                const c2X = startX + (endX - startX) / 2;
                path.setAttribute('d', `M ${startX},${startY} C ${c1X},${startY} ${c2X},${endY} ${endX},${endY}`);
                g.insertBefore(path, g.firstChild);
            }
            const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            nodeGroup.classList.add('mindmap-node', `border-${config.border}`);
            nodeGroup.setAttribute('transform', `translate(${node.x - node.width / 2}, ${node.y})`);
            let shape;
            if (config.border === 'ellipse') {
                shape = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
                shape.setAttribute('rx', node.width / 2);
                shape.setAttribute('ry', node.height / 2);
                shape.setAttribute('cx', node.width / 2);
                shape.setAttribute('cy', node.height / 2);
            } else {
                shape = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                shape.setAttribute('width', node.width);
                shape.setAttribute('height', node.height);
                if (config.border === 'rectangle') shape.setAttribute('rx', 8);
            }
            shape.classList.add('mindmap-node-shape');
            if (config.border === 'none') shape.classList.add('shape-none');
            const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
            fo.setAttribute('width', node.width);
            fo.setAttribute('height', node.height);
            const div = document.createElement('div');
            div.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
            div.className = 'mindmap-node-content';
            div.innerHTML = Parser.parseInline(node.text || ' ');
            fo.appendChild(div);
            nodeGroup.appendChild(shape);
            nodeGroup.appendChild(fo);
            g.appendChild(nodeGroup);
            if (node.children.length > 0) {
                const btn = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                btn.classList.add('mindmap-collapse-btn');
                let btnX = (config.layout === 'two-sided' && node.x < (parent?.x ?? 0)) ? 0 : node.width;
                btn.setAttribute('transform', `translate(${btnX}, ${node.height / 2})`);
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('r', 8);
                const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                textEl.textContent = node.isCollapsed ? '+' : '−';
                btn.appendChild(circle);
                btn.appendChild(textEl);
                nodeGroup.appendChild(btn);
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    node.isCollapsed = !node.isCollapsed;
                    redrawMindmap();
                });
            }
            const currentX = node.x - node.width / 2;
            minX = Math.min(minX, currentX);
            maxX = Math.max(maxX, currentX + node.width);
            minY = Math.min(minY, node.y);
            maxY = Math.max(maxY, node.y + node.height);
            if (!node.isCollapsed) node.children.forEach(child => draw(child, node));
        }
        draw(rootData);
        recenterAndScale(minX, maxX, minY, maxY, config);
    }

    function recenterAndScale(minX, maxX, minY, maxY, config) {
        const graphWidth = maxX - minX;
        const graphHeight = maxY - minY;
        const viewWidth = container.clientWidth;
        const viewHeight = container.clientHeight;
        if (viewWidth <= 0 || viewHeight <= 0 || graphWidth <= 0 || graphHeight <= 0) return;
        const scale = Math.min(viewWidth / (graphWidth + NODE_PADDING_X * 4), viewHeight / (graphHeight + NODE_PADDING_Y * 4), 1);
        const centerX = minX + graphWidth / 2;
        const centerY = minY + graphHeight / 2;
        let tx = (viewWidth / 2) - (centerX * scale);
        const ty = (viewHeight / 2) - (centerY * scale);
        if (config.layout === 'rtl') {
            tx = viewWidth - (maxX * scale) - (NODE_PADDING_X * 2);
        }
        transform = { x: tx, y: ty, k: scale };
        applyTransform();
    }

    redrawMindmap();

    let isPanning = false;
    let startPoint = { x: 0, y: 0 };
    svg.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isPanning = true;
        svg.classList.add('grabbing');
        startPoint = { x: e.clientX, y: e.clientY };
    });
    svg.addEventListener('mousemove', (e) => {
        if (!isPanning) return;
        e.preventDefault();
        const endPoint = { x: e.clientX, y: e.clientY };
        transform.x += endPoint.x - startPoint.x;
        transform.y += endPoint.y - startPoint.y;
        startPoint = endPoint;
        applyTransform();
    });
    const stopPanning = () => {
        isPanning = false;
        svg.classList.remove('grabbing');
    };
    svg.addEventListener('mouseup', stopPanning);
    svg.addEventListener('mouseleave', stopPanning);
    svg.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const newScale = Math.max(0.1, Math.min(3, transform.k * (1 + delta)));
        const svgRect = svg.getBoundingClientRect();
        const mouseInSvg = { x: e.clientX - svgRect.left, y: e.clientY - svgRect.top };
        transform.x = mouseInSvg.x - (mouseInSvg.x - transform.x) * (newScale / transform.k);
        transform.y = mouseInSvg.y - (mouseInSvg.y - transform.y) * (newScale / transform.k);
        transform.k = newScale;
        applyTransform();
    });
    
    const resizeHandle = document.createElement('div');
    resizeHandle.classList.add('mindmap-resize-handle');
    container.appendChild(resizeHandle);
    const onMouseMove = (e) => {
        container.style.height = `${Math.max(200, e.clientY - container.getBoundingClientRect().top)}px`;
    };
    const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        redrawMindmap();
    };
    resizeHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
}


function parseMindmapConfigAndData(rawContent) {
    const config = { layout: 'rtl', border: 'none' };
    const lines = rawContent.trim().split('\n');
    let dataLines = lines;
    if (lines.length > 0 && lines[0].trim().startsWith('تنظیمات:')) {
      const configLine = lines[0].replace('تنظیمات:', '').trim();
      dataLines = lines.slice(1);
      if (configLine.includes('دو طرف')) config.layout = 'two-sided';
      if (configLine.includes('مستطیل')) config.border = 'rectangle';
      else if (configLine.includes('بیضی')) config.border = 'ellipse';
    }
    return { config, dataText: dataLines.join('\n') };
}

function parseMindmapData(text, config) {
    const lines = text.trim().split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return null;
    const getIndent = (line) => line.search(/\S|$/);
    const firstLineIndent = getIndent(lines[0]);
    const rootNodes = [];
    const path = [];
    for (const line of lines) {
      const indent = getIndent(line);
      const node = { text: line.trim().replace(/^- /, ''), children: [], isCollapsed: false };
      const level = indent < firstLineIndent ? 0 : Math.floor((indent - firstLineIndent) / 2);
      while (level < path.length) path.pop();
      if (path.length === 0) rootNodes.push(node);
      else path[path.length - 1].children.push(node);
      path.push(node);
    }
    if (rootNodes.length === 1) return rootNodes[0];
    const rootText = config.layout === 'two-sided' ? 'نقشه‌ذهنی' : (rootNodes[0]?.text || 'نقشه‌ذهنی');
    const rootChildren = rootNodes.length === 1 ? rootNodes[0].children : rootNodes;
    return { text: rootText, children: rootChildren, isCollapsed: false };
}


/**
 * افزودن دکمه کپی به تمام بلوک‌های کد
 */
function addCopyButtonsToCodeBlocks() {
    elements.preview.querySelectorAll('pre').forEach(pre => {
        if (pre.parentElement.classList.contains('code-block-wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper';
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-code-btn';
        copyBtn.title = 'رونوشت';
        copyBtn.innerHTML = '<i class="fas fa-copy"></i>';

        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);
        wrapper.appendChild(copyBtn);

        copyBtn.addEventListener('click', () => {
            const codeToCopy = pre.querySelector('code')?.innerText || pre.innerText;
            navigator.clipboard.writeText(codeToCopy).then(() => {
                copyBtn.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => { copyBtn.innerHTML = '<i class="fas fa-copy"></i>'; }, 2000);
            }).catch(err => console.error('خطا در کپی کردن کد:', err));
        });
    });
}


/**
 * تابع اصلی برای به‌روزرسانی پنل پیش‌نمایش
 * @param {string} markdown - محتوای مارک‌داون برای رندر
 */
async function updatePreview(markdown) {
    // پردازش نقشه‌های ذهنی قبل از پارسر اصلی
    const mindmapBlocks = [];
    const placeholderMarkdown = markdown.replace(/^\.\.\.نقشه‌ذهنی\n([\s\S]*?)\n\.\.\.$/gm, (match, content) => {
        const id = `mindmap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        mindmapBlocks.push({ id, content });
        return `<div id="${id}" class="mindmap-placeholder"></div>`;
    });

    elements.preview.innerHTML = Parser.parse(placeholderMarkdown);

    // رندر کردن کامپوننت‌های دینامیک
    await renderMermaidDiagrams();
    for (const block of mindmapBlocks) {
        const container = elements.preview.querySelector(`#${block.id}`);
        if (container) {
            container.classList.add('mindmap-container');
            createInteractiveMindMap(container, block.content);
        }
    }
    
    addCopyButtonsToCodeBlocks();

    // اگر جستجو فعال است، هایلایت‌ها را دوباره اعمال کن
    if (state.isSearchActive) {
        EventBus.emit('search:rerun');
    }
    
    // به‌روزرسانی فهرست مطالب
    EventBus.emit('toc:update');
}


/**
 * مقداردهی اولیه ماژول پیش‌نمایش
 */
export function init() {
    Parser.init();
    
    // ایجاد المان لازم برای اندازه‌گیری متن نقشه ذهنی
    const mindmapMeasurementDiv = document.createElement('div');
    mindmapMeasurementDiv.style.cssText = 'position:absolute; visibility:hidden; height:auto; width:auto; white-space:nowrap; font-family:Vazirmatn, sans-serif; font-size:14px; padding:10px 20px; z-index:-1;';
    qs('#app').appendChild(mindmapMeasurementDiv);


    // گوش دادن به رویدادهای مربوطه
    EventBus.on('editor:contentChanged', updatePreview);
    EventBus.on('app:loaded', updatePreview);
    EventBus.on('settings:changed', (settings) => {
        // اگر پارسر یا تم تغییر کرد، پیش‌نمایش را دوباره رندر کن
        if (settings.markdownParser || settings.theme) {
            const currentContent = document.getElementById('editor').value;
            updatePreview(currentContent);
        }
    });
}