// D3
var SVG_W = 900
var SVG_H = 600
var IMG_SIZE = 50
var PICKUP_SCALE = 1.5
var COLLIDE = 30
var MARKER_SIZE = 20
var LINE_WIDTH = 4

var pickuped = false
var touched = false

var iiRelease
var iccRelease
var icuRelease
getHistory()

var svg = d3.select('#contents').append('svg')
  .attr('width', SVG_W)
  .attr('height', SVG_H)

var container = svg.append('g')
var zoom = d3.zoom()
  .scaleExtent([0.3, 3])
  .on('zoom', function () {
    container.attr('transform', d3.event.transform)
  })
svg.call(zoom).on('dblclick.zoom', null)

var mSize = MARKER_SIZE
var mSize2 = mSize / 2
var mSize4 = mSize / 4

svg.append('defs').selectAll('marker')
  .data(['sarrow', 'tarrow'])
  .enter().append('marker')
  .attr('id', function (d) { return d + '1' })
  .attr('class', function (d) { return d })
  .attr('markerUnits', 'userSpaceOnUse')
  .attr('markerWidth', mSize)
  .attr('markerHeight', mSize)
  .attr('viewBox', '0 0 ' + mSize2 + ' ' + mSize2)
  .attr('refX', mSize)
  .attr('refY', mSize4)
  .attr('orient', 'auto')
  .append('polygon')
  .attr('points', '0,0 ' + mSize4 + ',' + mSize4 +
    ' 0,' + mSize2 + ' ' + mSize2 + ',' + mSize4)

mSize = MARKER_SIZE * PICKUP_SCALE
mSize2 = mSize / 2
mSize4 = mSize / 4
svg.append('defs').selectAll('marker')
  .data(['sarrow', 'tarrow'])
  .enter().append('marker')
  .attr('id', function (d) { return 'p' + d + '1' })
  .attr('class', function (d) { return d })
  .attr('markerUnits', 'userSpaceOnUse')
  .attr('markerWidth', mSize)
  .attr('markerHeight', mSize)
  .attr('viewBox', '0 0 ' + mSize2 + ' ' + mSize2)
  .attr('refX', mSize)
  .attr('refY', mSize4)
  .attr('orient', 'auto')
  .append('polygon')
  .attr('points', '0,0 ' + mSize4 + ',' + mSize4 +
        ' 0,' + mSize2 + ' ' + mSize2 + ',' + mSize4)

mSize = MARKER_SIZE * 2
mSize2 = mSize / 2
mSize4 = mSize / 4
svg.append('defs').selectAll('marker')
  .data(['sarrow', 'tarrow'])
  .enter().append('marker')
  .attr('id', function (d) { return d + '2' })
  .attr('class', function (d) { return d })
  .attr('markerUnits', 'userSpaceOnUse')
  .attr('markerWidth', mSize)
  .attr('markerHeight', mSize)
  .attr('viewBox', '0 0 ' + mSize2 + ' ' + mSize2)
  .attr('refX', mSize / (2 / PICKUP_SCALE))
  .attr('refY', mSize4)
  .attr('orient', 'auto')
  .append('polygon')
  .attr('points', '0,0 ' + mSize4 + ',' + mSize4 +
    ' 0,' + mSize2 + ' ' + mSize2 + ',' + mSize4)

mSize = MARKER_SIZE * PICKUP_SCALE * 2
mSize2 = mSize / 2
mSize4 = mSize / 4
svg.append('defs').selectAll('marker')
  .data(['sarrow', 'tarrow'])
  .enter().append('marker')
  .attr('id', function (d) { return 'p' + d + '2' })
  .attr('class', function (d) { return d })
  .attr('markerUnits', 'userSpaceOnUse')
  .attr('markerWidth', mSize)
  .attr('markerHeight', mSize)
  .attr('viewBox', '0 0 ' + mSize2 + ' ' + mSize2)
  .attr('refX', mSize / (2 / PICKUP_SCALE))
  .attr('refY', mSize4)
  .attr('orient', 'auto')
  .append('polygon')
  .attr('points', '0,0 ' + mSize4 + ',' + mSize4 +
        ' 0,' + mSize2 + ' ' + mSize2 + ',' + mSize4)

var simulation = d3.forceSimulation()
  .force('link', d3.forceLink().id(function (d) { return d.id }))
  .force('collide', d3.forceCollide(function () { return COLLIDE }).iterations(25))
  .force('charge', d3.forceManyBody().strength(function () { return 10 }))
  .force('center', d3.forceCenter(SVG_W / 2, SVG_H / 2))

var data, idols, pidolG, linkG, circleG
d3.json('data/ii.json', function (err, jsondata) {
  if (err) console.log(err)
  data = jsondata

  linkG = container.append('g').attr('class', 'links')
  circleG = container.append('g').attr('class', 'circles')

  d3.shuffle(data.nodes)
  var idolG = container.append('g').attr('class', 'idols')
  idols = idolG.selectAll('image')
    .data(data.nodes, function (d) { return d.id })
    .enter().append('image')
    .attr('id', function (d) { return 'i_' + d.id })
    .attr('xlink:href', function (d) { return 'img/idol/' + d.id + '.png' })
    .attr('height', IMG_SIZE)
    .attr('width', IMG_SIZE)
    .on('click', hidePickup)
    .on('dblclick', showPickup)
    .on('mouseenter', function (d) {
      if (pickuped) return

      d3.select(this).classed('hover', true)
      d.hover = true
      drawNeighbor(data.nodes, data.links)
      // showTooltip(d)
    })
    .on('mouseleave', function (d) {
      if (pickuped) return

      d3.select(this).classed('hover', false)
      d.hover = false
      drawNeighbor(data.nodes, data.links)
      hideTooltip()
    })
    .on('touchstart', function (d, e) {
      if (d3.select(this).classed('hover')) {
        touched = true
        showPickup(d)
      }
    })
    .call(d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended))

  simulation
    .nodes(data.nodes)
    .on('tick', ticked)

  simulation.force('link')
    .links(data.links)

  pidolG = container.append('g').attr('class', 'pidols')
})

function ticked () {
  var showTarget = !d3.select('#showTarget').classed('off')
  var showSource = !d3.select('#showSource').classed('off')

  idols
    .classed('target', function (d) { return d.t && showSource })
    .classed('source', function (d) { return d.s && showTarget })
    .classed('searched', function (d) { return d.search })
    .attr('x', function (d) { return d.x - IMG_SIZE / 2 })
    .attr('y', function (d) { return d.y - IMG_SIZE / 2 })

  linkG.selectAll('line')
    .classed('target', function (d) { return d.t })
    .classed('source', function (d) { return d.s })
    .attr('x1', function (d) { return d.source.x })
    .attr('y1', function (d) { return d.source.y })
    .attr('x2', function (d) { return d.target.x })
    .attr('y2', function (d) { return d.target.y })
  circleG.selectAll('circle')
    .attr('cx', function (d) { return d.x })
    .attr('cy', function (d) { return d.y })
    .attr('r', function (d) {
      return pickuped ? IMG_SIZE * PICKUP_SCALE / 2 + 2 : IMG_SIZE / 2 + 1
    })
}

function drawNeighbor (nodes, links) {
  var pidolList = []
  var circleList = []
  var linkList = []

  var showTarget = !d3.select('#showTarget').classed('off')
  var showSource = !d3.select('#showSource').classed('off')
  var show2017 = !d3.select('#show2017').classed('off')
  var show2018 = !d3.select('#show2018').classed('off')

  var tmpLinsk = []
  d3.map(links, function (l) {
    l.source.s = false
    l.source.t = false
    l.source.m = false
    l.source.p = false
    l.source.syears = []
    l.source.tyears = []
    l.s = false
    l.t = false
    l.m = false
    l.w = 0
    l.tmpYears = []

    var years = []
    d3.map(l.years, function (y) {
      if (show2017 && y === 2017) years.push(y)
      if (show2018 && y === 2018) years.push(y)
    })

    if (years.length) {
      l.tmpYears = years
      tmpLinsk.push(l)
    }
  })

  var sn = {}
  d3.select('.selected,.hover').each(function (n) {
    sn = n
    sn.p = true

    d3.map(tmpLinsk, function (l) {
      if (l.source.id === n.id) {
        l.s = true
        l.w += l.tmpYears.length
        l.source.s = true
        l.target.t = true
        l.target.syears = l.tmpYears
        linkList.push(l)
        if (showSource && checkId(l.target.id, circleList)) circleList.push(l.target)
      } else {
        l.s = false
      }

      if (l.target.id === n.id) {
        l.t = true
        l.w += l.tmpYears.length
        l.source.s = true
        l.target.t = true
        l.source.tyears = l.tmpYears
        linkList.push(l)
        if (showTarget && checkId(l.source.id, circleList)) circleList.push(l.source)
      } else {
        l.t = false
      }
    })
  })

  d3.map(linkList, function (l) {
    if (l.source.s && l.source.t && l.target.s && l.target.t) {
      l.m = true
    }
  })

  if (pickuped) {
    sn.x = SVG_W / 2
    sn.y = SVG_H / 2

    if (showSource) {
      d3.map(circleList, function (d) {
        if (d.t && checkId(d.id, pidolList)) pidolList.push(d)
      })
    }
    if (showTarget) {
      d3.map(circleList, function (d) {
        if (d.s && checkId(d.id, pidolList)) pidolList.push(d)
      })
    }
    var len = pidolList.length
    var drad = 2 * Math.PI / len
    var r = $('#collideValue').text() * 10
    d3.map(pidolList, function (d, i) {
      d.ox = d.x
      d.oy = d.y
      var rad = i * drad
      d.x = Math.cos(rad) * r + SVG_W / 2
      d.y = Math.sin(rad) * r + SVG_H / 2
    })
    pidolList.push(sn)
  }

  if (sn.p) circleList.push(sn)
  drawCircles(circleList, pidolList)
  drawLinks(linkList)
  ticked()
}

function drawLinks (linkList) {
  var links = linkG.selectAll('line').data(linkList)
  links.exit().remove()
  links.enter().append('line')
    .classed('target', function (d) { return d.t })
    .classed('source', function (d) { return d.s })
    .classed('mutual', function (d) { return d.m })
    .attr('marker-end', setMarker)
    .attr('stroke-width', function (d) { return d.w * LINE_WIDTH })
  links
    .attr('marker-end', setMarker)

  function setMarker (d) {
    return 'url(#' + (pickuped ? 'p' : '') + (d.t ? 't' : 's') + 'arrow' + d.w + ')'
  }
}

function drawCircles (circleList, pidolList) {
  var pidols = pidolG.selectAll('image')
    .data(pidolList)
  pidols.exit().remove()
  pidols.enter().append('image')
    .attr('id', function (d) { return d.id + '_img' })
    .attr('xlink:href', function (d) { return 'img/idol/' + d.id + '.png' })
    .attr('x', function (d) { return d.x - IMG_SIZE * PICKUP_SCALE / 2 })
    .attr('y', function (d) { return d.y - IMG_SIZE * PICKUP_SCALE / 2 })
    .attr('width', IMG_SIZE * PICKUP_SCALE)
    .attr('height', IMG_SIZE * PICKUP_SCALE)
    .on('dblclick', resetPickup)
    .on('mouseenter', function (d) {
      showTooltip(d)
    })
    .on('mouseleave', function (d) {
      hideTooltip()
    })
    .on('touchstart', function (d) {
      if (d3.select(this).classed('pselected')) {
        d3.select(this).classed('pselected', false)
        touched = true
        resetPickup(d)
      } else {
        d3.selectAll('.pselected').classed('pselected', false)
        d3.select(this).classed('pselected', true)
      }
    })

  var circles = circleG.selectAll('circle').data(circleList)
  circles.exit().remove()
  circles.enter().append('circle')
    .attr('id', function (d) { return d.id })
    .classed('target', function (d) { return d.s })
    .classed('source', function (d) { return d.t })
    .classed('pickup', function (d) { return d.p })
}

function checkId (id, list) {
  var result = true
  d3.map(list, function (d) {
    if (result && d.id === id) result = false
  })

  return result
}

function dragstarted (d) {
  if (pickuped && !touched) hidePickup()
  if (!d3.event.active && !touched) simulation.alphaTarget(0.1).restart()
  d.fx = d.x
  d.fy = d.y
}

function dragged (d) {
  d.fx = d3.event.x
  d.fy = d3.event.y
}

function dragended (d) {
  if (!d3.event.active) simulation.alphaTarget(0)
  d.fx = null
  d.fy = null
}

function showTooltip (t) {
  var showTarget = !d3.select('#showTarget').classed('off')
  var showSource = !d3.select('#showSource').classed('off')
  var showComment = !$('#showComment').hasClass('off')

  var scale = container.attr('transform').match(/scale\((.*)\)/)[1]
  var imgSize = pickuped ? IMG_SIZE * scale * PICKUP_SCALE / 2 + 2 : IMG_SIZE * scale / 2 + 1

  var p = d3.select('circle.pickup').data()[0]

  if (showComment) {
    d3.selectAll('circle.source').each(function (d) {
      if (d.p) return
      if (t.id !== p.id && t.id !== d.id) return
      if (t.id === p.id && !showSource) return

      var self = this
      var tooltip
      var prevH
      d3.map(d.syears, function (y, i) {
        prevH = tooltip ? tooltip.height() : 0

        tooltip = $('<div>', {
          id: 'tip' + d.id, class: 'tooltip bottom fade in source'})
          .append($('<div>', {class: 'tooltip-arrow'}))
          .append($('<div>', {class: 'tooltip-inner', text: p.data[y].title}))
        $('#container').append(tooltip)

        var w = tooltip.width()
        var h = tooltip.height()
        var offset = $(self).offset()
        var left = offset.left + (imgSize / 2) - (w / 2) //* d.years.length + (w) * i * 1.1
        var top = offset.top + imgSize * 2 + (h / 5) * d.syears.length + prevH * i * 1.1
        tooltip.offset({left: left, top: top})
      })
    })
  }

  if (showComment) {
    d3.selectAll('circle.target').each(function (d) {
      if (d.p) return
      if (t.id !== p.id && t.id !== d.id) return
      if (t.id === p.id && !showTarget) return

      var self = this
      var tooltip
      var prevH
      d3.map(d.tyears, function (y, i) {
        prevH = tooltip ? tooltip.height() : 0

        tooltip = $('<div>', {
          id: 'tip' + d.id, class: 'tooltip top fade in target'})
          .append($('<div>', {class: 'tooltip-arrow'}))
          .append($('<div>', {class: 'tooltip-inner', text: d.data[y].title}))
        $('#container').append(tooltip)

        var w = tooltip.width()
        var h = tooltip.height()
        var offset = $(self).offset()
        var left = offset.left + (imgSize / 2) - (w / 2) //* d.years.length + (w / 2) * i
        var top = offset.top - imgSize * 2 - (h / 5) * d.tyears.length - prevH * i * 1.1
        tooltip.offset({left: left, top: top})
      })
    })
  }
}

function hideTooltip () {
  $('.source.tooltip').remove()
  $('.target.tooltip').remove()
}

function showPickup (d) {
  pickuped = true
  simulation.stop()
  d3.select('.pidols').classed('show', true)
  d3.select('.hover')
    .classed('hover', false)
    .classed('selected', true)
  d.hover = false
  d.selected = true
  hideTooltip()
  drawNeighbor(data.nodes, data.links)
}

function hidePickup () {
  pickuped = false
  d3.select('.selected').classed('selected', false)
  d3.select('.pidols').classed('show', false)
  drawNeighbor(data.nodes, data.links)
  simulation.alphaTarget(0.1).restart()
}

function resetPickup (d) {
  hidePickup()

  if (!d || !d.id) return

  var target = d3.select('#i_' + d.id)
  target.classed('hover', true)
  drawNeighbor(data.idols, data.links)
  showPickup(d)
}

// MENU
$('#lmenu').children('i').tooltip()

$('#help').click(function () {
  $('#helpModal').modal('show')
})

$('.helpImageBox').magnificPopup({
  delegate: 'a',
  type: 'image',
  mainClass: 'mfp-with-zoom',
  zoom: {
    enabled: true
  },
  gallery: {
    enabled: true
  }
})

var shuffleFlag = false
$('#shuffle').click(function () {
  hidePickup()
  if (shuffleFlag) return
  shuffleFlag = true
  simulation.force('collide').radius(0)
  simulation.alphaTarget(0.1).restart()
  setTimeout(function () {
    idols.data(d3.shuffle(data.nodes), function (d) { return d.id })
    simulation.nodes(data.nodes)
    simulation.force('collide').radius($('#collideValue').text())
    shuffleFlag = false
  }, 2000)
})

$('#showComment').click(function () {
  $(this).toggleClass('off')
})

$('#showTarget').click(function () {
  $(this).toggleClass('off')
  // $('.idols').toggleClass('toff')
  $('.circles').toggleClass('toff')
  $('.links').toggleClass('toff')
  // hidePickup()

  var p = d3.select('circle.pickup').data()[0]
  resetPickup(p)
})

$('#showSource').click(function () {
  $(this).toggleClass('off')
  // $('.idols').toggleClass('soff')
  $('.circles').toggleClass('soff')
  $('.links').toggleClass('soff')
  // hidePickup()

  var p = d3.select('circle.pickup').data()[0]
  resetPickup(p)
})

$('#show2017,#show2018').click(function () {
  $(this).toggleClass('off')

  var p = d3.select('circle.pickup').data()[0]
  resetPickup(p)
})

$('#searchBox').keyup(function () {
  var name = $(this).val()
  d3.map(data.nodes, function (d) {
    if (name.length > 0 && (d.name.indexOf(name) !== -1 || d.kana.indexOf(name) !== -1)) {
      d.search = true
    } else {
      d.search = false
    }
  })
  hidePickup()
  ticked()
})

$('#collideSlider').slider({reversed: true})
$('#collideSlider').on('change', function (ev) {
  var value = ev.value.newValue
  $('#collideValue').text(value)
  simulation.force('collide').radius(value)
  simulation.alphaTarget(0.1).restart()
  // hidePickup()

  var p = d3.select('circle.pickup').data()[0]
  resetPickup(p)
})

$('#zoomIn,#zoomOut').click(function () {
  var direction = this.id === 'zoomIn'
  var extent = zoom.scaleExtent()

  var transform = d3.zoomTransform(container)
  var scale = transform.k
  var targetScale = direction
    ? scale * Math.pow(2, 0.5) : scale / Math.pow(2, 0.5)

  if (targetScale < extent[0] || targetScale > extent[1]) return

  var dk = targetScale / scale
  var dx = (SVG_W / 2 - transform.x) * dk + transform.x
  var dy = (SVG_H / 2 - transform.y) * dk + transform.y

  transform.x += SVG_W / 2 - dx
  transform.y += SVG_H / 2 - dy
  transform.k = targetScale

  svg.call(zoom.transform, transform)
})
$('#zoomOut').click()

function getHistory () {
  d3.json('https://idol-introduction.netlify.com/data/iiRelease.json', function (err, data) {
    iiRelease = err ? {lastUpdate: '蜿門ｾ怜､ｱ謨?'} : data
    d3.selectAll('.release.ii').text(iiRelease.lastUpdate)
  })
  d3.json('https://imas-cg-cartoon.netlify.com/data/iccRelease.json', function (err, data) {
    iccRelease = err ? {lastUpdate: '蜿門ｾ怜､ｱ謨?'} : data
    d3.selectAll('.release.icc').text(iccRelease.lastUpdate)
  })
  d3.json('https://imags-cg-unit.netlify.com/data/icuRelease.json', function (err, data) {
    icuRelease = err ? {lastUpdate: '蜿門ｾ怜､ｱ謨?'} : data
    d3.selectAll('.release.icu').text(icuRelease.lastUpdate)
  })
}
