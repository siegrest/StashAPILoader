/*
  There's not much here except for some poorly written JS functions. And since you're 
  already here, it can't hurt to take a look at http://youmightnotneedjquery.com/
*/

// Default item search filter options
var FILTER = {
  league: null,
  category: null,
  sub: "all",
  showLowConfidence: false,
  links: null,
  rarity: null,
  tier: null,
  search: null,
  gemLvl: null,
  gemQuality: null,
  gemCorrupted: null,
  baseIlvlMin: null,
  baseIlvlMax: null,
  baseInfluence: null,
  parseAmount: 150
};

var ITEMS = {};
var LEAGUES = null;
var HISTORY_DATA = {};
var CHART_HISTORY = null;
var HISTORY_LEAGUE = null;
var HISTORY_DATASET = 1;
var INTERVAL;

var ROW_last_id = null;
var ROW_parent = null, ROW_expanded = null, ROW_filler = null;

// Re-used icon urls
const ICON_ENCHANTMENT = "https://web.poecdn.com/image/Art/2DItems/Currency/Enchantment.png?scale=1&w=1&h=1";
const ICON_EXALTED = "https://web.poecdn.com/image/Art/2DItems/Currency/CurrencyAddModToRare.png?scale=1&w=1&h=1";
const ICON_CHAOS = "https://web.poecdn.com/image/Art/2DItems/Currency/CurrencyRerollRare.png?scale=1&w=1&h=1";
const ICON_MISSING = "https://poe.watch/assets/img/missing.png";

var TEMPLATE_imgContainer = "<span class='img-container img-container-sm text-center mr-1'><img src={{img}}></span>";

$(document).ready(function() {
  if (!SERVICE_category) return;

  FILTER.league = SERVICE_leagues[0].name;
  FILTER.category = SERVICE_category;

  readLeagueFromCookies(FILTER, SERVICE_leagues);
  makeGetRequest(FILTER.league, FILTER.category);
  defineListeners();
}); 

//------------------------------------------------------------------------------------------------------------
// Data prep
//------------------------------------------------------------------------------------------------------------

function readLeagueFromCookies(FILTER, leagues) {
  let league = getCookie("league");

  if (league) {
    console.log("Got league from cookie: " + league);

    // Check if league from cookie is still active
    for (let i = 0; i < leagues.length; i++) {
      const entry = leagues[i];
      
      if (league === entry.name) {
        FILTER.league = league;
        // Point league dropdown to that league
        $("#search-league").val(league);
        return;
      }
    }

    console.log("League cookie did not match any active leagues");
  }
}

function defineListeners() {
  // League
  $("#search-league").on("change", function(){
    FILTER.league = $(":selected", this).val();
    console.log("Selected league: " + FILTER.league);
    document.cookie = "league="+FILTER.league;
    makeGetRequest(FILTER.league, FILTER.category);
  });

  // Subcategory
  $("#search-sub").change(function(){
    FILTER.sub = $(this).find(":selected").val();
    console.log("Selected sub-category: " + FILTER.sub);
    updateQueryString("sub", FILTER.sub);
    sortResults(ITEMS);
  });

  // Load all button
  $("#button-showAll").on("click", function(){
    console.log("Button press: show all");
    $(this).hide();
    FILTER.parseAmount = -1;
    sortResults(ITEMS);
  });

  // Searchbar
  $("#search-searchbar").on("input", function(){
    FILTER.search = $(this).val().toLowerCase().trim();
    console.log("Search: " + FILTER.search);
    updateQueryString("search", FILTER.search);
    sortResults(ITEMS);
  });

  // Low confidence
  $("#radio-confidence").on("change", function(){
    let option = $("input:checked", this).val() === "1";
    console.log("Show low count: " + option);
    FILTER.showLowConfidence = option;
    updateQueryString("confidence", option);
    sortResults(ITEMS);
  });

  // Rarity
  $("#radio-rarity").on("change", function(){
    FILTER.rarity = $(":checked", this).val();
    console.log("Rarity filter: " + FILTER.rarity);
    if (FILTER.rarity === "all") FILTER.rarity = null;
    updateQueryString("rarity", FILTER.rarity);
    if      (FILTER.rarity === "unique") FILTER.rarity =    3;
    else if (FILTER.rarity ===  "relic") FILTER.rarity =    9;
    sortResults(ITEMS);
  });
  
  // Item links
  $("#select-links").on("change", function(){
    FILTER.links = $(":selected", this).val();
    console.log("Link filter: " + FILTER.links);
    updateQueryString("links", FILTER.links);
    if (FILTER.links ===  "all") FILTER.links = null;
    else if (FILTER.links === "none") FILTER.links = 0;
    else FILTER.links = parseInt(FILTER.links);
    sortResults(ITEMS);
  });

  // Map tier
  $("#select-tier").on("change", function(){
    FILTER.tier = $(":selected", this).val();
    console.log("Map tier filter: " + FILTER.tier);
    updateQueryString("tier", FILTER.tier);
    if (FILTER.tier === "all") FILTER.tier = null;
    else if (FILTER.tier === "none") FILTER.tier = 0;
    else FILTER.tier = parseInt(FILTER.tier);
    sortResults(ITEMS);
  });

  // Gem level
  $("#select-level").on("change", function(){
    FILTER.gemLvl = $(":selected", this).val();
    console.log("Gem lvl filter: " + FILTER.gemLvl);
    if (FILTER.gemLvl === "all") FILTER.gemLvl = null;
    else FILTER.gemLvl = parseInt(FILTER.gemLvl);
    updateQueryString("lvl", FILTER.gemLvl);
    sortResults(ITEMS);
  });

  // Gem quality
  $("#select-quality").on("change", function(){
    FILTER.gemQuality = $(":selected", this).val();
    console.log("Gem quality filter: " + FILTER.gemQuality);
    if (FILTER.gemQuality === "all") FILTER.gemQuality = null;
    else FILTER.gemQuality = parseInt(FILTER.gemQuality);
    updateQueryString("quality", FILTER.gemQuality);
    sortResults(ITEMS);
  });

  // Gem corrupted
  $("#radio-corrupted").on("change", function(){
    FILTER.gemCorrupted = $(":checked", this).val();
    console.log("Gem corruption filter: " + FILTER.gemCorrupted);
    if (FILTER.gemCorrupted === "all") FILTER.gemCorrupted = null;
    else FILTER.gemCorrupted = parseInt(FILTER.gemCorrupted);
    updateQueryString("corrupted", FILTER.gemCorrupted);
    sortResults(ITEMS);
  });

  // Base iLvl
  $("#select-ilvl").on("change", function(){
    let ilvlRange = $(":selected", this).val();
    console.log("Base iLvl filter: " + ilvlRange);
    if (ilvlRange === "all") {
      FILTER.baseIlvlMin = null;
      FILTER.baseIlvlMax = null;
      updateQueryString("ilvl", null);
    } else {
      let splitRange = ilvlRange.split("-");
      FILTER.baseIlvlMin = parseInt(splitRange[0]);
      FILTER.baseIlvlMax = parseInt(splitRange[1]);
      updateQueryString("ilvl", ilvlRange);
    }
    
    sortResults(ITEMS);
  });

  // Base influence
  $("#select-influence").on("change", function(){
    FILTER.baseInfluence = $(":selected", this).val();
    console.log("Base influence filter: " + FILTER.baseInfluence);
    if (FILTER.baseInfluence === "all") {
      FILTER.baseInfluence = null;
    }
    updateQueryString("influence", FILTER.baseInfluence);
    sortResults(ITEMS);
  });


  // Expand row
  $("#searchResults > tbody").delegate("tr", "click", function(event) {
    onRowClick(event);
  });

  // Live search toggle
  $("#live-updates").on("change", function(){
    let live = $("input[name=live]:checked", this).val() === "true";
    console.log("Live updates: " + live);
    document.cookie = "live="+live;

    if (live) {
      $("#progressbar-live").css("animation-name", "progressbar-live");
      INTERVAL = setInterval(timedRequestCallback, 60 * 1000);
    } else {
      $("#progressbar-live").css("animation-name", "");
      clearInterval(INTERVAL);
    }
  });
}

//------------------------------------------------------------------------------------------------------------
// Expanded row
//------------------------------------------------------------------------------------------------------------

function onRowClick(event) {
  let target = $(event.currentTarget);
  let id = parseInt(target.attr("value"));

  // If user clicked on a table that does not contain an id
  if (isNaN(id)) {
    return;
  } else if (event.target.href) {
    return;
  } else if (event.target.parentElement.href) {
    return;
  }

  // Get rid of any filler rows
  if (ROW_filler) {
    $(".filler-row").remove();
    ROW_filler = null;
  }

  // User clicked on open parent-row
  if (target.is(ROW_parent)) {
    console.log("Closed open row");

    $(".parent-row").removeAttr("class");
    ROW_parent = null;

    $(".selected-row").remove();
    ROW_expanded = null;
    return;
  }

  // There's an open row somewhere
  if (ROW_parent !== null || ROW_expanded !== null) {
    $(".selected-row").remove();
    $(".parent-row").removeAttr("class");

    console.log("Closed row: " + ROW_last_id);

    ROW_parent = null;
    ROW_expanded = null;
  }

  console.log("Clicked on row id: " + id);

  // Define current row as parent target row
  target.addClass("parent-row");
  ROW_parent = target;
  ROW_last_id = id;

  // Load history data
  if (id in HISTORY_DATA) {
    console.log("History source: local");
    buildExpandedRow(id);
  } else {
    console.log("History source: remote");

    // Display a filler row
    displayFillerRow();
    makeHistoryRequest(id);
  }
}

function displayFillerRow() {
  let template = `
  <tr class='filler-row'><td colspan='100'>
    <div class="d-flex justify-content-center">
      <div class="buffering m-2"></div>
    </div>
  </td></tr>
  `.trim();

  ROW_filler = $(template);
  ROW_parent.after(ROW_filler);
}

function makeHistoryRequest(id) {
  let request = $.ajax({
    url: "https://api.poe.watch/item.php",
    data: {id: id},
    type: "GET",
    async: true,
    dataTypes: "json"
  });

  request.done(function(payload) {
    if (ROW_filler) {
      $(".filler-row").remove();
      ROW_filler = null;
    }

    HISTORY_DATA[id] = payload;
    buildExpandedRow(id);
  });
}

function formatHistory(leaguePayload) {
  let keys = [];
  let vals = {
    mean:     [],
    median:   [],
    mode:     [],
    quantity: []
  };

  // Convert date strings into objects
  let oldestDate = new Date(leaguePayload.history[0].date);
  let startDate  = new Date(leaguePayload.league.start);
  let endDate    = new Date(leaguePayload.league.end);

  // Increment startdate by a couple of hours due to timezone differences
  startDate.setTime(startDate.getTime() + 4 * 60 * 60 * 1000);

  // Nr of days league data is missing since league start until first entry
  let timeDiffMissing = Math.abs(startDate.getTime() - oldestDate.getTime());
  let daysMissing     = Math.ceil(timeDiffMissing / (1000 * 60 * 60 * 24));

  // Nr of days in a league
  let timeDiffLeague = Math.abs(endDate.getTime() - startDate.getTime());
  let daysLeague     = Math.ceil(timeDiffLeague / (1000 * 60 * 60 * 24));

  // Hardcore (id 1) and Standard (id 2) don't have an end date
  if (leaguePayload.league.id <= 2) {
    daysLeague = 120;
    daysMissing = 0;
  }

  // Bloat using 'null's the amount of days that should not have a tooltip
  for (let i = 0; i < daysLeague - daysMissing - leaguePayload.history.length; i++) {
    vals.mean     .push(null);
    vals.median   .push(null);
    vals.mode     .push(null);
    vals.quantity .push(null);
    keys          .push(null);
  }

  // Bloat using '0's the amount of days that should show "no data"
  // Skip Hardcore (id 1) and Standard (id 2)
  if (leaguePayload.league.id > 2) {
    let tmpDate = new Date(startDate);

    for (let i = 0; i < daysMissing; i++) {
      vals.mean     .push(0);
      vals.median   .push(0);
      vals.mode     .push(0);
      vals.quantity .push(0);

      keys.push(formatDate(tmpDate));
      tmpDate.setDate(tmpDate.getDate() + 1);
    }
  }

  // Grab values
  for (let i = 0; i < leaguePayload.history.length; i++) {
    let element = leaguePayload.history[i];
    vals.mean     .push(element.mean     );
    vals.median   .push(element.median   );
    vals.mode     .push(element.mode     );
    vals.quantity .push(element.quantity );

    keys.push(formatDate(element.date));
  }

  // Return generated data
  return {
    'keys': keys,
    'vals': vals
  }
}

function getLeaguePayload(id, league) {
  for (let i = 0; i < HISTORY_DATA[id].data.length; i++) {
    if (HISTORY_DATA[id].data[i].league.name === league) {
      return HISTORY_DATA[id].data[i];
    }
  }

  return null;
}

function buildExpandedRow(id) {
  // Get list of past leagues available for the item
  let leagues = getItemHistoryLeagues(id);

  if (leagues.length < 1) {
    return;
  }

  // Get league-specific data pack
  HISTORY_LEAGUE = FILTER.league;
  let leaguePayload = getLeaguePayload(id, HISTORY_LEAGUE);

  // Create jQuery object based on data from request and set gvar
  ROW_expanded = createExpandedRow();
  createCharts(ROW_expanded);
  fillChartData(leaguePayload);
  createHistoryLeagueSelectorFields(ROW_expanded, leagues, FILTER.league);

  // Place jQuery object in table
  ROW_parent.after(ROW_expanded);

  // Create event listener for league selector
  createExpandedRowListeners(id, ROW_expanded);
}

function setDetailsTableValues(expandedRow, leaguePayload) {
  $("#details-table-mean",    expandedRow).html(  formatNum(leaguePayload.mean)      );
  $("#details-table-median",  expandedRow).html(  formatNum(leaguePayload.median)    );
  $("#details-table-mode",    expandedRow).html(  formatNum(leaguePayload.mode)      );
  $("#details-table-count",   expandedRow).html(  formatNum(leaguePayload.count)     );
  $("#details-table-1d",      expandedRow).html(  formatNum(leaguePayload.quantity)  );
  $("#details-table-exalted", expandedRow).html(  formatNum(leaguePayload.exalted)   );
}

function createCharts(expandedRow) {
  var dataPlugin = {
    beforeUpdate: function(chart) {
      // Don't run if data has not yet been initialized
      if (chart.data.data.length < 1) return;

      var keys = chart.data.data.keys;
      var vals = chart.data.data.vals;

      chart.data.labels = keys;

      switch (HISTORY_DATASET) {
        case 1: chart.data.datasets[0].data = vals.mean;      break;
        case 2: chart.data.datasets[0].data = vals.median;    break;
        case 3: chart.data.datasets[0].data = vals.mode;      break;
        case 4: chart.data.datasets[0].data = vals.quantity;  break;
      }
    }
  };

  var gradientLinePlugin = {
    beforeDatasetUpdate: function(chart) {
      if (!chart.width) return;

      // Create the linear gradient  chart.scales['x-axis-0'].width
      var gradient = chart.ctx.createLinearGradient(0, 0, 0, 250);

      gradient.addColorStop(0.0, 'rgba(247, 233, 152, 1)');
      gradient.addColorStop(1.0, 'rgba(244, 149, 179, 1)');

      // Assign the gradient to the dataset's border color.
      chart.data.datasets[0].borderColor = gradient;
    }
  };

  let settings = {
    plugins: [dataPlugin, gradientLinePlugin],
    type: "line",
    data: {
      data: [],
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: "rgba(0, 0, 0, 0.2)",
        borderColor: "rgba(255, 255, 255, 0.5)",
        borderWidth: 3,
        lineTension: 0.4,
        pointRadius: 0
      }]
    },
    options: {
      title: {display: false},
      layout: {padding: 0},
      legend: {display: false},
      responsive: true,
      maintainAspectRatio: false,
      animation: {duration: 0},
      hover: {animationDuration: 0},
      responsiveAnimationDuration: 0,
      tooltips: {
        intersect: false,
        mode: "index",
        callbacks: {
          title: function(tooltipItem, data) {
            let price = data['datasets'][0]['data'][tooltipItem[0]['index']];
            return price ? price : "No data";
          },
          label: function(tooltipItem, data) {
            return data['labels'][tooltipItem['index']];
          }
        },
        backgroundColor: '#fff',
        titleFontSize: 16,
        titleFontColor: '#222',
        bodyFontColor: '#444',
        bodyFontSize: 14,
        displayColors: false,
        borderWidth: 1,
        borderColor: '#aaa'
      },
      scales: {
        yAxes: [{
          ticks: {
            beginAtZero: true,
            padding: 0
          }
        }],
        xAxes: [{
          ticks: {
            callback: function(value, index, values) {
              return (value ? value : '');
            },
            maxRotation: 0,
            padding: 0
          }
        }]
      }
    }
  }

  CHART_HISTORY = new Chart($("#chart-past", expandedRow), settings);
}

function fillChartData(leaguePayload) {
   // Pad history with leading nulls
   let formattedHistory = formatHistory(leaguePayload);

   // Assign history chart datasets
   CHART_HISTORY.data.data = formattedHistory;
   CHART_HISTORY.update();
  
  // Set data in details table
  setDetailsTableValues(ROW_expanded, leaguePayload);
}

function createHistoryLeagueSelectorFields(expandedRow, leagues, selectedLeague) {
  let buffer = "";

  for (let i = 0; i < leagues.length; i++) {
    let display;

    if (leagues[i].display) {
      display = leagues[i].active ? leagues[i].display : "● " + leagues[i].display;
    } else {
      display = leagues[i].active ? leagues[i].name : "● " + leagues[i].name;
    }

    buffer += "<option value='{{value}}' {{selected}}>{{name}}</option>"
      .replace("{{selected}}",  (selectedLeague === leagues[i].name ? "selected" : ""))
      .replace("{{value}}",     leagues[i].name)
      .replace("{{name}}",      display);
  }

  $("#history-league-selector", expandedRow).append(buffer);
}

function createExpandedRow() {
  // Define the base template
  let template = `
  <tr class='selected-row'><td colspan='100'>
    <div class='row m-1'>
      <div class='col-sm d-flex mt-2'>
        <h4 class='m-0 mr-2'>League</h4>
        <select class="form-control form-control-sm w-auto mr-2" id="history-league-selector"></select>
      </div>
    </div>
    <hr>
    <div class='row m-1 mt-2'>
      <div class='col d-flex'>
        <table class="table table-sm details-table mw-item-dTable mr-4">
          <tbody>
            <tr>
              <td class='nowrap w-100'>Mean</td>
              <td class='nowrap'>{{chaosContainter}}<span id='details-table-mean'></span></td>
            </tr>
            <tr>
              <td class='nowrap w-100'>Median</td>
              <td class='nowrap'>{{chaosContainter}}<span id='details-table-median'></span></td>
            </tr>
            <tr>
              <td class='nowrap w-100'>Mode</td>
              <td class='nowrap'>{{chaosContainter}}<span id='details-table-mode'></span></td>
            </tr>
          </tbody>
        </table>

        <table class="table table-sm details-table mw-item-dTable">
          <tbody>
            <tr>
              <td class='nowra pw-100'>Total amount listed</td>
              <td class='nowrap'><span id='details-table-count'></span></td>
            </tr>
            <tr>
              <td class='nowrap w-100'>Listed every 24h</td>
              <td class='nowrap'><span id='details-table-1d'></span></td>
            </tr>
            <tr>
              <td class='nowrap w-100'>Price in exalted</td>
              <td class='nowrap'>{{exaltedContainter}}<span id='details-table-exalted'></span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <hr>
    <div class='row m-1 mb-3'>
      <div class='col-sm'>
        <h4>Past data</h4>
        <div class="btn-group btn-group-toggle mt-1 mb-3" data-toggle="buttons" id="history-dataset-radio">
          <label class="btn btn-sm btn-outline-dark p-0 px-1 active"><input type="radio" name="dataset" value=1>Mean</label>
          <label class="btn btn-sm btn-outline-dark p-0 px-1"><input type="radio" name="dataset" value=2>Median</label>
          <label class="btn btn-sm btn-outline-dark p-0 px-1"><input type="radio" name="dataset" value=3>Mode</label>
          <label class="btn btn-sm btn-outline-dark p-0 px-1"><input type="radio" name="dataset" value=4>Quantity</label>
        </div>
        <div class='chart-large'><canvas id="chart-past"></canvas></div>
      </div>
    </div>
  </td></tr>
  `.trim();

  let containterTemplate = "<span class='img-container img-container-xs text-center mr-1'><img src={{img}}></span>";
  let chaosContainer = containterTemplate.replace("{{img}}", ICON_CHAOS);
  let exaltedContainer = containterTemplate.replace("{{img}}", ICON_EXALTED);

  // :thinking:
  template = template
    .replace("{{chaosContainter}}",   chaosContainer)
    .replace("{{chaosContainter}}",   chaosContainer)
    .replace("{{chaosContainter}}",   chaosContainer)
    .replace("{{exaltedContainter}}", exaltedContainer);
  
  // Convert into jQuery object and return
  return $(template);
}

function createExpandedRowListeners(id, expandedRow) {
  $("#history-league-selector", expandedRow).change(function(){
    HISTORY_LEAGUE = $(":selected", this).val();

    // Get the payload associated with the selected league
    let leaguePayload = getLeaguePayload(id, HISTORY_LEAGUE);
    fillChartData(leaguePayload);
  });

  $("#history-dataset-radio", expandedRow).change(function(){
    HISTORY_DATASET = parseInt($("input[name=dataset]:checked", this).val());

    // Get the payload associated with the selected league
    let leaguePayload = getLeaguePayload(id, HISTORY_LEAGUE);
    fillChartData(leaguePayload);
  });
}

function getItemHistoryLeagues(id) {
  // Get list of past leagues available for the item
  let leagues = [];

  for (let i = 0; i < HISTORY_DATA[id].data.length; i++) {
    leagues.push({
      name:    HISTORY_DATA[id].data[i].league.name,
      display: HISTORY_DATA[id].data[i].league.display,
      active:  HISTORY_DATA[id].data[i].league.active
    });
  }

  return leagues;
}

//------------------------------------------------------------------------------------------------------------
// Requests
//------------------------------------------------------------------------------------------------------------

function makeGetRequest(league, category) {
  $("#searchResults tbody").empty();
  $(".buffering").show();
  $("#button-showAll").hide();
  $(".buffering-msg").remove();

  let request = $.ajax({
    url: "https://api.poe.watch/get.php",
    data: {
      league: league, 
      category: category
    },
    type: "GET",
    async: true,
    dataTypes: "json"
  });

  request.done(function(json) {
    console.log("Got " + json.length + " items from request");
    $(".buffering").hide();
    $(".buffering-msg").remove();

    let items = parseRequest(json);
    sortResults(items);
    ITEMS = items;
  });

  request.fail(function(response) {
    $(".buffering-msg").remove();

    let buffering = $(".buffering");
    buffering.hide();
    buffering.after("<div class='buffering-msg align-self-center mb-2'>" + response.responseJSON.error + "</div>");
  });
}

function parseRequest(json) {
  let items = new Map();

  // Loop though array, creating an associative array based on IDs
  for (let i = 0; i < json.length; i++) {
    const item = json[i];
    items['_' + item.id] = item;
  }

  return items;
}

function timedRequestCallback() {
  console.log("Automatic update");

  var request = $.ajax({
    url: "https://api.poe.watch/get.php",
    data: {
      league: FILTER.league, 
      category: FILTER.category
    },
    type: "GET",
    async: true,
    dataTypes: "json"
  });

  request.done(function(json) {
    console.log("Got " + json.length + " items from request");

    let items = parseRequest(json);
    sortResults(items);
    ITEMS = items;
  });

  request.fail(function(response) {
    $("#searchResults tbody").empty();
    buffering.after("<div class='buffering-msg align-self-center mb-2'>" + response.responseJSON.error + "</div>");
  });
}

//------------------------------------------------------------------------------------------------------------
// Item parsing and table HTML generation
//------------------------------------------------------------------------------------------------------------

function parseItem(item) {
  // Format name and variant/links badge
  let nameField = buildNameField(item);

  // Format gem fields
  let gemFields = buildGemFields(item);

  // Format base fields
  let baseFields = buildBaseFields(item);

  // Format map fields
  let mapFields = buildMapFields(item);

  // Format price and sparkline field
  let priceFields = buildPriceFields(item);

  // Format change field
  let changeField = buildChangeField(item);

  // Format count badge
  let quantField = buildQuantField(item);

  let template = `
    <tr value={{id}}>{{name}}{{gem}}{{base}}{{map}}{{price}}{{change}}{{quant}}</tr>
  `.trim();

  item.tableData = template
    .replace("{{id}}",      item.id)
    .replace("{{name}}",    nameField)
    .replace("{{gem}}",     gemFields)
    .replace("{{base}}",    baseFields)
    .replace("{{map}}",     mapFields)
    .replace("{{price}}",   priceFields)
    .replace("{{change}}",  changeField)
    .replace("{{quant}}",   quantField);
}

function buildNameField(item) {
  let template = `
  <td>
    <div class='d-flex align-items-center'>
      <span class='img-container img-container-sm text-center {{influence}} mr-1'><img src="{{icon}}"></span>
      <a href='{{url}}' target="_blank" {{foil}}>{{name}}{{type}}</a>{{var}}{{link}}
    </div>
  </td>
  `.trim();

  template = template.replace("{{url}}", "https://poe.watch/item?league=" + FILTER.league + "&id=" + item.id);

  if (item.icon) {
    // Use SSL for icons for that sweet, sweet secure site badge
    item.icon = item.icon.replace("http://", "https://");
    template = template.replace("{{icon}}", item.icon);
  } else {
    template = template.replace("{{icon}}", ICON_MISSING);
  }

  if (item.frame === 9) {
    template = template.replace("{{foil}}", "class='item-foil'");
  } else {
    template = template.replace("{{foil}}", "");
  }

  if (FILTER.category === "base") {
    if (item.var === "shaper") {
      template = template.replace("{{influence}}", "influence influence-shaper-1x1");
    } else if (item.var === "elder") {
      template = template.replace("{{influence}}", "influence influence-elder-1x1");
    } else {
      template = template.replace("{{influence}}", "");
    }
  } else {
    template = template.replace("{{influence}}", "");
  }

  if (FILTER.category === "enchantment") {
    if (item.var !== null) {
      let splitVar = item.var.split('-');
      for (var num in splitVar) {
        item.name = item.name.replace("#", splitVar[num]);
      }
    }
  }
  
  template = template.replace("{{name}}", item.name);

  if (item.type) {
    let tmp = "<span class='subtext-1'>, " + item.type + "</span>";;
    template = template.replace("{{type}}", tmp);
  } else {
    template = template.replace("{{type}}", "");
  }

  if (item.links) {
    let tmp = " <span class='badge custom-badge-gray ml-1'>" + item.links + " link</span>";
    template = template.replace("{{link}}", tmp);
  } else {
    template = template.replace("{{link}}", "");
  }

  if (item.var && FILTER.category !== "enchantment") {
    let tmp = " <span class='badge custom-badge-gray ml-1'>" + item.var + "</span>";
    template = template.replace("{{var}}", tmp);
  } else {
    template = template.replace("{{var}}", "");
  }

  return template;
}

function buildGemFields(item) {
  // Don't run if item is not a gem
  if (item.frame !== 4) return "";

  let template = `
  <td><span class='badge custom-badge-block custom-badge-gray'>{{lvl}}</span></td>
  <td><span class='badge custom-badge-block custom-badge-gray'>{{quality}}</span></td>
  <td><span class='badge custom-badge-{{color}}'>{{corr}}</span></td>
  `.trim();

  template = template.replace("{{lvl}}",      item.lvl);
  template = template.replace("{{quality}}",  item.quality);
  
  if (item.corrupted) {
    template = template.replace("{{color}}",  "red");
    template = template.replace("{{corr}}",   "✓");
  } else {
    template = template.replace("{{color}}",  "green");
    template = template.replace("{{corr}}",   "✕");
  }

  return template;
}

function buildBaseFields(item) {
  // Don't run if item is not a gem
  if (FILTER.category !== "base") return "";

  let displayLvl;

  if (item.var === "elder" || item.var === "shaper") {
    switch (item.ilvl) {
      case 68: displayLvl = "68 - 74";  break;
      case 75: displayLvl = "75 - 82";  break;
      case 84: displayLvl = "83 - 84";  break;
      case 85: displayLvl = "85 - 100"; break;
    }
  } else {
    displayLvl = "84";
  }

  return "<td class='nowrap'><span class='badge custom-badge-block custom-badge-gray'>" + displayLvl + "</span></td>";
}

function buildMapFields(item) {
  // Don't run if item is not a map
  if (FILTER.category !== "map") {
    return "";
  }

  return "<td class='nowrap'><span class='badge custom-badge-block custom-badge-gray'>" + (item.tier ? item.tier : "-") + "</span></td>";
}

function buildPriceFields(item) {
  let template = `
  <td>
    <div class='pricebox'>{{sparkline}}{{chaos_icon}}{{chaos_price}}</div>
  </td>
  <td>
    <div class='pricebox'>{{ex_icon}}{{ex_price}}</div>
  </td>
  `.trim();

  let chaosContainer  = TEMPLATE_imgContainer.trim().replace("{{img}}", ICON_CHAOS);
  let exContainer     = TEMPLATE_imgContainer.trim().replace("{{img}}", ICON_EXALTED);
  let sparkLine       = buildSparkLine(item);

  template = template.replace("{{sparkline}}",    sparkLine);
  template = template.replace("{{chaos_price}}",  roundPrice(item.mean));
  template = template.replace("{{chaos_icon}}",   chaosContainer);

  if (item.exalted >= 1) {
    template = template.replace("{{ex_icon}}",    exContainer);
    template = template.replace("{{ex_price}}",   roundPrice(item.exalted));
  } else {
    template = template.replace("{{ex_icon}}",    "");
    template = template.replace("{{ex_price}}",   "");
  }
  
  return template;
}

function buildSparkLine(item) {
  if (!item.spark) return "";

  let svgColorClass = item.change > 0 ? "sparkline-green" : "sparkline-orange";
  let svg = document.createElement("svg");
  
  svg.setAttribute("class", "sparkline " + svgColorClass);
  svg.setAttribute("width", 60);
  svg.setAttribute("height", 30);
  svg.setAttribute("stroke-width", 3);

  sparkline(svg, item.spark);
  
  return svg.outerHTML;
}

function buildChangeField(item) {
  let template = `
  <td>
    <span class='badge custom-badge-block custom-badge-{{color}}'>
      {{percent}}%
    </span>
  </td>
  `.trim();

  let change = 0;

  if (item.change > 999) {
    change = 999;
  } else if (item.change < -999) {
    change = -999;
  } else {
    change = Math.round(item.change); 
  }

  if (change > 100) {
    template = template.replace("{{color}}", "green");
  } else if (change < -100) {
    template = template.replace("{{color}}", "orange");
  } else if (change > 50) {
    template = template.replace("{{color}}", "green-lo");
  } else if (change < -50) {
    template = template.replace("{{color}}", "orange-lo");
  } else {
    template = template.replace("{{color}}", "gray");
  }

  return template.replace("{{percent}}", change);
}

function buildQuantField(item) {
  let template = `
  <td>
    <span class='badge custom-badge-block custom-badge-{{color}}'>
      {{quant}}
    </span>
  </td>
  `.trim();

  if (item.quantity >= 10) {
    template = template.replace("{{color}}", "gray");
  } else if (item.quantity >= 5) {
    template = template.replace("{{color}}", "orange");
  } else {
    template = template.replace("{{color}}", "red");
  }

  return template.replace("{{quant}}", item.quantity);
}

//------------------------------------------------------------------------------------------------------------
// Utility functions
//------------------------------------------------------------------------------------------------------------

function formatNum(num) {
  const numberWithCommas = (x) => {
    var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  }

  if (num === null) {
    return 'Unavailable';
  } else return numberWithCommas(Math.round(num * 100) / 100);
}

function roundPrice(price) {
  const numberWithCommas = (x) => {
    var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  }

  return numberWithCommas(Math.round(price * 100) / 100);
}

function formatDate(date) {
  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  let s = new Date(date);
  return s.getDate() + " " + MONTH_NAMES[s.getMonth()];
}

function getAllDays(length) {
  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  var a = [];
  
  for (let index = length; index > 1; index--) {
    var s = new Date();
    var n = new Date(s.setDate(s.getDate() - index))
    a.push(s.getDate() + " " + MONTH_NAMES[s.getMonth()]);
  }
  
  a.push("Atm");

  return a;
}

function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');

  for(var i = 0; i <ca.length; i++) {
    var c = ca[i];

    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }

    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }

  return "";
}

function toTitleCase(str) {
  return str.replace(/\w\S*/g, function(txt){
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

function updateQueryString(key, value) {
  switch (key) {
    case "confidence": value = value === false  ? null : value;   break;
    case "search":     value = value === ""     ? null : value;   break;
    case "sub":        value = value === "all"  ? null : value;   break;
    default:           break;
  }

  var url = document.location.href;
  var re = new RegExp("([?&])" + key + "=.*?(&|#|$)(.*)", "gi");
  var hash;

  if (re.test(url)) {
    if (typeof value !== 'undefined' && value !== null) {
      url = url.replace(re, '$1' + key + "=" + value + '$2$3');
    } else {
      hash = url.split('#');
      url = hash[0].replace(re, '$1$3').replace(/(&|\?)$/, '');
      
      if (typeof hash[1] !== 'undefined' && hash[1] !== null) {
        url += '#' + hash[1];
      }
    }
  } else if (typeof value !== 'undefined' && value !== null) {
    var separator = url.indexOf('?') !== -1 ? '&' : '?';
    hash = url.split('#');
    url = hash[0] + separator + key + '=' + value;

    if (typeof hash[1] !== 'undefined' && hash[1] !== null) {
      url += '#' + hash[1];
    }
  }

  history.replaceState({}, "foo", url);
}

//------------------------------------------------------------------------------------------------------------
// Itetm sorting and searching
//------------------------------------------------------------------------------------------------------------

function sortResults(items) {
  // Empty the table
  let table = $("#searchResults");
  $("tbody", table).empty();

  let count = 0, matches = 0;
  let buffer = "";

  // Loop through every item provided
  for (var key in items) {
    if (items.hasOwnProperty(key)) {
      // Skip parsing if item should be hidden according to filters
      if ( checkHideItem(items[key]) ) {
        continue;
      }

      matches++;

      // Stop if specified item limit has been reached
      if ( FILTER.parseAmount < 0 || count < FILTER.parseAmount ) {
        // If item has not been parsed, parse it 
        if ( !('tableData' in items[key]) ) {
          parseItem(items[key]);
        }

        // Append generated table data to buffer
        buffer += items[key].tableData;
        count++;
      }
    }
  }

  let loadAllBtn = $("#button-showAll");
  if (FILTER.parseAmount > 0 && matches > FILTER.parseAmount) {
    loadAllBtn.text("Show all (" + (matches - FILTER.parseAmount) + " items)");
    loadAllBtn.show();
  } else {
    loadAllBtn.hide();
  }
  
  // Add the generated HTML table data to the table
  table.append(buffer);
}

function checkHideItem(item) {
  // Hide low confidence items
  if (!FILTER.showLowConfidence) {
    if (item.quantity < 5) return true;
  }

  // String search
  if (FILTER.search) {
    if (item.name.toLowerCase().indexOf(FILTER.search) === -1) {
      if (item.type) {
        if (item.type.toLowerCase().indexOf(FILTER.search) === -1) {
          return true;
        }
      } else {
        return true;
      }
    }
  }

  // Hide sub-categories
  if (FILTER.sub !== "all" && FILTER.sub !== item.category) {
    return true;
  }

  // Hide mismatching rarities
  if (FILTER.rarity) {
    if (FILTER.rarity !== item.frame) {
      return true;
    }
  }

  // Hide items with different links
  if (FILTER.links !== null) {
    if (FILTER.links > 0) {
      if (item.links !== FILTER.links) {
        return true;
      }
    } else if (item.links) {
      return true;
    }
  }

  // Sort gems, I guess
  if (FILTER.category === "gem") {
    if (FILTER.gemLvl !== null && item.lvl != FILTER.gemLvl) return true;
    if (FILTER.gemQuality !== null && item.quality != FILTER.gemQuality) return true;
    if (FILTER.gemCorrupted !== null && item.corrupted != FILTER.gemCorrupted) return true;

  } else if (FILTER.category === "map") {
    if (FILTER.tier !== null) {
      if (FILTER.tier === 0) {
        if (item.tier !== null) return true;
      } else if (item.tier !== FILTER.tier) return true;
    }

  } else if (FILTER.category === "base") {
    // Check base influence
    if (FILTER.baseInfluence !== null) {
      if (FILTER.baseInfluence === "none") {
        if (item.var !== null) return true;
      } else if (FILTER.baseInfluence === "either") {
        if (item.var === null) return true;
      } else if (item.var !== FILTER.baseInfluence) {
        return true;
      }
    }

    // Check base ilvl
    if (item.ilvl !== null && FILTER.baseIlvlMin !== null && FILTER.baseIlvlMax !== null) {
      if (item.ilvl < FILTER.baseIlvlMin || item.ilvl > FILTER.baseIlvlMax) {
        return true;
      }
    }
  }

  return false;
}
