// D3
var SVG_W = 800
var SVG_H = 600
var IMG_SIZE = 50
var PICKUP_SCALE = 1.5
var COLLIDE = 30
var DEF_LINE_W = 4
var MAX_LINE_W = DEF_LINE_W * 12
var CARTOON_SIZE = {
  5: 80 * 1.2,
  1: 115 * 1.25,
  w: 110 * 1.25,
}
var MAX_CARTOON_COL = 8

var CARTOON_TYPE = {
  KOMA5: '5',
  KOMA1: '1',
  WIDE: 'w',
}

var query = parseQueryString()

var searchBox = $('#searchBox2')
var searchData = []
var sortIdols = []
var searchType = '繧｢繧､繝峨Ν'
var reopen = false

var lgHideBarTimer
var lgTargetId
var lgEpList

var pairFilterNum = 1
var pickuped = false
var touched = false
var svg = d3
  .select('#contents')
  .append('svg')
  .attr('width', SVG_W)
  .attr('height', SVG_H)

var container = svg.append('g')
var zoom = d3
  .zoom()
  .scaleExtent([0.3, 3])
  .on('zoom', function() {
    container.attr('transform', d3.event.transform)
  })
svg.call(zoom).on('dblclick.zoom', null)

var simulation = d3
  .forceSimulation()
  .force(
    'link',
    d3.forceLink().id(function(d) {
      return d.id
    })
  )
  .force(
    'collide',
    d3
      .forceCollide(function() {
        return COLLIDE
      })
      .iterations(25)
  )
  .force(
    'charge',
    d3.forceManyBody().strength(function() {
      return 10
    })
  )
  .force('center', d3.forceCenter(SVG_W / 2, SVG_H / 2))

var data, idols, pidolG, /* slinkG, */ tlinkG, scircleG, tcircleG
var idolMap = {}

d3.json('data/icc.json', function(err, jsondata) {
  if (err) return

  data = jsondata

  console.time('createLinks')
  data.links = []
  $.each(data.nodes, function(i, s) {
    idolMap[s.id] = s
    s.idolTotalNum = 0
    $.each(s.epList, function(j, sep) {
      $.each(data.nodes, function(k, t) {
        if (s.id === t.id) return
        $.each(t.epList, function(l, tep) {
          if (sep === tep) {
            s.idolTotalNum++
            var ret = false
            $.each(data.links, function(m, link) {
              if (link.source === s.id && link.target === t.id) {
                link.epList.add(sep)
                ret = true
              }

              if (link.source === t.id && link.target === s.id) {
                ret = true
              }
            })

            if (!ret)
              data.links.push({
                source: s.id,
                target: t.id,
                epList: d3.set([sep]),
              })
          }
        })
      })
      data.cartoon[sep].idolList = data.cartoon[sep].idolList || []
      data.cartoon[sep].idolList.push(s.id)
    })
  })

  var only = {
    id: 'only',
    img: 'only',
    name: '蜊倡峡蝗?',
    kana: '縺溘ｓ縺ｩ縺上°縺?',
    epList: [],
    idolTotalNum: 0,
  }
  var onlyLinks = []
  data.nodes.push(only)
  idolMap['only'] = only
  $.each(data.cartoon, function(ep, c) {
    if (c.idolList && c.idolList.length === 1) {
      only.epList.push(ep)
      var idolId = c.idolList[0]
      only.idolTotalNum++

      var ret = false
      $.each(onlyLinks, function(j, l) {
        if (l.source !== 'only') return
        if (l.target === idolId) {
          l.epList.add(ep)
          ret = true
        }
      })
      if (!ret)
        onlyLinks.push({ source: 'only', target: idolId, epList: d3.set([ep]) })
    }
  })
  data.links = data.links.concat(onlyLinks)

  $.each(data.nodes, function(i, n) {
    n.epList = d3.set(n.epList)
    n.idolNum = 0
    $.each(data.links, function(j, l) {
      if (n.id === l.source || n.id === l.target) {
        n.idolNum++
      }
    })
  })

  console.timeEnd('createLinks')

  initSearchBox()
  initSearchBoxEvent()
  // initLinkModal()

  // slinkG = container.append('g').attr('class', 'slinks')
  tlinkG = container.append('g').attr('class', 'tlinks')
  scircleG = container.append('g').attr('class', 'scircles')
  tcircleG = container.append('g').attr('class', 'tcircles')

  d3.shuffle(data.nodes)
  var idolG = container.append('g').attr('class', 'idols')
  idols = idolG
    .selectAll('image')
    .data(data.nodes, function(d) {
      return d.id
    })
    .enter()
    .append('image')
    .attr('id', function(d) {
      return 'i_' + d.id
    })
    .attr('xlink:href', function(d) {
      return 'img/idol/' + d.img + '.png'
    })
    .attr('height', IMG_SIZE)
    .attr('width', IMG_SIZE)
    .attr('data-toggle', 'tooltip')
    .attr('title', function(d) {
      var str = '縲?' + d.name + '縲曾n'
      str += '逋ｻ蝣ｴ隧ｱ謨ｰ??' + d.epList.size() + ' 隧ｱ\n'
      str += '蜈ｱ貍斐い繧､繝峨Ν謨ｰ??' + d.idolNum + ' 莠ｺ\n'
      str += '蜈ｱ貍斐い繧､繝峨Ν謨ｰ?亥ｻｶ縺ｹ?会ｼ?' + d.idolTotalNum + ' 莠ｺ\n'
      return str.replace(/\n/g, '<br/>')
    })
    .on('click', hidePickup)
    .on('dblclick', showPickup)
    .on('mouseenter', idolGMouseEnter)
    .on('mouseleave', idolGMouseLeave)
    .on('touchstart', idolGTouchStart)
    .on('touchend', idolGTouchEnd)
    .call(
      d3
        .drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
    )
  $('.idols')
    .children()
    .tooltip({
      container: '#idolInfoTooltip',
      placement: 'bottom',
      html: true,
    })

  simulation.nodes(data.nodes).on('tick', ticked)

  simulation.force('link').links(data.links)

  pidolG = container.append('g').attr('class', 'pidols')

  setTimeout(function() {
    if (query.source) {
      var source = d3.select('#i_' + query.source)
      if (source.data().length) {
        source.classed('hover', true)
        showPickup(source.data()[0])
      }

      if (query.target) {
        var target = d3.select('#p_' + query.target)
        if (target.data().length) {
          target.classed('filterLock', true)
          addIdolFilter(target.data()[0])
        }
      }
    }
  }, 1000)
})

function ticked() {
  idols
    .classed('target', function(d) {
      return d.t
    })
    .classed('searched', function(d) {
      return d.search
    })
    .attr('x', function(d) {
      return d.x - IMG_SIZE / 2
    })
    .attr('y', function(d) {
      return d.y - IMG_SIZE / 2
    })
  tlinkG
    .selectAll('line')
    // .classed('off', function(d) { return d.off; })
    .attr('x1', function(d) {
      return d.source.x
    })
    .attr('y1', function(d) {
      return d.source.y
    })
    .attr('x2', function(d) {
      return d.target.x
    })
    .attr('y2', function(d) {
      return d.target.y
    })
  scircleG
    .selectAll('circle')
    .attr('cx', function(d) {
      return d.x
    })
    .attr('cy', function(d) {
      return d.y
    })
    .attr('r', function(d) {
      return pickuped ? (IMG_SIZE * PICKUP_SCALE) / 2 + 2 : IMG_SIZE / 2 + 1
    })
  tcircleG
    .selectAll('circle')
    // .classed('off', function(d) { return d.off; })
    .attr('cx', function(d) {
      return d.x
    })
    .attr('cy', function(d) {
      return d.y
    })
    .attr('r', function(d) {
      return pickuped ? (IMG_SIZE * PICKUP_SCALE) / 2 + 2 : IMG_SIZE / 2 + 1
    })
}

function idolGMouseEnter(d) {
  // debug('mouseenter');
  if (pickuped) return

  d3.select(this).classed('hover', true)
  drawNeighbor(data.nodes, data.links)
  showSourceTooltip(d)
}

function idolGMouseLeave(d) {
  // debug('mouseleave');
  if (pickuped) return

  d3.select(this).classed('hover', false)
  drawNeighbor(data.nodes, data.links)
  hideTooltip()
}

function idolGTouchStart(d) {
  // debug('touchstart');
  if (d3.select(this).classed('hover')) {
    touched = true
    showPickup(d)
  }
}

function idolGTouchEnd(d) {
  // debug('touchend');
}

function initSearchBox() {
  var width
  if (!sortIdols.length) {
    $.each(data.nodes, function(i, idol) {
      sortIdols.push({
        id: idol.id,
        idx: idol.id,
        name: idol.name,
        kana: idol.kana,
        text: idol.name,
        img: idol.img,
      })
    })
    sortIdols.sort(function(a, b) {
      return a.kana > b.kana ? 1 : -1
    })
  }
  searchData = sortIdols
  width = '300px'

  searchBox.select2({
    theme: 'bootstrap',
    width: width,
    placeholder: searchType,
    data: searchData,
    allowClear: true,
    closeOnSelect: false,
    escapeMarkup: function(m) {
      return m
    },
    templateSelection: function(data) {
      if (!data.id) return searchType

      var span = $('<span>')
      span.append(
        $('<img>', {
          class: 'searchBoxIconS',
          src: '/img/idol/' + data.img + '.png',
        })
      )
      return span
    },
    templateResult: function(data) {
      if (!data.id) return searchType

      var span = $('<span>')
      span.append(
        $('<img>', {
          class: 'searchBoxIconM',
          src: '/img/idol/' + data.img + '.png',
        })
      )
      span.append(
        $('<span>', {
          class: 'resultName',
          text: data.name,
        })
      )
      return span
    },
    matcher: function(params, data) {
      if (pickuped) {
        var result = false
        tcircleG.selectAll('circle').each(function(d) {
          if (data.id === d.id) result = true
        })
        return result ? data : null
      }
      if ($.trim(params.term) === '') return data

      if (
        data.kana.indexOf(params.term) > -1 ||
        data.name.indexOf(params.term) > -1
      ) {
        return data
      }

      return null
    },
  })
  $('.select2').addClass('correlation')
}

function initSearchBoxEvent() {
  searchBox
    .on('select2:opening', searchBox2Opening)
    .on('select2:open', searchBox2Open)
    .on('select2:closing', searchBox2Closing)
    .on('select2:close', searchBox2Close)
    .on('select2:selecting', searchBox2Selecting)
    .on('select2:unselecting', searchBox2UnSelecting)
    .on('change.select2', searchBox2ChangeSelect)
    .on('change', searchBox2Change)
}

function searchBox2Opening(e) {
  var selectIdols = searchBox.val()
  if (selectIdols.length === 2) {
    var source = $('.select2-selection__choice.source').data().data
    e.preventDefault()
    d3.select('.filterLock').classed('filterLock', false)
    searchBox.val([source.id])
    searchBox.trigger('change.select2')
    searchBox.select2('open')
  }
}

function searchBox2Open(e) {
  $('#select2-searchBox2-results').off('.searchBox2')
  $('#select2-searchBox2-results').on(
    {
      'mouseenter.searchBox2': searchBox2MouseEnter,
      'mouseleave.searchBox2': searchBox2MouseLeave,
    },
    'li'
  )
}
var mouseEnterEvent
function searchBox2MouseEnter(e) {
  mouseEnterEvent = e
  if (mouseEnterEvent) searchBox2MouseLeave(mouseEnterEvent)
  var data = $(e.target).data().data
  if (!data) return

  var selector = pickuped ? '#p_' + data.id : '#i_' + data.id
  var s = d3.select(selector)
  var node = s.node()
  var d = s.data()[0]
  if (!d) return
  if (pickuped) {
    pidolGMouseLeave.call(node, d)
    pidolGMouseEnter.call(node, d)
  } else {
    idolGMouseLeave.call(node, d)
    idolGMouseEnter.call(node, d)
  }
}

function searchBox2MouseLeave(e) {
  mouseEnterEvent = null
  var data = $(e.target).data().data
  if (!data) return

  var selector = pickuped ? '#p_' + data.id : '#i_' + data.id
  var s = d3.select(selector)
  var node = s.node()
  var d = s.data()[0]
  if (pickuped) {
    pidolGMouseLeave.call(node, d)
  } else {
    idolGMouseLeave.call(node, d)
  }
}

function searchBox2Closing(e) {
  var selectIdols = searchBox.val()
  if (selectIdols.length === 0) {
    $('.hover').removeClass('hover')
    hidePickup()
  }
}

function searchBox2Close(e) {
  if (reopen) {
    reopen = false
    searchBox.select2('open')
  }
}

function searchBox2Selecting(e) {
  var data = e.params.args.data
  data.idx = Date.now()

  var el = $('#p_' + data.id)[0]
  console.log(el)
  if (el) lockFilter(el)
}

function searchBox2UnSelecting(e) {
  var data = e.params.args.data
  data.idx = data.id

  removeAllIdolFilter()
}

function searchBox2ChangeSelect(e) {
  var selectIdols = searchBox.select2('data')
  selectIdols.sort(function(a, b) {
    return a.idx > b.idx ? 1 : -1
  })

  var targetEl = $('.select2-search--inline')
  $.each(selectIdols, function(i, idol) {
    var el = $('.select2-selection__choice[title="' + idol.name + '"]')
    targetEl.before(el)

    if (i === 0) {
      $(el).addClass('source')
      $(el).removeClass('target')
    } else {
      $(el).addClass('target')
      $(el).removeClass('source')
    }
  })
}

function searchBox2Change(e) {
  var selectIdols = searchBox.select2('data')
  if (selectIdols.length === 0) {
    hidePickup()
    return
  }

  selectIdols.sort(function(a, b) {
    return a.idx > b.idx ? 1 : -1
  })

  var snode = getSNode()
  var s = d3.select('#i_' + selectIdols[0].id)
  var d = s.data()[0]
  if (!d) return
  if (!pickuped) {
    showPickup(d)
  } else if (snode.id !== selectIdols[0].id) {
    resetPickup(d)
  }
  searchBox.select2('close')
}

function removeAllIdolFilter() {
  d3.selectAll('.pselected').classed('pselected', false)
  d3.selectAll('.cartoon.hover').classed('hover', false)
  removeIdolFilter(null, false)
}

function removeIdolFilter(d, lockFlag) {
  if (d) {
    d3.select('#p_' + d.id).classed('pselected', false)
    d.showEpList.each(function(ep) {
      $('#cartoon' + ep).removeClass('hover')
      $('#cartoon' + ep)
        .parent()
        .removeClass('hover')
    })
  }
  idols.classed('coff', false)
  pidolG.selectAll('image').classed('coff', false)
  tlinkG.selectAll('line').classed('coff', false)
  tcircleG
    .selectAll('circle')
    .classed('coff', false)
    .attr('r', function(d) {
      return (IMG_SIZE * PICKUP_SCALE) / 2 + 2
    })

  var filterLock = d3.select('.filterLock').data()
  if (lockFlag && filterLock.length) {
    addIdolFilter(filterLock[0])
  }
}

function lockFilter(target) {
  d3.select('.filterLock').classed('filterLock', false)
  d3.select(target).classed('filterLock', true)
}

function drawNeighbor(nodes, links) {
  var scircleList = []
  var tcircleList = []
  var pidolList = []
  var tmpLinkList = []
  var linkList = []

  var showKoma5 = !d3.select('#showKoma5').classed('off')
  var showKoma1 = !d3.select('#showKoma1').classed('off')
  var showWide = !d3.select('#showWide').classed('off')

  d3.map(nodes, function(n) {
    n.t = false
    n.showEpList = d3.set()
  })

  d3.map(links, function(l) {
    l.showEpList = d3.set()
  })

  d3.select('.nselected,.hover').each(function(n) {
    if (!n) return

    scircleList.push(n)
    d3.map(links, function(l) {
      if (l.source.id === n.id) {
        l.target.t = true
        tmpLinkList.push(l)
      } else if (l.target.id === n.id) {
        l.source.t = true
        tmpLinkList.push(l)
      }
    })
  })

  var sn = scircleList[0] || {}
  d3.map(tmpLinkList, function(l) {
    l.epList.each(function(ep) {
      if (checkType(data.cartoon[ep].type)) {
        l.showEpList.add(ep)
      } else {
        // l.target.t = false
        // l.source.t = false
      }
    })

    if (l.showEpList.size() >= pairFilterNum) {
      linkList.push(l)
    } else {
      l.target.t = false
      l.source.t = false
    }

    if (l.target.t) {
      tcircleList.push(l.target)
      l.target.showEpList = checkEpList(l.target)
    }
    if (l.source.t) {
      tcircleList.push(l.source)
      l.source.showEpList = checkEpList(l.source)
    }
  })

  if (pickuped) {
    sn.x = SVG_W / 2
    sn.y = SVG_H / 2

    d3.map(tcircleList, function(d) {
      if (checkId(d.id)) pidolList.push(d)
    })

    var len = pidolList.length
    var drad = (2 * Math.PI) / len
    var r = $('#collideValue').text() * 12
    d3.map(pidolList, function(d, i) {
      d.ox = d.x
      d.oy = d.y
      var rad = i * drad
      d.x = Math.cos(rad) * r + SVG_W / 2
      d.y = Math.sin(rad) * r + SVG_H / 2
    })

    pidolList = pidolList.concat(scircleList)
  }

  drawCircles(scircleList, tcircleList, pidolList)
  drawLinks(linkList)
  ticked()

  function checkId(id) {
    var result = true
    d3.map(pidolList, function(d) {
      if (result && d.id === id) result = false
    })

    return result
  }

  function checkEpList(tn) {
    var showEpList = d3.set()
    sn.epList.each(function(sep) {
      // if (!checkType(data.cartoon[sep].type)) return
      tn.epList.each(function(tep) {
        if (sep === tep && checkType(data.cartoon[sep].type)) {
          showEpList.add(sep)
          sn.showEpList.add(sep)
        }
      })
    })
    return showEpList
  }

  function checkType(type) {
    if (type === CARTOON_TYPE.KOMA5 && !showKoma5) return false
    if (type === CARTOON_TYPE.KOMA1 && !showKoma1) return false
    if (type === CARTOON_TYPE.WIDE && !showWide) return false
    return true
  }
}

function drawLinks(linkList) {
  var tlinks = tlinkG.selectAll('line').data(linkList)
  tlinks.exit().remove()
  tlinks
    .enter()
    .append('line')
    .attr('id', function(d) {
      return d.target.id
    })
    .attr('stroke-width', function(d) {
      // var width = d.epList.size() * DEF_LINE_W
      var width = d.showEpList.size() * DEF_LINE_W
      return width > MAX_LINE_W ? MAX_LINE_W : width
    })
}

function drawCircles(scircleList, tcircleList, pidolList) {
  var pidols = pidolG.selectAll('image').data(pidolList)
  pidols.exit().remove()
  pidols
    .enter()
    .append('image')
    .attr('id', function(d) {
      return 'p_' + d.id
    })
    .attr('xlink:href', function(d) {
      return 'img/idol/' + d.img + '.png'
    })
    .attr('x', function(d) {
      return d.x - (IMG_SIZE * PICKUP_SCALE) / 2
    })
    .attr('y', function(d) {
      return d.y - (IMG_SIZE * PICKUP_SCALE) / 2
    })
    .attr('width', IMG_SIZE * PICKUP_SCALE)
    .attr('height', IMG_SIZE * PICKUP_SCALE)
    .attr('title', function(d) {
      var str = '縲?' + d.name + '縲曾n'
      str += '逋ｻ蝣ｴ隧ｱ謨ｰ??' + d.epList.size() + ' 隧ｱ\n'
      str += '蜈ｱ貍斐い繧､繝峨Ν謨ｰ??' + d.idolNum + ' 莠ｺ\n'
      str += '蜈ｱ貍斐い繧､繝峨Ν謨ｰ?亥ｻｶ縺ｹ?会ｼ?' + d.idolTotalNum + ' 莠ｺ\n'
      return str.replace(/\n/g, '<br/>')
    })
    // .on('click', hidePickup)
    .on('dblclick', resetPickup)
    .on('mouseenter', pidolGMouseEnter)
    .on('mouseleave', pidolGMouseLeave)
    .on('touchstart', pidolGTouchStart)

  $('.pidols')
    .children()
    .tooltip({
      container: '#idolInfoTooltip',
      placement: 'bottom',
      html: true,
    })

  var scircles = scircleG.selectAll('circle').data(scircleList)
  scircles.exit().remove()
  scircles.enter().append('circle')
  var tcircles = tcircleG.selectAll('circle').data(tcircleList)
  tcircles.exit().remove()
  tcircles.enter().append('circle')
}

function dragstarted(d) {
  // debug('dragstarted');
  if (pickuped && !touched) hidePickup()
  if (!d3.event.active && !touched) simulation.alphaTarget(0.1).restart()
  d.fx = d.x
  d.fy = d.y
}

function dragged(d) {
  // debug('dragged');
  d.fx = d3.event.x
  d.fy = d3.event.y
}

function dragended(d) {
  // debug('dragended');
  if (!d3.event.active) simulation.alphaTarget(0)
  d.fx = null
  d.fy = null
}

function getSNode() {
  return scircleG.select('circle').data()[0]
}

function showSourceTooltip(d) {
  if (!d || !d.showEpList.size() || $('#showCartoonTooltip').hasClass('off')) {
    hideTooltip()
    return
  }

  var tooltip = $('.own .tooltip-inner')
  tooltip.children().remove()

  var colEl = createCartooncol()
  var colW = 0

  var koma1List = []
  var koma5List = []
  var wideList = []
  var epList = []

  d.showEpList.each(function(ep) {
    var num = ep.match(/[0-9]+/)
    var wide = ep.match(/繧上＞縺ｩ/)
    if (num) {
      var n = parseInt(num[0])
      wide ? wideList.push(n) : koma5List.push(n)
    } else {
      koma1List.push(ep)
    }
  })
  koma1List.sort(d3.descending)
  koma5List.sort(d3.descending)
  wideList.sort(d3.descending)

  $.each(koma5List, function(i, n) {
    epList.push('隨ｬ' + n + '隧ｱ')
  })
  epList = epList.concat(koma1List)
  $.each(wideList, function(i, n) {
    epList.push('隨ｬ' + n + '隧ｱ?医ｏ縺?←??')
  })

  $.each(epList, function(i, n) {
    var cartoon = data.cartoon[n + '']
    var container = $('<div>', { class: 'cartoon-container' })
    var caption = $('<div>', { class: 'caption', text: n })

    var imgContainer = $('<div>', {
      class: 'cartoon-img-container',
      mouseenter: function() {
        $('#cartoon' + n).addClass('hover')
        $('#cartoon' + n)
          .parent()
          .addClass('hover')
        idols.classed('coff', function(d) {
          return !d.showEpList.has(n)
        })
        pidolG.selectAll('image').classed('coff', function(d) {
          return !d.showEpList.has(n)
        })
        tlinkG.selectAll('line').classed('coff', function(d) {
          return !d.epList.has(n)
        })
        tcircleG
          .selectAll('circle')
          .classed('coff', function(d) {
            return !d.showEpList.has(n)
          })
          .attr('r', function(d) {
            return d.showEpList.has(n)
              ? (IMG_SIZE * PICKUP_SCALE) / 2 + 2
              : IMG_SIZE / 2 + 1
          })
      },
      mouseleave: function() {
        $('#cartoon' + n).removeClass('hover')
        $('#cartoon' + n)
          .parent()
          .removeClass('hover')
        idols.classed('coff', false)
        pidolG.selectAll('image').classed('coff', false)
        tlinkG.selectAll('line').classed('coff', false)
        tcircleG
          .selectAll('circle')
          .classed('coff', false)
          .attr('r', function(d) {
            return (IMG_SIZE * PICKUP_SCALE) / 2 + 2
          })
      },
      click: function(ev) {
        var target = ev.currentTarget.childNodes[0]
        if (target) {
          lgTargetId = target.id.replace('cartoon', '')
          lgEpList = epList
          showLinkModal()
        }
      },
    })
    var className, imgDir
    switch (cartoon.type) {
      case CARTOON_TYPE.KOMA5:
        className = 'cartoon koma5'
        imgDir = './img/koma5_thumb/'
        break
      case CARTOON_TYPE.KOMA1:
        className = 'cartoon koma1'
        imgDir = './img/koma1_thumb/'
        break
      case CARTOON_TYPE.WIDE:
        className = 'cartoon wide'
        imgDir = './img/wide_thumb/'
        break
    }
    var img = $('<img>', {
      id: 'cartoon' + n,
      class: className,
      src: imgDir + n + '.jpg',
    })

    imgContainer.attr('data-toggle', 'tooltip')
    imgContainer.tooltip({
      title: '縲?' + n + '縲?<br/>' + cartoon.title,
      container: '#cartoonInfoTooltip',
      placement: 'bottom',
      html: true,
      delay: 150,
    })
    /*
    const titleOptions = {
      interactive: true,
      duration: [200, 150],
      delay: [150, 0],
      placement: 'bottom',
      arrow: 'wide',
      animation: 'scale',
      inertia: true,
      multiple: true,
      content: '縲?' + n + '縲?<br/>' + cartoon.title,
    }
    tippy(img[0], titleOptions)

    const linkOptions = $.extend(true, {}, titleOptions)
    linkOptions.placement = 'top'
    linkOptions.content = '<button>' + 'button' + '</button>'
    tippy(img[0], linkOptions)
    */

    colW += CARTOON_SIZE[cartoon.type]
    if (colW >= SVG_W) {
      tooltip.append(colEl)
      colEl = createCartooncol()
      colW = CARTOON_SIZE[cartoon.type]
    }
    colEl.append(container.append(imgContainer.append(img), caption))
  })
  tooltip.append(colEl)
  $('.tooltip.own').addClass('fade in')

  function createCartooncol() {
    return $('<div>', { class: 'cartoon-col' })
  }
}

function showLinkModal() {
  var $linkModal = $('#linkModal')
  var $linkModalBody = $linkModal.find('.modal-body')
  $linkModalBody.children().remove()

  var cartoon = data.cartoon[lgTargetId]
  var path = IMG.THUMB.PATH[cartoon.type]
  var $thumb = $('<div>', { class: 'linkThumb' })
    .append($('<img>', { src: path + lgTargetId + '.jpg' }))
    .click(showLG)

  var snode = getSNode()
  var sid = snode.id === 'only' ? cartoon.idols[0] : snode.id

  var $linkInfoArea = $('<div>', { class: 'linkInfoArea' })
  var $linkInfo = $('<div>', { class: 'linkInfo' }).css(
    'vertical-align',
    cartoon.idols.length > 6 ? 'middle' : 'top'
  )
  var $linkTitle = $('<div>', {
    class: 'linkTitle',
    text: '縲?' + lgTargetId + '縲?' + cartoon.title,
  })
  var $linkIdols = $('<div>', { class: 'linkIdols' })
  var linkIdols = []
  $.each(cartoon.idols, function(i, id) {
    if (id !== sid) linkIdols.push(id)
  })
  linkIdols.unshift(sid)

  $.each(linkIdols, function(i, id) {
    var idol = idolMap[id]
    var iconClass = id === sid ? 'icon src' : 'icon target'
    if (idol)
      $linkIdols.append(
        $('<span>', { class: iconClass })
          .append(
            $('<img>', {
              src: 'img/idol/' + idol.img + '.png',
            })
          )
          .click(changeTargetIdol)
          .data('idolId', idol.id)
      )
  })
  $linkModalBody.append(
    $linkInfoArea.append($thumb, $linkInfo.append($linkTitle, $linkIdols))
  )

  var $linkBtnArea = createLinkBtnArea(sid)
  $linkModalBody.append($linkBtnArea)
  $linkModal.modal('show')

  function createLinkBtnArea(sid) {
    var onlyFlag = cartoon.idols.length === 1
    var idols = []
    $('.linkIdols')
      .children()
      .each(function(i, img) {
        idols.push($(img).data('idolId'))
      })

    var $linkBtnArea = $('<div>', { class: 'linkBtnArea' })
    var $cartoonLinkBtnLabel = $('<div>', {
      class: 'linkLabel cartoon',
      text: '蜉??ｴ諠??ｱ',
    })
    var $cartoonGalleryBtn = createLinkBtn(
      'cartoon',
      'fa fa-picture-o',
      '縲?' + lgTargetId + '縲?',
      '逕ｻ蜒上ｒ隕九ｋ',
      showLG
    )
    var $cartoonSrcIdolTableBtn = createLinkBtn(
      'cartoon',
      'icon table',
      '縲?' + idolMap[sid].name + '縲?',
      '蜉??ｴ諠??ｱ繧定｡ｨ蠖｢蠑上〒隕九ｋ',
      openCartoonTable.bind(null, sid, '')
    )
    var $cartoonAllIdolsTableBtn = createLinkBtn(
      onlyFlag ? 'only' : 'cartoon',
      'icon table',
      '縲千匳蝣ｴ繧｢繧､繝峨Ν?亥?蜩｡?峨?',
      '蜉??ｴ諠??ｱ繧定｡ｨ蠖｢蠑上〒隕九ｋ',
      openCartoonTable.bind(null, idols.join(','), LINK_MODE.ALL)
    )
    var $cartoonPartialIdolsTableBtn = createLinkBtn(
      onlyFlag ? 'only' : 'cartoon',
      'icon table',
      '縲千匳蝣ｴ繧｢繧､繝峨Ν?井ｸ驛ｨ?峨?',
      '蜉??ｴ諠??ｱ繧定｡ｨ蠖｢蠑上〒隕九ｋ',
      openCartoonTable.bind(null, idols.join(','), LINK_MODE.PARTIAL)
    )

    var $unitLinkBtnLabel = $('<div>', {
      class: 'linkLabel unit',
      text: '繝ｦ繝九ャ繝域ュ蝣ｱ',
    })
    var $unitSrcIdolCorrelationBtn = createLinkBtn(
      'unit',
      'icon correlation',
      '縲?' + idolMap[sid].name + '縲?',
      '繝ｦ繝九ャ繝域ュ蝣ｱ繧堤嶌髢｢蝗ｳ縺ｧ隕九ｋ',
      openUnitCorrelation.bind(null, sid, '')
    )
    var $unitSrcIdolTableBtn = createLinkBtn(
      'unit',
      'icon table',
      '縲?' + idolMap[sid].name + '縲?',
      '繝ｦ繝九ャ繝域ュ蝣ｱ繧定｡ｨ蠖｢蠑上〒隕九ｋ',
      openUnitTable.bind(null, sid, '')
    )
    var $unitAllIdolsTableBtn = createLinkBtn(
      onlyFlag ? 'only' : 'unit',
      'icon table',
      '縲千匳蝣ｴ繧｢繧､繝峨Ν?亥?蜩｡?峨?',
      '繝ｦ繝九ャ繝域ュ蝣ｱ繧定｡ｨ蠖｢蠑上〒隕九ｋ',
      openUnitTable.bind(null, idols.join(','), LINK_MODE.ALL)
    )
    var $unitPartialIdolsTableBtn = createLinkBtn(
      onlyFlag ? 'only' : 'unit',
      'icon table',
      '縲千匳蝣ｴ繧｢繧､繝峨Ν?井ｸ驛ｨ?峨?',
      '繝ｦ繝九ャ繝域ュ蝣ｱ繧定｡ｨ蠖｢蠑上〒隕九ｋ',
      openUnitTable.bind(null, idols.join(','), LINK_MODE.PARTIAL)
    )

    return $linkBtnArea.append(
      $cartoonLinkBtnLabel,
      $cartoonGalleryBtn,
      $cartoonSrcIdolTableBtn,
      $cartoonAllIdolsTableBtn,
      $cartoonPartialIdolsTableBtn,
      $unitLinkBtnLabel,
      $unitSrcIdolCorrelationBtn,
      $unitSrcIdolTableBtn,
      $unitAllIdolsTableBtn,
      $unitPartialIdolsTableBtn
    )

    function createLinkBtn(category, iconClass, text1, text2, func) {
      var $linkBtnIcon = $('<div>', { class: 'linkBtnIcon' }).append(
        $('<i>', { class: iconClass })
      )
      var $linkBtnText = $('<div>', { class: 'linkBtnText' }).append(
        $('<span>', { class: 'name', text: text1 }),
        $('<br>'),
        $('<span>', { class: 'desc', text: text2 })
      )
      return $('<div>', { class: 'linkBtn ' + category })
        .append($linkBtnIcon, $linkBtnText)
        .click(func)
    }
  }

  function changeTargetIdol() {
    $('.linkIdols')
      .children()
      .removeClass('src')
      .addClass('target')
    $(this)
      .removeClass('target')
      .addClass('src')
    $('.linkBtnArea').remove()

    var $linkBtnArea = createLinkBtnArea($(this).data('idolId'))
    $('#linkModal .modal-body').append($linkBtnArea)
  }
}

function showLG() {
  var $lg = $('#lightgallery')

  var index = 0
  var dynamicEl = []
  $.each(lgEpList, function(i, id) {
    if (id === lgTargetId) index = i
    var cartoon = data.cartoon[id]
    var imgPath = IMG.FULL.PATH[cartoon.type]
    var imgThumbPath = IMG.THUMB.PATH[cartoon.type]
    dynamicEl.push({
      src: imgPath + id + '.jpg',
      thumb: imgThumbPath + id + '.jpg',
      subHtml: '<h3>' + cartoon.title + '</h3>',
    })
  })

  $lg.lightGallery({
    dynamic: true,
    dynamicEl: dynamicEl,
    preload: 3,
    index: index,
    hideBarsDelay: 1500,
    download: false,
    thumbnail: true,
    showThumbByDefault: false,
  })
  $lg.one('onCloseAfter.lg', function() {
    $lg.data('lightGallery').destroy(true)
  })
  $lg.one('onAfterOpen.lg', function() {
    var $lgOuter = $lg.data('lightGallery').$outer
    var observer = new MutationObserver(function(records) {
      if ($lgOuter.hasClass('lg-hide-items')) {
        $lgOuter.removeClass('lg-thumb-open')
      } else {
        $lgOuter.addClass('lg-thumb-open')
      }
    })
    observer.observe($lgOuter[0], {
      attributes: true,
      attributeFilter: ['class'],
    })
  })
}

function pidolGMouseEnter(d) {
  removeIdolFilter(d, false)
  addIdolFilter(d)
}

function pidolGMouseLeave(d) {
  removeIdolFilter(d, true)
}

function pidolGTouchStart(d) {
  if (d3.select(this).classed('pselected')) {
    touched = true
    resetPickup(d)
  }
}

function addIdolFilter(d) {
  var snode = getSNode()
  if (snode.id === d.id) return

  d3.select('#p_' + d.id).classed('pselected', true)

  var relationList = {}
  d.showEpList.each(function(ep) {
    $('#cartoon' + ep).addClass('hover')
    $('#cartoon' + ep)
      .parent()
      .addClass('hover')
    pidolG.selectAll('image').each(function(t) {
      if (t.epList.has(ep)) {
        relationList[t.id] = relationList[t.id] || 0
        relationList[t.id]++
      }
    })
  })
  idols.classed('coff', function(d) {
    var ret = true
    $.each(relationList, function(id, num) {
      if (d.id === id) ret = false
    })
    return ret
  })
  pidolG.selectAll('image').classed('coff', function(d) {
    var ret = true
    $.each(relationList, function(id, num) {
      if (d.id === id) ret = false
    })
    return ret
  })
  tlinkG.selectAll('line').classed('coff', function(d) {
    var ret = true
    $.each(relationList, function(id, num) {
      if (
        (d.target.id !== snode.id && d.target.id === id) ||
        (d.source.id !== snode.id && d.source.id === id)
      )
        ret = false
    })
    return ret
  })
  tcircleG
    .selectAll('circle')
    .classed('coff', function(d) {
      var ret = true
      $.each(relationList, function(id, num) {
        if (d.id === id) ret = false
      })
      return ret
    })
    .attr('r', function(d) {
      var ret = true
      $.each(relationList, function(id, num) {
        if (d.id === id) ret = false
      })
      return ret ? IMG_SIZE / 2 + 1 : (IMG_SIZE * PICKUP_SCALE) / 2 + 2
    })
}

function hideTooltip() {
  $('.own .tooltip-inner')
    .children()
    .remove()
  $('.own.tooltip').removeClass('fade in')
  // $('.own.tooltip').offset({ top: SVG_H })
  $('.target.tooltip').remove()
  $('#idolInfoTooltip')
    .children()
    .remove()
}

function showPickup(d) {
  console.log(d)
  pickuped = true
  simulation.stop()
  searchBox.val([d.id]).trigger('change.select2')
  d3.select('.pidols').classed('show', true)
  d3.select('.hover')
    .classed('hover', false)
    .classed('nselected', true)
  // d.hover = false;
  // d.selected = true;
  drawNeighbor(data.nodes, data.links)
  showSourceTooltip(d)
}

function hidePickup() {
  pickuped = false
  searchBox.val([]).trigger('change.select2')
  removeAllIdolFilter()
  d3.select('.nselected').classed('nselected', false)
  d3.select('.pidols').classed('show', false)
  drawNeighbor(data.nodes, data.links)
  simulation.alphaTarget(0.1).restart()
  hideTooltip()
}

function resetPickup(d) {
  hidePickup()
  var target = d3.select('#i_' + d.id)
  target.classed('hover', true)
  drawNeighbor(data.nodes, data.links)
  showPickup(target.data()[0])
}

/*
function clone (n) {
  var attrs = n.attributes
  var node = {}
  Object.keys(attrs).forEach(function (key) {
    node[attrs[key].name] = attrs[key].value
  })

  return node
}
*/

// MENU
$('#lmenu-top .switch').tooltip({
  placement: 'bottom',
  container: 'body',
})
$('#lmenu-top .switch.right').tooltip('show')
setTimeout(function() {
  $('#lmenu-top .switch.right').tooltip('hide')
}, 10000)
$('#lmenu-bottom i,#lmenu-bottom .stack').tooltip({
  placement: 'right',
  container: 'body',
})
$('#lmenu-top .switchArea').click(function() {
  window.location.href = '/table.html'
})
$('#help').click(function() {
  $('#helpModal').modal('show')
})

$('.helpImageBox').magnificPopup({
  delegate: 'a',
  type: 'image',
  mainClass: 'mfp-with-zoom',
  zoom: {
    enabled: true,
  },
  gallery: {
    enabled: true,
  },
})

var shuffleFlag = false
$('#shuffle').click(function() {
  hidePickup()
  if (shuffleFlag) return
  shuffleFlag = true
  simulation.force('collide').radius(0)
  simulation.alphaTarget(0.1).restart()
  setTimeout(function() {
    idols.data(d3.shuffle(data.nodes), function(d) {
      return d.id
    })
    simulation.nodes(data.nodes)
    simulation.force('collide').radius($('#collideValue').text())
    shuffleFlag = false
  }, 2000)
})

$('#pairFilter').selectpicker({
  size: 5,
})
$('#pairFilter').change(function() {
  pairFilterNum = parseInt($(this).selectpicker('val'))
  $('#pairFilterNum').text(pairFilterNum)

  var snode = getSNode()
  scircleG.selectAll('circle').classed('hover', true)

  drawLinks([])
  hidePickup()
  if (snode) showPickup(snode)
})
$('#filter').click(function() {
  $('#filterModal').modal('show')
})

$('#showCartoonTooltip').click(function() {
  $(this).toggleClass('off')

  var snode = getSNode()
  showSourceTooltip(snode)
})

$('#showIdolTooltip').click(function() {
  $(this).toggleClass('off')
  $('#idolInfoTooltip').toggleClass('hide')
})

$('#showKoma5,#showKoma1,#showWide').click(function() {
  $(this).toggleClass('off')

  var p = d3.select('circle.pickup').data()[0]
  resetPickup(p)
})

$('#searchBox').keyup(function() {
  var name = $(this).val()
  d3.map(data.nodes, function(d) {
    if (
      name.length > 0 &&
      (d.name.indexOf(name) !== -1 || d.kana.indexOf(name) !== -1)
    ) {
      d.search = true
    } else {
      d.search = false
    }
  })
  hidePickup()
  ticked()
})

$('#collideSlider').slider({ reversed: true })
$('#collideSlider').on('change', function(ev) {
  var value = ev.value.newValue
  $('#collideValue').text(value)
  simulation.force('collide').radius(value)
  simulation.alphaTarget(0.1).restart()
  hidePickup()
})

$('#zoomIn,#zoomOut').click(function() {
  var direction = this.id === 'zoomIn'
  var extent = zoom.scaleExtent()

  var transform = d3.zoomTransform(container)
  var scale = transform.k
  var targetScale = direction
    ? scale * Math.pow(2, 0.5)
    : scale / Math.pow(2, 0.5)

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
