// ---------------------------------------------------------------------------------------------------------------------
//
// Script loaders
//
// ---------------------------------------------------------------------------------------------------------------------

/*
  There's not much here except for some poorly written JS functions. And since you're
  already here, it can't hurt to take a look at http://youmightnotneedjquery.com/
*/

// Global page data container
const PAGE_DATA = {
  currentPage: getCurrentPage(),
  apiUrl: 'https://api.poe.watch'
};

// Run the specific scripts on page load
$(document).ready(() => {
  switch (PAGE_DATA.currentPage) {
    case 'characters':
      new CharactersPage();
      return;

    case 'lab':
      new LabPage();
      return;

    case 'leagues':
      new LeaguesPage();
      return;

    case 'listings':
      new ListingPage();
      return;

    case 'prices':
      new PricesPage();
      return;

    case 'stats':
      new StatsPage();
      return;

    default:
      return;
  }
});

/**
 * Gets current page name
 *
 * @returns {string}
 */
function getCurrentPage() {
  const url = window.location.pathname;
  return url.substring(url.lastIndexOf('/') + 1);
}

// ---------------------------------------------------------------------------------------------------------------------
//
// Shared utility
//
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Static class that deals with handling and writing query parameters
 */
class QueryAccessor {
  /**
   * Set query param
   *
   * @param key
   * @param value
   */
  static updateQueryParam(key, value) {
    let url = document.location.href;
    let re = new RegExp(`([?&])${key}=.*?(&|#|$)(.*)`, 'gi');
    let hash;

    if (re.test(url)) {
      if (typeof value !== 'undefined' && value !== null) {
        url = url.replace(re, `$1${key}=${value}$2$3`);
      } else {
        hash = url.split('#');
        url = hash[0].replace(re, '$1$3').replace(/([&?])$/, '');

        if (typeof hash[1] !== 'undefined' && hash[1] !== null) {
          url += '#' + hash[1];
        }
      }
    } else if (typeof value !== 'undefined' && value !== null) {
      let separator = url.indexOf('?') !== -1 ? '&' : '?';

      hash = url.split('#');
      url = hash[0] + separator + key + '=' + value;

      if (typeof hash[1] !== 'undefined' && hash[1] !== null) {
        url += '#' + hash[1];
      }
    }

    history.replaceState({}, 'foo', url);
  }

  /**
   * Read query param
   *
   * @param key
   * @returns {string|null}
   */
  static parseQueryParam(key) {
    let url = window.location.href;
    key = key.replace(/[\[\]]/g, '\\$&');

    let regex = new RegExp('[?&]' + key + '(=([^&#]*)|&|#|$)');
    let results = regex.exec(url);

    if (!results) return null;
    if (!results[2]) return '';

    return decodeURIComponent(results[2].replace(/\+/g, ' '));
  }
}

/**
 * Table row sorting
 */
class Sorter {
  /**
   * Initial sorter configuration
   *
   * @param sortFunctions Structure of sorting functions for table columns
   * @param sortCallback Function to call when user requests a sort
   */
  constructor(sortFunctions, sortCallback) {
    // Function that will be called when rows should be sorted
    this.sortCallback = sortCallback;

    // Structure of sorting functions
    this.sortFunctions = sortFunctions;

    // Set default sorting function
    this.sortFunction = this.getSortFunc();
  }

  /**
   * Handles sorting events
   *
   * @param e Event data
   */
  sortListener(e) {
    const colName = e.target.innerHTML.toLowerCase();
    const target = $(e.target);
    let order = e.target.attributes.order ? e.target.attributes.order.value : null;
    let color = null;

    // Remove all data from all sort columns
    $('.sort-column').attr('class', 'sort-column').attr('order', null);
    target.attr('class', 'sort-column').attr('order', null);

    // Toggle descriptions and orders
    if (!order) {
      order = 'descending';
      color = 'custom-text-green';
    } else if (order === 'descending') {
      order = 'ascending';
      color = 'custom-text-red';
    } else if (order === 'ascending') {
      console.log('Sorting: default');

      this.sortFunction = this.getSortFunc();
      this.sortCallback();

      return;
    }

    // Set clicked col's data
    target.addClass(color).attr('order', order);
    console.log(`Sorting: ${colName} ${order}`);

    this.sortFunction = this.getSortFunc(colName, order);
    this.sortCallback();
  }

  /**
   * Get sort function that matches provided params
   *
   * @param col Column name to sort
   * @param order Sort ordering
   * @returns {*} Comparator function with two arguments
   */
  getSortFunc(col, order) {
    // If the sort function exists
    if (this.sortFunctions[col]) {
      if (this.sortFunctions[col][order]) {
        return this.sortFunctions[col][order];
      }
    }

    // Otherwise return default
    return this.sortFunctions.default[order]
      ? this.sortFunctions.default[order]
      : this.sortFunctions.default.descending;
  }
}

/**
 * Format a timestamp string to eg '16h' or '9 Jan' or '12 Sep 2017'
 *
 * @param timeStamp ISO 8601 UTC TZ format timestamp string
 * @returns {string} Display date
 */
function timeSince(timeStamp) {
  timeStamp = new Date(timeStamp);

  let now = new Date(),
    secondsPast = (now.getTime() - timeStamp.getTime()) / 1000;

  if (secondsPast < 60) {
    return parseInt(secondsPast) + 's';
  }

  if (secondsPast < 3600) {
    return parseInt(secondsPast / 60) + 'm';
  }

  if (secondsPast <= 86400) {
    return parseInt(secondsPast / 3600) + 'h';
  }

  if (secondsPast > 86400) {
    let day = timeStamp.getDate();
    let month = timeStamp.toDateString().match(/ [a-zA-Z]*/)[0].replace(' ', '');
    let year = timeStamp.getFullYear() == now.getFullYear() ? '' : ' ' + timeStamp.getFullYear();
    return `${day} ${month}${year}`;
  }
}

/**
 * Show (or hide) a status message
 *
 * @param msg
 * @param isError
 */
function statusMsg(msg, isError) {
  const div = $('#search-status');

  // Clear all classes
  div.removeClass();

  // If no message is provided, hide the status div
  if (msg) {
    div.addClass(isError ? 'custom-text-red' : 'custom-text-green');
    div.html(msg);
  } else {
    div.addClass('d-none');
  }
}

/**
 * Extension method for Date to add days
 */
Date.prototype.addDays = function (days) {
  let date = new Date(this.valueOf());
  date.setDate(date.getDate() + days);
  return date;
};

/**
 * Format a decimal point number. Eg '21233213.5364' => '21,233,213.53'
 *
 * @param num Any numeric
 * @returns {string} Display string
 */
function formatNum(num) {
  const numberWithCommas = (x) => {
    let parts = x.toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  if (num === null) {
    return 'Unavailable';
  } else return numberWithCommas(Math.round(num * 100) / 100);
}

// ---------------------------------------------------------------------------------------------------------------------
//
// Page functionality
//
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Table row for listings
 */
class ListingRow {
  constructor(item) {
    this.item = item;

    this.name = this.formatName();
    this.properties = this.formatProperties();
    this.price = this.formatPrice();
  }

  /**
   * Creates formatted title for the item
   *
   * @returns {string}
   */
  formatName() {
    // If item is enchantment, insert enchant values for display purposes
    if (this.item.category === 'enchantment') {
      // Min roll
      if (this.item.name.includes('#') && this.item.enchantMin !== null) {
        this.item.name = this.item.name.replace('#', this.item.enchantMin);
      }

      // Max roll
      if (this.item.name.includes('#') && this.item.enchantMax !== null) {
        this.item.name = this.item.name.replace('#', this.item.enchantMax);
      }
    }

    // Begin builder
    let builder = this.item.name;
    if (this.item.frame === 3) {
      builder = `<span class='item-unique'>${this.item.name}</span>`;
    }

    if (this.item.type) {
      builder += `<span class='subtext-1'>, ${this.item.type}</span>`;
    }

    if (this.item.frame === 3) {
      builder = `<span class='item-unique'>${builder}</span>`;
    } else if (this.item.frame === 9) {
      builder = `<span class='item-foil'>${builder}</span>`;
    } else if (this.item.frame === 8) {
      builder = `<span class='item-prophecy'>${builder}</span>`;
    } else if (this.item.frame === 4) {
      builder = `<span class='item-gem'>${builder}</span>`;
    } else if (this.item.frame === 5) {
      builder = `<span class='item-currency'>${builder}</span>`;
    } else if (this.item.category === 'base') {
      if (this.item.baseIsShaper) {
        builder = `<span class='item-shaper'>${builder}</span>`;
      } else if (this.item.baseIsElder) {
        builder = `<span class='item-elder'>${builder}</span>`;
      }
    }

    return builder;
  }

  /**
   * Creates formatted properties for the item
   *
   * @returns {string}
   */
  formatProperties() {
    // Begin builder
    let builder = '';

    if (this.item.variation) {
      builder += `${this.item.variation}, `;
    }

    if (this.item.category === 'map' && this.item.mapTier) {
      builder += `Tier ${this.item.mapTier}, `;
    }

    if (this.item.baseItemLevel) {
      builder += `iLvl ${this.item.baseItemLevel}, `;
    }

    if (this.item.linkCount) {
      builder += `Links ${this.item.linkCount}, `;
    }

    if (this.item.category === 'gem') {
      builder += `Level ${this.item.gemLevel}, `;
      builder += `Quality ${this.item.gemQuality}, `;

      if (this.item.gemIsCorrupted) {
        builder += 'Corrupted, ';
      }
    }

    if (builder) {
      builder = `(${builder.substring(0, builder.length - 2)})`;
    }

    return builder;
  }

  /**
   * Formats price string for the row
   *
   * @returns {string}
   */
  formatPrice() {
    if (this.item.buyout.length > 0) {
      return `${this.item.buyout[0].price} ${this.item.buyout[0].currency}`;
    }

    return '';
  }

  /**
   * Builds the table row for the item
   *
   * @returns {string}
   */
  buildRow() {
    return `<tr>
  <td>
    <div class="d-flex align-items-center">
      <div class="img-container img-container-xs text-center mr-1">
        <img src="${this.item.icon}" alt="...">
      </div>
      <div>
        <span class="custom-text-gray-lo">${this.name}</span>
        <span class="badge custom-text-gray p-0">${this.properties}</span>
      </div>
    </div>
  </td>
  <td class="text-nowrap custom-text-gray-lo text-center">
    <span class="badge p-0">${this.item.count}</span>
  </td>
  <td class="text-nowrap custom-text-gray-lo">
    <span class="badge p-0">${this.price}</span>
  </td>
  <td class="text-nowrap custom-text-gray-lo">
    <span class="badge p-0">${timeSince(this.item.discovered)}</span>
  </td>
  <td class="text-nowrap custom-text-gray-lo">
    <span class="badge p-0">${timeSince(this.item.updated)}</span>
  </td>
</tr>`
  }
}

/**
 * Logic for listings
 */
class ListingPage {
  /**
   * Initial configuration for the page
   */
  constructor() {
    this.search = {
      account: null,
      league: null,
      results: {}
    };

    // Define sort functions for this page
    const sortFunctions = {
      found: {
        ascending: (a, b) => {
          if (a.discovered < b.discovered) return -1;
          if (a.discovered > b.discovered) return 1;
          return 0;
        },
        descending: (a, b) => {
          if (a.discovered > b.discovered) return -1;
          if (a.discovered < b.discovered) return 1;
          return 0;
        }
      },
      default: {
        ascending: (a, b) => {
          if (a.updated < b.updated) return -1;
          if (a.updated > b.updated) return 1;
          return 0;
        },
        descending: (a, b) => {
          if (a.updated > b.updated) return -1;
          if (a.updated < b.updated) return 1;
          return 0;
        }
      },
      price: {
        ascending: (a, b) => {
          if (a.buyout.length === 0 && b.buyout.length > 0) return 1;
          if (b.buyout.length === 0 && a.buyout.length > 0) return -1;
          if (a.buyout.length === 0 && b.buyout.length === 0) return 0;
          if (a.buyout[0].chaos > b.buyout[0].chaos) return -1;
          if (a.buyout[0].chaos < b.buyout[0].chaos) return 1;
          return 0;
        },
        descending: (a, b) => {
          if (a.buyout.length === 0 && b.buyout.length > 0) return -1;
          if (b.buyout.length === 0 && a.buyout.length > 0) return 1;
          if (a.buyout.length === 0 && b.buyout.length === 0) return 0;
          if (a.buyout[0].chaos > b.buyout[0].chaos) return 1;
          if (a.buyout[0].chaos < b.buyout[0].chaos) return -1;
          return 0;
        }
      },
      count: {
        ascending: (a, b) => {
          if (a.count < b.count) return -1;
          if (a.count > b.count) return 1;
          return 0;
        },
        descending: (a, b) => {
          if (a.count > b.count) return -1;
          if (a.count < b.count) return 1;
          return 0;
        }
      },
      item: {
        ascending: (a, b) => {
          if (a.name < b.name) return -1;
          if (a.name > b.name) return 1;
          return 0;
        },
        descending: (a, b) => {
          if (a.name > b.name) return -1;
          if (a.name < b.name) return 1;
          return 0;
        }
      }
    };
    // Create a sorter for the page
    this.sorter = new Sorter(sortFunctions, () => this.sortEntries());

    // Load data from user-provided query parameters
    this.parseQueryParams();
    // Set up event listeners
    this.defineListeners();

    // Run the request if both a league and account name were provided
    if (this.search.league && this.search.account) {
      this.makeGetRequest(this.search.league, this.search.account);
    }
  }

  /**
   * Load and processes query parameters on initial page load
   */
  parseQueryParams() {
    const league = QueryAccessor.parseQueryParam('league');
    const account = QueryAccessor.parseQueryParam('account');

    if (league) {
      this.search.league = league;
      $('#search-league').val(league);
    } else {
      // Get default option from league selector
      this.search.league = $('#search-league>option').val();
    }

    if (account) {
      $('#search-input').val(account);
      this.search.account = account;
    }
  }

  /**
   * Create listener events
   *
   * todo: rework this function using prices.js's listener setup structure
   */
  defineListeners() {
    $('#search-input').on('input', e => {
      if (e.target.value) {
        this.search.account = e.target.value;
        console.log('Username: ' + this.search.account);
      } else {
        this.search.account = null;
        console.log('Username cleared');
      }

      QueryAccessor.updateQueryParam('account', this.search.account);
    });

    $('#search-btn').on('click', e => {
      QueryAccessor.updateQueryParam('league', this.search.league);

      if (!this.search.account) {
        statusMsg('Enter an account name', true);
        return;
      } else if (this.search.account.length < 3) {
        statusMsg('Account name is too short', true);
        return;
      } else if (this.search.account.length > 64) {
        statusMsg('Account name is too long', true);
        return;
      }

      // If same search has already been made
      const json = this.search.results[this.search.league + this.search.account];
      if (json !== undefined) {
        statusMsg(`Loaded ${json.length} items from memory`);
        this.fillTable(json);

        return;
      }

      // Clear status msg
      statusMsg();
      this.makeGetRequest(this.search.league, this.search.account);
    });

    $('#search-league').on('change', e => {
      this.search.league = e.target.value;
      console.log('League: ' + this.search.league);
      QueryAccessor.updateQueryParam('league', this.search.league);
    });

    $('.sort-column').on('click', e => this.sorter.sortListener(e));
  }

  /**
   * Make request to API
   *
   * @param league
   * @param account
   */
  makeGetRequest(league, account) {
    const spinner = $('#spinner');
    spinner.removeClass('d-none');

    const request = $.ajax({
      url: `${PAGE_DATA.apiUrl}/listings`,
      data: {
        league: league,
        account: account
      },
      type: 'GET',
      async: true,
      dataTypes: 'json'
    });

    request.done(json => {
      this.search.results[league + account] = json;

      if (json.length === 0) {
        statusMsg(`No items found in that league`, true);
      } else {
        statusMsg(`Found ${json.length} items`);
      }

      $('#search-results').removeClass('d-none');

      // Sort descending
      json.sort(this.sorter.sortFunction);
      this.fillTable(json);
      spinner.addClass('d-none');
    });

    request.fail(response => {
      console.log(response);
      this.search.results[account] = null;

      statusMsg(response.responseJSON.error);
      spinner.addClass('d-none');
    });
  }

  /**
   * Sort and load items
   */
  sortEntries() {
    const json = this.search.results[this.search.league + this.search.account];
    json.sort(this.sorter.sortFunction);
    this.fillTable(json);
  }

  /**
   * Generate rows and fill main table with data
   *
   * @param items
   */
  fillTable(items) {
    const table = $('#search-results > tbody');

    if (!items) {
      table.html();
    }

    let tableRows = [];
    for (let i = 0; i < items.length; i++) {
      if (!items[i].html) {
        items[i].html = new ListingRow(items[i]).buildRow();
      }

      tableRows.push(items[i].html);
    }

    table.html(tableRows.join(''));
  }
}

/**
 * Table row for characters
 */
class UserRow {
  constructor(user, mode, search) {
    this.user = user;

    this.search = search;
    this.mode = mode;
  }

  /**
   * Builds the table row for a user entry
   *
   * @returns {string} Row HTML
   */
  buildRow() {
    // get correct name depending on the mode
    const account = this.mode === 'account' ? this.search : this.user.account;
    const character = this.mode === 'character' ? this.search : this.user.character;

    const accountDisplay = this.mode === 'account'
      ? `<span class="custom-text-orange">${account}</span>`
      : `<span>${account}</span>`;
    const characterDisplay = this.mode === 'character'
      ? `<span class="custom-text-orange">${character}</span>`
      : `<span>${character}</span>`;

    // build the table row
    return `<tr>
  <td class="text-nowrap">
    <a href='characters?mode=account&search=${account}'>
      <span class="custom-text-gray-lo">${accountDisplay}</span>
    </a>
    <a class="custom-text-gray" href='https://www.pathofexile.com/account/view-profile/${account}' target="_blank">⬈</a>
  </td>
  <td>
    <a href='characters?mode=character&search=${character}'>
      <span class="custom-text-gray-lo">${characterDisplay}</span>
    </a>
  </td>
  <td class="badge">${this.user.league ? this.user.league : '-'}</td>
  <td class="text-nowrap custom-text-gray-lo">
    <span class="badge p-0">${timeSince(this.user.found)}</span>
  </td>
  <td class="text-nowrap custom-text-gray-lo">
    <span class="badge p-0">${timeSince(this.user.seen)}</span>
  </td>
</tr>`;
  }
}

/**
 * Logic for characters
 */
class CharactersPage {
  /**
   * Initial configuration for the page
   */
  constructor() {
    this.search = {
      search: null,
      mode: 'account',
      results: {}
    };

    // Load data from user-provided query parameters
    this.parseQueryParams();
    // Set up event listeners
    this.defineListeners();

    // Run the request if both a mode and search string were provided
    if (this.search.mode && this.search.search) {
      this.makeGetRequest(this.search.mode, this.search.search);
    }
  }

  /**
   * Load and process query parameters on initial page load
   */
  parseQueryParams() {
    const mode = QueryAccessor.parseQueryParam('mode');
    const search = QueryAccessor.parseQueryParam('search');

    if (mode) {
      $('#search-mode').val(mode);
      this.search.mode = mode;
    }

    if (search) {
      $('#search-input').val(search);
      this.search.search = search;
    }
  }

  /**
   * Creates listener events
   */
  defineListeners() {
    $('#search-input').on('input', e => {
      const val = e.target.value.trim();

      if (val) {
        this.search.search = val;
        console.log('Search: ' + this.search.search);
      } else {
        this.search.search = null;
        console.log('Search cleared');
      }

      QueryAccessor.updateQueryParam('search', this.search.search);
    });

    $('#search-btn').on('click', e => {
      QueryAccessor.updateQueryParam('mode', this.search.mode);

      if (!this.search.search) {
        statusMsg('Enter an account name', true);
        return;
      } else if (this.search.search.length < 3) {
        statusMsg('Name is too short', true);
        return;
      } else if (this.search.search.length > 64) {
        statusMsg('Name is too long', true);
        return;
      }

      // If same search has already been made
      const json = this.search.results[this.search.mode + this.search.search];
      if (json !== undefined) {
        statusMsg(`Loaded ${json.length} entries from memory`);
        this.fillTable(json);

        return;
      }

      statusMsg();
      this.makeGetRequest(this.search.mode, this.search.search);
    });

    $('#search-mode').on('change', e => {
      this.search.mode = e.target.value;
      console.log('Mode: ' + this.search.mode);
      QueryAccessor.updateQueryParam('mode', this.search.mode);
    });
  }

  /**
   * Makes request to api
   *
   * @param mode
   * @param search
   */
  makeGetRequest(mode, search) {
    const spinner = $('#spinner');
    spinner.removeClass('d-none');

    const endpoint = mode === 'account' ? 'characters' : 'accounts';
    const payload = {};
    payload[mode] = search;

    const request = $.ajax({
      url: `${PAGE_DATA.apiUrl}/${endpoint}`,
      data: payload,
      type: 'GET',
      async: true,
      dataTypes: 'json'
    });

    request.done(json => {
      this.search.results[mode + search] = json;

      if (json.length === 0) {
        statusMsg(`No characters found`, true);
      } else {
        statusMsg(`Found ${json.length} characters`);
      }

      $('#search-results').removeClass('d-none');

      this.fillTable(json);
      spinner.addClass('d-none');
    });

    request.fail(response => {
      console.log(response);
      this.search.results[mode + search] = null;

      statusMsg(response.responseJSON.error);
      spinner.addClass('d-none');
    });
  }

  /**
   * Fills main table with data
   *
   * @param users
   */
  fillTable(users) {
    const table = $('#search-results > tbody');

    // if no data was provided, clear the table
    if (!users) {
      table.html();
    }

    let builder = '';
    for (let i = 0; i < users.length; i++) {
      // If the row hasn't been processed yet
      if (!users[i].html) {
        const user = new UserRow(users[i], this.search.mode, this.search.search);
        users[i].html = user.buildRow();
      }

      // add to builder
      builder += users[i].html;
    }

    table.html(builder);
  }
}

/**
 * Logic for leagues
 */
class LeaguesPage {
  /**
   * Initial configuration for the page
   */
  constructor() {
    const self = this;

    $('.element-id').each(function () {
      self.addCountDownTimer(this);
    });
  }

  /**
   * todo: doc
   *
   * @param element
   */
  addCountDownTimer(element) {
    const isUpcoming = $('.element-data-upcoming', element).attr('value') === 1;
    const start = $('.element-data-start', element).attr('value');
    const end = $('.element-data-end', element).attr('value');
    let timer;

    const cd1Text = $('.element-cd-id-1-text', element);
    const cd2Text = $('.element-cd-id-2-text', element);
    const cdBar = $('.element-cdbar-id', element);

    const showRemaining = () => {
      const startData = LeaguesPage.calcTime(start);
      const endData = LeaguesPage.calcTime(end);

      if (isUpcoming && start && startData.distance < 1000 || !isUpcoming && end && endData.distance < 1000) {
        clearInterval(timer);
        return;
      }

      cd1Text.html(startData.text);
      cd2Text.html(endData.text);

      if (!isUpcoming) {
        cdBar.css('width', LeaguesPage.calcPercentage(start, end) + '%');
      }
    };

    showRemaining();
    timer = setInterval(showRemaining, 1000);
  }

  /**
   * todo: doc
   *
   * @param timeString
   * @returns {{distance: number, text: string}}
   */
  static calcTime(timeString) {
    if (!timeString) {
      return {
        text: "<span class='subtext-0'>Unavailable</span>",
        distance: -1
      };
    }

    const time = new Date(timeString);

    const _second = 1000;
    const _minute = _second * 60;
    const _hour = _minute * 60;
    const _day = _hour * 24;

    const distance = Math.abs(time - new Date());

    const days = Math.floor(distance / _day);
    const hours = Math.floor((distance % _day) / _hour);
    const minutes = Math.floor((distance % _hour) / _minute);
    const seconds = Math.floor((distance % _minute) / _second);

    let dDisplay, hDisplay, mDisplay, sDisplay;

    if (days === 0) dDisplay = `<span class='subtext-1'>${days}d</span>`;
    else if (days === 1) dDisplay = `<span class='custom-text-orange'>${days}d</span>`;
    else dDisplay = `<span class='subtext-0'>${days}d</span>`;

    if (days === 0) {
      if (hours === 0) hDisplay = `<span class='subtext-1'>${hours}h</span>`;
      else if (hours === 1) hDisplay = `<span class='custom-text-orange'>${hours}h</span>`;
      else hDisplay = `<span class='custom-text-red'>${hours}h</span>`;
    } else hDisplay = `<span class='subtext-0'>${hours}h</span>`;

    if (days === 0 && hours === 0) {
      if (minutes === 0) mDisplay = `<span class='subtext-1'>${minutes}m</span>`;
      else if (minutes === 1) mDisplay = `<span class='custom-text-orange'>${minutes}m</span>`;
      else mDisplay = `<span class='custom-text-red'>${minutes}m</span>`;
    } else mDisplay = `<span class='subtext-0'>${minutes}m</span>`;

    if (days === 0 && hours === 0 && minutes === 0) {
      if (seconds === 0) sDisplay = `<span class='subtext-1'>${seconds}s</span>`;
      else if (seconds === 1) sDisplay = `<span class='custom-text-orange'>${seconds}s</span>`;
      else sDisplay = `<span class='custom-text-red'>${seconds}s</span>`;
    } else sDisplay = `<span class='subtext-0'>${seconds}s</span>`;

    return {
      text: `${dDisplay} ${hDisplay} ${mDisplay} ${sDisplay}`,
      distance: distance
    };
  }

  /**
   * todo: doc
   *
   * @param startString
   * @param endString
   * @returns {number}
   */
  static calcPercentage(startString, endString) {
    if (!startString || !endString) {
      return 0;
    }

    const now = new Date();
    const startTime = new Date(startString);
    const endTime = new Date(endString);

    return startTime < now ? (now - startTime) / (endTime - startTime) * 100 : 0;
  }
}

/**
 * Logic for stats
 */
class StatsPage {
  /**
   * Initial configuration for the page
   */
  constructor() {
    this.statData = {};
    this.chartOptions = {
      height: 250,
      showPoint: true,
      lineSmooth: Chartist.Interpolation.cardinal({
        fillHoles: true,
      }),
      axisX: {
        showGrid: true,
        showLabel: true,
        labelInterpolationFnc: function skipLabels(value, index) {
          return index % 16 === 0 ? value + 'h' : null;
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

    // Load data from user-provided query parameters
    this.parseQueryParams();
    // Set up event listeners
    this.defineListeners();

  }

  parseQueryParams() {
    let type = QueryAccessor.parseQueryParam('type');

    if (!type) {
      type = 'count';
      QueryAccessor.updateQueryParam('type', type);
    }

    this.makeGetRequest(type);
  }

  defineListeners() {
    $('button.statSelect').on('click', e => {
      console.log(`Button press: ${e.target.value}`);
      QueryAccessor.updateQueryParam('type', e.target.value);

      $('button.statSelect').removeClass('active');
      $(e.target).addClass('active');

      this.makeGetRequest(e.target.value);
    });
  }

  makeGetRequest(type) {
    if (!['count', 'error', 'time'].includes(type)) {
      return;
    }

    if (type in this.statData) {
      this.fillPage(this.statData[type]);
      return;
    }

    const request = $.ajax({
      url: `${PAGE_DATA.apiUrl}/stats`,
      data: {type: type},
      type: 'GET',
      async: true,
      dataTypes: 'json'
    });

    request.done(json => {
      this.statData[type] = json;
      this.fillPage(json);
    });

    request.fail(response => {
      console.log(response);
    });
  }

  fillPage(json) {
    const main = $('#main');
    main.empty();

    const labels = [];
    for (let i = 0; i < json.labels.length; i++) {
      labels.push(StatsPage.formatTime(json.labels[i]));
    }

    for (let i = 0; i < json.types.length; i++) {
      const type = json.types[i];

      const series = [];
      for (let j = 0; j < json.series[i].length; j++) {
        series.push(json.series[i][j] === null ? 0 : json.series[i][j]);
      }

      const data = {
        labels: labels,
        series: [series]
      };

      const cardTemplate = `
    <div class="card custom-card w-100 mb-3">
      <div class="card-header">
        <h3 class="m-0">${type}</h3>
      </div>

      <div class="card-body">
        <div class='ct-chart' id='CHART-${type}'></div>
      </div>
    
      <div class="card-footer slim-card-edge"></div>
    </div>
    `.trim();

      main.append(cardTemplate);

      switch (type) {
        case 'COUNT_API_ERRORS_READ_TIMEOUT':
        case 'COUNT_API_ERRORS_CONNECT_TIMEOUT':
        case 'COUNT_API_ERRORS_CONNECTION_RESET':
        case 'COUNT_API_ERRORS_5XX':
        case 'COUNT_API_ERRORS_429':
        case 'COUNT_API_ERRORS_DUPLICATE':
          new Chartist.Bar(`#CHART-${type}`, data, this.chartOptions);
          break;
        default:
          new Chartist.Line(`#CHART-${type}`, data, this.chartOptions);
          break;
      }
    }
  }

  static formatTime(time) {
    const diff = Math.abs(new Date(time) - new Date());
    const val = Math.floor(diff / 1000 / 60 / 60);

    return val.toString();
  }
}

/**
 * Logic for lab
 */
class LabPage {
  constructor() {
    this.urlTemplate = 'https://www.poelab.com/wp-content/uploads/{{yyyy}}/{{mm}}/{{yyyy}}-{{mm}}-{{dd}}_{{lab}}.jpg';
    this.labs = ['uber', 'merciless', 'cruel', 'normal'];
    this.tryCount = {};

    this.setup();
  }

  setup() {
    const current = new Date();
    const previous = new Date();

    previous.setDate(previous.getDate() - 1);

    for (let i = 0; i < this.labs.length; i++) {
      const img = $(`#pw-lab-${this.labs[i]} img`);

      const statusDiv = $(`#pw-lab-${this.labs[i]}-status`);
      const date = `${current.getDate()}/${current.getMonth() + 1}/${current.getFullYear()}`;
      statusDiv.html(`<span class='custom-text-green'>${date}</span>`);

      img.attr('src', this.urlTemplate
        .replace(/{{yyyy}}/g, current.getFullYear())
        .replace(/{{mm}}/g, (current.getMonth() + 1 <= 9 ? '0' : '') + (current.getMonth() + 1))
        .replace(/{{dd}}/g, (current.getDate() <= 9 ? '0' : '') + current.getDate())
        .replace(/{{lab}}/g, this.labs[i])
      );

      img.on('error', e => this.imgOnError(e, i));
      img.on('load', e => this.imgOnLoad(e, i));
    }
  }

  imgOnLoad(e, i) {
    console.log(`Loaded ${this.labs[i]}: ${e.target.src}`);
    e.target.parentElement.href = e.target.src;
  }

  imgOnError(e, i) {
    console.log(`Error loading ${this.labs[i]}: ${e.target.src}`);

    const statusDiv = $(`#pw-lab-${this.labs[i]}-status`);
    const date = `${previous.getDate()}/${previous.getMonth() + 1}/${previous.getFullYear()}`;

    if (this.tryCount[this.labs[i]] === undefined) {
      this.tryCount[this.labs[i]] = true;
      statusDiv.html(`<span class='custom-text-red'>${date}</span>`);
    } else {
      console.log(`Exceeded maximum retry count for: ${this.labs[i]}`);
      return;
    }

    e.target.src = this.urlTemplate
      .replace(/{{yyyy}}/g, previous.getFullYear())
      .replace(/{{mm}}/g, (previous.getMonth() + 1 <= 9 ? '0' : '') + (previous.getMonth() + 1))
      .replace(/{{dd}}/g, (previous.getDate() <= 9 ? '0' : '') + previous.getDate())
      .replace(/{{lab}}/g, this.labs[i]);

    console.log(`Trying: ${e.target.src}`);
  }

}

/**
 * Item row for prices
 */
class ItemRow {
  constructor(leagueIsActive, item) {
    this.leagueIsActive = leagueIsActive;
    this.item = item;

    this.sparkLineOptions = {
      pad_y: 2,
      width: 60,
      height: 30,
      radius: 0.2
    };

    // Build row elements
    let rowData = [
      this.buildNameField(),
      this.buildGemFields(),
      this.buildBaseFields(),
      this.buildMapFields(),
      this.buildSparkField(),
      this.buildPriceFields(),
      this.buildChangeField(),
      this.buildNowField(),
      this.buildDailyField(),
      this.buildTotalField()
    ].join('');

    this.row = `<tr value=${item.id}>${rowData}</tr>`;
  }

  buildNameField() {
    let color, type, variation, links, icon, name;

    // Use TLS for icons for that sweet, sweet secure site badge
    icon = this.item.icon.replace('http://', 'https://');

    // If item is base
    if (this.item.category === 'base') {
      // Shaper or elder
      if (this.item.baseIsShaper) {
        icon += '&shaper=1';
        color = 'item-shaper';
      } else if (this.item.baseIsElder) {
        icon += '&elder=1';
        color = 'item-elder';
      }
    } else color = '';

    // If color was not set and item is foil
    if (!color && this.item.frame === 9) {
      color = 'item-foil';
    }

    // If item is enchantment, insert enchant values to name
    if (this.item.category === 'enchantment') {
      name = this.item.name;

      // Min roll
      if (name.includes('#') && this.item.enchantMin !== undefined) {
        name = name.replace('#', `<span class='custom-text-green'>${this.item.enchantMin}</span>`);
      }

      // Max roll
      if (name.includes('#') && this.item.enchantMax !== undefined) {
        name = name.replace('#', `<span class='custom-text-green'>${this.item.enchantMax}</span>`);
      }
    }

    // If item has a base type
    if (this.item.type) {
      type = ` <span class='subtext-1'>${this.item.type}</span>`;
    } else type = '';

    // If item has links
    if (this.item.linkCount) {
      links = ` <span class='badge custom-badge-gray ml-1'>${this.item.linkCount} link</span>`;
    } else links = '';

    // If item has a variation
    if (this.item.variation) {
      variation = ` <span class='badge custom-badge-gray ml-1'>${this.item.variation}</span>`;
    } else variation = '';

    // Create the name container
    return `
    <td>
      <div class='d-flex align-items-center'>
        <div class='img-container img-container-sm text-center mr-1'><img src="${this.item.icon}"></div>
        <a class='cursor-pointer ${color}'>${name || this.item.name}${type}</a>${variation}${links}
      </div>
    </td>`.trim();
  }

  buildGemFields() {
    // Don't run if item is not a gem
    if (this.item.category !== 'gem') {
      return '';
    }

    let color, corrupted;

    if (this.item.gemIsCorrupted) {
      color = 'red';
      corrupted = '✓';
    } else {
      color = 'green';
      corrupted = '✕';
    }

    return `
    <td class='text-center p-0'>
        <span class='badge p-0 custom-text-gray-lo'>${this.item.gemLevel}</span>
    </td>
    <td class='text-center p-0'>
        <span class='badge p-0 custom-text-gray-lo'>${this.item.gemQuality}</span>
    </td>
    <td class='text-center p-0'>
        <span class='badge p-0 custom-text-${color}'>${corrupted}</span>
    </td>`.trim();
  }

  buildBaseFields() {
    // Don't run if item is not a base
    if (this.item.category !== 'base') {
      return '';
    }

    return `
    <td class='text-center p-0'>
      <span class='badge p-0 custom-text-gray-lo'>${this.item.baseItemLevel}</span>
    </td>`.trim();
  }

  buildMapFields() {
    // Don't run if item is not a map
    if (this.item.category !== 'map') {
      return '';
    }

    let tier;
    if (this.item.mapTier !== null) {
      tier = `<span class='badge p-0 custom-text-gray-lo'>${this.item.mapTier}</span>`;
    }

    return `<td class='text-center p-0'>${tier || ''}</td>`;
  }

  buildSparkField() {
    /**
     * Inner-function to stop execution halfway
     *
     * @param history Valid history array
     * @returns {null}
     */
    const buildSpark = history => {
      // If there is no history (eg old leagues)
      if (!history) {
        return null;
      }

      // Count the number of elements that are not null
      let count = 0;
      for (let i = 0; i < 7; i++) {
        if (history[i] !== null) {
          count++;
        }
      }

      // Can't display a sparkline with 1 value
      if (count < 2) {
        return null;
      }

      // Find first price from the left that is not null
      let lastPrice = null;
      for (let i = 0; i < 7; i++) {
        if (history[i] !== null) {
          lastPrice = history[i];
          break;
        }
      }

      // Calculate each value's change %-relation to current price
      let changes = [];
      for (let i = 0; i < 7; i++) {
        if (history[i] > 0) {
          changes[i] = Math.round((1 - (lastPrice / history[i])) * 100);
        }
      }

      // Generate sparkline html
      return ItemRow.genSparkSVG(this.sparkLineOptions, changes);
    }

    let spark = buildSpark(this.item.history);

    // Return as template
    return `<td class='d-none d-md-flex'>${spark || ''}</td>`;
  }

  buildPriceFields() {
    const chaos = ItemRow.roundPrice(this.item.mean);
    const exalt = ItemRow.roundPrice(this.item.exalted);
    const hideExalted = this.item.exalted < 1 ? 'd-none' : '';

    return `
    <td>
      <div class='pricebox badge p-0'>
        <span class='img-container img-container-xs text-center mr-1'>
          <img src="https://web.poecdn.com/image/Art/2DItems/Currency/CurrencyRerollRare.png?scale=1&w=1&h=1">
        </span>
        ${chaos}
      </div>
    </td>
    <td class='d-none d-md-flex'>
      <div class='pricebox badge p-0 ${hideExalted}'>
        <span class='img-container img-container-xs text-center mr-1'>
          <img src="https://web.poecdn.com/image/Art/2DItems/Currency/CurrencyAddModToRare.png?scale=1&w=1&h=1">
        </span>
        ${exalt}
      </div>
    </td>`.trim();
  }

  buildChangeField() {
    let change = Math.round(this.item.change);
    let color;

    // Limit it
    if (change > 999) change = 999;
    else if (change < -999) change = -999;

    // Pick a color scheme
    if (change >= 100) {
      color = 'green-ex';
    } else if (change <= -100) {
      color = 'red-ex';
    } else if (change >= 30) {
      color = 'green';
    } else if (change <= -30) {
      color = 'red';
    } else if (change >= 15) {
      color = 'green-lo';
    } else if (change <= -15) {
      color = 'red-lo';
    } else {
      color = 'gray-lo';
    }

    if (change > 0) {
      change = '+' + change;
    }

    return `
    <td class='text-center p-0'>
        <span class='badge p-0 custom-text-${color}'>${change}%</span>
    </td>`.trim();
  }

  buildNowField() {
    let color;

    if (this.leagueIsActive) {
      if (this.item.current >= 20) {
        color = 'gray-lo';
      } else if (this.item.current >= 10) {
        color = 'orange';
      } else if (this.item.current >= 5) {
        color = 'red';
      } else if (this.item.current >= 0) {
        color = 'red-ex';
      }
    } else {
      color = 'gray-lo';
    }

    return `
    <td class='text-center p-0'>
      <span class='badge p-0 custom-text-${color}'>
        ${this.item.current}
      </span>
    </td>`.trim();
  }

  buildDailyField() {
    let color;

    if (this.leagueIsActive) {
      if (this.item.daily >= 20) {
        color = 'gray-lo';
      } else if (this.item.daily >= 10) {
        color = 'orange';
      } else if (this.item.daily >= 5) {
        color = 'red';
      } else if (this.item.daily >= 0) {
        color = 'red-ex';
      }
    } else {
      color = 'gray-lo';
    }

    return `
    <td class='text-center p-0'>
      <span class='badge p-0 custom-text-${color}'>
        ${this.item.daily}
      </span>
    </td>`.trim();
  }

  buildTotalField() {
    return `
    <td class='text-center p-0'>
      <span class='badge p-0 custom-text-gray-lo'>
        ${this.item.total}
      </span>
    </td>`.trim();
  }

  static roundPrice(price) {
    const numberWithCommas = (x) => {
      let parts = x.toString().split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return parts.join('.');
    };

    return numberWithCommas(Math.round(price * 100) / 100);
  }

  static genSparkSVG(options, elements) {
    let maxElement = Math.max(...elements);
    let minElement = Math.min(...elements);

    // If there has been no change in the past week
    if (maxElement === minElement && minElement === 0) {
      maxElement = 1;
    }

    // Find step sizes in pixels
    let stepX = options.width / (elements.length - 1);
    let stepY = (options.height - options.pad_y * 2) / (maxElement - minElement);

    // Create point array
    let pointBuilder = ['M '];
    for (let i = 0; i < elements.length; i++) {
      if (elements[i] !== null) {
        let x = stepX * i;
        let y = (options.height - elements[i] * stepY + minElement * stepY - options.pad_y / 2).toFixed(3);

        pointBuilder.push(x, ' ', y, ' L ');
      }
    }

    // Remove trailing zero
    pointBuilder.pop();
    const points = ItemRow.roundSVGPathCorners(pointBuilder.join(''), options);

    return `
    <svg width="${options.width}" height="${options.height}" class="ct-chart-line">
      <g class="ct-series ct-series-a">
        <path d="${points}" class="ct-line" />
      </g>
    </svg>`.trim();
  }

  static roundSVGPathCorners(pathString, options) {
    function moveTowardsFractional(movingPoint, targetPoint, fraction) {
      return {
        x: parseFloat(movingPoint.x + (targetPoint.x - movingPoint.x) * fraction).toFixed(3),
        y: parseFloat(movingPoint.y + (targetPoint.y - movingPoint.y) * fraction).toFixed(3)
      };
    }

    // Adjusts the ending position of a command
    function adjustCommand(cmd, newPoint) {
      if (cmd.length > 2) {
        cmd[cmd.length - 2] = newPoint.x;
        cmd[cmd.length - 1] = newPoint.y;
      }
    }

    // Gives an {x, y} object for a command's ending position
    function pointForCommand(cmd) {
      return {
        x: parseFloat(cmd[cmd.length - 2]),
        y: parseFloat(cmd[cmd.length - 1]),
      };
    }

    // Split apart the path, handing concatonated letters and numbers
    var pathParts = pathString
      .split(/[,\s]/)
      .reduce(function (parts, part) {
        var match = part.match('([a-zA-Z])(.+)');
        if (match) {
          parts.push(match[1]);
          parts.push(match[2]);
        } else {
          parts.push(part);
        }

        return parts;
      }, []);

    // Group the commands with their arguments for easier handling
    var commands = pathParts.reduce(function (commands, part) {
      if (parseFloat(part) == part && commands.length) {
        commands[commands.length - 1].push(part);
      } else {
        commands.push([part]);
      }

      return commands;
    }, []);

    // The resulting commands, also grouped
    var resultCommands = [];

    if (commands.length > 1) {
      var startPoint = pointForCommand(commands[0]);

      // Handle the close path case with a "virtual" closing line
      var virtualCloseLine = null;
      if (commands[commands.length - 1][0] === 'Z' && commands[0].length > 2) {
        virtualCloseLine = ['L', startPoint.x, startPoint.y];
        commands[commands.length - 1] = virtualCloseLine;
      }

      // We always use the first command (but it may be mutated)
      resultCommands.push(commands[0]);

      for (var cmdIndex = 1; cmdIndex < commands.length; cmdIndex++) {
        var prevCmd = resultCommands[resultCommands.length - 1];

        var curCmd = commands[cmdIndex];

        // Handle closing case
        var nextCmd = (curCmd === virtualCloseLine)
          ? commands[1]
          : commands[cmdIndex + 1];

        // Nasty logic to decide if this path is a candidite.
        if (nextCmd && prevCmd && (prevCmd.length > 2) && curCmd[0] === 'L' && nextCmd.length > 2 && nextCmd[0] === 'L') {
          // Calc the points we're dealing with
          var prevPoint = pointForCommand(prevCmd);
          var curPoint = pointForCommand(curCmd);
          var nextPoint = pointForCommand(nextCmd);

          // The start and end of the cuve are just our point moved towards the previous and next points, respectivly
          var curveStart = moveTowardsFractional(curPoint, prevCmd.origPoint || prevPoint, options.radius);
          var curveEnd = moveTowardsFractional(curPoint, nextCmd.origPoint || nextPoint, options.radius);

          // Adjust the current command and add it
          adjustCommand(curCmd, curveStart);
          curCmd.origPoint = curPoint;
          resultCommands.push(curCmd);

          // The curve control points are halfway between the start/end of the curve and
          // the original point
          var startControl = moveTowardsFractional(curveStart, curPoint, .5);
          var endControl = moveTowardsFractional(curPoint, curveEnd, .5);

          // Create the curve
          var curveCmd = ['C', startControl.x, startControl.y, endControl.x, endControl.y, curveEnd.x, curveEnd.y];
          // Save the original point for fractional calculations
          curveCmd.origPoint = curPoint;
          resultCommands.push(curveCmd);
        } else {
          // Pass through commands that don't qualify
          resultCommands.push(curCmd);
        }
      }

      // Fix up the starting point and restore the close path if the path was orignally closed
      if (virtualCloseLine) {
        var newStartPoint = pointForCommand(resultCommands[resultCommands.length - 1]);
        resultCommands.push(['Z']);
        adjustCommand(resultCommands[0], newStartPoint);
      }
    } else {
      resultCommands = commands;
    }

    return resultCommands.reduce(function (str, c) {
      return str + c.join(' ') + ' ';
    }, '');
  }
}

/**
 * Item details modal for prices
 */
class DetailsModal {
  constructor(pricesPage) {
    this.pricesPage = pricesPage;
    this.chartOptions = {
      height: 250,
      showPoint: true,
      lineSmooth: true,
      axisX: {
        showGrid: true,
        showLabel: true,
        labelInterpolationFnc: (value, index) => (index % 7 === 0 ? value : null)
      },
      fullWidth: true,
      plugins: [
        Chartist.plugins.tooltip2({
          cssClass: 'chartist-tooltip',
          offset: {
            x: 0,
            y: -20,
          },
          template: '{{key}}: {{value}}',
          hideDelay: 500,
          valueTransformFunction: formatNum
        })
      ]
    };

    this.modal = $('#modal-details');

    // Contains all requested item data & history on current page
    this.dataSets = {};

    // Contains up to date league and item information
    this.current = {
      id: null,
      league: null,
      chart: null,
      dataset: 1
    };

    this.defineListeners();
  }

  defineListeners() {
    // League select listener
    $('#modal-leagues', this.modal).change(e => {
      this.current.league = e.target.value;
      this.getHistory();
    });

    // Dataset radio listener
    $('#modal-radio', this.modal).change(e => {
      const val = $('input[name=dataset]:checked', this).val();
      this.current.dataset = parseInt(val);
      this.updateContent();
    });
  }

  resetData() {
    // Clear leagues from selector
    $('#modal-leagues', this.modal).find('option').remove();

    // Dataset selection
    let $radios = $('#modal-radio').children();
    $radios.prop('checked', false).removeClass('active');
    $radios.first().prop('checked', true).addClass('active');

    this.current = {
      id: null,
      league: null,
      chart: null,
      dataset: 1
    }
  }

  onRowClick(event) {
    if (event.target.localName !== 'a') {
      return;
    }

    const target = $(event.target.closest('tr'));
    const id = parseInt(target.attr('value'));

    // If user clicked on a different row
    if (!id) {
      return;
    }

    // Reset anything left by previous modal
    this.resetData();

    this.current.id = id;
    console.log(`Clicked on row id: ${this.current.id}`);

    // Show buffer and hide content
    this.setBufferVisibility(true);

    // Load history data
    if (this.current.id in this.dataSets) {
      console.log('History source: local');
      this.setContent();
    } else {
      console.log('History source: remote');

      let request = $.ajax({
        url: `${PAGE_DATA.apiUrl}/item`,
        data: {id: this.current.id},
        type: 'GET',
        async: true,
        dataTypes: 'json'
      });

      request.done(payload => {
        this.dataSets[this.current.id] = payload;
        this.setContent();
      });
    }

    // Find item entry from initial get request
    let item = null;
    for (let i = 0; i < this.pricesPage.items.length; i++) {
      if (this.pricesPage.items[i].id === this.current.id) {
        item = this.pricesPage.items[i];
        break;
      }
    }

    // Set modal's icon and name while request might still be processing
    $('#modal-icon', this.modal).attr("src", item.icon);
    $('#modal-name', this.modal).html(DetailsModal.buildNameField(item));

    // Open the modal
    this.modal.modal('show');
  }

  setContent() {
    // Get item user clicked on
    let item = this.dataSets[this.current.id];

    // Get list of leagues for the item
    let leagues = DetailsModal.getLeagues(item);
    this.current.league = leagues[0].name;

    // Add leagues as dropdown options
    this.createLeagueSelector(leagues);

    // Get history data for the current league
    this.getHistory();

    // Hide buffer and show content
    this.setBufferVisibility(false);
  }

  /**
   * Requests history data for current league or gets it from memory
   */
  getHistory() {
    // Check if the data already exists
    if (this.checkLeagueHistoryExists()) {
      console.log('History from local');
      this.updateContent();
      return;
    }

    // Prep request
    let request = $.ajax({
      url: `${PAGE_DATA.apiUrl}/itemhistory`,
      data: {
        league: this.current.league,
        id: this.current.id
      },
      type: 'GET',
      async: true,
      dataTypes: 'json'
    });

    request.done(payload => {
      // Find associated league
      let league = this.getCurrentItemLeague();

      league.history = payload;
      this.updateContent();
    });
  }

  /**
   * Updates the modal data (names/prices/charts)
   */
  updateContent() {
    let league = this.getCurrentItemLeague();
    let currentFormatHistory = DetailsModal.formatHistory(league);

    let data = {
      labels: currentFormatHistory.keys,
      series: []
    };

    switch (this.current.dataset) {
      case 1:
        data.series[0] = currentFormatHistory.vals.mean;
        break;
      case 2:
        data.series[0] = currentFormatHistory.vals.median;
        break;
      case 3:
        data.series[0] = currentFormatHistory.vals.mode;
        break;
      case 4:
        data.series[0] = currentFormatHistory.vals.daily;
        break;
      case 5:
        data.series[0] = currentFormatHistory.vals.current;
        break;
    }

    this.current.chart = new Chartist.Line('.ct-chart', data, this.chartOptions);

    // Update modal table
    $('#modal-mean', this.modal).html(formatNum(league.mean));
    $('#modal-median', this.modal).html(formatNum(league.median));
    $('#modal-mode', this.modal).html(formatNum(league.mode));
    $('#modal-total', this.modal).html(formatNum(league.total));
    $('#modal-daily', this.modal).html(formatNum(league.daily));
    $('#modal-current', this.modal).html(formatNum(league.current));
    $('#modal-exalted', this.modal).html(formatNum(league.exalted));
  }

  setBufferVisibility(visible) {
    if (visible) {
      $('#modal-body-buffer', this.modal).removeClass('d-none').addClass('d-flex');
      $('#modal-body-content', this.modal).addClass('d-none').removeClass('d-flex');
    } else {
      $('#modal-body-buffer', this.modal).addClass('d-none').removeClass('d-flex');
      $('#modal-body-content', this.modal).removeClass('d-none').addClass('d-flex');
    }
  }

  /**
   * Builds league selector options for the modal
   *
   * @param leagues List of current leagues for the item
   */
  createLeagueSelector(leagues) {
    let builder = '';

    // Loop through all leagues
    for (let i = 0; i < leagues.length; i++) {
      let display = leagues[i].display ? leagues[i].display : leagues[i].name;

      if (!leagues[i].active) {
        display = '● ' + display;
      }

      builder += `<option value='${leagues[i].name}'>${display}</option>`;
    }

    // Add to dropdown
    $('#modal-leagues', this.modal).html(builder);
  }

  /**
   * Creates a formatted card title for the modal
   *
   * @param item Item JSON
   * @returns {string} Generated HTML
   */
  static buildNameField(item) {
    // If item is enchantment, insert enchant values for display purposes
    if (item.category === 'enchantment') {
      // Min roll
      if (item.name.includes('#') && item.enchantMin !== null) {
        item.name = item.name.replace('#', item.enchantMin);
      }

      // Max roll
      if (item.name.includes('#') && item.enchantMax !== null) {
        item.name = item.name.replace('#', item.enchantMax);
      }
    }

    // Begin builder
    let builder = item.name;

    if (item.type) {
      builder += `<span class='subtext-1'>, ${item.type}</span>`;
    }

    if (item.frame === 9) {
      builder = `<span class='item-foil'>${builder}</span>`;
    } else if (item.category === 'base') {
      if (item.baseIsShaper) {
        builder = `<span class='item-shaper'>${builder}</span>`;
      } else if (item.baseIsElder) {
        builder = `<span class='item-elder'>${builder}</span>`;
      }
    }

    if (item.variation) {
      builder += ` <span class='badge custom-badge-gray ml-1'>${item.variation}</span>`;
    }

    if (item.category === 'map' && item.mapTier) {
      builder += ` <span class='badge custom-badge-gray ml-1'>Tier ${item.mapTier}</span>`;
    }

    if (item.baseItemLevel) {
      builder += ` <span class='badge custom-badge-gray ml-1'>iLvl ${item.baseItemLevel}</span>`;
    }

    if (item.linkCount) {
      builder += ` <span class='badge custom-badge-gray ml-1'>${item.linkCount} Link</span>`;
    }

    if (item.category === 'gem') {
      builder += `<span class='badge custom-badge-gray ml-1'>Lvl ${item.gemLevel}</span>`;
      builder += `<span class='badge custom-badge-gray ml-1'>${item.gemQuality} quality</span>`;

      if (item.gemIsCorrupted) {
        builder += "<span class='badge custom-badge-red ml-1'>Corrupted</span>";
      }
    }

    return builder;
  }

  /**
   * Given the complete item JSON, returns list of leagues for that item
   *
   * @param item Item JSON
   * @returns {Array} Leagues for that item
   */
  static getLeagues(item) {
    let leagues = [];

    for (let i = 0; i < item.leagues.length; i++) {
      leagues.push({
        name: item.leagues[i].name,
        display: item.leagues[i].display,
        active: item.leagues[i].active
      });
    }

    return leagues;
  }

  /**
   * Right, so the input data is essentially JSON objects of date and prices.
   * But the data we need for the graphs should meet a couple conditions:
   *  1. If league has lasted n days (out of total m days), then the last
   *     m-n entries should be null
   *  2. If there is missing data from the start of the league, it should be
   *     padded with nulls
   *  2. If there are gaps in the data (missing days), it should be padded
   *     with nulls
   *  3. If there is missing data after the league has ended, it should be
   *     padded with nulls
   */
  static formatHistory(league) {
    let keys = [];
    let vals = {
      mean: [],
      median: [],
      mode: [],
      daily: [],
      current: [],
    };

    const msInDay = 86400000;
    let firstDate = null, lastDate = null;
    let totalDays = null, elapDays = null;
    let startDate = null, endDate = null;
    let daysMissingStart = 0, daysMissingEnd = 0;
    let startEmptyPadding = 0;

    // If there are any history entries for this league, find the first and last date
    if (league.history.length) {
      firstDate = new Date(league.history[0].time);
      lastDate = new Date(league.history[league.history.length - 1].time);
    }

    // League should always have a start date
    if (league.start) {
      startDate = new Date(league.start);
    }

    // Permanent leagues don't have an end date
    if (league.end) {
      endDate = new Date(league.end);
    }

    // Find duration for non-permanent leagues
    if (startDate && endDate) {
      let diff = Math.abs(endDate.getTime() - startDate.getTime());
      totalDays = Math.floor(diff / msInDay);

      if (league.active) {
        let diff = Math.abs(new Date().getTime() - startDate.getTime());
        elapDays = Math.floor(diff / msInDay);
      } else {
        elapDays = totalDays;
      }
    }

    // Find how many days worth of data is missing from the league start
    if (league.id > 2) {
      if (firstDate && startDate) {
        let diff = Math.abs(firstDate.getTime() - startDate.getTime());
        daysMissingStart = Math.floor(diff / msInDay);
      }
    }

    // Find how many days worth of data is missing from the league end, if league has ended
    if (league.active) {
      // League is active, compare time of last entry to right now
      if (lastDate) {
        let diff = Math.abs(new Date().getTime() - lastDate.getTime());
        daysMissingEnd = Math.floor(diff / msInDay);
      }
    } else {
      // League has ended, compare time of last entry to time of league end
      if (lastDate && endDate) {
        let diff = Math.abs(lastDate.getTime() - endDate.getTime());
        daysMissingEnd = Math.floor(diff / msInDay);
      }
    }

    // Find number of ticks the graph should be padded with empty entries on the left
    if (league.id > 2) {
      if (totalDays !== null && elapDays !== null) {
        startEmptyPadding = totalDays - elapDays;
      }
    } else {
      startEmptyPadding = 120 - league.history.length;
    }


    // Right, now that we have all the dates, durations and counts we can start
    // building the actual payload


    // Bloat using 'null's the amount of days that should not have a tooltip
    if (startEmptyPadding) {
      for (let i = 0; i < startEmptyPadding; i++) {
        vals.mean.push(null);
        vals.median.push(null);
        vals.mode.push(null);
        vals.daily.push(null);
        vals.current.push(null);
        keys.push('');
      }
    }

    // If entries are missing before the first entry, fill with "No data"
    if (daysMissingStart) {
      let date = new Date(startDate);

      for (let i = 0; i < daysMissingStart; i++) {
        vals.mean.push(0);
        vals.median.push(0);
        vals.mode.push(0);
        vals.daily.push(0);
        vals.current.push(0);
        keys.push(DetailsModal.formatDate(date.addDays(i)));
      }
    }

    // Add actual history data
    for (let i = 0; i < league.history.length; i++) {
      const entry = league.history[i];

      // Add current entry values
      vals.mean.push(Math.round(entry.mean * 100) / 100);
      vals.median.push(Math.round(entry.median * 100) / 100);
      vals.mode.push(Math.round(entry.mode * 100) / 100);
      vals.daily.push(entry.daily);
      vals.current.push(entry.current);
      keys.push(DetailsModal.formatDate(entry.time));

      // Check if there are any missing entries between the current one and the next one
      if (i + 1 < league.history.length) {
        const nextEntry = league.history[i + 1];

        // Get dates
        let currentDate = new Date(entry.time);
        let nextDate = new Date(nextEntry.time);

        // Get difference in days between entries
        let timeDiff = Math.abs(nextDate.getTime() - currentDate.getTime());
        let diffDays = Math.floor(timeDiff / (1000 * 3600 * 24)) - 1;

        // Fill missing days with "No data" (if any)
        for (let i = 0; i < diffDays; i++) {
          vals.mean.push(0);
          vals.median.push(0);
          vals.mode.push(0);
          vals.daily.push(0);
          vals.current.push(0);
          keys.push(DetailsModal.formatDate(currentDate.addDays(i + 1)));
        }
      }
    }

    // If entries are missing after the first entry, fill with "No data"
    if (daysMissingEnd && lastDate) {
      let date = new Date(lastDate);
      date.setDate(date.getDate() + 1);

      for (let i = 0; i < daysMissingEnd; i++) {
        vals.mean.push(0);
        vals.median.push(0);
        vals.mode.push(0);
        vals.daily.push(0);
        vals.current.push(0);
        keys.push(DetailsModal.formatDate(date.addDays(i)));
      }
    }

    // Add current values
    if (league.active) {
      vals.mean.push(Math.round(league.mean * 100) / 100);
      vals.median.push(Math.round(league.median * 100) / 100);
      vals.mode.push(Math.round(league.mode * 100) / 100);
      vals.daily.push(league.daily);
      vals.current.push(league.current);
      keys.push('Now');
    }

    // Return generated data
    return {
      'keys': keys,
      'vals': vals
    }
  }

  /**
   * Given a date, returns a display string
   */
  static formatDate(date) {
    const MONTH_NAMES = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    let s = new Date(date);

    return `${s.getDate()} ${MONTH_NAMES[s.getMonth()]}`;
  }

  /**
   * Returns the current league object of the current item
   *
   * @returns {null|*} League object or null if does not exist
   */
  getCurrentItemLeague() {
    let item = this.dataSets[this.current.id];

    for (let i = 0; i < item.leagues.length; i++) {
      if (item.leagues[i].name === this.current.league) {
        return item.leagues[i];
      }
    }

    return null;
  }

  /**
   * Check whether a specific league's data has been downloaded for the current item
   *
   * @returns {boolean} True if exists, false if not
   */
  checkLeagueHistoryExists() {
    const leagues = this.dataSets[this.current.id].leagues;

    for (let i = 0; i < leagues.length; i++) {
      if (leagues[i].name === this.current.league && leagues[i].history !== undefined) {
        return true;
      }
    }

    return false;
  }
}

/**
 * Logic for prices
 */
class PricesPage {
  constructor() {
    // Default item search filter options
    this.filter = {
      league: {
        'name': 'Standard',
        'display': 'Standard',
        'active': 1
      },
      category: 'currency',
      group: 'all',
      showLowConfidence: false,
      links: null,
      rarity: null,
      tier: null,
      search: null,
      gemLvl: null,
      gemQuality: null,
      gemCorrupted: null,
      ilvl: null,
      influence: null,
      parseAmount: 150
    };

    // List of items displayed on the current page
    this.items = [];
    // Singular modal to display item specifics on
    this.modal = new DetailsModal(this);


    // Define sort functions for this page
    const sortFunctions = {
      change: {
        ascending: (a, b) => {
          if (a.change < b.change) return -1;
          if (a.change > b.change) return 1;
          return 0;
        },
        descending: (a, b) => {
          if (a.change > b.change) return -1;
          if (a.change < b.change) return 1;
          return 0;
        }
      },
      now: {
        ascending: (a, b) => {
          if (a.current < b.current) return -1;
          if (a.current > b.current) return 1;
          return 0;
        },
        descending: (a, b) => {
          if (a.current > b.current) return -1;
          if (a.current < b.current) return 1;
          return 0;
        }
      },
      daily: {
        ascending: (a, b) => {
          if (a.daily < b.daily) return -1;
          if (a.daily > b.daily) return 1;
          return 0;
        },
        descending: (a, b) => {
          if (a.daily > b.daily) return -1;
          if (a.daily < b.daily) return 1;
          return 0;
        }
      },
      total: {
        ascending: (a, b) => {
          if (a.total < b.total) return -1;
          if (a.total > b.total) return 1;
          return 0;
        },
        descending: (a, b) => {
          if (a.total > b.total) return -1;
          if (a.total < b.total) return 1;
          return 0;
        }
      },
      item: {
        ascending: (a, b) => {
          if (a.name < b.name) return -1;
          if (a.name > b.name) return 1;
          return 0;
        },
        descending: (a, b) => {
          if (a.name > b.name) return -1;
          if (a.name < b.name) return 1;
          return 0;
        }
      },
      default: {
        ascending: (a, b) => {
          if (a.mean < b.mean) return -1;
          if (a.mean > b.mean) return 1;
          return 0;
        },
        descending: (a, b) => {
          if (a.mean > b.mean) return -1;
          if (a.mean < b.mean) return 1;
          return 0;
        }
      }
    };
    // Create a sorter for the page
    this.sorter = new Sorter(sortFunctions, this.sortResults);

    // Overwrite standard league with current challenge league
    this.filter.league = SERVICE_leagues[0];


    this.parseQueryParams();
    this.defineListeners();
    this.makeGetRequest();
  }


  /**
   * Loads and processes query parameters on initial page load
   */
  parseQueryParams() {
    // All defined query parameters
    const params = [
      'league',
      'category',
      'group',
      'search',
      'confidence',
      'rarity',
      'links',
      'tier',
      'corrupted',
      'lvl',
      'quality',
      'ilvl',
      'influence'
    ];

    // Get and process values for all query parameters
    params.forEach(a => this.processParam(a));

    // Overwrite league query param to fix capitalization
    this.updateQueryParam('league', this.filter.league.name);
  }

  /**
   * Collection of parse actions for each defined query parameter
   *
   * @param param Valid query parameter
   */
  processParam(param) {
    const val = QueryAccessor.parseQueryParam(param);
    if (val === null) return;

    switch (param) {
      case 'league': {
        // Get data associated with the league
        this.filter.league = SERVICE_leagues.find(league => league.name === val);
        // Set selector value
        $('#search-league').val(this.filter.league.name);

        break;
      }
      case 'category': {
        this.filter.category = val;
        break;
      }
      case 'group': {
        $('#search-group').val(val);
        this.filter.group = val;

        break;
      }
      case 'search': {
        $('#search-searchbar').val(val);
        this.filter.search = val;

        break;
      }

      case 'confidence': {
        $(`#radio-confidence input[value='true']`).click();
        this.filter.showLowConfidence = true;

        break;
      }
      case 'rarity': {
        $(`#radio-rarity input[value="${val}"]`).click();

        if (val === 'unique') {
          this.filter.rarity = 3;
        } else if (val === 'relic') {
          this.filter.rarity = 9;
        }

        break;
      }
      case 'links': {
        $(`#radio-links input[value="${val}"]`).click();

        if (val === 'all') {
          this.filter.links = -1;
        } else {
          this.filter.links = parseInt(val);
        }

        break;
      }
      case 'tier': {
        $('#select-tier').val(val);

        if (val === 'none') {
          this.filter.tier = 0;
        } else {
          this.filter.tier = parseInt(val);
        }

        break;
      }
      case 'corrupted': {
        $(`#radio-corrupted input[value='${val}']`).click();
        this.filter.gemCorrupted = (val === 'true');

        break;
      }
      case 'lvl': {
        $('#select-level').val(val);
        this.filter.gemLvl = parseInt(val);
        break;
      }
      case 'quality': {
        $('#select-quality').val(val);
        this.filter.gemQuality = parseInt(val);
        break;
      }
      case 'ilvl': {
        $('#select-ilvl').val(val);
        this.filter.ilvl = parseInt(val);
        break;
      }
      case 'influence': {
        $('#select-influence').val(val);
        this.filter.influence = val;
        break;
      }
        break;
      default:
        break;
    }
  }

  updateQueryParam(key, value) {
    switch (key) {
      case 'confidence':
        value = value === false ? null : value;
        break;
      case 'search':
        value = value === '' ? null : value;
        break;
      case 'rarity':
      case 'corrupted':
      case 'quality':
      case 'lvl':
      case 'group':
      case 'tier':
      case 'influence':
        value = value === 'all' ? null : value;
        break;
      case 'links':
        value = value === 'none' ? null : value;
        break;
    }

    QueryAccessor.updateQueryParam(key, value);
  }

  /**
   * Creates event listeners for various elements on the site
   */
  defineListeners() {
    $('#search-league').on('change', e => this.genericListener(this, e));
    $('#search-group').on('change', e => this.genericListener(this, e));
    $('#button-showAll').on('click', e => this.genericListener(this, e));
    $('#search-searchbar').on('input', e => this.genericListener(this, e));
    $('#radio-confidence').on('change', e => this.genericListener(this, e));
    $('#radio-rarity').on('change', e => this.genericListener(this, e));
    $('#radio-links').on('change', e => this.genericListener(this, e));
    $('#select-tier').on('change', e => this.genericListener(this, e));
    $('#select-level').on('change', e => this.genericListener(this, e));
    $('#select-quality').on('change', e => this.genericListener(this, e));
    $('#radio-corrupted').on('change', e => this.genericListener(this, e));
    $('#select-ilvl').on('change', e => this.genericListener(this, e));
    $('#select-influence').on('change', e => this.genericListener(this, e));

    // Model display
    $('#searchResults').on('click', e => this.modal.onRowClick(e));
    // Sort by columns
    $('.sort-column').on('click', this.sorter.sortCallback);
  }

  /**
   * Handles most common events
   *
   * @param self
   * @param e Event data
   */
  genericListener(self, e) {
    switch (e.currentTarget.id) {
      case 'search-league': {
        QueryAccessor.updateQueryParam('league', e.target.value);

        // Get data associated with the league
        const leagueData = SERVICE_leagues.find(league => league.name === e.target.value);
        if (leagueData) {
          self.filter.league = leagueData;
          console.log(`Selected league: ${self.filter.league.name}`);

          self.makeGetRequest();
        }

        // No need to sort here
        return;
      }
      case 'search-group': {
        QueryAccessor.updateQueryParam('group', self.filter.group);

        self.filter.group = e.target.value;
        console.log(`Selected group: ${self.filter.group}`);

        break;
      }
      case 'button-showAll': {
        console.log('Button press: show all');

        $(e.target).addClass('d-none');
        self.filter.parseAmount = -1;

        break;
      }
      case 'search-searchbar': {
        QueryAccessor.updateQueryParam('search', self.filter.search);

        self.filter.search = e.target.value.toLowerCase().trim();
        console.log(`Search: ${self.filter.search}`);

        break;
      }
      case 'radio-confidence': {
        self.filter.showLowConfidence = (e.target.value === 'true');
        QueryAccessor.updateQueryParam('confidence', self.filter.showLowConfidence);

        console.log(`Show low daily: ${self.filter.showLowConfidence}`);

        break;
      }
      case 'radio-rarity': {
        console.log(`Rarity filter: ${e.target.value}`);
        QueryAccessor.updateQueryParam('rarity', e.target.value);

        switch (e.target.value) {
          case 'all':
            self.filter.rarity = null;
            break;
          case 'unique':
            self.filter.rarity = 3;
            break;
          case 'relic':
            self.filter.rarity = 9;
            break;
          default:
            self.filter.rarity = null;
            break;
        }

        break;
      }
      case 'radio-links': {
        QueryAccessor.updateQueryParam('links', e.target.value);
        console.log(`Link filter: ${e.target.value}`);

        switch (e.target.value) {
          case 'none':
            self.filter.links = null;
            break;
          case 'all':
            self.filter.links = -1;
            break;
          default:
            self.filter.links = parseInt(e.target.value);
            break;
        }

        break;
      }
      case 'select-tier': {
        QueryAccessor.updateQueryParam('tier', e.target.value);
        console.log(`Map tier filter: ${e.target.value}`);

        switch (e.target.value) {
          case 'all':
            self.filter.tier = null;
            break;
          case 'none':
            self.filter.tier = 0;
            break;
          default:
            self.filter.tier = parseInt(e.target.value);
            break;
        }

        break;
      }
      case 'select-level': {
        QueryAccessor.updateQueryParam('lvl', e.target.value);
        console.log(`Gem lvl filter: ${e.target.value}`);

        if (e.target.value === 'all') {
          self.filter.gemLvl = null;
        } else {
          self.filter.gemLvl = parseInt(e.target.value);
        }

        break;
      }
      case 'select-quality': {
        QueryAccessor.updateQueryParam('quality', e.target.value);
        console.log(`Gem quality filter: ${e.target.value}`);

        if (e.target.value === 'all') {
          self.filter.gemQuality = null;
        } else {
          self.filter.gemQuality = parseInt(e.target.value);
        }

        break;
      }
      case 'radio-corrupted': {
        QueryAccessor.updateQueryParam('corrupted', e.target.value);
        console.log(`Gem corruption filter: ${e.target.value}`);

        if (e.target.value === 'all') {
          self.filter.gemCorrupted = null;
        } else {
          self.filter.gemCorrupted = (e.target.value === 'true');
        }

        break;
      }
      case 'select-ilvl': {
        QueryAccessor.updateQueryParam('ilvl', e.target.value);
        console.log(`Base iLvl filter: ${e.target.value}`);

        if (e.target.value === 'all') {
          self.filter.ilvl = null;
        } else {
          self.filter.ilvl = parseInt(e.target.value);
        }

        break;
      }
      case 'select-influence': {
        QueryAccessor.updateQueryParam('influence', e.target.value);
        console.log(`Influence filter: ${e.target.value}`);

        if (e.target.value === 'all') {
          self.filter.influence = null;
        } else {
          self.filter.influence = e.target.value;
        }

        break;
      }
    }

    self.sortResults();
  }

  /**
   * Get api request
   */
  makeGetRequest() {
    // Empty previous data
    $('#searchResults tbody').empty();
    $('#buffering-main').show();
    $('#button-showAll').addClass('d-none');
    // Hide status message
    $('.buffering-msg').remove();
    // Clear current items
    this.items = [];

    const request = $.ajax({
      url: `${PAGE_DATA.apiUrl}/get`,
      data: {
        league: this.filter.league.name,
        category: this.filter.category
      },
      type: 'GET',
      async: true,
      dataTypes: 'json'
    });

    request.done(json => {
      console.log(`Got ${json.length} items from request`);

      $('#buffering-main').hide();
      $('.buffering-msg').remove();

      this.items = json;
      this.sortResults();
    });

    request.fail(response => {
      $('.buffering-msg').remove();

      let buffering = $('#buffering-main');
      buffering.hide();

      let msg;
      if (response.status) {
        msg = `<div class='buffering-msg align-self-center mb-2'>${response.responseJSON.error}</div>`;
      } else {
        msg = '<div class=\'buffering-msg align-self-center mb-2\'>Too many requests, please wait a bit</div>';
      }

      buffering.after(msg);
    });
  }


  sortResults() {
    // Empty the table
    let table = $('#searchResults');
    $('tbody', table).empty();

    let count = 0, matches = 0;

    if (this.sorter.sortFunction) {
      this.items.sort(this.sorter.sortFunction);
    }

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];

      // Skip parsing if item should be hidden according to filters
      if (this.checkHideItem(item)) {
        continue;
      }

      matches++;

      // Stop if specified item limit has been reached
      if (this.filter.parseAmount < 0 || count < this.filter.parseAmount) {
        // If item has not been parsed, parse it
        if (!item.tableData) {
          item.tableData = new ItemRow(this.filter.league.active, item);
        }

        // Append generated table data to buffer
        table.append(item.tableData.row);
        count++;
      }
    }

    $('.buffering-msg').remove();

    if (count < 1) {
      let msg = `<div class='buffering-msg align-self-center mb-2'>No results</div>`;
      $('#buffering-main').after(msg);
    }

    let loadAllBtn = $('#button-showAll');
    if (this.filter.parseAmount > 0 && matches > this.filter.parseAmount) {
      loadAllBtn.text(`Show all (${matches - this.filter.parseAmount} items)`);
      loadAllBtn.removeClass('d-none');
    } else {
      loadAllBtn.addClass('d-none');
    }
  }

  /**
   * Check whether or not to hide items when searching
   *
   * @param item Get api item entry
   * @returns {boolean} True if hidden, false if not
   */
  checkHideItem(item) {
    // Hide low confidence items
    if (!this.filter.showLowConfidence && this.filter.league.active && item.daily < 5) {
      return true;
    }

    // String search
    if (this.filter.search) {
      if (item.name.toLowerCase().indexOf(this.filter.search) === -1) {
        if (item.type) {
          if (item.type.toLowerCase().indexOf(this.filter.search) === -1) {
            return true;
          }
        } else {
          return true;
        }
      }
    }

    // Hide groups
    if (this.filter.group !== 'all' && this.filter.group !== item.group) {
      return true;
    }

    // Hide mismatching rarities
    if (this.filter.rarity) {
      if (this.filter.rarity !== item.frame) {
        return true;
      }
    }

    // Hide items with different links
    if (this.filter.links === null) {
      if (item.linkCount !== undefined) {
        return true;
      }
    } else if (this.filter.links > 0) {
      if (item.linkCount !== this.filter.links) {
        return true;
      }
    }

    // Sort gems, I guess
    if (this.filter.category === 'gem' && item.category === 'gem') {
      if (this.filter.gemLvl !== null && item.gemLevel !== this.filter.gemLvl) return true;
      if (this.filter.gemQuality !== null && item.gemQuality !== this.filter.gemQuality) return true;
      if (this.filter.gemCorrupted !== null && item.gemIsCorrupted !== this.filter.gemCorrupted) return true;

    } else if (this.filter.category === 'map' && item.category === 'map') {
      if (this.filter.tier !== null) {
        if (this.filter.tier === 0) {
          if (item.mapTier !== null) return true;
        } else if (item.mapTier !== this.filter.tier) return true;
      }

    } else if (this.filter.category === 'base' && item.category === 'base') {
      // Check base influence
      if (this.filter.influence !== null) {
        if (this.filter.influence === 'none') {
          if (item.baseIsShaper || item.baseIsElder) return true;
        } else if (this.filter.influence === 'either') {
          if (!item.baseIsShaper && !item.baseIsElder) return true;
        } else if (this.filter.influence === 'shaper' && !item.baseIsShaper) {
          return true;
        } else if (this.filter.influence === 'elder' && !item.baseIsElder) {
          return true;
        }
      }

      // Check base ilvl
      if (item.baseItemLevel !== null && this.filter.ilvl !== null) {
        if (item.baseItemLevel !== this.filter.ilvl) {
          return true;
        }
      }
    }

    return false;
  }
}

