(() => {
  'use strict';
  const payload = window.MATH104_GRAPH;
  if (!payload || !window.cytoscape) {
    document.getElementById('cy').textContent = 'Graph data or Cytoscape.js could not be loaded.';
    return;
  }

  const typeColors = { topic:'#cbd5df', definition:'#88b8d8', principle:'#8367a8', theorem:'#6fa889' };
  const elements = [
    ...payload.nodes.map(n => ({ data: { ...n, label: `${n.name_cn}\n${n.name_en}` } })),
    ...payload.edges.map((e, i) => ({ data: { id:`edge-${i}`, source:e.source_id, target:e.target_id, ...e } }))
  ];

  const cy = cytoscape({
    container: document.getElementById('cy'),
    elements,
    minZoom:.22, maxZoom:2.4, wheelSensitivity:.18,
    style: [
      { selector:'node', style:{
        'background-color': e => typeColors[e.data('type')] || '#aaa',
        'shape': e => e.data('type') === 'principle' ? 'hexagon' : e.data('type') === 'topic' ? 'round-rectangle' : 'round-rectangle',
        'width': e => e.data('type') === 'topic' ? 154 : 132,
        'height': e => e.data('type') === 'topic' ? 54 : 48,
        'label':'data(label)', 'text-wrap':'wrap', 'text-max-width':'124px',
        'font-family':'Microsoft YaHei, sans-serif', 'font-size':'9px',
        'color':'#17202a', 'text-valign':'center', 'text-halign':'center',
        'border-width':'1px', 'border-color':'#53616e'
      }},
      { selector:'edge', style:{
        'width': e => e.data('relation') === 'supports_proof' ? 3 : 1.7,
        'line-color':'#788590', 'target-arrow-color':'#788590', 'target-arrow-shape':'triangle',
        'curve-style':'bezier', 'arrow-scale':.75, 'opacity':.78
      }},
      { selector:'edge[evidence="structurally_inferred"]', style:{ 'line-style':'dashed', 'opacity':.65 }},
      { selector:'edge[evidence="exploratory"]', style:{ 'line-style':'dotted', 'line-color':'#cf6a32', 'target-arrow-color':'#cf6a32' }},
      { selector:'.dim', style:{ 'opacity':.1, 'text-opacity':.08 }},
      { selector:'.highlight', style:{ 'border-width':'4px', 'border-color':'#cf6a32', 'z-index':20 }},
      { selector:'edge.highlight', style:{ 'opacity':1, 'width':4, 'line-color':'#cf6a32', 'target-arrow-color':'#cf6a32', 'z-index':20 }},
      { selector:':selected', style:{ 'border-width':'4px', 'border-color':'#cf6a32' }}
    ],
    layout:{ name:'breadthfirst', directed:true, spacingFactor:1.25, padding:35 }
  });

  let mode = 'course';
  let selectedId = null;
  const activeTypes = new Set(['topic','definition','principle','theorem']);
  const activeEvidence = new Set(['source_stated','structurally_inferred','exploratory']);
  const modeHelp = {
    course:'从 Week 1 到课程末端的稳定主线。点击主题查看详情。',
    focus:'选择一个节点，只显示其直接前置与后续关系。',
    proof:'查看已经精细录入的 definitions、principles 和 theorems。'
  };

  function eligibleNodes(){
    if (mode === 'course') return cy.nodes('[type="topic"]');
    if (mode === 'proof') return cy.nodes().filter(n => n.data('type') !== 'topic' && activeTypes.has(n.data('type')));
    if (!selectedId) return cy.nodes().filter(n => activeTypes.has(n.data('type')));
    const center = cy.getElementById(selectedId);
    if (!center.length) return cy.collection();
    return center.union(center.predecessors('node')).union(center.successors('node'))
      .filter(n => activeTypes.has(n.data('type')));
  }

  function applyView(runLayout=true){
    cy.elements().removeClass('dim highlight');
    cy.elements().hide();
    const nodes = eligibleNodes();
    nodes.show();
    cy.edges().filter(e => e.source().visible() && e.target().visible() && activeEvidence.has(e.data('evidence'))).show();
    if (runLayout) {
      const roots = mode === 'focus' && selectedId ? `#${selectedId}` : undefined;
      cy.elements(':visible').layout({ name:'breadthfirst', directed:true, roots, spacingFactor:1.3, padding:36, animate:false }).run();
      cy.fit(cy.elements(':visible'), 34);
    }
    updateCount();
  }

  function sourceHref(n){
    if (n.source === 'Rudin') return '../02 Textbooks/Rudin/Full Text/Rudin · Principles of Mathematical Analysis · 3rd Edition.pdf';
    if (n.source === 'Ross') return '../02 Textbooks/Ross/Full Text/Ross · Elementary Analysis - The Theory of Calculus · 2nd Edition.pdf';
    if (n.source === 'Syllabus') return '../01 Course Information/Current Course/2026 Fall - Syllabus.html';
    return '../01 Course Information/Current Course/2026 Fall - Rudin-Ross Course Handout.html';
  }

  function relationList(node, direction){
    const edges = direction === 'in' ? node.incomers('edge') : node.outgoers('edge');
    return edges.filter(e => activeEvidence.has(e.data('evidence'))).map(e => {
      const other = direction === 'in' ? e.source() : e.target();
      return `<li><button class="jump" data-id="${other.id()}">${other.data('name_cn')} · ${other.data('name_en')}</button><br><span class="rel-label">${e.data('relation')} · ${e.data('evidence')}</span></li>`;
    }).join('') || '<li>当前数据中没有记录。</li>';
  }

  function showDetail(node){
    const n = node.data(); selectedId = node.id();
    document.getElementById('empty-detail').hidden = true;
    document.getElementById('node-detail').hidden = false;
    document.getElementById('detail-type').textContent = n.type;
    document.getElementById('detail-cn').textContent = n.name_cn;
    document.getElementById('detail-en').textContent = n.name_en;
    document.getElementById('detail-week').textContent = n.course_location;
    document.getElementById('detail-source').textContent = n.source;
    document.getElementById('detail-locator').textContent = n.locator;
    document.getElementById('detail-verification').textContent = n.verification;
    document.getElementById('detail-notes').textContent = n.notes;
    document.getElementById('incoming').innerHTML = relationList(node,'in');
    document.getElementById('outgoing').innerHTML = relationList(node,'out');
    const note = document.getElementById('open-note');
    note.hidden = !/Week 1/.test(n.course_location);
    document.getElementById('open-source').href = sourceHref(n);
    document.querySelectorAll('.jump').forEach(b => b.addEventListener('click', () => selectNode(b.dataset.id)));
  }

  function selectNode(id){
    const node = cy.getElementById(id); if (!node.length) return;
    cy.$(':selected').unselect(); node.select(); showDetail(node);
    if (mode === 'focus') applyView(true);
    else { cy.animate({ center:{ eles:node }, zoom:Math.max(cy.zoom(), .8) }, { duration:250 }); }
  }

  function updateCount(){
    document.getElementById('graph-count').textContent = `${cy.nodes(':visible').length} nodes · ${cy.edges(':visible').length} relationships`;
  }

  cy.on('tap','node', e => showDetail(e.target));
  cy.on('mouseover','node', e => {
    const neighborhood = e.target.closedNeighborhood();
    cy.elements(':visible').not(neighborhood).addClass('dim'); neighborhood.addClass('highlight');
  });
  cy.on('mouseout','node', () => cy.elements().removeClass('dim highlight'));

  document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
    mode = button.dataset.mode;
    document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('active', b === button));
    document.getElementById('mode-help').textContent = modeHelp[mode];
    applyView(true);
  }));
  document.querySelectorAll('[data-type]').forEach(box => box.addEventListener('change', () => {
    box.checked ? activeTypes.add(box.dataset.type) : activeTypes.delete(box.dataset.type); applyView(true);
  }));
  document.querySelectorAll('[data-evidence]').forEach(box => box.addEventListener('change', () => {
    box.checked ? activeEvidence.add(box.dataset.evidence) : activeEvidence.delete(box.dataset.evidence); applyView(false);
  }));
  document.getElementById('fit').addEventListener('click', () => cy.fit(cy.elements(':visible'),34));
  document.getElementById('reset').addEventListener('click', () => { selectedId=null; applyView(true); });

  const search = document.getElementById('search');
  function runSearch(){
    const q = search.value.trim().toLowerCase();
    cy.elements().removeClass('dim highlight');
    if (!q) return;
    const matches = cy.nodes().filter(n => [n.id(),n.data('name_cn'),n.data('name_en'),n.data('source'),n.data('locator'),n.data('course_location')].join(' ').toLowerCase().includes(q));
    if (matches.length) {
      if (mode === 'course' && !matches.some(n => n.data('type') === 'topic')) { mode='focus'; document.querySelector('[data-mode="focus"]').click(); }
      cy.elements(':visible').not(matches).addClass('dim'); matches.addClass('highlight').show();
      cy.fit(matches,80);
      if (matches.length === 1) showDetail(matches[0]);
    }
  }
  search.addEventListener('input', runSearch);
  search.addEventListener('keydown', e => { if(e.key==='Enter') runSearch(); });
  document.getElementById('clear-search').addEventListener('click', () => { search.value=''; applyView(false); search.focus(); });

  applyView(true);
})();
