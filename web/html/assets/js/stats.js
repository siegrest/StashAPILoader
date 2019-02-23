
var TYPE = null;

$(document).ready(function() {
  if (TYPE = parseQueryParam('type')) {
    let request = $.ajax({
      url: "https://api.poe.watch/stats?type=" + TYPE,
      type: "GET",
      async: true,
      dataTypes: "json"
    });
  
    request.done(parseStats);
  }
}); 

function formatTime(time) {
  var diff = Math.abs(new Date(time) - new Date());
  var val = Math.floor(diff / 1000 / 60 / 60);

  return val.toString();
}

function parseStats(json) {
  var chartOptions = {
    height: 250,
    showPoint: true,
    lineSmooth: Chartist.Interpolation.cardinal({
      fillHoles: true,
    }),
    axisX: {
      showGrid: true,
      showLabel: true,
      labelInterpolationFnc: function skipLabels(value, index) {
        return index % 16 === 0 ? value + "h" : null;
      }
    },
    fullWidth: true,
    plugins: [
      Chartist.plugins.tooltip2({
        cssClass: 'chartist-tooltip',
        offset: {
          x: 0,
          y: -20,
        },
        template: '{{key}}h ago: {{value}}',
        hideDelay: 500
      })
    ]
  };

  var labels = [];
  for (let i = 0; i < json.labels.length; i++) {
    labels.push(formatTime(json.labels[i]));
  }

  for (let i = 0; i < json.types.length; i++) {
    const type = json.types[i];

    var series = [];
    for (let j = 0; j < json.series[i].length; j++) {
      series.push(json.series[i][j] === null ? 0 : json.series[i][j]);
    }
    
    var data = {
      labels: labels,
      series: [series]
    }

    var cardTemplate = `
    <div class="card custom-card w-100 mb-3">
      <div class="card-header">
        <h3 class="m-0">{{title}}</h3>
      </div>

      <div class="card-body">
        <div class='ct-chart' id='CHART-{{type}}'></div>
      </div>
    
      <div class="card-footer slim-card-edge"></div>
    </div>
    `.trim().replace("{{title}}", type).replace("{{type}}", type);

    $("#main").append(cardTemplate);

    switch (type) {
      case "COUNT_API_ERRORS_READ_TIMEOUT":
      case "COUNT_API_ERRORS_CONNECT_TIMEOUT":
      case "COUNT_API_ERRORS_CONNECTION_RESET":
      case "COUNT_API_ERRORS_5XX":
      case "COUNT_API_ERRORS_429":
      case "COUNT_API_ERRORS_DUPLICATE":
        new Chartist.Bar('#CHART-'+type, data, chartOptions);
        break;
      default:
        new Chartist.Line('#CHART-'+type, data, chartOptions);
        break;
    }
  }
}

function parseQueryParam(key) {
  let url = window.location.href;
  key = key.replace(/[\[\]]/g, '\\$&');
  
  var regex = new RegExp('[?&]' + key + '(=([^&#]*)|&|#|$)'),
      results = regex.exec(url);
      
  if (!results   ) return null;
  if (!results[2]) return   '';

  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
