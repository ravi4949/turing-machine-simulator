// tm-graph.js — D3.js state diagram renderer
// All public functions assigned to window.

(function() {

  var svg        = null;
  var zoomBeh    = null;
  var nodeMap    = {};
  var graphDef   = null;
  var simulation = null;

  var COLORS = {
    start:  { fill: '#0a2535', stroke: '#00e5ff' },
    normal: { fill: '#161b24', stroke: '#2d3a52' },
    accept: { fill: '#0a251a', stroke: '#00ff88' },
    reject: { fill: '#25100a', stroke: '#ff4466' },
  };

  // ── drawGraph ───────────────────────────────────────────────────────────────
  function drawGraph(containerId, def) {
    graphDef = def;
    var container = document.getElementById(containerId);
    if (!container) { console.error('drawGraph: container not found', containerId); return; }

    container.innerHTML = '';

    var W = container.offsetWidth  || 380;
    var H = container.offsetHeight || 420;
    if (H < 200) H = 420;

    svg = d3.select('#' + containerId)
      .append('svg')
      .attr('width', '100%')
      .attr('height', H)
      .style('background', '#0f1218')
      .style('display', 'block');

    // Arrow markers
    var defs = svg.append('defs');
    addArrow(defs, 'arr',   '#3a4a6a');
    addArrow(defs, 'arr-g', '#00ff88');
    addArrow(defs, 'arr-r', '#ff4466');
    addArrow(defs, 'arr-c', '#00e5ff');

    var g = svg.append('g');

    zoomBeh = d3.zoom().scaleExtent([0.2, 4])
      .on('zoom', function(e) { g.attr('transform', e.transform); });
    svg.call(zoomBeh);

    // Build nodes arranged in a circle initially
    var n  = def.states.length;
    var cx = W / 2, cy = H / 2;
    var r  = Math.min(W, H) * 0.28;

    var nodes = def.states.map(function(s, i) {
      var a = (2 * Math.PI * i / n) - Math.PI / 2;
      return { id: s.id, label: s.label || s.id, type: s.type || 'normal',
               x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
    });

    nodeMap = {};
    nodes.forEach(function(n) { nodeMap[n.id] = n; });

    // Build edge map — combine duplicate from→to into one label
    var edgeMap = {};
    def.transitions.forEach(function(t) {
      var key = t.from + '|||' + t.to;
      if (!edgeMap[key]) edgeMap[key] = { from: t.from, to: t.to, labels: [] };
      edgeMap[key].labels.push(t.label);
    });
    var edges = Object.values(edgeMap);

    // Mark bidirectional
    edges.forEach(function(e) {
      e.bidir = (e.from !== e.to) && !!edgeMap[e.to + '|||' + e.from];
    });

    // ── Draw edges ──────────────────────────────────────────────────────────
    var edgeG = g.append('g');

    var paths = edgeG.selectAll('path').data(edges).enter().append('path')
      .attr('fill', 'none')
      .attr('stroke', function(d) { return edgeStroke(d); })
      .attr('stroke-width', 1.5)
      .attr('marker-end', function(d) { return 'url(#' + edgeArrow(d) + ')'; });

    var labels = edgeG.selectAll('text').data(edges).enter().append('text')
      .attr('fill', '#6a7a90').attr('font-family', 'Space Mono,monospace')
      .attr('font-size', '8px').attr('text-anchor', 'middle')
      .text(function(d) { return d.labels.join(' | '); });

    // ── Draw nodes ──────────────────────────────────────────────────────────
    var nodeG = g.append('g');

    var nodeGs = nodeG.selectAll('g').data(nodes).enter().append('g')
      .attr('id', function(d) { return 'nd-' + d.id; })
      .style('cursor', 'grab')
      .call(d3.drag()
        .on('start', function(e, d) { d.fx = d.x; d.fy = d.y; if (simulation) simulation.alphaTarget(.3).restart(); })
        .on('drag',  function(e, d) { d.fx = e.x; d.fy = e.y; })
        .on('end',   function(e, d) { d.fx = null; d.fy = null; if (simulation) simulation.alphaTarget(0); })
      );

    // Double ring for accept
    nodeGs.filter(function(d) { return d.type === 'accept'; })
      .append('circle').attr('r', 30).attr('fill', 'none')
      .attr('stroke', '#00ff88').attr('stroke-width', 1).attr('opacity', .5);

    nodeGs.append('circle').attr('class', 'nc').attr('r', 24)
      .attr('fill',   function(d) { return (COLORS[d.type] || COLORS.normal).fill; })
      .attr('stroke', function(d) { return (COLORS[d.type] || COLORS.normal).stroke; })
      .attr('stroke-width', 2);

    nodeGs.append('text')
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('fill', '#e2e8f0').attr('font-family', 'Space Mono,monospace')
      .attr('font-size', '10px').attr('font-weight', 'bold').attr('pointer-events', 'none')
      .text(function(d) { return d.label; });

    // Start arrow
    var startNode = nodeMap[def.startState];
    var startLine = g.append('line')
      .attr('stroke', '#00e5ff').attr('stroke-width', 2)
      .attr('marker-end', 'url(#arr-c)');

    // ── Force simulation ────────────────────────────────────────────────────
    var linkData = edges.filter(function(e) { return e.from !== e.to; })
      .map(function(e) { return { source: nodeMap[e.from], target: nodeMap[e.to] }; });

    simulation = d3.forceSimulation(nodes)
      .force('link',    d3.forceLink(linkData).distance(140).strength(.15))
      .force('charge',  d3.forceManyBody().strength(-500))
      .force('center',  d3.forceCenter(cx, cy))
      .force('collide', d3.forceCollide(60))
      .on('tick', function() {
        paths.attr('d', function(d) {
          var s = nodeMap[d.from], t = nodeMap[d.to];
          if (!s || !t) return '';
          if (d.from === d.to) return selfLoop(s);
          if (d.bidir)         return curve(s, t, 40);
          return line(s, t);
        });

        labels
          .attr('x', function(d) {
            var s = nodeMap[d.from], t = nodeMap[d.to];
            if (!s || !t) return 0;
            if (d.from === d.to) return s.x + 55;
            if (d.bidir) { var dx=t.x-s.x,dy=t.y-s.y,l=Math.sqrt(dx*dx+dy*dy)||1; return (s.x+t.x)/2-(dy/l)*40; }
            return (s.x + t.x) / 2;
          })
          .attr('y', function(d) {
            var s = nodeMap[d.from], t = nodeMap[d.to];
            if (!s || !t) return 0;
            if (d.from === d.to) return s.y - 55;
            if (d.bidir) { var dx=t.x-s.x,dy=t.y-s.y,l=Math.sqrt(dx*dx+dy*dy)||1; return (s.y+t.y)/2+(dx/l)*40; }
            return (s.y + t.y) / 2 - 7;
          });

        nodeGs.attr('transform', function(d) { return 'translate(' + d.x + ',' + d.y + ')'; });

        if (startNode) {
          startLine.attr('x1', startNode.x - 55).attr('y1', startNode.y)
                   .attr('x2', startNode.x - 27).attr('y2', startNode.y);
        }
      });

    console.log('Graph drawn:', nodes.length, 'states,', edges.length, 'edges');
  }

  // ── Highlight active state ──────────────────────────────────────────────────
  function highlightState(stateId) {
    if (!svg) return;
    svg.selectAll('.nc')
      .attr('fill',   function(d) { return (COLORS[d.type] || COLORS.normal).fill;   })
      .attr('stroke', function(d) { return (COLORS[d.type] || COLORS.normal).stroke; })
      .attr('stroke-width', 2);
    if (!stateId) return;
    d3.select('#nd-' + stateId).select('.nc')
      .attr('fill', '#252200').attr('stroke', '#ffcc00').attr('stroke-width', 3);
  }

  // ── Zoom ────────────────────────────────────────────────────────────────────
  function zoomIn()    { if (svg && zoomBeh) svg.transition().duration(250).call(zoomBeh.scaleBy, 1.4); }
  function zoomOut()   { if (svg && zoomBeh) svg.transition().duration(250).call(zoomBeh.scaleBy, 0.7); }
  function zoomReset() { if (svg && zoomBeh) svg.transition().duration(250).call(zoomBeh.transform, d3.zoomIdentity); }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function addArrow(defs, id, color) {
    defs.append('marker').attr('id', id).attr('viewBox','0 0 10 10')
      .attr('refX',9).attr('refY',5).attr('markerWidth',7).attr('markerHeight',7).attr('orient','auto')
      .append('path').attr('d','M0 0 L10 5 L0 10z').attr('fill', color);
  }

  function edgeStroke(d) {
    if (!graphDef) return '#3a4a6a';
    if (d.to === graphDef.acceptState) return '#00ff88';
    if (d.to === graphDef.rejectState) return '#ff4466';
    return '#3a4a6a';
  }

  function edgeArrow(d) {
    if (!graphDef) return 'arr';
    if (d.to === graphDef.acceptState) return 'arr-g';
    if (d.to === graphDef.rejectState) return 'arr-r';
    return 'arr';
  }

  function selfLoop(n) {
    return 'M'+(n.x+16)+' '+(n.y-18)+' C'+(n.x+55)+' '+(n.y-65)+' '+(n.x-15)+' '+(n.y-65)+' '+(n.x-16)+' '+(n.y-18);
  }

  function line(s, t) {
    var dx=t.x-s.x, dy=t.y-s.y, l=Math.sqrt(dx*dx+dy*dy)||1;
    return 'M'+(s.x+dx/l*26)+' '+(s.y+dy/l*26)+' L'+(t.x-dx/l*26)+' '+(t.y-dy/l*26);
  }

  function curve(s, t, b) {
    var dx=t.x-s.x, dy=t.y-s.y, l=Math.sqrt(dx*dx+dy*dy)||1;
    var mx=(s.x+t.x)/2-(dy/l)*b, my=(s.y+t.y)/2+(dx/l)*b;
    return 'M'+(s.x+dx/l*26)+' '+(s.y+dy/l*26)+' Q'+mx+' '+my+' '+(t.x-dx/l*26)+' '+(t.y-dy/l*26);
  }

  // ── Expose globally ──────────────────────────────────────────────────────────
  window.drawGraph      = drawGraph;
  window.highlightState = highlightState;
  window.tmZoomIn       = zoomIn;
  window.tmZoomOut      = zoomOut;
  window.tmZoomReset    = zoomReset;

  console.log('tm-graph.js loaded');
})();
