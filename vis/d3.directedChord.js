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
    var margin = { top: 30, left: 30, bottom: 30, right: 30 },
        width = 800,
        height = 800,
        innerWidth = function() { return width - margin.left - margin.right; },
        innerHeight = function() { return height - margin.top - margin.bottom; },

        // Events
        event = d3.dispatch("highlightNode", "highlightZone", "highlightChord"),

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
        labelColor = "#000",

        // Color scales
        primaryColorScale = d3.scaleLinear()
            .domain([0, 1]),
        secondaryColorScale = d3.scaleLinear()
            .domain([0, 1]),
        labelColorScale = d3.scaleLinear()
            .domain([0, 1]),

        // Start with empty selections
        svg = d3.select(),

        // Event dispatcher
        dispatcher = d3.dispatch("highlightNode", "highlightZone", "highlightChord");

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
        var groups = ["chords", "nodes", "zones", "nodeLabels"];

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
      var nodeNames = data.map(function(d) {
        return d[""];
      });

      // Create matrix for input to chord layout
      var matrix = [];

      data.forEach(function(r, i) {
        // Outgoing and incoming per row
        var outgoing = [],
            incoming = [];

        // Add outgoing links
        nodeNames.forEach(function(c) {
          outgoing.push(0);       // Out->out
          outgoing.push(+r[c]);   // Out->in
        });

        // Add incoming links
        var c = nodeNames[i];
        data.forEach(function(r) {
          incoming.push(+r[c]);   // In->out
          incoming.push(0);       // In->in
        });

        matrix.push(outgoing);
        matrix.push(incoming);
      });

      // Create chords
      var chordLayout = d3.chord()
          .padAngle(0.04)
          .sortChords(d3.ascending);

      chords = chordLayout(matrix);

      // Create nodes by combining outgoing and incoming zones
      nodes = nodeNames.map(function(d, i) {
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
    }

    function draw() {
      // Set width and height
      svg .attr("width", width)
          .attr("height", height);

      // Set color scales
      primaryColorScale.range(["white", primaryColor]);
      secondaryColorScale.range(["white", secondaryColor]);
      labelColorScale.range(["white", labelColor]);

      // Three raddii defining zones and nodes
      var size = Math.min(innerWidth(), innerHeight()),
          outerRadius = size / 2,
          innerRadius = outerRadius - nodeHeight;

      drawChords();
      drawZones();
      drawNodes();
      drawLabels();

      clearHighlight();

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
            .style("stroke", primaryColorScale(1))
            .on("mouseover", highlightChord)
            .on("mouseout", function() {
              clearHighlight();
              dispatcher.call("highlightChord", this, null);
            });;

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

        var area = d3.areaRadial()
            .angle(function(d) { return d[0]; })
            .innerRadius(function(d) { return d[1]; })
            .outerRadius(function(d) { return d[2]; });

        function triangle(d, i) {
          var flip = i % 2 === 1,
              m = mid(d),
              h = flip ? -zoneHeight * 1.5 : zoneHeight * 1.5,
              w = 0.05,
              r = flip ? innerRadius - zoneHeight / 2 : innerRadius + zoneHeight / 2;

          return area([[m - w / 2, r, r],
                       [m, r - h, r],
                       [m + w / 2, r, r]]);
        }

        // Bind chord group data
        var zone = svg.select(".zones").selectAll(".zone")
            .data(chords.groups);

        // Enter
        var zoneEnter = zone.enter().append("g")
            .attr("class", "zone")
            .on("mouseover", highlightZone)
            .on("mouseout", function() {
              clearHighlight();
              dispatcher.call("highlightZone", this, null);
            });

        zoneEnter.append("title")
            .text(function(d) { return d.value; });

        zoneEnter.append("path")
            .attr("class", "arc");

        zoneEnter.append("path")
            .attr("class", "triangle");

        // Enter + update
        var zoneUpdate = zoneEnter.merge(zone)
            .style("visibility", function(d) {
              return d.value === 0 ? "hidden" : null;
            });

        zoneUpdate.select(".arc")
            .attr("d", arc);

        zoneUpdate.select(".triangle")
            .attr("d", triangle);

        // Exit
        zone.exit().remove();
      }

      function drawNodes() {
        var arc = d3.arc()
            .innerRadius(innerRadius)
            .outerRadius(outerRadius)
            .cornerRadius(5);

        // Bind node data
        var node = svg.select(".nodes").selectAll(".node")
            .data(nodes);

        // Enter
        var nodeEnter = node.enter().append("path")
            .attr("class", "node")
            .on("mouseover", highlightNode)
            .on("mouseout", function() {
              clearHighlight();
              dispatcher.call("highlightNode", this, null);
            });

        // Enter + update
        nodeEnter.merge(node)
            .attr("d", arc);

        // Exit
        node.exit().remove();
      }

      function drawLabels() {
        // Create paths for labels, one for the top half, and one for the bottom
        var r = (innerRadius + outerRadius) / 2 + zoneHeight / 4,
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

        // Set shortened names
        svg.select(".nodeLabels").selectAll(".tempLabel")
            .data(nodes)
          .enter().append("text")
            .text(function(d) { return d.name; })
            .attr("class", "tempLabel")
            .style("font-family", "sans-serif")
            .each(function(d) {
              d.shortName = this.getBBox().width > arcLength(d.endAngle) - arcLength(d.startAngle) - 10 ?
                            initials(d.name) : d.name
            })
            .remove();

        // Bind node data for labels
        var label = svg.select(".nodeLabels").selectAll(".nodelabel")
            .data(nodes);

        // Enter
        var labelEnter = label.enter().append("text")
            .attr("class", "nodeLabel")
            .style("text-anchor", "middle")
            .style("dominant-baseline", "middle")
            .style("font-family", "sans-serif")
            .style("pointer-events", "none");

        labelEnter.append("textPath")
            .attr("xlink:href", function(d) {
              return "#" + circleId(flip(d) ? 1 : 0);
            });

        // Enter + update
        labelEnter.merge(label)
            .attr("dx", dx);

        // Exit
        label.exit().remove();

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
      }

      function mid(arc) {
        return (arc.startAngle + arc.endAngle) / 2;
      }

      function flip(node) {
        var a = mid(node);

        return a > Math.PI / 2 && a < 3 * Math.PI / 2 ? 1 : 0;
      }

      function getNode(zoneIndex) {
        return nodes[Math.floor(zoneIndex / 2)];
      }

      function initials(s) {
        var initials = "";

        s.split(" ").forEach(function(d, i, a) {
          initials += d[0] + ".";
        });

        return initials.toUpperCase();
      }

      function highlightNode(node) {
        d3.select(this)
            .style("stroke-width", 3);

        highlightLabel(node);

        highlightConnected(node.groups.map(function(d) {
          return d.index;
        }));

        dispatcher.call("highlightNode", this, {
          name: node.name
        });
      }

      function highlightLabel(node) {
        var h = nodeHeight / 2 + 6;

        svg.select(".nodeLabels").selectAll(".nodeLabel")
            .filter(function(d) {
              return d === node;
            })
            .attr("dy", flip(node) ? h + 5 : -h)
          .select("textPath")
            .text(function(d) { return d.name; });
      }

      function highlightZone(zone) {
        d3.select(this)
            .style("stroke-width", 3);

        highlightLabel(getNode(zone.index));

        highlightConnected(zone.index);

        dispatcher.call("highlightZone", this, {
          name: getNode(zone.index).name,
          type: zone.index % 2 === 0 ? "outoing" : "incoming",
          value: zone.value
        });
      }

      function highlightChord(chord) {
        var sourceNode = getNode(chord.source.index),
            targetNode = getNode(chord.target.index);

        // Highlight labels
        highlightLabel(sourceNode);
        highlightLabel(targetNode);

        // Highlight this chord and its twin
        var twins = chords.filter(function(d) {
          var sourceIndex = getNode(d.source.index).index,
              targetIndex = getNode(d.target.index).index;

          return (sourceIndex === sourceNode.index && targetIndex === targetNode.index) ||
                 (sourceIndex === targetNode.index && targetIndex === sourceNode.index);
        });

        doHighlight(twins, [chord.source.index, chord.target.index]);

        // Get information for callback
        var sourceName,
            targetName;

        if (chord.source.index % 2 === 0) {
          sourceName = sourceNode.name;
          targetName = targetNode.name;
        }
        else {
          sourceName = targetNode.name;
          targetName = sourceNode.name;
        }

        dispatcher.call("highlightChord", this, {
          sourceName: sourceName,
          targetName: targetName,
          value: chord.source.value
        });
      }

      function highlightConnected(indeces) {
        if (!indeces.length) indeces = [indeces];

        var connectedChords = chords.filter(function(d) {
          return indeces.indexOf(d.source.index) !== -1 ||
                 indeces.indexOf(d.target.index) !== -1;
        });

        var connectedIndeces = d3.merge(connectedChords.map(function(d) {
          return [d.source.index, d.target.index];
        }));

        doHighlight(connectedChords, connectedIndeces);
      }

      function doHighlight(connectedChords, connectedIndeces) {
        if (!connectedChords.length) connectedChords = [connectedChords];
        if (!connectedIndeces.length) connectedIndeces = [connectedIndeces];

        function match(a, b) {
          if (!a.length) a = [a];
          if (!b.length ) b = [b];

          for (var i = 0; i < a.length; i++) {
            if (b.indexOf(a[i]) !== -1) return true;
          }

          return false;
        }

        svg.select(".chords").selectAll(".chord")
            .style("fill-opacity", function(d) {
              return match(d, connectedChords) ? 0.9 : 0.1;
            })
            .style("stroke-opacity", function(d) {
              return match(d, connectedChords) ? 0.9 : 0.1;
            });

        svg.select(".zones").selectAll(".zone").filter(function(d) {
              return !match(d.index, connectedIndeces);
            })
            .style("fill", function(d, i) {
              return i % 2 === 0 ? primaryColorScale(0.05) : secondaryColorScale(0.05);
            })
            .style("stroke", primaryColorScale(0.2));

        svg.select(".nodes").selectAll(".node").filter(function(d) {
              return !match(d.groups.map(function(d) { return d.index}), connectedIndeces);
            })
            .style("fill", primaryColorScale(0.1))
            .style("stroke", primaryColorScale(0.2));

        svg.select(".nodeLabels").selectAll(".nodeLabel").filter(function(d) {
              return !match(d.groups.map(function(d) { return d.index}), connectedIndeces);
            })
            .style("fill", labelColorScale(0.2));
      }

      function clearHighlight() {
        svg.select(".chords").selectAll(".chord")
            .style("fill-opacity", 0.5)
            .style("stroke-opacity", 0.5);

        svg.select(".zones").selectAll(".zone")
            .style("fill", function(d, i) {
              return i % 2 === 0 ? primaryColorScale(0.25) : secondaryColorScale(0.25);
            })
            .style("stroke", primaryColorScale(1))
            .style("stroke-width", 2);

        svg.select(".nodes").selectAll(".node")
            .style("fill", primaryColorScale(0.5))
            .style("stroke", primaryColorScale(1))
            .style("stroke-width", 2);

        svg.select(".nodeLabels").selectAll(".nodeLabel")
            .attr("dy", 0)
            .style("fill", labelColorScale(1))
          .select("textPath")
            .text(function(d) { return d.shortName; });
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

    directedChord.primaryColor = function(_) {
      if (!arguments.length) return primaryColor;
      primaryColor = _;
      return directedChord;
    };

    directedChord.secondaryColor = function(_) {
      if (!arguments.length) return secondaryColor;
      secondaryColor = _;
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
