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
        chords = [],

        // Layout
        nodeHeight = 40,
        zoneHeight = 10,

        // Colors
        primaryColor = "#b2182b",
        secondaryColor = "#2166ac",

        // Color scales
        primaryColorScale = d3.scaleLinear()
            .domain([0, 1]),
        secondaryColorScale = d3.scaleLinear()
            .domain([0, 1]),

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
            .attr("transform", "translate(" + (margin.left + innerWidth() / 2) + "," +
                                              (margin.top + innerHeight() / 2) + ")");

        // Groups for layout
        var groups = ["chords", "nodes", "zones"];

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

      var matrix = [];

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

      // XXX: Put in check for all-zero row or column?
/*
      console.log(data.map(function(d) {
        return nodes.map(function(n) {
          return d[n];
        });
      }));
      console.log(matrix);
*/
      var chordLayout = d3.chord()
      .padAngle(0.04);

      chords = chordLayout(matrix);
    }

    function draw() {
      // Set width and height
      svg .attr("width", width)
          .attr("height", height);

      // Set color scales
      primaryColorScale.range(["white", primaryColor]);
      secondaryColorScale.range(["white", secondaryColor]);

      // Three raddii defining zones and nodes
      var size = Math.min(innerWidth(), innerHeight()),
          outerRadius = size / 2,
          innerRadius = outerRadius - nodeHeight;

      drawChords();
      drawZones();
      drawNodes();

      function drawChords() {
        var ribbon = d3.ribbon()
            .radius(innerRadius);

        // Bind chord data
        var chord = svg.select(".chords").selectAll(".chord")
            .data(chords);

        // Enter
        var chordEnter = chord.enter().append("path")
            .attr("class", "chord")
            .style("fill", secondaryColorScale(1))
            .style("fill-opacity", 0.5)
            .on("mouseover", highlightChord)
            .on("mouseout", clearHighlight);

        chordEnter.append("title")
            .text(function(d) {
              return d.source.value;
            });

        // Enter + update
        chordEnter.merge(chord)
            .attr("d", ribbon);

        // Exit
        chord.exit().remove();
      }

      function drawZones() {
        var arc = d3.arc()
            .innerRadius(innerRadius - zoneHeight / 2)
            .outerRadius(innerRadius + zoneHeight / 2)
            .cornerRadius(5);

        // Bind chord group data
        var zone = svg.select(".zones").selectAll(".zone")
            .data(chords.groups);

        // Enter
        var zoneEnter = zone.enter().append("g")
            .attr("class", "zone")
            .on("mouseover", highlightZone)
            .on("mouseout", clearHighlight);

        zoneEnter.append("path")
            .style("fill", function(d, i) {
              return i % 2 === 0 ? "#b2182b" : "#2166ac";
            });

        // Enter + update
        var zoneUpdate = zoneEnter.merge(zone);

        zoneUpdate.select("path")
            .attr("d", arc);

        // Exit
        zone.exit().remove();
      }

      function drawNodes() {
        // Combine outgoing and incoming zones
        var nodeData = nodes.map(function(d, i) {
          // Two groups per node
          var g1 = chords.groups[i * 2],
              g2 = chords.groups[i * 2 + 1];

          return {
            name: d,
            index: i,
            startAngle: g1.startAngle - 0.01,
            endAngle: g2.endAngle + 0.01,
            value: g1.value + g2.value,
            groups: [g1, g2]
          }
        });

        var arc = d3.arc()
            .innerRadius(innerRadius)
            .outerRadius(outerRadius)
            .cornerRadius(5);

        // Bind node data
        var node = svg.select(".nodes").selectAll(".node")
            .data(nodeData);

        // Enter
        var nodeEnter = node.enter().append("path")
            .attr("class", "node")
            .style("fill", primaryColorScale(0.25))
            .style("stroke", primaryColorScale(0.75))
            .style("stroke-width", 2)
            .on("mouseover", highlightNode)
            .on("mouseout", clearHighlight);

        // Enter + update
        nodeEnter.merge(node)
            .attr("d", arc);

        // Exit
        node.exit().remove();

        // Create a path for labels
        var r = (innerRadius + outerRadius) / 2,
            c = 2 * Math.PI * r;

        var circleArc1 = d3.arc()
            .innerRadius(r)
            .outerRadius(r)
            .startAngle(0)
            .endAngle(2 * Math.PI);

        var circleArc2 = d3.arc()
            .innerRadius(r)
            .outerRadius(r)
            .startAngle(0)
            .endAngle(-2 * Math.PI);

        var circles = svg.select(".nodes").selectAll(".labelCircle")
            .data([circleArc1, circleArc2])
          .enter().append("path")
            .attr("class", "labelCircle")
            .attr("id", function(d, i) { return circleId(i); })
            .attr("d", function(d) { return d(); })
            .style("fill", "none")
            .style("visibility", "hidden");

        // Bind node data for labels
        var label = svg.select(".nodes").selectAll("g")
            .data(nodeData);

        // Enter
        var labelEnter = label.enter().append("text")
            .attr("class", "nodeLabel")
            .style("text-anchor", "middle")
            .style("dominant-baseline", "middle")
            .style("font-family", "sans-serif")
            .style("pointer-events", "none");

        labelEnter.append("textPath")
            .attr("xlink:href", function(d) {
              var i = flip(d) ? 1 : 0;

              return "#" + circleId(i);
            });

        // Enter + update
        labelEnter.merge(label)
            .attr("dx", dx)
          .select("textPath")
            .text(function(d) { return d.name; })
            .each(function(d) {
              var w = this.getBBox().width;

              if (w > arcLength(d.endAngle) - arcLength(d.startAngle) - 10) {
                d3.select(this)
                    .text(initials(d.name));
              }
            });

        // Exit
        node.exit().remove();

        function arcLength(a) {
          return c * a / (2 * Math.PI);
        }

        function dx(d) {
          var x = arcLength(mid(d));

          return flip(d) ? c - x : x;
        }

        function circleId(i) {
          return "labelCircle" + i;
        }

        function mid(d) {
          return (d.startAngle + d.endAngle) / 2;
        }

        function flip(d) {
          var a = mid(d);

          return a > Math.PI / 2 && a < 3 * Math.PI / 2 ? 1 : 0;
        }

        function initials(s) {
          var initials = "";

          s.split(" ").forEach(function(d, i, a) {
            initials += d[0] + ".";
          });

          return initials.toUpperCase();
        }
      }

      function hasZone(node, zone) {
        return node.groups[0].index === zone.index ||
               node.groups[1].index === zone.index;
      }

      function highlightNode(node) {
        d3.select(this)
            .style("stroke", primaryColorScale(1))
            .style("stroke-width", 3);

        highlightChords(node.groups.map(function(d) {
          return d.index;
        }));
      }

      function highlightZone(zone) {
        d3.select(this)
            .style("stroke", "black");

        highlightChords(zone.index);

        svg.select(".chords").selectAll(".chord")
            .style("fill-opacity", function(d) {
              return d.source.index === zone.index ||
                     d.target.index === zone.index ? 0.9 : 0.1;
            });
      }

      function highlightChord(chord) {
        d3.select(".chords").selectAll(".chord")
            .style("fill-opacity", function(d) {
              return chord === d ? 0.9 : 0.1;
            });

        d3.select(this)
            .style("stroke", "black");
      }

      function highlightChords(indeces) {
        if (!indeces.length) indeces = [indeces];

        function hasChord(d) {
          return indeces.indexOf(d.source.index) !== -1 ||
                 indeces.indexOf(d.target.index) !== -1;
        }

        d3.select(".chords").selectAll(".chord")
            .style("fill-opacity", function(d) {
              return hasChord(d) ? 0.9 : 0.1;
            });
      }

      function clearHighlight() {
        d3.select(".nodes").selectAll(".node")
            .style("fill", primaryColorScale(0.25))
            .style("stroke", primaryColorScale(0.75))
            .style("stroke-width", 2);

        d3.select(".zones").selectAll(".zone")
            .style("stroke", null);

        svg.select(".chords").selectAll(".chord")
            .style("fill-opacity", 0.5)
            .style("stroke", null);
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
