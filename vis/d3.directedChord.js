/*=========================================================================

 Name:        d3.directedChord.js

 Author:      David Borland, The Renaissance Computing Institute (RENCI)

 Copyright:   The Renaissance Computing Institute (RENCI)

 Description: Directed chord diagram visualization using d3 following the
              reusable charts convention: http://bost.ocks.org/mike/chart/

 =========================================================================*/

(function() {
  d3.directedChord = function() {
        // Size
    var margin = { top: 20, left: 20, bottom: 20, right: 20 },
        width = 800,
        height = 800,
        innerWidth = function() { return width - margin.left - margin.right; },
        innerHeight = function() { return height - margin.top - margin.bottom; },

        // Events
        event = d3.dispatch("highlightNode", "highlightZone", "highlightLink"),

        // Data
        data = [],
        nodes = [],
        matrix = [],

        // Start with empty selections
        svg = d3.select();

    // Create a closure containing the above variables
    function directedChord(selection) {
      selection.each(function(d) {
        // Save data
        data = d;

        // Process data
        processData();

        // Select the svg element, if it exists
        svg = d3.select(this).selectAll("svg")
            .data([data]);

        // Otherwise create the skeletal chart
        var svgEnter = svg.enter().append("svg")
            .attr("class", "directedChord");

        g = svgEnter.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // Groups for layout
        var groups = ["chords", "zones", "nodes"];

        g.selectAll("g")
            .data(groups)
          .enter().append("g")
            .attr("class", function(d) { return d; });

        svg = svgEnter.merge(svg);

        draw();
      });
    }

    function processData() {
      // Get nodes from row names
      nodes = data.map(function(d) {
        return d[""];
      });

      matrix = [];

      data.forEach(function(r, i) {
        // Outgoing and incoming per row
        var outgoing = [],
            incoming = [];

        // Add outgoing links
        nodes.forEach(function(c) {
          outgoing.push(0);       // Out->out
          outgoing.push(+r[c]);   // Out->in
        });

        // Add incoming links
        var c = nodes[i];
        data.forEach(function(r) {
          incoming.push(+r[c]);   // In->out
          incoming.push(0);       // In->in
        });

        matrix.push(outgoing);
        matrix.push(incoming);
      });

/*
      console.log(data.map(function(d) {
        return nodes.map(function(n) {
          return d[n];
        });
      }));
      console.log(matrix);
*/      
    }

    function draw() {
      // Set width and height
      svg .attr("width", width)
          .attr("height", height);

      drawChords();
      drawZones();
      drawNodes();

      function drawChords() {
      }

      function drawZones() {
      }

      function drawNodes() {

      }
    }

    // Getters/setters

    directedChord.width = function(_) {
      if (!arguments.length) return width;
      width = _;
      return directedChord;
    };

    directedChord.height = function(_) {
      if (!arguments.length) return height;
      height = _;
      return directedChord;
    };

    // For registering event callbacks
    directedChord.on = function() {
      var value = dispatcher.on.apply(dispatcher, arguments);
      return value === dispatcher ? directedChord : value;
    };

    return directedChord;
  };
})();
