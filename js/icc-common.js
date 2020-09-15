var iiRelease
var iccRelease
var icuRelease
var icrRelease
getHistory()

var IMG = {
  FULL: {
    PATH: {
      5: '/img/koma5/',
      1: '/img/koma1/',
      w: '/img/wide/',
    },
    SIZE: {
      5: { w: 183 * 1.2, h: 800 * 1.2 },
      1: { w: 702, h: 460 },
      w: { w: 456 * 1.2, h: 800 * 1.2 },
    },
  },
  THUMB: {
    PATH: {
      5: '/img/koma5_thumb/',
      1: '/img/koma1_thumb/',
      w: '/img/wide_thumb/',
    },
  },
}

var LINK_MODE = {
  ALL: 'all',
  PARTIAL: 'part',
}

// eslint-disable-next-line no-unused-vars
function parseQueryString() {
  var query = {}

  if (window.location.search.length) {
    var queryString = window.location.search.substring(1)
    var parameters = queryString.split('&')

    for (var i = 0; i < parameters.length; i++) {
      var element = parameters[i].split('=')
      var paramName = decodeURIComponent(element[0])
      var paramValue = decodeURIComponent(element[1])
      query[paramName] = paramValue
    }
  }

  return query
}

function openCartoonCorrelation(idol) {
  console.log('openCartoonCorrelation', idol)
  var queryParam = '?source=' + idol
  window.open('/' + queryParam)
}

function openCartoonTable(idols, mode) {
  console.log('openCartoonTable', idols, mode)
  var queryParam = '?idols=' + idols + (mode ? '&mode=' + mode : '')
  window.open('/table.html' + queryParam)
}

function openUnitCorrelation(idol) {
  console.log('openUnitCorrelation', idol)
  var queryParam = '?source=' + idol
  window.open('https://imags-cg-unit.netlify.com/' + queryParam)
  // window.open('http://localhost/' + queryParam)
}

function openUnitTable(idols, mode) {
  console.log('openUnitTable', idols, mode)
  var queryParam = '?idols=' + idols + (mode ? '&mode=' + mode : '')
  window.open('https://imags-cg-unit.netlify.com/table.html' + queryParam)
  // window.open('http://localhost/table.html' + queryParam)
}

function getHistory() {
  $.ajax({
    url: 'https://idol-introduction.netlify.com/data/iiRelease.json',
    dataType: 'json',
  })
    .done(function(data) {
      iiRelease = data
    })
    .fail(function(data) {
      iiRelease = { lastUpdate: '情報取得に失敗しました' }
    })
    .always(function() {
      $('.ii').text(iiRelease.lastUpdate)
    })

  $.ajax({
    url: 'https://imas-cg-cartoon.netlify.com/data/iccRelease.json',
    dataType: 'json',
  })
    .done(function(data) {
      iccRelease = data
    })
    .fail(function(data) {
      iccRelease = { lastUpdate: '蜿門ｾ怜､ｱ謨?' }
    })
    .always(function() {
      $('.release.icc').text(iccRelease.lastUpdate)
    })

  $.ajax({
    url: 'https://imags-cg-unit.netlify.com/data/icuRelease.json',
    dataType: 'json',
  })
    .done(function(data) {
      icuRelease = data
    })
    .fail(function(data) {
      icuRelease = { lastUpdate: '蜿門ｾ怜､ｱ謨?' }
    })
    .always(function() {
      $('.release.icu').text(icuRelease.lastUpdate)
    })

  $.ajax({
    url: 'https://imas-cg-idol-recommend.netlify.com/data/icrRelease.json',
    dataType: 'json',
  })
    .done(function(data) {
      icrRelease = data
    })
    .fail(function(data) {
      icrRelease = { lastUpdate: '蜿門ｾ怜､ｱ謨?' }
    })
    .always(function() {
      $('.release.icr').text(icrRelease.lastUpdate)
    })
}
