const brightbeam = {
  websites: {},
  dataGatheredSince: null,
  numFirstParties: 0,
  numThirdParties: 0,
  transformedData: null,
  trackerStore: null,
  trackerCache: [],
  sigma: null,

  async init() {
    await this.loadTrackers();
    this.renderGraph();
    this.addListeners();
    this.toggleUnrecognised();
    this.updateVars();
  },

  async loadTrackers() {
    let self = this;
    return new Promise(function (resolve, reject) {
      let xhr = new XMLHttpRequest();
      xhr.open('GET', 'trackers.json');
      xhr.onload = function () {
        const data = JSON.parse(xhr.responseText);
        self.trackerStore = data["bugs"];
        resolve();
      };
      xhr.send();
    });
  },

  resolveTracker(hostname) {
    hostname = hostname.replace(/^www\./, '');
    if(hostname in this.trackerCache) {
      return this.trackerCache[hostname];
    }

    for(index in this.trackerStore) {
      let tracker = this.trackerStore[index];
      let matcher = new RegExp(tracker['pattern']);
      if(hostname.match(matcher)) {
        this.trackerCache[hostname] = tracker;
        return tracker;
      }
    }

    return null;
  },

  getTrackers() {
    return self.trackerStore;
  },

  renderGraph() {
//    viz.init(this.transformedData.nodes, this.transformedData.links);
  },
  
  stopRenderingGraph() {
  },

  async toggleUnrecognised() {
    const toggleCheckbox = document.getElementById('unrecognised-control');
    let self = this;
    toggleCheckbox.addEventListener('change', async () => {
      Array.prototype.forEach.call(document.getElementsByClassName('unrecognised'), function (item) {
        if(toggleCheckbox.checked) {
          item.classList.remove('hidden');
        } else {
          item.classList.add('hidden');
        }
      });

      if(!document.getElementById('vis-graph').classList.contains('hidden')) {
        await self.loadGraphView();
      }
    });
  },

  addListeners() {
    this.downloadJSONData();
    this.downloadGDFData();
    this.downloadCSVData();
    this.resetData();
    this.showGraphView();
    this.showListView();
    this.loadListView();
    storeChild.onUpdate((data) => {
      this.redraw(data);
      this.loadListView();
    });
  },

  // Called from init() (isFirstParty = undefined)
  // and redraw() (isFirstParty = true or false).
  async updateVars(isFirstParty) {

    // initialize dynamic vars from storage
    if (!this.dataGatheredSince) {
      const { dateStr, fullDateTime } = await this.getDataGatheredSince();
      if (!dateStr) {
        return;
      }
      this.dataGatheredSince = dateStr;
      const dataGatheredSinceElement
        = document.getElementById('data-gathered-since');
      dataGatheredSinceElement.textContent = this.dataGatheredSince || '';
      dataGatheredSinceElement.setAttribute('datetime', fullDateTime || '');
    }
    if (isFirstParty === undefined) {
      this.numFirstParties = await this.getNumFirstParties();
      this.setPartyVar('firstParty');
      this.numThirdParties = await this.getNumThirdParties();
      this.setPartyVar('thirdParty');
      return;
    }

    // update on redraw
    if (isFirstParty) {
      this.numFirstParties++;
      this.setPartyVar('firstParty');
    } else {
      this.numThirdParties++;
      this.setPartyVar('thirdParty');
    }
  },

  // Updates dynamic variable values in the page
  setPartyVar(party) {
    const numFirstPartiesElement = document.getElementById('num-first-parties');
    const numThirdPartiesElement = document.getElementById('num-third-parties');
    if (party === 'firstParty') {
      if (this.numFirstParties === 0) {
        numFirstPartiesElement.textContent = '';
      } else {
        numFirstPartiesElement.textContent = `${this.numFirstParties} Sites`;
      }
    } else if (this.numThirdParties === 0) {
      numThirdPartiesElement.textContent = '';
    } else {
      const str = `${this.numThirdParties} Third Party Sites`;
      numThirdPartiesElement.textContent = str;
    }
  },

  async getDataGatheredSince() {
    const firstRequestUnixTime = await storeChild.getFirstRequestTime();
    if (!firstRequestUnixTime) {
      return {};
    }
    // reformat unix time
    let fullDateTime = new Date(firstRequestUnixTime);
    let dateStr = fullDateTime.toDateString();
    // remove day of the week
    const dateArr = dateStr.split(' ');
    dateArr.shift();
    dateStr = dateArr.join(' ');
    // ISO string used for datetime attribute on <time>
    fullDateTime = fullDateTime.toISOString();
    return {
      dateStr,
      fullDateTime
    };
  },

  async getNumFirstParties() {
    return await storeChild.getNumFirstParties();
  },

  async getNumThirdParties() {
    return await storeChild.getNumThirdParties();
  },


  async getNetwork() {
    const data = await storeChild.getAll();
    let network = {nodes: [], edges: []};
    let showUnrecognised = document.getElementById('unrecognised-control').checked;
    let allSeenTrackerIDs = [];
    let sourceIDs = [];
    let edge_index = 0;
    for(let site in data) {
      if (!data[site].firstParty) {
        continue;
      }
      network.nodes.push({
        id: '' + site,
        label: site,
        tracker_type: 'source',
        tracker_id: -1,
        company_id: -1,
        x: Math.random() * 20,
        y: Math.random() * 20,
        size: 1,
        color: '#FFF'
      });
      sourceIDs.push(site);
    }
    for(let site in data) {
      let seenTrackerIDs = sourceIDs.slice();
      for(let index in data[site]['requestedTrackerURLs']) {
        let trackerURL = data[site]['requestedTrackerURLs'][index].replace(/^https?:\/\//, '').replace(/^www\./, '');
        let trackerHostname = trackerURL.split('/')[0];
        let tracker = this.resolveTracker(trackerURL);
        if((!tracker && showUnrecognised && !allSeenTrackerIDs.includes(trackerHostname)) || (tracker && !seenTrackerIDs.includes(tracker['aid']))) {
          let to_id;
          if(!tracker) {
            network.nodes.push({
              id: trackerHostname,
              label: trackerHostname,
              tracker_type: 'unknown',
              tracker_id: -1,
              company_id: -1,
              x: Math.random() * 20,
              y: Math.random() * 20,
              size: 1,
              color: '#FFF'
            })
            to_id = trackerHostname
          } else {
            to_id = tracker['aid']
          }
          seenTrackerIDs.push(to_id);
          allSeenTrackerIDs.push(to_id);
          if(to_id !== site) {
            network.edges.push({
              id: 'edge-' + edge_index,
              source: '' + site,
              target: '' + to_id,
              directed: true,
              color: '#FFF'
            });
            edge_index += 1;
          }
        }
      }
    }

    let leftovers = [];
    this.trackerStore.forEach(function(tracker) {
      if(!allSeenTrackerIDs.includes(tracker['aid']) || leftovers.includes(tracker['aid'])) {
        return;
      }
      leftovers.push(tracker['aid']);
      let dummy = document.createElement('span');
      dummy.classList.add('badge');
      dummy.classList.add(tracker['type']);
      document.getElementsByTagName('body')[0].appendChild(dummy);
      let colour = getComputedStyle(dummy).getPropertyValue('background-color');
      document.getElementsByTagName('body')[0].removeChild(dummy);
      network.nodes.push({
        id: '' + tracker['aid'],
        label: tracker['name'],
        tracker_type: tracker['type'],
        tracker_id: tracker['cid'],
        company_id: tracker['aid'],
        x: Math.random() * 20,
        y: Math.random() * 20,
        size: 1,
        color: colour
      })
    });

    return network;
  },

  downloadGDFData() {
    const saveData = document.getElementById('save-gdf-button');
    let self = this;
    let nodeFields = {
      id: 'VARCHAR',
      label: 'VARCHAR',
      tracker_type: 'VARCHAR',
      tracker_id: 'INTEGER',
      company_id: 'INTEGER'
    }
    let edgeFields = {
      source: 'VARCHAR',
      target: 'VARCHAR',
      directed: 'BOOLEAN'
    }
    saveData.addEventListener('click', async () => {
      const network = await this.getNetwork();
      let gdfData = [];

      let nodedef = [];
      for(let field in nodeFields) {
        if(field == 'id') { field = 'name'; }
        nodedef.push(field + ' ' + nodeFields[field]);
      }
      gdfData.push('nodedef>' + nodedef.join(',') + '\n');
      network.nodes.forEach(function(node) {
        let nodebuffer = [];
        for(let field in nodeFields) {
          nodebuffer.push(node[field]);
        }
        gdfData.push(nodebuffer.join(',') + '\n')
      })

      let edgedef = [];
      for(let field in edgeFields) {
        if(field == 'source') { field = 'from'; }
        if(field == 'target') { field = 'to'; }
        edgedef.push(field + ' ' + edgeFields[field]);
      }
      gdfData.push('edgedef>' + edgedef.join(',') + '\n');
      network.edges.forEach(function(edge) {
        let edgebuffer = [];
        for(let field in edgeFields) {
          edgebuffer.push(edge[field]);
        }
        gdfData.push(edgebuffer.join(',') + '\n')
      })

      const blob = new Blob(gdfData, {type : 'application/gdf'});
      const url = window.URL.createObjectURL(blob);
      const downloading = browser.downloads.download({
        url : url,
        filename : 'brightbeamData.gdf',
        conflictAction : 'uniquify'
      });
      await downloading;
    });
  },

  downloadJSONData() {
    const saveData = document.getElementById('save-json-button');
    saveData.addEventListener('click', async () => {
      const data = await this.getNetwork();
      const blob = new Blob([JSON.stringify(data ,' ' , 2)],
          {type : 'application/json'});
      const url = window.URL.createObjectURL(blob);
      const downloading = browser.downloads.download({
        url : url,
        filename : 'brightbeamData.json',
        conflictAction : 'uniquify'
      });
      await downloading;
    });
  },

  downloadCSVData() {
    const saveData = document.getElementById('save-csv-button');
    saveData.addEventListener('click', async () => {
      const network = await this.getNetwork();
      let csvData = [];
      csvData.push('source,name,type,aid,cid\n');

      let nodeMap = [];
      for(let index in network.nodes) {
        let node = network.nodes[index];
        nodeMap[node['id']] = node;
      }

      for(let index in network.edges) {
        let edge = network.edges[index]
        csvData.push([
            nodeMap[edge.source]['id'],
            nodeMap[edge.target]['label'],
            nodeMap[edge.target]['tracker_type'],
            nodeMap[edge.target]['company_id'],
            nodeMap[edge.target]['tracker_id']
        ].join(',') + '\n')
      }

      const blob = new Blob(csvData,{type : 'text/csv'});
      const url = window.URL.createObjectURL(blob);
      const downloading = browser.downloads.download({
        url : url,
        filename : 'brightbeamData.csv',
        conflictAction : 'uniquify'
      });
      await downloading;
    });
  },

  stopGraphView() {
    this.sigma = null;
    document.getElementById('vis-graph').innerHTML = '';
  },
  
  async loadGraphView() {
    document.getElementById('view-list-button').classList.remove('active');
    document.getElementById('view-graph-button').classList.add('active');
    document.getElementById('view').innerText = 'Graph';
    document.getElementById('vis-graph').classList.remove('hidden');
    document.getElementById('vis-list').classList.add('hidden');
    this.stopGraphView();
    let network = await this.getNetwork();
    console.log(network);
    this.sigma = new sigma({
      graph: network,
      container: 'vis-graph',
      settings: {
        drawEdges: true,
        defaultLabelColor: '#FFF',
        autoRescale: ['nodePosition', 'edgeSize'],
        sideMargin: 1
      }
    });

    sigma.plugins.relativeSize(this.sigma, 25, 5);
    this.sigma.refresh();

    this.sigma.startForceAtlas2({
      worker: true,
      barnesHutOptimize: false,
      barnesHutTheta: 0.5,
      edgeWeightInfluence: 0,
      scalingRatio: 0.2,
      startingIterations: Math.max(this.sigma.graph.nodes().length * 15, 10000),
      iterationsPerRender: 0,
      strongGravityMode: true,
      slowDown: 10
    });
    this.sigma.refresh();
    self.sigma.stopForceAtlas2();
  },
  
  showListView() {
    const showListView = document.getElementById('view-list-button');
    showListView.addEventListener('click', async () => { await this.loadListView(); });
  },

  showGraphView() {
    const showGraphView = document.getElementById('view-graph-button');
    showGraphView.addEventListener('click', async () => { await this.loadGraphView(); });
  },

  async loadListView() {
      this.stopGraphView();
      document.getElementById('view-graph-button').classList.remove('active');
      document.getElementById('view-list-button').classList.add('active');
      document.getElementById('view').innerText = 'List';
      document.getElementById('vis-graph').innerHTML = '';
      document.getElementById('vis-graph').classList.add('hidden');
      document.getElementById('vis-list').classList.remove('hidden');

      let container = document.getElementById('site-list');
      const data = await storeChild.getAll();
      let buffer = '';
      let self = this;
      for(let site in data) {
        let props = data[site];
        if(props.firstParty) {
          buffer += '<li><h2>';
          if(props.favicon) {
            buffer += '<img src="' + props.favicon + '" alt="" class="site-favicon"> ';
          }
          buffer += site + '</h2>';
          if(props.requestedTrackerURLs.length > 0) {
            buffer += '<ol>';
            props.requestedTrackerURLs.sort();
            let seenTrackers = [];
            props.requestedTrackerURLs.forEach(function(trackerURL) {
              trackerURL = trackerURL.replace(/^https?:\/\//, '').replace(/^www\./, '')
              let tracker = self.resolveTracker(trackerURL);
              if (tracker !== null) {
                if (!seenTrackers.includes(tracker['aid'])) {
                  seenTrackers.push(tracker['aid']);
                } else {
                  return;
                }
              }
              let hidden = document.getElementById('unrecognised-control').checked ? '' : ' hidden';
              buffer += '<li' + (tracker === null ? ' class="unrecognised' + hidden + '"' : '') + '>'
              if (tracker !== null) {
                buffer += '<span class="badge ' + tracker['type'] + '">' + tracker['type'] + '</span> ';
                buffer += '<span class="recognised ' + tracker['type'] + '">' + tracker['name'] + '</span>';
              } else {
                buffer += trackerURL;
              }
              buffer += '</li>'
            });
            buffer += '</ol>';
          }
          buffer += '</li>';
        }
      }
      container.innerHTML = buffer;
  },

  resetData() {
    const resetData = document.getElementById('reset-data-button');
    const dialog = document.getElementById('reset-data-dialog');
    window.dialogPolyfill && window.dialogPolyfill.registerDialog(dialog);

    resetData.addEventListener('click', () => {
      dialog.showModal();
    });

    dialog.addEventListener('cancel', () => {
      delete dialog.returnValue;
    });

    dialog.addEventListener('close', async () => {
      if (dialog.returnValue === 'confirm') {
        await storeChild.reset();
        window.location.reload();
      }

      // This is a little naive, because the dialog might not have been
      // triggered by the reset button. But it's better than nothing.
      resetData.focus();
    });
  },

  redraw(data) {
    if (!(data.hostname in this.websites)) {
      this.websites[data.hostname] = data;
      this.updateVars(data.firstParty);
    }
    if (data.firstPartyHostnames) {
      // if we have the first parties make the link if they don't exist
      data.firstPartyHostnames.forEach((firstPartyHostname) => {
        if (this.websites[firstPartyHostname]) {
          const firstPartyWebsite = this.websites[firstPartyHostname];
          if (!('thirdParties' in firstPartyWebsite)) {
            firstPartyWebsite.thirdParties = [];
            firstPartyWebsite.firstParty = true;
          }
          if (!(firstPartyWebsite.thirdParties.includes(data.hostname))) {
            firstPartyWebsite.thirdParties.push(data.hostname);
          }
        }
      });
    }
    //viz.draw(transformedData.nodes, transformedData.links);
  }
};

window.onload = () => {
  brightbeam.init();
};
